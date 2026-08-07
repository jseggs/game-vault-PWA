/** @OnlyCurrentDoc */

const BGG_STATUS_COLUMN = 'BGG Match Status';
// The maintainer may paste the public lookup-service URL here before sharing the package.
// Leaving it blank is safe: each user will be prompted once when they use BGG enrichment.
const DEFAULT_BGG_SERVICE_URL = '';
const BGG_OUTPUT_COLUMNS = [
  'Players (Manufacturer)', 'Players (BGG Comm)', 'Best At', 'Good solo option',
  'BGG Score', 'BGG Category', 'Expansion', 'Age', 'BGG ID', 'BGG Match Name',
  'BGG Match Score', 'BGG Match Status', 'BGG URL', 'BGG Thumbnail', 'BGG Updated At'
];

function getBggServiceUrl_() {
  return String(PropertiesService.getScriptProperties().getProperty('BGG_SERVICE_URL') || DEFAULT_BGG_SERVICE_URL || '').trim();
}

function setBggServiceUrl() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Game Vault BGG service',
    'Paste the community BGG service URL supplied by the Game Vault maintainer.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const url = response.getResponseText().trim();
  if (!/^https:\/\//i.test(url)) throw new Error('Use the full HTTPS service URL.');
  PropertiesService.getScriptProperties().setProperty('BGG_SERVICE_URL', url);
  ui.alert('BGG service saved.');
}

function enrichSelectedGameFromBgg() {
  const sheet = getGamesSheetForBgg_();
  const row = sheet.getActiveRange().getRow();
  if (row < 2) throw new Error('Select a game row first.');
  enrichBggRow_(sheet, row);
}

function enrichQueuedGamesFromBgg() {
  const sheet = getGamesSheetForBgg_();
  const headers = ensureBggHeaders_(sheet);
  const values = sheet.getDataRange().getValues();
  let processed = 0;
  for (let row = 2; row <= values.length && processed < 20; row += 1) {
    const title = String(values[row - 1][headers['Game'] - 1] || '').trim();
    const status = String(values[row - 1][headers[BGG_STATUS_COLUMN] - 1] || '').trim();
    if (!title || (status && status !== 'Queued' && status !== 'Needs review')) continue;
    enrichBggRow_(sheet, row);
    processed += 1;
  }
  SpreadsheetApp.getUi().alert('BGG lookup complete for ' + processed + ' row(s).');
}

function enrichBggRow_(sheet, row) {
  const headers = ensureBggHeaders_(sheet);
  const title = String(sheet.getRange(row, headers['Game']).getValue() || '').trim();
  const bggId = String(sheet.getRange(row, headers['BGG ID']).getValue() || '').trim();
  if (!title && !bggId) throw new Error('The selected row needs a Game title or BGG ID.');

  sheet.getRange(row, headers[BGG_STATUS_COLUMN]).setValue('Searching');
  try {
    const data = callBggService_({title: title, bggId: bggId});
    const output = {
      'Players (Manufacturer)': data.playersManufacturer || '',
      'Players (BGG Comm)': data.playersCommunity || '',
      'Best At': data.bestAt || '',
      'Good solo option': data.goodSoloOption || 'No',
      'BGG Score': data.bggScore || '',
      'BGG Category': data.bggCategory || '',
      'Expansion': data.expansion ? 'Yes' : 'No',
      'Age': data.age || '',
      'BGG ID': data.bggId || bggId,
      'BGG Match Name': data.matchName || title,
      'BGG Match Score': data.matchScore || '',
      'BGG Match Status': 'Matched',
      'BGG URL': data.bggUrl || '',
      'BGG Thumbnail': data.thumbnail || '',
      'BGG Updated At': new Date()
    };
    Object.keys(output).forEach(function(header) {
      sheet.getRange(row, headers[header]).setValue(output[header]);
    });
  } catch (error) {
    sheet.getRange(row, headers[BGG_STATUS_COLUMN]).setValue('Needs review');
    throw error;
  }
}

function callBggService_(payload) {
  const url = getBggServiceUrl_();
  if (!url) {
    setBggServiceUrl();
    throw new Error('BGG service URL was not set. Run the command again after saving it.');
  }
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  const body = response.getContentText();
  let data;
  try { data = JSON.parse(body); } catch (error) { throw new Error('BGG service returned an unreadable response.'); }
  if (code >= 400 || data.status === 'error' || data.error) throw new Error(data.message || data.error || 'BGG lookup failed.');
  return data.data || data;
}

function getGamesSheetForBgg_() {
  const sheet = getBoundSpreadsheet_().getSheetByName(GAME_VAULT_GAMES_SHEET);
  if (!sheet) throw new Error('The template needs a Games tab.');
  return sheet;
}

function ensureBggHeaders_(sheet) {
  const required = ['Game'].concat(BGG_OUTPUT_COLUMNS);
  const result = ensureHeaders_(sheet, required);
  const oneBased = {};
  Object.keys(result.map).forEach(function(header) { oneBased[header] = result.map[header] + 1; });
  return oneBased;
}
