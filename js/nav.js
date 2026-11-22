'use strict';
/* ── NAVEGAÇÃO ───────────────────────────────────────── */
let wake=null,offSince=0,recalcBusy=false,stopArm=0;
async function grabWake(){if(NATIVE){NAT.awake.keepAwake().catch(()=>{});return}try{wake=await navigator.wakeLock?.request('screen')}catch{}}
function releaseWake(){if(NATIVE){NAT.awake.allowSleep().catch(()=>{});return}try{wake?.release()}catch{}wake=null}
document.addEventListener('visibilitychange',()=>{if(isNav&&document.visibilityState==='visible')grabWake()});

function startNav(simulate){
  if(isNav||!PR.length)return;stopCountdown();startSensors();
  drProg=null;
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();actx.resume()}catch{}
  updSpeedo(0,0);
  PR.forEach((x,i)=>{if(i!==selIdx)clearSpawns(x)});
  R=PR[selIdx];PR=[R];selIdx=0;drawRoutes();drawFeats(R);drawStops();alertShown=null;renderAlert(null);complexNear=false;
  isNav=true;document.body.classList.add('nav');panel('none');
  $('navTop').classList.add('on');$('navBottom').classList.add('on');$('hud').style.display='none';
  $('navInst').textContent='Aguardando GPS…';$('navRoad').textContent='';
  T={start:Date.now(),m:0,kills:0,xp:0,gold:0,items:[]};journeyStart();
  followPaused=false;offSince=0;offStart=null;lastRecalc=0;recalcFails=0;logEv('jornada iniciada → '+short(dest.name));
  { const s0=simulate||!lastFix?R.coords[0]:[lastFix.lat,lastFix.lon];
    enterNavCamera(s0[0],s0[1],bearing(R.coords[0],pointAt(R,Math.min(R.total,40)))); }
  grabWake();
  speak(`Jornada iniciada rumo a ${short(dest.name)}. ${fmtSpeech(R.total)} pela frente.`,'nav');
  if(simulate){simSnap=JSON.stringify(S);startSim()}
  else{startGPS();startBgGPS();if(lastFix)onFix({...lastFix,t:Date.now()})}
  hud();
}
function navUpdate(sn,f){
  R.prog=sn.prog;
  if(sn.dist<50)trimRoute(sn);
  let k=R.steps.findIndex(s=>s.cum>sn.prog+8&&s.type!=='depart');if(k<0)k=R.steps.length-1;
  const st=R.steps[k],dn=Math.max(0,st.cum-sn.prog),[ic,inst]=manobra(st.type,st.mod,st.exit,st.last);
  $('navIconBox').textContent=ic;$('navInst').textContent=inst;$('navRoad').textContent=st.name||st.ref||'';
  renderLanes(st,dn);
  complexNear=dn<180&&(COMPLEX.has(st.type)||(st.lanes&&st.lanes.length>=3));
  if(dn<950){$('navDistVal').textContent=Math.round(dn/10)*10;$('navDistUnit').textContent='m'}
  else{$('navDistVal').textContent=(dn/1000).toFixed(1).replace('.',',');$('navDistUnit').textContent='km'}
  const rem=Math.max(0,R.total-sn.prog),remT=R.duration*rem/R.total;
  $('navRem').textContent=fmtD(rem)+' · '+fmtT(remT);$('navETA').textContent='Chegada '+etaHM(remT);
  const kmh=f.spd>0?Math.round(f.spd*3.6):0,lim=limitAt(R,sn.prog);
  updSpeedo(kmh,lim);
  journeyTick(f,sn,kmh,lim);
  liveFix=f;liveTick();
  $('navMount').textContent=kmh<3?'🧍 Parado':kmh<12?'🚶 A pé':S.vehicle==='moto'?(kmh<60?'🏍️ Na moto':'🏍️ Acelerando'):kmh<40?'🐴 Trotando':kmh<80?'🐎 A galope':'🦅 Voando de grifo';
  announce(k,st,dn,inst,f.spd||0);
  alertTick(sn.prog,f.spd||0);
  stopCheck(f.lat,f.lon);
  if(rem<700&&!R.parkShown){R.parkShown=true;const near=drawParking();if(near?.length)card('🅿️','Estacionamentos perto do destino',`${near.length} opções · a mais perto a ${fmtD(near[0].d)}`,'gold')}
  if(sn.dist<80){const reach=cls().reach;R.spawns.forEach(s=>{if(!s.done&&s.cum<=sn.prog+reach&&s.cum>=sn.prog-400)battle(s)})}
  if(!sim&&!f.dr)offRouteCheck(sn,f);
  if(rem<35||hav(f.lat,f.lon,dest.lat,dest.lon)<30)arrive();
}
function announce(k,st,dn,inst,spd){
  const a=R.ann[k]||(R.ann[k]={}),road=st.name?` na ${st.name}`:'';
  if(st.type==='arrive'){if(!a.n&&dn<250){a.n=1;speak(st.last===false?'Sua parada está logo à frente':'Seu destino está logo à frente','nav')}return}
  const fMax=spd>20?800:450,fMin=spd>20?350:180,near=Math.max(60,spd*5);
  if(!a.f&&dn<=fMax&&dn>=fMin){a.f=1;if(!S.less)speak(`Em ${Math.round(dn/50)*50} metros, ${inst.toLowerCase()}${road}`,'nav')}
  else if(!a.n&&dn<near){a.n=1;a.f=1;speak(inst+road,'nav')}
}
/* faixas: mostra quais faixas servem para a próxima manobra */
const COMPLEX=new Set(['roundabout','rotary','fork','off ramp','on ramp','merge','exit roundabout','exit rotary']);
let complexNear=false;
const LANE_IC={left:'⬅',right:'➡',straight:'⬆','slight left':'↖','slight right':'↗','sharp left':'↩','sharp right':'↪',uturn:'↶',none:'⬆'};
function renderLanes(st,dn){
  const el=$('laneBar');
  if(!st.lanes||dn>600){el.classList.remove('on');return}
  el.innerHTML=st.lanes.map(l=>`<span class="ln ${l.ok?'ok':''}">${(l.ind.length?l.ind:['none']).map(i=>LANE_IC[i]||'⬆').join('')}</span>`).join('');
  el.classList.add('on');
}
/* Saiu da rota? Detecção rápida, mas sem alarme falso:
   - fora da linha da rota por mais de ~35 m (mais se o GPS estiver impreciso),
   - andando (parado no semáforo não conta) e já ter percorrido 25 m fora,
   - 4 s seguidos — ou só 2 s se você está indo numa direção bem diferente da rota (entrou noutra rua),
   - pelo menos 10 s desde o último recálculo. */
let offStart=null,lastRecalc=0,recalcFails=0;
function curHeading(f){
  const bh=bestHeading(f);if(bh!=null)return bh;
  if(prevDraw&&hav(prevDraw[0],prevDraw[1],f.lat,f.lon)>8)return bearing(prevDraw,[f.lat,f.lon]);
  return null;
}
function offRouteCheck(sn,f){
  // direção bem diferente da rota (>60°) = sinal forte de que entrou noutra rua → age mais cedo
  const hd=f.hdg!=null&&!isNaN(f.hdg)&&f.spd>2?f.hdg:(prevDraw&&hav(prevDraw[0],prevDraw[1],f.lat,f.lon)>5?bearing(prevDraw,[f.lat,f.lon]):null);
  const wrongDir=hd!=null&&Math.abs(angDiff(hd,sn.brg))>60;
  const lim=wrongDir?Math.max(20,(f.acc||10)):Math.max(35,(f.acc||10)*1.2);
  if(sn.dist<=lim){offSince=0;offStart=null;return}
  if(f.spd!=null&&f.spd<1.5)return;                 // parado: GPS oscilando, ignora
  if(!offSince){offSince=Date.now();offStart=[f.lat,f.lon];return}
  const moved=hav(offStart[0],offStart[1],f.lat,f.lon);
  const cool=Date.now()-lastRecalc>(recalcFails?20000:10000);
  if(Date.now()-offSince>(wrongDir?1500:4000)&&moved>(wrongDir?15:25)&&cool&&!recalcBusy)recalc(f,sn.dist);
}
async function recalc(f,dist){
  recalcBusy=true;lastRecalc=Date.now();
  const hdg=curHeading(f);
  logEv(`recálculo · ${Math.round(dist)} m fora · prec. ${Math.round(f.acc||0)} m · ${Math.round((f.spd||0)*3.6)} km/h · direção ${hdg==null?'?':Math.round(hdg)+'°'}`);
  try{
    const rs=await osrm({lat:f.lat,lon:f.lon,hdg,acc:f.acc},dest,false,stops);
    if(!isNav)return;
    const nr=buildRoute(rs[0]);
    // se a "nova" rota é praticamente a mesma, não troca nem anuncia
    if(Math.abs(nr.total-(R.total-(R.prog||0)))<40&&hav(nr.coords[0][0],nr.coords[0][1],f.lat,f.lon)<40){logEv('rota igual, mantida');return}
    swapRoute(nr);
    card('🧭','Novo caminho traçado','Você saiu da rota');speak('Rota recalculada','nav');recalcFails=0;
  }catch{recalcFails++;logEv('recálculo falhou')}
  finally{recalcBusy=false;offSince=0;offStart=null}
}
// troca a rota ativa mantendo a jornada (monstros novos à frente, alertas, limites)
function swapRoute(nr){
  clearSpawns(R);clearFeats(R);R=nr;PR=[R];selIdx=0;genSpawns(R,200);fetchLimits(R);
  drawRoutes();drawSpawns(R);drawFeats(R);drawStops();renderAlert(null);
}
// recalcula agora (ex.: parada adicionada) a partir da posição atual
async function reroute(why){
  const here=lastFix&&!sim?{lat:lastFix.lat,lon:lastFix.lon,hdg:bestHeading(lastFix),acc:lastFix.acc}:(prevDraw?{lat:prevDraw[0],lon:prevDraw[1]}:null);
  if(!here||!isNav)return;
  try{
    const rs=await osrm(here,dest,false,stops);if(!isNav)return;
    const nr=buildRoute(rs[0]);swapRoute(nr);lastRecalc=Date.now();
    if(sim)sim.prog=0;
    card('🧭','Rota atualizada',why==='parada'?'Passando pela parada':'');
  }catch(e){toast('Não consegui atualizar a rota: '+e.message);stops.pop();drawStops()}
}
// diário simples de recálculos (Ajustes → Diagnóstico), guarda os últimos 30
function logEv(t){try{const k='meumapa_log',a=JSON.parse(localStorage.getItem(k)||'[]');const d=new Date();
  a.unshift(String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+' '+d.toTimeString().slice(0,5)+' — '+t);
  localStorage.setItem(k,JSON.stringify(a.slice(0,30)))}catch{}}
function arrive(){
  liveEnd('done');
  if(!isNav)return;isNav=false;
  const km=R.total/1000,mt=Math.min(5,1+Math.floor((S.lvl-1)/3));
  const boss=mkMon({n:'Guardião de '+short(dest.name),e:'🗿',t:mt},{elite:true});
  const res=fight(boss);let bossTxt;
  if(res.win){S.hp=Math.max(1,Math.round(res.php));const x=gainXP(boss.xp),g=gainGold(boss.gold);S.stats.kills++;S.daily.kills++;T.kills++;
    bossTxt=`🗿 Guardião derrotado (+${x} XP, +${g} 🪙)`}
  else{S.hp=Math.round(maxHP()*.35);bossTxt='🗿 O guardião resistiu, mas o baú é seu'}
  const bonus=rawXP(Math.round((30+km*25)*(1+.1*(S.lvl-1))*cls().xp*(1+amu()/100)*(window.__patrol?1.2:1)));
  if(km>=5&&res.win)scrollDrop('guardian');
  if(eventOn('natal')&&km>=2&&!simSnap){const gg=gainGold(20+S.lvl*5);setTimeout(()=>card('🎁','Presente de Natal!',`+${gg} 🪙 deixados na sua bota`,'gold'),1800)}
  const hon=honorResult();if(hon&&!simSnap){S.honor=Math.max(0,(S.honor||0)+hon.pts)}
  if(!simSnap){S.stats.realms=(S.realms||[]).length;tripLog()}
  const loot=handleItem(makeItem(rollRar(Math.min(.6,km/40))));
  S.stats.trips++;histAdd('tr',1);histAdd('min',Math.max(1,Math.round((Date.now()-T.start)/60000)));tripRecord(km,T.kills,Math.round((Date.now()-T.start)/60000));ensureDaily();S.daily.trips++;if(isNight())S.stats.nightTrips++;
  checkQuests();checkAch();
  const mins=Math.max(1,Math.round((Date.now()-T.start)/60000));
  $('arDest').textContent=short(dest.name)+(simSnap?' · modo treino (não salvo)':'');
  $('arGrid').innerHTML=[[fmtD(Math.max(T.m,R.total)),'Distância'],[mins+' min','Tempo'],[T.kills,'Monstros'],
    ['+'+fmtN(T.xp),'XP'],['+'+fmtN(T.gold),'Ouro'],['Nv '+S.lvl,'Nível']]
    .map(([v,k])=>`<div class="ar-c"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');
  const chron=chronicle(km,res.win,hon);
  $('arLoot').innerHTML=`<div class="ar-chron">📜 ${esc(chron)}</div>${hon?`<div class="ar-hon">${hon.txt} · ${honorRank()}</div>`:''}${window.__patrol?'<div class="ar-hon">⚔️ Patrulha cumprida: +20% no bônus da jornada</div>':''}<div style="color:#9b93c4;margin-bottom:5px">${bossTxt} · bônus da jornada <b style="color:#e8c86a">+${bonus} XP</b></div>
    🎁 Baú: <span class="r-${loot.it.r}"><b>${esc(loot.it.name)}</b></span> (${RAR[loot.it.r].n}, ${statTxt(loot.it)}) — ${loot.act==='equipado'?'equipado!':'vendido por '+loot.g+' 🪙'}`;
  hero3d('act','cheer');window.__patrol=0;
  setTimeout(()=>speak(chron.split('. ').slice(0,2).join('. '),'fun'),2600);
  setTimeout(()=>dungeonTick(dest.lat,dest.lon,0,true),2500);
  const pk=drawParking();
  if(pk?.length)$('arLoot').innerHTML+=`<div style="margin-top:6px;color:#9b93c4">🅿️ ${pk.length} estacionamento(s) perto · o mais próximo a ${fmtD(pk[0].d)}</div>`;
  save();endNav(true);panel('arrive');if(pk?.length)setTimeout(drawParking,50);
}
function endNav(arrived){
  if(LIVE)liveEnd(arrived?'done':'stop');
  isNav=false;stopSim();releaseWake();stopBgGPS();drProg=null;$('drBadge').style.display='none';try{speechSynthesis.cancel()}catch{}
  renderAlert(null);$('laneBar').classList.remove('on');closeStops();stops=[];complexNear=false;
  if(arrived)setTimeout(()=>speak('Você chegou! Missão concluída.','nav'),50);
  document.body.classList.remove('nav');$('navTop').classList.remove('on');$('navBottom').classList.remove('on');
  $('hud').style.display='';$('recenterBtn').style.display='none';
  clearRouteLayers();R=null;PR=[];T=arrived?T:null;
  if(simSnap){S=JSON.parse(simSnap);simSnap=null;refreshAll()}
  if(!arrived)panel('search');
  followIdle=true;
  if(lastFix){player?.setLngLat([lastFix.lon,lastFix.lat]);exitNavCamera(lastFix.lat,lastFix.lon)}else exitNavCamera();
  setTimeout(scheduleFog,1500);hud();
}
function closeArrive(){T=null;panel('search');$('inpD').value='';hud()}
function stopTap(){
  if(Date.now()-stopArm<3000){endNav(false);toast('Jornada encerrada');return}
  stopArm=Date.now();toast('Toque de novo no ✕ para encerrar');
}

/* ── VELOCÍMETRO + VELOCIDADE MÁXIMA ──────────────────── */
// Limites vêm do OpenStreetMap via Valhalla (uma consulta por rota)
function decode6(s){let i=0,la=0,lo=0;const o=[];while(i<s.length){let b,sh=0,r=0;do{b=s.charCodeAt(i++)-63;r|=(b&31)<<sh;sh+=5}while(b>=32);la+=r&1?~(r>>1):r>>1;sh=0;r=0;do{b=s.charCodeAt(i++)-63;r|=(b&31)<<sh;sh+=5}while(b>=32);lo+=r&1?~(r>>1):r>>1;o.push([la/1e6,lo/1e6])}return o}
async function fetchLimits(Rt){
  try{
    const n=Rt.coords.length,st=Math.max(1,Math.ceil(n/2500));
    const shape=Rt.coords.filter((_,i)=>i%st===0||i===n-1).map(c=>({lat:c[0],lon:c[1]}));
    const ctl=new AbortController();setTimeout(()=>ctl.abort(),20000);
    const v=await(await fetch('https://valhalla1.openstreetmap.de/trace_attributes',{method:'POST',signal:ctl.signal,
      body:JSON.stringify({shape,costing:'auto',shape_match:'map_snap',
        filters:{attributes:['edge.speed_limit','edge.begin_shape_index','edge.end_shape_index','shape'],action:'include'}})})).json();
    if(!v.edges?.length||!v.shape)return;
    const p=decode6(v.shape),cum=[0];
    for(let i=1;i<p.length;i++)cum.push(cum[i-1]+hav(p[i-1][0],p[i-1][1],p[i][0],p[i][1]));
    const k=Rt.total/(cum[cum.length-1]||Rt.total);
    Rt.limits=v.edges.map(e=>({a:(cum[e.begin_shape_index]||0)*k,b:(cum[e.end_shape_index]||0)*k,v:typeof e.speed_limit==='number'?e.speed_limit:0}));
    Rt.limIdx=0;
  }catch{}
}
function limitAt(Rt,prog){
  const L=Rt?.limits;if(!L)return 0;
  let i=Math.min(Rt.limIdx||0,L.length-1);
  if(L[i].a>prog)i=0;
  while(i<L.length-1&&L[i].b<prog)i++;
  Rt.limIdx=i;return L[i].a<=prog+5&&L[i].b>=prog-5?L[i].v:0;
}
let overSince=0,lastBeep=0,actx=null;
function beep(){
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();actx.resume();
    [0,.22].forEach(t=>{const o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.value=980;
      g.gain.setValueAtTime(.0001,actx.currentTime+t);g.gain.exponentialRampToValueAtTime(.35,actx.currentTime+t+.02);
      g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+t+.16);o.connect(g).connect(actx.destination);o.start(actx.currentTime+t);o.stop(actx.currentTime+t+.18)})}catch{}
}
function updSpeedo(kmh,lim){
  $('spdVal').textContent=kmh;
  $('gArc').setAttribute('stroke-dasharray',`${Math.min(100,kmh/140*100)} 100`);
  const sg=$('limitSign');
  if(lim>0){sg.textContent=lim;sg.classList.add('on')}else sg.classList.remove('on');
  const over=lim>0&&kmh>lim+Math.max(3,lim*.07);
  $('gauge').classList.toggle('over',over);sg.classList.toggle('over',over);
  $('gArc').setAttribute('stroke',over?'#ff3b30':'#f0bf4a');
  if(over){if(!overSince)overSince=Date.now();if(Date.now()-overSince>1500&&Date.now()-lastBeep>30000&&!S.mute){beep();lastBeep=Date.now()}}
  else overSince=0;
}

/* ── MODO TREINO (simulação) ─────────────────────────── */
function startSim(){
  sim={prog:0,mult:1,timer:null};$('simBadge').style.display='block';simBadge();
  let last=Date.now();
  const tick=()=>{
    if(!R||!isNav)return;const now=Date.now(),dt=Math.min(3,(now-last)/1000);last=now;
    const v=12.5*sim.mult;sim.prog=Math.min(R.total,sim.prog+v*dt);
    const p=pointAt(R,sim.prog),p2=pointAt(R,Math.min(R.total,sim.prog+8));
    onFix({lat:p[0],lon:p[1],acc:5,spd:v,hdg:bearing(p,p2),t:now});
  };
  sim.timer=setInterval(tick,1000);setTimeout(()=>{last=Date.now();tick()},50);
}
function stopSim(){if(sim){clearInterval(sim.timer);sim=null}$('simBadge').style.display='none'}
function simBadge(){$('simBadge').textContent=`🧪 TREINO ×${sim.mult} · toque p/ acelerar`}
function simSpeed(){if(!sim)return;sim.mult=sim.mult>=8?1:sim.mult*2;simBadge()}

/* ── MANOBRAS ────────────────────────────────────────── */
function manobra(type,mod,exit,last=true){
  if(type==='depart')return['⬆️','Siga em frente'];
  if(type==='arrive')return last===false?['🏕️','Parada à frente']:['🏰','Destino à frente'];
  if(type==='roundabout'||type==='rotary')return['🔄',exit?`Na rotatória, pegue a ${exit}ª saída`:'Entre na rotatória'];
  if(type==='exit roundabout'||type==='exit rotary')return['↗️','Saia da rotatória'];
  if(type==='on ramp')return['↗️','Entre na pista'];
  if(type==='off ramp')return['↘️','Pegue a saída'];
  if(type==='merge')return['⤴️','Entre na via'];
  if(type==='fork')return mod&&mod.includes('right')?['↱','Fique pela direita']:['↰','Fique pela esquerda'];
  if(type==='end of road')return mod&&mod.includes('right')?['➡️','Vire à direita']:['⬅️','Vire à esquerda'];
  if(!mod||mod==='straight')return['⬆️','Continue em frente'];
  if(mod==='slight left')return['↖️','Mantenha à esquerda'];
  if(mod==='slight right')return['↗️','Mantenha à direita'];
  if(mod==='left')return['⬅️','Vire à esquerda'];
  if(mod==='right')return['➡️','Vire à direita'];
  if(mod==='sharp left')return['↩️','Vire bem à esquerda'];
  if(mod==='sharp right')return['↪️','Vire bem à direita'];
  if(mod==='uturn')return['🔃','Faça o retorno'];
  return['⬆️','Continue'];
}
