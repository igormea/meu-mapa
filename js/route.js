'use strict';
/* ── ROTAS ───────────────────────────────────────────── */
let dest=null,PR=[],selIdx=0,R=null,isNav=false,T=null,sim=null;
let castleMk=null,cdTimer=null;

// o.hdg (opcional): direção em que você está indo → a rota sai no sentido certo da via
async function osrm(o,d,alt){
  const b=o.hdg!=null?`&bearings=${Math.round(o.hdg)%360},60;&radiuses=${Math.round(Math.min(60,Math.max(25,o.acc||25)))};unlimited`:'';
  const url=`https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${d.lon},${d.lat}?overview=full&geometries=geojson&steps=true&alternatives=${alt}${b}`;
  const j=await(await fetch(url)).json();
  if(j.code!=='Ok'||!j.routes?.length){
    if(b)return osrm({lat:o.lat,lon:o.lon},d,alt);   // sem via no sentido informado → tenta sem direção
    throw new Error('Não encontrei caminho até lá');
  }
  return j.routes;
}
function buildRoute(r){
  const coords=r.geometry.coordinates.map(c=>[c[1],c[0]]);
  const cum=[0];for(let i=1;i<coords.length;i++)cum.push(cum[i-1]+hav(coords[i-1][0],coords[i-1][1],coords[i][0],coords[i][1]));
  let j=0;
  const steps=r.legs.flatMap(l=>l.steps).map(s=>{
    const[lo,la]=s.maneuver.location;let bi=j,bd=Infinity;
    for(let i=j;i<coords.length&&i-j<4000;i++){const d=hav(la,lo,coords[i][0],coords[i][1]);if(d<bd){bd=d;bi=i}if(bd<1)break}
    j=bi;return{type:s.maneuver.type,mod:s.maneuver.modifier,exit:s.maneuver.exit,name:s.name,ref:s.ref,cum:cum[bi]};
  });
  return{coords,cum,total:cum[cum.length-1]||1,duration:r.duration,steps,seg:0,spawns:[],ann:{}};
}
function pointAt(Rt,d){
  const c=Rt.coords,cm=Rt.cum;if(d<=0)return c[0];if(d>=Rt.total)return c[c.length-1];
  let lo=0,hi=cm.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(cm[m]<=d)lo=m;else hi=m}
  const t=(d-cm[lo])/((cm[hi]-cm[lo])||1);return[c[lo][0]+(c[hi][0]-c[lo][0])*t,c[lo][1]+(c[hi][1]-c[lo][1])*t];
}
function projSeg(la,lo,a,b){
  const k=Math.cos(la*Math.PI/180);
  const ax=(a[1]-lo)*111320*k,ay=(a[0]-la)*110540,bx=(b[1]-lo)*111320*k,by=(b[0]-la)*110540;
  const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;let t=l2?-(ax*dx+ay*dy)/l2:0;t=Math.max(0,Math.min(1,t));
  return{t,d:Math.hypot(ax+t*dx,ay+t*dy)};
}
function snap(la,lo){
  const c=R.coords,n=c.length;let best={d:Infinity,i:0,t:0};
  const scan=(a,b)=>{for(let i=Math.max(0,a);i<Math.min(n-1,b);i++){const p=projSeg(la,lo,c[i],c[i+1]);if(p.d<best.d)best={d:p.d,i,t:p.t}}};
  scan(R.seg-10,R.seg+250);if(best.d>60)scan(0,n-1);
  if(n<2)best={d:hav(la,lo,c[0][0],c[0][1]),i:0,t:0};
  R.seg=best.i;const a=c[best.i],b=c[best.i+1]||a;
  return{dist:best.d,i:best.i,lat:a[0]+(b[0]-a[0])*best.t,lon:a[1]+(b[1]-a[1])*best.t,
    prog:R.cum[best.i]+((R.cum[best.i+1]??R.cum[best.i])-R.cum[best.i])*best.t,brg:bearing(a,b)};
}
function genSpawns(Rt,from=250){
  const sp=Math.max(380,Rt.total/60);let d=from+rnd(0,200);
  while(d<Rt.total-180){const p=pointAt(Rt,d);Rt.spawns.push({cum:d,lat:p[0],lon:p[1],m:rollMonster(),done:false,mk:null});d+=sp+rnd(0,sp*.9)}
}
function drawSpawns(Rt){Rt.spawns.forEach(s=>{if(s.done||s.mk)return;
  s.mk=addMk(`<div class="mon ${s.m.dragon?'dragon':s.m.elite?'elite':''}">${s.m.e}</div>`,s.lat,s.lon,'bottom')})}
function clearSpawns(Rt){Rt?.spawns.forEach(s=>{if(s.mk){s.mk.remove();s.mk=null}})}
const setSrc=(id,data)=>map.getSource(id)?.setData(data);
function drawRoutes(){
  setSrc('alts',{type:'FeatureCollection',features:PR.map((Rt,i)=>i===selIdx?null:lineF(Rt.coords,{i})).filter(Boolean)});
  setSrc('route',lineF(PR[selIdx].coords));
}
function trimRoute(sn){setSrc('route',lineF([[sn.lat,sn.lon],...R.coords.slice(sn.i+1)]))}
function drawCastle(){
  if(castleMk)castleMk.remove();
  castleMk=addMk('<div class="castle">🏰</div>',dest.lat,dest.lon,'bottom');
}
function clearRouteLayers(){
  setSrc('alts',EMPTY);setSrc('route',EMPTY);
  PR.forEach(clearSpawns);if(R)clearSpawns(R);
  if(castleMk){castleMk.remove();castleMk=null}
}

async function goTo(d,noRecent){
  dest=d;if(!noRecent)addRecent(d);
  setStatus('🧭 Procurando sua posição…');
  let o;
  try{o=await getOrigin()}catch{setStatus('Não achei sua localização — digite a partida abaixo.','err');showOriginInput();return}
  setStatus('🗺️ Traçando a jornada…');
  try{
    const rs=await osrm(o,d,true);await mapReady;
    clearRouteLayers();
    PR=rs.slice(0,3).map(buildRoute);selIdx=0;genSpawns(PR[0]);PR.forEach(fetchLimits);
    setStatus('');showPreview();
  }catch(e){setStatus('❌ '+e.message,'err')}
}
function getOrigin(){
  if(originOverride)return Promise.resolve(originOverride);
  if(lastFix&&Date.now()-lastFix.t<60000)return Promise.resolve({lat:lastFix.lat,lon:lastFix.lon,hdg:bestHeading(lastFix),acc:lastFix.acc});
  return new Promise((res,rej)=>{
    if(!navigator.geolocation||gpsDenied)return rej();
    navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lon:p.coords.longitude}),rej,{enableHighAccuracy:true,timeout:9000,maximumAge:30000});
  });
}
function estimate(Rt){
  const km=Rt.total/1000,c=cls();
  const xp=Rt.spawns.reduce((a,s)=>a+s.m.xp,0)*c.xp+Rt.total/20*c.xp+(30+km*25)*(1+.1*(S.lvl-1));
  return{n:Rt.spawns.length,xp:Math.round(xp*(1+amu()/100))};
}
function fillPreview(){
  const Rt=PR[selIdx],est=estimate(Rt),eli=Rt.spawns.filter(s=>s.m.elite||s.m.dragon).length;
  $('questName').textContent='📜 Missão: '+short(dest.name);
  $('rhTime').textContent=fmtT(Rt.duration);$('rhDist').textContent=fmtD(Rt.total);$('rhETA').textContent='· chegada '+etaHM(Rt.duration);
  $('rewards').innerHTML=`⚔️ <b>${est.n}</b> monstros${eli?` (<b>${eli}</b> ★ fortes)`:''} · ✨ ~<b>${fmtN(est.xp)}</b> XP · 🎁 baú no destino`;
  const ar=$('altsRow');
  if(PR.length>1){
    ar.innerHTML=PR.map((x,i)=>`<div class="altc ${i===selIdx?'sel':''}" data-i="${i}"><div class="at">${fmtT(x.duration)}</div><div class="ad">${fmtD(x.total)}</div></div>`).join('');
    ar.querySelectorAll('.altc').forEach(c=>c.onclick=()=>selectAlt(+c.dataset.i));
  }else ar.innerHTML='';
}
function showPreview(){
  followIdle=false;drawRoutes();drawSpawns(PR[selIdx]);drawCastle();fillPreview();panel('route');
  const b=new maplibregl.LngLatBounds();PR[selIdx].coords.forEach(c=>b.extend([c[1],c[0]]));
  map.fitBounds(b,{padding:{top:90,bottom:330,left:40,right:70},pitch:0,bearing:0,duration:900});
  startCountdown();
}
function selectAlt(i){
  if(i===selIdx||isNav)return;stopCountdown();clearSpawns(PR[selIdx]);selIdx=i;
  if(!PR[i].spawns.length)genSpawns(PR[i]);
  drawRoutes();drawSpawns(PR[i]);fillPreview();
}
function startCountdown(){
  stopCountdown();const b=$('cdBar');void b.offsetWidth;b.style.transition='width 8s linear';b.style.width='100%';
  cdTimer=setTimeout(()=>startNav(false),8000);
}
function stopCountdown(){clearTimeout(cdTimer);cdTimer=null;const b=$('cdBar');b.style.transition='none';b.style.width='0'}
$('routePanel').addEventListener('pointerdown',e=>{if(!e.target.closest('.btn.go'))stopCountdown()});
function cancelRoute(){
  stopCountdown();clearRouteLayers();PR=[];panel('search');followIdle=true;
  if(lastFix)map.easeTo({center:[lastFix.lon,lastFix.lat],zoom:16,pitch:0,bearing:0,duration:800});
}
function panel(w){
  ['searchPanel','routePanel','arrivePanel'].forEach(id=>$(id).style.display='none');
  if(w!=='none')$(w+'Panel').style.display='block';
  document.body.classList.toggle('preview',w==='route');document.body.classList.toggle('arrive',w==='arrive');
}
