# BGG Google Apps Script

This Apps Script enriches your `Games` sheet from BoardGameGeek using the XML API.

## What it does

- Watches for new game titles in the `Game` column
- Queues those rows for lookup
- Searches BGG by title using `/xmlapi2/search`
- Fetches the matched item using `/xmlapi2/thing?stats=1`
- Populates the columns your app already reads

Filled columns:

- `Players (Manufacturer)`
- `Players (BGG Comm)`
- `Best At`
- `Good solo option`
- `BGG Score`
- `BGG Category`
- `Expansion`
- `Age`

Extra helper columns created if missing:

- `BGG ID`
- `BGG Match Name`
- `BGG Match Score`
- `BGG Match Status`
- `BGG URL`
- `BGG Thumbnail`
- `BGG Updated At`

## Setup

1. Open your Google Sheet.
2. Go to `Extensions -> Apps Script`.
3. Paste in `bgg_sync.gs`.
4. In Apps Script, go to `Project Settings -> Script Properties`.
5. Add `BGG_API_TOKEN` with your BoardGameGeek bearer token.
6. Run `createBggTriggers()` once.
7. Approve the script permissions.

After that:

- typing a title into the `Game` column queues it
- the time-driven trigger processes queued rows every 5 minutes
- you can also use the `BGG Sync` spreadsheet menu to run it immediately

## Notes

- Requests are made server-side in Apps Script, which aligns with BGG's current guidance.
- The script caches responses and spaces requests out to reduce throttling risk.
- Match confidence is fuzzy, not exact; lower-confidence rows are marked `Needs review`.
- Public-facing apps using BGG data should include the linked official `Powered by BGG` logo.
