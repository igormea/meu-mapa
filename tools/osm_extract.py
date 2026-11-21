"""Gera data/osm-ce.json (pontos usados nos alertas do Meu Mapa RPG).

Entrada: GeoJSON-seq produzido pelo osmium a partir do extrato da Geofabrik
(veja .github/workflows/osm-data.yml). Uso: python3 tools/osm_extract.py filtrado.geojsonseq

Saída compacta:
  cam  : radares            [lat, lon, limite_kmh|0]   (Ceará)
  bump : lombadas/redutores [lat, lon]                 (Ceará)
  toll : pedágios           [lat, lon]                 (Ceará)
  rail : passagens de trem  [lat, lon]                 (Ceará)
  sig  : semáforos          [lat, lon]                 (Grande Fortaleza)
  park : estacionamentos    [lat, lon, nome]           (Grande Fortaleza)
  fuel : postos             [lat, lon, nome]           (Ceará)
  pharm: farmácias          [lat, lon, nome]           (Grande Fortaleza)
"""
import json, re, sys, datetime

CE  = (-7.95, -41.45, -2.70, -37.20)   # sul, oeste, norte, leste
FOR = (-4.10, -38.80, -3.62, -38.30)
inside = lambda b, la, lo: b[0] <= la <= b[2] and b[1] <= lo <= b[3]

def centroid(g):
    t, c = g["type"], g["coordinates"]
    if t == "Point": return c[1], c[0]
    pts = []
    def walk(x):
        if isinstance(x[0], (int, float)): pts.append(x)
        else:
            for y in x: walk(y)
    walk(c)
    return sum(p[1] for p in pts) / len(pts), sum(p[0] for p in pts) / len(pts)

def speed(tags):
    m = re.match(r"\s*(\d+)", tags.get("maxspeed", "") or "")
    return int(m.group(1)) if m else 0

res = {k: set() for k in ["cam", "bump", "toll", "rail", "sig", "park", "fuel", "pharm"]}
for line in open(sys.argv[1], encoding="utf-8"):
    line = line.strip().lstrip("\x1e")
    if not line: continue
    f = json.loads(line); t = f.get("properties", {})
    try: la, lo = centroid(f["geometry"])
    except Exception: continue
    la, lo = round(la, 5), round(lo, 5)
    if not inside(CE, la, lo): continue
    nome = (t.get("name") or t.get("brand") or "")[:40]
    if t.get("highway") == "speed_camera" or t.get("enforcement") == "maxspeed": res["cam"].add((la, lo, speed(t)))
    if t.get("traffic_calming") in ("bump", "hump", "table", "cushion", "yes", "rumble_strip"): res["bump"].add((la, lo))
    if t.get("barrier") == "toll_booth": res["toll"].add((la, lo))
    if t.get("railway") == "level_crossing": res["rail"].add((la, lo))
    if t.get("highway") == "traffic_signals" and inside(FOR, la, lo): res["sig"].add((la, lo))
    a = t.get("amenity")
    if a == "parking" and inside(FOR, la, lo) and t.get("access") not in ("private", "no"): res["park"].add((la, lo, nome))
    if a == "fuel": res["fuel"].add((la, lo, nome))
    if a == "pharmacy" and inside(FOR, la, lo): res["pharm"].add((la, lo, nome))

out = {"gen": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")}
for k, v in res.items():
    out[k] = sorted(list(x) for x in v); print(k, len(v))
json.dump(out, open("data/osm-ce.json", "w"), separators=(",", ":"), ensure_ascii=False)
