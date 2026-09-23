#!/usr/bin/env python3
"""Serve the deploy directory with the site's extensionless page routes."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
import argparse

def site_headers(root):
    """Read the site-wide response headers from the deploy artifact."""
    lines = (root/'_headers').read_text().splitlines()
    assert lines[0] == '/*'
    headers = []
    for line in lines[1:]:
        if line and not line[0].isspace():
            break
        if ':' in line:
            name, value = line.strip().split(':', 1)
            headers.append((name, value.strip()))
    return headers

class Handler(SimpleHTTPRequestHandler):
    global_headers = []

    def do_GET(self):
        route = urlsplit(self.path).path
        if route != '/' and not Path(route).suffix:
            self.path = route + '.html'
        super().do_GET()

    def end_headers(self):
        for name, value in self.global_headers:
            self.send_header(name, value)
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        fallback = Path(self.directory) / '404.html'
        if code == 404 and fallback.is_file():
            content = fallback.read_bytes()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return
        super().send_error(code, message, explain)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5001)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]/'dist'
    Handler.global_headers = site_headers(root)
    ThreadingHTTPServer(('127.0.0.1', args.port), lambda *a, **kw: Handler(*a, directory=str(root), **kw)).serve_forever()
