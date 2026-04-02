# Game Vault Google Sheets Script

This script is intended to be a **bound script** copied with the public Google Sheets template.

It does not call BGG directly. Instead, it calls your hosted Game Vault BGG enrichment service and writes normalized results into the user's `Games` tab.

## Expected Script Properties

- `GAME_VAULT_BGG_SERVICE_URL`
- optional `GAME_VAULT_BGG_SERVICE_TOKEN`

## Sheet Requirements

- `Games` tab
- `Game` column

The script can create the rest of the BGG helper columns if they are missing.

## Menu

After opening the sheet, the script adds:

- `Game Vault -> BGG Sync -> Refresh selected row`
- `Game Vault -> BGG Sync -> Refresh missing games`
- `Game Vault -> BGG Sync -> Refresh all games`
