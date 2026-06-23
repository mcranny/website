# mcranny.net Design System

## Palette

The palette is light-first and derived from semiconductor instrumentation: clean panel stock, black annotation ink, grey rule lines, and one ASML-like indigo signal color.

| Token | Hex | Role |
| --- | --- | --- |
| `--paper` | `#FAFAF8` | Primary page background |
| `--ink` | `#0A0A0B` | Primary text and high-contrast line work |
| `--graphite` | `#3D3D40` | Structural borders and secondary text |
| `--steel` | `#8A8D91` | Tertiary labels and inactive controls |
| `--signal` | `#1530A6` | Active state, links, focus outlines, live NEO trajectory |
| `--alert` | `#B3261E` | Genuine warnings or missing-source states only |

Dark mode is optional and toggle-only. It inverts the panel stock and ink while keeping `--signal` constant so the active trajectory reads like an instrument indicator.

## Type

- Display and labels: Inter Display / system grotesk. Restrained geometric headings fit the ASML/Anduril reference without using a novelty display face.
- Body: Inter / system sans. The site depends on fast scanning and readable engineering prose.
- Technical and numeric values: IBM Plex Mono / SFMono-Regular / Consolas. Orbital elements, benchmark values, contact details, and repository identifiers use a mono face so real data aligns predictably.

## Layout Concept

Every page uses one 12-column grid, a 56px top bar, hairline rules, and reusable readout blocks. Corners stay square or nearly square; there are no shadows, gradients, or decorative cards.

### Home

```text
top nav ------------------------------------------------
intro/status  [mini orbital canvas           ]
readouts      [project routing table         ]
footer -----------------------------------------------
```

### NEO Viewer

```text
top nav ------------------------------------------------
object list | orbital canvas / controls | readouts
technical panel ---------------------------------------
```

### B-Tree Engine

```text
top nav ------------------------------------------------
project summary | validation readouts
disk layout diagram -----------------------------------
technical table ---------------------------------------
```

### Resume

```text
top nav ------------------------------------------------
left rail: contact / verified facts | resume body
missing source notice                | source-needed rows
```

## Signature Element

The signature element is the NEO viewer: a live canvas readout with searchable object selection, trajectory comparison, zoom, rotation, time scrubbing, and orbital element panels. The recurring readout block carries that instrument language across Home, B-Tree, and Resume.

## Self-Critique

This system avoids the disallowed AI-default looks: there is no centered gradient hero, no glassmorphism, no cream/terracotta palette, no dark SaaS mood board, no floating rounded cards, and no animated entrance sequence. Visual interest comes from real data, grid alignment, and canvas trajectory rendering.
