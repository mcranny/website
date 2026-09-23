# Matthew Cranny | Engineering Portfolio

[![Matthew Cranny's engineering portfolio](assets/site-preview.png)](https://mcranny.net)

Personal portfolio covering automated test systems, custom hardware, instrumentation, and firmware validation for semiconductor manufacturing equipment.

**Live site:** [mcranny.net](https://mcranny.net)

## Projects

- [Programmable Protocol Emulator ASIC](https://mcranny.net/protocol-emulator): a Verilog timing engine with Python tooling, functional verification, and physical design in progress.
- [TestOS](https://mcranny.net/testos): UEFI x86-64 systems work with storage, HTTP, and network interoperability checks in QEMU.
- [Hardware Verification Framework](https://mcranny.net/hardware): Python and cocotb tooling for deterministic RTL stimulus, waveform comparison, and diagnostics.
- [Virtual Oscilloscope Simulator](https://mcranny.net/scope): waveform generation, analog response, acquisition, triggering, and measurement in a browser viewer.
- [Asteroid Intercept Planner](https://mcranny.net/neo): JPL data ingestion, orbital-transfer search, endpoint validation, and interactive mission plots.
- [B-Tree Storage Engine](https://mcranny.net/btree): a disk-backed Rust key-value engine with redo logging, deletion rebalancing, and differential tests against SQLite.

These are independent projects. Each project page links its source repository and supporting results. Professional experience, contact details, and the current résumé are available on the site.

## Local development

The site uses plain HTML, CSS, and JavaScript. Python's standard library builds `dist/` from the public file list in `scripts/public-files.json`.

```sh
python3 scripts/build_site.py
python3 scripts/preview_site.py --port 5001
```

Open [localhost:5001](http://127.0.0.1:5001). Rebuild after editing source files. Add new public assets to `scripts/public-files.json` so they are included in the build.

The site supports responsive navigation, light and dark themes, keyboard controls, and reduced motion. The mission viewer loads its data on demand. The layout viewer uses local image tiles and provides a static fallback.

## Validation

With the local preview running, install the development dependencies and run the checks in a separate terminal:

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-dev.txt
npm ci
npx playwright install chromium
python3 scripts/check_site.py
npm run check:browser
npm run check:media
```

Static checks validate page links, the sitemap, public assets, layout tiles, artifact checksums, the custom 404 page, and résumé HTML/PDF consistency. Browser checks cover the nine site routes at four viewport sizes in both themes, including navigation, contrast, keyboard focus, unavailable storage, mission viewer recovery, and Content Security Policy violations. Media checks cover layout zoom, panning, fullscreen, fallback behavior, and MP4/WebM playback.

GitHub Actions runs these checks on pull requests and pushes to `main`. The workflow does not deploy the site. Set `CHROME_PATH` to use an installed Chrome executable instead of Playwright's Chromium.

## Content and assets

### Résumé and social preview

Edit `scripts/resume-content.json`, then run `python3 scripts/render_resume.py` to update the résumé HTML and PDF. The exporter preserves the application résumé layout and updates `scripts/resume-fingerprint.json`. Role-specific application copies are maintained separately. Inspect the rendered PDF after edits to check spacing and clipping.

Edit `scripts/social-preview.html` and run `npm run render:social` to update `assets/site-preview.png`.

### ASIC layout

The project page references functional run `35488919040` (`88f5210`) and physical run `35460188674` (`c22a3d4`). The physical run has unresolved slew and fanout violations. Source details and hashes are recorded in `assets/protocol-emulator/checksums.json`.

`scripts/render_layout.py` renders the GDS with KLayout 0.30.12 and the libvips CLI. It uses the exact 1289.28 × 710.64 µm die bounds, solid fills, a white background, and oversampling 1. Filler and decap cells are hidden for display only. Red Metal3 is drawn beneath cyan Metal1 and green Metal4.

Four strips are joined with `vips arrayjoin`. `vips dzsave` produces 1,931 PNG tiles from the 25,784 × 14,212 image, using 512-pixel tiles and one-pixel overlap. OpenSeadragon 6.1.1 displays the tiles. The renderer records its settings in `assets/protocol-emulator/layout/render.json` and saves the layer configuration in `solid-fills.lyp`. The full image is excluded from deployment.

### Recordings and mission data

The TestOS screenshots and 12.5-second recording were captured in QEMU 11.1.1 from the `ef72e55` CI boot image. The page includes ATA, AHCI, and NVMe data-disk checks, DHCP, an HTTP download, and TCP packet checks. Capture details, serial logs, packet data, and checksums are in `assets/testos/`.

The 12-second scope recording shows timebase, trigger, and filter adjustments in the browser viewer at `073ed63`. Capture details and checksums are in `assets/scope/`. Both recordings have MP4 and WebM versions and are under 5 MB per file. Comparison plots include WebP variants with PNG fallbacks.

The bundled NEO samples use the July 29, 2026 archive date from repository history. Their original export timestamp is unavailable. New exports record `exported_at` in UTC.

Third-party viewer libraries and their licenses are included with the corresponding assets.

## Deployment

Cloudflare serves [mcranny.net](https://mcranny.net). `wrangler.jsonc` runs the build and publishes only `dist/`. Development scripts, dependencies, and local output are excluded. `404.html` serves unknown paths. Redirects, cache rules, and security headers are defined in `_redirects` and `_headers`.

The Content Security Policy remains report-only. The browser suite checks for violations in local builds. Cloudflare currently injects a per-request inline challenge script on the live site, which violates the policy; resolve that integration before enabling enforcement. No reporting collector is configured. Update the structured-data hash in `_headers` when the inline JSON-LD changes.
