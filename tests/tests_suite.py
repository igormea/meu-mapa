import e2e
from e2e import test, ORIGIN, DEST, READY
import time

@test
def t01_abre_sem_erros_e_pede_classe(c):
    c.open()
    assert c.js("()=>document.getElementById('classSel').classList.contains('on')"), "tela de classe não abriu"
    assert not c.js("()=>!!document.getElementById('errBox')"), "caixa de erro apareceu"

@test
def t02_escolhe_classe_atualiza_hud(c):
    c.open(); c.hero("mago", "Igor")
    assert c.js("()=>document.getElementById('hudSub').textContent") == "Nv 1 · Mago"
    assert c.js("()=>document.querySelector('#hudAva svg')!==null")

@test
def t03_busca_ordena_por_distancia(c):
    c.open(); c.hero()
    r = c.js("async()=>{lastFix={lat:%s,lon:%s,t:Date.now()};return (await searchPlaces('rua um')).map(x=>x.name)}" % (ORIGIN["lat"], ORIGIN["lon"]))
    assert r[0] == "Rua Um", r

@test
def t04_previa_da_rota(c):
    c.open(); c.hero(); c.route_to()
    n = c.js("()=>PR[selIdx].spawns.length"); assert n > 3, n
    assert c.js("()=>PR.length") == 2
    c.wait("PR[0].limits && PR[0].limits.length===2")
    assert "Missão" in c.js("()=>document.getElementById('questName').textContent")

@test
def t05_navegacao_simulada_e_chegada(c):
    c.open(); c.hero(); c.route_to()
    c.js("()=>{startNav(true);sim.mult=4}")
    c.wait("isNav && map.getPitch()>55", 8000)
    assert c.js("()=>document.body.classList.contains('nav')")
    c.wait("T && T.kills>=1", 20000)
    c.wait("document.getElementById('limitSign').classList.contains('on')", 10000)
    c.js("()=>{sim.prog=R.total-15}")
    c.wait("document.getElementById('arrivePanel').style.display==='block'", 8000)
    c.wait("map.getPitch()<5", 5000)
    # modo treino não salva
    assert c.js("()=>S.stats.trips") == 0

@test
def t06_progresso_salva_e_recarrega(c):
    c.open(); c.hero("barbaro", "Persist")
    c.js("()=>{gainXP(500);save()}")
    lvl = c.js("()=>S.lvl"); assert lvl >= 2
    c.page.reload(); c.page.wait_for_function(READY, timeout=20000)
    assert c.js("()=>S.lvl") == lvl and c.js("()=>S.name") == "Persist"
    assert not c.js("()=>document.getElementById('classSel').classList.contains('on')")

@test
def t07_desvio_recalcula_com_regras(c):
    c.open(); c.hero(); c.route_to()
    c.js("()=>startNav(false)")
    r = c.js("""async()=>{lastRecalc=0;const P=pointAt(R,300),res={};
      for(let i=0;i<12;i++)offRouteCheck({dist:100},{lat:P[0]+0.0009,lon:P[1],acc:15,spd:0});
      res.parado=offSince===0;
      offSince=Date.now()-9000;offStart=[P[0],P[1]];let b=lastRecalc;
      offRouteCheck({dist:120},{lat:P[0]+0.0012,lon:P[1],acc:10,spd:10,hdg:0});res.real=lastRecalc!==b;
      await new Promise(r=>setTimeout(r,1500));
      offSince=Date.now()-9000;offStart=[P[0],P[1]];b=lastRecalc;
      offRouteCheck({dist:120},{lat:P[0]+0.0015,lon:P[1],acc:10,spd:10,hdg:0});res.cool=lastRecalc===b;return res}""")
    assert r == {"parado": True, "real": True, "cool": True}, r

@test
def t08_sem_gps_estima_posicao(c):
    c.open(); c.hero(); c.route_to()
    c.js("()=>startNav(false)")
    c.js("""async()=>{for(const d of [100,115,130]){const p=pointAt(R,d);lastRealT=Date.now();lastRealSpd=15;
      onFix({lat:p[0],lon:p[1],acc:8,spd:15,hdg:0,t:Date.now()});await new Promise(r=>setTimeout(r,300))}}""")
    p0 = c.js("()=>R.prog")
    time.sleep(7)
    p1 = c.js("()=>R.prog")
    assert p1 - p0 > 30, (p0, p1)
    assert c.js("()=>document.getElementById('drBadge').style.display") == "block"

NATIVE_MOCK = """
window.__natCalls=[];
window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'android',
  registerPlugin:(name)=>new Proxy({},{get:(_,m)=>m==='then'?undefined:(...a)=>{window.__natCalls.push(name+'.'+String(m));
    if(name==='Geolocation'&&m==='checkPermissions')return Promise.resolve({location:'prompt',coarseLocation:'prompt'});
    if(name==='LocalNotifications'&&m==='checkPermissions')return Promise.resolve({display:'prompt'});
    if(name==='BackgroundGeolocation'&&m==='addWatcher')return Promise.resolve('w1');
    return Promise.resolve({})}})};
"""

@test
def t09_ambiente_do_app_android(c):
    c.browser_ctx_init = NATIVE_MOCK
    c.open(init_script=NATIVE_MOCK)
    assert c.js("()=>NATIVE") is True
    assert c.js("()=>document.getElementById('permSel').classList.contains('on')"), "tela de permissões não abriu"
    c.js("()=>askPerms()")
    c.wait("__natCalls.includes('Geolocation.requestPermissions')")
    c.js("()=>closePerms()"); c.hero(); c.route_to()
    c.js("()=>startNav(false)")
    c.wait("__natCalls.includes('BackgroundGeolocation.addWatcher') && __natCalls.includes('KeepAwake.keepAwake')")
    c.js("()=>{S.mute=false;speak('teste')}")
    assert "TextToSpeech.speak" in c.js("()=>__natCalls")
    c.js("()=>endNav(false)")
    c.wait("__natCalls.includes('BackgroundGeolocation.removeWatcher')")

# ───────── v5: dados OSM em cima da rota falsa (origem → leste → sul até o destino) ─────────
LAT0 = ORIGIN["lat"]
OSM_FIX = {"gen": "teste",
  "cam":  [[LAT0, -38.5150, 40], [LAT0+0.00005, -38.5149, 40]],   # 2º é duplicado
  "bump": [[LAT0, -38.5200]], "toll": [[LAT0, -38.5000]], "rail": [[LAT0, -38.4900]],
  "sig":  [[LAT0, -38.5100], [LAT0, -38.5050], [-3.70, -38.40]],   # último fora da rota
  "park": [[-3.7430, -38.4618, "Estac. Praia"], [-3.70, -38.50, "Longe"]],
  "fuel": [[LAT0-0.0002, -38.5080, "Posto Teste"]], "pharm": [[LAT0+0.0002, -38.5000, "Farmácia Teste"]]}
def osm(fn): fn.osm = OSM_FIX; return fn

@test
@osm
def t10_alertas_na_previa(c):
    c.open(); c.hero(); c.wait("OSM && OSM.gen==='teste'"); c.route_to()
    f = c.js("()=>PR[0].feats.map(x=>x.t)")
    assert f.count("cam") == 1, f            # duplicado removido
    for t in ("bump", "toll", "rail"): assert t in f, (t, f)
    assert f.count("sig") == 2, f            # o de fora da rota não entra
    txt = c.js("()=>document.getElementById('rewards').textContent")
    assert "1 radares" in txt and "1 lombadas" in txt and "1 pedágio" in txt, txt
    assert c.js("()=>document.querySelectorAll('.feat.f-cam').length") == 1
    assert c.js("()=>document.querySelectorAll('.feat.f-park').length") == 1   # só o perto do destino

@test
@osm
def t11_alertas_durante_a_viagem(c):
    c.open(); c.hero(); c.wait("OSM && OSM.gen==='teste'"); c.route_to()
    c.js("()=>{S.mute=false;window.__fala=[];speak=(t,k)=>__fala.push(t);startNav(true)}")
    c.wait("isNav && R.prog>0", 6000)
    cam = c.js("()=>R.feats.find(f=>f.t==='cam').cum")
    c.js(f"()=>{{sim.prog={cam}-250}}")
    c.wait("document.getElementById('alertBar').textContent.includes('Torre do Vigia')", 6000)
    c.js(f"()=>{{sim.prog={cam}+40}}")
    c.wait("R.feats.find(f=>f.t==='cam').passed===true", 6000)
    falas = c.js("()=>__fala")
    assert any("Radar à frente, limite 40" in x for x in falas), falas
    # 45 km/h num trecho de 40 → torre avistou (card de alerta)
    assert c.js("()=>[...document.querySelectorAll('#feed .card')].some(e=>e.textContent.includes('Torre do Vigia'))")
    # queda de limite (mock: 60 → 40 no meio da rota)
    mid = c.js("()=>R.limits[1].a")
    c.js(f"()=>{{sim.prog={mid}-200}}")
    c.wait("Object.keys(R.ann).some(k=>k.startsWith('lim'))", 6000)
    assert any("Limite reduz para 40" in x for x in c.js("()=>__fala"))

@test
def t12_faixas_perto_da_curva(c):
    c.open(); c.hero(); c.route_to()
    c.js("()=>startNav(true)")
    c.wait("isNav && R.prog>0", 6000)
    turn = c.js("()=>R.steps[1].cum")
    c.js(f"()=>{{sim.prog={turn}-300}}")
    c.wait("document.getElementById('laneBar').classList.contains('on')", 6000)
    assert c.js("()=>document.querySelectorAll('#laneBar .ln').length") == 3
    assert c.js("()=>document.querySelectorAll('#laneBar .ln.ok').length") == 1

@test
def t13_curva_detectada_pelo_desenho(c):
    c.open()
    r = c.js("""()=>{const pts=[];for(let i=0;i<=40;i++)pts.push([-3.73,-38.52+i*0.0002]);
      for(let i=1;i<=40;i++)pts.push([-3.73-i*0.0002,-38.52+40*0.0002]);
      const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+hav(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]));
      const Rt={coords:pts,cum,total:cum[cum.length-1],steps:[{cum:0},{cum:cum[cum.length-1]}]};
      const semManobra=curvesAlong(Rt).length;
      Rt.steps.push({cum:cum[40]});const comManobra=curvesAlong(Rt).length;return [semManobra,comManobra]}""")
    assert r == [1, 0], r

@test
@osm
def t14_parada_no_caminho(c):
    c.open(); c.hero(); c.wait("OSM && OSM.gen==='teste'"); c.route_to()
    c.js("()=>{startNav(true)}"); c.wait("isNav && R.prog>0", 6000)
    c.js("()=>{openStops();stopKind('fuel')}")
    c.wait("stops.length===1 && R.steps.some(s=>s.type==='arrive'&&s.last===false)", 8000)
    assert "via" not in c.js("()=>JSON.stringify(stops)")
    assert any(u.count(";") >= 2 and "/driving/" in u for u in e2e.REQS), e2e.REQS[-2:]
    assert c.js("()=>document.querySelectorAll('.castle.small').length") == 1
    s = c.js("()=>stops[0]"); c.js(f"()=>stopCheck({s['lat']},{s['lon']})")
    assert c.js("()=>stops.length") == 0

@test
def t15_casa_e_trabalho(c):
    c.open(); c.hero()
    assert "Definir casa" in c.js("()=>document.getElementById('favRow').textContent")
    c.js("()=>favTap('home')")
    assert c.js("()=>favPick") == "home"
    c.js("()=>favConsume({name:'Minha Casa, Fortaleza',lat:-3.75,lon:-38.53})")
    assert c.js("()=>S.fav.home.name") == "Minha Casa, Fortaleza"
    assert "🏠 Casa" in c.js("()=>document.getElementById('favRow').textContent")
    c.page.reload(); c.page.wait_for_function(READY)
    assert c.js("()=>S.fav.home.lat") == -3.75

@test
def t16_compartilhar_viagem(c):
    c.open(); c.hero(); c.route_to()
    c.js("()=>{startNav(true);window.__open=[];window.open=(u)=>__open.push(u);navigator.share=undefined}")
    c.wait("isNav && R.prog>0", 6000)
    c.js("()=>shareTrip()")
    u = c.js("()=>__open[0]")
    assert u and u.startswith("https://wa.me/?text=") and "Praia%20do%20Futuro" in u, u

@test
def t17_busca_por_voz(c):
    c.open(); c.hero()
    c.js("""()=>{window.SpeechRecognition=window.webkitSpeechRecognition=function(){const r=this;this.start=()=>setTimeout(()=>{r.onresult({results:[[{transcript:'rua um'}]]});r.onend&&r.onend()},50)};}""")
    c.js("()=>voiceSearch()")
    c.wait("document.getElementById('inpD').value==='rua um'")
    c.wait("document.getElementById('ac-d').style.display==='block'", 6000)

@test
def t18_backup_exporta_e_importa(c):
    c.open(); c.hero("ladino", "Backup"); c.js("()=>{gainXP(900);S.gold=777;save()}")
    code = c.js("async()=>{exportSave();return document.getElementById('bkText').value}")
    assert code.startswith("MMRPG1:")
    c.js("()=>{localStorage.removeItem(SAVE_KEY)}"); c.page.reload(); c.page.wait_for_function(READY)
    assert c.js("()=>S.cls") is None
    c.js("(code)=>{openSheet();setTab('cfg');document.getElementById('bkText').value=code;importSave();importSave()}", code)
    c.page.wait_for_function(READY+" && S.name==='Backup'", timeout=15000)
    assert c.js("()=>S.gold") == 777 and c.js("()=>S.cls") == "ladino"

@test
def t19_chefe_lendario_e_semanais(c):
    c.open(); c.hero(); c.js("()=>{for(let i=0;i<30;i++)gainXP(2000);S.hp=maxHP()}")
    c.js("()=>bossCheck(-3.7223,-38.5197)")
    r = c.js("()=>({won:S.bosses?.dragao===weekKey(),tried:!!bossTry.dragao,boss:S.week.boss})")
    assert r["tried"] and r["won"] and r["boss"] == 1, r
    assert c.js("()=>document.querySelectorAll('.boss.done').length") == 1
    c.js("()=>bossCheck(-3.7223,-38.5197)")   # mesma semana: não luta de novo
    assert c.js("()=>S.stats.bosses") == 1

@test
def t20_nevoa_de_exploracao(c):
    c.open(); c.hero()
    c.js("()=>map.jumpTo({center:[-38.5267,-3.7319],zoom:15})")
    c.page.wait_for_timeout(600)
    n0 = c.js("()=>{drawFog();return map.getSource('fog')._data.features.length}")
    s0 = c.js("()=>S.stats.cells||0")
    c.js("()=>{visitCell(-3.7350,-38.5267,10);visitCell(-3.7350,-38.5240,10);visitCell(-3.7350,-38.5240,10);drawFog()}")
    n1 = c.js("()=>map.getSource('fog')._data.features.length")
    assert n0 - n1 == 2, (n0, n1)
    assert c.js("()=>S.stats.cells") == s0 + 2
    c.js("()=>visitCell(-3.70,-38.40,120)")   # GPS ruim (120 m) não conta
    assert c.js("()=>S.stats.cells") == s0 + 2

@test
def t21_funciona_offline_depois_de_aberto(c):
    c.open(); c.hero(); c.page.wait_for_timeout(1500)
    c.page.reload(); c.page.wait_for_function(READY, timeout=20000)
    c.page.wait_for_function("!!navigator.serviceWorker.controller", timeout=15000)
    c.page.wait_for_timeout(1500)   # cache do app se completa
    c.ctx.set_offline(True)
    c.page.reload(); c.page.wait_for_function("typeof S==='object' && document.getElementById('hudName').textContent==='Teste'", timeout=15000)
    assert not c.js("()=>!!document.getElementById('errBox')")
    c.errors.clear()   # sem internet, pedidos externos falham: esperado
    c.ctx.set_offline(False)

@test
def t22_voz_menos_falante(c):
    c.open(); c.hero()
    c.js("()=>{window.__n=0;speechSynthesis.speak=()=>__n++;S.mute=false}")
    c.js("()=>{setVoice('less');speak('nível','fun');speak('vire','nav');speak('radar','alert')}")
    assert c.js("()=>__n") == 2
    c.js("()=>{setVoice('off');speak('x','alert')}")
    assert c.js("()=>__n") == 2
    c.js("()=>{toggleMute()}"); assert c.js("()=>!S.mute && !S.less")

@test
def t23_evitar_pedagio_e_moto(c):
    c.open(); c.hero(); c.js("()=>{S.avoidToll=true;S.vehicle='moto'}"); c.route_to()
    assert any("exclude=toll" in u for u in e2e.REQS), e2e.REQS
    d = c.js("()=>PR[0].duration"); km = c.js("()=>PR[0].total")
    assert abs(d - km/11*0.85) < 2, (d, km)

@test
def t24_ficha_abre_todas_as_abas(c):
    c.open(); c.hero()
    for t in ["heroi", "equip", "quests", "ach", "cfg"]:
        c.js(f"()=>{{openSheet();setTab('{t}')}}")
        assert len(c.js("()=>document.getElementById('sheetBody').innerHTML")) > 100, t
    assert "Chefes lendários" in c.js("()=>{setTab('quests');return document.getElementById('sheetBody').textContent}")
