'use strict';
/* ── CASA / TRABALHO ─────────────────────────────────────── */
let favPick=null;
const FAV={home:{ic:'🏠',n:'Casa'},work:{ic:'💼',n:'Trabalho'}};
function renderFav(){
  S.fav=S.fav||{};
  $('favRow').innerHTML=Object.entries(FAV).map(([k,f])=>`<div class="chip fav ${S.fav[k]?'':'unset'}" data-k="${k}">${f.ic} ${S.fav[k]?f.n:'Definir '+f.n.toLowerCase()}</div>`).join('');
  $('favRow').querySelectorAll('.chip').forEach(c=>c.onclick=()=>favTap(c.dataset.k));
}
function favTap(k){
  if(S.fav[k]){const d=S.fav[k];$('inpD').value=d.name;goTo(d,true);return}
  favPick=k;$('inpD').value='';$('inpD').placeholder=`Endereço de ${FAV[k].n.toLowerCase()}…`;$('inpD').focus();
  setStatus(`${FAV[k].ic} Busque e escolha o endereço de ${FAV[k].n.toLowerCase()}`);
}
// chamado quando um resultado da busca é escolhido; devolve true se era p/ salvar Casa/Trabalho
function favConsume(d){
  if(!favPick)return false;
  S.fav[favPick]={name:d.name,sub:d.sub||'',lat:d.lat,lon:d.lon};
  card(FAV[favPick].ic,`${FAV[favPick].n} salvo!`,esc(short(d.name)),'gold');
  favPick=null;$('inpD').value='';$('inpD').placeholder='Buscar destino…';setStatus('');
  save();renderFav();return true;
}
function favClear(k){S.fav=S.fav||{};delete S.fav[k];save();renderFav()}

/* ── COMPARTILHAR A VIAGEM ───────────────────────────────── */
function shareTrip(){
  if(!isNav||!R||!dest)return toast('Inicie uma jornada para compartilhar');
  const rem=Math.max(0,R.total-(R.prog||0)),remT=R.duration*rem/R.total;
  const txt=`🗺️ Estou indo para ${short(dest.name)} — chego por volta das ${etaHM(remT)} (${fmtD(rem)} restantes).\n📍 https://www.google.com/maps/search/?api=1&query=${dest.lat.toFixed(5)},${dest.lon.toFixed(5)}`;
  if(!NATIVE&&navigator.share){navigator.share({text:txt}).catch(()=>{});return}
  const url='https://wa.me/?text='+encodeURIComponent(txt);
  if(NATIVE)location.href=url;else window.open(url,'_blank');
}

/* ── BUSCA POR VOZ ───────────────────────────────────────── */
async function voiceSearch(){
  const done=t=>{if(!t)return toast('Não entendi, tente de novo');const i=$('inpD');i.value=t;i.dispatchEvent(new Event('input'));i.focus()};
  if(NATIVE&&NAT.speech){
    try{
      const av=await NAT.speech.available();if(!av?.available)return toast('Reconhecimento de voz indisponível neste aparelho');
      await NAT.speech.requestPermissions();
      const r=await NAT.speech.start({language:'pt-BR',maxResults:1,prompt:'Para onde, aventureiro?',partialResults:false,popup:true});
      return done(r?.matches?.[0]);
    }catch(e){return toast('Não consegui ouvir: '+(e?.message||e))}
  }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR)return toast('Busca por voz não disponível neste navegador');
  const rec=new SR();rec.lang='pt-BR';rec.maxAlternatives=1;rec.interimResults=false;
  $('micBtn').classList.add('on');toast('🎙️ Fale o destino…',4000);
  rec.onresult=e=>done(e.results?.[0]?.[0]?.transcript);
  rec.onerror=e=>toast('Voz: '+(e.error==='not-allowed'?'permita o microfone':e.error));
  rec.onend=()=>$('micBtn').classList.remove('on');
  rec.start();
}

/* ── PARADAS NO CAMINHO ──────────────────────────────────── */
let stops=[],stopMks=[];
const STOP_KIND={fuel:{ic:'⛽',n:'posto'},pharm:{ic:'💊',n:'farmácia'},park:{ic:'🅿️',n:'estacionamento'}};
function openStops(){if(!isNav)return;$('stopPanel').classList.add('on');$('inpS').value='';$('ac-s').style.display='none'}
function closeStops(){$('stopPanel').classList.remove('on')}
// lugar do tipo pedido mais conveniente: perto da rota e à frente de você
function bestAlong(kind){
  const list=OSM?.[kind];if(!list?.length||!R)return null;
  const here=lastFix||(prevDraw?{lat:prevDraw[0],lon:prevDraw[1]}:null);if(!here)return null;
  const prog=R.prog||0;let best=null;
  for(const p of list){
    if(hav(here.lat,here.lon,p[0],p[1])>6000)continue;
    let bd=Infinity,bc=0;const c=R.coords;
    for(let i=Math.max(0,R.seg-5);i<c.length-1;i+=1){const pr=projSeg(p[0],p[1],c[i],c[i+1]);if(pr.d<bd){bd=pr.d;bc=R.cum[i]+(R.cum[i+1]-R.cum[i])*pr.t}}
    if(bc<prog+150)continue;
    const score=bd*3+(bc-prog)*.5;
    if(!best||score<best.score)best={score,lat:p[0],lon:p[1],name:p[2]||STOP_KIND[kind].n,off:bd};
  }
  return best;
}
function stopKind(kind){
  const b=bestAlong(kind);
  if(!b)return toast(`Não achei ${STOP_KIND[kind].n} perto da rota`);
  addStop({name:`${STOP_KIND[kind].ic} ${b.name}`,lat:b.lat,lon:b.lon});
}
async function addStop(d){
  closeStops();stops.push(d);
  card('🏕️','Parada adicionada',esc(short(d.name)),'gold');
  await reroute('parada');
}
function drawStops(){
  stopMks.forEach(m=>m.remove());
  stopMks=stops.map(s=>addMk('<div class="mk-castle small">🏕️</div>',s.lat,s.lon,'bottom'));
}
function stopCheck(lat,lon){
  if(!stops.length)return;
  if(hav(lat,lon,stops[0].lat,stops[0].lon)<45){
    const s=stops.shift();card('🏕️','Parada alcançada',esc(short(s.name)),'gold');speak('Você chegou à sua parada','nav');drawStops();
  }
}

/* ── BACKUP DO PROGRESSO ─────────────────────────────────── */
function exportSave(){
  if(!$('bkText')){openSheet();setTab('cfg')}
  const code='MMRPG1:'+btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  $('bkText').value=code;$('bkText').style.display='block';$('bkText').select();
  (navigator.clipboard?.writeText(code)||Promise.reject()).then(()=>toast('📋 Código copiado! Guarde no WhatsApp ou Keep'),()=>toast('Copie o código abaixo e guarde'));
}
let importArm=0;
function importSave(){
  if(!$('bkText')){openSheet();setTab('cfg')}
  const t=$('bkText');t.style.display='block';
  const raw=t.value.trim();
  if(!raw.startsWith('MMRPG1:')){t.placeholder='Cole aqui o código de backup e toque em Importar de novo';t.focus();return}
  let data;
  try{data=JSON.parse(decodeURIComponent(escape(atob(raw.slice(7)))))}catch{return toast('Código inválido')}
  if(!data||typeof data.lvl!=='number'||!data.stats)return toast('Código inválido');
  if(Date.now()-importArm>4000){importArm=Date.now();return toast(`Isso vai trocar seu progresso por: ${data.name}, nível ${data.lvl}. Toque de novo para confirmar.`,4000)}
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(data))}catch{}
  location.reload();
}
