'use strict';
/* ── CÂMERA ──────────────────────────────────────────── */
/* Câmera de navegação estilo Waze: inclinada (3D), girando com você,
   herói na parte de baixo da tela olhando pra frente. */
const NAV_PITCH=62;
let followPaused=false,resumeTmr=null,camBrg=null,camZoom=17.5,camBusyUntil=0,lastDrawT=0;
function navZoom(spd){const kmh=(spd||0)*3.6;return kmh>90?16:kmh>60?16.6:kmh>30?17.1:17.6}
function angDiff(a,b){return((b-a+540)%360)-180}
function follow(lat,lon,brg,spd,dur=1000){
  if(followPaused||Date.now()<camBusyUntil)return;
  if(brg!=null)camBrg=camBrg==null?brg:(camBrg+angDiff(camBrg,brg)*.55+360)%360;
  camZoom+=(navZoom(spd)-camZoom)*.15;
  map.easeTo({center:[lon,lat],zoom:camZoom,pitch:NAV_PITCH,bearing:camBrg??map.getBearing(),
    offset:[0,map.getContainer().clientHeight*.2],duration:dur,easing:t=>t});
}
function enterNavCamera(lat,lon,brg){
  camBrg=brg;camZoom=17.5;camBusyUntil=Date.now()+2400;
  map.flyTo({center:[lon,lat],zoom:camZoom,pitch:NAV_PITCH,bearing:brg||0,
    offset:[0,map.getContainer().clientHeight*.2],duration:2300,curve:1.2});
}
function exitNavCamera(lat,lon){
  camBrg=null;camBusyUntil=Date.now()+1400;
  map.easeTo({center:lat!=null?[lon,lat]:map.getCenter(),zoom:16,pitch:0,bearing:0,offset:[0,0],duration:1200});
}
function userMoved(e){
  if(!e.originalEvent)return;
  stopCountdown();
  if(isNav){followPaused=true;$('recenterBtn').style.display='block';clearTimeout(resumeTmr);resumeTmr=setTimeout(resumeFollow,15000)}
  else followIdle=false;
}
['dragstart','rotatestart','pitchstart','zoomstart'].forEach(ev=>map.on(ev,userMoved));
function resumeFollow(){followPaused=false;$('recenterBtn').style.display='none';clearTimeout(resumeTmr);if(prevDraw)follow(prevDraw[0],prevDraw[1],camBrg,0,800)}
function locateMe(){
  if(isNav)return resumeFollow();
  followIdle=true;
  if(lastFix)return map.easeTo({center:[lastFix.lon,lastFix.lat],zoom:17,pitch:0,bearing:0,duration:800});
  if(!navigator.geolocation)return toast('GPS indisponível');
  startGPS();toast('📍 Procurando você…');
}
function toggleMute(){S.mute=!S.mute;if(S.mute)try{speechSynthesis.cancel()}catch{};hud();save();toast(S.mute?'🔇 Voz desligada':'🔊 Voz ligada')}
