'use strict';
/* ── PORTAIS (endereços salvos) ──────────────────────────────
   Puxe a barrinha da busca pra cima: aparecem seus Portais (nome + endereço).
   Tocou num portal, a rota é traçada. Dá pra criar (pela busca, pela prévia da rota ou "onde estou"),
   renomear e apagar. Buscar pelo nome ("irmão") também acha o portal. */
const PICONS=['🌀','🏠','👪','❤️','🍔','🏋️','🛒','⛪','🎓','🏥','⚽','🏖️','🍻','🎮','💈','🐾'];
let portalPick=false,portalDraft=null;
function portals(){return S.portals=S.portals||[]}

/* painel expandido */
function portalsOpen(on,fromBack){
  const p=$('searchPanel');if(p.classList.contains('portals')===on)return;
  p.classList.toggle('portals',on);
  if(on){renderPortals();layerPush('portals',()=>portalsOpen(false,true))}else if(!fromBack)layerPop('portals');
}
function renderPortals(){
  const L=portals(),c=searchCenter();
  $('portalList').innerHTML=L.length?L.map((p,i)=>`<div class="ptl" data-i="${i}">
      <span class="pt-ic">${p.ic||'🌀'}</span><span class="pt-tx"><b>${esc(p.n)}</b><small>${esc(short(p.addr||''))} · ${fmtD(hav(c.lat,c.lon,p.lat,p.lon))}</small></span>
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

/* barrinha: puxar pra cima abre os portais, pra baixo fecha; tocar alterna */
(function(){
  const h=$('searchPanel').querySelector('.handle');let y0=null,moved=0;
  h.addEventListener('pointerdown',e=>{y0=e.clientY;moved=0;try{h.setPointerCapture(e.pointerId)}catch{}});
  h.addEventListener('pointermove',e=>{if(y0!=null)moved=e.clientY-y0});
  const end=()=>{if(y0==null)return;y0=null;const open=$('searchPanel').classList.contains('portals');
    if(moved<-30)portalsOpen(true);else if(moved>30)portalsOpen(false);else if(Math.abs(moved)<8)portalsOpen(!open)};
  h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end);
})();
