# Build Your Own Game Vault

No coding experience is required. Expect about 25–40 minutes the first time. You will copy two small script files exactly as provided, but you do not need to understand or edit the code.

## What you will make

At the end you will have:

- your own Google Sheet containing games, plays, player names, and totals;
- an installable Game Vault app connected to that Sheet;
- a private write key that prevents strangers from changing your Sheet;
- optional BoardGameGeek enrichment without receiving the maintainer's BGG credential.

## Before you begin

You need a Google account and a desktop browser. Use a separate Google account for this hobby project if you do not want a public template or deployment associated with your everyday account.

The four Sheet tabs you publish later are public to anyone who has their long URL. Put only board-game information in those tabs. Do not add addresses, emails, passwords, private family notes, or the write key.

## Part 1 — Make your Sheet

1. Download `Game-Vault-Community-Template.xlsx` from the `community/template` folder.
2. Open Google Drive.
3. Select **New → File upload** and choose the downloaded workbook.
4. When the upload finishes, right-click it and select **Open with → Google Sheets**.
5. In Google Sheets, select **File → Save as Google Sheets** if Google still shows an `.xlsx` label.
6. Rename it. For example: `My Game Vault`.
7. Open the `Players` tab. Replace `Player 1` and `Player 2` with the names you want shown in the app. A nickname is fine.
8. Leave the sample rows in place until setup works. Replace them with your collection afterward.

Do not rename the `Games`, `Plays`, `Stats`, or `Players` tabs. The app and connector look for those exact names.

## Part 2 — Add the Sheet connector

1. In your new Google Sheet, select **Extensions → Apps Script**.
2. The editor opens in a new tab. Select the existing `Code.gs` file and delete its placeholder contents.
3. Open `community/google-apps-script/Code.gs` from the package, copy everything, and paste it into the Apps Script `Code.gs` editor.
4. In Apps Script, select **+ → Script** next to Files. Name the new file `BGG`.
5. Open `community/google-apps-script/BGG.gs`, copy everything, and paste it into `BGG.gs`.
6. Select **Project Settings** (the gear icon). Turn on **Show "appsscript.json" manifest file in editor**.
7. Return to **Editor**, open `appsscript.json`, and replace it with the packaged `community/google-apps-script/appsscript.json`.
8. Select **Save project**.
9. Return to your Google Sheet and reload the page. A new **Game Vault** menu should appear.

## Part 3 — Understand and approve the permissions

The first Game Vault menu action asks Google for two permissions:

- **Current spreadsheet only:** the script can edit this copied tracker. `@OnlyCurrentDoc` and the `spreadsheets.currentonly` scope prevent it from browsing every spreadsheet in your Drive.
- **Connect to an external service:** the optional BGG button sends a game title or BGG ID to the Game Vault BGG lookup service and receives public game metadata.

The package does not ask for Gmail, Contacts, Calendar, general Google Drive access, or permission to delete Drive files.

Copied Apps Script projects can show a **Google hasn't verified this app** warning. Only continue when all three are true:

1. you created the script from inside your copied Game Vault Sheet;
2. the code exactly matches this package;
3. the permission list is limited to the current spreadsheet and external requests.

If any additional permission appears, stop and compare your files with the package.

## Part 4 — Create your private write key

1. In the Sheet, select **Game Vault → Show connection key**.
2. Approve the two permissions described above if Google asks.
3. Select **Copy key** in the dialog.
4. Store the key temporarily in a password manager or another private place. Do not put it in any Sheet tab.

The key is generated randomly inside your script and stored in that script's private properties. It is not in the public app or repository.

## Part 5 — Deploy the Sheet connector

1. Return to the Apps Script editor.
2. Select **Deploy → New deployment**.
3. Next to **Select type**, choose **Web app**.
4. Description: `Game Vault connector`.
5. **Execute as:** `Me`.
6. **Who has access:** `Anyone`.
7. Select **Deploy**, approve if asked, then copy the URL ending in `/exec`.

“Anyone” means the static Game Vault page can reach the connector without asking visitors to sign in to Google. It does not make the Sheet editable by the public. The connector rejects every write that does not include your private write key.

## Part 6 — Publish four read-only CSV tabs

Google's CSV publishing is what lets the app read your collection without broad Drive access.

1. In the Sheet, select **File → Share → Publish to web**.
2. Under **Link**, choose `Games` instead of `Entire document`.
3. Choose **Comma-separated values (.csv)**.
4. Select **Publish** and copy the URL.
5. Repeat for `Plays`, `Stats`, and `Players`.

Never publish `START HERE` or `Lists`. Never choose `Entire document`.

## Part 7 — Connect the app

1. Open <https://jseggs.github.io/game-vault-PWA/community/>.
2. Select **Settings**.
3. Paste the `Games`, `Plays`, `Stats`, and `Players` CSV URLs into their matching fields.
4. Paste the Apps Script `/exec` URL.
5. Paste the private write key.
6. Select **Save & Sync**.
7. The status should report Google Sheets and a ready write connection.

Those values stay only in that browser. Repeat this step on each phone or computer where you install the app.

## Part 8 — Replace the sample collection

1. In `Games`, replace the sample rows with your games. Keep row 1 and its column names unchanged.
2. The minimum fields are `Game` and `Shelf`.
3. For optional BGG details, enter a title, select the row, then use **Game Vault → Enrich selected game from BGG**.
4. If the lookup picks the wrong edition, paste the numeric ID from the BoardGameGeek game URL into `BGG ID`, then run the command again.
5. In `Plays`, delete the sample rows when you are ready. New plays logged in the app will be added here.

## Part 9 — Install it like an app

- iPhone/iPad: open the site in Safari, select **Share → Add to Home Screen**.
- Android: open it in Chrome, use the browser menu, then select **Install app** or **Add to Home screen**.
- Desktop Chrome or Edge: use the install icon in the address bar.

## Troubleshooting

### “No Games URL set”

The `Games` CSV URL is blank. Return to Settings and paste the published `Games` URL, not the normal Google Sheets editing URL.

### “Private write key is missing or incorrect”

In the Sheet choose **Game Vault → Show connection key**, copy it again, and replace the key in app Settings.

### Reads work but logging does not

Confirm the Apps Script URL ends in `/exec`, the deployment is the current version, and access is set to `Anyone`. If you edited the script after deploying, select **Deploy → Manage deployments → Edit → New version**.

### BGG lookup asks for a service URL

Paste the public BGG service URL supplied with the release. If the maintainer has not published one yet, skip enrichment and fill the BGG fields manually; collection, picker, logging, and stats still work.

### I want my Sheet to stay completely private

A public static page cannot read a private Sheet securely without a larger OAuth/backend system. Do not publish the CSV tabs. You can still explore the sample/local app, or self-host a version with authenticated data access.

## Removing access later

Delete the Apps Script web-app deployment, unpublish the four CSV tabs, and remove the script from your Google Account's third-party connections. The browser copy can be cleared by deleting site data for the Game Vault URL.
