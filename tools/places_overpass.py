"""Índice de busca da Grande Fortaleza para o Ranvus Maps (sugestões instantâneas e offline).

Baixa do OpenStreetMap (Overpass) ruas, bairros e lugares com nome e gera data/places.json:
  {"gen": data, "subs": [bairros...], "d": [[nome, lat*1e5, lon*1e5, categoria, índice_do_bairro], ...]}
Ruas com o mesmo nome viram um ponto por trecho de cidade (agrupa pedaços a até ~900 m).
Uso: python3 tools/places_overpass.py   (roda no GitHub Actions; ver .github/workflows/osm-data.yml)
"""
import csv, io, json, math, sys, time, urllib.parse, urllib.request, datetime

BB = "-4.10,-38.80,-3.62,-38.30"   # Grande Fortaleza (sul,oeste,norte,leste)
HOSTS = ["https://overpass-api.de/api/interpreter",
         "https://overpass.kumi.systems/api/interpreter",
         "https://overpass.private.coffee/api/interpreter"]
COLS = ["name", "::lat", "::lon", "highway", "amenity", "shop", "tourism", "leisure", "office",
        "healthcare", "historic", "place", "aeroway", "railway", "public_transport", "natural"]

def q(body):
    head = '[out:csv(' + ",".join(COLS) + ';false;"\\t")][timeout:300];'
    data = urllib.parse.urlencode({"data": head + "(" + body + ");out center;"}).encode()
    for attempt in range(3):
        for h in HOSTS:
            try:
                req = urllib.request.Request(h, data=data, headers={"User-Agent": "ranvus-maps/1.0 (github.com/igormea/meu-mapa)"})
                with urllib.request.urlopen(req, timeout=330) as r:
                    txt = r.read().decode("utf-8")
                rows = [dict(zip(COLS, x)) for x in csv.reader(io.StringIO(txt), delimiter="\t") if len(x) == len(COLS)]
                print(h, len(rows), "linhas", file=sys.stderr)
                return rows
            except Exception as e:
                print("falhou", h, e, file=sys.stderr)
        time.sleep(30)
    raise SystemExit("Overpass indisponível")

ROAD = "motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|road|motorway_link|trunk_link|primary_link|secondary_link"
streets = q(f'way["highway"~"^({ROAD})$"]["name"]({BB});')
pois = q(f'nwr["name"][~"^(amenity|shop|tourism|leisure|office|healthcare|historic|aeroway|railway|public_transport)$"~"."]({BB});'
         f'node["place"~"^(suburb|neighbourhood|quarter|city|town|village|hamlet)$"]["name"]({BB});'
         f'nwr["natural"="beach"]["name"]({BB});')

def cat(t):
    a, s, l, tu = t["amenity"], t["shop"], t["leisure"], t["tourism"]
    if t["place"]: return "b"
    if a == "fuel": return "g"
    if a in ("hospital", "clinic", "pharmacy", "doctors", "dentist") or t["healthcare"]: return "h"
    if a in ("school", "university", "college", "kindergarten", "library"): return "e"
    if a in ("restaurant", "fast_food", "cafe", "bar", "pub", "ice_cream", "food_court"): return "f"
    if a in ("bank", "atm", "bureau_de_change"): return "m"
    if a == "place_of_worship": return "c"
    if a in ("bus_station", "ferry_terminal") or t["aeroway"] or t["railway"] or t["public_transport"]: return "x"
    if a == "parking": return "p"
    if s == "supermarket" or s == "mall": return "s" if s == "supermarket" else "S"
    if s: return "s"
    if l or t["natural"] == "beach": return "l"
    if tu or t["historic"]: return "t"
    if t["office"]: return "o"
    return "o"

def num(x):
    try: return float(x)
    except Exception: return None

# bairros (para mostrar "Rua X · Aldeota")
subs, sub_pts = [], []
for t in pois:
    if t["place"] in ("suburb", "neighbourhood", "quarter"):
        la, lo = num(t["::lat"]), num(t["::lon"])
        if la is None: continue
        subs.append(t["name"].strip()[:40]); sub_pts.append((la, lo))

def near_sub(la, lo):
    best, bi = 9e9, -1
    k = math.cos(math.radians(la))
    for i, (a, b) in enumerate(sub_pts):
        d = (a - la) ** 2 + ((b - lo) * k) ** 2
        if d < best: best, bi = d, i
    return bi if best < (0.03 ** 2) else -1     # até ~3 km

out = []
# ruas: agrupa trechos de mesmo nome que estão perto (uma "Rua Tal" por região)
groups = {}
for t in streets:
    la, lo = num(t["::lat"]), num(t["::lon"])
    nm = t["name"].strip()
    if la is None or not nm: continue
    lst = groups.setdefault(nm.lower(), [])
    for g in lst:
        if abs(g[0] / g[2] - la) < 0.008 and abs(g[1] / g[2] - lo) < 0.008:
            g[0] += la; g[1] += lo; g[2] += 1; break
    else:
        lst.append([la, lo, 1, nm[:60]])
for lst in groups.values():
    for la, lo, n, nm in lst:
        la, lo = la / n, lo / n
        out.append([nm, round(la * 1e5), round(lo * 1e5), "r", near_sub(la, lo)])

seen = set()
for t in pois:
    la, lo = num(t["::lat"]), num(t["::lon"])
    nm = t["name"].strip()[:60]
    if la is None or not nm: continue
    key = (nm.lower(), round(la, 3), round(lo, 3))
    if key in seen: continue
    seen.add(key)
    c = cat(t)
    out.append([nm, round(la * 1e5), round(lo * 1e5), c, -1 if c == "b" else near_sub(la, lo)])

res = {"gen": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"), "subs": subs, "d": out}
json.dump(res, open("data/places.json", "w"), separators=(",", ":"), ensure_ascii=False)
from collections import Counter
print("lugares:", len(out), dict(Counter(x[3] for x in out)), "bairros:", len(subs))
