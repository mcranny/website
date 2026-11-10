"""Build isolated design samples; production files and allowlists are untouched."""
from pathlib import Path
import html
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
resume = json.loads((ROOT / 'scripts/resume-content.json').read_text())
esc = html.escape
styles = [('a', 'Plain technical document'), ('b', 'Compact engineering reference'), ('c', 'Technical manual')]

home = '''<header class="intro"><h1>Matthew Cranny</h1>
<p class="role">Systems Engineer, PDF Solutions</p>
<p>Automated hardware testing, embedded firmware, and digital design.</p>
<p><a href="mailto:crannymatthew@gmail.com">crannymatthew@gmail.com</a></p></header>
<section id="experience"><h2>Experience</h2><div class="section-content">
<h3>PDF Solutions</h3><p class="meta">Systems Engineer, San Jose, CA<br>March 2026 to present</p>
<ul class="experience-list">''' + ''.join('<li>' + esc(resume['experience'][0]['bullets'][i]) + '</li>' for i in [0, 1, 2, 4]) + '''</ul></div></section>
<section id="projects"><h2>Projects</h2><div class="section-content">
<article class="project"><div class="project-copy"><h3><a href="asic.html">Programmable Protocol Emulator ASIC</a></h3>
<p>Two programmable engines schedule protocol edges on a shared 48 MHz timebase, with SRAM program memory and timestamped capture.</p>
<dl><dt>Platform</dt><dd>Verilog, Python, IHP 130 nm CMOS5L</dd><dt>Memory</dt><dd>256 × 32 bits per engine</dd><dt>Hardware</dt><dd>Artix-7 Cmod A7-35T, Vivado ILA capture</dd></dl>
<p class="links"><a href="asic.html">Technical details</a><a href="https://github.com/mcranny/protocol-emulator-asic">Source</a></p></div>
<figure><img src="/assets/protocol-emulator/v3/display-v1/overview-1024.webp" width="1024" height="422" alt="V3 chip layout showing two SRAM macros and routed logic"><figcaption>V3 physical layout, 1,724 × 711 µm.</figcaption></figure></article>
<article class="project"><div class="project-copy"><h3><a href="/testos.html">TestOS</a></h3>
<p>A UEFI-booted x86-64 operating system with persistent storage, a network stack, and user-space utilities.</p>
<dl><dt>Platform</dt><dd>C, x86-64</dd><dt>Storage</dt><dd>ATA, AHCI, and NVMe data-disk checks</dd><dt>Testing</dt><dd>QEMU boot, HTTP downloads, and TCP packet checks</dd></dl>
<p class="links"><a href="/testos.html">Technical details</a><a href="https://github.com/mcranny/TestOS">Source</a></p></div>
<figure><img src="/assets/testos/boot-poster.png" width="1024" height="768" alt="TestOS terminal booted in QEMU"><figcaption>TestOS shell in QEMU.</figcaption></figure></article>
<article class="project"><div class="project-copy"><h3><a href="/btree.html">B-Tree Storage Engine</a></h3>
<p>A disk-backed Rust key-value engine with a checksummed redo log, deletion rebalancing, and differential tests against SQLite.</p>
<dl><dt>Platform</dt><dd>Rust</dd><dt>Pages</dt><dd>4,096 bytes, 64-page LRU cache</dd><dt>Recovery</dt><dd>Replay of complete redo-log records</dd></dl>
<p class="links"><a href="/btree.html">Technical details</a><a href="https://github.com/mcranny/btree-storage-engine">Source</a></p></div>
<figure class="page-structure"><dl><dt>Metadata page</dt><dd>Root, page count, free-list head</dd><dt>Node page</dt><dd>Keys, records, child page identifiers</dd><dt>Reusable page</dt><dd>Next free page identifier</dd></dl><figcaption>B-tree database page types, 4,096 bytes per page.</figcaption></figure></article>
</div></section>
<section id="background"><h2>Background</h2><div class="section-content"><dl class="background">
<dt>Amazon</dt><dd>Area Manager Intern, ICQA, May to July 2025. Python and AWS data pipelines; automated labor reporting.</dd>
<dt>Space Sciences Laboratory</dt><dd>Aerospace Engineering Intern, June 2024 to May 2025. Mechanical design, cleanroom assembly, and flight-hardware wiring.</dd>
<dt>UC Berkeley</dt><dd>B.A. Physics, May 2026. Instrumentation, experimental laboratory, electromagnetism, and optics.</dd>
</dl></div></section>'''

asic = '''<header class="intro"><h1>Programmable Protocol Emulator ASIC</h1>
<p class="role">V3, dual-engine programmable digital interface</p>
<p>Each engine advances a private time cursor and schedules output values and enables. Eight pin cells apply those changes against a shared 48 MHz clock. Programs implement UART, SPI, I²C, and WS2812 signaling.</p>
<p class="links"><a href="https://github.com/mcranny/protocol-emulator-asic">Source repository</a><a href="/protocol-emulator.html?version=v3#v3-explore-layout">Interactive layout</a></p></header>
<section><h2>Specifications</h2><div class="section-content"><table><caption>V3 core and selected physical implementation</caption><thead><tr><th scope="col">Parameter</th><th scope="col">Value</th></tr></thead><tbody>
<tr><th scope="row">Timing engines</th><td>2, each with a private time cursor</td></tr>
<tr><th scope="row">Program memory</th><td>256 × 32-bit SRAM per engine</td></tr>
<tr><th scope="row">Timebase</th><td>24-bit shared counter, 48 MHz (20.83 ns per cycle)</td></tr>
<tr><th scope="row">Pin interface</th><td>8 deadline-driven pin cells, disjoint ownership, open-drain support</td></tr>
<tr><th scope="row">Capture</th><td>32 records containing timestamps, inputs, outputs, enables, and engine flags</td></tr>
<tr><th scope="row">Process and die</th><td>IHP 130 nm CMOS5L, 1,724 × 711 µm</td></tr>
<tr><th scope="row">Physical source</th><td><code>8b95d90b2fbbe5d742700884a49f2b89f1150904</code></td></tr>
</tbody></table></div></section>
<section><h2>Execution and timing</h2><div class="section-content"><p>The host loads and reads back programs through a 48-clock SPI frame. Each engine schedules pin changes independently; the shared counter supplies deadlines and capture timestamps.</p>
<figure class="architecture"><div class="architecture-host"><strong>SPI host interface</strong><span>Program loading and readback, queues, status</span></div>
<div class="engines"><div><strong>Engine 0</strong><span>256 × 32 SRAM</span><span>Private time cursor</span></div><div><strong>Engine 1</strong><span>256 × 32 SRAM</span><span>Private time cursor</span></div></div>
<div class="architecture-shared"><strong>Shared 24-bit timebase, 48 MHz</strong><span>8 pin cells with programmed deadlines</span><span>32-record timestamped capture</span></div>
<figcaption>Figure 1. Functional organization. Engines schedule changes; pin cells apply them at their deadlines.</figcaption></figure>
<p>Each engine has a 16-byte transmit queue and a 16-record receive queue. Pin ownership separates the engines’ outputs, while capture records the shared digital interface.</p></div></section>
<section><h2>Implementation and results</h2><div class="section-content">
<p>V3 ran on an Artix-7 Cmod A7-35T with a 48 MHz core clock. Host program loading, readback, and execution were exercised. A Vivado ILA capture recorded a 25 kHz output with 960 samples per half-cycle, equivalent to 20 µs. This is an FPGA digital capture, not an analog signal-quality measurement.</p>
<p>The selected ASIC layout passed 9 physical prechecks and 14 routed-netlist scenarios. Reported slow-corner register setup margin is +2.58 ns; fast-corner hold margin is +0.112 ns. These are physical-design and simulation results, not measurements from fabricated silicon.</p>
<figure><img src="/assets/protocol-emulator/v3/display-v1/detail-1400.webp" width="1400" height="700" alt="SRAM interface and routed standard-cell logic in the V3 physical layout"><figcaption>Figure 2. SRAM interface and surrounding routing in the selected V3 layout.</figcaption></figure></div></section>
<section><h2>Source and records</h2><div class="section-content"><p>Design source <a href="https://github.com/mcranny/protocol-emulator-asic/tree/0ff3c61217fbe6909750814c19e7100b2ddf1038"><code>0ff3c61</code></a>, physical source <a href="https://github.com/mcranny/protocol-emulator-asic/tree/8b95d90b2fbbe5d742700884a49f2b89f1150904"><code>8b95d90</code></a>, run <a href="https://github.com/mcranny/protocol-emulator-asic/actions/runs/40803741147"><code>40803741147</code></a>, workflow source <a href="https://github.com/mcranny/protocol-emulator-asic/tree/61065cf777e1d2eb9f641a00c6e28ff034f0014a"><code>61065cf</code></a></p>
<p class="links"><a href="/assets/protocol-emulator/v3/summary.json">Exact metrics</a><a href="/assets/protocol-emulator/v3/checksums.json">Artifact checksums</a><a href="https://github.com/mcranny/protocol-emulator-asic/blob/0ff3c61217fbe6909750814c19e7100b2ddf1038/docs/design/v3-architecture.md">Architecture documentation</a></p></div></section>'''

for key, name in styles:
    folder = HERE / key
    folder.mkdir(exist_ok=True)
    for filename, title, body in [('index.html', 'Matthew Cranny', home), ('asic.html', 'Programmable Protocol Emulator ASIC', asic)]:
        page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="robots" content="noindex"><title>{title} | Prototype {key.upper()}</title><link rel="stylesheet" href="../{key}.css"></head>
<body><a class="skip" href="#main">Skip to content</a>
<header class="site-header"><a class="identity" href="index.html">Matthew Cranny</a><nav aria-label="Primary"><a href="index.html#experience">Experience</a><a href="index.html#projects">Projects</a><a href="/resume.html">Résumé</a></nav></header>
<main id="main" class="{'home' if filename == 'index.html' else 'detail'}">{body}</main>
<footer><nav aria-label="Contact"><a href="/resume.html">Résumé</a><a href="https://github.com/mcranny">GitHub</a><a href="https://linkedin.com/in/matthew-cranny">LinkedIn</a><a href="mailto:crannymatthew@gmail.com">Email</a></nav><p class="review-note">Prototype {key.upper()}: {name}. <a href="../index.html">Compare designs</a></p></footer></body></html>'''
        (folder / filename).write_text(page)
print('Rendered six prototype pages; production unchanged.')
