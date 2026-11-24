'use strict';
/* ── CASA / TRABALHO ─────────────────────────────────────── */
let favPick=null;
const FAV={home:{ic:'🏠',sv:'casa',n:'Casa'},work:{ic:'💼',sv:'trabalho',n:'Trabalho'}};
function renderFav(){
  S.fav=S.fav||{};
  $('favRow').innerHTML=Object.entries(FAV).map(([k,f])=>`<div class="chip fav ${S.fav[k]?'':'unset'}" data-k="${k}">${ic(f.sv)} ${S.fav[k]?f.n:'Definir '+f.n.toLowerCase()}</div>`).join('');
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
function openStops(){if(!isNav)return;$('stopPanel').classList.add('on');$('inpS').value='';$('ac-s').style.display='none';layerPush('stops',()=>closeStops(true))}
function closeStops(fromBack){if(!$('stopPanel').classList.contains('on'))return;$('stopPanel').classList.remove('on');if(!fromBack)layerPop('stops')}
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

/* ── REPORTAR BUG / SUGESTÃO ─────────────────────────────── */
/* Quem usa descreve (digitando ou falando) e o app monta a mensagem com tudo que ajuda a investigar:
   versão, celular, últimos erros, onde estava na rota. Envia pelo WhatsApp. */
const REPORT_TO='5585997662543';   // número do Igor (só dígitos, com 55+DDD). Vazio = a pessoa escolhe o contato no WhatsApp
function reportInfo(){
  const ua=navigator.userAgent,and=(ua.match(/Android [^;)]+(?:; [^;)]+)?/)||[''])[0];
  const L=[`📱 Ranvus Maps v${APPV} · ${NATIVE?'APK':'navegador'}`,`Aparelho: ${and||ua.slice(0,90)} · tela ${innerWidth}x${innerHeight}`,
    `Herói: ${S.name||'?'} · ${cls()?.nome||'?'} nv ${S.lvl} · tema ${S.theme||'castelo'}`];
  if(lastFix)L.push(`GPS: ${lastFix.lat.toFixed(5)},${lastFix.lon.toFixed(5)} ±${Math.round(lastFix.acc||0)}m · ${Math.round((lastFix.spd||0)*3.6)} km/h`);
  if(isNav&&R&&dest){const rem=Math.max(0,R.total-(R.prog||0));L.push(`Rota: indo p/ ${short(dest.name)} · faltam ${fmtD(rem)} de ${fmtD(R.total)}${sim?' (treino)':''}`)}
  else if(dest)L.push(`Último destino: ${short(dest.name)}`);
  const er=(window.__errLog||[]).slice(-5);L.push(er.length?'Últimos erros:\n'+er.join('\n'):'Últimos erros: nenhum');
  try{const lg=JSON.parse(localStorage.getItem('meumapa_log')||'[]').slice(-4);if(lg.length)L.push('Rota (log):\n'+lg.join('\n'))}catch{}
  return L.join('\n');
}
function openReport(){
  let p=$('repPanel');
  if(!p){p=document.createElement('div');p.id='repPanel';p.innerHTML=`<div class="rp-box">
    <div class="rp-t">🐞 Reportar bug / sugestão</div>
    <div class="rp-s">Conte o que aconteceu ou o que sentiu falta. As informações técnicas vão junto automaticamente.</div>
    <div class="acw"><textarea id="repTxt" rows="4" placeholder="Ex.: o recálculo demorou na Av. Washington Soares…"></textarea><button id="repMic" title="Falar">🎙️</button></div>
    <div class="rp-tipo"><button data-k="🐞 Bug" class="on">🐞 Bug</button><button data-k="💡 Sugestão">💡 Sugestão</button></div>
    <details><summary>Ver o que será enviado</summary><pre id="repInfo"></pre></details>
    <div class="opt"><button id="repCancel">Cancelar</button><button id="repSend" class="prim">Enviar no WhatsApp</button></div></div>`;
    document.body.appendChild(p);
    p.querySelectorAll('.rp-tipo button').forEach(b=>b.onclick=()=>{p.querySelectorAll('.rp-tipo button').forEach(x=>x.classList.toggle('on',x===b))});
    $('repCancel').onclick=()=>closeReport();
    $('repMic').onclick=()=>listenOnce(t=>{const a=$('repTxt');a.value=(a.value?a.value+' ':'')+t});
    $('repSend').onclick=sendReport;
  }
  $('repInfo').textContent=reportInfo();$('repTxt').value='';p.classList.add('on');layerPush('report',()=>closeReport(true));
  if(!p.dataset.drag){p.dataset.drag=1;dragToClose(p.querySelector('.rp-box'),()=>closeReport())}
}
function closeReport(fromBack){$('repPanel').classList.remove('on');if(!fromBack)layerPop('report')}
function reportText(){
  const tipo=document.querySelector('#repPanel .rp-tipo .on')?.dataset.k||'🐞 Bug';
  return `${tipo} — Ranvus Maps\n${$('repTxt').value.trim()||'(sem descrição)'}\n\n— info técnica —\n${reportInfo()}`.slice(0,3500);
}
function sendReport(){
  if(!$('repTxt').value.trim())return toast('Escreva ou fale o que aconteceu');
  const url=`https://wa.me/${REPORT_TO}?text=`+encodeURIComponent(reportText());
  closeReport();window.__lastReport=url;
  if(NATIVE)location.href=url;else window.open(url,'_blank');
}
window.openReport=openReport;
// reconhecimento de voz reutilizável (nativo no APK, do navegador no site)
async function listenOnce(cb){
  if(NATIVE&&NAT.speech){try{await NAT.speech.requestPermissions();const r=await NAT.speech.start({language:'pt-BR',maxResults:1,partialResults:false,popup:true});if(r?.matches?.[0])cb(r.matches[0])}catch(e){toast('Não consegui ouvir')}return}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return toast('Voz não disponível aqui');
  const rec=new SR();rec.lang='pt-BR';rec.onresult=e=>{const t=e.results?.[0]?.[0]?.transcript;if(t)cb(t)};rec.start();toast('🎙️ Pode falar…',3000);
}

/* ── NOVIDADES (patch notes) ── ao abrir uma versão nova, mostra o que mudou; lista completa em Ajustes */
let NOTES=null;
async function loadNotes(){if(!NOTES)try{NOTES=await(await fetch('data/patchnotes.json?v='+APPV)).json()}catch{NOTES=[]}return NOTES}
function notesHTML(list){return list.map(n=>`<div class="pn"><div class="pn-h"><b>Versão ${esc(n.v)} — ${esc(n.t)}</b><span>${esc(n.d)}</span></div>
  ${n.apk?'<div class="pn-apk">📲 Esta versão pede instalar o APK novo</div>':''}<ul>${n.i.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
// compara versões x.y.z (1 se a>b)
const vcmp=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return(x[i]||0)>(y[i]||0)?1:-1}return 0};
async function showNews(all){
  const L=await loadNotes();if(!L.length)return;
  let p=$('newsPanel');if(!p){p=document.createElement('div');p.id='newsPanel';p.innerHTML='<div class="rp-box"><div class="handle"></div><div class="rp-t">📜 Novidades</div><div id="newsBody"></div><div class="opt"><button class="prim" id="newsOk">Entendi</button></div></div>';
    document.body.appendChild(p);$('newsOk').onclick=()=>closeNews();p.onclick=e=>{if(e.target===p)closeNews()};dragToClose(p.querySelector('.rp-box'),()=>closeNews())}
  // tudo o que saiu desde a última versão vista (não só a mais recente)
  let N=all?L:L.filter(n=>!S.seenV||vcmp(n.v,S.seenV)>0);if(!N.length)N=L.slice(0,1);
  const more=!all&&N.length>8;if(more)N=N.slice(0,8);
  $('newsBody').innerHTML=notesHTML(N)+(more||!all?`<div class="r2" style="text-align:center;margin-top:8px"><a onclick="showNews(true)">ver o histórico completo</a></div>`:'');p.classList.add('on');layerPush('news',()=>closeNews(true));
  S.seenV=L[0].v;save();
}
function closeNews(fromBack){$('newsPanel')?.classList.remove('on');if(!fromBack)layerPop('news')}
setTimeout(async()=>{const L=await loadNotes();
  if(S.seenV==='1.23.1'&&!S.newsFix){S.seenV='1.22.0';S.newsFix=1}   // quem viu a lista incompleta da 1.23 vê tudo de novo
  if(L.length&&S.cls&&S.seenV&&vcmp(L[0].v,S.seenV)>0&&!isNav)showNews(false);else if(L.length&&!S.seenV){S.seenV=L[0].v;save()}},3500);
