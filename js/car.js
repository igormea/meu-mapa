'use strict';
/* ═════ ANDROID AUTO ═════
   O celular continua fazendo tudo (GPS, rota, voz, RPG); a tela do carro mostra mapa, rota, próxima manobra,
   chegada, velocidade e limite. No carro: "Destinos" lista seus Portais e destinos recentes;
   escolheu, a rota começa sozinha (com a contagem de sempre). "Encerrar" para a navegação.
   Só funciona no APK (plugin nativo RanvusCar). Personagens e lutas não aparecem no carro (regras de distração). */
const CAR={on:false,routeSent:null,lastPos:0,lastNav:0};
const carPlug=()=>NAT&&NAT.car;

function carPlaces(){
  const P=(typeof portals==='function'?portals():[]).map(p=>({name:`${p.icon||'🌀'} ${p.name}`,sub:p.addr||p.sub||'',lat:p.lat,lon:p.lon}));
  const R=(S.recents||[]).filter(r=>typeof r.lat==='number').map(r=>({name:`🕘 ${short(r.name)}`,sub:r.sub||'',lat:r.lat,lon:r.lon}));
  return[...P,...R].slice(0,12);
}
function carSyncPlaces(){if(carPlug())NAT.car.setPlaces({places:carPlaces()}).catch(()=>{})}

// a cada posição/passo da navegação (no máx. 1x por segundo; manobra nova vai na hora)
function carUpdate(f,nav){
  if(!carPlug()||!CAR.on)return;
  const now=Date.now();
  if(!nav&&now-CAR.lastPos<1000)return;
  CAR.lastPos=now;
  const msg={pos:{lat:f.lat,lon:f.lon,hdg:(f.hdg!=null&&!isNaN(f.hdg))?f.hdg:(typeof lastCourse!=='undefined'&&lastCourse!=null?lastCourse:0),spd:f.spd||0},
    hero:{cls:S.cls,lvl:S.lvl},nav:nav||{active:false}};
  if(nav&&R&&CAR.routeSent!==R){CAR.routeSent=R;msg.route=carRoute(R)}
  NAT.car.update(msg).catch(()=>{});
}
// rota simplificada (até ~600 pontos) pra desenhar na tela do carro
function carRoute(Rt){
  const c=Rt.coords||[],st=Math.max(1,Math.ceil(c.length/600));
  return c.filter((_,i)=>i%st===0||i===c.length-1).map(p=>[+p[0].toFixed(6),+p[1].toFixed(6)]);
}
// chamado pela navegação com o passo atual
function carNav(f,st,dn,inst,rem,remT,lim,prog){
  if(!CAR.on)return;
  carUpdate(f,{active:true,cue:inst,road:st.name||st.ref||'',type:st.type||'',mod:st.mod||'',exit:st.exit||0,
    dist:Math.round(dn),rem:Math.round(rem),remSec:Math.round(remT),limit:lim||0,prog:Math.round(prog),dest:dest?.name||''});
}
function carEnd(){if(carPlug()&&CAR.on){CAR.routeSent=null;NAT.car.update({nav:{active:false}}).catch(()=>{})}}
// recados curtos do jogo na tela do carro (título do aviso, sem emojis complicados)
function carMsg(t){if(carPlug()&&CAR.on&&t)NAT.car.update({msg:String(t).replace(/<[^>]+>/g,'').slice(0,60)}).catch(()=>{})}

function carInit(){
  if(!carPlug())return;
  NAT.car.addListener('carConnected',()=>{CAR.on=true;CAR.routeSent=null;carSyncPlaces();if(lastFix)carUpdate(lastFix,null);toast('🚗 Conectado ao Android Auto')});
  NAT.car.addListener('carDisconnected',()=>{CAR.on=false});
  NAT.car.addListener('carDestination',d=>{if(!d||typeof d.lat!=='number')return;speak(`Rumo a ${String(d.name).replace(/^\S+\s/,'')}`,'nav');
    goTo({name:String(d.name).replace(/^\S+\s/,''),sub:'',lat:d.lat,lon:d.lon},true)});
  NAT.car.addListener('carStop',()=>{if(isNav)endNav(false)});
  NAT.car.status().then(s=>{if(s?.connected){CAR.on=true;carSyncPlaces()}}).catch(()=>{});
}
setTimeout(carInit,1500);
