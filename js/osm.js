'use strict';
/* ── ALERTAS NA ESTRADA ─────────────────────────────────────
   Pontos do OpenStreetMap (data/osm-ce.json, atualizado toda semana por um
   robô no GitHub) + curvas calculadas pelo desenho da rota + quedas de
   limite de velocidade (Valhalla). Cada ponto que fica NA rota vira um
   alerta com distância ao longo do caminho (cum).                        */
let OSM=null,osmIdx=null;
const OSM_CELL=0.01;   // ~1,1 km
const FEAT={
  cam:  {r:35,ic:'🗼',nome:'Torre do Vigia',  sub:f=>'Radar'+(f.lim?` · ${f.lim} km/h`:''), dist:s=>Math.max(350,s*15), fala:f=>`Radar à frente${f.lim?`, limite ${f.lim}`:''}`},
  bump: {r:14,ic:'⚠️',nome:'Armadilha',       sub:()=>'Lombada',            dist:s=>Math.max(120,s*7),  fala:()=>'Lombada à frente', minSpd:5},
  toll: {r:30,ic:'💰',nome:'Posto de Pedágio', sub:()=>'Pedágio',           dist:s=>Math.max(500,s*20), fala:()=>'Pedágio à frente'},
  rail: {r:18,ic:'🚂',nome:'Trilhos Antigos',  sub:()=>'Passagem de trem',  dist:s=>Math.max(200,s*10), fala:()=>'Passagem de trem à frente'},
  curve:{     ic:'↩️',nome:'Curva Traiçoeira', sub:()=>'Curva acentuada',   dist:s=>Math.max(150,s*8),  fala:()=>'Curva acentuada à frente', minSpd:11},
  sig:  {r:14,ic:'🚦',silent:true},
};

async function loadOSM(){
  try{
    const r=await fetch('data/osm-ce.json?v='+APPV);if(!r.ok)return;
    OSM=await r.json();osmIdx=buildOsmIdx(OSM);
    PR.forEach(attachFeats);if(R&&!PR.includes(R))attachFeats(R);
    if(PR[selIdx])drawFeats(PR[selIdx]);
  }catch{}
}
function cellOf(lat,lon){return Math.floor(lat/OSM_CELL)+':'+Math.floor(lon/OSM_CELL)}
function buildOsmIdx(d){
  const idx=new Map();
  for(const t of ['cam','bump','toll','rail','sig'])for(const p of d[t]||[]){
    const k=cellOf(p[0],p[1]);let a=idx.get(k);if(!a)idx.set(k,a=[]);a.push({t,p});
  }
  return idx;
}
// pontos do OSM que ficam em cima da rota, com a distância ao longo dela
function featsAlong(Rt){
  if(!osmIdx)return[];
  const c=Rt.coords,best=new Map(),pad=.0005;
  for(let i=0;i<c.length-1;i++){
    const a=c[i],b=c[i+1];
    const la0=Math.floor((Math.min(a[0],b[0])-pad)/OSM_CELL),la1=Math.floor((Math.max(a[0],b[0])+pad)/OSM_CELL);
    const lo0=Math.floor((Math.min(a[1],b[1])-pad)/OSM_CELL),lo1=Math.floor((Math.max(a[1],b[1])+pad)/OSM_CELL);
    for(let x=la0;x<=la1;x++)for(let y=lo0;y<=lo1;y++){
      const arr=osmIdx.get(x+':'+y);if(!arr)continue;
      for(const o of arr){
        const pr=projSeg(o.p[0],o.p[1],a,b);if(pr.d>FEAT[o.t].r)continue;
        const cum=Rt.cum[i]+(Rt.cum[i+1]-Rt.cum[i])*pr.t,prev=best.get(o);
        if(!prev||pr.d<prev.d)best.set(o,{t:o.t,cum,d:pr.d,lat:o.p[0],lon:o.p[1],lim:o.t==='cam'?(o.p[2]||0):0});
      }
    }
  }
  const out=[...best.values()].sort((x,y)=>x.cum-y.cum);
  // radares/lombadas duplicados (mesmo ponto mapeado 2x) viram um só
  return out.filter((f,i)=>!out.slice(Math.max(0,i-4),i).some(g=>g.t===f.t&&f.cum-g.cum<25));
}
// curvas fortes no meio de uma via (sem manobra perto), a partir do desenho da rota
function curvesAlong(Rt){
  const out=[],man=Rt.steps.map(s=>s.cum);
  for(let d=60;d<Rt.total-60;d+=20){
    const a=pointAt(Rt,d-40),m=pointAt(Rt,d),b=pointAt(Rt,d+40);
    if(hav(a[0],a[1],m[0],m[1])<25||hav(m[0],m[1],b[0],b[1])<25)continue;
    const turn=Math.abs(angDiff(bearing(a,m),bearing(m,b)));
    if(turn<55||man.some(x=>Math.abs(x-d)<70))continue;
    if(out.length&&d-out[out.length-1].cum<200)continue;
    out.push({t:'curve',cum:d,lat:m[0],lon:m[1],turn:Math.round(turn)});
  }
  return out;
}
function attachFeats(Rt){
  if(!Rt)return;
  Rt.feats=[...featsAlong(Rt),...curvesAlong(Rt)].sort((a,b)=>a.cum-b.cum);
}
function drawFeats(Rt){
  if(!Rt?.feats)return;let sig=0;
  for(const f of Rt.feats){
    if(f.mk||f.t==='curve'||f.passed)continue;
    if(f.t==='sig'&&++sig>150)continue;
    f.mk=addMk(`<div class="feat f-${f.t}" title="${FEAT[f.t].nome||''}">${FEAT[f.t].ic}</div>`,f.lat,f.lon,'center');
  }
}
function clearFeats(Rt){Rt?.feats?.forEach(f=>{if(f.mk){f.mk.remove();f.mk=null}})}

/* alertas durante a navegação: chamado a cada posição */
let alertShown=null;
function alertTick(prog,spd){
  if(!R)return;
  const moto=S.vehicle==='moto';let show=null;
  for(const f of R.feats||[]){
    if(f.cum<prog-15){
      if(!f.passed){f.passed=true;if(f.mk){f.mk.remove();f.mk=null}if(f.t==='cam')passedTower(f,spd)}
      continue;
    }
    const cfg=FEAT[f.t];if(cfg.silent)continue;
    const ahead=f.cum-prog;if(ahead>cfg.dist(spd)){if(ahead>2500)break;continue}
    if((cfg.minSpd&&!(moto&&f.t==='bump'))&&spd<cfg.minSpd)continue;
    if(!f.said){f.said=true;speak(cfg.fala(f),'alert')}
    if(!show)show={ic:cfg.ic,nome:cfg.nome,sub:cfg.sub(f),d:ahead,kind:f.t};
  }
  // queda do limite de velocidade à frente
  const L=R.limits,cur=limitAt(R,prog);
  if(L&&cur>0){
    const win=Math.max(300,spd*15);
    for(let i=R.limIdx||0;i<L.length;i++){
      const e=L[i];if(e.a<=prog)continue;if(e.a-prog>win)break;
      if(e.v>0&&e.v<cur){
        const key='lim'+Math.round(e.a);
        if(!R.ann[key]){R.ann[key]=1;speak(`Limite reduz para ${e.v} em ${Math.max(50,Math.round((e.a-prog)/50)*50)} metros`,'alert')}
        if(!show||e.a-prog<show.d)show={ic:`<span class="mini-lim">${e.v}</span>`,nome:'Limite reduz',sub:`para ${e.v} km/h`,d:e.a-prog,kind:'lim'};
        break;
      }
      if(e.v>0)break;
    }
  }
  renderAlert(show);
}
function renderAlert(a){
  const el=$('alertBar');
  if(!a){if(alertShown){el.classList.remove('on');alertShown=null}return}
  el.innerHTML=`<span class="ab-ic">${a.ic}</span><span class="ab-tx"><b>${a.nome}</b> · ${a.sub}</span><span class="ab-d">${fmtD(a.d)}</span>`;
  el.className='on k-'+a.kind;alertShown=a.kind;
}
// passou pela torre (radar) dentro do limite → bônus por dirigir certo
function passedTower(f,spd){
  const lim=f.lim||limitAt(R,f.cum);const kmh=spd*3.6;
  if(lim>0&&kmh<=lim+2){const x=rawXP(5+S.lvl);card('🗼','Passou pela Torre do Vigia sem ser visto',`Dentro do limite · <b>+${x} XP</b>`,'gold')}
  else if(lim>0)card('🗼','A Torre do Vigia te avistou!',`${Math.round(kmh)} km/h num trecho de ${lim}`,'lose');
}
