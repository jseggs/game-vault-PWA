# Customization Guide

## Common tweaks

- Change the project name and copy in [index.html](/Users/johnseggman/Codex/index.html)
- Replace icons in the repo root:
  - `app-icon-192.png`
  - `app-icon-512.png`
  - `app-icon-maskable-512.png`
- Edit the starter sheet columns in [templates/google-sheets](/Users/johnseggman/Codex/templates/google-sheets)
- Replace donation placeholders in [README.md](/Users/johnseggman/Codex/README.md) and the Settings support panel in [index.html](/Users/johnseggman/Codex/index.html)

## Public product defaults

The public version assumes:

- player names come from the `Players` sheet
- games can be hidden with `Include`
- 2-player shortlist exclusions come from `Exclude from 2P`
- per-play ratings use `P1 Rating` through `P6 Rating`

## BGG service

The hosted BGG service scaffold lives in [services/bgg-enrichment](/Users/johnseggman/Codex/services/bgg-enrichment). Update its environment variables and deployment docs to match your own hosting setup.
