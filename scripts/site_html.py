"""Small HTML tree used by the static-site checks and résumé exporter."""
from html.parser import HTMLParser
from pathlib import Path
import re

def format_document(source):
    """Separate block tags for review without rewriting inline text or scripts."""
    scripts = []
    def retain(match):
        scripts.append(match[0])
        return f'__SITE_SCRIPT_{len(scripts)-1}__'
    source = re.sub(r'<script\b.*?</script>', retain, source, flags=re.S)
    blocks = r'html|head|body|meta|title|link|header|nav|main|footer|section|article|aside|h[1-6]|p|div|figure|figcaption|table|caption|thead|tbody|tr|th|td|ul|ol|li|dl|dt|dd|video|source|noscript'
    source = re.sub(r'(?<=>)(?=</?(?:' + blocks + r')\b)', '\n', source)
    for i, script in enumerate(scripts):
        source = source.replace(f'__SITE_SCRIPT_{i}__', script)
    return source

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

class Node:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    @property
    def text(self):
        return ' '.join(' '.join(c.text if isinstance(c, Node) else c for c in self.children).split())

    def find(self, tag=None, cls=None):
        found = []
        for child in self.children:
            if isinstance(child, Node):
                if (tag is None or child.tag == tag) and (cls is None or cls in child.attrs.get('class', '').split()):
                    found.append(child)
                found.extend(child.find(tag, cls))
        return found

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.root = Node()
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(data)

def parse(path):
    parser = Parser()
    parser.feed(Path(path).read_text())
    return parser.root
