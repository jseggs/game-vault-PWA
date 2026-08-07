const BGG_API_ROOT = 'https://boardgamegeek.com/xmlapi2';
const BGG_SERVICE_VERSION = '1.0';

function doGet() {
  return serviceJson_({
    status: 'ok',
    name: 'Game Vault BGG Lookup Service',
    version: BGG_SERVICE_VERSION,
    privacy: 'Accepts a game title or BGG ID. Does not receive Google Sheet IDs or user data.'
  });
}

function doPost(e) {
  try {
    const request = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const title = String(request.title || '').trim();
    const bggId = String(request.bggId || '').trim();
    if (!title && !bggId) throw new Error('Send a game title or BGG ID.');

    const cache = CacheService.getScriptCache();
    const cacheKey = 'lookup:' + Utilities.base64EncodeWebSafe(JSON.stringify({title:title.toLowerCase(),bggId:bggId})).slice(0, 220);
    const cached = cache.get(cacheKey);
    if (cached) return serviceJson_({status: 'ok', data: JSON.parse(cached), cached: true});

    const data = bggId ? lookupThingById_(bggId, title) : lookupThingByTitle_(title);
    const serialized = JSON.stringify(data);
    if (serialized.length < 90000) cache.put(cacheKey, serialized, 21600);
    return serviceJson_({status: 'ok', data: data});
  } catch (error) {
    return serviceJson_({status: 'error', message: error.message || String(error)});
  }
}

function lookupThingById_(bggId, requestedTitle) {
  if (!/^\d+$/.test(bggId)) throw new Error('BGG ID must contain only numbers.');
  const document = fetchBggXmlService_('/thing', {id: bggId, stats: 1});
  const items = document.getRootElement().getChildren('item');
  if (!items.length) throw new Error('BGG did not return that ID.');
  return extractBggThing_(items[0], requestedTitle, 100);
}

function lookupThingByTitle_(title) {
  const search = fetchBggXmlService_('/search', {query: title, type: 'boardgame,boardgameexpansion'});
  const candidates = search.getRootElement().getChildren('item').slice(0, 8).map(function(item) {
    return {
      id: item.getAttribute('id').getValue(),
      type: item.getAttribute('type').getValue(),
      names: item.getChildren('name').map(function(name) { return name.getAttribute('value').getValue(); })
    };
  });
  if (!candidates.length) throw new Error('No BGG match found for “' + title + '”.');

  const document = fetchBggXmlService_('/thing', {id: candidates.map(function(candidate) { return candidate.id; }).join(','), stats: 1});
  const thingsById = {};
  document.getRootElement().getChildren('item').forEach(function(item) {
    thingsById[item.getAttribute('id').getValue()] = item;
  });

  const scored = candidates.map(function(candidate) {
    const item = thingsById[candidate.id];
    if (!item) return null;
    const score = scoreBggMatch_(title, candidate, item);
    return {candidate: candidate, item: item, score: score};
  }).filter(Boolean).sort(function(left, right) { return right.score - left.score; });

  if (!scored.length || scored[0].score < 58) throw new Error('BGG results were too ambiguous. Add the BGG ID and try again.');
  if (scored[1] && scored[0].score - scored[1].score < 7 && scored[0].score < 80) {
    throw new Error('BGG found multiple close matches. Add the BGG ID and try again.');
  }
  return extractBggThing_(scored[0].item, title, scored[0].score);
}

function scoreBggMatch_(title, candidate, thing) {
  const query = normalizeBggTitle_(title);
  const names = thing.getChildren('name').map(function(name) { return normalizeBggTitle_(name.getAttribute('value').getValue()); });
  let best = 0;
  names.forEach(function(name) { best = Math.max(best, titleSimilarity_(query, name)); });
  let score = best * 100;
  if (names.indexOf(query) !== -1) score += 18;
  const mentionsExpansion = /expansion|promo|pack|module|set|season|ally|allies/i.test(title);
  const isExpansion = candidate.type === 'boardgameexpansion';
  if (isExpansion && !mentionsExpansion) score -= 18;
  if (!isExpansion && mentionsExpansion) score -= 10;
  return Math.round(score);
}

function extractBggThing_(thing, requestedTitle, matchScore) {
  const id = thing.getAttribute('id').getValue();
  const type = thing.getAttribute('type').getValue();
  const names = thing.getChildren('name');
  const primary = names.filter(function(name) {
    return name.getAttribute('type') && name.getAttribute('type').getValue() === 'primary';
  })[0] || names[0];
  const minPlayers = Number(childBggValue_(thing, 'minplayers')) || 0;
  const maxPlayers = Number(childBggValue_(thing, 'maxplayers')) || 0;
  const poll = parseBggPlayerPoll_(thing);
  const average = descendantBggAttribute_(thing, ['statistics', 'ratings', 'average'], 'value');
  const categories = collectBggLinks_(thing, ['boardgamecategory', 'boardgamemechanic']);
  return {
    bggId: id,
    requestedTitle: requestedTitle || '',
    matchName: primary ? primary.getAttribute('value').getValue() : '',
    matchScore: matchScore,
    playersManufacturer: formatBggRange_(minPlayers, maxPlayers),
    playersCommunity: poll.summary,
    bestAt: poll.bestAt,
    goodSoloOption: poll.goodSolo,
    bggScore: average && average !== 'N/A' ? Number(average).toFixed(1) : '',
    bggCategory: categories.slice(0, 6).join(', '),
    expansion: type === 'boardgameexpansion',
    age: Number(childBggValue_(thing, 'minage')) || '',
    bggUrl: 'https://boardgamegeek.com/boardgame/' + id,
    thumbnail: childBggText_(thing, 'thumbnail')
  };
}

function parseBggPlayerPoll_(thing) {
  const polls = thing.getChildren('poll').filter(function(node) {
    return node.getAttribute('name') && node.getAttribute('name').getValue() === 'suggested_numplayers';
  });
  if (!polls.length) return {summary: '', bestAt: '', goodSolo: 'No'};
  const rows = polls[0].getChildren('results').map(function(results) {
    const votes = {};
    results.getChildren('result').forEach(function(result) {
      votes[result.getAttribute('value').getValue()] = Number(result.getAttribute('numvotes').getValue() || 0);
    });
    return {
      count: results.getAttribute('numplayers').getValue(),
      best: votes['Best'] || 0,
      recommended: (votes['Recommended'] || 0) + (votes['Best'] || 0),
      notRecommended: votes['Not Recommended'] || 0
    };
  });
  const supported = rows.filter(function(row) {
    return /^\d+$/.test(row.count) && row.recommended > row.notRecommended;
  }).map(function(row) { return Number(row.count); }).sort(function(a, b) { return a - b; });
  const bestRows = rows.filter(function(row) { return /^\d+$/.test(row.count); }).sort(function(a, b) { return b.best - a.best; });
  const bestAt = bestRows.length && bestRows[0].best > 0
    ? bestRows.filter(function(row) { return row.best === bestRows[0].best; }).map(function(row) { return row.count; }).join(', ')
    : '';
  const goodSolo = rows.some(function(row) { return row.count === '1' && row.recommended > row.notRecommended; }) ? 'Yes' : 'No';
  return {summary: summarizeBggCounts_(supported, bestAt), bestAt: bestAt, goodSolo: goodSolo};
}

function summarizeBggCounts_(counts, bestAt) {
  if (!counts.length) return '';
  const runs = [];
  let start = counts[0];
  let previous = counts[0];
  for (let index = 1; index < counts.length; index += 1) {
    if (counts[index] === previous + 1) {
      previous = counts[index];
    } else {
      runs.push(start === previous ? String(start) : start + '-' + previous);
      start = counts[index];
      previous = counts[index];
    }
  }
  runs.push(start === previous ? String(start) : start + '-' + previous);
  return bestAt ? runs.join(', ') + ', Best: ' + bestAt : runs.join(', ');
}

function fetchBggXmlService_(path, params, attempt) {
  attempt = Number(attempt || 0);
  const properties = PropertiesService.getScriptProperties();
  const token = properties.getProperty('BGG_API_TOKEN');
  if (!token) throw new Error('Maintainer setup is incomplete: BGG_API_TOKEN is missing.');
  throttleBggService_();
  const query = Object.keys(params).map(function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
  }).join('&');
  const url = BGG_API_ROOT + path + '?' + query;
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/xml,text/xml;q=0.9,*/*;q=0.8'
    }
  });
  const code = response.getResponseCode();
  if ([202, 429, 500, 503].indexOf(code) !== -1 && attempt < 3) {
    Utilities.sleep(4500 * (attempt + 1));
    return fetchBggXmlService_(path, params, attempt + 1);
  }
  if (code >= 400) throw new Error('BGG request failed with status ' + code + '.');
  return XmlService.parse(response.getContentText());
}

function throttleBggService_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const last = Number(properties.getProperty('BGG_LAST_REQUEST_AT') || 0);
    const wait = 1300 - (Date.now() - last);
    if (wait > 0) Utilities.sleep(wait);
    properties.setProperty('BGG_LAST_REQUEST_AT', String(Date.now()));
  } finally {
    lock.releaseLock();
  }
}

function normalizeBggTitle_(value) {
  return String(value || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

function titleSimilarity_(left, right) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const overlap = tokenOverlap_(left, right);
  const maxLength = Math.max(left.length, right.length);
  const edit = maxLength ? 1 - levenshtein_(left, right) / maxLength : 0;
  return Math.max(0, overlap * 0.62 + edit * 0.38);
}

function tokenOverlap_(left, right) {
  const leftTokens = {};
  const rightTokens = {};
  left.split(' ').filter(Boolean).forEach(function(token) { leftTokens[token] = true; });
  right.split(' ').filter(Boolean).forEach(function(token) { rightTokens[token] = true; });
  const all = {};
  Object.keys(leftTokens).concat(Object.keys(rightTokens)).forEach(function(token) { all[token] = true; });
  const union = Object.keys(all).length;
  if (!union) return 0;
  const intersection = Object.keys(leftTokens).filter(function(token) { return rightTokens[token]; }).length;
  return intersection / union;
}

function levenshtein_(left, right) {
  const previous = [];
  for (let index = 0; index <= right.length; index += 1) previous[index] = index;
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previous[rightIndex] = Math.min(previous[rightIndex] + 1, previous[rightIndex - 1] + 1, diagonal + cost);
      diagonal = above;
    }
  }
  return previous[right.length];
}

function collectBggLinks_(item, types) {
  return item.getChildren('link').filter(function(link) {
    return types.indexOf(link.getAttribute('type').getValue()) !== -1;
  }).map(function(link) { return link.getAttribute('value').getValue(); });
}

function childBggValue_(element, name) {
  const child = element.getChild(name);
  return child && child.getAttribute('value') ? child.getAttribute('value').getValue() : '';
}

function childBggText_(element, name) {
  const child = element.getChild(name);
  return child ? child.getText() : '';
}

function descendantBggAttribute_(element, path, attribute) {
  let current = element;
  for (let index = 0; index < path.length; index += 1) {
    current = current && current.getChild(path[index]);
  }
  return current && current.getAttribute(attribute) ? current.getAttribute(attribute).getValue() : '';
}

function formatBggRange_(min, max) {
  if (!min && !max) return '';
  return min === max ? String(min) : min + '-' + max;
}

function serviceJson_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
