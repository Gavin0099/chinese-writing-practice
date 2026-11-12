"""Serve the website on loopback for local browser acceptance on Windows."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]


class PreviewHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".mjs": "text/javascript"}

    def log_request(self, code="-", size="-"):
        self.log_message('"%s %s %s" %s %s', self.command, urlsplit(self.path).path,
                         self.request_version, str(code), str(size))

    def send_head(self):
        target = Path(self.translate_path(self.path)).resolve()
        relative = target.relative_to(ROOT) if target.is_relative_to(ROOT) else None
        parts = tuple(part.casefold() for part in relative.parts) if relative is not None else ()
        if relative is None or any(part.startswith(".") for part in parts) or (
            parts and parts[0] in {"artifacts", "data_engineering", "memory", "ai-governance-framework", "supabase"}
        ):
            self.send_error(404)
            return None
        return super().send_head()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    options = parser.parse_args()
    handler = partial(PreviewHandler, directory=str(ROOT))
    with ThreadingHTTPServer(("127.0.0.1", options.port), handler) as server:
        print(f"http://127.0.0.1:{server.server_port}/learning.html", flush=True)
        server.serve_forever()
