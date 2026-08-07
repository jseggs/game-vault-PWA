# Maintainer Release Guide

This is the one-time checklist for turning the repository package into a polished Reddit/BGG release.

## Recommended architecture

Keep the system split in two:

1. **Per-user Sheet connector:** copied with each person's Sheet. It can edit only that tracker and requires that user's write key.
2. **Maintainer BGG lookup service:** deployed once from the maintainer's account. It stores the approved BGG bearer token and returns only public metadata.

Do not create one maintainer-owned script that writes to everyone's Sheets. That would require people to share Drive data with the maintainer and would create an unnecessary privacy and support risk.

## Deploy the BGG lookup service once

1. At `script.google.com`, create a new standalone Apps Script project named `Game Vault BGG Lookup`.
2. Copy `maintainer-bgg-service/Code.gs` into `Code.gs`.
3. Enable the manifest file and copy `maintainer-bgg-service/appsscript.json` into it.
4. In **Project Settings → Script Properties**, add `BGG_API_TOKEN` and paste the approved BGG bearer token.
5. Deploy as a web app that executes as the deploying user and is available to anyone.
6. Open the `/exec` URL. It should return a small JSON health response and no Google or personal data.
7. Test a POST request with `{"title":"Azul"}` and confirm public metadata is returned.
8. Paste that `/exec` URL into `DEFAULT_BGG_SERVICE_URL` in `google-apps-script/BGG.gs` before sharing the package. End users can then use BGG lookup without configuring a token or service URL.

The service caches results and spaces requests, but a public Apps Script endpoint can still be abused or hit Google quotas. Monitor executions. At larger scale, move the same small JSON contract to a rate-limited host such as Cloud Run; the Sheet connector does not need to change.

The BGG approval and token belong to the maintainer, not automatically to every fork. Confirm with BoardGameGeek that community traffic routed through this service fits the granted permission and attribution terms.

## Make a true one-click Google Sheet template

The repository includes an import-ready `.xlsx`, because a Git repository cannot itself mint a Google Sheet. To make the friendliest public link:

1. Use a dedicated project Google account, not a personal everyday account.
2. Upload `template/Game-Vault-Community-Template.xlsx` and convert it to Google Sheets.
3. Add `Code.gs`, `BGG.gs`, and `appsscript.json` to the bound Apps Script project.
4. Test reads, writes, BGG lookup, and formulas.
5. Share the Sheet as **Anyone with the link → Viewer**.
6. Change the end of the Sheet URL from `/edit...` to `/copy`.
7. Put that `/copy` link at the top of `README.md`, `GETTING-STARTED.md`, and `setup.html`.

Use sample data only. Before sharing, inspect the file owner name, revision history, comments, named ranges, hidden sheets, formulas, links, and Apps Script properties for personal information.

## Reduce permission anxiety

- Keep `@OnlyCurrentDoc` in both Sheet-bound script files.
- Keep the explicit manifest scopes limited to `spreadsheets.currentonly` and `script.external_request`.
- Do not add installable or timed triggers; the included BGG sync is manual.
- Publish the script source and explain each permission before users run it.
- Keep the BGG token in the maintainer service's Script Properties, never in source, a Sheet cell, or client JavaScript.

For a small DIY audience, users will own their copied script and may still see an unverified-app warning. For a polished product with no warning and wider distribution, use a standard Google Cloud project, host a public homepage and privacy policy on a verified domain, configure the OAuth consent screen, and submit the OAuth client for verification.

Official Google references:

- <https://developers.google.com/apps-script/guides/services/authorization>
- <https://developers.google.com/apps-script/guides/web>
- <https://developers.google.com/apps-script/guides/client-verification>
- <https://developers.google.com/apps-script/guides/properties>

## Privacy-safe live demo checklist

- No default Google or Apps Script URLs in source
- No personal names, notes, play history, collection data, or Drive IDs
- Community-specific local-storage keys
- Bundled sample data only
- No analytics
- No write endpoint contacted until a visitor configures one
- `Ready to Play` absent from UI, data model, and template

## What to share

- Live demo: `https://jseggs.github.io/game-vault-PWA/community/`
- One-click Google Sheet `/copy` link after creating it
- GitHub repository or release ZIP
- `GETTING-STARTED.md`
- A short note that published CSV tabs are public and the script has only current-Sheet plus external-request access
