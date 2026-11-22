'use strict';
/* ═════ LOCALIZAÇÃO PRA GUILDA ═════
   Separado do link (📡, só quem tem o link vê). Aqui cada membro LIGA A SUA localização pra guilda;
   todo mundo da guilda vê no mapa, ao vivo, quem ligou — como personagens 3D da classe de cada um.
   gloc/{gid}/{uid} = {lat, lon, h, v, t, cls, nick}  — só membros da guilda leem (regras do servidor).
   Desliga sozinho depois de 12 h (pra ninguém esquecer ligado). */
const GLOC_HOURS=12,GLOC_EVERY=5000,GLOC_MIN_M=25;
const GL={last:null,lastT:0,es:null,gid:null,data:{},tags:{},esT:0};
const glocOn=()=>!!(S.gloc&&S.gloc>Date.now()&&SOC?.gid&&isLogged());
function glocSet(on){
  if(on){S.gloc=Date.now()+GLOC_HOURS*3600e3;GL.lastT=0;toast(`📍 Sua localização está visível pra guilda por ${GLOC_HOURS} h`);if(lastFix)glocTick(lastFix,true)}
  else{const was=S.gloc;S.gloc=0;if(was&&SOC.gid)fbDel(`gloc/${SOC.gid}/${uidMe()}`).catch(()=>{});toast('📍 Localização pra guilda desligada')}
  save();renderSheet();
}
// a cada posição do GPS: manda no máx. a cada 5 s, e só se andou 25 m (ou a cada 1 min parado, pra mostrar que está online)
function glocTick(f,force){
  if(!f||simSnap)return;
  if(S.gloc&&S.gloc<=Date.now()&&SOC?.gid){S.gloc=0;save();fbDel(`gloc/${SOC.gid}/${uidMe()}`).catch(()=>{});return}
  if(!glocOn())return;
  const now=Date.now(),moved=GL.last?hav(GL.last.lat,GL.last.lon,f.lat,f.lon):1e9;
  if(!force&&(now-GL.lastT<GLOC_EVERY||(moved<GLOC_MIN_M&&now-GL.lastT<60000)))return;
  GL.last=f;GL.lastT=now;
  const h=f.hdg!=null&&!isNaN(f.hdg)?Math.round(f.hdg):(typeof lastCourse!=='undefined'&&lastCourse!=null?Math.round(lastCourse):null);
  fbSet(`gloc/${SOC.gid}/${uidMe()}`,{lat:+f.lat.toFixed(6),lon:+f.lon.toFixed(6),h,v:Math.round((f.spd||0)*10)/10,t:now,cls:S.cls,nick:SOC.me?.nick||''}).catch(()=>{});
}
/* ── ver a guilda ao vivo (EventSource: o servidor empurra cada mudança na hora) ── */
async function glocWatch(){
  const gid=SOC?.gid&&isLogged()?SOC.gid:null;
  if(gid===GL.gid&&GL.es&&GL.es.readyState!==2)return;
  glocStop();if(!gid)return;
  let tok;try{tok=(await fbToken()).token}catch{return}
  GL.gid=gid;GL.data={};
  try{
    const es=GL.es=new EventSource(`${FB_CONFIG.databaseURL}/gloc/${gid}.json?auth=${tok}`);
    const up=e=>{try{const m=JSON.parse(e.data);if(!m)return;const p=m.path.replace(/^\/+/,'');
      if(!p){GL.data=m.data||{}}
      else{const [u,k]=p.split('/');
        if(e.type==='patch'){GL.data[u]=Object.assign(GL.data[u]||{},k?{[k]:m.data}:m.data)}
        else if(k){GL.data[u]=GL.data[u]||{};GL.data[u][k]=m.data}else if(m.data==null)delete GL.data[u];else GL.data[u]=m.data}
      glocDraw()}catch{}};
    es.addEventListener('put',up);es.addEventListener('patch',up);
    es.addEventListener('auth_revoked',()=>{glocStop();setTimeout(glocWatch,1000)});   // token de 1 h venceu: reconecta
  }catch{}
}
function glocStop(){try{GL.es?.close()}catch{};GL.es=null;GL.gid=null;GL.data={};glocDraw()}
const glocFresh=v=>v&&typeof v.lat==='number'&&Date.now()-(v.t||0)<10*60000;
function glocDraw(){
  const me=uidMe(),mem=SOC?.group?.members||{},prev=GL.prevT||{};
  const list=Object.entries(GL.data).filter(([u,v])=>u!==me&&mem[u]&&glocFresh(v))
    .map(([u,v])=>({id:u,cls:v.cls||'cavaleiro',lat:v.lat,lon:v.lon,heading:v.h,speed:v.v||0,nick:v.nick||mem[u].nick||'?',t:v.t,dt:prev[u]?v.t-prev[u]:5000}));
  GL.prevT=Object.fromEntries(list.map(x=>[x.id,x.t]));
  const use3D=document.body.classList.contains('has3d')&&window.Hero3D?.friendSync;
  if(use3D)window.Hero3D.friendSync(list);
  // etiqueta com o nome (e boneco 2D se o 3D não estiver disponível)
  const ids=new Set(list.map(x=>x.id));
  for(const u of Object.keys(GL.tags))if(!ids.has(u)){GL.tags[u].remove();delete GL.tags[u]}
  for(const x of list){
    let mk=GL.tags[x.id];
    if(!mk){const el=document.createElement('div');el.className='fr-mk'+(use3D?' tag':'');
      el.innerHTML=`${use3D?'':`<span class="fr-ic">${heroPic(x.cls)}</span>`}<span class="fr-nm">${esc(x.nick)}</span>`;
      el.onclick=()=>toast(`${x.nick} · ${x.speed>1.5?Math.round(x.speed*3.6)+' km/h':'parado'} · atualizado ${ago(x.t)}`);
      mk=GL.tags[x.id]=new maplibregl.Marker({element:el,anchor:'bottom',offset:use3D?[0,-36]:[0,0]}).setLngLat([x.lon,x.lat]).addTo(map)}
    if(!use3D)mk.setLngLat([x.lon,x.lat]);
  }
  if(sheetIsSoc())renderSheet();
}
// o 3D desliza o boneco entre posições; a etiqueta acompanha
window.__friendMoved=(u,lat,lon)=>{GL.tags[u]?.setLngLat([lon,lat])};
const sheetIsSoc=()=>$('sheet')?.classList.contains('on')&&sheetTab==='soc'&&SOC.view==='guild';
function glocHTML(){
  const on=glocOn(),me=uidMe(),mem=SOC.group?.members||{};
  const live=Object.entries(GL.data).filter(([u,v])=>u!==me&&mem[u]&&glocFresh(v));
  return`<div class="row gloc"><div class="r1"><span>📍 Localização pra guilda</span><b style="color:${on?'#9fe0a5':'#9fb0d4'}">${on?'ligada':'desligada'}</b></div>
    <div class="r2">${on?`Seus companheiros te veem no mapa até às ${new Date(S.gloc).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}.`:'Ligue quando for viajar com a galera. Cada um liga a sua; só quem está na guilda vê.'}</div>
    <button class="btn${on?'':' prim'}" style="margin-top:8px" onclick="glocSet(${!on})">${on?'Desligar':'Ligar por '+GLOC_HOURS+' h'}</button>
    ${live.length?`<div class="r2" style="margin-top:8px">No mapa agora: ${live.map(([u,v])=>`<b>${esc(v.nick||mem[u].nick)}</b> <a onclick="glocFocus('${u}')">ver</a>`).join(' · ')}</div>`:''}</div>`;
}
function glocFocus(u){const v=GL.data[u];if(!v)return;closeSheet();map.easeTo({center:[v.lon,v.lat],zoom:Math.max(map.getZoom(),15)});followIdle=false}
setInterval(()=>{glocWatch();glocDraw()},30000);
