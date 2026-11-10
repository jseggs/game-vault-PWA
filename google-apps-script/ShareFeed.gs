/**
 * Game Vault share feed (read-only).
 *
 * Serves the collection to the public share page as JSON. It only reads, and
 * it only returns the fields listed in buildFeed_ below. Notes, prices, tax,
 * shipping, vendor, buy reason, year bought, sell flags, and plays never
 * leave the sheet. There is no doPost, so this deployment cannot change data.
 *
 * Keep this in its OWN standalone Apps Script project. Do not add it to the
 * project that handles write-back, or the share page would reveal that URL.
 *
 * Setup:
 *   1. Go to https://script.new and paste this file over Code.gs.
 *   2. Set SPREADSHEET_ID below to the ID in your sheet's address bar:
 *      docs.google.com/spreadsheets/d/<THIS PART>/edit
 *   3. Deploy > New deployment > Web app.
 *      Execute as: Me. Who has access: Anyone.
 *   4. Copy the web app URL (ends in /exec) into FEED_URL in share/index.html.
 */
const SPREADSHEET_ID = 'PASTE_SPREADSHEET_ID_HERE';
const GAMES_SHEET = 'Games';
const PLAYERS_SHEET = 'Players';
const INCLUDE_RATINGS = true;   // false hides both players' ratings
const READY_ONLY = false;       // true keeps only rows where "E knows?" is 1
const CACHE_SECONDS = 60;       // how long a response is reused before re-reading the sheet

function doGet() {
  const cache = CacheService.getScriptCache();
  let body = cache.get('share-feed');
  if (!body) {
    body = JSON.stringify(buildFeed_());
    try {
      cache.put('share-feed', body, CACHE_SECONDS);
    } catch (error) {
      // Larger than the cache limit: serve uncached.
    }
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function buildFeed_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const games = readRows_(ss.getSheetByName(GAMES_SHEET))
    .filter(function (row) { return row['Game']; })
    .filter(function (row) { return !READY_ONLY || isOne_(row['E knows?']); })
    .map(function (row) {
      return {
        n: row['Game'],
        s: row['Shelf'],
        pl: row['Players (Manufacturer)'] || row['Players'] || '',
        plBGG: row['Players (BGG Comm)'],
        ba: row['Best At'],
        so: row['Good solo option'] || row['Solo'] || '',
        bg: parseFloat(row['BGG Score']) || 0,
        cat: row['BGG Category'],
        played: String(row['Played']).toLowerCase() === 'yes',
        exp: isOne_(row['Expansion']) || String(row['Expansion']).toLowerCase() === 'yes',
        r1: INCLUDE_RATINGS ? row['J Rating'] : '',
        r2: INCLUDE_RATINGS ? row['E Rating'] : '',
        url: row['BGG URL'],
        id: row['BGG ID'],
        thumb: row['BGG Thumbnail'] || row['Thumbnail'] || ''
      };
    });

  const names = ['Player 1', 'Player 2'];
  readRows_(ss.getSheetByName(PLAYERS_SHEET)).forEach(function (row) {
    const number = parseInt(row['Player #'] || row['Player'] || row['Player Number'], 10);
    const name = row['Name'] || row['Player Name'];
    if ((number === 1 || number === 2) && name) names[number - 1] = name;
  });

  return {
    status: 'ok',
    players: [{name: names[0]}, {name: names[1]}],
    games: games
  };
}

/** Returns the sheet as objects keyed by trimmed header, with every value as trimmed text. */
function readRows_(sheet) {
  if (!sheet) return [];
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0].map(function (header) { return String(header).trim(); });
  return values.slice(1).map(function (cells) {
    const row = {};
    headers.forEach(function (header, index) {
      if (header) row[header] = String(cells[index] == null ? '' : cells[index]).trim();
    });
    return row;
  });
}

function isOne_(value) {
  return Number(String(value || '').trim()) === 1;
}
