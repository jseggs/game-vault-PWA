# Hosted BGG Enrichment Service

This is a narrow server-side service for Game Vault's Google Sheets integration.

It is intentionally not a generic public BGG proxy. The service accepts a title or BGG ID, performs a server-side lookup using your BGG token, normalizes the result, and returns only the fields the Game Vault sheet needs.

## Endpoints

- `POST /api/enrich`

Request body:

```json
{ "title": "Radlands" }
```

or

```json
{ "bggId": "329082" }
```

## Environment

See [.env.example](/Users/johnseggman/Codex/services/bgg-enrichment/.env.example).

## Notes

- Add the official "Powered by BGG" attribution anywhere your public app requires it.
- Review BGG XML API terms and registration requirements before deploying this publicly.
