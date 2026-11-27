# Test-only stand-in for Supabase's REST API. Never deploy this.
#
# Serves site/ with the same security headers as site/vercel.json, replaces config.js so the site
# talks to this server, and answers POST /rest/v1/rpc/<fn> by calling that SQL function as role
# `anon` in a local Postgres database. The database is chosen per request by the X-Moba-Db header,
# so every test can have its own fresh copy.
#
#   python bridge.py <site dir> <port>
import http.server, json, os, re, subprocess, sys

SITE = sys.argv[1]
PORT = int(sys.argv[2])
PSQL = os.environ.get("MOBA_PSQL") or (r"C:\Program Files\PostgreSQL\17\bin\psql.exe" if os.name == "nt" else "psql")
PG_PORT = os.environ.get("MOBA_PG_PORT", "54329")
DEFAULT_DB = os.environ.get("MOBA_DB", "moba_dev")
DB_NAME = re.compile(r"^moba_[a-z0-9_]{1,60}$")
PUBLIC_FNS = {"get_public_menu", "start_visit", "get_table_state", "place_order", "get_restaurant_info"}

# Same headers Vercel adds in production, so a change that breaks under the CSP fails locally too.
HEADERS = []
try:
    with open(os.path.join(SITE, "vercel.json"), encoding="utf-8") as f:
        for rule in json.load(f).get("headers", []):
            HEADERS += [(h["key"], h["value"]) for h in rule.get("headers", [])]
except (OSError, ValueError):
    pass


def literal(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    s = v if isinstance(v, str) else json.dumps(v)
    tag = "$moba$"
    while tag in s:
        tag = "$moba" + tag[1:]
    return f"{tag}{s}{tag}"


def http_status(code):
    # PostgREST's mapping for the codes this app can produce.
    if code == "42883":
        return 404
    if code == "42501":
        return 401
    if code in ("23503", "23505"):
        return 409
    return 400


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *a, **k):
        super().__init__(*a, directory=SITE, **k)

    def log_message(self, *a):
        pass

    def end_headers(self):
        for k, v in HEADERS:
            self.send_header(k, v)
        super().end_headers()

    def do_GET(self):
        if self.path.split("?")[0] == "/config.js":
            host = self.headers.get("Host") or f"localhost:{PORT}"
            body = ('window.MOBA_CONFIG = { supabaseUrl: "http://%s", supabaseKey: "sb_publishable_local_test" };' % host).encode()
            return self.send(200, body, "application/javascript")
        return super().do_GET()

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b""
        m = re.fullmatch(r"/rest/v1/rpc/([a-z_]+)", self.path)
        if not m or m.group(1) not in PUBLIC_FNS:
            return self.reply(404, {"code": "PGRST202", "message": "Could not find the function", "details": None, "hint": None})
        db = self.headers.get("X-Moba-Db") or DEFAULT_DB
        if not DB_NAME.match(db):
            return self.reply(400, {"code": "BRIDGE", "message": "bad X-Moba-Db", "details": None, "hint": None})
        try:
            args = json.loads(raw or b"{}")
            assert isinstance(args, dict)
        except Exception:
            return self.reply(400, {"code": "PGRST102", "message": "Empty or invalid json", "details": None, "hint": None})
        call = ", ".join(f"{k} => {literal(v)}" for k, v in args.items() if re.fullmatch(r"[a-z_]{1,40}", k))
        sql = f"set role anon; select public.{m.group(1)}({call})::text;"
        p = subprocess.run([PSQL, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose",
                            "-h", "localhost", "-p", PG_PORT, "-U", "postgres", "-d", db, "-c", sql],
                           capture_output=True, text=True, encoding="utf-8",
                           env={**os.environ, "PGCLIENTENCODING": "UTF8"})
        if p.returncode == 0:
            out = p.stdout.strip()
            return self.reply(200, json.loads(out) if out else None)
        err = re.search(r"ERROR:\s+([0-9A-Z]{5}):\s+(.*)", p.stderr)
        det = re.search(r"DETAIL:\s+(.*)", p.stderr)
        code, msg = (err.group(1), err.group(2).strip()) if err else ("XX000", p.stderr.strip()[:200])
        return self.reply(http_status(code), {"code": code, "message": msg, "details": det.group(1).strip() if det else None, "hint": None})

    def reply(self, status, obj):
        self.send(status, json.dumps(obj).encode(), "application/json; charset=utf-8")

    def send(self, status, body, ctype):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def handle_error(self, request, client_address):
        # Browsers drop keep-alive connections when a test closes its context; that's not an error.
        if isinstance(sys.exc_info()[1], (ConnectionResetError, ConnectionAbortedError, BrokenPipeError)):
            return
        super().handle_error(request, client_address)


if __name__ == "__main__":
    # Loopback only: this server can run SQL, so it must never be reachable from the network.
    srv = Server(("127.0.0.1", PORT), Handler)
    print(f"bridge ready on 127.0.0.1:{PORT}", flush=True)
    srv.serve_forever()
