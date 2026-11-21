'use strict';
/* ── MUNDO: CHEFES DE FORTALEZA, MISSÕES SEMANAIS, NÉVOA ──── */

// Chefes lendários em pontos conhecidos (posições aproximadas; luta ao passar a ~250 m)
const BOSSES=[
  {id:'dragao',  n:'Dragão do Mar',                 e:'🐉',lat:-3.7223,lon:-38.5197},
  {id:'ponte',   n:'Fantasma da Ponte dos Ingleses',e:'👻',lat:-3.7195,lon:-38.5121},
  {id:'catedral',n:'Gárgula da Catedral',           e:'🦇',lat:-3.7231,lon:-38.5270},
  {id:'kraken',  n:'Kraken da Beira-Mar',           e:'🦑',lat:-3.7245,lon:-38.4960},
  {id:'farol',   n:'Sentinela do Farol',            e:'🏮',lat:-3.7142,lon:-38.4778},
  {id:'coco',    n:'Ent do Cocó',                   e:'🌳',lat:-3.7455,lon:-38.4870},
  {id:'castelao',n:'Titã do Castelão',              e:'🗿',lat:-3.8072,lon:-38.5224},
  {id:'sabiagu', n:'Serpente das Dunas',            e:'🐍',lat:-3.7860,lon:-38.4330},
];
const BOSS_R=250;
function weekKey(d=new Date()){
  const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=(t.getUTCDay()+6)%7;
  t.setUTCDate(t.getUTCDate()-day+3);const y0=new Date(Date.UTC(t.getUTCFullYear(),0,4));
  return t.getUTCFullYear()+'-S'+(1+Math.round(((t-y0)/864e5-3+((y0.getUTCDay()+6)%7))/7));
}
const WQ=[
  {id:'km',   t:'Percorra 50 km',            goal:50, xp:600,gold:150,u:'km'},
  {id:'kills',t:'Derrote 80 monstros',       goal:80, xp:500,gold:180,u:''},
  {id:'boss', t:'Derrote 1 chefe lendário',  goal:1,  xp:400,gold:200,u:''},
  {id:'cells',t:'Descubra 25 áreas novas',   goal:25, xp:350,gold:120,u:''},
];
function ensureWeek(){const k=weekKey();if(!S.week||S.week.key!==k)S.week={key:k,km:0,kills:0,boss:0,cells:0,claimed:[]}}
function weekAdd(id,n){ensureWeek();S.week[id]=(S.week[id]||0)+n;checkWeek()}
function checkWeek(){
  ensureWeek();
  for(const q of WQ){if(!S.week.claimed.includes(q.id)&&S.week[q.id]>=q.goal){
    S.week.claimed.push(q.id);const k=1+.15*(S.lvl-1);
    const x=rawXP(Math.round(q.xp*k)),g=gainGold(q.gold*k);
    card('🏆','Missão semanal concluída!',`${q.t} · <b>+${x} XP</b> · <b>+${g} 🪙</b>`,'epic');
  }}
}

/* chefes: marcadores no mapa + luta automática ao passar perto */
let bossMks=[],bossTry={};
function drawBosses(){
  bossMks.forEach(m=>m.remove());bossMks=[];
  const wk=weekKey();
  for(const b of BOSSES){
    const done=S.bosses?.[b.id]===wk;
    bossMks.push(addMk(`<div class="boss ${done?'done':''}"><span>${b.e}</span><i>${esc(b.n)}${done?' ✔':''}</i></div>`,b.lat,b.lon,'bottom'));
  }
}
function bossCheck(lat,lon){
  if(simSnap&&!isNav)return;
  const wk=weekKey();
  for(const b of BOSSES){
    if(S.bosses?.[b.id]===wk)continue;
    if(bossTry[b.id]&&Date.now()-bossTry[b.id]<30*60000)continue;
    if(hav(lat,lon,b.lat,b.lon)>BOSS_R)continue;
    bossTry[b.id]=Date.now();bossFight(b);break;
  }
}
function bossFight(b){
  // força calculada a partir do herói: ~6 golpes para vencer, ~10 golpes para perder (com vida cheia)
  const L=S.lvl+2,dmg=maxHP()/rnd(9,11);
  const m={n:b.n,e:b.e,t:5,lvl:L,elite:true,hp:Math.round(atk()*rnd(5,6.5)),atk:dmg+def()*.7,
    xp:Math.round((8+L*3)*12),gold:Math.round((2+L*1.5)*10)};
  const res=fight(m);
  if(res.win){
    S.hp=Math.max(1,Math.round(res.php));
    S.bosses=S.bosses||{};S.bosses[b.id]=weekKey();S.bossEver=S.bossEver||{};S.bossEver[b.id]=(S.bossEver[b.id]||0)+1;S.stats.bosses=(S.stats.bosses||0)+1;
    const x=gainXP(m.xp),g=gainGold(m.gold);
    card(b.e,`Chefe lendário derrotado: ${b.n}!`,`<b>+${x} XP</b> · <b>+${g} 🪙</b>`,'epic');
    speak(`Chefe lendário derrotado: ${b.n}!`,'fun');
    handleItem(makeItem(Math.max(2,rollRar(.3))));
    weekAdd('boss',1);
  }else{
    S.hp=Math.round(maxHP()*.35);
    card(b.e,`${b.n} resistiu!`,'Fique mais forte e volte daqui a 30 min','lose');
  }
  checkAch();drawBosses();hud();save();
}

/* névoa de exploração: a cidade começa coberta e vai se revelando por onde você passa */
const FOG_CELL=.0025;            // ~275 m
let cellSet=null,fogTmr=0,lastCellFloat=0;
function cellKey(lat,lon){return Math.floor(lat/FOG_CELL)+':'+Math.floor(lon/FOG_CELL)}
function ensureCells(){if(!cellSet)cellSet=new Set(S.cells||[])}
function visitCell(lat,lon,acc){
  if(simSnap||(acc&&acc>50))return;
  ensureCells();const k=cellKey(lat,lon);if(cellSet.has(k))return;
  cellSet.add(k);S.cells=[...cellSet];
  S.stats.cells=(S.stats.cells||0)+1;
  if(S.stats.cells>1){const x=rawXP(3);if(Date.now()-lastCellFloat>4000){floatTxt(`🗺️ +${x}`,'xp');lastCellFloat=Date.now()}}
  weekAdd('cells',1);scheduleFog();
}
function scheduleFog(){clearTimeout(fogTmr);fogTmr=setTimeout(drawFog,400)}
function drawFog(){
  const src=map.getSource('fog');if(!src)return;
  const on=S.fog!==false&&!isNav&&map.getZoom()>=12.5;
  map.setLayoutProperty('fog','visibility',on?'visible':'none');
  if(!on)return;
  ensureCells();
  const b=map.getBounds(),la0=Math.floor(b.getSouth()/FOG_CELL),la1=Math.floor(b.getNorth()/FOG_CELL);
  const lo0=Math.floor(b.getWest()/FOG_CELL),lo1=Math.floor(b.getEast()/FOG_CELL);
  if((la1-la0+1)*(lo1-lo0+1)>9000){map.setLayoutProperty('fog','visibility','none');return}
  const feats=[];
  for(let i=la0;i<=la1;i++)for(let j=lo0;j<=lo1;j++){
    if(cellSet.has(i+':'+j))continue;
    const y0=i*FOG_CELL,y1=y0+FOG_CELL,x0=j*FOG_CELL,x1=x0+FOG_CELL;
    feats.push({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]}});
  }
  src.setData({type:'FeatureCollection',features:feats});
}
map.on('moveend',()=>{if(!isNav)scheduleFog()});
// nomes dos chefes só com o mapa aproximado (evita amontoado)
const zoomCls=()=>document.body.classList.toggle('far',map.getZoom()<15);
map.on('zoomend',zoomCls);map.once('load',zoomCls);
