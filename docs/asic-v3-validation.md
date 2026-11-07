# V2/V3 website update

## Content and delivery

The public résumé uses `scripts/resume-content.json`, with generated HTML/PDF
and their recorded fingerprints. PDF Solutions bullets put qualification first,
selector hardware/C firmware second, and the integrated Rust/PostgreSQL system
of record third. The system tracks over 1,000 items across boards, serialized
parts, installations, software, firmware, and configurations.

The ASIC page defaults to V3 and retains V2 in a separate tab. Query parameters
select the version; fragment links select the panel containing the target.
Both panels remain readable without JavaScript. Each layout has an independent
viewer instance and loads geometry only after activation.

## Selected V3 layout

- Qualification run: https://github.com/mcranny/protocol-emulator-asic/actions/runs/40803741147
- Workflow source: `61065cf777e1d2eb9f641a00c6e28ff034f0014a`
- Physical source: `8b95d90b2fbbe5d742700884a49f2b89f1150904`
- GDS SHA-256: `050b88ed2253acb761f4f6365681a78da5e97520a03d02ff53b5a13e25d2be9f`
- Build / acceptance / gate-level artifact IDs: `12872272288` / `12873954682` / `12874411749`
- 8,784,464 polygons; 23 layer/datatype pairs; 16 × 8 geometry tiles.
- Independent KLayout and gdstk inventories agree, with original transformed
  polygon coordinates, all hierarchy levels, and all polygon layers retained.
- Five raster levels: 1,024 through 16,384 pixels across the die; original
  geometry is used for close inspection.
- Original GDS and metrics hashes match the retained acceptance record.
- Nine passing prechecks and fourteen passing gate-level scenarios.
- Slow-corner register-to-register setup margin: 2.578094 ns.
- Fast-corner hold margin: 0.1120732427472736 ns.

V2 keeps its original selected source, layout, raster pyramid, and downloads.
Public source links in the V2 panel point to its tagged documentation.

## FPGA operation

The owner confirmed V3 operation on the Digilent Cmod A7-35T. The board port uses
source `0ff3c61217fbe6909750814c19e7100b2ddf1038` with the Cmod wrapper and bridge.
The observed sequence covers programming, clock/reset, host communication,
program loading/readback, engine execution, and Vivado ILA capture. The 25 kHz
output capture contains 960 samples per half-cycle at a 48 MHz core clock.
The website describes those operations and keeps the FPGA and ASIC layout
results in their respective sections.

## Validation commands

```sh
python scripts/check_site.py
python scripts/build_site.py
npm run check:browser
npm run check:media
npm run check:versions
```

The media suite runs the existing geometry, raster, error-recovery, keyboard,
fullscreen, touch and fallback checks against both versions. The version suite
adds query selection, history, keyboard tabs, direct/legacy section links,
light/dark viewport checks, state isolation, and cancellation/recovery when a
viewer is hidden. PDF visual review covers the single-page layout, two-line
summary, single-line contact row, and unclipped body text.

## Completed local validation

- Static validation passed for 10 HTML pages and 14,797 public files, including
  source/raster/archive hashes and one-page résumé HTML/PDF consistency.
- The complete deploy build passed the existing asset count and file-size limits.
- All 72 page/theme/viewport cases passed.
- The complete media suite passed for both V3 and V2, including corruption and
  HTTP recovery, source mismatch, stalled-download cancellation, layer isolation,
  keyboard/touch navigation, fullscreen, CSP, and no-JavaScript fallback.
- Version navigation tests passed, including legacy anchors, history, keyboard
  tabs, independent viewer state, hidden-viewer cancellation, and both themes at
  desktop/mobile/landscape widths.
- V2 geometry, images, checksums, and downloads are unchanged.
- Visual inspection confirmed the one-page résumé, the V3 chip overview and
  SRAM detail image, and the responsive case-study layout.
