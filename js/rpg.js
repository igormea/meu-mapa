'use strict';
/* ── MECÂNICAS DE RPG ─────────────────────────────────────────
   Talentos · habilidades de classe · companheiro · regiões · clima real
   · masmorras · conjuntos de equipamento.
   Regra de ouro: nada exige tocar na tela dirigindo. Escolhas (talentos)
   são feitas parado, na ficha; o resto acontece sozinho.               */

/* ═════ TALENTOS ═════ 1 ponto por nível; k = atributo que melhora; per = bônus por ponto */
const TAL={
  forca:    {n:'Força',            ic:'💪',k:'atk',  per:.04,max:5,d:'+4% de ataque'},
  vigor:    {n:'Vigor',            ic:'❤️',k:'hp',   per:.06,max:5,d:'+6% de vida'},
  ferro:    {n:'Pele de Ferro',    ic:'🛡️',k:'def',  per:.05,max:5,d:'+5% de defesa'},
  sorte:    {n:'Sorte',            ic:'🍀',k:'crit', per:.02,max:5,d:'+2% de chance de crítico'},
  ganancia: {n:'Ganância',         ic:'🪙',k:'gold', per:.06,max:5,d:'+6% de ouro'},
  sabedoria:{n:'Sabedoria',        ic:'📖',k:'xp',   per:.05,max:5,d:'+5% de XP'},
  cacador:  {n:'Olho de Caçador',  ic:'🎯',k:'loot', per:.08,max:5,d:'+8% de chance de item'},
  regen:    {n:'Regeneração',      ic:'✨',k:'regen',per:.25,max:5,d:'+25% de recuperação de vida'},
  dominio:  {n:'Domínio da Classe',ic:'⭐',k:'skill',per:.25,max:3,d:'Habilidade de classe 25% mais forte',lvl:10},
};
function talentSpent(){return Object.values(S.talents||{}).reduce((a,b)=>a+b,0)}
function talentPoints(){return Math.max(0,(S.lvl-1)-talentSpent())}
function learnTalent(id){
  const T=TAL[id];S.talents=S.talents||{};const r=S.talents[id]||0;
  if(talentPoints()<=0)return toast('Sem pontos: suba de nível para ganhar mais');
  if(r>=T.max)return toast('Talento no máximo');
  if(T.lvl&&S.lvl<T.lvl)return toast(`Libera no nível ${T.lvl}`);
  S.talents[id]=r+1;S.hp=Math.min(maxHP(),S.hp);save();hud();renderSheet();
}
const respecCost=()=>100*S.lvl;
let respecArm=0;
function respecTalents(){
  if(!talentSpent())return toast('Nenhum ponto gasto ainda');
  if(S.gold<respecCost())return toast(`Precisa de ${fmtN(respecCost())} 🪙 para redistribuir`);
  if(Date.now()-respecArm>4000){respecArm=Date.now();return toast(`Redistribuir custa ${fmtN(respecCost())} 🪙. Toque de novo para confirmar.`,4000)}
  S.gold-=respecCost();S.talents={};S.hp=Math.min(maxHP(),S.hp);save();hud();renderSheet();toast('Pontos devolvidos');
}

/* ═════ CONJUNTOS ═════ 3 peças (arma, armadura, amuleto) do mesmo conjunto = bônus */
const SETS={
  'do Sertão':    {k:'def', v:.15,d:'+15% de defesa'},
  'da Beira-Mar': {k:'gold',v:.20,d:'+20% de ouro'},
  'do Dragão':    {k:'atk', v:.15,d:'+15% de ataque'},
  'da Lua Cheia': {k:'xp',  v:.15,d:'+15% de XP'},
  'do Farol':     {k:'loot',v:.25,d:'+25% de chance de item'},
  'do Cangaço':   {k:'crit',v:.08,d:'+8% de chance de crítico'},
};
function itemSet(it){if(!it)return null;if(it.set)return it.set;return Object.keys(SETS).find(s=>it.name?.endsWith(' '+s))||null}
function setCount(){const c={};for(const k of ['weapon','armor','amulet']){const s=itemSet(S.equip[k]);if(s)c[s]=(c[s]||0)+1}return c}
function activeSet(){const c=setCount();return Object.keys(c).find(s=>c[s]===3)||null}

/* ═════ COMPANHEIRO ═════ ovo no nível 3, choca após 2 km, evolui com a distância */
const PETS={
  lobo:     {n:'Lobo',          e:'🐺',k:'atk', per:.05,d:'ataque'},
  falcao:   {n:'Falcão',        e:'🦅',k:'loot',per:.08,d:'chance de item'},
  dragao:   {n:'Dragãozinho',   e:'🐲',k:'xp',  per:.06,d:'XP'},
  tartaruga:{n:'Tartaruga',     e:'🐢',k:'def', per:.06,d:'defesa'},
  gato:     {n:'Gato Mercador', e:'🐈',k:'gold',per:.08,d:'ouro'},
};
const PET_HATCH_KM=2,PET_KM_LVL=5;
function petInfo(){const p=S.pet;if(!p||!p.type)return null;return{...PETS[p.type],...p}}
function petAddKm(km){
  if(S.lvl<3&&!S.pet)return;
  if(!S.pet){S.pet={egg:true,km:0};card('🥚','Você encontrou um ovo misterioso!',`Ele choca depois de ${PET_HATCH_KM} km de jornada`,'gold');speak('Você encontrou um ovo misterioso!','fun');drawPet()}
  const p=S.pet;p.km+=km;
  if(p.egg&&p.km>=PET_HATCH_KM){
    p.egg=false;p.type=pick(Object.keys(PETS));p.lvl=1;p.km=0;
    const P=PETS[p.type];card(P.e,`O ovo chocou: ${P.n}!`,`Seu companheiro aumenta ${P.d} e ajuda nas batalhas`,'epic');
    speak(`O ovo chocou! Seu novo companheiro é um ${P.n}`,'fun');drawPet();checkAch();
  }else if(!p.egg&&p.lvl<20&&p.km>=PET_KM_LVL*p.lvl){
    p.lvl++;card(PETS[p.type].e,`${PETS[p.type].n} subiu para o nível ${p.lvl}!`,'Mais forte nas batalhas','gold');
  }
}
function drawPet(){
  const host=player?.getElement()?.querySelector('.pl');if(!host)return;
  let el=host.querySelector('.pet');const p=S.pet;
  if(!p){el?.remove();return}
  if(!el){el=document.createElement('div');el.className='pet';host.appendChild(el)}
  el.textContent=p.egg?'🥚':PETS[p.type].e;
}

/* ═════ BÔNUS TOTAL ═════ soma talentos + conjunto + companheiro + ambiente (fração: .1 = +10%) */
function bonus(k){
  let b=0;const t=S.talents||{};
  for(const id in t){const T=TAL[id];if(T&&T.k===k)b+=T.per*t[id]}
  const s=activeSet();if(s&&SETS[s].k===k)b+=SETS[s].v;
  const p=petInfo();if(p&&PETS[p.type].k===k)b+=PETS[p.type].per*(1+(p.lvl-1)*.1);
  const e=envNow();
  if(k==='xp'){if(e.rain)b+=.10;if(e.moon)b+=.25}
  if(k==='gold'&&e.hot)b+=.10;
  if((k==='xp'||k==='gold')&&typeof honorBonus==='function')b+=honorBonus()*.01;
  return b;
}

/* ═════ HABILIDADES DE CLASSE (automáticas na batalha) ═════ */
const SKILL={
  cavaleiro:{n:'Bloqueio com escudo',ic:'🛡️',d:'Chance de anular um golpe inimigo'},
  barbaro:  {n:'Fúria',              ic:'🔥',d:'Com menos da metade da vida, causa +40% de dano'},
  mago:     {n:'Bola de fogo',       ic:'☄️',d:'Abre a luta com um golpe de 2,5× o dano'},
  ladino:   {n:'Golpe nas sombras',  ic:'🗡️',d:'Primeiro golpe sempre crítico e chance de roubar ouro extra'},
  arqueiro: {n:'Tiro certeiro',      ic:'🏹',d:'Acerta de longe antes do monstro chegar perto'},
};
// substitui a luta simples: atributos com bônus, habilidade da classe e o companheiro ajudando
function fight(m){
  const c=S.cls||'cavaleiro',dom=1+bonus('skill'),pet=petInfo();
  let php=S.hp??maxHP(),mhp=m.hp,crit=false,rounds=0,taken=0;const A=atk(),D=def(),mx=maxHP(),used=new Set();
  const hit=(mult=1,forceCrit=false)=>{let d=A*rnd(.85,1.15)*mult;if(forceCrit||Math.random()<critChance()){d*=2;crit=true}mhp-=d};
  if(c==='arqueiro'){hit(1.2*dom);used.add('arqueiro')}
  while(mhp>0&&php>0&&rounds<30){
    rounds++;
    let mult=1;
    if(c==='mago'&&rounds===1){mult=2.5*dom;used.add('mago')}
    if(c==='barbaro'&&php<mx*.5){mult=1+.4*dom;used.add('barbaro')}
    hit(mult,c==='ladino'&&rounds===1);if(c==='ladino'&&rounds===1)used.add('ladino');
    if(pet&&mhp>0)mhp-=(2+pet.lvl*1.2);
    if(mhp<=0)break;
    if(c==='cavaleiro'&&Math.random()<.22*dom){used.add('cavaleiro');continue}
    const t=Math.max(1,m.atk*rnd(.85,1.15)-D*.7);php-=t;taken+=t;
  }
  return{win:mhp<=0,taken:Math.round(taken),crit,php,skills:[...used].map(k=>SKILL[k].ic+' '+SKILL[k].n),
    steal:c==='ladino'&&Math.random()<.3};
}
const critChance=()=>cls().crit+bonus('crit');

/* ═════ REGIÕES DE FORTALEZA ═════ (aproximadas) */
const REGION={costa:{n:'Costa',ic:'🌊'},centro:{n:'Centro Antigo',ic:'🏛️'},mata:{n:'Mata',ic:'🌳'},sertao:{n:'Sertão',ic:'🌵'},cidade:{n:'Cidade',ic:'🏙️'}};
const COAST=[[-3.6930,-38.6000],[-3.7050,-38.5700],[-3.7120,-38.5450],[-3.7180,-38.5250],[-3.7200,-38.5050],[-3.7225,-38.4900],
  [-3.7160,-38.4780],[-3.7290,-38.4660],[-3.7470,-38.4540],[-3.7750,-38.4420],[-3.8050,-38.4180],[-3.8400,-38.3900]];
const PARKS=[[-3.7455,-38.4870,1600],[-3.7880,-38.4350,1500],[-3.7950,-38.5050,700]];
function distToLine(lat,lon,pts){let b=Infinity;for(let i=0;i<pts.length-1;i++)b=Math.min(b,projSeg(lat,lon,pts[i],pts[i+1]).d);return b}
function regionAt(lat,lon){
  if(hav(lat,lon,-3.7275,-38.5275)<1600)return'centro';
  if(distToLine(lat,lon,COAST)<1300)return'costa';
  for(const p of PARKS)if(hav(lat,lon,p[0],p[1])<p[2])return'mata';
  if(hav(lat,lon,-3.7600,-38.5300)>22000)return'sertao';
  return'cidade';
}
// sorteio de monstro considerando região, noite, chuva, lua cheia e calor
// km = quanto já se andou nesta viagem: quanto mais longe de casa, mais raros e fortes os monstros
function rollMonster(lat,lon,km=0){
  const deep=Math.max(0,km);
  if(S.lvl>=5&&Math.random()<.015+Math.min(.04,deep/2500))return mkMon(MONS.find(m=>m.t===6),{dragon:true,depth:deep});
  const mt=Math.min(5,1+Math.floor((S.lvl-1)/3)+Math.floor(deep/45)),night=isNight(),e=envNow();
  const reg=lat!=null?regionAt(lat,lon):null;
  const ok=m=>m.t<=mt&&m.t<6&&(!m.night||night)&&(!m.moonOnly||e.moon);
  // longe de casa os monstros fracos somem do sorteio
  const minT=deep>=120?3:deep>=60?2:1;
  let pool=MONS.filter(m=>ok(m)&&m.t>=Math.min(minT,mt)&&(!reg||!m.r||m.r.includes(reg)));
  if(!pool.length)pool=MONS.filter(ok);
  const w=pool.map(m=>Math.pow(m.t,1.5)*(e.rain&&m.aq?3:1)*(e.moon&&(m.moon||m.moonOnly)?3:1)*(e.hot&&m.hot?2:1));
  let r=Math.random()*w.reduce((a,b)=>a+b,0),p=pool[0];
  for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0){p=pool[i];break}}
  const mon=mkMon(p,{elite:Math.random()<.1+Math.min(.25,deep/300),depth:deep});mon.reg=reg;return mon;
}
let regionShown=null;
function regionTick(lat,lon){
  if(simSnap&&!isNav)return;
  const r=regionAt(lat,lon);if(r===regionShown)return;
  const first=regionShown===null;regionShown=r;S.curRegion=r;
  S.regions=S.regions||[];if(!S.regions.includes(r)&&!simSnap){S.regions.push(r);checkAch()}
  if(!first)card(REGION[r].ic,`Você entrou em: ${REGION[r].n}`,'Os monstros daqui são diferentes','gold');
  renderEnv();
}

/* ═════ CLIMA REAL (Open-Meteo, sem chave) + LUA ═════ */
const ENV={rain:false,hot:false,temp:null,t:0};
async function weatherTick(lat,lon){
  if(Date.now()-ENV.t<30*60000)return;ENV.t=Date.now();
  try{
    const j=await(await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,weather_code,precipitation`)).json();
    const c=j.current||{},wc=c.weather_code??0,was=ENV.rain;
    ENV.rain=(wc>=51&&wc<=67)||(wc>=80&&wc<=99)||(c.precipitation||0)>.2;
    ENV.hot=(c.temperature_2m??0)>=32;ENV.temp=c.temperature_2m??null;
    if(ENV.rain&&!was)card('🌧️','Começou a chover!','Monstros aquáticos aparecem mais · +10% de XP','gold');
    renderEnv();
  }catch{ENV.t=Date.now()-25*60000}   // falhou: tenta de novo em ~5 min
}
function moonIllum(d=new Date()){const syn=29.530588853,ref=Date.UTC(2000,0,6,18,14);const a=(((d-ref)/864e5)%syn+syn)%syn;return(1-Math.cos(2*Math.PI*a/syn))/2}
function envNow(){return{rain:ENV.rain,hot:ENV.hot,moon:moonIllum()>.95&&isNight()}}
function renderEnv(){
  const el=$('hudEnv');if(!el)return;const e=envNow(),r=REGION[S.curRegion||regionShown];const parts=[];
  if(r)parts.push(`${r.ic} ${r.n}`);
  if(e.rain)parts.push('🌧️ Chuva');else if(e.hot)parts.push(`☀️ ${Math.round(ENV.temp)}°`);else if(ENV.temp!=null)parts.push(`${isNight()?'🌙':'⛅'} ${Math.round(ENV.temp)}°`);
  if(e.moon)parts.push('🌕 Lua cheia');
  el.textContent=parts.join(' · ');
}

/* ═════ MASMORRAS ═════ estacione perto (ou chegue de rota) → andares automáticos */
const DUNGEONS=[
  {id:'iguatemi',n:'Masmorra do Iguatemi',          lat:-3.7555,lon:-38.4895},
  {id:'riomar',  n:'Fortaleza do RioMar',           lat:-3.7335,lon:-38.4880},
  {id:'north',   n:'Catacumbas do North Shopping',  lat:-3.7362,lon:-38.5665},
  {id:'aldeota', n:'Torre da Aldeota',              lat:-3.7368,lon:-38.5050},
  {id:'mercado', n:'Labirinto do Mercado Central',  lat:-3.7263,lon:-38.5295},
  {id:'aero',    n:'Hangar Assombrado',             lat:-3.7765,lon:-38.5320},
  {id:'benfica', n:'Porões do Benfica',             lat:-3.7395,lon:-38.5395},
];
const DUN_R=350,DUN_STAY=40000;
let dunMks=[],dunNear=null,dunRunning=false;
const dayKey=()=>today();
function drawDungeons(){
  dunMks.forEach(m=>m.remove());
  dunMks=DUNGEONS.map(d=>{const done=S.dungeons?.[d.id]===dayKey();
    return addMk(`<div class="boss dun ${done?'done':''}"><span>🏯</span><i>${esc(d.n)}${done?' ✔':''}</i></div>`,d.lat,d.lon,'bottom')});
}
function dungeonTick(lat,lon,spd,arrived){
  if(dunRunning||(simSnap&&!isNav&&!arrived))return;
  const d=DUNGEONS.find(x=>hav(lat,lon,x.lat,x.lon)<DUN_R&&S.dungeons?.[x.id]!==dayKey());
  if(!d){dunNear=null;return}
  if(arrived){runDungeon(d);return}
  if(spd!=null&&spd>1.5){dunNear=null;return}
  if(!dunNear||dunNear.id!==d.id){dunNear={id:d.id,t:Date.now()};toast(`🏯 ${d.n} por perto… fique parado para entrar`,3500);return}
  if(Date.now()-dunNear.t>=DUN_STAY)runDungeon(d);
}
function runDungeon(d){
  dunRunning=true;S.dungeons=S.dungeons||{};S.dungeons[d.id]=dayKey();
  const floors=Math.min(5,3+Math.floor(S.lvl/10));
  card('🏯',`Entrando: ${d.n}`,`${floors} andares de inimigos`,'epic');speak(`Entrando na masmorra: ${d.n}`,'fun');
  let f=0,totXP=0,totGold=0;
  const step=()=>{
    f++;
    const isBoss=f===floors;let win=true,sub=[];
    const foes=isBoss?[{...mkMon({n:'Guardião da Masmorra',e:'👑',t:5},{elite:true})}]:[rollMonster(d.lat,d.lon),rollMonster(d.lat,d.lon)];
    if(isBoss){const L=S.lvl+1;foes[0]={...foes[0],lvl:L,hp:Math.round(atk()*rnd(4,5)),atk:maxHP()/rnd(10,12)+def()*.7,xp:(8+L*3)*8,gold:(2+L*1.5)*8}}
    for(const m of foes){
      const r=fight(m);
      if(!r.win){win=false;S.hp=Math.round(maxHP()*.35);break}
      S.hp=Math.max(1,Math.round(r.php));totXP+=gainXP(m.xp);totGold+=gainGold(m.gold);S.stats.kills++;sub.push(m.e);
    }
    hero3d('act',win?'attack':'hit');
    if(!win){
      card('😵',`Andar ${f}: derrotado`,`Você saiu da masmorra · +${totXP} XP · +${totGold} 🪙 até aqui`,'lose');return finish(false);
    }
    card(isBoss?'👑':'⚔️',isBoss?`Andar ${f}: Guardião derrotado!`:`Andar ${f} limpo`,`${sub.join(' ')} · vida ${Math.round(S.hp)}/${maxHP()}`,isBoss?'epic':'');
    if(f<floors)setTimeout(step,1600);else finish(true);
  };
  const finish=ok=>{
    if(ok){handleItem(makeItem(Math.max(2,rollRar(.4))));S.stats.dungeons=(S.stats.dungeons||0)+1;speak('Masmorra concluída!','fun');
      card('🏆',`${d.n} concluída!`,`<b>+${totXP} XP</b> · <b>+${totGold} 🪙</b> · baú raro`,'epic')}
    dunRunning=false;checkAch();drawDungeons();hud();save();
  };
  setTimeout(step,1200);
}

/* ═════ ganchos chamados a cada posição do GPS ═════ */
function rpgTick(lat,lon,spd,real){
  regionTick(lat,lon);
  if(real)weatherTick(lat,lon);
  dungeonTick(lat,lon,spd,false);
}
