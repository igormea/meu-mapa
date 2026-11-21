'use strict';
/* ── HERÓI NO MAPA ───────────────────────────────────── */
let player=null,prevDraw=null,mvAnim=0;
function ensurePlayer(lat,lon){
  if(player)return;
  player=addMk(`<div class="pl"><div class="pl-ring"></div><div class="spr sp" id="plSpr">${spriteSVG(S.cls)}</div><div class="pl-lv" id="plLv">Nv ${S.lvl}</div></div>`,lat,lon,'bottom');
  player.getElement().style.zIndex=10;
  drawPet();
}
// move o herói suavemente (mesma duração da câmera → fica parado na tela)
// ganchos do herói 3D (js/hero3d.js)
window.__heroPos=()=>player?player.getLngLat():null;
window.__heroCls=()=>S.cls;
window.__heroBusy=()=>isNav;
const hero3d=(fn,...a)=>{try{window.Hero3D?.[fn](...a)}catch{}};
function movePlayer(lat,lon,dur){
  cancelAnimationFrame(mvAnim);
  const a=player.getLngLat(),t0=performance.now();
  if(!dur||hav(a.lat,a.lng,lat,lon)>2000){player.setLngLat([lon,lat]);return}
  const st=now=>{const k=Math.min(1,(now-t0)/dur);player.setLngLat([a.lng+(lon-a.lng)*k,a.lat+(lat-a.lat)*k]);if(k<1)mvAnim=requestAnimationFrame(st)};
  mvAnim=requestAnimationFrame(st);
}
function floatTxt(t,k){const el=player?.getElement()?.querySelector('.pl');if(!el)return;const f=document.createElement('div');f.className='float '+k;f.textContent=t;el.appendChild(f);setTimeout(()=>f.remove(),1700)}

/* ── HUD ─────────────────────────────────────────────── */
function hud(){
  const mx=maxHP();if(S.hp==null)S.hp=mx;
  const hpP=Math.min(100,S.hp/mx*100)+'%',xpP=Math.min(100,S.xp/needXP(S.lvl)*100)+'%';
  $('hudName').textContent=S.name;$('hudSub').textContent=`Nv ${S.lvl} · ${cls().nome}`;
  $('hudHp').style.width=hpP;$('hudXp').style.width=xpP;$('hudGold').textContent='🪙 '+fmtN(S.gold);
  $('nbXpBar').style.width=xpP;$('nbHpBar').style.width=hpP;$('nbLv').textContent='Nv '+S.lvl;
  $('nbKills').textContent='⚔️ '+(T?T.kills:0);
  const lv=$('plLv');if(lv)lv.textContent='Nv '+S.lvl;
  $('muteBtn').textContent=S.mute?'🔇':S.less?'🔉':'🔊';
  const tp=talentPoints(),hp=$('hudPts');if(hp){hp.textContent=tp;hp.style.display=tp?'flex':'none'}
}
function refreshAll(){
  hud();$('hudAva').innerHTML=spriteSVG(S.cls);
  const p=$('plSpr');if(p)p.innerHTML=spriteSVG(S.cls);
  renderRecents();applyTheme();
  hero3d('setClass',S.cls);
}
