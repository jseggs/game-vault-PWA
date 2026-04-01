const BGG_BASE_URL = 'https://boardgamegeek.com/xmlapi2';
const BGG_GAMES_SHEET = 'Games';
const BGG_STATUS_HEADER = 'BGG Match Status';
const BGG_EXTRA_HEADERS = [
  'Players (Manufacturer)',
  'Players (BGG Comm)',
  'Best At',
  'Good solo option',
  'BGG Score',
  'BGG Category',
  'Expansion',
  'Age',
  'BGG ID',
  'BGG Match Name',
  'BGG Match Score',
  'BGG Match Status',
  'BGG URL',
  'BGG Thumbnail',
  'BGG Updated At'
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('BGG Sync')
    .addItem('Install triggers', 'createBggTriggers')
    .addItem('Refresh all BGG scores', 'refreshAllBggScores')
    .addItem('Process queued rows', 'processPendingBggRows')
    .addItem('Process 25 queued rows now', 'processQueuedBggRowsNow')
    .addItem('Process active row', 'enrichActiveRowFromBgg')
    .addItem('Queue blanks + unmatched', 'queueMissingBggRows')
    .addItem('Queue all rows for score refresh', 'queueAllBggRowsForRefresh')
    .addToUi();
}

function createBggTriggers() {
  const ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(trigger => {
    const fn = trigger.getHandlerFunction();
    if (fn === 'queueBggLookupOnEdit' || fn === 'processPendingBggRows') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('queueBggLookupOnEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('processPendingBggRows').timeBased().everyMinutes(5).create();
}

function queueBggLookupOnEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== BGG_GAMES_SHEET || e.range.getRow() === 1) return;
  const headers = ensureHeaders_(sheet, BGG_EXTRA_HEADERS);
  const gameCol = headers['Game'];
  const bggIdCol = headers['BGG ID'];
  if (!gameCol) return;
  if (e.range.getColumn() !== gameCol && (!bggIdCol || e.range.getColumn() !== bggIdCol)) return;
  const row = e.range.getRow();
  const title = String(sheet.getRange(row, gameCol).getValue() || '').trim();
  const manualBggId = bggIdCol ? String(sheet.getRange(row, bggIdCol).getValue() || '').trim() : '';
  if (!title && !manualBggId) return;

  if (bggIdCol && e.range.getColumn() === bggIdCol) {
    resetBggReviewFields_(sheet, headers, row, manualBggId);
  }

  sheet.getRange(row, headers[BGG_STATUS_HEADER]).setValue('Queued');
}

function queueMissingBggRows() {
  const sheet = getGamesSheet_();
  const headers = ensureHeaders_(sheet, BGG_EXTRA_HEADERS);
  const values = sheet.getDataRange().getValues();
  const updates = [];
  for (let row = 2; row <= values.length; row += 1) {
    const record = rowToObject_(values[row - 1], headers);
    if (!String(record['Game'] || '').trim()) continue;
    if (!String(record['BGG ID'] || '').trim() || !String(record[BGG_STATUS_HEADER] || '').trim()) {
      updates.push(row);
    }
  }
  updates.forEach(row => sheet.getRange(row, headers[BGG_STATUS_HEADER]).setValue('Queued'));
}


function queueAllBggRowsForRefresh() {
  const sheet = getGamesSheet_();
  const headers = ensureHeaders_(sheet, BGG_EXTRA_HEADERS);
  const values = sheet.getDataRange().getValues();
  for (let row = 2; row <= values.length; row += 1) {
    const title = String(values[row - 1][headers['Game'] - 1] || '').trim();
    if (!title) continue;
    sheet.getRange(row, headers[BGG_STATUS_HEADER]).setValue('Queued');
  }
}


function refreshAllBggScores() {
  createBggTriggers();
  queueAllBggRowsForRefresh();
  const processedNow = processQueuedRows_(25);
  const remaining = countQueuedRows_();
  SpreadsheetApp.getUi().alert(
    'BGG score refresh started. Processed ' + processedNow + ' row(s) now. ' +
    remaining + ' row(s) remain queued and will continue automatically via the installed trigger.'
  );
}

function processPendingBggRows() {
  processQueuedRows_(5);
}

function processQueuedBggRowsNow() {
  processQueuedRows_(25);
}

function processQueuedRows_(limit) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getGamesSheet_();
    const headers = ensureHeaders_(sheet, BGG_EXTRA_HEADERS);
    const values = sheet.getDataRange().getValues();
    let processed = 0;
    for (let row = 2; row <= values.length && processed < limit; row += 1) {
      const record = rowToObject_(values[row - 1], headers);
      const title = String(record['Game'] || '').trim();
      const status = String(record[BGG_STATUS_HEADER] || '').trim();
      if (!title) continue;
      if (status !== 'Queued') continue;
      enrichGameRow_(sheet, headers, row, title);
      processed += 1;
    }
    return processed;
  } finally {
    lock.releaseLock();
  }
}

function countQueuedRows_() {
  const sheet = getGamesSheet_();
  const headers = ensureHeaders_(sheet, BGG_EXTRA_HEADERS);
  const values = sheet.getDataRange().getValues();
  let queued = 0;
  for (let row = 2; row <= values.length; row += 1) {
    const status = String(values[row - 1][headers[BGG_STATUS_HEADER] - 1] || '').trim();
    if (status === 'Queued') queued += 1;
  }
  return queued;
}

function enrichActiveRowFromBgg() {
  const sheet = getGamesSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= 1) throw new Error('Select a game row first.');
  const headers = ensureHeaders_(sheet, BGG_EXTRA_HEADERS);
  const title = String(sheet.getRange(row, headers['Game']).getValue() || '').trim();
  if (!title) throw new Error('Selected row has no Game title.');
  enrichGameRow_(sheet, headers, row, title);
}

function enrichGameRow_(sheet, headers, row, title) {
  setBggStatus_(sheet, headers, row, 'Searching');
  const manualBggId = String(sheet.getRange(row, headers['BGG ID']).getValue() || '').trim();
  if (manualBggId) {
    const thing = fetchThingById_(manualBggId);
    if (!thing) {
      setBggStatus_(sheet, headers, row, 'Needs review');
      return;
    }
    const enriched = extractThingData_(thing);
    writeBggDataToRow_(
      sheet,
      headers,
      row,
      title,
      { score: 'Manual', candidate: { id: manualBggId } },
      enriched,
      {
        forceHeaders: [
          'BGG ID',
          'BGG Match Name',
          'BGG Match Score',
          'BGG URL',
          'BGG Thumbnail',
          'BGG Updated At'
        ]
      }
    );
    setBggStatus_(sheet, headers, row, 'Matched');
    return;
  }

  const match = matchGameTitleToBgg_(title);
  if (!match) {
    setBggStatus_(sheet, headers, row, 'Needs review');
    sheet.getRange(row, headers['BGG Match Score']).setValue('');
    sheet.getRange(row, headers['BGG Match Name']).setValue('');
    return;
  }
  const enriched = extractThingData_(match.thing);
  writeBggDataToRow_(sheet, headers, row, title, match, enriched);
  setBggStatus_(sheet, headers, row, 'Matched');
}

function matchGameTitleToBgg_(title) {
  const candidates = searchBggCandidates_(title).slice(0, 8);
  if (!candidates.length) return null;
  const ids = candidates.map(candidate => candidate.id).join(',');
  const thingDoc = fetchBggXml_('/thing', { id: ids, stats: 1 });
  const thingMap = mapThingItemsById_(thingDoc);
  const scored = candidates
    .map(candidate => {
      const thing = thingMap[candidate.id];
      if (!thing) return null;
      const score = scoreBggCandidate_(title, candidate, thing);
      return { candidate, thing, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const best = scored[0];
  const runnerUp = scored[1];
  if (best.score < 58) return null;
  if (runnerUp && best.score - runnerUp.score < 7 && best.score < 80) return null;
  return best;
}


function fetchThingById_(bggId) {
  const doc = fetchBggXml_('/thing', { id: bggId, stats: 1 });
  const items = doc.getRootElement().getChildren('item');
  return items.length ? items[0] : null;
}

function searchBggCandidates_(title) {
  const doc = fetchBggXml_('/search', {
    query: title,
    type: 'boardgame,boardgameexpansion'
  });
  const items = doc.getRootElement().getChildren('item');
  return items.map(item => ({
    id: item.getAttribute('id').getValue(),
    type: item.getAttribute('type').getValue(),
    names: item.getChildren('name').map(name => ({
      value: name.getAttribute('value').getValue(),
      primary: name.getAttribute('type') && name.getAttribute('type').getValue() === 'primary'
    })),
    year: childValue_(item, 'yearpublished')
  }));
}

function mapThingItemsById_(doc) {
  const out = {};
  doc.getRootElement().getChildren('item').forEach(item => {
    out[item.getAttribute('id').getValue()] = item;
  });
  return out;
}

function scoreBggCandidate_(title, candidate, thing) {
  const query = normalizeTitle_(title);
  const names = thing.getChildren('name').map(name => name.getAttribute('value').getValue());
  const normalizedNames = names.map(normalizeTitle_);
  const bestTextScore = normalizedNames.reduce((best, normalizedName) => {
    return Math.max(best, titleSimilarityScore_(query, normalizedName));
  }, 0);
  let score = bestTextScore * 100;
  if (normalizedNames.includes(query)) score += 18;
  const mentionsExpansion = /expansion|promo|pack|module|set|season|ally|allies/i.test(title);
  const isExpansion = candidate.type === 'boardgameexpansion';
  if (isExpansion && !mentionsExpansion) score -= 18;
  if (!isExpansion && mentionsExpansion) score -= 10;
  return Math.round(score);
}

function extractThingData_(thing) {
  const type = thing.getAttribute('type').getValue();
  const names = thing.getChildren('name');
  const primaryNameNode = names.find(node => node.getAttribute('type') && node.getAttribute('type').getValue() === 'primary') || names[0];
  const primaryName = primaryNameNode ? primaryNameNode.getAttribute('value').getValue() : '';
  const minPlayers = Number(childValue_(thing, 'minplayers')) || 0;
  const maxPlayers = Number(childValue_(thing, 'maxplayers')) || 0;
  const minAge = Number(childValue_(thing, 'minage')) || '';
  const thumbnail = childText_(thing, 'thumbnail');
  const average = findDescendantAttributeValue_(thing, ['statistics', 'ratings', 'average'], 'value');
  const categories = collectLinkValues_(thing, ['boardgamecategory', 'boardgamemechanic']);
  const pollSummary = parseSuggestedPlayersPoll_(thing);
  return {
    bggId: thing.getAttribute('id').getValue(),
    bggName: primaryName,
    bggUrl: 'https://boardgamegeek.com/boardgame/' + thing.getAttribute('id').getValue(),
    thumbnail,
    playersManufacturer: formatPlayerRange_(minPlayers, maxPlayers),
    playersBgg: pollSummary.summary,
    bestAt: pollSummary.bestAt,
    goodSolo: pollSummary.goodSolo,
    bggScore: average && average !== 'N/A' ? Number(average).toFixed(1) : '',
    bggCategory: categories.slice(0, 6).join(', '),
    expansion: type === 'boardgameexpansion' ? 1 : '',
    age: minAge,
    updatedAt: new Date()
  };
}

function parseSuggestedPlayersPoll_(thing) {
  const poll = thing.getChildren('poll').find(node => node.getAttribute('name') && node.getAttribute('name').getValue() === 'suggested_numplayers');
  if (!poll) return { summary: '', bestAt: '', goodSolo: '' };
  const rows = poll.getChildren('results').map(resultsNode => {
    const numPlayers = resultsNode.getAttribute('numplayers').getValue();
    const votes = {};
    resultsNode.getChildren('result').forEach(resultNode => {
      votes[resultNode.getAttribute('value').getValue()] = Number(resultNode.getAttribute('numvotes').getValue() || 0);
    });
    const recommended = (votes['Recommended'] || 0) + (votes['Best'] || 0);
    const notRecommended = votes['Not Recommended'] || 0;
    return {
      numPlayers,
      best: votes['Best'] || 0,
      recommended,
      notRecommended,
      supported: recommended > notRecommended
    };
  });
  const supported = rows.filter(row => /^\d+$/.test(row.numPlayers) && row.supported).map(row => Number(row.numPlayers)).sort((a, b) => a - b);
  const bestVotes = rows.filter(row => /^\d+$/.test(row.numPlayers)).sort((a, b) => b.best - a.best);
  const bestAt = bestVotes.length && bestVotes[0].best > 0 ? bestVotes.filter(row => row.best === bestVotes[0].best).map(row => row.numPlayers).join(', ') : '';
  const goodSolo = rows.some(row => row.numPlayers === '1' && row.supported) ? 'Yes' : 'No';
  return {
    summary: summarizePlayerCounts_(supported, bestAt),
    bestAt,
    goodSolo
  };
}

function summarizePlayerCounts_(supported, bestAt) {
  if (!supported.length) return '';
  const runs = [];
  let start = supported[0];
  let prev = supported[0];
  for (let i = 1; i < supported.length; i += 1) {
    const current = supported[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    runs.push(start === prev ? String(start) : start + '-' + prev);
    start = current;
    prev = current;
  }
  runs.push(start === prev ? String(start) : start + '-' + prev);
  return bestAt ? runs.join(', ') + ', Best: ' + bestAt : runs.join(', ');
}

function writeBggDataToRow_(sheet, headers, row, title, match, data, options) {
  options = options || {};
  const forceHeaders = new Set(options.forceHeaders || []);

  const payload = {
    'Players (Manufacturer)': data.playersManufacturer,
    'Players (BGG Comm)': data.playersBgg,
    'Best At': data.bestAt,
    'Good solo option': data.goodSolo,
    'BGG Score': data.bggScore,
    'BGG Category': data.bggCategory,
    'Expansion': data.expansion,
    'Age': data.age,
    'BGG ID': data.bggId,
    'BGG Match Name': data.bggName,
    'BGG Match Score': match.score,
    'BGG URL': data.bggUrl,
    'BGG Thumbnail': data.thumbnail,
    'BGG Updated At': data.updatedAt
  };

  Object.keys(payload).forEach(header => {
    const col = headers[header];
    if (!col) return;

    const range = sheet.getRange(row, col);
    const current = range.getValue();
    const next = payload[header];

    if (next === undefined) return;

    if (header === 'BGG Score' || header === 'BGG Updated At' || forceHeaders.has(header)) {
      range.setValue(next);
      return;
    }

    if (current === '' || current === null) {
      range.setValue(next);
    }
  });
}

function fetchBggXml_(path, params) {
  const token = PropertiesService.getScriptProperties().getProperty('BGG_API_TOKEN');
  if (!token) {
    throw new Error('Missing Script Property BGG_API_TOKEN');
  }
  throttleBggRequests_();
  const query = Object.keys(params)
    .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
    .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
    .join('&');
  const url = BGG_BASE_URL + path + (query ? '?' + query : '');
  const cache = CacheService.getScriptCache();
  const cacheKey = 'bgg:' + Utilities.base64EncodeWebSafe(url).slice(0, 200);
  const cached = cache.get(cacheKey);
  if (cached) return XmlService.parse(cached);
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token }
  });
  const code = response.getResponseCode();
  if (code === 202 || code === 429 || code === 500 || code === 503) {
    Utilities.sleep(5500);
    return fetchBggXml_(path, params);
  }
  if (code >= 400) {
    throw new Error('BGG request failed (' + code + '): ' + url);
  }
  const body = response.getContentText();
  const maxCacheBytes = 90000;
  if (body && body.length <= maxCacheBytes) {
    try {
      cache.put(cacheKey, body, 21600);
    } catch (err) {
      // Large or invalid cache values should not block the enrichment flow.
    }
  }
  return XmlService.parse(body);
}

function throttleBggRequests_() {
  const props = PropertiesService.getScriptProperties();
  const last = Number(props.getProperty('BGG_LAST_REQUEST_TS') || 0);
  const now = Date.now();
  const waitMs = 5500 - (now - last);
  if (waitMs > 0) Utilities.sleep(waitMs);
  props.setProperty('BGG_LAST_REQUEST_TS', String(Date.now()));
}

function getGamesSheet_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(BGG_GAMES_SHEET);
  if (!sheet) throw new Error('Missing Games sheet');
  return sheet;
}

function ensureHeaders_(sheet, headersToEnsure) {
  const headerRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const map = {};
  headerRow.forEach((header, index) => {
    if (header) map[String(header).trim()] = index + 1;
  });
  headersToEnsure.forEach(header => {
    if (!map[header]) {
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(header);
      map[header] = nextCol;
    }
  });
  return map;
}

function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    if (header) map[String(header).trim()] = index + 1;
  });
  return map;
}

function rowToObject_(rowValues, headerMap) {
  const out = {};
  Object.keys(headerMap).forEach(header => {
    out[header] = rowValues[headerMap[header] - 1];
  });
  return out;
}

function setBggStatus_(sheet, headers, row, status) {
  sheet.getRange(row, headers[BGG_STATUS_HEADER]).setValue(status);
}

function resetBggReviewFields_(sheet, headers, row, manualBggId) {
  const resetValues = {
    'BGG Match Name': '',
    'BGG Match Score': '',
    'BGG URL': '',
    'BGG Thumbnail': '',
    'BGG Updated At': '',
    'BGG ID': manualBggId || ''
  };

  Object.keys(resetValues).forEach(header => {
    const col = headers[header];
    if (!col) return;
    sheet.getRange(row, col).setValue(resetValues[header]);
  });
}

function collectLinkValues_(item, types) {
  return item.getChildren('link')
    .filter(link => link.getAttribute('type') && types.indexOf(link.getAttribute('type').getValue()) !== -1)
    .map(link => link.getAttribute('value').getValue())
    .filter((value, index, values) => values.indexOf(value) === index);
}

function childValue_(element, childName) {
  const child = element.getChild(childName);
  return child && child.getAttribute('value') ? child.getAttribute('value').getValue() : '';
}

function childText_(element, childName) {
  const child = element.getChild(childName);
  return child ? child.getText() : '';
}

function findDescendantAttributeValue_(element, path, attrName) {
  let current = element;
  for (let i = 0; i < path.length; i += 1) {
    current = current ? current.getChild(path[i]) : null;
  }
  return current && current.getAttribute(attrName) ? current.getAttribute(attrName).getValue() : '';
}

function formatPlayerRange_(minPlayers, maxPlayers) {
  if (!minPlayers && !maxPlayers) return '';
  if (minPlayers && maxPlayers && minPlayers !== maxPlayers) return minPlayers + '-' + maxPlayers;
  return String(minPlayers || maxPlayers);
}

function normalizeTitle_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an|edition|game|board|card)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleSimilarityScore_(left, right) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const lev = levenshteinDistance_(left, right);
  const maxLength = Math.max(left.length, right.length) || 1;
  const levenshteinScore = 1 - lev / maxLength;
  const tokenScore = tokenOverlapScore_(left, right);
  const containsBonus = left.indexOf(right) !== -1 || right.indexOf(left) !== -1 ? 0.12 : 0;
  return Math.max(0, Math.min(1, (levenshteinScore * 0.7) + (tokenScore * 0.3) + containsBonus));
}

function tokenOverlapScore_(left, right) {
  const leftTokens = left.split(' ').filter(Boolean);
  const rightTokens = right.split(' ').filter(Boolean);
  if (!leftTokens.length || !rightTokens.length) return 0;
  const leftSet = {};
  leftTokens.forEach(token => { leftSet[token] = true; });
  const overlap = rightTokens.filter(token => leftSet[token]).length;
  return overlap / Math.max(leftTokens.length, rightTokens.length);
}

function levenshteinDistance_(left, right) {
  const matrix = [];
  for (let i = 0; i <= right.length; i += 1) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= left.length; j += 1) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= right.length; i += 1) {
    for (let j = 1; j <= left.length; j += 1) {
      if (right.charAt(i - 1) === left.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[right.length][left.length];
}
