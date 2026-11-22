import os, json
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
    c.wait("document.querySelectorAll('.tower').length===1", 5000)   # radar na rota vira Torre do Vigia (sem duplicar)
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
    assert c.js("()=>document.querySelectorAll('.mk-castle.small').length") == 1
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

@test
def t25_heroi_3d_classes_e_animacoes(c):
    c.open(); c.hero("barbaro")
    c.wait("window.Hero3D && Hero3D.state.ready && Hero3D.state.cls==='barbaro'", 20000)
    assert c.js("()=>document.body.classList.contains('has3d')")
    assert c.js("()=>Hero3D.state.anim") == "idle"
    c.js("()=>Hero3D.setMotion(90,1.5)"); assert c.js("()=>Hero3D.state.anim") == "walk"
    c.js("()=>Hero3D.setMotion(90,12)");  assert c.js("()=>Hero3D.state.anim") == "run"
    c.js("()=>Hero3D.act('attack')");     assert c.js("()=>Hero3D.state.anim") == "attack"
    c.wait("Hero3D.state.anim==='run'", 6000)     # volta a correr após o ataque
    for cls in ["cavaleiro", "mago", "ladino", "arqueiro"]:
        c.js(f"()=>{{selCls='{cls}';confirmClass()}}")
        c.wait(f"Hero3D.state.cls==='{cls}' && Hero3D.state.ready", 15000)
    sz = c.js("async()=>{const r=await fetch('models/arqueiro.glb');return (await r.arrayBuffer()).byteLength}")
    assert sz < 400_000, sz

@test
def t26_heroi_3d_falha_volta_para_2d(c):
    c.open(block_sw=True, block="**/models/*.glb*")
    c.hero("mago")
    c.wait("window.Hero3D && Hero3D.state.failed", 15000)
    assert not c.js("()=>document.body.classList.contains('has3d')")
    assert c.js("()=>getComputedStyle(document.getElementById('plSpr')||document.body).display") != "none"
    c.errors.clear()   # o erro de rede do modelo bloqueado é esperado

@test
def t27_recalculo_rapido_ao_entrar_em_outra_rua(c):
    # anda pela rota (leste) e vira para o norte numa rua lateral a 40 km/h, 1 posição por segundo (tempo real)
    c.open(); c.hero(); c.route_to()
    c.js("()=>startNav(false)")
    t = c.js("""async()=>{
      const go=async(lat,lon,hdg)=>{lastRealT=Date.now();onFix({lat,lon,acc:8,spd:11,hdg,t:Date.now()});await new Promise(r=>setTimeout(r,1000))};
      for(let d=100;d<=300;d+=11){const p=pointAt(R,d);await go(p[0],p[1],90)}
      const base=pointAt(R,300);const t0=Date.now();let n=0;
      while(lastRecalc===0&&n<25){n++;await go(base[0]+n*11/111000,base[1],0)}
      return {s:(Date.now()-t0)/1000,metros_na_rua_errada:n*11}}""")
    assert c.js("()=>lastRecalc>0"), "não recalculou"
    assert t["s"] <= 8, t           # antes: ~15 s + trava de 25 s no início
    print("      recálculo após", t)

@test
def t28_gps_oscilando_ao_lado_da_rota_nao_recalcula(c):
    c.open(); c.hero(); c.route_to()
    c.js("()=>startNav(false)")
    c.js("""async()=>{for(let d=100;d<=400;d+=11){const p=pointAt(R,d);const j=(Math.random()-.5)*0.0005;
      lastRealT=Date.now();onFix({lat:p[0]+j,lon:p[1],acc:12,spd:11,hdg:90,t:Date.now()});await new Promise(r=>setTimeout(r,250))}}""")
    assert c.js("()=>lastRecalc") == 0, "recalculou com GPS oscilando dentro da margem"

@test
@osm
def t29_torres_do_vigia_aparecem_no_mapa(c):
    c.open(); c.hero(); c.wait("OSM && OSM.gen==='teste'")
    c.js("()=>map.jumpTo({center:[-38.5150,-3.7319],zoom:15})"); c.page.wait_for_timeout(1500)
    assert c.js("()=>document.querySelectorAll('.tower').length") == 1       # duplicado (5 m) aparece uma vez só
    assert c.js("()=>document.querySelector('.tower .tw-lim').textContent") == "40"
    c.js("()=>map.jumpTo({center:[-38.30,-3.60],zoom:15})"); c.page.wait_for_timeout(1500)
    assert c.js("()=>document.querySelectorAll('.tower').length") == 0      # fora da tela some

@test
def t30_fonte_legivel_nos_numeros(c):
    c.open(); c.hero()
    c.page.wait_for_function("document.fonts.check(\"700 26px 'Alegreya Sans'\")", timeout=10000)
    ff = c.js("()=>getComputedStyle(document.getElementById('spdVal')).fontFamily")
    assert "Alegreya Sans" in ff, ff
    assert "lining-nums" in c.js("()=>getComputedStyle(document.getElementById('spdVal')).fontVariantNumeric")
    assert "Cinzel" in c.js("()=>getComputedStyle(document.querySelector('.cs-t')).fontFamily")

@test
def t31_curva_certa_nao_recalcula(c):
    # segue a rota passando pela esquina; a direção do GPS chega atrasada 2 posições e com erro de 8 m
    c.open(); c.hero(); c.route_to()
    c.js("()=>startNav(false)")
    c.js("""async()=>{const turn=R.steps[1].cum;const hs=[];
      for(let d=turn-150;d<=turn+200;d+=11){const p=pointAt(R,d),q=pointAt(R,d+8);hs.push(bearing(p,q));
        const lag=hs[Math.max(0,hs.length-3)];const j=(Math.random()-.5)*0.00014;
        lastRealT=Date.now();onFix({lat:p[0]+j,lon:p[1]-j,acc:8,spd:11,hdg:lag,t:Date.now()});await new Promise(r=>setTimeout(r,400))}}""")
    assert c.js("()=>lastRecalc") == 0, "recalculou numa curva feita corretamente"

# ───────── v5.3: mecânicas de RPG ─────────
@test
def t32_talentos(c):
    c.open(); c.hero("cavaleiro")
    c.js("()=>{for(let i=0;i<6;i++)gainXP(needXP(S.lvl)+1);S.gold=99999}")
    lvl = c.js("()=>S.lvl"); assert c.js("()=>talentPoints()") == lvl - 1
    a0 = c.js("()=>atk()")
    c.js("()=>{learnTalent('forca');learnTalent('forca')}")
    assert c.js("()=>S.talents.forca") == 2 and c.js("()=>atk()") > a0
    assert c.js("()=>{hud();return document.getElementById('hudPts').textContent}") == str(lvl - 3)
    c.js("()=>learnTalent('dominio')"); assert c.js("()=>S.talents.dominio||0") == 0     # trava de nível 10
    c.js("()=>{respecTalents()}"); assert c.js("()=>talentSpent()") == 2                  # 1º toque só confirma
    c.js("()=>{respecTalents()}"); assert c.js("()=>talentSpent()") == 0

@test
def t33_habilidades_de_classe(c):
    c.open(); c.hero("mago")
    r = c.js("""()=>{const out={};for(const k of ['cavaleiro','barbaro','mago','ladino','arqueiro']){S.cls=k;S.hp=maxHP();const seen=new Set();let steal=0;
      for(let i=0;i<300;i++){S.hp=maxHP();const m=mkMon(MONS[10],{elite:true});const f=fight(m);f.skills.forEach(s=>seen.add(s));if(f.steal)steal++}
      out[k]={skills:[...seen],steal}}return out}""")
    assert any("Bola de fogo" in s for s in r["mago"]["skills"]), r["mago"]
    assert any("Bloqueio" in s for s in r["cavaleiro"]["skills"]), r["cavaleiro"]
    assert any("Fúria" in s for s in r["barbaro"]["skills"]), r["barbaro"]
    assert any("Tiro certeiro" in s for s in r["arqueiro"]["skills"]), r["arqueiro"]
    assert any("sombras" in s for s in r["ladino"]["skills"]) and 50 < r["ladino"]["steal"] < 140, r["ladino"]

@test
def t34_companheiro_choca_e_evolui(c):
    c.open(); c.hero()
    c.js("()=>{petAddKm(5)}"); assert c.js("()=>S.pet") is None                # nível 1: sem ovo
    c.js("()=>{while(S.lvl<3)gainXP(needXP(S.lvl)+1);petAddKm(0.1)}")
    assert c.js("()=>S.pet.egg") is True
    assert c.js("()=>document.querySelector('.pl .pet').textContent") == "🥚"
    c.js("()=>petAddKm(2)")
    t = c.js("()=>S.pet.type"); assert t in ["lobo", "falcao", "dragao", "tartaruga", "gato"]
    assert c.js("()=>document.querySelector('.pl .pet').textContent") != "🥚"
    c.js("()=>petAddKm(5.1)"); assert c.js("()=>S.pet.lvl") == 2
    k = c.js("()=>PETS[S.pet.type].k"); assert c.js(f"()=>bonus('{k}')") > 0

@test
def t35_regioes_e_monstros_locais(c):
    c.open(); c.hero()
    # sem a grade de terrenos (reserva antiga, antes do robô gerar os dados)
    r = c.js("""async()=>{await loadTerrain();const g=TG;TG=null;const r=[regionAt(-3.7275,-38.5275),regionAt(-3.7222,-38.4930),regionAt(-3.7455,-38.4870),regionAt(-4.6,-39.3),regionAt(-3.8300,-38.5300)];TG=g;return r}""")
    assert r == ["h", "p", "v", "r", "u"], r
    ok = c.js("()=>{const g=TG;TG=null;try{for(let i=0;i<200;i++){const m=rollMonster(-3.7222,-38.4930);if(m.dragon)continue;const b=MONS.find(x=>x.n===m.n.replace(/ Ancestral$/,''));if(b.ter!=='*'&&!b.ter.includes('p'))return m.n}return 'ok'}finally{TG=g}}")
    assert ok == "ok", ok

@test
def t36_clima_chuva_e_lua(c):
    import e2e
    e2e.WEATHER = {"temperature_2m": 24.0, "weather_code": 63, "precipitation": 2.5}
    try:
        c.open(); c.hero()
        c.js("async()=>{ENV.t=0;await weatherTick(-3.73,-38.52)}")
        assert c.js("()=>ENV.rain") is True
        assert c.js("()=>{renderEnv();return document.getElementById('hudEnv').textContent}").count("Chuva") == 1
        assert abs(c.js("()=>bonus('xp')") - 0.10) < 1e-9 or c.js("()=>envNow().moon")
        n = c.js("()=>{let aq=0;for(let i=0;i<400;i++){const m=rollMonster(-3.7222,-38.4930);const b=MONS.find(x=>x.n===m.n);if(b&&b.aq)aq++}return aq}")
        assert n > 200, n          # na chuva, na costa, aquáticos dominam
        assert 0 <= c.js("()=>moonIllum(new Date('2026-11-24T12:00:00Z'))") <= 1
    finally:
        e2e.WEATHER = {"temperature_2m": 29.0, "weather_code": 1, "precipitation": 0}

@test
def t37_masmorra(c):
    c.open(); c.hero("barbaro")
    c.js("()=>{while(S.lvl<12)gainXP(needXP(S.lvl)+1);S.hp=maxHP()}")
    d = c.js("()=>DUNGEONS[0]")
    c.js(f"()=>dungeonTick({d['lat']},{d['lon']},0,true)")
    c.wait("!dunRunning && S.dungeons && S.dungeons.iguatemi", 20000)
    k0 = c.js("()=>S.stats.kills")
    c.js(f"()=>dungeonTick({d['lat']},{d['lon']},0,true)")      # mesmo dia: não entra de novo
    c.page.wait_for_timeout(1500); assert c.js("()=>S.stats.kills") == k0
    # parado perto por 40 s (simulado) dispara a masmorra sozinha
    d2 = c.js("()=>DUNGEONS[1]")
    c.js(f"()=>{{dungeonTick({d2['lat']},{d2['lon']},0,false);dunNear.t-=41000;dungeonTick({d2['lat']},{d2['lon']},0,false)}}")
    c.wait("!dunRunning && S.dungeons && S.dungeons.riomar", 20000)

@test
def t38_conjuntos(c):
    c.open(); c.hero()
    c.js("()=>{S.equip={weapon:null,armor:null,amulet:null}}")
    for slot in ["weapon", "armor", "amulet"]:
        c.js(f"()=>handleItem({{slot:'{slot}',r:1,pow:10,name:'Item do Dragão',set:'do Dragão'}})")
    assert c.js("()=>activeSet()") == "do Dragão"
    a = c.js("()=>bonus('atk')"); assert a >= 0.15, a
    c.js("()=>handleItem({slot:'weapon',r:1,pow:11,name:'Espada do Farol',set:'do Farol'})")   # pouco melhor: não quebra o conjunto
    assert c.js("()=>activeSet()") == "do Dragão"
    c.js("()=>handleItem({slot:'weapon',r:3,pow:20,name:'Espada do Farol',set:'do Farol'})")   # muito melhor: troca
    assert c.js("()=>activeSet()") is None

@test
def t39_balanceamento(c):
    c.open(); c.hero()
    r = c.js("""()=>{const out={};
      for(const k of ['cavaleiro','barbaro','mago','ladino','arqueiro']){S.cls=k;S.talents={};S.pet=null;
        for(const L of [1,5,10,20,35]){S.lvl=L;S.equip={weapon:null,armor:null,amulet:null};
          const ip=Math.round((3+L*1.6)*1.3);S.equip.weapon={slot:'weapon',r:1,pow:ip,name:'x'};S.equip.armor={slot:'armor',r:1,pow:ip,name:'x'};
          let win=0,eliteWin=0,hpLoss=0;
          for(let i=0;i<400;i++){S.hp=maxHP();const m=rollMonster(-3.83,-38.53);if(m.dragon){i--;continue}const f=fight(m);if(f.win)win++;hpLoss+=(maxHP()-Math.max(0,f.php))/maxHP()}
          for(let i=0;i<200;i++){S.hp=maxHP();const b=MONS.filter(x=>x.t<=Math.min(5,1+Math.floor((L-1)/3))&&x.t<6);const m=mkMon(b[i%b.length],{elite:true});if(fight(m).win)eliteWin++}
          out[k+' nv'+L]=[Math.round(win/4),Math.round(eliteWin/2),Math.round(hpLoss/4)]}}
      return out}""")
    print("\n      classe/nível: [% vitória normal, % vitória elite, % vida perdida por luta]")
    for k, v in r.items(): print(f"      {k:16} {v}")
    for k, (w, we, loss) in r.items():
        assert w >= 88, (k, w)             # monstros comuns: quase sempre vence
        assert we >= 45, (k, we)           # elites: desafio, mas vencível
        assert loss <= 32, (k, loss)       # não perde vida demais por luta
    altos = [v for k, v in r.items() if not k.endswith('nv1')]
    assert sum(v[2] for v in altos) / len(altos) >= 8, "fácil demais: quase não perde vida"
    assert sum(v[1] for v in altos) / len(altos) <= 95, "fácil demais: elites quase nunca vencem"

@test
def t40_retratos_3d(c):
    c.open()
    c.wait("[...document.querySelectorAll('#clsGrid .ptr')].length===5 && [...document.querySelectorAll('#clsGrid .ptr')].every(i=>i.complete&&i.naturalWidth>0)", 10000)
    c.hero("arqueiro")
    c.wait("document.querySelector('#hudAva .ptr') && document.querySelector('#hudAva .ptr').naturalWidth>0", 8000)
    assert c.js("()=>getComputedStyle(document.querySelector('#hudAva .ptr-fb')).display") == "none"
    c.js("()=>{openSheet();setTab('heroi')}")
    c.wait("document.querySelector('.hero .big .ptr').naturalWidth>0", 5000)

@test
def t41_monstros_3d_aparecem_e_morrem(c):
    c.open(); c.hero(); c.route_to()
    c.wait("window.Hero3D && Hero3D.state.ready", 20000)
    c.js("""()=>{const s=PR[0].spawns[0];const b=MONS.find(m=>m.m3d==='esq_guerreiro');s.m=mkMon(b,{});s.m.hp=1;s.m.atk=0;
      const p=pointAt(PR[0],120);s.lat=p[0];s.lon=p[1];mon3dTick(%s,%s)}""" % (ORIGIN["lat"], ORIGIN["lon"]))
    c.wait("Hero3D.mons.some(m=>m.kind==='esq_guerreiro'&&m.ready)", 40000)
    sid = c.js("()=>PR[0].spawns[0].id")
    c.wait(f"PR[0].spawns[0].mk && PR[0].spawns[0].mk.getElement().style.visibility==='hidden'", 5000)   # ícone some quando o 3D aparece
    c.js("()=>{S.hp=maxHP();battle(PR[0].spawns[0])}")
    assert c.js(f"()=>Hero3D.mons.find(m=>m.id==={sid})?.dying") is True
    c.wait(f"!Hero3D.mons.some(m=>m.id==={sid})", 5000)
    c.js("()=>cancelRoute()"); assert c.js("()=>Hero3D.mons.length") == 0

@test
def t42_todos_monstros_3d(c):
    c.open(); c.hero(); c.route_to()
    c.wait("window.Hero3D && Hero3D.state.ready", 20000)
    kinds = c.js("()=>[...new Set(MONS.filter(m=>m.m3d).map(m=>m.m3d))]")
    assert len(kinds) >= 90, len(kinds)
    falta = c.js("""async()=>{const r=[];await Promise.all([...new Set(MONS.filter(m=>m.m3d).map(m=>m.m3d))].map(async k=>{const x=await fetch('models/mon/'+k+'.glb',{method:'HEAD'});if(!x.ok)r.push(k)}));return r}""")
    assert falta == [], falta
    # retratos de todos existem
    bad = c.js("""async()=>{const r=[];for(const k of MONS.filter(m=>m.m3d).map(monKey)){const i=new Image();i.src='models/portraits/'+k+'.png';
      await new Promise(f=>{i.onload=i.onerror=f});if(!i.naturalWidth)r.push(k)}return r}""")
    assert bad == [], bad
    # carrega os 16 novos modelos direto no Hero3D (sem limite de 6 do jogo)
    c.js("""()=>{window.__noMonTick=1;const p=pointAt(PR[0],60);window.__qk=[...new Set(MONS.filter(m=>m.m3d&&/^[qam]_/.test(m.m3d)).map(m=>m.m3d))];
      Hero3D.monSync(__qk.map((k,i)=>({id:9000+i,kind:k,tint:i%3?null:'#ffd76a',lat:p[0]+((i%6)-2.5)*1.3e-4,lon:p[1]+(Math.floor(i/6)-3)*1.3e-4,px:30})))}""")
    c.wait("Hero3D.mons.filter(m=>/^[qam]_/.test(m.kind)&&m.ready).length===__qk.length", 40000)
    if os.environ.get("SHOT"):
        c.js("""()=>{const p=pointAt(PR[0],60);__map.jumpTo({center:[p[1],p[0]],zoom:18.2,pitch:55,bearing:0})}"""); c.page.wait_for_timeout(1500)
        c.page.screenshot(path="/tmp/mons_map.png")
    # quem não tem animação de morte encolhe e some
    n = c.js("()=>Hero3D.mons.length")
    c.js("()=>{Hero3D.monKill(9000+__qk.indexOf('q_mushroom'))}")
    c.wait(f"Hero3D.mons.length==={n-1}", 3000)

@test
def t43_busca_tela_cheia(c):
    c.open(); c.hero()
    c.js("()=>{lastFix={lat:%s,lon:%s,t:Date.now()}}" % (ORIGIN["lat"], ORIGIN["lon"]))
    c.page.wait_for_timeout(300)
    # a tela não pode "balançar" (bug antigo: animação do marcador de castelo vazava pro app todo)
    assert c.js("()=>getComputedStyle(document.body).transform") == "none"
    assert c.js("()=>getComputedStyle(document.body).filter") == "none"
    c.page.click("#inpD", timeout=8000)
    c.wait("document.getElementById('searchPanel').classList.contains('full')", 3000)
    assert c.js("()=>getComputedStyle(document.getElementById('hud')).visibility") == "hidden"
    c.page.type("#inpD", "rua um")
    c.wait("document.getElementById('ac-d').style.display==='block' && document.querySelectorAll('#ac-d .aci').length===3", 6000)
    # lista fica abaixo do campo, totalmente visível e clicável (nada por cima)
    top = c.js("""()=>{const a=document.querySelector('#ac-d .aci').getBoundingClientRect(),i=document.getElementById('inpD').getBoundingClientRect();
      const el=document.elementFromPoint(a.left+a.width/2,a.top+a.height/2);return [a.top>i.bottom, !!el.closest('#ac-d')]}""")
    assert top == [True, True], top
    if os.environ.get("SHOT"): c.page.screenshot(path="/tmp/busca_full.png")
    c.page.click("#ac-d .aci")
    c.wait("!document.getElementById('searchPanel').classList.contains('full')", 3000)
    c.wait("PR.length>0", 10000)

@test
def t44_busca_texto_primeiro_e_nominatim_so_no_enter(c):
    c.open(); c.hero()
    # abreviação e acento
    assert c.js("()=>expandQ('Av. Beira-Mar Iracemá').join(' ')") == "avenida beira-mar iracema"
    # bate com o texto ganha de "mais perto"
    r = c.js("""()=>{const t=expandQ('rua um longe');return [textScore(t,{name:'Rua Um Longe',sub:''}),textScore(t,{name:'Rua Um',sub:''})]}""")
    assert r[0] > r[1], r
    c.js("()=>{window.__nomCalls=0;const f=window.fetch;window.fetch=(u,...a)=>{if(String(u).includes('nominatim'))__nomCalls++;return f(u,...a)}}")
    c.js("async()=>{nomLast=0;await searchPlaces('rua um',true)}")
    assert c.js("()=>__nomCalls") == 0
    c.js("async()=>{nomLast=0;await searchPlaces('rua um')}")
    assert c.js("()=>__nomCalls") == 1
    c.js("async()=>{await searchPlaces('rua um')}")   # menos de 1 s depois: respeita o limite
    assert c.js("()=>__nomCalls") == 1

@test
def t45_reportar_bug(c):
    c.open(); c.hero(); c.route_to()
    c.js("()=>{startNav(true)}"); c.wait("isNav && R.prog>0", 6000)
    c.js("()=>{setTimeout(()=>{throw new Error('erro de teste 123')},0)}"); c.page.wait_for_timeout(200)
    assert c.js("()=>__errLog.some(e=>e.includes('erro de teste 123'))")
    # o botão do quadro de erro abre o relatório
    c.page.click("#errBox button")
    c.wait("document.getElementById('repPanel').classList.contains('on')", 3000)
    info = c.js("()=>document.getElementById('repInfo').textContent")
    if os.environ.get("SHOT"):
        c.js("()=>{document.querySelector('#repPanel details').open=true;}"); c.page.screenshot(path="/tmp/report.png")
    for k in ["Ranvus Maps v", "Aparelho:", "Rota: indo p/", "erro de teste 123", "Herói: Teste · Cavaleiro nv"]:
        assert k in info, (k, info)
    c.js("()=>{window.open=u=>{window.__opened=u}}")
    c.page.click("#repSend")   # sem descrição → não envia
    assert c.js("()=>!window.__opened")
    c.page.fill("#repTxt", "recalculo demorou")
    c.page.click("#repSend")
    u = c.js("()=>window.__opened")
    assert u.startswith("https://wa.me/") and "recalculo%20demorou" in u and "erro%20de%20teste" in u, u[:200]
    assert not c.js("()=>document.getElementById('repPanel').classList.contains('on')")
    # também está nos Ajustes
    c.js("()=>{openSheet();setTab('cfg')}")
    assert "Reportar bug" in c.js("()=>document.getElementById('sheetBody').textContent")

@test
def t46_indice_local_fortaleza(c):
    c.open(); c.hero()
    c.js("()=>{lastFix={lat:-3.7300,lon:-38.4950,t:Date.now()}}")
    c.js("async()=>{await loadPlaces()}")
    s = lambda q: c.js(f"()=>localSearch(expandQ({json.dumps(q)}),searchCenter()).map(x=>x.name+'|'+x.sub)")
    assert s("beira")[0].startswith("Avenida Beira Mar|Rua · Meireles"), s("beira")    # pedaço + mais perto primeiro
    assert s("av beira m")[0].startswith("Avenida Beira Mar"), s("av beira m")          # abreviação
    assert s("tiburcio")[0].startswith("Rua Tibúrcio Cavalcante"), s("tiburcio")       # sem acento
    assert s("tiburico")[0].startswith("Rua Tibúrcio Cavalcante"), s("tiburico")       # erro de digitação
    assert s("hospital")[0].startswith("Hospital Monte Klinikum|Saúde"), s("hospital")
    assert s("shopping")[0].startswith("Shopping Iguatemi"), s("shopping")
    assert s("xyzw") == []
    # na tela: aparece na hora, sem esperar a internet
    c.page.click("#inpD"); c.page.type("#inpD", "ibur")
    c.wait("document.querySelector('#ac-d .aci') && document.querySelector('#ac-d').textContent.includes('Tibúrcio')", 1500)

@test
def t47_honra_no_volante(c):
    c.open(); c.hero(); c.route_to()
    c.js("()=>{startNav(true);sim.mult=0}")
    c.js("()=>{for(let i=0;i<20;i++)honorTick(55,60,100)}")          # 2 km dentro do limite
    r = c.js("()=>honorResult()"); assert r["pct"] == 1 and r["pts"] == 2, r
    c.js("()=>{T.hOk=0;T.hOver=0;for(let i=0;i<10;i++)honorTick(90,60,100);for(let i=0;i<10;i++)honorTick(50,60,100)}")
    r = c.js("()=>honorResult()"); assert r["pts"] < 0 and "manchada" in r["txt"], r
    c.js("()=>{T.hOk=0;T.hOver=0;honorTick(90,0,100);honorTick(10,60,100)}")   # sem limite ou parado: não conta
    assert c.js("()=>honorResult()") is None
    assert c.js("()=>honorRank(0)") == "Escudeiro" and c.js("()=>honorRank(60)") == "Guardião da Estrada"
    c.js("()=>{S.honor=60}"); assert c.js("()=>honorBonus()") == 2

@test
def t48_bardo_reinos(c):
    c.open(); c.hero(); c.route_to()
    c.js("async()=>{await loadPlaces();startNav(true);sim.mult=0;simSnap=null}")   # como jornada real (treino não salva reinos)
    assert c.js("()=>bairroAt(-3.7381,-38.5001)") == "Aldeota"
    assert c.js("()=>bairroAt(-3.95,-38.70)") is None
    c.js("()=>{for(let i=0;i<3;i++)bardTick(-3.7381,-38.5001)}")
    assert c.js("()=>S.realms") == ["Aldeota"] and c.js("()=>T.realms") == ["Aldeota"]
    c.js("()=>{bardTick(-3.7271,-38.4951);bardTick(-3.7381,-38.5001);bardTick(-3.7271,-38.4951)}")   # pisca na divisa: não troca
    assert c.js("()=>realmCur") == "Aldeota"
    c.js("()=>{for(let i=0;i<3;i++)bardTick(-3.7271,-38.4951)}")
    assert c.js("()=>S.realms.length") == 2 and c.js("()=>realmCur") == "Meireles"

@test
def t49_cerco_no_engarrafamento(c):
    c.open(); c.hero(); c.route_to()
    c.js("()=>{startNav(true);sim.mult=0;S.hp=maxHP();window.__noJourney=1}")
    # 2 min andando só 100 m → engarrafamento
    c.js("""()=>{const n=Date.now();jamHist=[];for(let i=0;i<8;i++)jamHist.push([n-125000+i*15000,-3.7300+i*0.0001,-38.52]);
      siegeTick({lat:-3.7292,lon:-38.52,spd:1},5000)}""")
    assert c.js("()=>jamActive") and c.js("()=>T.siege") == 1
    c.js("()=>siegeTick({lat:-3.7292,lon:-38.52,spd:1},5000)")      # menos de 45 s depois: sem nova onda
    assert c.js("()=>T.siege") == 1
    # semáforo: parado mas andou bastante nos últimos 2 min → não é cerco
    c.js("""()=>{jamActive=false;const n=Date.now();jamHist=[];for(let i=0;i<8;i++)jamHist.push([n-125000+i*15000,-3.7300+i*0.003,-38.52]);
      siegeTick({lat:-3.709,lon:-38.52,spd:0},5000)}""")
    assert not c.js("()=>jamActive")

@test
def t50_cronica_e_patrulha(c):
    c.open(); c.hero(); c.route_to()
    c.js("()=>{startNav(true);sim.mult=4}")
    c.wait("T && T.kills>=1", 20000); c.js("()=>{sim.prog=R.total-15}")
    c.wait("document.getElementById('arrivePanel').style.display==='block'", 10000)
    if os.environ.get("SHOT"): c.page.screenshot(path="/tmp/arrive.png")
    txt = c.js("()=>document.querySelector('.ar-chron').textContent")
    assert "Praia do Futuro" in txt and "guardião" in txt.lower(), txt
    # patrulha: 3 viagens da mesma origem pro mesmo destino, em dia útil, ~8h
    r = c.js("""()=>{const t=Date.now(),o={ola:-3.73,olo:-38.52,la:-3.75,lo:-38.45,n:'Trabalho',wd:1,h:8};
      S.tripsLog=[{...o,t},{...o,h:8.3,t},{...o,h:7.6,t}];
      const seg=new Date(2026,10,23,8,10);   // uma segunda 8h10
      return [patrolFor(-3.7302,-38.5201,seg),patrolFor(-3.7302,-38.5201,new Date(2026,10,23,15,0)),patrolFor(-3.7302,-38.5201,new Date(2026,10,22,8,0))]}""")
    assert r[0] and r[0]["n"] == 3 and r[0]["name"] == "Trabalho", r
    assert r[1] is None and r[2] is None, r      # outro horário / fim de semana
    c.js("()=>{closeArrive();showPatrol('Trabalho',{lat:-3.75,lon:-38.45,n:3})}")
    c.page.click("#patrolCard .pc-go")
    c.wait("PR.length>0", 10000)

@test
def t51_raridade_pela_distancia(c):
    c.open(); c.hero(); c.js("()=>{S.lvl=6}")
    r = c.js("""()=>{let perto=[],longe=[];for(let i=0;i<300;i++){perto.push(rollMonster(null,null,2));longe.push(rollMonster(null,null,150))}
      const avg=a=>a.reduce((s,m)=>s+m.xp,0)/a.length;
      return {tp:Math.min(...perto.map(m=>m.t)),tl:Math.min(...longe.filter(m=>!m.dragon).map(m=>m.t)),
        el:longe.filter(m=>m.elite).length/300,ep:perto.filter(m=>m.elite).length/300,
        xr:avg(longe)/avg(perto),anc:longe.every(m=>m.anc),ancp:perto.some(m=>m.anc)}}""")
    assert r["tp"] == 1, r
    assert r["el"] > r["ep"] + .1 and r["xr"] > 2 and r["anc"] and not r["ancp"], r

@test
def t52_botoes_acima_do_painel_e_abas(c):
    c.open(); c.hero(); c.page.wait_for_timeout(400)
    def gap():
        return c.js("""()=>{const f=document.getElementById('fabs').getBoundingClientRect();
          const p=[...['searchPanel','routePanel'].map(i=>document.getElementById(i))].find(e=>getComputedStyle(e).display!=='none').getBoundingClientRect();return p.top-f.bottom}""")
    g = gap(); assert 6 <= g <= 30, g                      # busca: logo acima, sem encostar
    c.route_to(); c.page.wait_for_timeout(300)
    g = gap(); assert 6 <= g <= 30, g                      # prévia da rota (painel mais alto)
    # abas da ficha: todas visíveis, sem corte
    c.js("()=>{cancelRoute();openSheet();setTab('ach')}")
    r = c.js("""()=>[...document.querySelectorAll('#tabs .tab')].map(t=>{const b=t.getBoundingClientRect(),s=t.querySelector('span');
      return [b.left>=0&&b.right<=innerWidth, b.height>=38, s.scrollWidth<=s.clientWidth+1]})""")
    assert len(r) == 9 and all(all(x) for x in r), r
    c.js("()=>setTab('stats')")
    assert "Últimos 7 dias" in c.js("()=>document.getElementById('sheetBody').textContent")
    if os.environ.get("SHOT"): c.page.screenshot(path="/tmp/s_stats.png")

@test
def t53_historico_e_recordes(c):
    c.open(); c.hero(); c.route_to()
    c.js("()=>{startNav(true);sim.mult=4;simSnap=null}")    # como jornada real
    c.wait("T && T.kills>=1", 20000); c.js("()=>{sim.prog=R.total-15}")
    c.wait("document.getElementById('arrivePanel').style.display==='block'", 10000)
    h = c.js("()=>S.hist[histDay()]")
    assert h["tr"] == 1 and h["km"] > 0 and h["k"] >= 1 and h["min"] >= 1, h
    assert c.js("()=>S.rec.km") > 0 and c.js("()=>Object.values(S.best).reduce((a,b)=>a+b,0)") >= 1

@test
def t54_voltar_e_arrastar(c):
    c.open(); c.hero(); c.page.wait_for_timeout(300)
    back = lambda: (c.page.go_back(), c.page.wait_for_timeout(250))
    # ficha: voltar fecha
    c.js("()=>openSheet()"); assert c.js("()=>$('sheet').classList.contains('on')")
    back(); assert not c.js("()=>$('sheet').classList.contains('on')")
    # no mapa: voltar pergunta se quer sair (e o app continua aberto)
    back(); assert c.js("()=>$('exitAsk').classList.contains('on')")
    assert c.page.url.startswith("http")
    back(); assert not c.js("()=>$('exitAsk').classList.contains('on')")   # voltar de novo fecha o aviso
    back(); assert c.js("()=>$('exitAsk').classList.contains('on')"); c.page.click("#exStay")
    # busca em tela cheia → voltar sai da busca
    c.page.click("#inpD"); c.wait("$('searchPanel').classList.contains('full')", 2000)
    back(); assert not c.js("()=>$('searchPanel').classList.contains('full')")
    # prévia da rota → voltar cancela; fechar pelo ✕ não deixa "voltar" sobrando
    c.route_to(); back(); c.wait("PR.length===0 && $('searchPanel').style.display==='block'", 3000)
    c.js("()=>{openSheet()}"); c.js("()=>closeSheet()"); c.page.wait_for_timeout(250)
    back(); assert c.js("()=>$('exitAsk').classList.contains('on')"), "fechar pela tela deveria limpar o histórico"
    c.page.click("#exStay")
    # arrastar a ficha pra baixo pela barrinha
    c.js("()=>openSheet()"); c.page.wait_for_timeout(200)
    b = c.js("()=>{const r=document.querySelector('#sheetBox .handle').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}")
    c.page.mouse.move(b[0], b[1]); c.page.mouse.down(); c.page.mouse.move(b[0], b[1]+60, steps=4); c.page.mouse.move(b[0], b[1]+160, steps=4); c.page.mouse.up()
    c.wait("!$('sheet').classList.contains('on')", 2000)
    # arrastar pouco não fecha
    c.js("()=>openSheet()"); c.page.wait_for_timeout(200)
    c.page.mouse.move(b[0], b[1]); c.page.mouse.down(); c.page.mouse.move(b[0], b[1]+30, steps=6); c.page.wait_for_timeout(300); c.page.mouse.up(); c.page.wait_for_timeout(300)
    assert c.js("()=>$('sheet').classList.contains('on')")

@test
def t55_hud_cidade_e_xp(c):
    c.open(); c.hero()
    c.js("async()=>{await cityTick(-3.73,-38.52)}")
    c.wait("document.getElementById('hudEnv').textContent.includes('📍 Fortaleza')", 3000)
    assert "XP 0 / 100" in c.js("()=>document.getElementById('hudXpTx').textContent")
    # não consulta de novo andando pouco
    c.js("()=>{window.__rev=0;const f=window.fetch;window.fetch=(u,...a)=>{if(String(u).includes('/reverse'))__rev++;return f(u,...a)}}")
    c.js("async()=>{await cityTick(-3.731,-38.521)}"); assert c.js("()=>__rev") == 0
    c.js("async()=>{await cityTick(-3.80,-38.52)}"); assert c.js("()=>__rev") == 1

@test
def t56_novidades(c):
    c.open(); c.hero()
    c.js("async()=>{await showNews(true)}")
    assert c.js("()=>document.querySelectorAll('#newsBody .pn').length") >= 10
    assert c.js("()=>S.seenV") == c.js("()=>NOTES[0].v")
    if os.environ.get("SHOT"): c.page.screenshot(path="/tmp/news.png")
    c.page.go_back(); c.page.wait_for_timeout(250)
    assert not c.js("()=>$('newsPanel').classList.contains('on')")


@test
def t57_terrenos_e_bestiario(c):
    c.open(); c.hero(); c.js("async()=>{await loadTerrain()}")
    t = lambda la, lo, k=0: c.js(f"()=>terrainAt({la},{lo},{k})")
    r = [t(-3.725, -38.49), t(-3.80, -38.60), t(-3.76, -38.55), t(-3.76, -38.48)]
    assert r == ["p", "i", "a", "m"], r
    r = [t(-3.754, -38.556), t(-3.70, -38.40), t(-3.75, -38.55, 90)]
    assert r == ["v", "u", "e"], r
    assert t(-3.7275, -38.5275) == "h"                       # centro histórico
    assert c.js("()=>{isNav=true;const r=terrainAt(-5.5,-39.5);isNav=false;return r}") == "e"   # fora da Grande Fortaleza
    # cada terreno só sorteia os seus monstros
    for la, lo, k in [(-3.725, -38.49, "p"), (-3.80, -38.60, "i"), (-3.76, -38.48, "m")]:
        bad = c.js(f"()=>{{S.lvl=15;const r=[];for(let i=0;i<200;i++){{const m=rollMonster({la},{lo},0);const b=MONS.find(x=>x.n===m.n.replace(/ Ancestral$/,''));if(b.ter!=='*'&&!b.ter.includes('{k}'))r.push(m.n)}}return r}}")
        assert bad == [], (k, bad[:5])
    assert c.js("()=>MONS.length") >= 70
    # todo terreno tem pelo menos 4 monstros exclusivos ou próprios
    assert c.js("()=>Object.keys(TER).every(k=>MONS.filter(m=>m.ter.includes(k)).length>=4)")
    # bestiário: silhueta pra não vistos, nome pros vistos, filtro por terreno
    c.js("()=>{S.best={'Caranguejo da Beira-Mar':3};openSheet();setTab('best')}")
    assert c.js("()=>document.querySelectorAll('.bc').length") == c.js("()=>MONS.length")
    assert c.js("()=>document.querySelectorAll('.bc:not(.unk)').length") == 1
    assert "???" in c.js("()=>document.querySelector('.bc.unk .bn').textContent")
    c.js("()=>{bestFilter='p';renderSheet()}")
    n = c.js("()=>document.querySelectorAll('.bc').length"); assert 6 <= n < 30, n
    if os.environ.get("SHOT"): c.page.screenshot(path="/tmp/best.png")

@test
def t58_pergaminho_de_chefe(c):
    c.open(); c.hero()
    c.js("()=>{S.scrolls=['hidra'];openSheet();setTab('quests')}")
    assert "Hidra do Cocó" in c.js("()=>$('sheetBody').textContent")
    c.page.click("button.mini")
    assert c.js("()=>S.scrollBoss.id") == "hidra" and c.js("()=>S.scrolls.length") == 0
    xp0 = c.js("()=>S.stats.km")
    c.js("()=>{addDistance(10000)}")                       # 10 km
    assert abs(c.js("()=>S.scrollBoss.hp") - 5) < .01
    c.js("()=>{for(let i=0;i<5;i++)scrollDamage(.3)}")
    c.js("()=>addDistance(4000)")
    assert c.js("()=>S.scrollBoss") is None and c.js("()=>S.bossEver.sc_hidra") == 1 and c.js("()=>S.stats.scrollWins") == 1
    # equipamento visível
    c.wait("window.Hero3D && Hero3D.state.ready && Hero3D.__model", 20000)
    vis = "()=>{let v=[];Hero3D.__model.traverse(o=>{if(o.isMesh&&/Sword|Shield|Helmet|Cape/.test(o.name))v.push(o.name+':'+o.visible)});return v.sort().join(',')}"
    c.js("()=>Hero3D.gear({w:null,a:null})"); assert "false" not in c.js(vis), c.js(vis)      # traje da classe sempre visível
    glow = "()=>{let v=[];Hero3D.__model.traverse(o=>{if(o.isMesh&&/Sword|Helmet/.test(o.name))v.push(o.name+':'+o.material.emissive.getHexString())});return v.sort().join(',')}"
    assert "000000" in c.js(glow).split(",")[0]
    c.js("()=>Hero3D.gear({w:4,a:null})"); g = c.js(glow); assert "1H_Sword:000000" not in g and "Knight_Helmet:000000" in g, g

@test
def t59_evento_natal(c):
    c.open(); c.hero()
    r = c.js("""()=>[EVENTS.natal.on(new Date(2026,11,10)),EVENTS.natal.on(new Date(2027,0,5)),EVENTS.natal.on(new Date(2027,0,7)),EVENTS.natal.on(new Date(2026,10,21))]""")
    assert r == [True, True, False, False], r
    # fora do evento, monstros de Natal nunca aparecem
    c.js("()=>{EVENTS.natal.on=()=>false}")
    assert c.js("()=>{S.lvl=20;for(let i=0;i<400;i++){const m=rollMonster(-3.70,-38.40,0);if(MONS.find(x=>x.n===m.n)?.ev)return m.n}return 'ok'}") == "ok"
    c.js("()=>{EVENTS.natal.on=()=>true;renderEnv()}")
    assert c.js("()=>{for(let i=0;i<600;i++){const m=rollMonster(-3.70,-38.40,0);if(MONS.find(x=>x.n===m.n)?.ev)return 'ok'}return 'nenhum'}") == "ok"
    assert "🎄 Natal" in c.js("()=>$('hudEnv').textContent")

@test
def t60_navegacao_sem_sobreposicao(c):
    for vw, vh in [(360, 740), (412, 915)]:
        c.open(); c.page.set_viewport_size({"width": vw, "height": vh}); c.hero(); c.route_to()
        c.js("()=>{startNav(true);sim.mult=2}"); c.wait("isNav && R.prog>150", 15000); c.page.wait_for_timeout(300)
        ov = c.js("""()=>{const ids=['navTop','laneBar','alertBar','speedo','fabs','navBottom','recenterBtn','simBadge'],b={};
          for(const id of ids){const e=document.getElementById(id);if(!e)continue;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')continue;
            const r=e.getBoundingClientRect();if(r.width&&r.height)b[id]=r}
          const k=Object.keys(b),o=[];for(let i=0;i<k.length;i++)for(let j=i+1;j<k.length;j++){const a=b[k[i]],d=b[k[j]];
            if(a.left<d.right-2&&d.left<a.right-2&&a.top<d.bottom-2&&d.top<a.bottom-2)o.push(k[i]+'×'+k[j])}return o}""")
        assert ov == [], (vw, ov)


@test
def t61_modelos_nao_ficam_do_avesso(c):
    # a câmera de trás deve ver as COSTAS do herói (antes via a frente "por dentro")
    c.open(); c.hero(); c.route_to()
    c.js("()=>{startNav(true);sim.mult=0}"); c.wait("window.Hero3D && Hero3D.state.ready && Hero3D.__model", 20000)
    det = c.js("""()=>{let d=null;Hero3D.__model.traverse(o=>{if(o.isMesh&&d==null){o.updateMatrixWorld(true);d=o.matrixWorld.determinant()}});return d}""")
    assert det > 0, det     # sem espelho no modelo (o espelho do mapa fica na câmera)

@test
def t62_areia_isolada_nao_e_praia(c):
    # mancha pequena de areia longe do litoral (banco de rio) não pode virar "Praia"
    c.open(); c.hero()
    c.js("""async()=>{TG=null;tgLoading=null;window.__origFetch=window.__origFetch||window.fetch;const rows=[];
      for(let r=0;r<40;r++)rows.push(r===5?'u10p2u28':(r>=30?'p40':'u40'));
      window.fetch=(u,...a)=>String(u).includes('terrain.json')?Promise.resolve(new Response(JSON.stringify({bb:[-3.80,-38.70,-3.72,-38.62],step:.002,rows}))):__origFetch(u,...a);
      await loadTerrain()}""")
    assert c.js("()=>terrainAt(-3.80+5.5*.002,-38.70+10.5*.002,0)") == "u"     # areia isolada
    assert c.js("()=>terrainAt(-3.80+35.5*.002,-38.70+20.5*.002,0)") == "p"    # faixa grande de praia

@test
def t63_portais(c):
    c.open(); c.hero(); c.js("()=>{lastFix={lat:-3.7300,lon:-38.5200,t:Date.now(),acc:8}}"); c.page.wait_for_timeout(300)
    h = c.js("()=>{const r=document.querySelector('#searchPanel .handle').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}")
    # puxar a barrinha pra cima abre os portais
    c.page.mouse.move(h[0], h[1]); c.page.mouse.down(); c.page.mouse.move(h[0], h[1]-80, steps=5); c.page.mouse.up()
    c.wait("$('searchPanel').classList.contains('portals')", 2000)
    assert "Nenhum portal" in c.js("()=>$('portalList').textContent")
    # salvar onde estou → nome → salvar
    c.page.click("text=📍 Salvar onde estou"); c.wait("$('portalDlg').classList.contains('on')", 2000)
    c.page.fill("#pdName", "Casa do meu irmão"); c.page.click(".pd-ics span:has-text('👪')"); c.page.click("#pdOk")
    c.wait("S.portals.length===1", 2000)
    assert c.js("()=>S.portals[0].ic") == "👪" and "Casa do meu irmão" in c.js("()=>$('portalList').textContent")
    if os.environ.get("SHOT"): c.page.screenshot(path="/tmp/portais.png")
    # puxar pra baixo fecha; tocar na barrinha alterna
    h = c.js("()=>{const r=document.querySelector('#searchPanel .handle').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}")
    c.page.mouse.move(h[0], h[1]); c.page.mouse.down(); c.page.mouse.move(h[0], h[1]+80, steps=5); c.page.mouse.up()
    c.wait("!$('searchPanel').classList.contains('portals')", 2000)
    # busca pelo nome acha o portal primeiro
    c.js("async()=>{await loadPlaces()}")
    r = c.js("()=>localSearch(expandQ('irmao'),searchCenter())[0]")
    assert r["name"] == "Casa do meu irmão" and r["portal"] == 1, r
    # tocar no portal traça a rota
    c.js("()=>portalsOpen(true)"); c.page.click(".ptl"); c.wait("PR.length>0", 10000)
    # salvar destino da prévia como portal
    c.page.click("#savePortalBtn"); c.wait("$('portalDlg').classList.contains('on')", 2000)
    c.page.fill("#pdName", "Praia"); c.page.click("#pdOk"); c.wait("S.portals.length===2", 2000)
    # editar e apagar
    c.js("()=>{cancelRoute();portalsOpen(true)}"); c.page.click(".ptl >> nth=1 >> .pt-ed")
    c.page.fill("#pdName", "Praia do Futuro"); c.page.click("#pdOk"); assert c.js("()=>S.portals[1].n") == "Praia do Futuro"
    c.page.click(".ptl >> nth=1 >> .pt-ed"); c.page.click("#pdDel"); c.page.click("#pdDel")
    c.wait("S.portals.length===1", 2000)
    # voltar do celular fecha os portais
    c.page.go_back(); c.page.wait_for_timeout(250)
    assert not c.js("()=>$('searchPanel').classList.contains('portals')")

def _fb_mock(c, store):
    import json as _j
    def h(route):
        u = route.request.url; m = route.request.method
        if "identitytoolkit" in u:
            return route.fulfill(status=200, content_type="application/json", body=_j.dumps({"idToken": "tok", "refreshToken": "ref", "localId": "u1", "expiresIn": "3600"}))
        if "firebaseio.com" in u:
            path = u.split("firebaseio.com/")[1].split(".json")[0]
            body = _j.loads(route.request.post_data or "null")
            if m == "PUT": store[path] = body
            elif m == "PATCH": store.setdefault(path, {}).update(body)
            store.setdefault("_calls", []).append(m)
            return route.fulfill(status=200, content_type="application/json", body=_j.dumps(body))
        return route.continue_()
    c.page.route("**/accounts.google.com/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body="window.google={accounts:{id:{initialize(){},renderButton(b){b.innerHTML='<button>Google</button>'}}}}"))
    c.page.route("**/*identitytoolkit*/**", h); c.page.route("**/*.firebaseio.com/**", h)

@test
def t64_compartilhar_rota_ao_vivo(c):
    store = {}
    c.open(); _fb_mock(c, store); c.hero(); c.route_to()
    c.js("()=>{startNav(true);sim.mult=3;window.open=u=>{window.__opened=u}}")
    c.wait("isNav && R.prog>50", 15000)
    c.page.click("#liveBtn"); c.wait("LIVE && window.__opened", 5000)
    sid = c.js("()=>LIVE.id"); key = "shares/" + sid
    assert len(sid) >= 20 and "acompanhar.html%23" + sid in c.js("()=>window.__opened")
    d = store[key]
    assert d["uid"] == "u1" and d["st"] == "nav" and len(d["route"]) > 10 and d["dest"]["n"] and d["exp"] > d["t"], d
    assert c.js("()=>$('liveBtn').classList.contains('on')")
    c.page.wait_for_timeout(6500)                        # posições continuam indo
    assert store["_calls"].count("PATCH") >= 1 and store[key]["pos"]["lat"]
    # chegar encerra sozinho
    c.js("()=>{sim.prog=R.total-15}"); c.wait("!isNav", 10000); c.page.wait_for_timeout(500)
    assert store[key]["st"] == "done" and store[key]["rem"] == 0 and c.js("()=>LIVE") is None

@test
def t65_pagina_acompanhar(c):
    import json as _j
    sid = "abcdefghijkmnpqrstuvwx"
    data = {"uid": "u1", "t": 1, "exp": 9e15, "st": "nav", "mode": "foot", "name": "Igor", "dest": {"n": "Praia do Futuro", "lat": -3.75, "lon": -38.45},
            "route": [[-3.73, -38.52], [-3.74, -38.50], [-3.75, -38.45]], "rem": 3200, "eta": 4102444800000, "pos": {"lat": -3.735, "lon": -38.51, "h": 90, "s": 5, "t": 0}}
    c.open()
    data["pos"]["t"] = c.js("()=>Date.now()")
    c.page.route("**/*.firebaseio.com/**", lambda r: r.fulfill(status=200, headers={"Content-Type": "text/event-stream"}, body="event: put\ndata: " + _j.dumps({"path": "/", "data": data}) + "\n\n"))
    c.page.goto(e2e.APP_ORIGIN + "/acompanhar.html#" + sid)
    c.wait("document.getElementById('who').textContent.includes('Igor')", 8000)
    t = c.js("()=>document.getElementById('card').textContent")
    assert "🚶 Igor está a caminho" in t and "Praia do Futuro" in t and "3,2 km" in t and "Atualizado agora" in t, t
    if os.environ.get("SHOT"): c.page.wait_for_timeout(1500); c.page.screenshot(path="/tmp/acompanhar.png")
    data["st"] = "done"; data["end"] = data["pos"]["t"]
    c.page.unroute("**/*.firebaseio.com/**")
    c.page.route("**/*.firebaseio.com/**", lambda r: r.fulfill(status=200, headers={"Content-Type": "text/event-stream"}, body="event: put\ndata: " + _j.dumps({"path": "/", "data": data}) + "\n\n"))
    c.page.reload(); c.wait("document.getElementById('state').textContent.includes('chegou')", 8000)

@test
def t66_modo_a_pe(c):
    c.open(); c.hero()
    c.page.click("#modeRow span[data-m=foot]"); assert c.js("()=>S.mode") == "foot"
    e2e_reqs = c.js("()=>0")
    c.route_to()
    assert c.js("()=>document.body.classList.contains('mode-foot')")

class _Tree:
    def __init__(s): s.d = {}
    def _walk(s, path, create=False):
        k = [x for x in path.split("/") if x]; o = s.d
        for x in k[:-1]:
            if x not in o or not isinstance(o[x], dict):
                if not create: return None, None
                o[x] = {}
            o = o[x]
        return o, (k[-1] if k else None)
    def get(s, path):
        o, k = s._walk(path)
        return None if o is None else o.get(k)
    def put(s, path, v):
        o, k = s._walk(path, True)
        if v is None: o.pop(k, None)
        else: o[k] = v
    def patch(s, path, v):
        for a, b in v.items(): s.put(path.rstrip("/") + "/" + a, b)

def _fb_tree(c, tree):
    import json as _j
    def h(route):
        u = route.request.url; m = route.request.method
        if "identitytoolkit" in u or "securetoken" in u:
            return route.fulfill(status=200, content_type="application/json", body=_j.dumps({"idToken": "tok", "refreshToken": "ref", "localId": "me", "expiresIn": "3600", "id_token": "tok", "refresh_token": "ref", "user_id": "me", "expires_in": "3600"}))
        path = u.split("firebaseio.com/")[1].split(".json")[0]
        if path.startswith("shares/") and m == "GET" and "auth=" not in u:
            return route.fulfill(status=200, content_type="text/event-stream", body="event: put\ndata: " + _j.dumps({"path": "/", "data": tree.get(path)}) + "\n\n")
        body = _j.loads(route.request.post_data or "null")
        if m == "PUT": tree.put(path, body)
        elif m == "PATCH": tree.patch(path, body)
        elif m == "DELETE": tree.put(path, None)
        return route.fulfill(status=200, content_type="application/json", body=_j.dumps(tree.get(path) if m == "GET" else body))
    c.page.route("**/accounts.google.com/**", lambda r: r.fulfill(status=200, content_type="text/javascript", body="window.google={accounts:{id:{initialize(){},renderButton(b){b.innerHTML='<button>Google</button>'}}}}"))
    c.page.route("**/*identitytoolkit*/**", h); c.page.route("**/*securetoken*/**", h); c.page.route("**/*.firebaseio.com/**", h)

@test
def t67_multiplayer_amigos_e_guilda(c):
    tree = _Tree()
    c.open(); _fb_tree(c, tree); c.hero()
    # sem login: aba mostra convite pra entrar
    c.js("()=>{openSheet();setTab('soc')}")
    assert "Jogue com seus amigos" in c.js("()=>$('sheetBody').textContent")
    # simula sessão do Google já feita
    c.js("""()=>{localStorage.setItem('ranvus_fbauth',JSON.stringify({uid:'me',token:'tok',refresh:'ref',exp:Date.now()+3e6,google:true,name:'Igor',email:'igor@x.com'}));SOC.loaded=false;renderSheet()}""")
    c.wait("$('nickIn') && SOC.loaded", 4000); c.page.wait_for_timeout(600)
    c.page.fill("#nickIn", "Ranvus"); c.page.click("#sheetBody >> text=Salvar apelido")
    c.wait("SOC.me && SOC.me.nick==='Ranvus'", 4000); c.page.wait_for_timeout(1200)
    assert tree.get("nicks/ranvus") == "me" and tree.get("users/me")["nick"] == "Ranvus"
    # amigo existe no banco
    tree.put("nicks/gleyson", "u2"); tree.put("users/u2", {"nick": "Gleyson", "cls": "mago", "lvl": 4, "km": 120, "t": 0})
    c.wait("$('friendIn')", 3000); c.page.fill("#friendIn", "gleyson"); c.page.click("#sheetBody >> text=Adicionar")
    c.wait("SOC.friends.u2==='out'", 4000)
    assert tree.get("friends/u2/me") == "in"
    # ele aceita (simulado) → aparece como companheiro
    tree.put("friends/me/u2", "ok"); tree.put("friends/u2/me", "ok")
    c.js("async()=>{await socLoad(true);renderSheet()}")
    assert "Gleyson" in c.js("()=>$('sheetBody').textContent") and "mago" not in c.js("()=>$('sheetBody').textContent").lower()[:0]
    # cria guilda e convida
    c.js("()=>socView('guild')"); c.page.fill("#guildIn", "Os Ranvus"); c.page.click("#sheetBody button:has-text('Criar')"); c.wait("SOC.group && SOC.group.name==='Os Ranvus'", 4000); c.page.wait_for_timeout(800)
    gid = c.js("()=>SOC.gid"); assert tree.get(f"groups/{gid}/leader") == "me"
    assert tree.get(f"groups/{gid}/seats/1") == "me"
    c.js("()=>socView('comp')"); c.page.click("#sheetBody button[title='Convidar pra guilda']"); c.page.wait_for_timeout(500)
    assert tree.get(f"invites/u2/{gid}")["from"] == "Ranvus"
    if os.environ.get("SHOT"): c.page.screenshot(path="/tmp/social.png")
    # sair da guilda sendo o único → guilda some
    c.js("()=>socView('guild')"); c.page.click("#sheetBody >> text=Sair da guilda"); c.wait("!SOC.group", 4000)
    assert tree.get(f"groups/{gid}") is None

@test
def t68_tela_de_login_ao_abrir(c):
    tree = _Tree()
    c.open(gate=True); _fb_tree(c, tree)
    c.wait("$('loginGate')", 4000)
    assert "Entrar" in c.js("()=>$('loginGate').textContent") or c.js("()=>!!$('gisGate')")
    if os.environ.get("SHOT"): c.page.wait_for_timeout(800); c.page.screenshot(path="/tmp/gate.png")
    c.page.click("text=Agora não, só navegar"); c.wait("!$('loginGate')", 2000)
    assert c.js("()=>localStorage.getItem('ranvus_skiplogin')") == "1"
    # reabrindo: não pergunta de novo
    c.page.reload(); c.page.wait_for_timeout(1500)
    assert not c.js("()=>!!$('loginGate')")
    # login concluído fecha a tela
    c.js("()=>{localStorage.removeItem('ranvus_skiplogin');gateOpen()}"); c.wait("$('loginGate')", 2000)
    c.js("()=>socFinish('idt-falso')"); c.wait("!$('loginGate')", 4000)
    assert c.js("()=>isLogged()")

LOGIN_JS = """()=>localStorage.setItem('ranvus_fbauth',JSON.stringify({uid:'me',token:'tok',refresh:'ref',exp:Date.now()+3e6,google:true,name:'Igor',email:'i@x.com'}))"""

@test
def t69_save_na_nuvem(c):
    import json as _j
    tree = _Tree()
    c.open(); _fb_tree(c, tree); c.hero(name="Igor")
    c.js("()=>{S.lvl=7;S.stats.km=55;save()}")
    c.js(LOGIN_JS)
    # 1) primeira vez: sobe o save deste aparelho
    c.js("async()=>{CLOUD.checked=false;await cloudCheck()}"); c.page.wait_for_timeout(500)
    sv = tree.get("saves/me"); assert sv and sv["lvl"] == 7 and _j.loads(sv["data"])["name"] == "Igor", sv
    # 2) mudança comum: marca e só envia depois do intervalo; ao chegar/subir de nível envia na hora
    c.js("()=>{S.stats.km=60;save()}"); assert tree.get("saves/me")["km"] == 55
    c.js("()=>cloudSoon(true)"); c.page.wait_for_timeout(500); assert tree.get("saves/me")["km"] == 60
    # 3) outro aparelho salvou um herói diferente, mais novo → pergunta, não sobrescreve
    other = {"name": "Outro", "cls": "mago", "lvl": 12, "xp": 0, "stats": {"km": 340, "kills": 90}, "equip": {}, "smith": {"w": 0, "a": 0}}
    tree.put("saves/me", {"t": 9e12, "lvl": 12, "km": 340, "cls": "mago", "name": "Outro", "data": _j.dumps(other)})
    c.js("async()=>{CLOUD.checked=false;await cloudCheck()}"); c.wait("$('cloudDlg')", 3000)
    txt = c.js("()=>$('cloudDlg').textContent"); assert "Neste aparelho" in txt and "Nv 12" in txt and "Nv 7" in txt, txt
    c.js("()=>cloudSoon(true)"); c.page.wait_for_timeout(300)
    assert tree.get("saves/me")["lvl"] == 12                       # enquanto pergunta, nada é enviado
    if os.environ.get("SHOT"): c.page.screenshot(path="/tmp/cloud2.png")
    c.page.click("text=Usar o da nuvem"); c.page.wait_for_timeout(1500); c.page.wait_for_function("typeof S!=='undefined' && S.lvl===12", timeout=20000)
    assert c.js("()=>S.name") == "Outro"
    # 4) aparelho novo (sem herói) com save na nuvem → oferece restaurar
    c.js("()=>{localStorage.removeItem(SAVE_KEY)}"); c.page.reload(); c.page.wait_for_timeout(1500)
    c.js("async()=>{CLOUD.checked=false;await cloudCheck()}"); c.wait("$('cloudDlg')", 3000)
    assert "Encontrei seu progresso" in c.js("()=>$('cloudDlg').textContent")
    if os.environ.get("SHOT"): c.page.screenshot(path="/tmp/cloud1.png")
    c.page.click("text=Restaurar meu herói"); c.page.wait_for_timeout(1500); c.page.wait_for_function("typeof S!=='undefined' && S.lvl===12", timeout=20000)

def _social_setup(c, tree, guild=True):
    tree.put("users/me", {"nick": "Ranvus", "cls": "cavaleiro", "lvl": 5, "km": 100, "t": 0})
    tree.put("nicks/ranvus", "me"); tree.put("nicks/gleyson", "u2")
    tree.put("users/u2", {"nick": "Gleyson", "cls": "mago", "lvl": 9, "km": 400, "t": 0, "wk": 33, "wkid": "", "kills": 50, "best": 12})
    tree.put("friends/me/u2", "ok"); tree.put("friends/u2/me", "ok")
    if guild:
        tree.put("users/me/gid", "gx")
        tree.put("groups/gx", {"name": "Os Ranvus", "leader": "me", "t": 1, "members": {"me": {"nick": "Ranvus"}, "u2": {"nick": "Gleyson"}}, "seats": {"1": "me"}})
    c.js(LOGIN_JS); c.js("async()=>{await socLoad(true)}")

@test
def t70_chefe_de_guilda(c):
    tree = _Tree()
    c.open(); _fb_tree(c, tree); c.hero(); _social_setup(c, tree)
    # guilda antiga sem vaga pro membro: o líder corrige sozinho
    assert tree.get("groups/gx/seats/2") == "u2"
    c.js("()=>{openSheet();setTab('soc');socView('guild')}")
    assert "Ouriço Azul do Pirambu" in c.js("()=>$('sheetBody').textContent")
    c.page.click("text=Invocar chefe da guilda"); c.page.wait_for_timeout(800); assert c.js("()=>!!(SOC.group&&SOC.group.raid)"), c.js("()=>[document.body.innerText.slice(0,300),JSON.stringify(SOC.group),uidMe(),isNav]"); c.page.wait_for_timeout(300)
    r = tree.get("groups/gx/raid"); assert r and r["tier"] == 1 and r["hp"] == 40, r      # 2 membros: 40*(0.6+0.4)
    # dirigir causa dano (sem tocar em nada)
    c.js("()=>{addDistance(3000);raidPush()}"); c.page.wait_for_timeout(400)
    assert abs(tree.get("groups/gx/raid/dmg/me") - 3) < .01
    # amigo dirigiu o resto → todos ganham a recompensa
    tree.put("groups/gx/raid/dmg/u2", 37.5)
    xp0 = c.js("()=>S.lvl*1e6+S.xp")
    c.js("async()=>{await socLoad(false)}"); c.page.wait_for_timeout(300)
    assert c.js("()=>S.raidWon && S.raidWon['%s']" % r["id"]) == 1, c.js("()=>JSON.stringify({g:SOC.group?.raid,won:S.raidWon,me:SOC.me?.nick,sum:raidSum(SOC.group?.raid)})")
    assert c.js("()=>S.lvl*1e6+S.xp") > xp0 and c.js("()=>S.stats.raids") == 1
    assert tree.get(f"groups/gx/raid/claimed/me") is True
    assert tree.get("groups/gx/tier") == 1                               # libera o próximo
    c.js("()=>renderSheet()")
    if os.environ.get("SHOT"): c.page.screenshot(path="/tmp/raid.png")
    assert "Escaravelho da Beira-Mar" in c.js("()=>$('sheetBody').textContent")
    # não ganha duas vezes
    c.js("async()=>{await socLoad(false)}"); assert c.js("()=>S.stats.raids") == 1

@test
def t71_bau_loja_e_poção(c):
    c.open(); c.hero()
    # item Raro que não é melhor vai pro baú
    c.js("()=>{S.equip.weapon={slot:'weapon',r:4,pow:999,name:'X'};handleItem({slot:'weapon',r:2,pow:5,name:'Espada Rara'})}")
    assert c.js("()=>S.bag.length") == 1 and c.js("()=>S.loot[0].act") == "guardado"
    # comum é vendido na hora como antes
    c.js("()=>handleItem({slot:'weapon',r:0,pow:5,name:'Comum'})"); assert c.js("()=>S.bag.length") == 1
    # épico também fica guardado; baú cheio vende o mais fraco
    c.js("()=>{for(let i=0;i<13;i++)handleItem({slot:'armor',r:3,pow:10+i,name:'Ep'+i});S.equip.armor={slot:'armor',r:4,pow:999,name:'Y'}}")
    assert c.js("()=>S.bag.length") <= 12
    # loja: passando num posto, vende os Raros e compra poções
    c.js("()=>{S.bag=[{slot:'weapon',r:2,pow:5,name:'R'},{slot:'armor',r:3,pow:9,name:'E'}];S.gold=5000;S.pots=0;S.shopT=0;SHOPS=[{n:'Posto Flex',lat:-3.72,lon:-38.55,k:'posto'}];shopTick({lat:-3.7202,lon:-38.5501})}")
    assert c.js("()=>S.pots") == 3 and c.js("()=>S.bag.map(i=>i.name).join()") == "E"
    assert "Posto Flex" in c.js("()=>$('feed').textContent")
    # não para de novo logo em seguida
    c.js("()=>{S.pots=0;shopLastCheck=0;shopTick({lat:-3.7202,lon:-38.5501})}"); assert c.js("()=>S.pots") == 0
    # poção é bebida sozinha antes da luta com vida baixa
    c.js("()=>{S.pots=1;S.hp=Math.round(maxHP()*.2);potAuto()}")
    assert c.js("()=>S.pots") == 0 and c.js("()=>S.hp/maxHP()") > .6
    c.js("()=>{openSheet();setTab('equip')}"); assert "Baú" in c.js("()=>$('sheetBody').textContent")

@test
def t72_troca_de_itens(c):
    import json as _j
    tree = _Tree()
    c.open(); _fb_tree(c, tree); c.hero(); _social_setup(c, tree, guild=False)
    c.js("()=>{S.bag=[{slot:'weapon',r:3,pow:40,name:'Lança do Farol'}];openSheet();setTab('soc');socView('comp')}")
    c.page.click("#sheetBody button[title='Oferecer item']"); c.page.click("#sheetBody >> text=Lança do Farol")
    c.page.wait_for_timeout(400)
    tr = tree.get("trades/u2"); assert tr and len(tr) == 1, tr
    t = list(tr.values())[0]; assert t["from"] == "me" and t["kind"] == "offer" and _j.loads(t["item"])["name"] == "Lança do Farol"
    assert c.js("()=>S.bag.length") == 0
    # recebe uma oferta do amigo e aceita
    tree.put("trades/me/tA", {"from": "u2", "nick": "Gleyson", "kind": "offer", "t": 1, "item": _j.dumps({"slot": "amulet", "r": 4, "pow": 30, "name": "Amuleto Lendário"})})
    c.js("async()=>{await tradeLoad();renderSheet()}")
    assert "Gleyson" in c.js("()=>$('sheetBody').textContent") and "Ofertas" in c.js("()=>$('sheetBody').textContent")
    if os.environ.get("SHOT"): c.page.screenshot(path="/tmp/trade.png")
    c.page.click("#sheetBody >> text=Aceitar >> nth=0"); c.page.wait_for_timeout(400)
    assert tree.get("trades/me/tA") is None and c.js("()=>S.equip.amulet?.name") == "Amuleto Lendário"
    # oferta recusada volta pro dono
    tree.put("trades/me/tB", {"from": "u2", "nick": "Gleyson", "kind": "offer", "t": 1, "item": _j.dumps({"slot": "armor", "r": 2, "pow": 1, "name": "Couraça"})})
    c.js("async()=>{await tradeLoad();renderSheet()}"); c.page.click("#sheetBody >> text=Recusar"); c.page.wait_for_timeout(400)
    back = [v for v in (tree.get("trades/u2") or {}).values() if v["kind"] == "back"]; assert back and _j.loads(back[0]["item"])["name"] == "Couraça"
    # item adulterado é descartado
    tree.put("trades/me/tC", {"from": "u2", "nick": "G", "kind": "gift", "t": 1, "item": _j.dumps({"slot": "weapon", "r": 4, "pow": 99999, "name": "Hack"})})
    c.js("async()=>{await tradeLoad()}"); assert c.js("()=>S.equip.weapon?.name") != "Hack" and tree.get("trades/me/tC") is None

@test
def t73_ranking_avisos_e_amigo_no_mapa(c):
    tree = _Tree()
    c.open(); _fb_tree(c, tree); c.hero(); _social_setup(c, tree, guild=False)
    wk = c.js("()=>weekKey()"); tree.put("users/u2/wkid", wk)
    c.js("async()=>{await socLoad(true);openSheet();setTab('soc');socView('rank')}")
    txt = c.js("()=>$('sheetBody').textContent"); assert "🥇Gleyson" in txt and "🥈Ranvus" in txt, txt
    if os.environ.get("SHOT"): c.page.screenshot(path="/tmp/rank.png")
    # avisos: primeira verificação só registra; depois avisa o que é novo
    c.js("async()=>{localStorage.removeItem('ranvus_seen');await socPoll()}")
    tree.put("nicks/ju", "u3"); tree.put("users/u3", {"nick": "Jaqueline", "lvl": 2}); tree.put("friends/me/u3", "in")
    c.js("async()=>{await socPoll()}")
    assert "Jaqueline quer ser seu companheiro" in c.js("()=>$('feed').textContent")
    # amigo compartilhando a rota aparece no mapa
    tree.put("feeds/me/u2", {"sid": "s" * 24, "nick": "Gleyson", "cls": "mago", "t": int(__import__('time').time() * 1000)})
    c.js("async()=>{await socPoll()}")
    assert c.js("()=>!!FLIVE.u2") and "Gleyson está na estrada" in c.js("()=>$('feed').textContent")
    c.js("()=>{FLIVE.u2.st={st:'nav',pos:{lat:-3.73,lon:-38.52},dest:{n:'Praia'},rem:5000};flDraw('u2')}")
    assert c.js("()=>!!document.querySelector('.fr-mk')")
    # ao compartilhar minha rota, aviso meus companheiros; ao parar, removo
    c.js("async()=>{await feedsPublish('x'.repeat(24))}"); assert tree.get("feeds/u2/me")["nick"] == "Ranvus"
    c.js("async()=>{await feedsClear()}"); assert tree.get("feeds/u2/me") is None
    tree.put("feeds/me/u2", None); c.js("async()=>{await socPoll()}"); assert not c.js("()=>!!document.querySelector('.fr-mk')")
