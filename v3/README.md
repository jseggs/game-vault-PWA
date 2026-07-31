# Game Vault V3

V3 is a focused collection console for Game Vault. It retains the current app's collection, picker, play log, ratings, stats, filters, Google Sheets integration, and PWA update behavior while using a dark structural shell, large readable controls, game-cover-led browsing, adaptive cover art, and a restrained set of pixel dinosaur moments.

- V1 remains at `/index.html`.
- V3 runs at `/v3/`.
- V3 has its own stylesheet, manifest, service worker, cache, and install scope.
- Browser storage remains shared with V1 so existing local settings and play data carry across on the same origin.
- The active UI is defined only by `cabinet.css`; the earlier cabinet and field-guide themes have been removed.

## Dino Duel Roster

The optional Stats CSV can configure the Scoreboard fighters with these `Key,Value` rows:

```csv
John Dino,Velociraptor
John Color,#36b8c4
Elizabeth Dino,Triceratops
Elizabeth Color,#e9513d
```

Supported dinosaurs are T-Rex, Velociraptor, Triceratops, Ankylosaurus, Brachiosaurus, Pterodactyl, Spinosaurus, and Stegosaurus. Colors must be six-digit hex values.
