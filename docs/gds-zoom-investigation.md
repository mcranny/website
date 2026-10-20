# GDS zoom clarity investigation

Investigated 19 October 2026 against the deployed renderer and pinned 447b3df
geometry. The investigation used temporary browser overrides. The selected multi-resolution implementation is deployed as Cloudflare version `b2d8f31b-5a53-4ad3-8ce9-9ad65892b40d`; see the implementation notes below.

## Findings

- Each of the 16 layer previews is 1024 × 564 pixels for the entire
  1289.28 × 710.64 µm die. A preview pixel covers about 1.26 µm.
- The renderer uses those same images until the viewport width is at most
  80.58 µm and at most 12 geometry tiles are visible. Thus a 241.74 µm viewport
  expands roughly 192 source pixels across the canvas; a 120.87 µm viewport
  expands roughly 96 pixels.
- On the tested 884 CSS-pixel canvas at DPR 2, the 241.74 µm preview is enlarged
  about 9.2 times in backing-store pixels. Default image smoothing softens it.
- The preview also uses screen blending with different opacity rules from the
  polygon renderer. Several dense preview layers are nearly solid at this scale:
  30/0 has about 88% colored pixels, 8/0 about 96%, and 6/0 about 94%.
  Combining them produces a pale image. Close views use source-over polygon fills.
- The canvas already accounts for DPR, capped at 2 and 2048 backing pixels per
  dimension. Increasing that cap alone cannot recover missing preview detail.

## Browser experiments

Chrome, local server, 1440 × 1000 viewport, DPR 2, central die region, all layers.
Each experiment starts at Fit, enters Inspect geometry, then zooms out twice.
Times are single local observations including click, loading and rendering.

| Variant | 120.87 µm view | 241.74 µm view |
| --- | --- | --- |
| Current preview | Blurred, pale | Blurred, pale |
| Image smoothing disabled | Large visible pixels | Large visible pixels |
| Earlier geometry threshold | Clear routing; 8 tiles, 102,262 records, 136 ms | Clear routing; 28 tiles, 368,328 records, 696 ms |

The geometry experiment transferred 7,830,580 compressed geometry bytes across
36 requests over the complete zoom sequence. The current 12-tile cache is too
small for the wider 28-tile view and would need redesign for this approach.

## Options

1. **Recommended: multi-resolution raster tiles plus close-range geometry.**
   Generate fresh preview levels from original polygons, using the detailed
   view's palette, compositing and antialiasing. Choose tiles by viewport scale
   and device pixel ratio, loading only the visible area. Use per-layer images
   or coverage masks to retain layer isolation. Keep the existing native viewer,
   controls and original-coordinate geometry path. Use explicit preview/detail
   labels. A 512 px tile size is a reasonable starting point; measure export size
   and asset count before fixing the highest resolution. This addresses both
   the initial overview and intermediate zoom without downloading all polygons.
2. **Earlier polygon rendering.** A useful near-term improvement around
   120–240 µm, supported by the experiment. Replace the fixed width cutoff with
   a visible-data budget, keep decoded data within a byte budget, cancel stale
   requests, and move decoding/rendering off the main thread where appropriate.
   The full-die view still needs better previews.
3. **One larger preview per layer.** Simpler, but still has a resolution cutoff.
   A 4096 × approximately 2258 RGBA image occupies about 35 MiB decoded; all 16
   layers occupy about 565 MiB before canvas and other browser allocations.
   Tiling avoids retaining every full-die image at maximum resolution.
4. **GPU vector renderer.** Potential longer-term option for smooth interaction
   across more scales. Requires binary geometry, triangulation, spatial culling,
   GPU buffers and careful memory handling. More engineering than the tiled
   preview approach; mobile performance would need measurement.

Disabling smoothing is useful as a diagnostic, but the comparison shows that it
replaces blur with coarse pixels. The recommended approach supplies new detail
as the user zooms.

## Proposed implementation and validation

- Regenerate the static overview and multi-resolution preview tiles together so
  the initial image and interactive view share their appearance.
- Preserve the website controls, detailed colors, selected layer state and
  original geometry. Keep the last complete view visible while sharper tiles load.
- Choose resolution from backing-store pixels; avoid enlarging a coarse preview
  while an appropriate level is available. Use consistent alpha and draw order
  across preview/detail transitions.
- Check Fit, 600, 300, 150, 80 and 60 µm views at desktop/mobile widths, DPR 1/2,
  fullscreen and isolated layers. Test seams and layer/mode transitions.
- Measure cold/warm loads, panning response, memory and request cancellation;
  retain existing checksum, fallback and recovery tests.

## References

- Current renderer: `js/gds-viewer.js`, especially `resize`, `preview`, `draw`.
- Pinned upstream exporter: https://github.com/mcranny/protocol-emulator-asic/blob/856a1ea25f6b0ff47a268d7c4719616e3f562f9e/tools/export_gds_static.py
- Canvas image scaling: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
- Multi-resolution tile selection: https://openseadragon.github.io/examples/tilesource-flexible-pyramid/

The image-pyramid reference describes the technique; the recommendation retains
this website's native viewer and does not require adopting another viewer UI.

## Multi-resolution implementation

- Six raster resolutions from 1,024 to 32,768 pixels across the die.
- 11,114 lossless WebP tiles totaling 1,235,908,896 bytes, including combined
  all-layer views and independent layers. Tiles load for the visible area only.
- Original polygon coordinates rendered with 2× supersampling; neighboring-pixel
  gutters and stable compositing preserve continuity across tile boundaries.
- Initial overview regenerated from the same renders.
- Resolution selected from viewport width and device pixel density. Previous
  frames remain visible during loading; stale raster requests are cancelled.
- SHA-256 verified before decode; a 64 MiB decoded raster cache complements
  the existing 12-tile geometry cache.
- Static validation covers every raster tile and all combined-view grid cells.
- Browser coverage includes zoom progression, cache budget, layer selection,
  cancellation, raster HTTP/checksum/source errors and recovery, plus existing
  geometry, keyboard/touch, fullscreen and fallback checks.
- All 72 site/theme/viewport checks passed. Additional DPR 2 desktop/mobile
  checks exercise resolution selection and the transition to polygon geometry.
