# mcranny.net design conventions

The site uses the compact engineering-reference prototype (B), with separate
Experience and Projects pages. The wordmark returns home; primary navigation
links to Experience, Projects, and Résumé. It remains visible on small screens.

Use connected technical prose to explain the problem, design, implementation,
and results. Avoid slogans, fragmentary pitches, decorative labels, and repeated
claims. Keep precise qualifications where they affect what a result establishes.
Put source identities in reference links and downloadable records, rather than
repeating build hashes or pull-request numbers in headings and captions.

Use system sans-serif, 16px body text, a 1040px shared container, a narrow column
for section headings, and responsive stacking at 860px and 520px. Header, main,
and footer share the same edge. Monospace is for code and identifiers. All pages
use light mode, plain rules, and the same typography and spacing.

Primary actions use filled dark buttons; secondary actions use outlined buttons.
Inline reference links remain recognizable as links. Navigation links are plain
text with active/hover indications. Do not turn paragraphs into button collections.

Use tables for specifications and comparisons. Figures retain useful technical
content and their proportions. The ASIC keeps both V2 and V3, with a substantive
comparison of instruction-dependent timing and deadline-driven pin transitions.
Distinguish protocol baud rate from core clock and host service throughput;
distinguish simulation, physical-design reports, FPGA capture, and silicon tests.

Keep shared rules in base.css and article/viewer rules in project.css. Preserve
viewer controls and progressive enhancement. The résumé has one content source
for web and PDF. Prototype files are review artifacts, excluded from deployment.

Scope, NEO, Hardware Verification, and Contact are retired routes. R2 asset
migration and automatic deployment remain separate open follow-up work.
