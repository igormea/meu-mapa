'use strict';
/* versão: MAIOR.MENOR.CORREÇÃO — correção 1.18.0→1.18.1 · novidade →1.19.0 · incompatível com a anterior →2.0.0 */
const APPV='1.23.0';
/* ═══════════════════════════════════════════════════════
   MEU MAPA RPG — v4
   Tiles OSM (estilizados) · Nominatim · OSRM · GPS
═══════════════════════════════════════════════════════ */
const $=id=>document.getElementById(id);
/* ── UTIL ────────────────────────────────────────────── */
function hav(la1,lo1,la2,lo2){const R=6371000,r=Math.PI/180;const a=Math.sin((la2-la1)*r/2)**2+Math.cos(la1*r)*Math.cos(la2*r)*Math.sin((lo2-lo1)*r/2)**2;return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}
function bearing(a,b){const r=Math.PI/180,y=Math.sin((b[1]-a[1])*r)*Math.cos(b[0]*r),x=Math.cos(a[0]*r)*Math.sin(b[0]*r)-Math.sin(a[0]*r)*Math.cos(b[0]*r)*Math.cos((b[1]-a[1])*r);return(Math.atan2(y,x)/r+360)%360}
function fmtD(m){if(m<1000)return Math.round(m/10)*10+' m';return(m/1000).toFixed(m<10000?1:0).replace('.',',')+' km'}
function fmtT(s){const m=Math.max(1,Math.round(s/60));if(m<60)return m+' min';return Math.floor(m/60)+'h'+String(m%60).padStart(2,'0')}
function etaHM(s){const d=new Date(Date.now()+s*1000);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function fmtSpeech(m){return m<1000?`${Math.round(m/50)*50} metros`:`${(m/1000).toFixed(1).replace('.',',')} quilômetros`}
const short=n=>String(n||'').split(',')[0];
function today(){const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
let _tt;function toast(msg,ms=2600){const el=$('toast');el.textContent=msg;el.classList.add('on');clearTimeout(_tt);_tt=setTimeout(()=>el.classList.remove('on'),ms)}
// retrato 3D (PNG) com o boneco pixelado de reserva se a imagem não carregar
function heroPic(cls,cl='ptr'){return `<img class="${cl}" src="models/portraits/${cls||'cavaleiro'}.png" alt="" onerror="this.remove()"><span class="ptr-fb">${spriteSVG(cls)}</span>`}
const monPic=k=>`<img class="ci" src="models/portraits/${k}.png" alt="">`;
function card(e,t,s='',k=''){
  const f=$('feed');const el=document.createElement('div');el.className='card '+k;
  el.innerHTML=`<div class="ce">${e}</div><div><div class="ct">${t}</div>${s?`<div class="cs">${s}</div>`:''}</div>`;
  f.appendChild(el);while(f.children.length>3)f.firstChild.remove();
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),400)},3600);
}
// kind: 'nav' (instruções), 'alert' (segurança), 'fun' (jogo). "Menos falante" corta só o 'fun'.
// cala na hora (voz nativa do Android e do navegador)
function stopVoice(){try{if(NATIVE&&NAT?.tts)NAT.tts.stop().catch(()=>{})}catch{};try{speechSynthesis.cancel()}catch{}}
function speak(t,kind='fun'){
  if(S.mute)return;if(S.less&&kind==='fun')return;
  if(NATIVE){NAT.tts.speak({text:t,lang:'pt-BR',rate:1.0,volume:1.0,category:'playback'}).catch(()=>{});return}
  if(!('speechSynthesis' in window))return;
  try{const u=new SpeechSynthesisUtterance(t);u.lang='pt-BR';u.rate=1.05;
    const v=speechSynthesis.getVoices().find(v=>(v.lang||'').toLowerCase().startsWith('pt'));if(v)u.voice=v;
    speechSynthesis.speak(u)}catch{}
}
