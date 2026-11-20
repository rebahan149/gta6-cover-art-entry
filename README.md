[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/rebahan149/gta6-cover-art-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/gta6-cover-art-01/rebahan149/gta6-cover-art-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Golden Hour Cover Studio

Turn your own photos into multi-panel, GTA-style cover art — graded, lettered and exported as a PNG, entirely in your browser. Photos are read on your own machine and never uploaded; the app is plain static files and works fully offline.

## What it does

- **Your photos, your cast.** Add photos from your device (or start with the two bundled samples) and place them into the cover's panels — a different photo per panel, or one photo spanned continuously across every panel for the classic one-scene collage.
- **Four panel layouts.** Hero Strip, Comic Grid, Slanted and Mosaic, each drawn full-bleed with white poster separators.
- **Per-panel crops.** Click a panel to select it, drag on the cover to move its photo, scroll or use the slider to zoom. Crops are clamped so a photo always covers its panel.
- **Vice City colour grades.** Vice Sunset, Neon Nights, Golden Hour, Midnight Teal and Poster Ink, each a photo filter plus a matching wash and vignette.
- **Poster lettering.** Your caption in Anton display capitals (SIL Open Font License, bundled under `app/fonts/`) with sunset, chrome or neon gradient fills, an optional hand-drawn studio seal, and a movie-style billing line that shrinks to fit.
- **Post-size export.** One click exports a clean PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080.

## Run it

Serve the `app/` folder with any static file server — the kit's helper works out of the box:

```
node serve.ts
```

then open http://localhost:8080 in desktop Chrome. No build step, no network needed.

## Layout of this repository

- `app/` — the web app: `index.html`, `style.css`, and ES modules under `src/` (`cover.js` renders the cover, `main.js` wires the editor, `shots.js` sets up screenshot scenes). The display font and its license live in `app/fonts/`; sample photos in `app/samples/`.
- `screenshots/` — the covers and editor views shown on the bounty page, named by `shots.json`.
- `main.ts` — the hand-in program: copies `app/` and `screenshots/` to the output directory and writes the dossier with `vendor/makefun-app.ts`.
