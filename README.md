# mcranny.net static site

Static-first portfolio implementation for `mcranny.net`.

## Local preview

Because this is dependency-free HTML/CSS/JS, any static server works:

```sh
python3 -m http.server 5000
```

Then open `http://localhost:5000`.

## Structure

- `pages/index.html` - Home/status page
- `pages/neo.html` - interactive NEO viewer
- `pages/btree.html` - B-tree storage engine project page
- `pages/resume.html` - resume page using only verified prompt-provided facts
- `css/` - split design tokens, base styles, layout styles, and per-page stylesheets
- `js/site.js` - sitewide theme and mobile navigation behavior
- `js/neo.js` - cached NEO dataset and canvas orbital renderer
- `assets/neo-missions.json` - static export from `neo-updater/data/asteroids.db`

## NEO data mode

The viewer loads `assets/neo-missions.json`, a static export from the local `neo-updater` SQLite database. It includes stored asteroids, close approaches, orbital elements, interception plans, and sampled Lambert transfer polylines. A production live mode should run the same CAD/SBDB ingestion and SQLite schema behind a serverless/API boundary, then publish a versioned JSON viewer export.
