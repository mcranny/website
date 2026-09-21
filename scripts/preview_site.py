#!/usr/bin/env python3
"""Serve the deploy directory with the site's extensionless page routes."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
import argparse

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        route = urlsplit(self.path).path
        if route != '/' and not Path(route).suffix:
            self.path = route + '.html'
        super().do_GET()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5001)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]/'dist'
    ThreadingHTTPServer(('127.0.0.1', args.port), lambda *a, **kw: Handler(*a, directory=str(root), **kw)).serve_forever()
