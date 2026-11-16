/**
 * Access keys. Every request must carry one of two keys, kept in Script
 * Properties (never in this file):
 *   OWNER_KEY   full access, including spend columns and collection value.
 *   FAMILY_KEY  can view the collection and log plays and ratings, but never
 *               receives the spend columns, game notes, or the Stats sheet.
 * Keys are created once by opening <web app URL>?action=setup, which returns
 * them a single time. To replace them, delete both Script Properties and
 * open ?action=setup again; every device then needs a new invite link.
 */
// Not sent to family devices. Notes are included because some mention prices.
var SPEND_COLUMNS = ['Price paid', "Add'l Tax?", 'Tax', 'Shipping', 'Total', 'Bought condition', 'Vendor', 'Where', 'Buy Reason', 'Notes'];

function accessRole_(key) {
  var given = String(key || '');
  if (!given) return '';
  var props = PropertiesService.getScriptProperties();
  if (given === props.getProperty('OWNER_KEY')) return 'owner';
  if (given === props.getProperty('FAMILY_KEY')) return 'family';
  return '';
}

function jsonOutput_(result) {
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function denied_() {
  return jsonOutput_({status: 'error', message: 'This connection has no valid access key. Open a new invite link.'});
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  if (!accessRole_(data.key)) return denied_();
  var result = {status: 'ok'};

  // Log play to Plays sheet.
  if (data.action === 'add' || data.action === 'delete') {
    var playsSheet = ss.getSheetByName('Plays');
    if (!playsSheet) {
      playsSheet = ss.insertSheet('Plays');
      playsSheet.appendRow(['Date', 'Game', 'Winner', 'Notes', 'J Rating', 'E Rating', 'Play ID']);
    }
    if (data.action === 'add') {
      var playId = data.id || Utilities.getUuid();
      appendPlayRow_(playsSheet, {
        'Date': data.date,
        'Game': data.game,
        'Winner': data.winner,
        'Notes': data.notes || '',
        'J Rating': data.jRat || '',
        'E Rating': data.eRat || '',
        'Play ID': playId
      });
      result.playId = playId;

      // Mark game as Played and write ratings to Games sheet.
      if (data.markPlayed || data.jRat || data.eRat) {
        var gamesSheet = ss.getSheetByName('Games');
        if (gamesSheet) {
          var gameValues = gamesSheet.getDataRange().getValues();
          var gameHeaders = gameValues[0];
          var playedCol = gameHeaders.indexOf('Played') + 1;
          var jRatCol = gameHeaders.indexOf('J Rating') + 1;
          var eRatCol = gameHeaders.indexOf('E Rating') + 1;
          for (var i = 1; i < gameValues.length; i++) {
            if (gameValues[i][0] === data.game) {
              if (data.markPlayed && playedCol > 0) {
                var currentPlayed = (gameValues[i][playedCol - 1] || '').toString().toLowerCase();
                if (currentPlayed !== 'yes') gamesSheet.getRange(i + 1, playedCol).setValue('Yes');
              }
              if (data.jRat && jRatCol > 0) gamesSheet.getRange(i + 1, jRatCol).setValue(parseFloat(data.jRat));
              if (data.eRat && eRatCol > 0) gamesSheet.getRange(i + 1, eRatCol).setValue(parseFloat(data.eRat));
              break;
            }
          }
        }
      }
    } else {
      result.playDeleted = false;
      var playValues = playsSheet.getDataRange().getValues();
      var playHeaders = playValues[0];
      var playIdCol = playHeaders.indexOf('Play ID');
      var notesCol = playHeaders.indexOf('Notes');
      var playJRatingCol = playHeaders.indexOf('J Rating');
      var playERatingCol = playHeaders.indexOf('E Rating');
      var playTimeZone = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
      for (var playRow = playValues.length - 1; playRow >= 1; playRow--) {
        var idMatches = data.id && playIdCol >= 0 &&
          normalizePlayText_(playValues[playRow][playIdCol]) === normalizePlayText_(data.id);
        var legacyMatches =
          normalizePlayDate_(playValues[playRow][0], playTimeZone) === normalizePlayDate_(data.date, playTimeZone) &&
          normalizePlayText_(playValues[playRow][1]) === normalizePlayText_(data.game) &&
          normalizePlayText_(playValues[playRow][2]) === normalizePlayText_(data.winner) &&
          (notesCol < 0 || normalizePlayText_(playValues[playRow][notesCol]) === normalizePlayText_(data.notes)) &&
          (playJRatingCol < 0 || normalizePlayText_(playValues[playRow][playJRatingCol]) === normalizePlayText_(data.jRat)) &&
          (playERatingCol < 0 || normalizePlayText_(playValues[playRow][playERatingCol]) === normalizePlayText_(data.eRat));
        if (idMatches || (!data.id && legacyMatches)) {
          playsSheet.deleteRow(playRow + 1);
          result.playDeleted = true;
          break;
        }
      }
      if (!result.playDeleted) result.message = 'No matching play was found in the Plays sheet.';
    }
  }

  // Update ratings without logging a play.
  if (data.action === 'rate') {
    result.ratingsUpdated = false;
    var ratingSheet = ss.getSheetByName('Games');
    if (ratingSheet) {
      var ratingValues = ratingSheet.getDataRange().getValues();
      var ratingHeaders = ratingValues[0];
      var jRatingCol = ratingHeaders.indexOf('J Rating') + 1;
      var eRatingCol = ratingHeaders.indexOf('E Rating') + 1;
      for (var ratingRow = 1; ratingRow < ratingValues.length; ratingRow++) {
        if (
          (ratingValues[ratingRow][0] || '').toString().trim() ===
          (data.game || '').toString().trim()
        ) {
          if (data.jRat !== '' && jRatingCol > 0) {
            ratingSheet.getRange(ratingRow + 1, jRatingCol).setValue(parseFloat(data.jRat));
          }
          if (data.eRat !== '' && eRatingCol > 0) {
            ratingSheet.getRange(ratingRow + 1, eRatingCol).setValue(parseFloat(data.eRat));
          }
          result.ratingsUpdated = true;
          break;
        }
      }
    }
  }

  // Update Excluded column in Games sheet.
  if (data.action === 'exclude') {
    var exclusionSheet = ss.getSheetByName('Games');
    if (exclusionSheet) {
      var exclusionValues = exclusionSheet.getDataRange().getValues();
      var exclusionHeaders = exclusionValues[0];
      var excludedCol = exclusionHeaders.indexOf('Excluded') + 1;
      if (excludedCol === 0) {
        excludedCol = exclusionHeaders.length + 1;
        exclusionSheet.getRange(1, excludedCol).setValue('Excluded');
      }
      for (var exclusionRow = 1; exclusionRow < exclusionValues.length; exclusionRow++) {
        if (exclusionValues[exclusionRow][0] === data.game) {
          exclusionSheet.getRange(exclusionRow + 1, excludedCol).setValue(data.excluded ? 1 : '');
          break;
        }
      }
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * GET ?action=data&key=... returns the sheets for the app, so the spreadsheet
 * does not need to be published to the web. What comes back depends on the key.
 * GET ?action=setup creates the two access keys once and returns them.
 */
function doGet(e) {
  var params = (e && e.parameter) || {};
  var props = PropertiesService.getScriptProperties();

  if (params.action === 'setup') {
    if (props.getProperty('OWNER_KEY')) {
      return jsonOutput_({status: 'error', message: 'Access keys already exist.'});
    }
    var ownerKey = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    var familyKey = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('OWNER_KEY', ownerKey);
    props.setProperty('FAMILY_KEY', familyKey);
    return jsonOutput_({status: 'ok', ownerKey: ownerKey, familyKey: familyKey});
  }

  if (params.action === 'data') {
    var role = accessRole_(params.key);
    if (!role) return denied_();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result = {status: 'ok', role: role};
    result.games = readSheetRows_(ss.getSheetByName('Games'), role === 'owner' ? [] : SPEND_COLUMNS);
    result.plays = readSheetRows_(ss.getSheetByName('Plays'), []);
    result.players = readSheetRows_(ss.getSheetByName('Players'), []);
    result.stats = role === 'owner' ? readSheetRows_(ss.getSheetByName('Stats'), []) : [];
    if (role === 'owner') result.familyKey = props.getProperty('FAMILY_KEY');
    return jsonOutput_(result);
  }

  return jsonOutput_({status: 'ok'});
}

/** Rows as objects keyed by trimmed header, using the values as displayed in the sheet. Omitted columns are never read into the response. */
function readSheetRows_(sheet, omitColumns) {
  if (!sheet) return [];
  var values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (header) { return String(header).trim(); });
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var row = {};
    var hasValue = false;
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c] || omitColumns.indexOf(headers[c]) >= 0) continue;
      var cell = String(values[r][c] == null ? '' : values[r][c]).trim();
      row[headers[c]] = cell;
      if (cell) hasValue = true;
    }
    if (hasValue) rows.push(row);
  }
  return rows;
}

function normalizePlayDate_(value, timeZone) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd');
  }

  var text = String(value || '').trim();
  var iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];

  var slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    return slash[3] + '-' + ('0' + slash[1]).slice(-2) + '-' + ('0' + slash[2]).slice(-2);
  }

  var parsed = new Date(text);
  return isNaN(parsed.getTime()) ? text : Utilities.formatDate(parsed, timeZone, 'yyyy-MM-dd');
}

function normalizePlayText_(value) {
  return String(value || '').trim().toLowerCase();
}

function appendPlayRow_(sheet, valuesByHeader) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Object.keys(valuesByHeader).forEach(function(header) {
    if (headers.indexOf(header) === -1) {
      headers.push(header);
      sheet.getRange(1, headers.length).setValue(header);
    }
  });
  var row = headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(valuesByHeader, header) ? valuesByHeader[header] : '';
  });
  sheet.appendRow(row);
}
