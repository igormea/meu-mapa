"""Testes ponta a ponta do Ranvus Maps (Playwright + serviços falsos).
Uso: python3 tests/e2e.py [filtro]
"""
import sys, os, io, json, threading, time, http.server, functools, traceback
sys.modules.setdefault("e2e", sys.modules[__name__])
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(__file__))
import mocks
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8765
BASE = os.environ.get("BASE_URL", f"http://localhost:{PORT}/index.html")
APP_ORIGIN = BASE.rsplit("/", 1)[0]
ORIGIN = {"lat": -3.7319, "lon": -38.5267}
DEST = {"name": "Praia do Futuro, Fortaleza", "sub": "", "lat": -3.7434, "lon": -38.4614}

buf = io.BytesIO(); Image.new("RGB", (256, 256), (230, 215, 180)).save(buf, "PNG"); TILE = buf.getvalue()
OSM_FIXTURE = None   # definido por teste quando quiser injetar dados OSM
REQS = []            # URLs pedidas aos serviços externos (para conferir parâmetros)
WEATHER = {"temperature_2m": 29.0, "weather_code": 1, "precipitation": 0}   # clima falso padrão

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()

def serve():
    h = functools.partial(Quiet, directory=ROOT)
    s = http.server.ThreadingHTTPServer(("localhost", PORT), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s

def router(route):
    url = route.request.url
    j = lambda o: route.fulfill(status=200, content_type="application/json", body=json.dumps(o),
                                headers={"Access-Control-Allow-Origin": "*"})
    try:
        if url.startswith(f"http://localhost:{PORT}") or url.startswith(APP_ORIGIN):
            if "/data/osm-ce.json" in url and OSM_FIXTURE is not None: return j(OSM_FIXTURE)
            if "/data/places.json" in url: return j(PLACES_FIXTURE)
            if "/data/terrain.json" in url: return j(TERRAIN_FIXTURE)
            return route.continue_()
        if "tile.openstreetmap.org" in url: return route.fulfill(status=200, content_type="image/png", body=TILE, headers={"Access-Control-Allow-Origin": "*"})
        if "tiles.openfreemap.org/planet" in url and url.rstrip('/').endswith('planet'):
            return j({"tilejson": "2.2.0", "tiles": ["https://tiles.openfreemap.org/t/{z}/{x}/{y}.pbf"], "minzoom": 0, "maxzoom": 14})
        if "tiles.openfreemap.org" in url: return route.fulfill(status=204, body=b"", headers={"Access-Control-Allow-Origin": "*"})
        if "router.project-osrm.org" in url or "routing.openstreetmap.de" in url: REQS.append(url); return j(mocks.osrm(url))
        if "valhalla" in url: return j(mocks.valhalla(route.request.post_data))
        if "photon.komoot.io" in url: return j(mocks.photon(url))
        if "nominatim" in url: return j([])
        if "open-meteo.com" in url: return j({"current": WEATHER})
        return route.abort()
    except Exception as e:
        print("mock erro", url, e); return route.abort()

PLACES_FIXTURE = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures', 'places.json')))
TERRAIN_FIXTURE = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures', 'terrain.json')))
READY = "(()=>{try{return typeof map==='object'&&map.loaded&&map.loaded()&&typeof S==='object'}catch(e){return false}})()"
RESULTS = []
def test(fn):
    RESULTS.append(fn); return fn

class Ctx:
    def __init__(self, browser):
        self.browser = browser; self.ctx = None; self.page = None; self.errors = []
    def open(self, keep_storage=None, geo=None, init_script=None, block_sw=False, block=None):
        opts = dict(viewport={"width": 412, "height": 860}, device_scale_factor=1, has_touch=True, locale="pt-BR",
                    permissions=["geolocation"], geolocation=geo or {"latitude": ORIGIN["lat"], "longitude": ORIGIN["lon"], "accuracy": 8})
        if keep_storage: opts["storage_state"] = keep_storage
        if block_sw: opts["service_workers"] = "block"
        self.ctx = self.browser.new_context(**opts)
        self.ctx.route("**/*", router)
        if block: self.ctx.route(block, lambda r: r.abort())   # registrado por último = roda primeiro
        if init_script: self.ctx.add_init_script(init_script)
        self.page = self.ctx.new_page()
        self.page.on("pageerror", lambda e: self.errors.append(f"pageerror: {e}"))
        self.page.on("console", lambda m: m.type == "error" and self.errors.append(f"console: {m.text}"))
        self.page.goto(BASE); self.page.wait_for_function(READY, timeout=20000)
        return self
    def js(self, code, arg=None):
        return self.page.evaluate(code, arg)
    def wait(self, cond, timeout=15000):
        self.page.wait_for_function(cond, timeout=timeout)
    def close(self):
        self.ctx.close()
    def hero(self, cls="cavaleiro", name="Teste"):
        self.js(f"()=>{{selCls='{cls}';document.getElementById('heroName').value='{name}';confirmClass();S.mute=true}}")
    def route_to(self, dest=DEST):
        self.js("async(d)=>{originOverride={lat:%s,lon:%s};await goTo(d,true);stopCountdown()}" % (ORIGIN["lat"], ORIGIN["lon"]), dest)
        self.wait("PR.length>0 && document.getElementById('routePanel').style.display==='block'")

def run(filt=None):
    serve()
    passed = failed = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/google-chrome",
                                    args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        for fn in RESULTS:
            if filt and filt not in fn.__name__: continue
            c = Ctx(browser); t0 = time.time(); REQS.clear()
            globals()['OSM_FIXTURE'] = getattr(fn, 'osm', None)
            try:
                fn(c)
                bad = [e for e in c.errors if "favicon" not in e and "erro de teste" not in e]
                assert not bad, "erros no console: " + " | ".join(bad[:3])
                passed += 1; print(f"  ✅ {fn.__name__} ({time.time()-t0:.1f}s)")
            except Exception as e:
                failed += 1; print(f"  ❌ {fn.__name__}: {e}")
                if os.environ.get("TRACE"): traceback.print_exc()
                try: c.page.screenshot(path=f"/tmp/fail_{fn.__name__}.png")
                except Exception: pass
            finally:
                try: c.close()
                except Exception: pass
        browser.close()
    print(f"\n{passed} passaram, {failed} falharam")
    return failed

if __name__ == "__main__":
    import tests_suite  # noqa: registra os testes
    sys.exit(1 if run(sys.argv[1] if len(sys.argv) > 1 else None) else 0)
