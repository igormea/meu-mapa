'use strict';
/* ── PORTAIS (endereços salvos) ──────────────────────────────
   Puxe a barrinha da busca pra cima: aparecem seus Portais (nome + endereço).
   Tocou num portal, a rota é traçada. Dá pra criar (pela busca, pela prévia da rota ou "onde estou"),
   renomear e apagar. Buscar pelo nome ("irmão") também acha o portal. */
const PICONS=['🌀','🏠','👪','❤️','🍔','🏋️','🛒','⛪','🎓','🏥','⚽','🏖️','🍻','🎮','💈','🐾'];
let portalPick=false,portalDraft=null;
function portals(){return S.portals=S.portals||[]}

/* painel expandido */
function portalsOpen(on){sheetSnap(on?'p':'n')}
function renderPortals(){
  const L=portals(),c=searchCenter();
  $('portalList').innerHTML=L.length?L.map((p,i)=>`<div class="ptl" data-i="${i}">
      <span class="pt-ic">${!p.ic||p.ic==='🌀'?ic('portal'):p.ic}</span><span class="pt-tx"><b>${esc(p.n)}</b><small>${esc(short(p.addr||''))} · ${fmtD(hav(c.lat,c.lon,p.lat,p.lon))}</small></span>
      <button class="pt-ed" data-i="${i}" aria-label="Editar">✎</button></div>`).join('')
    :'<div class="pt-empty">Nenhum portal ainda. Salve os lugares que você mais visita: casa da família, academia, o bar dos amigos…</div>';
  $('portalList').querySelectorAll('.ptl').forEach(el=>el.onclick=e=>{
    if(e.target.closest('.pt-ed'))return portalEdit(+el.dataset.i);
    const p=portals()[+el.dataset.i];portalsOpen(false);$('inpD').value=p.n;goTo({name:p.n,sub:p.addr||'',lat:p.lat,lon:p.lon},true);
  });
}
/* criar */
function portalNewSearch(){
  portalPick=true;portalsOpen(false);$('inpD').value='';$('inpD').placeholder='Endereço do novo portal…';$('inpD').focus();
  setStatus('🌀 Busque e escolha o endereço do novo portal');
}
function portalConsume(d){                     // resultado escolhido na busca → vira portal
  if(!portalPick)return false;
  portalPick=false;$('inpD').value='';$('inpD').placeholder='Buscar destino…';setStatus('');
  portalDialog({n:'',addr:d.name+(d.sub?', '+d.sub:''),lat:d.lat,lon:d.lon,ic:'🌀'});return true;
}
function portalHere(){
  if(!lastFix)return toast('Ainda sem GPS');
  portalDialog({n:'',addr:ENV.city?`Perto daqui · ${ENV.city}`:'Onde eu estava',lat:lastFix.lat,lon:lastFix.lon,ic:'🌀'});
}
function portalFromRoute(){
  if(!dest)return;stopCountdown();
  portalDialog({n:'',addr:dest.name+(dest.sub?', '+dest.sub:''),lat:dest.lat,lon:dest.lon,ic:'🌀'});
}
/* diálogo de nome/ícone (criar e editar) */
function portalDialog(p,idx=-1){
  portalDraft={...p,idx};
  let d=$('portalDlg');
  if(!d){d=document.createElement('div');d.id='portalDlg';d.innerHTML=`<div class="rp-box"><div class="handle"></div>
      <div class="rp-t" id="pdT"></div><div class="rp-s" id="pdAddr"></div>
      <input id="pdName" maxlength="40" placeholder="Nome do portal (ex.: Casa do meu irmão)" autocomplete="off">
      <div class="pd-ics">${PICONS.map(ic=>`<span data-ic="${ic}">${ic}</span>`).join('')}</div>
      <div class="opt"><button id="pdDel" class="del">Apagar</button><button id="pdCancel">Cancelar</button><button id="pdOk" class="prim">Salvar portal</button></div></div>`;
    document.body.appendChild(d);
    d.querySelectorAll('.pd-ics span').forEach(s=>s.onclick=()=>{portalDraft.ic=s.dataset.ic;d.querySelectorAll('.pd-ics span').forEach(x=>x.classList.toggle('on',x===s))});
    $('pdCancel').onclick=()=>portalDlgClose();$('pdOk').onclick=portalSave;
    $('pdDel').onclick=()=>{const b=$('pdDel');if(b.dataset.sure){portals().splice(portalDraft.idx,1);save();portalDlgClose();renderPortals();toast('Portal apagado')}else{b.dataset.sure=1;b.textContent='Apagar mesmo?'}};
    $('pdName').addEventListener('keydown',e=>{if(e.key==='Enter')portalSave()});
    d.onclick=e=>{if(e.target===d)portalDlgClose()};dragToClose(d.querySelector('.rp-box'),()=>portalDlgClose());
  }
  $('pdT').textContent=idx>=0?'✎ Editar portal':'🌀 Novo portal';$('pdAddr').textContent='📍 '+(p.addr||'');
  $('pdName').value=p.n||'';const del=$('pdDel');del.style.display=idx>=0?'':'none';delete del.dataset.sure;del.textContent='Apagar';
  d.querySelectorAll('.pd-ics span').forEach(x=>x.classList.toggle('on',x.dataset.ic===(p.ic||'🌀')));
  d.classList.add('on');layerPush('portalDlg',()=>portalDlgClose(true));setTimeout(()=>$('pdName').focus(),80);
}
function portalDlgClose(fromBack){$('portalDlg')?.classList.remove('on');if(!fromBack)layerPop('portalDlg')}
function portalSave(){
  const n=$('pdName').value.trim();if(!n){$('pdName').focus();return toast('Dê um nome ao portal')}
  const p={n,addr:portalDraft.addr,lat:portalDraft.lat,lon:portalDraft.lon,ic:portalDraft.ic||'🌀'};
  if(portalDraft.idx>=0)portals()[portalDraft.idx]=p;else portals().push(p);
  save();portalDlgClose();renderPortals();card(p.ic,`Portal ${portalDraft.idx>=0?'atualizado':'criado'}: ${esc(n)}`,esc(short(p.addr)),'gold');
  if(portalDraft.idx<0)S.stats.portals=(S.stats.portals||0)+1;
  if(typeof carSyncPlaces==='function')carSyncPlaces();
}
function portalEdit(i){const p=portals()[i];portalDialog(p,i)}
/* busca: portal com o nome digitado aparece primeiro */
function portalSearch(toks){
  if(!toks.length)return[];
  return portals().filter(p=>{const w=norm(p.n+' '+(p.addr||'')).split(/[^a-z0-9]+/);return toks.every(t=>w.some(x=>x.startsWith(t)))})
    .map(p=>({name:p.n,sub:'🌀 Portal · '+short(p.addr||''),lat:p.lat,lon:p.lon,ic:p.ic||'🌀',portal:1}));
}

/* Painel "Para onde, aventureiro?" como gaveta: acompanha o dedo e encaixa em
   3 alturas — escondido (só a barrinha), normal e aberto (com os Portais).
   Solta com embalo: a velocidade do gesto decide pra onde vai. */
const SHEET={st:'n',PEEK:34};
function sheetSnap(st,anim=true){
  const P=$('searchPanel');if(!P)return;
  const wasP=P.classList.contains('portals');
  if(st==='p'&&!wasP){renderPortals();P.classList.add('portals');layerPush('portals',()=>sheetSnap('n'))}
  if(st!=='p'&&wasP){P.classList.remove('portals');layerPop('portals')}
  const y=st==='h'?Math.max(0,P.offsetHeight-SHEET.PEEK):0;
  P.style.transition=anim?'transform .34s cubic-bezier(.22,1,.36,1)':'none';
  P.style.transform=y?`translateY(${y}px)`:'';
  P.classList.toggle('hid',st==='h');SHEET.st=st;
}
addEventListener('click',ev=>{if(Date.now()<(SHEET.noClickUntil||0)){ev.stopPropagation();ev.preventDefault()}},true);
(function(){
  const P=$('searchPanel');
  let y0=null,dy=0,vis0=0,hN=0,hP=0,samp=[],moved=false,tapH=false;
  const yOf=v=>hP-v;
  P.addEventListener('pointerdown',e=>{
    if(P.classList.contains('full')||e.button>0)return;
    const r=P.getBoundingClientRect(),onHandle=!!e.target.closest('.handle');
    if(!onHandle&&(e.clientY-r.top>52||e.target.closest('input,textarea,button,a')))return;
    y0=e.clientY;dy=0;moved=false;tapH=onHandle;samp=[[e.timeStamp,e.clientY]];e.preventDefault();
    try{P.setPointerCapture(e.pointerId)}catch{}
  });
  P.addEventListener('pointermove',e=>{
    if(y0==null)return;dy=e.clientY-y0;
    if(!moved){if(Math.abs(dy)<6)return;moved=true;
      // mede as duas alturas e passa a desenhar sempre a gaveta "alta", só deslocada
      const wasP=P.classList.contains('portals');
      P.style.transition='none';P.style.transform='';P.classList.remove('portals');hN=P.offsetHeight;
      renderPortals();P.classList.add('portals');hP=P.offsetHeight;
      vis0=SHEET.st==='h'?SHEET.PEEK:SHEET.st==='p'?hP:hN;
      if(!wasP)SHEET.addedP=true;
    }
    samp.push([e.timeStamp,e.clientY]);if(samp.length>5)samp.shift();
    let v=vis0-dy;
    if(v>hP)v=hP+(v-hP)*.25;            // passou do topo: resiste
    if(v<SHEET.PEEK)v=SHEET.PEEK-(SHEET.PEEK-v)*.25;
    P.style.transform=`translateY(${yOf(v)}px)`;
  });
  const end=e=>{
    if(y0==null)return;y0=null;
    if(!moved){   // toque na barrinha: escondido→normal, normal→portais, portais→normal
      if(e&&e.type==='pointerup'&&tapH)sheetSnap(SHEET.st==='h'?'n':SHEET.st==='n'?'p':'n');
      return;
    }
    // o "clique" que o navegador solta no fim do arrasto não pode abrir a busca nem tocar em nada
    SHEET.noClickUntil=Date.now()+350;
    const a=samp[0],b=samp[samp.length-1],vel=(b[1]-a[1])/Math.max(1,b[0]-a[0]);   // px/ms, + = pra baixo
    const vis=vis0-dy,proj=vis-vel*220;
    const opts=[['h',SHEET.PEEK],['n',hN],['p',hP]];
    let tgt=opts.reduce((m,o)=>Math.abs(o[1]-proj)<Math.abs(m[1]-proj)?o:m);
    // um gesto não pula duas paradas de uma vez
    const cur=SHEET.st,order='hnp';
    if(Math.abs(order.indexOf(tgt[0])-order.indexOf(cur))>1)tgt=opts[1];
    P.style.transition='transform .34s cubic-bezier(.22,1,.36,1)';
    P.style.transform=`translateY(${yOf(tgt[1])}px)`;
    const fin=()=>{P.removeEventListener('transitionend',fin);clearTimeout(t);
      P.style.transition='none';
      if(tgt[0]==='p'){P.style.transform='';if(cur!=='p')layerPush('portals',()=>sheetSnap('n'))}
      else{P.classList.remove('portals');if(cur==='p')layerPop('portals');
        P.style.transform=tgt[0]==='h'?`translateY(${Math.max(0,P.offsetHeight-SHEET.PEEK)}px)`:''}
      P.classList.toggle('hid',tgt[0]==='h');SHEET.st=tgt[0];
    };
    const t=setTimeout(fin,400);P.addEventListener('transitionend',fin);
  };
  P.addEventListener('pointerup',end);P.addEventListener('pointercancel',end);
  // escondida: se o conteúdo mudar de altura, continua mostrando só a barrinha
  try{new ResizeObserver(()=>{if(SHEET.st==='h'&&y0==null)sheetSnap('h',false)}).observe(P)}catch{}
})();
