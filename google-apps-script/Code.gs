function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  var result = {status: 'ok'};

  // Log play to Plays sheet.
  if (data.action === 'add' || data.action === 'delete') {
    var playsSheet = ss.getSheetByName('Plays');
    if (!playsSheet) {
      playsSheet = ss.insertSheet('Plays');
      playsSheet.appendRow(['Date', 'Game', 'Winner', 'Notes', 'J Rating', 'E Rating']);
    }
    if (data.action === 'add') {
      playsSheet.appendRow([data.date, data.game, data.winner, data.notes || '', data.jRat || '', data.eRat || '']);

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
      var playTimeZone = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
      for (var playRow = playValues.length - 1; playRow >= 1; playRow--) {
        if (
          normalizePlayDate_(playValues[playRow][0], playTimeZone) === normalizePlayDate_(data.date, playTimeZone) &&
          normalizePlayText_(playValues[playRow][1]) === normalizePlayText_(data.game) &&
          normalizePlayText_(playValues[playRow][2]) === normalizePlayText_(data.winner)
        ) {
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

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({status: 'ok'}))
    .setMimeType(ContentService.MimeType.JSON);
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
