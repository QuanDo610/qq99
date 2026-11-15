#!/usr/bin/env python3
"""
LUCKY QQ99 - Server chạy local (chỉ dùng cho 1 mình bạn).
  python3 backend/dev_server.py        -> mở http://localhost:8089

Làm 2 việc:
  1. Phục vụ website (index.html, assets/...)
  2. /api/kq?mien=MN&date=14/11/2026  -> proxy lấy HTML kết quả từ xosodaiphat.com
     (trình duyệt không gọi thẳng được vì trang nguồn không cho CORS)

An toàn: chỉ cho phép đúng 3 dạng URL của xosodaiphat.com, không nhận URL tùy ý.
"""
import json
import os
import re
import sys
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get("PORT", "8089"))
SLUG = {"MN": "xsmn", "MT": "xsmt", "MB": "xsmb"}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path != "/api/kq":
            return super().do_GET()

        q = parse_qs(u.query)
        mien = (q.get("mien") or [""])[0].upper()
        date = (q.get("date") or [""])[0]
        m = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", date)
        if mien not in SLUG or not m:
            return self._json(400, {"status": "error", "message": "Tham số mien/date không hợp lệ"})

        dd, mm, yyyy = m.group(1).zfill(2), m.group(2).zfill(2), m.group(3)
        url = f"https://xosodaiphat.com/{SLUG[mien]}-{dd}-{mm}-{yyyy}.html"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            html = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "replace")
            return self._json(200, {"status": "success", "url": url, "html": html})
        except Exception as e:  # noqa: BLE001
            return self._json(502, {"status": "error", "message": f"Không lấy được {url}: {e}"})

    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    print(f"LUCKY QQ99 chạy tại http://localhost:{PORT}  (Ctrl+C để dừng)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
