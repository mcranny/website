# Résumé, editorial, and delivery update

The system-of-record résumé bullet now occupies two lines in the one-page PDF. The HTML and PDF are generated from the same content source, with the existing typography, contact row, summary, and experience order. The rendered PDF was inspected for wrapping and clipping.

Project headings describe architecture, implementation, and verification. The revision removes slogan-style sentence pairs from the ASIC case study and uses descriptive headings across the other project pages.

## Delivery changes

- Responsive quality-85 WebP previews replace full lossless previews in article content. The V3 mobile overview is 17,782 bytes, compared with the previous 772,130-byte image.
- Versioned display composites accompany the existing lossless pyramids. The original GDS, geometry tiles, layer images, and raster files retain their published bytes and URLs.
- Startup catalog sizes are 12,972 bytes for V3 and 11,189 bytes for V2, down from 313,719 and 1,200,360 bytes. Indexes for other resolutions and layers load on demand and are SHA-256 verified.
- Geometry and display metadata load concurrently. Geometry requests use batches of four, and parsing yields between chunks so cancellation can be processed.
- Unchanged canvas dimensions no longer trigger redundant resizing. Version activation explicitly requests a redraw.

## Checks

- Static asset, source hash, raster dimensions, complete index coverage, public references, and HTML/PDF consistency checks pass for 15,883 public files.
- All 72 route/theme/viewport checks pass.
- Both viewers pass zoom, layer selection, fullscreen, keyboard/touch, cancellation, no-JavaScript fallback, and HTTP/checksum/source mismatch recovery checks. Lazy index corruption and HTTP failures have explicit recovery coverage.
- Version selection, URL history, keyboard navigation, direct section links, repeated switching, and independent viewer state pass.
- The new cold mobile performance check runs in CI with a 390 × 844 viewport, DPR 1, 1.6 Mbps download throughput, 150 ms latency, and caching disabled. It limits the homepage chip preview to 50 KB and each viewer's startup downloads to 260 KB, while requiring deferred geometry and full catalog loading.
- Local optimized viewer startup measured 118,716 bytes / 1.36 seconds for V3 and 225,744 bytes / 2.35 seconds for V2. The earlier live implementation measured 9.94 seconds and 17.99 seconds with the same network settings; production timing is checked again after deployment.

Display composites are compressed raster previews. Individual layer images remain lossless, and detailed inspection uses the original polygon coordinates.
