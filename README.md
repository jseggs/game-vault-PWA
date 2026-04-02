# Game Vault

An open-source retro-arcade board game collection tracker and installable PWA. It helps households and game groups browse their collection, pick what to play, log sessions, and see lightweight stats while keeping their data in Google Sheets.

[Setup Guide](/Users/johnseggman/Codex/SETUP.md) | [Customization Guide](/Users/johnseggman/Codex/CUSTOMIZE.md) | [Testing Guide](/Users/johnseggman/Codex/TESTING.md)

Support the project:
- Ko-fi: `https://ko-fi.com/YOUR_NAME`
- Buy Me a Coffee: `https://buymeacoffee.com/YOUR_NAME`
- GitHub Sponsors: `https://github.com/sponsors/YOUR_GITHUB`
- Venmo (optional extra): `https://venmo.com/u/YOUR_HANDLE`

## What It Does

- Browse a board game collection with search, shelf filters, and play status filters
- Pick a random game with filters for shelves, history, expansions, co-op, and player count
- Log plays with participants, winner, notes, and per-player ratings
- Render player names from a `Players` sheet instead of hardcoded household names
- Show per-game records, lightweight winner stats, and a dedicated 2-player shortlist
- Install on desktop or phone as a PWA

## How It Works

Game Vault is still a static app:

- `index.html` contains the app UI, styling, and logic
- `service-worker.js` handles offline caching and update behavior
- Google Sheets acts as the user-owned data source
- A narrow hosted BGG enrichment service can be used by the companion Google Sheets script

Users are expected to:

1. Copy the starter Google Sheet template
2. Fill in the `Players` tab with `Player #` and `Name`
3. Add/import games in the `Games` tab
4. Use the `Game Vault -> BGG Sync` menu in Google Sheets
5. Publish `Games`, `Plays`, and `Players` tabs as CSV
6. Paste those CSV URLs into the PWA settings

If you open the app before connecting your sheets, it starts in a built-in sample mode with starter players, games, and plays so you can explore the flow first.

## Public Data Model

### `Players`

- `Player #`
- `Name`

### `Games`

- `Game`
- `Shelf`
- `Players (Manufacturer)`
- `Players (BGG Comm)`
- `Best At`
- `Good solo option`
- `BGG Score`
- `BGG Category`
- `Played`
- `Expansion`
- `Include`
- `Exclude from 2P`
- `Notes`
- `BGG Thumbnail`
- `BGG URL`

### `Plays`

- `Date`
- `Game`
- `Participants`
- `Winner Player #`
- `Notes`
- `P1 Rating`
- `P2 Rating`
- `P3 Rating`
- `P4 Rating`
- `P5 Rating`
- `P6 Rating`

## Local Preview

Run a normal local preview:

```bash
cd /Users/johnseggman/Codex
./dev-preview.sh
```

For an HTTPS preview tunnel:

```bash
./dev-preview.sh --tunnel
```

See [TESTING.md](/Users/johnseggman/Codex/TESTING.md) for the full step-by-step workflow.

## Repo Structure

- [index.html](/Users/johnseggman/Codex/index.html): main app
- [service-worker.js](/Users/johnseggman/Codex/service-worker.js): PWA cache/update logic
- [templates/google-sheets](/Users/johnseggman/Codex/templates/google-sheets): starter sheet headers/templates
- [google-apps-script](/Users/johnseggman/Codex/google-apps-script): bound-script examples for Google Sheets
- [services/bgg-enrichment](/Users/johnseggman/Codex/services/bgg-enrichment): hosted BGG enrichment service scaffold

## BoardGameGeek

This project is designed around a server-side BGG enrichment path. If you make the hosted enrichment service public, add the official “Powered by BGG” attribution and review BGG’s current XML API terms and registration requirements before deploying.

## Contributing

Small bug fixes, docs improvements, template updates, and UX polish are welcome. See [CONTRIBUTING.md](/Users/johnseggman/Codex/CONTRIBUTING.md).
