const GAME_VAULT_GAMES_SHEET = 'Games';
const GAME_VAULT_SERVICE_URL_KEY = 'GAME_VAULT_BGG_SERVICE_URL';
const GAME_VAULT_SERVICE_TOKEN_KEY = 'GAME_VAULT_BGG_SERVICE_TOKEN';
const GAME_VAULT_BGG_HEADERS = [
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
  'BGG Match Status',
  'BGG URL',
  'BGG Thumbnail',
  'BGG Updated At'
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Game Vault')
    .addSubMenu(
      SpreadsheetApp.getUi()
        .createMenu('BGG Sync')
        .addItem('Refresh selected row', 'gameVaultRefreshSelectedRow')
        .addItem('Refresh missing games', 'gameVaultRefreshMissingRows')
        .addItem('Refresh all games', 'gameVaultRefreshAllRows')
    )
    .addToUi();
}

function gameVaultRefreshSelectedRow() {
  const sheet = gameVaultGetGamesSheet_();
  const row = sheet.getActiveRange().getRow();
  if (row <= 1) throw new Error('Select a game row first.');
  gameVaultEnrichRow_(sheet, row);
}

function gameVaultRefreshMissingRows() {
  const sheet = gameVaultGetGamesSheet_();
  const headers = gameVaultEnsureHeaders_(sheet);
  const values = sheet.getDataRange().getValues();
  for (let row = 2; row <= values.length; row += 1) {
    const title = String(values[row - 1][headers['Game'] - 1] || '').trim();
    const score = String(values[row - 1][headers['BGG Score'] - 1] || '').trim();
    if (!title || score) continue;
    gameVaultEnrichRow_(sheet, row);
  }
}

function gameVaultRefreshAllRows() {
  const sheet = gameVaultGetGamesSheet_();
  const headers = gameVaultEnsureHeaders_(sheet);
  const values = sheet.getDataRange().getValues();
  for (let row = 2; row <= values.length; row += 1) {
    const title = String(values[row - 1][headers['Game'] - 1] || '').trim();
    if (!title) continue;
    gameVaultEnrichRow_(sheet, row);
  }
}

function gameVaultEnrichRow_(sheet, row) {
  const headers = gameVaultEnsureHeaders_(sheet);
  const title = String(sheet.getRange(row, headers['Game']).getValue() || '').trim();
  const manualId = headers['BGG ID'] ? String(sheet.getRange(row, headers['BGG ID']).getValue() || '').trim() : '';
  if (!title && !manualId) return;

  sheet.getRange(row, headers['BGG Match Status']).setValue('Searching');
  const payload = manualId ? { bggId: manualId } : { title: title };
  const enriched = gameVaultFetchEnrichment_(payload);

  sheet.getRange(row, headers['Players (Manufacturer)']).setValue(enriched.playersManufacturer || '');
  sheet.getRange(row, headers['Players (BGG Comm)']).setValue(enriched.playersCommunity || '');
  sheet.getRange(row, headers['Best At']).setValue(enriched.bestAt || '');
  sheet.getRange(row, headers['Good solo option']).setValue(enriched.goodSoloOption || '');
  sheet.getRange(row, headers['BGG Score']).setValue(enriched.bggScore || '');
  sheet.getRange(row, headers['BGG Category']).setValue(enriched.bggCategory || '');
  sheet.getRange(row, headers['Expansion']).setValue(enriched.expansion ? 1 : '');
  sheet.getRange(row, headers['Age']).setValue(enriched.age || '');
  sheet.getRange(row, headers['BGG ID']).setValue(enriched.bggId || '');
  sheet.getRange(row, headers['BGG Match Name']).setValue(enriched.matchName || title);
  sheet.getRange(row, headers['BGG Match Status']).setValue('Matched');
  sheet.getRange(row, headers['BGG URL']).setValue(enriched.bggUrl || '');
  sheet.getRange(row, headers['BGG Thumbnail']).setValue(enriched.thumbnail || '');
  sheet.getRange(row, headers['BGG Updated At']).setValue(new Date());
}

function gameVaultFetchEnrichment_(payload) {
  const props = PropertiesService.getScriptProperties();
  const baseUrl = String(props.getProperty(GAME_VAULT_SERVICE_URL_KEY) || '').trim();
  const token = String(props.getProperty(GAME_VAULT_SERVICE_TOKEN_KEY) || '').trim();
  if (!baseUrl) throw new Error('Missing Script Property: ' + GAME_VAULT_SERVICE_URL_KEY);

  const options = {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
    headers: {}
  };
  if (token) options.headers.Authorization = 'Bearer ' + token;

  const response = UrlFetchApp.fetch(baseUrl.replace(/\/$/, '') + '/api/enrich', options);
  if (response.getResponseCode() >= 400) {
    throw new Error('BGG service error: ' + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}

function gameVaultGetGamesSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GAME_VAULT_GAMES_SHEET);
  if (!sheet) throw new Error('Missing Games sheet');
  return sheet;
}

function gameVaultEnsureHeaders_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values.length ? values[0] : [];
  const required = ['Game'].concat(GAME_VAULT_BGG_HEADERS);
  let width = headers.length;
  required.forEach(name => {
    if (headers.indexOf(name) === -1) {
      width += 1;
      sheet.getRange(1, width).setValue(name);
      headers.push(name);
    }
  });
  const out = {};
  headers.forEach((name, idx) => {
    out[String(name).trim()] = idx + 1;
  });
  return out;
}
