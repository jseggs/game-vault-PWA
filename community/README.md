# Game Vault Community Edition

Game Vault Community Edition is a privacy-safe demo and a do-it-yourself starter kit for a board game collection, game picker, play log, and statistics tracker.

The public demo contains only bundled sample games. It has no default Google Sheet URL, Apps Script URL, write key, player name, personal note, or Drive identifier. A visitor can explore it immediately, then connect a Sheet they own from Settings.

## Start here

1. Open the [beginner setup guide](GETTING-STARTED.md).
2. Download [Game-Vault-Community-Template.xlsx](template/Game-Vault-Community-Template.xlsx).
3. Upload the workbook to Google Drive and open it with Google Sheets.
4. Add the packaged Sheet connector from [google-apps-script](google-apps-script).
5. Publish only the `Games`, `Plays`, `Stats`, and `Players` tabs as CSV.
6. Paste those four URLs, the Apps Script web-app URL, and your private write key into the app's Settings screen.

Live demo: <https://jseggs.github.io/game-vault-PWA/community/>

Complete download: [Game-Vault-Community-Starter.zip](downloads/Game-Vault-Community-Starter.zip)

## What is included

- `index.html`, `cabinet.css`, and PWA files: the installable Community Edition app
- `template/`: an import-ready Google Sheets workbook
- `google-apps-script/`: the per-user connector that writes only to the copied Sheet
- `maintainer-bgg-service/`: a separate lookup service that keeps the approved BGG token server-side
- `GETTING-STARTED.md`: literal click-by-click instructions for non-coders
- `MAINTAINER.md`: the one-time release and BGG service checklist
- `PRIVACY.md`: the privacy model in plain English

## Deliberate privacy boundaries

- Connection URLs and the write key are stored in that browser's local storage, not in this repository.
- The public demo never calls Google Sheets, Apps Script, or the BGG metadata service until a visitor adds their own connections. Sample cover art loads from BoardGameGeek's public image CDN.
- The Sheet connector carries `@OnlyCurrentDoc` and explicit minimum OAuth scopes.
- The BGG lookup service receives only a game title or BGG ID. It does not receive a Google Sheet URL or Drive token.
- Google Sheets CSV publishing makes the selected tab public. Never publish `START HERE`, `Lists`, or a tab containing secrets or private notes.

## Removed from this edition

The `Ready to Play` column and global filter are intentionally absent from the Community Edition app, template, and scripts.

## License and credits

The software follows the repository license. BoardGameGeek names, ratings, images, and metadata remain the property of their respective owners. Keep the included “Powered by BoardGameGeek” attribution visible when using BGG data.
