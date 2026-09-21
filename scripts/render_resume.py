#!/usr/bin/env python3
"""Render the public résumé using the established application typography."""
from pathlib import Path
import html
import json
import re
from reportlab.platypus import SimpleDocTemplate, Paragraph, HRFlowable, KeepTogether, Flowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.colors import black
from reportlab.pdfbase.pdfmetrics import stringWidth
import hashlib

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'scripts/resume-content.json').read_text())
esc = html.escape


styles = {
    'name': ParagraphStyle('name', fontName='Times-Bold', fontSize=20, leading=22, alignment=TA_CENTER, spaceAfter=3),
    'contact': ParagraphStyle('contact', fontName='Times-Roman', fontSize=9, leading=11, alignment=TA_CENTER, spaceAfter=5),
    'body': ParagraphStyle('body', fontName='Times-Roman', fontSize=10, leading=11.6, spaceAfter=2),
    'section': ParagraphStyle('section', fontName='Times-Bold', fontSize=10.2, leading=12, spaceBefore=6, spaceAfter=2, keepWithNext=True),
    'entry': ParagraphStyle('entry', fontName='Times-Bold', fontSize=10.1, leading=11.8),
    'date': ParagraphStyle('date', fontName='Times-Roman', fontSize=9.4, leading=11.8, alignment=TA_RIGHT),
    'role': ParagraphStyle('role', fontName='Times-Italic', fontSize=9.4, leading=11, spaceAfter=1),
    'place': ParagraphStyle('place', fontName='Times-Italic', fontSize=9.4, leading=11, alignment=TA_RIGHT),
    'bullet': ParagraphStyle('bullet', fontName='Times-Roman', fontSize=10, leading=11.6, leftIndent=9, bulletIndent=0, spaceAfter=1.5),
    'skill': ParagraphStyle('skill', fontName='Times-Roman', fontSize=9.6, leading=11.1, spaceAfter=1.5)
}

class AlignedLine(Flowable):
    """One text row with its date or location anchored to the right margin."""
    def __init__(self, left, right, left_style, right_style, space_before=0, space_after=0):
        super().__init__()
        self.left = Paragraph(esc(left), left_style)
        self.right = Paragraph(esc(right), right_style) if right else None
        self.right_width = stringWidth(right, right_style.fontName, right_style.fontSize) + 1 if right else 0
        self.spaceBefore = space_before
        self.spaceAfter = space_after
        self.keepWithNext = True
    def wrap(self, avail_width, avail_height):
        self.width = avail_width
        left_width = avail_width - self.right_width - (12 if self.right else 0)
        self.left_width, self.left_height = self.left.wrap(left_width, avail_height)
        self.right_height = self.right.wrap(self.right_width, avail_height)[1] if self.right else 0
        self.height = max(self.left_height, self.right_height)
        return self.width, self.height
    def draw(self):
        self.left.drawOn(self.canv, 0, self.height - self.left_height)
        if self.right:
            self.right.drawOn(self.canv, self.width - self.right_width, self.height - self.right_height)

contact_pdf = '<link href="mailto:crannymatthew@gmail.com">crannymatthew@gmail.com</link><br/><link href="https://mcranny.net">mcranny.net</link> &#160;&#160; <link href="https://linkedin.com/in/matthew-cranny">linkedin.com/in/matthew-cranny</link> &#160;&#160; <link href="https://github.com/mcranny">github.com/mcranny</link>'
story = [Paragraph('Matthew Cranny', styles['name']), Paragraph(contact_pdf, styles['contact']), Paragraph(esc(data['summary']), styles['body'])]

def section(title):
    story.extend([Paragraph(title.upper(), styles['section']), HRFlowable(width='100%', thickness=0.6, color=black, spaceAfter=3)])

for key, title in [('experience', 'Experience'), ('projects', 'Selected Engineering Projects')]:
    section(title)
    for e in data[key]:
        block = [AlignedLine(e['company'], e['date'], styles['entry'], styles['date'], space_before=2)]
        if e['role']:
            block.append(AlignedLine(e['role'], e['location'], styles['role'], styles['place'], space_after=1))
        block += [Paragraph(esc(b), styles['bullet'], bulletText='\u2022') for b in e['bullets']]
        story.append(KeepTogether(block))
section('Education')
e = data['education']
story.extend([AlignedLine(e['school'], e['date'], styles['entry'], styles['date']), Paragraph(esc(e['degree']), styles['role']), Paragraph('<b>Coursework:</b> ' + esc(data['coursework']).replace('Quantum Mechanics', 'Quantum&#160;Mechanics'), styles['skill'])])
section('Technical Skills')
story += [Paragraph('<b>' + esc(k) + ':</b> ' + esc(v), styles['skill']) for k, v in data['skills']]
pdf = ROOT / 'assets/Matthew-Cranny-Resume.pdf'
SimpleDocTemplate(str(pdf), pagesize=(612, 792), rightMargin=46.8, leftMargin=46.8, topMargin=34, bottomMargin=34, title='Matthew Cranny - Resume', author='Matthew Cranny').build(story)


# Synchronize the website entries while retaining its shared header and page layout.
page = ROOT / 'resume.html'
source = page.read_text()
parts = ['      <section class="resume-main">', '<p class="resume-summary">' + esc(data['summary']) + '</p>']
for key, title in [('experience', 'Experience'), ('projects', 'Selected Engineering Projects')]:
    parts.append('<section class="resume-section"><div class="section-rule"><h2>' + title + '</h2></div>')
    for item in data[key]:
        parts.append('<article class="resume-entry"><div class="resume-entry-head"><div><h3>' + esc(item['company']) + '</h3><p>' + esc(item['role']) + '</p></div><div>')
        if item['date']:
            parts.append('<code class="resume-date">' + esc(item['date']) + '</code>')
        if item['location']:
            parts.append('<code class="resume-location">' + esc(item['location']) + '</code>')
        parts.append('</div></div><ul>' + ''.join('<li>' + esc(b) + '</li>' for b in item['bullets']) + '</ul></article>')
    parts.append('</section>')
e = data['education']
parts.append('<section class="resume-section"><div class="section-rule"><h2>Education</h2></div><table><tbody>')
for label, value in [('School',e['school']),('Degree',e['degree']),('Date',e['date']),('Coursework',data['coursework'])]:
    parts.append('<tr><th>' + label + '</th><td>' + esc(value) + '</td></tr>')
parts.append('</tbody></table></section><section class="resume-section"><div class="section-rule"><h2>Technical Skills</h2></div><table><tbody>')
for label,value in data['skills']:
    parts.append('<tr><th>' + esc(label) + '</th><td>' + esc(value) + '</td></tr>')
parts.append('</tbody></table></section></section>')
start = source.index('      <section class="resume-main">')
end = source.index('    </main>',start)
source = source[:start] + '\n'.join(parts) + '\n' + source[end:]
# The rail repeats these same tools instead of maintaining a second skills list.
source = re.sub(r'(<dt>Core tools</dt>\s*<dd>).*?(</dd>)', lambda m: m[1] + esc(data['skills'][1][1]) + m[2], source, flags=re.S)
source = re.sub(r'(<dt>Hardware/test</dt>\s*<dd>).*?(</dd>)', lambda m: m[1] + esc(data['skills'][0][1]) + m[2], source, flags=re.S)
page.write_text(source)
fingerprint = {name: hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in ('scripts/resume-content.json', 'resume.html', 'assets/Matthew-Cranny-Resume.pdf')}
(ROOT/'scripts/resume-fingerprint.json').write_text(json.dumps(fingerprint, indent=2)+'\n')
print(pdf)
