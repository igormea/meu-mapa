'use strict';
/* ── INÍCIO ──────────────────────────────────────────── */
ensureDaily();applyTheme();setInterval(applyTheme,300000);
setInterval(()=>{regen();hud()},10000);
if('speechSynthesis' in window)speechSynthesis.getVoices();
panel('search');
if(!S.cls)openClassSel();else{refreshAll();startGPS()}
checkPermsAtStart();
ensureWeek();renderFav();loadOSM();
mapReady.then(()=>{drawBosses();drawDungeons();scheduleFog()});
renderEnv();
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
if(!(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission))startSensors();
document.addEventListener('click',()=>startSensors(),{once:true});

/* botões laterais (◎ 🔇) e "recentralizar" sempre logo acima do painel de baixo que estiver aberto */
(function(){
  const ids=['searchPanel','routePanel','arrivePanel','navBottom'];
  const upd=()=>{let top=innerHeight;for(const id of ids){const e=document.getElementById(id);if(!e)continue;
      const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')continue;const r=e.getBoundingClientRect();
      if(r.height>0&&r.bottom>=innerHeight-2&&r.top<top)top=r.top}
    document.documentElement.style.setProperty('--pb',Math.max(0,Math.round(innerHeight-top))+'px')};
  let q=0;const sch=()=>{if(!q)q=requestAnimationFrame(()=>{q=0;upd()})};
  const ro=new ResizeObserver(sch),mo=new MutationObserver(sch);
  ids.forEach(id=>{const e=document.getElementById(id);if(e){ro.observe(e);mo.observe(e,{attributes:true,attributeFilter:['style','class']});
    e.addEventListener('animationend',sch);e.addEventListener('transitionend',sch)}});
  mo.observe(document.body,{attributes:true,attributeFilter:['class']});
  addEventListener('resize',sch);upd();
})();

// janelas com a barrinha no topo fecham arrastando pra baixo
dragToClose($('sheetBox'),()=>closeSheet());
dragToClose($('stopPanel'),()=>closeStops());
