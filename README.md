# Game Vault

A personal board game collection app: collection browser, game picker, play log, and head-to-head stats. It reads and writes a private Google Sheet through a Google Apps Script web app.

Live app: https://jseggs.github.io/game-vault-PWA/v3/

The open-source edition that anyone can set up for themselves lives at https://github.com/jseggs/game-vault.

## What is here

| Path | What it is |
|---|---|
| `v3/` | The app (static page, offline worker, icons, sprites) |
| `google-apps-script/` | `Code.gs`, the sheet's script that the app talks to; `ShareFeed.gs`, the read-only feed for the share page; `bgg_sync.gs`, BoardGameGeek enrichment for the sheet |
| `share/` | The read-only share page, hosted separately |
| `tools/` | `build_arcade_assets.py` rebuilds v3's icons and sprites from `tools/sprites/`; `build_share.py` copies v3's styles into `share/` |
| `index.html`, `service-worker.js` | Redirect the old address to `v3/` and retire the original app's offline worker |

## Data and access

Nothing private is stored in this repository. The sheet is not published to the web. Each device connects with the script's web app address and an access key from an invite link, and the keys live only in the script's properties.
