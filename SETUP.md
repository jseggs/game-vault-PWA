# Setup Guide

## 1. Copy the template sheet

Use the starter files in [templates/google-sheets](/Users/johnseggman/Codex/templates/google-sheets) to build a Google Sheet with three tabs:

- `Games`
- `Plays`
- `Players`

## 2. Fill in Players

In `Players`, add:

- `Player #`
- `Name`

Example:

```text
1,Alex
2,Sam
3,Jordan
```

## 3. Add games

Fill in `Games` manually or import your collection. Use `Include = 0` to hide a game from the app and `Exclude from 2P = 1` to keep it out of the 2-player shortlist.

## 4. Use BGG Sync

Open Google Sheets, go to `Extensions -> Apps Script`, paste in the script from [google-apps-script/bgg_sync.gs](/Users/johnseggman/Codex/google-apps-script/bgg_sync.gs), save it, and reload the sheet. You do not need to deploy a web app. After reload, use the `Game Vault -> BGG Sync` menu to enrich rows from your hosted BGG service.

## 5. Publish CSVs

For each tab:

1. Google Sheets -> `File -> Share -> Publish to web`
2. Choose the tab
3. Choose `Comma-separated values (.csv)`
4. Copy the published URL

You need CSV URLs for:

- `Games`
- `Plays`
- `Players`

## 6. Paste URLs into Game Vault

Open the app, go to `Settings`, paste the three CSV URLs, and click `Save & Sync`.

If you want to explore the app first, skip this step initially. Game Vault opens with built-in sample players, games, and plays until you connect your own sheets.

## 7. Optional: install the PWA

Open the app in Safari or Chrome and install it to your home screen or desktop.
