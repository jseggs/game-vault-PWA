# J & E Game Vault

A retro-arcade-themed static web app / PWA for managing a board game collection, picking what to play, logging sessions, and syncing data with Google Sheets.

## What It Does

- Browses a curated game collection with search, shelf filters, and play-status filters
- Shows collection stats such as total games, expansions, played vs. unplayed, and effective dollars spent
- Includes a random game picker with filters for shelf, history, expansions, co-op, and player count
- Logs plays with winner, notes, and separate John/Elizabeth ratings
- Tracks head-to-head stats, per-game records, and a dedicated 2-player shortlist
- Supports Google Sheets sync for games, plays, exclusions, and summary stats

## Project Structure

There is one live app file:

- `index.html`: the canonical app entrypoint for local use, hosting, and GitHub Pages

Supporting PWA files:

- `manifest.webmanifest`: install metadata for the app
- `service-worker.js`: offline app-shell caching
- `app-icon-192.png`, `app-icon-512.png`, `app-icon-maskable-512.png`: installable app icons

Archived historical files live in `archive/` and should not be edited for normal app changes.

The live app is still mostly self-contained:

- HTML defines the navigation and all app sections
- CSS provides the visual design and responsive behavior
- JavaScript handles state, filtering, logging, stats, and sync
- A built-in `DEFAULT_GAMES` dataset serves as the local fallback collection

## Main Features

### Collection

- Search by game name or category
- Filter by shelf: `2-Player`, `Adult`, `Family`, `Party`, `Kids`, `Solo`
- Filter by status: all, played, unplayed, base-only
- Open a modal for game details, ratings, notes, win/loss history, and quick play logging

### Pick a Game

- Randomizer for choosing a game to play
- Filters for shelf, already played vs. never played, base-only vs. expansions, co-op only, and exact player count

### Play Log

- Add plays with date, winner, notes, and individual ratings
- Delete previously logged plays
- Automatically marks a game as played after the first logged session

### Stats

- Head-to-head win totals for John and Elizabeth
- Per-game play counts and leader tracking
- Separate 2-player recommendations view
- Ability to exclude specific games from the 2-player shortlist

### Google Sheets Sync

- Loads games from a published CSV sheet
- Optionally loads plays from a second published CSV sheet
- Optionally writes play adds/deletes and exclusion changes back through a Google Apps Script endpoint
- Optionally loads summary stats such as effective dollars spent from a stats sheet

## Data Model

Each game record includes fields such as:

- name
- shelf
- player counts
- best player count
- solo support
- BGG score
- category
- played status
- John / Elizabeth ratings
- expansion flag
- "E knows?" readiness flag
- year bought
- notes
- excluded flag for 2-player recommendations

Play records are stored separately with:

- date
- game
- winner
- notes
- John rating
- Elizabeth rating

## Storage

The app uses browser `localStorage` for:

- `bgv-plays`: logged plays
- `bgv-cfg`: sync configuration and cached stats values
- `bgv-2p-excl`: excluded games from the 2-player list

If Google Sheets sync is configured, sheet data can override the local default collection on load.

## How To Use

Open the app directly in a browser:

```bash
open index.html
```

Or serve it locally:

```bash
python3 -m http.server
```

## Local Testing Tips

For a beginner-friendly step-by-step checklist, see [TESTING.md](/Users/johnseggman/Codex/TESTING.md).

For normal development, prefer a local web server over opening the file directly:

```bash
./dev-preview.sh
```

Then open [http://localhost:4173](http://localhost:4173) on your Mac.

For iPhone PWA / service worker testing over HTTPS, use:

```bash
./dev-preview.sh --tunnel
```

That starts the local server and, if `cloudflared` is installed, prints a public `https://...trycloudflare.com` URL you can open in Safari on your iPhone.

Useful habits while iterating:

- Hard refresh after changes so the browser does not reuse a stale HTML document
- Keep DevTools open and inspect the Application tab when checking service worker or cache behavior
- Test the installed PWA separately from the regular browser tab, because they can hold different cached state
- If Safari and Chrome on iPhone both look stale, remember they share the same WebKit engine and often the same underlying cache behavior

For iPhone testing on the same Wi-Fi, you can also open your Mac's local server from the phone with:

```text
http://YOUR-MAC-LAN-IP:4173
```

Note: that is helpful for regular browser testing, but full PWA and service worker behavior on iPhone is most reliable on a real HTTPS host such as GitHub Pages or a secure tunnel.

If `./dev-preview.sh --tunnel` says `cloudflared` is missing, install it first and rerun. Current install docs:

- [Cloudflare Tunnel downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

Then open `index.html` in your browser.

## Google Sheets Setup

The app expects:

- a `Games` sheet published as CSV
- an optional `Plays` sheet published as CSV
- an optional Apps Script web app for write-back operations
- an optional stats sheet published as CSV

Important sheet columns used by the code include:

- `Game`
- `Shelf`
- `Players (Manufacturer)`
- `Players (BGG Comm)`
- `Best At`
- `Good solo option`
- `BGG Score`
- `BGG Category`
- `Played`
- `J Rating`
- `E Rating`
- `Expansion`
- `E knows?`
- `Potentially sell?`
- `Year bought`
- `Notes`
- `Excluded`

## Notes

- `index.html` is the one file to edit for small text/UI/content updates
- The app is currently framework-free and runs entirely in the browser
- It depends on external Google Fonts and optional external CSV / Apps Script endpoints
- CSV parsing and sync are implemented directly in the page script
- Archived HTML snapshots are kept only for rollback/reference
