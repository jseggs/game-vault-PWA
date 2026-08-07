# Community Edition Privacy Model

## Public demo

The hosted Community Edition contains bundled sample games and sample plays. It has no default Google Sheet URL, Apps Script deployment URL, write key, personal player name, personal note, or Google Drive identifier. It uses no analytics or advertising trackers. Sample cover art loads from BoardGameGeek's public image CDN, which receives the normal technical details of a web request such as IP address and browser user agent.

## Browser storage

When a visitor enters connection settings, the app stores them in that browser's local storage. The settings are not committed to this repository and are not sent to the demo maintainer. A person with access to the unlocked device and browser profile may be able to read them.

## Google Sheets

The app reads only CSV URLs that the user pastes into Settings. Google Sheets “Publish to web” makes each selected tab available to anyone who has its URL. Users should publish only `Games`, `Plays`, `Stats`, and `Players`, and should keep sensitive information out of those tabs.

## Sheet connector

The connector is copied into and bound to the user's own tracker Sheet. Its manifest requests access to the current spreadsheet and permission to make an external request. It does not request Gmail, Contacts, Calendar, or broad Drive scopes. Write requests require a random private key stored in Apps Script properties and in the user's local browser.

## BGG lookup service

The separate BGG lookup service receives only a board-game title or numeric BGG ID. It returns public BoardGameGeek metadata. It does not receive a Google Sheet ID, published CSV URL, Drive OAuth token, player name, play history, rating, note, or write key. Responses may be cached temporarily to reduce API traffic.

## Revoking access

Users can delete the Apps Script deployment, unpublish Sheet tabs, revoke the script in Google Account security settings, and clear site data in their browser at any time.

This document describes the packaged Community Edition. A person who modifies or rehosts it should update this statement to match their version.
