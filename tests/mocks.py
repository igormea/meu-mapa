"""Servidores falsos (OSRM, Valhalla, Photon, Nominatim, tiles) para testar o app offline."""
import json, math, urllib.parse, re

def hav(a, b):
    R = 6371000; r = math.pi / 180
    dlat = (b[0]-a[0])*r; dlon = (b[1]-a[1])*r
    x = math.sin(dlat/2)**2 + math.cos(a[0]*r)*math.cos(b[0]*r)*math.sin(dlon/2)**2
    return 2*R*math.atan2(math.sqrt(x), math.sqrt(1-x))

def densify(pts, step=15):
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        n = max(1, int(hav(a, b)/step))
        for i in range(1, n+1):
            t = i/n; out.append((a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t))
    return out

def enc6(pts):
    res, plat, plon = [], 0, 0
    def e(v):
        v = ~(v << 1) if v < 0 else (v << 1); s = ''
        while v >= 0x20: s += chr((0x20 | (v & 0x1f)) + 63); v >>= 5
        return s + chr(v + 63)
    for la, lo in pts:
        a, b = int(round(la*1e6)), int(round(lo*1e6))
        res.append(e(a-plat) + e(b-plon)); plat, plon = a, b
    return ''.join(res)

def leg(o, d, north_first=False):
    corner = (d[0], o[1]) if north_first else (o[0], d[1])
    pts = densify([o, corner, d])
    # sentido da curva no canto
    b1 = math.atan2(corner[1]-o[1], corner[0]-o[0]); b2 = math.atan2(d[1]-corner[1], d[0]-corner[0])
    cross = math.sin(b2-b1); mod = 'left' if cross > 0 else 'right'
    d1, d2 = hav(o, corner), hav(corner, d)
    steps = [
      {"maneuver": {"type": "depart", "location": [o[1], o[0]]}, "name": "Rua Teste Inicial", "distance": d1, "duration": d1/10,
       "intersections": [{"location": [o[1], o[0]]}]},
      {"maneuver": {"type": "turn", "modifier": mod, "location": [corner[1], corner[0]]}, "name": "Avenida Teste", "distance": d2, "duration": d2/12,
       "intersections": [{"location": [corner[1], corner[0]], "lanes": [
           {"indications": ["left"], "valid": mod == 'left'}, {"indications": ["straight"], "valid": False},
           {"indications": ["straight", "right"], "valid": mod == 'right'}]}]},
      {"maneuver": {"type": "arrive", "location": [d[1], d[0]]}, "name": "Avenida Teste", "distance": 0, "duration": 0,
       "intersections": [{"location": [d[1], d[0]]}]},
    ]
    return pts, steps, d1+d2

def osrm(url):
    m = re.search(r'/driving/([^?]+)', url)
    coords = [tuple(map(float, c.split(','))) for c in m.group(1).split(';')]
    wps = [(c[1], c[0]) for c in coords]
    alts = 'alternatives=true' in url
    routes = []
    for k, nf in enumerate([False, True] if alts else [False]):
        allpts, legs, tot = [], [], 0
        for a, b in zip(wps, wps[1:]):
            pts, steps, dist = leg(a, b, nf)
            allpts += pts if not allpts else pts[1:]
            legs.append({"steps": steps, "distance": dist, "duration": dist/11}); tot += dist
        routes.append({"geometry": {"type": "LineString", "coordinates": [[p[1], p[0]] for p in allpts]},
                       "legs": legs, "distance": tot, "duration": tot/11 * (1.15 if k else 1)})
    return {"code": "Ok", "routes": routes}

def valhalla(body):
    shp = [(p["lat"], p["lon"]) for p in json.loads(body)["shape"]]
    n = len(shp); h = n//2
    return {"shape": enc6(shp), "edges": [
        {"speed_limit": 60, "begin_shape_index": 0, "end_shape_index": h},
        {"speed_limit": 40, "begin_shape_index": h, "end_shape_index": n-1}]}

def photon(url):
    q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    lat, lon = float(q.get('lat', ['-3.73'])[0]), float(q.get('lon', ['-38.52'])[0])
    feats = []
    for i, (dl, nm) in enumerate([(0.06, 'Rua Um Longe'), (0.004, 'Rua Um'), (0.02, 'Rua Um Média')]):
        feats.append({"geometry": {"coordinates": [lon+dl, lat+dl/2]},
                      "properties": {"name": nm, "city": "Fortaleza", "state": "Ceará", "countrycode": "BR"}})
    return {"features": feats}
