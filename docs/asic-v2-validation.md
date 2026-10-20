# V2 website implementation and local validation

Implemented in the website working tree against the ASIC release reviewed at
`856a1ea25f6b0ff47a268d7c4719616e3f562f9e`. Published directly to Cloudflare
on 19 October 2026 after approval.

## Delivered

- V2 homepage feature and case study with capabilities, functional architecture,
  a reproducible UART duplex example, selected physical metrics and source links.
- Native same-origin canvas explorer in the case study, with original polygon
  geometry, all 16 layer/datatype pairs, layer isolation, keyboard/touch controls,
  fullscreen, bounded caching, delayed loading, retry and fallback states.
- Compact V1-to-V2 comparison based on the completed V1 release.
- Pinned original layout archive, 512 geometry tiles, 16 previews, license,
  source summary, raw example records, render settings and checksum inventory.
- Import/render scripts and updated static/browser/media checks.

## Evidence and tests

- Original layout archive SHA-256 and contained GDS SHA-256 verified on import.
  All 512 compressed geometry tile hashes matched the pinned published manifest.
- Independent polygon inventory agreement is recorded by the upstream export;
  the website import verifies that pinned record rather than rerunning KLayout.
- Released example ZIP hash verified. The reviewed `examples/v2/run.py` has the
  same Git blob identity at software revision `881495c` and reviewed main `856a1ea`.
- Full static checker passed, including 10 HTML pages, 622 public files, internal
  links, sitemap, shared navigation, asset sizes, V2 provenance and hashes, and
  one-page résumé HTML/PDF consistency.
- Site build passed. Output: 118,330,462 bytes; largest file: 6,473,050 bytes.
  Old V1 raster tiles and OpenSeadragon are excluded from the deployment allowlist.
- Responsive browser suite passed all 72 page/theme/viewport combinations, plus
  existing navigation, storage, viewer-recovery and rendering checks.
- Media suite passed native geometry, same-origin lazy loading, layer selection,
  keyboard pan/zoom, touch pinch/drag, fullscreen, manifest/preview HTTP failures,
  geometry HTTP failure, checksum corruption, wrong-source rejection, retries,
  missing decoder support, no-JavaScript fallback, CSP and existing video playback.
- Browser suites used the repository's Playwright 1.62.1 and installed Chrome.
- Desktop/mobile light and dark screenshots were inspected. The UART plot remains
  readable by scrolling horizontally on mobile; desktop layers start expanded.
- Documentation, release and physical evidence destinations were checked. The
  evidence landing page returns 200 for GET but rejects automated HEAD requests.
- `git diff --check`, JavaScript syntax checks and Python compilation passed.

One local media-suite measurement recorded 165 ms to activate the overview and
129 ms to reach the first detail view. Overview plus first detail loaded
1,564,676 bytes across 21 layout resources, including four geometry tiles.
These are local measurements, not deployed/mobile-network performance promises.

## Viewer styling follow-up

- Viewer panels, headings, controls, checkboxes, help text and links now use the
  existing paper/ink/graphite/rule/signal design tokens in both themes. The launch
  action uses the shared primary button class, and controls retain 44 px targets.
- The GDS canvas background, geometry palette, renderer and imported assets are
  unchanged by this styling pass.
- Rebuilt the site and reran the full static checker, 72 responsive browser
  combinations and native-viewer/media suite successfully.
- Inspected active-viewer screenshots at desktop and mobile widths in light and
  dark themes. Focused browser checks verified theme colors, no horizontal
  overflow, and identical canvas pixel data before and after changing theme.

## Production deployment

- Cloudflare Worker: `website`, serving https://mcranny.net.
- Version: `b2760caa-9185-47bc-8885-1c9a36f4ca4f`.
- Previous version: `73a3e31f-36d2-4f5c-8d1c-0d136810c9ca`.
- Command: `wrangler deploy --keep-vars` with Wrangler 4.151.2.
- Final predeployment build, static validation, 72 responsive browser checks,
  and native-viewer/media checks passed.
- Production CSS, viewer scripts, metrics JSON and UART SVG hashes matched the
  deployed build. A live gzip tile matched its manifest hash; its response used
  `application/octet-stream` and immutable/no-transform cache directives.
- Live homepage V2 content and revised case-study copy verified. Native geometry,
  layer isolation, fullscreen, both themes and mobile activation passed in Chrome.

 The original 40,274,264-byte GDS is distributed in its original
6.5 MB release archive to remain below the site's 25 MiB per-asset limit.

The review did not rerun ASIC physical tools or establish new silicon, FPGA,
competition, or common-source acceptance evidence. The page retains the selected
`447b3df` local recovery and the `881495c` software evidence as distinct sources.

## Multi-resolution viewer deployment

Published the six-level raster pyramid to Cloudflare on 19 October 2026.
Version: `b2d8f31b-5a53-4ad3-8ce9-9ad65892b40d`; previous version:
`b2760caa-9185-47bc-8885-1c9a36f4ca4f`.

The build contains 11,737 public files totaling 1,357,396,427 bytes. Raster tiles
load on demand and use a 64 MiB decoded cache. The original geometry remains
checksum-pinned to physical source 447b3df.

The full static checker, 72 responsive browser checks, raster-level progression,
layer changes, cancellation, raster HTTP/checksum/source recovery and the existing
geometry/media checks passed. Production raster manifest and sampled low/mid/high
resolution tile hashes matched the build, with immutable/no-transform headers.
Live geometry, layer isolation, fullscreen, both themes and mobile activation passed.
See [zoom investigation and implementation](gds-zoom-investigation.md).

Production DPR 2 checks also passed at 1440 px and 390 px widths, exercising
progressive raster selection, the transition to polygons and the cache budget.
