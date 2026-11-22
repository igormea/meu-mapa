'use strict';
/* ── COMPARTILHAR ROTA AO VIVO (estilo Uber) ─────────────────
   Gera um link secreto. Quem abre vê no navegador (sem precisar do app): trajeto, destino,
   onde você está agora, hora de chegada e o aviso quando chega.
   Firebase Realtime Database via REST (sem SDK): login anônimo + gravação só pelo dono (regras no console).
   Para sozinho ao chegar, ao encerrar a jornada ou quando você tocar em "parar". O link expira em 12 h. */
const LS_URL='https://igormea.github.io/meu-mapa/acompanhar.html';
let LIVE=null;            // {id, lastPush, lastPos}
let liveFix=null;         // última posição da navegação (inclui o modo treino)

/* login anônimo (token renovado automaticamente) */
async function fbToken(){
  let a=null;try{a=JSON.parse(localStorage.getItem('ranvus_fbauth')||'null')}catch{}
  if(a&&a.exp>Date.now()+60000)return a;
  let j;
  if(a?.refresh){
    j=await(await fetch(`https://securetoken.googleapis.com/v1/token?key=${FB_CONFIG.apiKey}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(a.refresh)})).json();
    if(j.id_token)a={uid:j.user_id,token:j.id_token,refresh:j.refresh_token,exp:Date.now()+(+j.expires_in)*1000};else a=null;
  }
  if(!a){
    j=await(await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FB_CONFIG.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"returnSecureToken":true}'})).json();
    if(!j.idToken)throw new Error('login');
    a={uid:j.localId,token:j.idToken,refresh:j.refreshToken,exp:Date.now()+(+j.expiresIn)*1000};
  }
  localStorage.setItem('ranvus_fbauth',JSON.stringify(a));return a;
}
async function fbWrite(path,data,method='PATCH'){
  const a=await fbToken();
  const r=await fetch(`${FB_CONFIG.databaseURL}/${path}.json?auth=${a.token}`,{method,body:method==='DELETE'?undefined:JSON.stringify(data)});
  if(!r.ok)throw new Error('fb '+r.status);return a;
}
function lsId(){const b=new Uint8Array(24);crypto.getRandomValues(b);return[...b].map(x=>'abcdefghijkmnpqrstuvwxyz23456789'[x%32]).join('')}
// trajeto enxuto (um ponto a cada ~25 m, no máx. 600) pra mandar pro link
function lsRoute(){
  if(!R)return[];const out=[];let last=-1e9;
  for(let i=0;i<R.coords.length;i++){if(R.cum[i]-last>=25||i===R.coords.length-1){out.push([+R.coords[i][0].toFixed(5),+R.coords[i][1].toFixed(5)]);last=R.cum[i]}}
  if(out.length>600){const k=Math.ceil(out.length/600);return out.filter((_,i)=>i%k===0||i===out.length-1)}
  return out;
}
function lsSnapshot(){
  const rem=Math.max(0,R.total-(R.prog||0)),remT=R.duration*rem/R.total;
  const p=liveFix?{lat:+liveFix.lat.toFixed(5),lon:+liveFix.lon.toFixed(5),h:Math.round(liveFix.hdg??liveFix.heading??0),s:Math.round((liveFix.spd||0)*3.6),t:Date.now()}:null;
  return{rem:Math.round(rem),eta:Date.now()+Math.round(remT*1000),pos:p};
}

async function liveStart(){
  if(!isNav||!R||!dest)return toast('Inicie uma jornada para compartilhar');
  if(LIVE)return liveSend();                       // já compartilhando: só manda o link de novo
  toast('🔗 Gerando o link…');
  const id=lsId(),a0=await fbToken().catch(()=>null);
  if(!a0)return toast('Sem internet para compartilhar agora');
  const data={uid:a0.uid,t:Date.now(),exp:Date.now()+12*3600e3,st:'nav',mode:S.mode||'car',
    name:S.name||'Aventureiro',cls:cls()?.nome||'',dest:{n:short(dest.name),lat:+dest.lat.toFixed(5),lon:+dest.lon.toFixed(5)},route:lsRoute(),...lsSnapshot()};
  try{await fbWrite('shares/'+id,data,'PUT')}catch{return toast('Não consegui compartilhar agora')}
  LIVE={id,lastPush:Date.now(),lastPos:liveFix?[liveFix.lat,liveFix.lon]:null,routeLen:R.total};
  S.liveShares=(S.liveShares||0)+1;renderLiveBtn();liveSend();
}
function liveUrl(){return`${LS_URL}#${LIVE.id}`}
function liveSend(){
  const txt=`📍 Acompanhe minha viagem até ${short(dest.name)} ao vivo (Ranvus Maps):\n${liveUrl()}`;
  if(!NATIVE&&navigator.share){navigator.share({text:txt}).catch(()=>{});return}
  const url='https://wa.me/?text='+encodeURIComponent(txt);if(NATIVE)location.href=url;else window.open(url,'_blank');
}
// a cada posição: manda no máx. a cada 5 s (ou se andou 40 m); rota nova (recálculo) vai junto
function liveTick(){
  if(!LIVE||!isNav||!R)return;
  const now=Date.now(),moved=LIVE.lastPos&&liveFix?hav(LIVE.lastPos[0],LIVE.lastPos[1],liveFix.lat,liveFix.lon):999;
  if(now-LIVE.lastPush<5000&&moved<40)return;
  LIVE.lastPush=now;if(liveFix)LIVE.lastPos=[liveFix.lat,liveFix.lon];
  const d=lsSnapshot();
  if(Math.abs(R.total-LIVE.routeLen)>5){d.route=lsRoute();LIVE.routeLen=R.total}
  fbWrite('shares/'+LIVE.id,d).catch(()=>{});
}
function liveEnd(st){                               // st: 'done' (chegou) | 'stop' (parou)
  if(!LIVE)return;const id=LIVE.id;LIVE=null;renderLiveBtn();
  const d={st,end:Date.now()};if(st==='done'&&liveFix)d.pos={lat:+liveFix.lat.toFixed(5),lon:+liveFix.lon.toFixed(5),h:0,s:0,t:Date.now()};
  if(st==='done')d.rem=0;
  fbWrite('shares/'+id,d).catch(()=>{});
}
function liveStop(){liveEnd('stop');toast('Compartilhamento encerrado')}
function renderLiveBtn(){
  const b=$('liveBtn');if(!b)return;
  b.classList.toggle('on',!!LIVE);b.title=LIVE?'Compartilhando ao vivo (toque para opções)':'Compartilhar rota ao vivo';
}
function liveBtnTap(){
  if(!LIVE)return liveStart();
  const box=$('liveMenu');box.classList.toggle('on');
}

/* ── MODO DE VIAGEM: carro, a pé, bicicleta ── */
function setMode(m){S.mode=m;save();document.querySelectorAll('#modeRow span').forEach(x=>x.classList.toggle('on',x.dataset.m===m));
  document.body.classList.toggle('mode-foot',m==='foot');document.body.classList.toggle('mode-bike',m==='bike')}
document.querySelectorAll('#modeRow span').forEach(x=>x.onclick=()=>{setMode(x.dataset.m);if(dest&&PR.length&&!isNav)goTo(dest,true)});
setMode(S.mode||'car');
