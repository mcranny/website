# Matthew Cranny | Engineering Portfolio

Personal site for professional semiconductor test work and three independent projects:
Protocol Emulator ASIC, TestOS, and B-Tree Storage Engine.

Live site: [mcranny.net](https://mcranny.net).

## Structure and development

The site uses static HTML, CSS, and JavaScript. Experience and Projects are separate
pages. Shared typography, layout, and buttons live in `css/base.css`; article
figures, ASIC version tabs, and the native layout viewer use `css/project.css`.
The site is light-only and navigation works without JavaScript.

```sh
python3 scripts/build_site.py
python3 scripts/preview_site.py --port 5001
```

Open http://127.0.0.1:5001. Rebuild after edits. The build publishes only the
explicit `scripts/public-files.json` allowlist. The preview implements the
extensionless routes, retired-page redirects, response headers, and custom 404.
Scope, NEO, and Hardware Verification redirect to `/projects`; Contact redirects
to `/`. Their independent source repositories and Git history are retained.

The final design uses separate-page navigation, direct technical prose, and
16:10 article figures. The original three prototypes are retained in Git history
at `23e92fea`. See `DESIGN.md` for typography and component conventions.

## Validation

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-dev.txt
npm ci
npx playwright install chromium
python3 scripts/check_site.py
python3 scripts/build_site.py
python3 scripts/preview_site.py --port 5001
# In another terminal:
npm run check:browser
npm run check:media
npm run check:versions
npm run check:performance
```

Set `CHROME_PATH` to an installed Chrome executable if needed. Browser acceptance
covers eight pages at 390, 520, 860, and 1440 pixels, separate-page navigation,
keyboard access, contrast, enlarged text, light presentation under a dark OS
preference, and 16 direct legacy redirects. Static checks validate links,
sitemaps, public assets, layout hashes, and résumé HTML/PDF consistency.

Media and version checks retain the two viewers' lazy loading, layer isolation,
keyboard/touch navigation, fullscreen, checksum/source/network failure recovery,
version selection and history, legacy fragments, independent state, cancellation,
and no-JavaScript fallback. Performance checks retain the cold mobile image and
viewer startup budgets. CI checks the site. Automatic deployment remains deferred.

## Content and assets

### Résumé and social preview

Edit `scripts/resume-content.json`, then run `python3 scripts/render_resume.py` to update the résumé HTML and PDF. The exporter preserves the application résumé layout and updates `scripts/resume-fingerprint.json`. Role-specific application copies are maintained separately. Inspect the rendered PDF after edits to check spacing and clipping.

Edit `scripts/social-preview.html` and run `npm run render:social` to update `assets/site-preview.png`.

### ASIC versions, layouts, and evidence

The case study defaults to V3, with V2 retained in its own tab. `?version=v3` and `?version=v2` select a version; section fragments activate the containing panel. Without JavaScript both case studies are shown. The V2 panel presents the published milestone: software source `881495c` and selected physical source `447b3df`, with their documented elaboration/configuration correspondence. The physical result is a validated local TT checkpoint recovery. Exact metrics and evidence links are retained in `assets/protocol-emulator/v2/summary.json`.

The native canvas viewer adapts the project's Apache-2.0 static renderer at `856a1ea`. All runtime assets are served by this website; it uses no external iframe or viewer service. `js/layout-viewer.js` loads `js/gds-viewer.js` after activation. The renderer selects among six V2 raster resolutions (1,024–32,768 pixels across the die) or five V3 resolutions (1,024–16,384) at broad and intermediate scales, then loads original polygon coordinates for close views. It provides layer selection, keyboard/touch controls and fullscreen, with a 64 MiB decoded raster cache and a 12-tile geometry cache. Tile-boundary copies are clipped; polygons are not simplified. GDS text labels are retained in the original file but not drawn online.

`assets/protocol-emulator/v2/layout-447b3df/` contains the pinned manifest, 16 layer previews, 512 gzip geometry tiles (about 105 MB total), and the original selected-layout archive (about 6.5 MB). Geometry loads only for the visible region after zooming. The 40.3 MB uncompressed GDS exceeds the 25 MiB asset limit, so its checksum-verified original release archive provides the download. The published inventory is checked on every build. Large immutable files are served through the R2 binding.

To rebuild the V2 imported assets, run `python3 scripts/import_v2_layout.py`. This checks the pinned published manifest, all geometry tile checksums, release archive, and original GDS hash; it refuses a changed upstream manifest. The upstream export records independent KLayout/gdstk polygon inventory agreement.

To regenerate the multi-resolution tiles, install Pillow in the Python environment
and use Chromium through Playwright. The generator checks every original geometry
tile, rasterizes its polygons with 2× supersampling, and builds lossless per-layer
and combined WebP tiles with neighboring-pixel gutters. Four rendering pages write intermediate
PNGs to a fresh directory, then the builder publishes `raster-v1/` and
`overview.webp`. Set `GDS_RASTER_SCRATCH` to choose the parent directory for these
temporary renders; each run prints its unique scratch path. To resume an interrupted render, set `GDS_RASTER_RESUME` to that path. Recorded source and rendering settings must match.

```sh
CHROME_PATH=/path/to/chrome PYTHON=/path/to/python node scripts/render_gds_pyramid.cjs
```

`scripts/optimize_layout_delivery.py` derives `display-v1/` from the verified lossless pyramids. It creates responsive article images and quality-85 WebP composites, plus a compact startup manifest and checksummed indexes per resolution and layer. The viewer requests only the needed indexes; individual layer tiles and close-view polygon geometry retain their original files. Existing `raster-v1/` assets remain published unchanged. The generator requires Pillow and refuses to overwrite a published display directory. Run `python3 scripts/update_asic_manifest.py` after generating a new display revision.

Use a new revisioned raster directory when changing already-published raster
content, and update the page configuration and cache rule together.

To regenerate the other technical images and UART example, install Pillow in a separate development environment and run:

```sh
python scripts/render_v2_assets.py /path/to/protocol-emulator-2.0.0rc1-examples.zip
```

The script verifies the released example archive, retains the pyramid-generated overview, renders a close-up from the polygon data, and plots the released TX trace plus RX input stimulus reconstructed from the example. It preserves the checked RX results and raw samples. The waveform is a Python cycle-model demonstration, not a hardware capture. Render settings are saved in `assets/protocol-emulator/v2/render.json`.

After reviewing generated assets and provenance, run `python3 scripts/update_asic_manifest.py` to record both versions’ checksums and regenerate the public-file allowlist. Ordinary builds only verify these records. Old V1 assets remain in source history/checkout but are excluded from deployment. Revisioned geometry assets use immutable caching; `_headers` serves tile files as raw gzip payloads with `no-transform` so browser checksum verification precedes decompression.

### Rebuilding V3 assets

The selected V3 physical source is `8b95d90b2fbbe5d742700884a49f2b89f1150904`.
Qualification run [40803741147](https://github.com/mcranny/protocol-emulator-asic/actions/runs/40803741147)
ran at workflow source `61065cf`; these identities are recorded separately in
`assets/protocol-emulator/v3/summary.json`. The GDS hash is
`050b88ed2253acb761f4f6365681a78da5e97520a03d02ff53b5a13e25d2be9f`.
The website retains acceptance, metrics, gate-level results, and source provenance.
The Cmod A7-35T section records the board bring-up and Vivado ILA capture: V3 at
48 MHz, host program loading/readback and execution, and a 25 kHz output with
960 samples per half-cycle.

V3 contains 8,784,464 polygons across 23 layer/datatype pairs. The original GDS
is supplied as a 5.4 MB gzip download. Its 16 × 8 geometry grid and five raster
levels retain all polygons while fitting both versions within the current
20,000-file hosting limit. The image dimensions are derived from each layout’s
bounds, including V3’s wider 8 × 4 die.

Use a clean upstream checkout at `0ff3c61217fbe6909750814c19e7100b2ddf1038`
for the exporter and a Python environment with gdstk, KLayout, and Pillow.
The importer needs authenticated `gh` access to the pinned artifacts. It verifies
all three artifact archives and the selected GDS/metrics against acceptance.
Run against a fresh V3 output directory; published asset directories are immutable.

```sh
python scripts/import_v3_layout.py --exporter-root /path/to/protocol-emulator-asic --cache /tmp/website-v3-artifacts
CHROME_PATH=/path/to/chrome PYTHON=/path/to/python node scripts/render_gds_pyramid.cjs assets/protocol-emulator/v3/layout-8b95d90 assets/protocol-emulator/v3/raster-v1
python scripts/render_gds_detail.py assets/protocol-emulator/v3 --box 420 90 620 190
python scripts/update_asic_manifest.py
```

### TestOS recordings and article crops

The TestOS screenshots and 12.5-second recording were captured in QEMU 11.1.1
from the `ef72e55` boot image. Original screenshots, serial logs, packet data,
checksums, and both video formats remain in `assets/testos/`.

`python3 scripts/prepare_testos_images.py` uses Pillow to create lossless WebP
article crops of boot, download, and NVMe output. It selects the terminal commands described in each caption and leaves originals unchanged.
The crops use a 720 × 450 frame and focus on the operations described by their captions.
`python scripts/prepare_testos_video.py --ffmpeg /path/to/ffmpeg` produces 16:10
MP4/WebM derivatives. It checks every decoded frame before trimming only empty
bottom rows and extending the terminal background. Original captures remain unchanged.

## Deployment

Cloudflare serves [mcranny.net](https://mcranny.net) through the existing static
asset deployment. `wrangler.jsonc` runs the build and publishes only `dist/`.
Development scripts, local output, and the deferred R2 draft are excluded.
`404.html` serves unknown paths. Redirects and security headers remain in
`_redirects` and `_headers`.

Run `npx --yes wrangler@4.159.0 deploy` after validation, then run
`python scripts/verify_deployment.py`. This checks page content and headings,
redirects, cache headers, the résumé, recordings, and representative immutable
assets against the checkout. GitHub main and the deployed release must match.

HTML and mutable assets revalidate (`max-age=0, must-revalidate`). Revisioned
layout paths retain one-year immutable/no-transform caching. The four header
lines removed in the first redesign applied only to the retired NEO datasets.
Security headers and the report-only CSP remain. Cloudflare's injected challenge
script must be reconciled with the CSP before enforcement is enabled.

## Deferred infrastructure

R2 migration and automatic deployment are deferred at the user's request.
All layout files remain tracked and served by the existing static deployment.
A private `website-layout-assets` bucket was created during preparation and may
contain partial copies. It is not bound to the production website. The temporary
transfer Worker and route were removed. A local ignored `.r2-draft/` directory
preserves the incomplete implementation for later review.

The three design prototypes were removed from main after selection. Their
source and screenshots remain available in Git history at `23e92fea`.
