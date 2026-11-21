'use strict';
/* ── GPS ─────────────────────────────────────────────── */
let watchId=null,lastFix=null,lastPos=null,followIdle=true,gpsDenied=false;
/* ── SENSORES DO CELULAR ─────────────────────────────────
   Bússola: direção quando você está parado ou a pé (o GPS só sabe a
   direção quando você já está andando). No carro, depois de dirigir,
   mantém a última direção do GPS (a bússola sofre com o metal do carro).
   Acelerômetro: detecta se o celular está parado de verdade, pra travar
   a posição e o herói não "dançar" no semáforo. */
let compass=null,compassT=0,lastCourse=null,lastFastT=0,stillSince=0,motionOk=false;
const accBuf=[];
function onOri(e){
  let hd=null;
  if(e.webkitCompassHeading!=null)hd=e.webkitCompassHeading;
  else if(e.absolute&&e.alpha!=null)hd=(360-e.alpha)%360;
  if(hd==null||isNaN(hd))return;
  hd=(hd+((screen.orientation&&screen.orientation.angle)||0))%360;
  compass=compass==null?hd:(compass+angDiff(compass,hd)*.25+360)%360;compassT=Date.now();
}
function onMotion(e){
  const a=e.accelerationIncludingGravity;if(!a||a.x==null)return;motionOk=true;
  accBuf.push(Math.hypot(a.x,a.y,a.z));if(accBuf.length>40)accBuf.shift();
  if(accBuf.length<20)return;
  const m=accBuf.reduce((s,v)=>s+v,0)/accBuf.length,sd=Math.sqrt(accBuf.reduce((s,v)=>s+(v-m)**2,0)/accBuf.length);
  if(sd<.12){if(!stillSince)stillSince=Date.now()}else stillSince=0;
}
const isStill=()=>motionOk&&stillSince&&Date.now()-stillSince>2500;
let sensorsOn=false;
async function startSensors(){
  if(sensorsOn)return;sensorsOn=true;
  try{if(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission)await DeviceOrientationEvent.requestPermission()}catch{}
  try{if(typeof DeviceMotionEvent!=='undefined'&&DeviceMotionEvent.requestPermission)await DeviceMotionEvent.requestPermission()}catch{}
  if('ondeviceorientationabsolute' in window)window.addEventListener('deviceorientationabsolute',onOri,true);
  else window.addEventListener('deviceorientation',onOri,true);
  window.addEventListener('devicemotion',onMotion,true);
}
// melhor direção disponível agora
function bestHeading(f){
  if(f&&f.hdg!=null&&!isNaN(f.hdg)&&f.spd>1.5)return f.hdg;
  if(lastCourse!=null&&Date.now()-lastFastT<120000)return lastCourse;   // estava dirigindo: mantém
  if(compass!=null&&Date.now()-compassT<3000)return compass;
  return null;
}

/* ── SEM SINAL DE GPS (túnel, viaduto) ───────────────────
   Se o GPS some durante a navegação, o herói continua andando pela rota
   na última velocidade conhecida por até 60 s. */
let lastRealT=0,lastRealSpd=0,drProg=null;
setInterval(()=>{
  if(!isNav||!R||sim||!lastRealT)return;
  const gap=Date.now()-lastRealT;
  if(gap<3500||gap>60000||lastRealSpd<3){if(drProg!=null&&gap<3500){drProg=null;$('drBadge').style.display='none'}return}
  if(drProg==null)drProg=R.prog||0;
  drProg=Math.min(R.total,drProg+lastRealSpd);
  const p=pointAt(R,drProg),p2=pointAt(R,Math.min(R.total,drProg+10));
  $('drBadge').style.display='block';
  onFix({lat:p[0],lon:p[1],acc:15,spd:lastRealSpd,hdg:bearing(p,p2),t:Date.now(),dr:true});
},1000);

let bgWatch=null;
async function startBgGPS(){
  if(!NATIVE||bgWatch)return;
  try{
    bgWatch=await NAT.bg.addWatcher({backgroundTitle:'Ranvus Maps — jornada em andamento',backgroundMessage:'Seu herói continua te guiando',
      requestPermissions:true,stale:false,distanceFilter:0},(loc,err)=>{
      if(err){if(err.code==='NOT_AUTHORIZED')toast('📍 Permita a localização nas configurações do app',4000);return}
      if(!loc)return;lastRealT=Date.now();lastRealSpd=loc.speed||0;
      if(!sim)onFix({lat:loc.latitude,lon:loc.longitude,acc:loc.accuracy,spd:loc.speed,hdg:loc.bearing,t:Date.now()});
    });
    if(watchId!=null){navigator.geolocation.clearWatch(watchId);watchId=null}
  }catch{bgWatch=null}
}
async function stopBgGPS(){
  if(!bgWatch)return;const id=bgWatch;bgWatch=null;
  try{await NAT.bg.removeWatcher({id})}catch{}
  startGPS();
}
function startGPS(){
  if(watchId!=null||!navigator.geolocation)return;
  watchId=navigator.geolocation.watchPosition(p=>{
    gpsDenied=false;
    lastRealT=Date.now();lastRealSpd=p.coords.speed||0;
    if(!sim)onFix({lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy,spd:p.coords.speed,hdg:p.coords.heading,t:Date.now()});
  },e=>{
    if(e.code===1){gpsDenied=true;toast('📍 Permita a localização para o herói te acompanhar',4000)}
  },{enableHighAccuracy:true,maximumAge:1000,timeout:15000});
}
function onFix(f){
  const first=!lastFix;
  // celular parado de verdade (acelerômetro) + GPS dizendo que andou pouco = oscilação → trava
  if(!f.dr&&lastFix&&isStill()&&(f.spd==null||f.spd<1)&&hav(lastFix.lat,lastFix.lon,f.lat,f.lon)<40){f={...f,lat:lastFix.lat,lon:lastFix.lon,spd:0}}
  if(!sim&&!f.dr)lastFix=f;
  if(f.hdg!=null&&!isNaN(f.hdg)&&f.spd>4){lastCourse=f.hdg;lastFastT=Date.now()}
  regen();
  let moved=false;
  if(lastPos){
    const d=hav(lastPos.lat,lastPos.lon,f.lat,f.lon);
    if(d>=800)lastPos=f;
    else if(((f.spd!=null&&f.spd>1)||d>Math.max(10,f.acc||20))&&(f.acc||0)<60){addDistance(d);lastPos=f;moved=true}
  }else lastPos=f;

  let lat=f.lat,lon=f.lon,brg=null;
  if(isNav&&R){
    const sn=snap(f.lat,f.lon);
    if(sn.dist<35){lat=sn.lat;lon=sn.lon;brg=sn.brg}
    navUpdate(sn,f);
  }
  if(brg==null){
    brg=bestHeading(f);
    if(brg==null&&prevDraw&&hav(prevDraw[0],prevDraw[1],lat,lon)>3)brg=bearing(prevDraw,[lat,lon]);
  }
  const dur=first||!player?0:Math.min(1500,Math.max(300,f.t-(lastDrawT||f.t)))||1000;lastDrawT=f.t;
  ensurePlayer(lat,lon);movePlayer(lat,lon,dur);
  const spr=$('plSpr');
  if(spr){
    const walking=f.spd!=null?f.spd>.7:(moved||(prevDraw&&hav(prevDraw[0],prevDraw[1],lat,lon)>2));
    spr.classList.toggle('walk',!!walking);
    if(brg!=null){const rel=((brg-map.getBearing())%360+360)%360;spr.classList.toggle('flip',rel>180)}
  }
  hero3d('setMotion',brg,f.spd!=null?f.spd:(moved?1.2:0));
  if(isNav)follow(lat,lon,brg,f.spd,dur);
  else if(followIdle&&Date.now()>camBusyUntil){if(first)map.jumpTo({center:[lon,lat],zoom:16});else map.easeTo({center:[lon,lat],duration:dur,easing:t=>t})}
  prevDraw=[lat,lon];
  if(!f.dr&&!sim)visitCell(f.lat,f.lon,f.acc);
  bossCheck(lat,lon);
  hud();if(!isNav)save();
}
