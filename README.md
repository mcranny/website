# mcranny.net static site

Static-first portfolio implementation for `mcranny.net`.

## Local preview

Because this is dependency-free HTML/CSS/JS, any static server works:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Structure

- `index.html` - Home/status page
- `neo.html` - interactive NEO viewer
- `btree.html` - B-tree storage engine project page
- `resume.html` - resume page using only verified prompt-provided facts
- `styles.css` - shared design tokens, grid, layout, responsive styles
- `neo.js` - cached NEO dataset and canvas orbital renderer
- `assets/neo-missions.json` - static export from `neo-updater/data/asteroids.db`

## NEO data mode

The viewer loads `assets/neo-missions.json`, a static export from the local `neo-updater` SQLite database. It includes stored asteroids, close approaches, orbital elements, interception plans, and sampled Lambert transfer polylines. A production live mode should run the same CAD/SBDB ingestion and SQLite schema behind a serverless/API boundary, then publish a versioned JSON viewer export.

## Resume source

No current resume file was provided with the prompt. The resume page uses only facts explicitly present in the prompt and marks detailed resume bullets/PDF as source-needed rather than fabricating content.
