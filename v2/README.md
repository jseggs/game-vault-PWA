# Game Vault Cabinet V2

Cabinet is an isolated visual redesign of Game Vault. It retains the current app's collection, picker, play log, ratings, stats, filters, Google Sheets integration, and PWA update behavior.

- V1 remains at `/index.html`.
- V2 runs at `/v2/`.
- V2 has its own stylesheet, manifest, service worker, cache, and install scope.
- Browser storage remains shared with V1 so existing local settings and play data carry across on the same origin.
- The active UI is defined only by `cabinet.css`; the earlier layered theme has been removed.

## Dino Duel Roster

The optional Stats CSV can configure the Scoreboard fighters with these `Key,Value` rows:

```csv
John Dino,Velociraptor
John Color,#36b8c4
Elizabeth Dino,Triceratops
Elizabeth Color,#e9513d
```

Supported dinosaurs are T-Rex, Velociraptor, Triceratops, Ankylosaurus, Brachiosaurus, Pterodactyl, Spinosaurus, and Stegosaurus. Colors must be six-digit hex values.
