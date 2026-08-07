/** @OnlyCurrentDoc */

const GAME_VAULT_VERSION = 'Community Edition 1.0';
const GAME_VAULT_GAMES_SHEET = 'Games';
const GAME_VAULT_PLAYS_SHEET = 'Plays';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Game Vault')
    .addItem('Show connection key', 'showGameVaultConnection')
    .addItem('Set BGG service URL', 'setBggServiceUrl')
    .addSeparator()
    .addItem('Enrich selected game from BGG', 'enrichSelectedGameFromBgg')
    .addItem('Enrich queued games from BGG', 'enrichQueuedGamesFromBgg')
    .addToUi();
}

function showGameVaultConnection() {
  const properties = PropertiesService.getScriptProperties();
  let writeKey = properties.getProperty('GAME_VAULT_WRITE_KEY');
  if (!writeKey) {
    writeKey = Utilities.getUuid().replace(/-/g, '');
    properties.setProperty('GAME_VAULT_WRITE_KEY', writeKey);
  }

  const safeKey = escapeHtml_(writeKey);
  const bggReady = Boolean(getBggServiceUrl_());
  const html = HtmlService.createHtmlOutput(
    '<div style="font:14px/1.45 system-ui;padding:18px;color:#111827">' +
      '<h2 style="margin:0 0 8px">Game Vault connection</h2>' +
      '<p>Copy this private write key into Game Vault → Settings. Do not publish it in a Sheet tab.</p>' +
      '<textarea id="key" readonly style="box-sizing:border-box;width:100%;height:72px;padding:10px">' + safeKey + '</textarea>' +
      '<button onclick="var field=document.getElementById(\'key\');field.select();document.execCommand(\'copy\');this.textContent=\'Copied\'" style="margin-top:10px;padding:9px 14px">Copy key</button>' +
      '<p style="margin-top:16px;color:#4b5563">BGG lookup service: <strong>' + (bggReady ? 'ready' : 'not configured') + '</strong></p>' +
    '</div>'
  ).setWidth(460).setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'Game Vault');
}

function doGet() {
  return jsonResponse_({
    status: 'ok',
    name: 'Game Vault Sheet Connector',
    version: GAME_VAULT_VERSION,
    access: 'This connector is bound to one spreadsheet and requires a private write key.'
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    assertWriteKey_(data.writeKey);
    if (!lock.tryLock(10000)) throw new Error('The Sheet is busy. Try again in a moment.');

    let result;
    switch (data.action) {
      case 'ping':
        result = {status: 'ok', version: GAME_VAULT_VERSION};
        break;
      case 'add':
        result = addPlay_(data);
        break;
      case 'delete':
        result = deletePlay_(data);
        break;
      case 'rate':
        result = updateRatings_(data);
        break;
      case 'exclude':
        result = updateExclusion_(data);
        break;
      default:
        throw new Error('Unknown action.');
    }
    return jsonResponse_(result);
  } catch (error) {
    return jsonResponse_({status: 'error', message: error.message || String(error)});
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function addPlay_(data) {
  const ss = getBoundSpreadsheet_();
  const playsSheet = getOrCreateSheet_(ss, GAME_VAULT_PLAYS_SHEET, [
    'Date', 'Game', 'Winner', 'Notes', 'P1 Rating', 'P2 Rating', 'Play ID'
  ]);
  const playId = data.id || Utilities.getUuid();
  appendByHeaders_(playsSheet, {
    'Date': data.date || '',
    'Game': data.game || '',
    'Winner': data.winner || '',
    'Notes': data.notes || '',
    'P1 Rating': data.p1Rat || '',
    'P2 Rating': data.p2Rat || '',
    'Play ID': playId
  });

  if (data.markPlayed || data.p1Rat || data.p2Rat) {
    updateGameRow_(data.game, function(sheet, row, headers) {
      if (data.markPlayed) setByHeader_(sheet, row, headers, 'Played', 'Yes');
      if (data.p1Rat !== '') setByHeader_(sheet, row, headers, 'P1 Rating', numberOrBlank_(data.p1Rat));
      if (data.p2Rat !== '') setByHeader_(sheet, row, headers, 'P2 Rating', numberOrBlank_(data.p2Rat));
    });
  }
  return {status: 'ok', playId: playId};
}

function deletePlay_(data) {
  const sheet = getBoundSpreadsheet_().getSheetByName(GAME_VAULT_PLAYS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return {status: 'ok', playDeleted: false};
  const values = sheet.getDataRange().getValues();
  const headers = headerMapFromValues_(values[0]);
  const timeZone = getBoundSpreadsheet_().getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  for (let row = values.length - 1; row >= 1; row -= 1) {
    const record = values[row];
    const idMatches = data.id && normalizeText_(valueAt_(record, headers, 'Play ID')) === normalizeText_(data.id);
    const legacyMatches =
      normalizeDate_(valueAt_(record, headers, 'Date'), timeZone) === normalizeDate_(data.date, timeZone) &&
      normalizeText_(valueAt_(record, headers, 'Game')) === normalizeText_(data.game) &&
      normalizeText_(valueAt_(record, headers, 'Winner')) === normalizeText_(data.winner);
    if (idMatches || (!data.id && legacyMatches)) {
      sheet.deleteRow(row + 1);
      return {status: 'ok', playDeleted: true};
    }
  }
  return {status: 'ok', playDeleted: false, message: 'No matching play was found.'};
}

function updateRatings_(data) {
  let updated = false;
  updateGameRow_(data.game, function(sheet, row, headers) {
    if (data.p1Rat !== '') setByHeader_(sheet, row, headers, 'P1 Rating', numberOrBlank_(data.p1Rat));
    if (data.p2Rat !== '') setByHeader_(sheet, row, headers, 'P2 Rating', numberOrBlank_(data.p2Rat));
    updated = true;
  });
  return {status: 'ok', ratingsUpdated: updated};
}

function updateExclusion_(data) {
  let updated = false;
  updateGameRow_(data.game, function(sheet, row, headers) {
    setByHeader_(sheet, row, headers, 'Excluded', data.excluded ? 'Yes' : 'No');
    updated = true;
  });
  return {status: 'ok', exclusionUpdated: updated};
}

function updateGameRow_(gameName, updater) {
  const sheet = getBoundSpreadsheet_().getSheetByName(GAME_VAULT_GAMES_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return;
  const values = sheet.getDataRange().getValues();
  const headers = headerMapFromValues_(values[0]);
  const gameIndex = headers['Game'];
  if (gameIndex === undefined) throw new Error('The Games tab needs a Game column.');
  for (let index = 1; index < values.length; index += 1) {
    if (normalizeText_(values[index][gameIndex]) === normalizeText_(gameName)) {
      updater(sheet, index + 1, headers);
      return;
    }
  }
}

function appendByHeaders_(sheet, valuesByHeader) {
  const headers = ensureHeaders_(sheet, Object.keys(valuesByHeader));
  const row = headers.values.map(function(header) {
    return Object.prototype.hasOwnProperty.call(valuesByHeader, header) ? valuesByHeader[header] : '';
  });
  sheet.appendRow(row);
}

function setByHeader_(sheet, row, headers, header, value) {
  let index = headers[header];
  if (index === undefined) {
    index = sheet.getLastColumn();
    sheet.getRange(1, index + 1).setValue(header);
    headers[header] = index;
  }
  sheet.getRange(row, index + 1).setValue(value);
}

function getBoundSpreadsheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('This script must be created from Extensions → Apps Script inside the Game Vault Sheet.');
  return ss;
}

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  ensureHeaders_(sheet, headers);
  return sheet;
}

function ensureHeaders_(sheet, required) {
  let values = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  required.forEach(function(header) {
    if (values.indexOf(header) === -1) {
      values.push(header);
      sheet.getRange(1, values.length).setValue(header);
    }
  });
  return {values: values, map: headerMapFromValues_(values)};
}

function headerMapFromValues_(headers) {
  const map = {};
  headers.forEach(function(header, index) { map[String(header).trim()] = index; });
  return map;
}

function valueAt_(row, headers, header) {
  return headers[header] === undefined ? '' : row[headers[header]];
}

function assertWriteKey_(provided) {
  const expected = PropertiesService.getScriptProperties().getProperty('GAME_VAULT_WRITE_KEY');
  if (!expected) throw new Error('Run Game Vault → Show connection key in the Sheet first.');
  if (!provided || String(provided) !== expected) throw new Error('Private write key is missing or incorrect.');
}

function numberOrBlank_(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
}

function normalizeDate_(value, timeZone) {
  if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd');
  const text = String(value || '').trim();
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? text : Utilities.formatDate(parsed, timeZone, 'yyyy-MM-dd');
}

function normalizeText_(value) {
  return String(value || '').trim().toLowerCase();
}

function escapeHtml_(value) {
  return String(value || '').replace(/[&<>"']/g, function(char) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
  });
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
