"""Mapa de TERRENOS da Grande Fortaleza para o Ranvus Maps (cada terreno tem seus monstros).

Lê do OpenStreetMap (Overpass) praias, dunas, lagoas/rios, mangues, matas/parques, zonas industriais/porto,
comércio/shoppings e áreas rurais, e gera uma grade de ~220 m em data/terrain.json:
  {"gen":..., "bb":[sul,oeste,norte,leste], "step":0.002, "rows":["<RLE>", ...]}
Códigos: u=urbano (padrão) c=comercial i=industrial p=praia/areia a=água m=mangue v=mata/parque r=rural
RLE: letra seguida da quantidade (ex.: "u12p3a1"). Uso: python3 tools/terrain_overpass.py
"""
import json, sys, time, math, urllib.parse, urllib.request, datetime

S, W, N, E = -4.10, -38.80, -3.62, -38.30
STEP = 0.002
BB = f"{S},{W},{N},{E}"
HOSTS = ["https://overpass-api.de/api/interpreter",
         "https://overpass.kumi.systems/api/interpreter",
         "https://overpass.private.coffee/api/interpreter"]

def q(body):
    data = urllib.parse.urlencode({"data": f"[out:json][timeout:300];({body});out geom qt;"}).encode()
    for attempt in range(3):
        for h in HOSTS:
            try:
                req = urllib.request.Request(h, data=data, headers={"User-Agent": "ranvus-maps/1.0 (github.com/igormea/meu-mapa)"})
                with urllib.request.urlopen(req, timeout=330) as r:
                    els = json.load(r)["elements"]
                print(h, len(els), "elementos", file=sys.stderr); return els
            except Exception as e:
                print("falhou", h, e, file=sys.stderr)
        time.sleep(30)
    raise SystemExit("Overpass indisponível")

# prioridade: quem vem depois sobrescreve
ORDER = "rcvi" + "mpa"     # rural < comercial < mata < industrial < mangue < praia < água
def code(t):
    lu, na, le = t.get("landuse", ""), t.get("natural", ""), t.get("leisure", "")
    if na == "water" or t.get("waterway") == "riverbank" or lu in ("reservoir", "basin"): return "a"
    if t.get("wetland") == "mangrove" or na == "wetland": return "m"
    if na in ("beach", "dune"): return "p"           # "sand" solto (banco de rio, terreno) não é praia
    if lu in ("industrial", "port", "railway", "quarry", "landfill") or t.get("industrial"): return "i"
    if na in ("wood", "scrub") or lu == "forest" or le in ("park", "nature_reserve", "garden"): return "v"
    if lu in ("commercial", "retail") or t.get("shop") == "mall": return "c"
    if lu in ("farmland", "meadow", "orchard", "farmyard", "grass") or na in ("grassland", "heath"): return "r"
    return None

els = q(f'way["landuse"~"^(industrial|port|railway|quarry|landfill|commercial|retail|farmland|meadow|orchard|farmyard|forest|reservoir|basin)$"]({BB});'
        f'relation["landuse"~"^(industrial|port|commercial|retail|farmland|forest|reservoir)$"]({BB});'
        f'way["natural"~"^(water|wetland|beach|sand|dune|wood|scrub|grassland)$"]({BB});'
        f'relation["natural"~"^(water|wetland|beach|wood|scrub)$"]({BB});'
        f'way["leisure"~"^(park|nature_reserve)$"]({BB});relation["leisure"~"^(park|nature_reserve)$"]({BB});'
        f'way["waterway"="riverbank"]({BB});way["shop"="mall"]({BB});')

ROWS, COLS = round((N - S) / STEP), round((E - W) / STEP)
grid = [["u"] * COLS for _ in range(ROWS)]
rank = {c: i for i, c in enumerate(ORDER)}

def rings(e):
    if e["type"] == "way" and e.get("geometry"): return [[(p["lat"], p["lon"]) for p in e["geometry"]]]
    if e["type"] == "relation":
        return [[(p["lat"], p["lon"]) for p in m["geometry"]] for m in e.get("members", []) if m.get("role") == "outer" and m.get("geometry")]
    return []

def inside(la, lo, ring):
    c = False; n = len(ring)
    for i in range(n):
        a, b = ring[i], ring[i - 1]
        if (a[1] > lo) != (b[1] > lo) and la < (b[0] - a[0]) * (lo - a[1]) / ((b[1] - a[1]) or 1e-12) + a[0]: c = not c
    return c

def put(r, c, k):
    if 0 <= r < ROWS and 0 <= c < COLS and (grid[r][c] == "u" or rank[k] >= rank.get(grid[r][c], -1)): grid[r][c] = k

items = []
for e in els:
    k = code(e.get("tags", {}))
    if k: items.append((rank[k], k, e))
items.sort(key=lambda x: x[0])                       # pinta do menos para o mais importante
for _, k, e in items:
    for ring in rings(e):
        if len(ring) < 3: continue
        las, los = [p[0] for p in ring], [p[1] for p in ring]
        r0, r1 = int((min(las) - S) / STEP), int((max(las) - S) / STEP)
        c0, c1 = int((min(los) - W) / STEP), int((max(los) - W) / STEP)
        for r in range(max(0, r0), min(ROWS - 1, r1) + 1):
            la = S + (r + .5) * STEP
            for c in range(max(0, c0), min(COLS - 1, c1) + 1):
                if inside(la, W + (c + .5) * STEP, ring): put(r, c, k)
        if k in "pam":                               # feições finas (faixa de praia, rio): marca também por onde a borda passa
            for la, lo in ring: put(int((la - S) / STEP), int((lo - W) / STEP), k)

def rle(row):
    out, cur, n = [], row[0], 0
    for x in row:
        if x == cur: n += 1
        else: out.append(f"{cur}{n}"); cur, n = x, 1
    out.append(f"{cur}{n}"); return "".join(out)

json.dump({"gen": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"), "bb": [S, W, N, E], "step": STEP,
           "rows": [rle(r) for r in grid]}, open("data/terrain.json", "w"), separators=(",", ":"))
from collections import Counter
print("terreno:", dict(Counter(x for r in grid for x in r)), "polígonos:", len(items))
