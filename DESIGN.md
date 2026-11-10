# mcranny.net design conventions

Write concrete descriptions of what each system does and what its tests measured.
Name simulation, physical-design reports, and FPGA captures where those labels
identify a result. Keep source identities in references and downloadable records.
Avoid abstract thesis sentences, slogans, semicolons, arrows, middle dots, and em
dashes in page copy. Open with a paragraph below the H1, without an Overview heading.

Use the local system sans-serif stack. The type scale is 14, 16, 18, 20, and 32 px,
with weights 400 and 600. The shared container is 1040 px and the reading column
is at most 720 px. Section labels occupy a 160 px rail with a 24 px gap. Layouts
stack at 860 px and use narrower page margins at 520 px. Header, main, and footer
share the same outer edge. Monospace is for code and technical identifiers.

Experience, Projects, and Résumé are separate pages. Use inline links for sources
and cross-references. Filled buttons indicate actions or primary project links.
ASIC version links are text tabs with an underline and aria-selected. Version
titles are H2 and their subsections are H3.

Article media use one technical-figure component: a content-column-width 16:10
frame, a thin rule border, object-fit contain, and a caption below. ASIC layout
previews use their natural ratio so the complete die fills the frame. Preserve image
content and dimensions. Derivative terminal crops link to the original captures.
The TestOS playback derivative follows recent terminal output in a zoomed crop.
Link the original recording for the complete boot log.

The interactive ASIC viewers intentionally use the full 1040 px workspace for
canvas and layer controls. Their outer edges align with main. The heading, preview image, toolbar, and caption share the main left edge.
Use horizontal rules without an outer side border or extra horizontal inset. This
interactive workspace is separate from the 16:10 article-figure component.

Keep shared rules in base.css and viewer rules in project.css. --surface marks
selected viewer controls. --canvas supplies the dark viewer and video background.
The résumé has one content source for web and PDF. Verify its one-page rendering
and fingerprint after copy changes.

Scope, NEO, Hardware Verification, and Contact remain retired routes. Prototype
files are preserved in Git history after removal from main. See README.md for
deployment and verification. R2 migration and automatic deployment are deferred.
