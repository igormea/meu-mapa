"""Extrai do OpenStreetMap (Overpass) os pontos usados nos alertas do Meu Mapa RPG.

Gera data/osm-ce.json, compacto:
  cam  : radares            [lat, lon, limite_kmh|0]
  bump : lombadas/redutores [lat, lon]
  toll : pedágios           [lat, lon]
  rail : passagens de trem  [lat, lon]
  sig  : semáforos (Grande Fortaleza) [lat, lon]
  park : estacionamentos (Grande Fortaleza) [lat, lon, nome]
  fuel : postos (Ceará)     [lat, lon, nome]
  pharm: farmácias (Grande Fortaleza) [lat, lon, nome]
"""
import json, re, sys, time, urllib.request, urllib.parse, datetime

CE  = "-7.95,-41.45,-2.70,-37.20"   # Ceará (sul,oeste,norte,leste)
FOR = "-4.10,-38.80,-3.62,-38.30"   # Grande Fortaleza
HOSTS = ["https://overpass-api.de/api/interpreter",
         "https://overpass.kumi.systems/api/interpreter",
         "https://overpass.private.coffee/api/interpreter"]

def q(body):
    query = f"[out:json][timeout:180];({body});out center tags;"
    data = urllib.parse.urlencode({"data": query}).encode()
    for attempt in range(3):
        for h in HOSTS:
            try:
                req = urllib.request.Request(h, data=data, headers={"User-Agent": "meu-mapa-rpg/1.0 (github.com/igormea/meu-mapa)"})
                with urllib.request.urlopen(req, timeout=200) as r:
                    return json.load(r)["elements"]
            except Exception as e:
                print("falhou", h, e, file=sys.stderr)
        time.sleep(20)
    raise SystemExit("Overpass indisponível")

def ll(e):
    if "lat" in e: return round(e["lat"], 5), round(e["lon"], 5)
    c = e.get("center") or {}
    return (round(c["lat"], 5), round(c["lon"], 5)) if c else None

def speed(tags):
    m = re.match(r"\s*(\d+)", tags.get("maxspeed", "") or "")
    return int(m.group(1)) if m else 0

def pts(els, name=False, spd=False):
    out = []
    for e in els:
        p = ll(e)
        if not p: continue
        row = list(p)
        if spd:  row.append(speed(e.get("tags", {})))
        if name: row.append((e.get("tags", {}).get("name") or e.get("tags", {}).get("brand") or "")[:40])
        out.append(row)
    return sorted(set(map(tuple, out)))

res = {"gen": datetime.datetime.utcnow().strftime("%Y-%m-%d")}
res["cam"]   = pts(q(f'node["highway"="speed_camera"]({CE});node["enforcement"="maxspeed"]({CE});'), spd=True)
res["bump"]  = pts(q(f'node["traffic_calming"~"^(bump|hump|table|cushion|yes|rumble_strip)$"]({CE});'))
res["toll"]  = pts(q(f'node["barrier"="toll_booth"]({CE});'))
res["rail"]  = pts(q(f'node["railway"="level_crossing"]({CE});'))
res["sig"]   = pts(q(f'node["highway"="traffic_signals"]({FOR});'))
res["park"]  = pts(q(f'nwr["amenity"="parking"]["access"!~"private|no"]({FOR});'), name=True)
res["fuel"]  = pts(q(f'nwr["amenity"="fuel"]({CE});'), name=True)
res["pharm"] = pts(q(f'nwr["amenity"="pharmacy"]({FOR});'), name=True)
for k, v in res.items():
    if isinstance(v, list): print(k, len(v))
json.dump(res, open("data/osm-ce.json", "w"), separators=(",", ":"), ensure_ascii=False)
