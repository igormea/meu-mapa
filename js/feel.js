'use strict';
/* ── SENSAÇÃO DE TOQUE ─────────────────────────────────────
   1) Tudo que é clicável "afunda" de leve ao tocar e volta com um quique curto.
   2) Ações que falam com o servidor (amizade, guilda, trocas...) mostram que estão
      trabalhando enquanto esperam e dão um brilho verde quando dão certo.          */
(function(){
  const SEL='button,.btn,a,[onclick],.ptl,.aci,#modeRow span,.rc,.fav,.chip,.tab,[role=button],.hud-click';
  let cur=null,t0=0;
  const up=()=>{if(!cur)return;const el=cur;cur=null;const wait=Math.max(0,90-(Date.now()-t0));
    setTimeout(()=>{el.classList.remove('prs');el.classList.add('rel');setTimeout(()=>el.classList.remove('rel'),220)},wait)};
  addEventListener('pointerdown',e=>{
    const el=e.target.closest?.(SEL);if(!el||el.disabled||el.closest('.maplibregl-marker,#map'))return;
    cur=el;t0=Date.now();el.classList.remove('rel');el.classList.add('prs');
  },{passive:true,capture:true});
  addEventListener('pointerup',up,{passive:true,capture:true});
  addEventListener('pointercancel',up,{passive:true,capture:true});
  // arrastou o dedo pra fora (rolando uma lista): solta sem "clicar"
  addEventListener('pointermove',e=>{if(cur&&!cur.contains(document.elementFromPoint(e.clientX,e.clientY)))up()},{passive:true,capture:true});
})();

let lastTap=null;
addEventListener('click',e=>{lastTap=e.target.closest?.('button,.btn,a,[onclick]')||null;setTimeout(()=>{lastTap=null},0)},true);
function busyWrap(fn){
  return async function(...args){
    const el=lastTap;
    if(el){el.classList.add('busy');el.setAttribute('aria-busy','true')}
    let ok=true;
    try{return await fn.apply(this,args)}catch(e){ok=false;throw e}
    finally{if(el){el.classList.remove('busy');el.removeAttribute('aria-busy');
      if(ok&&el.isConnected){el.classList.add('okf');setTimeout(()=>el.classList.remove('okf'),700)}}}
  };
}
['raidStart','socDeleteAccount','socSetNick','socAddFriend','socAccept','socRemove','guildCreate','guildInvite','guildJoin',
 'guildDecline','guildKick','guildLead','guildLeave','socRefresh','tradeSend','tradeAccept','tradeDecline']
  .forEach(n=>{if(typeof window[n]==='function')window[n]=busyWrap(window[n])});
