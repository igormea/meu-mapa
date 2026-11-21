'use strict';
/* ── INÍCIO ──────────────────────────────────────────── */
ensureDaily();applyTheme();setInterval(applyTheme,300000);
setInterval(()=>{regen();hud()},10000);
if('speechSynthesis' in window)speechSynthesis.getVoices();
panel('search');
if(!S.cls)openClassSel();else{refreshAll();startGPS()}
checkPermsAtStart();
if(!(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission))startSensors();
document.addEventListener('click',()=>startSensors(),{once:true});
