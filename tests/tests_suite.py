from __main__ import test, ORIGIN, DEST
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
    c.page.reload(); c.page.wait_for_function("window.map && map.loaded()", timeout=20000)
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
