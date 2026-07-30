# mcranny.net static site

Static-first portfolio implementation for `mcranny.net`.

## Local preview

Because this is dependency-free HTML/CSS/JS, any static server works:

```sh
python3 -m http.server 5000
```

Then open `http://localhost:5000`.

## Structure

- `index.html` - professional-work-first home page served at the site root
- `neo.html` - interactive NEO viewer
- `scope.html` - virtual oscilloscope simulator project page
- `hardware.html` - hardware verification framework project page
- `btree.html` - B-tree storage engine project page
- `resume.html` - HTML résumé plus the downloadable PDF résumé
- `css/` - split design tokens, base styles, layout styles, project styles, and per-page stylesheets
- `js/site.js` - sitewide theme and mobile navigation behavior
- `js/neo.js` - lazy-loaded mission data and canvas orbital renderer
- `assets/neo-missions/` - lightweight mission index and per-mission viewer payloads
- `scripts/split_neo_missions.py` - repeatable splitter for a full viewer export

## NEO data mode

The viewer first loads a compact mission index, then fetches only the selected mission's orbital tracks and Lambert transfer samples. To refresh the viewer data, provide a full export from the source project and run:

```sh
python3 scripts/split_neo_missions.py path/to/full-export.json assets/neo-missions
```

The homepage does not load the viewer JavaScript or any mission data.
