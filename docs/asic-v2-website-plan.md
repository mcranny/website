# V2 ASIC website update plan

Reviewed 18 October 2026, America/Los_Angeles. Implementation and publication completed on 19 October 2026.

Implementation status: deployed to mcranny.net. See [implementation validation](asic-v2-validation.md) for the delivered scope, Cloudflare version and production checks.

## Direction

Make V2 the default identity of the Protocol Emulator case study and its homepage feature. Lead with programmable protocol execution, the selected physical layout, and demonstrated verification. Present V1 as a short engineering progression later in the page. Keep the site's existing typography, light/dark themes, navigation, and professional-work hierarchy.

The central story is **more capability in the same 6 × 4 Tiny Tapeout footprint**: two timing engines, larger queues, protocol receive/transmit firmware, and triggered capture. This is a capability and implementation story, not a claim that V2 is faster or has more timing margin.

## Reviewed state and evidence

- Website checkout: `7cf91c7d3abf8f29df0118e5a4c1b8ab3a04a3b6`, initially clean. The live `/protocol-emulator` page agrees with the stale V1 content in the checkout.
- ASIC `main`: [`856a1ea25f6b0ff47a268d7c4719616e3f562f9e`](https://github.com/mcranny/protocol-emulator-asic/commit/856a1ea25f6b0ff47a268d7c4719616e3f562f9e).
- [PR #15](https://github.com/mcranny/protocol-emulator-asic/pull/15) is merged; [V2 is published](https://github.com/mcranny/protocol-emulator-asic/releases/tag/v2). The release tag points to `ebd05cd434bdb1d9d238d824f7ea4321934b2c25`; package/runtime version remains `2.0.0rc1`.
- [PR #16](https://github.com/mcranny/protocol-emulator-asic/pull/16) is merged. [Documentation](https://mcranny.github.io/protocol-emulator-asic/) and the [static V2 viewer](https://mcranny.github.io/protocol-emulator-asic/layout/) are published.
- At the reviewed main SHA, [test](https://github.com/mcranny/protocol-emulator-asic/actions/runs/39197831666), [V2 candidate](https://github.com/mcranny/protocol-emulator-asic/actions/runs/39197817241), [docs](https://github.com/mcranny/protocol-emulator-asic/actions/runs/39197817245), and [Pages build/deploy](https://github.com/mcranny/protocol-emulator-asic/actions/runs/39197817168) succeeded. These are not evidence of a new physical route at main.
- The neighboring ASIC working directory has extensive uncommitted development. Review used a separate GitHub source archive at the main SHA above, without changing that checkout.

### Current V2 capability

- Two independent engines at 25 MHz; each has 64 × 24-bit instruction storage, a 16-byte TX queue, and a 16-record RX queue.
- Firmware examples cover UART TX/RX at approximately 115200 baud and 1 Mbaud, SPI modes 0–3 in controller and target roles, and I²C 100/400 kHz in controller and target roles.
- Shared infrastructure provides SPI host control, pin ownership, open-drain configuration, input filtering, and 32 triggered capture records.
- The release records 699 pytest cases, the complete V1/V2 functional gate, five induction proofs, six mutation checks, and 14 executable protocol examples. These counts describe the release's software source `881495c`; they are not a complete-coverage claim or a fresh count of current main.
- Expanded RTL properties, broader mutation coverage, assumption review, and a Lean ISA model are [planned Track 2 work](https://github.com/mcranny/protocol-emulator-asic/blob/856a1ea25f6b0ff47a268d7c4719616e3f562f9e/docs/verification-track-2.md).

### Physical result to display

Use the selected `447b3dfd0986d473c71afa28efafb3a5cff48da7` layout. Do not substitute the older `af573c5` acceptance archive or the website's `c22a3d4` V1 layout.

| Field | Selected V2 result |
| --- | --- |
| Process and allocation | IHP CMOS5L, 130 nm, 6 × 4 Tiny Tapeout tiles |
| Die bounds | 1,289.28 × 710.64 µm |
| Clock / max transition / uncertainty | 40 ns / 1.5 ns / 0.25 ns |
| Standard-cell area | 793,932 µm² |
| Core utilization | 87.9784% |
| Minimum extracted setup slack | +18.456291 ns across three corners |
| Minimum extracted hold slack | +0.054473 ns across three corners |
| Required physical checks | Passing in the selected local checkpoint recovery |
| Slew / fanout / capacitance violations | Zero at each required corner |
| Stock prechecks / gate-level scenarios | 9 / 14 passing |
| GDS SHA-256 | `902c78fce4a69fde56dbf209b34d5c809e2d44610e6b1e790f03963bb97322c6` |

Source: [release-selection record](https://github.com/mcranny/protocol-emulator-asic/blob/856a1ea25f6b0ff47a268d7c4719616e3f562f9e/evidence/v2-release-selection/selection.json) and [release evidence](https://github.com/mcranny/protocol-emulator-asic/blob/856a1ea25f6b0ff47a268d7c4719616e3f562f9e/docs/release-evidence.md).

The owner selected a completed local TT checkpoint recovery after the fresh hosted route exceeded six hours. Software source `881495c` and physical source `447b3df` have recorded matching elaborated RTL and prepared settings. Retain both identities. This is not an uninterrupted hosted route, a common-source acceptance-checker pass for the newer revision, silicon/FPGA operation, or competition acceptance. Historical machine-readable records can retain pre-publication status fields; use the published release and manifest for current publication status.

Review scope: inspected current GitHub state, source, release notes, published geometry manifest, viewer response headers, and the live viewer's overview-to-geometry transition. Did not rerun ASIC tools, independently revalidate the complete 2.74 GB evidence archive, or perform full viewer browser QA.

## Proposed page order and copy

### 1. V2 introduction

Suggested title: **Programmable Protocol Emulator ASIC — V2**.

Suggested lede: “Two programmable timing engines generate and observe UART, SPI, and I²C traffic, with triggered capture for repeatable hardware debugging.”

Suggested status: “V2 milestone released · selected physical layout validated through local checkpoint recovery · further verification planned.”

Use a compact capability strip: “2 timing engines · 25 MHz · 32 capture records · IHP 130 nm.” Put test counts and detailed physical metrics lower down. Actions: **Explore the V2 layout**, **Read documentation**, **View source**. Link release downloads in the evidence section.

### 2. Explore the chip

Give the layout a prominent full-width section immediately after the introduction. Show a lightweight V2 overview and a close-up of real routing geometry, generated from the selected GDS with recorded display settings. The existing V1 thumbnail should not remain the visual identity of this project.

Use an **Explore layout** button to activate the native viewer directly in the case study. The introduction’s layout action scrolls to this section. Keep the selected physical revision and a plain-language description visible beside the canvas. Provide **Full screen** and **Exit full screen** controls on the same page. On narrow screens, use a collapsible layer panel and touch-friendly controls so exploration remains usable within the website.

The viewer should be an engineering artifact visitors can explore, with a short invitation such as “Zoom from the die outline into the routing, then isolate individual layers.” Explain that the broad view is a raster preview and detailed views contain original polygon coordinates.

### 3. What V2 enables

Use three concise groups:

1. **Generate and respond:** dual engines and firmware-defined UART, SPI, and I²C behavior.
2. **Observe and diagnose:** RX queues, filtering, ownership controls, and triggered pin capture.
3. **Reproduce a failure:** Python assembly/loading tools, reference-model traces, independent protocol observers, and retained regression evidence.

Add a small architecture diagram showing SPI host control feeding two engines, each with program/TX/RX storage, with pin control/filtering and capture linked to external signals. Source it from the current architecture documentation; do not invent floorplan locations or imply blocks are identifiable in the GDS without mapping evidence.

### 4. One concrete V2 example

Replace the old `88f5210` UART TX-only waveform with an example generated from the released V2 software. A UART duplex trace is the clearest first example: show transmitted and received data plus expected timing. Label it as model or RTL simulation according to the generating source and retain the raw trace and checksum.

A later enhancement can offer UART/SPI/I²C tabs from the 14 released examples. The first update only needs one convincing, reproducible example. Do not present model traces as on-chip capture or hardware measurements, and do not imply autonomous capture replay unless independently established.

### 5. Verification and physical implementation

Separate three concise evidence groups:

- **Behavior:** release software tests, RTL/pin checks, five induction proofs, six mutation checks, and examples.
- **Selected layout:** extracted three-corner timing, physical/electrical checks, nine prechecks, and 14 gate-level scenarios.
- **Remaining work:** expanded verification and eventual hardware/competition milestones.

Show the physical table above with readable precision, retaining exact values in a source JSON. Put provenance and the local recovery explanation beside the results, with detailed logs behind links. Keep “functional gate-level models” distinct from extracted timing analysis.

Operational limits belong in a brief expandable note: volatile storage requires reload after state loss; 1 Mbaud duplex examples are bounded/preloaded bursts; the 1 MHz host does not sustain arbitrary continuous traffic at that rate; the installed CLI remains V1 while V2 uses the Python APIs.

### 6. From V1 to V2

Use one compact comparison and a short sequence of engineering milestones. Keep V2 as the default everywhere; do not create a top-level version selector or require loading two interactive layouts.

| Capability | V1.0.0 | V2 milestone |
| --- | --- | --- |
| Timing engines | 1 | 2 independent engines |
| Instruction storage | 64 × 24 bits total | 64 × 24 bits per engine |
| TX buffering | 4 bytes | 16 bytes per engine |
| Receive buffering | None | 16 records per engine |
| Protocol examples | UART TX | UART TX/RX, SPI modes 0–3, I²C; controller/target roles for SPI/I²C |
| Triggered capture | None | 32 records |
| Target | 25 MHz, 6 × 4 tiles | 25 MHz, 6 × 4 tiles |

Narrative milestones:

1. **V1 foundation:** single-engine UART transmission and completed electrical closure; released 23 September 2026 Pacific time (24 September UTC).
2. **V2 programmable execution:** dual engines, larger queues, pin controls, and capture.
3. **Independent behavioral verification:** protocol observers, differential testing, proofs, and mutations.
4. **Measured physical implementation:** storage/routing work and the selected validated checkpoint recovery.
5. **V2 milestone and explorer:** released 18 October 2026; current public layout and documentation.

Use [the completed V1 release](https://github.com/mcranny/protocol-emulator-asic/releases/tag/v1.0.0) as the baseline. It passed its electrical/physical acceptance; the website's earlier unresolved-slew snapshot is not the final V1 outcome. If adding a pair of static layouts, render accepted V1 and selected V2 with the same bounds, palette, layer mask, and scale. Label them explicitly and keep V2 dominant. This is optional polish, not a dependency of the V2 launch.

Avoid test-count progress bars, a single percentage-complete meter, and “faster” claims. V2's larger test suite has a broader scope; utilization and timing slack are engineering tradeoffs rather than scores. An area/utilization comparison would require confirming measurement definitions before publication.

### 7. Source, documentation, downloads

Link the V2 release, published documentation, physical evidence landing page, and locally hosted geometry manifest and selected original GDS. Layout actions lead to the native explorer within the case study. Put V1 release/archive links here as historical references. Use the evidence landing page rather than making the 2.74 GB archive the primary download.

## Viewer integration decision

### Agreed implementation: native static viewer on mcranny.net

The viewer is part of the website itself. Serve its JavaScript, styles, previews, geometry tiles, manifest and original GDS from mcranny.net, with a canvas and controls directly inside `protocol-emulator.html`. No external viewer link or cross-origin iframe is part of the visitor experience.

Reuse the refined static viewer/exporter from a pinned ASIC revision, preserving its Apache-2.0 license and source revision. Adapt the renderer to a scoped component that coexists with the portfolio scripts and design system. Generate assets from the checksum-pinned selected V2 GDS, retaining all layers, original polygon coordinates, tile hashes and the independent inventory. Native integration is part of the initial delivery.

Verified published manifest:

- 5,813,030 expanded polygons across 16 layer/datatype pairs.
- 512 gzip geometry tiles totaling 104,568,853 bytes (about 105 MB / 99.7 MiB); largest compressed tile 251,395 bytes. This is the full dataset, not the initial download.
- No geometry simplification, hierarchy cutoff, or omitted layers; independent expanded inventories match.
- At detailed zoom the browser fetches/hash-checks original transformed polygon records and retains at most 12 geometry tiles. This is a tile-count bound, not a total browser-memory guarantee.
- Raster overview and literal detail are explicitly distinguished. Text labels remain in the original GDS but are not drawn online. Geometry display does not establish connectivity.
- Pan, zoom, fit, Inspect geometry, keyboard navigation, layer toggles/Solo, GDS download, and manifest download are provided by the static viewer. Keep the local KLayout service's additional controls distinct from these online capabilities.

The reviewed live viewer successfully changed from a 1,340.85 µm raster view to original polygon geometry at 60.435 µm, displaying 49,190 tile records across four tiles.

Implementation requirements:

1. Show a lightweight same-site preview before activation. Keep it available when JavaScript or required browser APIs are unavailable, with a local original-GDS download and a clear explanation.
2. Activate interaction after visitor intent; lazy-load the renderer and request geometry only as needed. Avoid capturing page scroll before activation. Preserve an obvious way to return focus to the case study.
3. Integrate pan, zoom, fit, Inspect geometry, layer toggles/Solo, keyboard navigation and full screen into the page. Use a collapsible layer panel on mobile and preserve the current view when entering or exiting full screen. If browser fullscreen is unavailable, expand the viewer within the page.
4. Expose real loading, ready and error states from the renderer. Retain the preview on failure, show a useful error message, and support retry for failed manifest, preview or geometry requests. Test checksum failures as well as HTTP failures.
5. Serve all viewer resources from the same origin under a revision-specific path such as `assets/protocol-emulator/v2/layout-447b3df/`. Resolve asset URLs explicitly from the component configuration rather than relative to the page URL. No external `frame-src` addition is needed; verify the native viewer against the existing policy.
6. Pin the selected GDS hash and renderer revision in the website source manifest. Validate the complete local export at build/release time. Ship page captions, previews, renderer and geometry as one corresponding version; changing the upstream Pages site must not silently change the portfolio layout.
7. Measure the complete export size/file count and confirm it fits the existing Cloudflare deployment before packaging. Include the generated assets in the public-file build. Verify `.jsonl.gz` is served as the raw gzip payload expected by the checksum/decompression code, without unintended automatic decoding.
8. Preserve bounded geometry caching and test mobile memory and rendering responsiveness. The full dataset must not be downloaded on initial page load or viewer activation.
9. Confirm support for Canvas, Web Crypto and gzip DecompressionStream, with the preview/download path available where unsupported. Preserve explicit raster-preview and original-geometry labels.
10. Use the static exporter and browser renderer. The local `tools/gds_viewer.html` client requires a KLayout service and cannot be copied alone into this static website. Do not embed the giant full SVG.

## File-level implementation sequence

### Phase 1 — establish V2 content and reproducible assets

- Add `assets/protocol-emulator/v2/summary.json` with release/software/physical/viewer revisions, evidence URLs, measured values, and review date. Separate mutable publication status from immutable physical provenance.
- Add the selected V2 overview/detail preview, a V2 example trace, raw samples, and checksums. Generate the visuals from authoritative inputs, retaining render/export settings. Keep old V1 assets until all references and checks have been migrated.
- Update `protocol-emulator.html`: introduction, capability groups, example, physical results, evidence links, and compact progression section.
- Update the ASIC feature in `index.html`: V2 image, capability summary, status, and layout/documentation actions.
- Update metadata/social image references and `README.md`; remove current-status references to draft PR #9, 200 tests, pending UART RX/SPI/I²C, and failing V1 electrical closure.

### Phase 2 — integrate the viewer

- Replace the page's old OpenSeadragon entry point in `js/layout-viewer.js` with the native static geometry viewer, adapting the pinned renderer into a scoped component. Preserve its license and provenance. Load it on demand and bind its controls directly to the case-study canvas.
- Extend `css/project.css` for the viewer shell, preview, activation state, fullscreen and responsive layout. Preserve shared design tokens and the site's light/dark behavior.
- Review `_headers` for same-origin viewer resources, immutable revisioned asset caching and correct gzip delivery. Preserve existing framing protections.
- Add the complete revisioned geometry export, previews, original GDS, manifest, scripts and license to `scripts/public-files.json`, using a reproducible manifest-generation step. Validate hosting limits before deployment.
- After confirming all references have migrated, remove unused OpenSeadragon assets and old V1 tile files from the deployment allowlist. Historical V1 artifacts can remain linked at their original release.

### Phase 3 — validate content, integration and presentation

- Update `scripts/check_site.py` so its artifact and geometry expectations target V2 rather than requiring the old DZI pyramid. Verify checksums and reject mismatched software/physical labels.
- Update `scripts/check_media.cjs` from DZI tile-level assertions to native viewer behavior: preview before activation, original geometry rendering, keyboard access, layer isolation, pan/zoom, fullscreen, touch controls, failed-request retry, checksum rejection and no-JavaScript behavior. Exercise the locally served export, including gzip decoding, and assert that exploration makes no external viewer requests.
- Retain `scripts/check_browser.cjs` route/theme/responsive checks. Exercise widths from 375 px to desktop, focus visibility, readable tables, no horizontal overflow, and report-only CSP results.
- Check that no geometry requests occur before activation; measure viewer readiness and network/memory behavior after activation. Establish performance budgets from measured results rather than inventing them in page copy.
- Run the static check, build, browser suite and media suite against the local preview. Verify all new documentation/release/download links and the locally hosted selected GDS hash.
- Review desktop/mobile screenshots in both themes, including failed viewer loading and the compact V1 comparison.

### Phase 4 — review and publish the website update

Review the finished local page and its provenance before committing or deployment. Recheck upstream release/source identities and validate the pinned local viewer export before publishing. Publish through the existing Cloudflare workflow when authorized, then verify the deployed page, native geometry loading, compression/cache headers, links, fallback and V2 preview.

## Definition of done

- Homepage and project page clearly identify V2 as the current work.
- The selected V2 layout is the primary visual and the refined explorer runs directly within the case study, with all runtime assets served by mcranny.net and fullscreen on the same page.
- A visitor can understand V2's capability and validation without reading logs.
- Physical results identify the selected local recovery and original GDS source accurately.
- V1 progression uses the completed V1 release, occupies a compact secondary section, and does not impose a second viewer or version-selection flow.
- All claims, images and traces have matching provenance; future verification work is visibly distinct from completed results.
- Mobile/desktop, both themes, keyboard access, lazy loading and failure paths pass review.

The core delivery is Phases 1–3. The native viewer is included in that delivery. A matched pair of V1/V2 images, additional protocol trace tabs and layer presets are optional enhancements afterward.
