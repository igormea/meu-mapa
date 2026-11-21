'use strict';
/* ── PROGRESSÃO ──────────────────────────────────────── */
function rawXP(n){
  S.xp+=n;if(T)T.xp+=n;let up=false;
  while(S.xp>=needXP(S.lvl)){S.xp-=needXP(S.lvl);S.lvl++;up=true}
  if(up){S.hp=maxHP();levelUp()}
  return n;
}
const gainXP=n=>rawXP(Math.max(1,Math.round(n*cls().xp*(1+amu()/100+bonus('xp')))));
function gainGold(n){n=Math.max(1,Math.round(n*cls().gold*(1+amu()/100+bonus('gold'))));S.gold+=n;S.stats.gold+=n;if(T)T.gold+=n;smith();return n}
const smithCost=()=>Math.round(40*Math.pow(S.smith.w+S.smith.a+1,1.6));
function smith(){let c;while(S.gold>=(c=smithCost())){S.gold-=c;const w=S.smith.w<=S.smith.a;if(w)S.smith.w++;else S.smith.a++;
  card('🔨','O ferreiro trabalhou!',w?`Sua arma agora é <b>+${S.smith.w}</b>`:`Sua armadura agora é <b>+${S.smith.a}</b>`,'gold')}}
function levelUp(){
  $('lvNum').textContent=S.lvl;hero3d('act','cheer');
  clearTimeout(window.__talTmr);   // vários níveis de uma vez → um aviso só, com o total
  window.__talTmr=setTimeout(()=>{const n=talentPoints();if(n)card('✨',n>1?`${n} pontos de talento para usar!`:'Novo ponto de talento!','Distribua na mochila 🎒 → Talentos quando estiver parado','gold')},1500);const o=$('lvlUp');o.classList.remove('on');void o.offsetWidth;o.classList.add('on');
  speak(`Subiu para o nível ${S.lvl}!`,'fun');
}
let lastRegen=Date.now();
function regen(){const now=Date.now(),dt=(now-lastRegen)/60000;lastRegen=now;const mx=maxHP();if(S.hp==null)S.hp=mx;S.hp=Math.min(mx,S.hp+mx*.06*(1+bonus('regen'))*dt)}
let xpFrac=0;
function addDistance(m){
  S.stats.km+=m/1000;histAdd('km',m/1000);ensureDaily();S.daily.km+=m/1000;if(T)T.m+=m;weekAdd('km',m/1000);
  xpFrac+=m/20*cls().xp*(1+amu()/100+bonus('xp'));
  if(!simSnap)petAddKm(m/1000);
  if(xpFrac>=1){const n=Math.floor(xpFrac);xpFrac-=n;rawXP(n)}
  checkQuests();checkAch();
}
function ensureDaily(){const d=today();if(S.daily.date!==d)S.daily={date:d,km:0,kills:0,trips:0,claimed:[]}}
function checkQuests(){
  ensureDaily();
  for(const q of DQ){if(!S.daily.claimed.includes(q.id)&&S.daily[q.id]>=q.goal){
    S.daily.claimed.push(q.id);const k=1+.15*(S.lvl-1);
    const x=rawXP(Math.round(q.xp*k)),g=gainGold(q.gold*k);
    card('📜','Missão diária concluída!',`${q.t} · <b>+${x} XP</b> · <b>+${g} 🪙</b>`,'gold');
  }}
}
function checkAch(){for(const a of ACH)if(!S.ach.includes(a.id)&&a.f()){S.ach.push(a.id);S.title=a.n;card('🏅','Conquista: '+a.n,a.d,'gold')}}

/* ── MONSTROS & COMBATE ──────────────────────────────── */
function mkMon(b,o={}){
  const lvl=Math.max(1,S.lvl+ri(-1,1)),t=b.t;
  // balanceado por simulação (tests/t39): comuns ~92-100% de vitória, elites ~55-90%, 3-27% de vida por luta
  const hp=(20+lvl*9)*(1+.25*(t-1)),at=(6+lvl*2.8)*(1+.12*(t-1));
  const xp=(8+lvl*3)*(1+.3*(t-1)),gold=(2+lvl*1.5)*(1+.2*t);
  const k=o.dragon?{hp:1.6,at:1.5,r:5}:o.elite?{hp:2.2,at:1.45,r:2}:{hp:1,at:1,r:1};
  // viagem longa: monstros "ancestrais" (a partir de 60 km) — mais fortes, mas valem bem mais
  const dp=o.depth||0,ds=1+Math.min(.5,dp/300),dr=1+Math.min(1.5,dp/120),anc=dp>=60;
  return{...b,n:anc?b.n+' Ancestral':b.n,lvl,hp:Math.round(hp*k.hp*ds),atk:at*k.at*ds,xp:Math.round(xp*k.r*dr),gold:Math.round(gold*k.r*dr*rnd(.7,1.3)),
    elite:!!o.elite,dragon:!!o.dragon,depth:dp,anc};
}
function rollRar(bonus=0){
  const w=RAR.map((x,i)=>x.w*(1+bonus*i*2));let r=Math.random()*w.reduce((a,b)=>a+b,0);
  for(let i=0;i<w.length;i++){r-=w[i];if(r<=0)return i}return 0;
}
function makeItem(r){
  const x=Math.random(),slot=x<.45?'weapon':x<.85?'armor':'amulet',c=cls(),R=RAR[r];
  let pow,base;
  if(slot==='amulet'){pow=Math.max(1,Math.round((2+S.lvl*.25)*R.m*rnd(.85,1.15)));base=pick(['Amuleto','Anel','Talismã','Colar'])}
  else{pow=Math.max(1,Math.round((3+S.lvl*1.6)*R.m*rnd(.85,1.15)));base=slot==='weapon'?c.arma:c.armadura}
  const suf=pick(SUF);
  return{slot,r,pow,name:`${base} ${suf}`,set:SETS[suf]?suf:null};
}
const statTxt=it=>it.slot==='weapon'?`ATK +${it.pow}`:it.slot==='armor'?`DEF +${it.pow}`:`+${it.pow}% XP e ouro`;
function handleItem(it){
  const cur=S.equip[it.slot];let act,g=0;
  // conjuntos: aceita peça um pouco mais fraca se completar o conjunto; não quebra conjunto completo por pouco
  const before=activeSet();S.equip[it.slot]=it;const after=activeSet();S.equip[it.slot]=cur;
  const better=!cur||it.pow>cur.pow*(before&&!after?1.25:after&&!before?.8:1);
  if(better){S.equip[it.slot]=it;act='equipado';if(after&&!before)setTimeout(()=>card('💠',`Conjunto completo: ${after}!`,SETS[after].d,'epic'),900)}
  else{g=gainGold(it.pow*2*RAR[it.r].m);act='vendido'}
  S.stats.items++;if(it.r===4)S.stats.legend++;
  S.loot.unshift({...it,act,g});S.loot=S.loot.slice(0,15);if(T)T.items.push(it);
  const sub=`<span class="r-${it.r}">${RAR[it.r].n}</span> · ${statTxt(it)} · ${act==='equipado'?'<b>equipado!</b>':`vendido por ${g} 🪙`}`;
  card('🎁',`<span class="r-${it.r}">${esc(it.name)}</span>`,sub,it.r>=3?'epic':'gold');
  if(it.r===4)speak('Item lendário encontrado!','fun');
  return{it,act,g};
}
function battle(s){
  s.done=true;const m=s.m,res=fight(m);
  const el=s.mk?.getElement()?.querySelector('.mon');
  if(el){el.classList.add('dead');const mk=s.mk;setTimeout(()=>mk.remove(),650);s.mk=null}
  if(m.m3d){try{window.Hero3D?.[res.win?'monKill':'monAttack'](s.id)}catch{}}
  if(res.win){
    S.hp=Math.max(1,Math.round(res.php));
    const x=gainXP(m.xp),g=gainGold(m.gold*(res.steal?1.5:1));
    S.stats.kills++;histAdd('k',1);bestAdd(m.n);ensureDaily();S.daily.kills++;if(T)T.kills++;if(!simSnap)weekAdd('kills',1);if(m.dragon){S.stats.dragons++;speak('Você derrotou um Dragão Ancião!','fun')}
    floatTxt(`+${x} XP`,'xp');hero3d('act','attack');
    card(m.m3d?monPic(m.m3d):m.e,`${m.n}${m.elite?' ★':''} <span style="color:#b59f7b">Nv ${m.lvl}</span> derrotado!`,
      `<b>+${x} XP</b> · <b>+${g} 🪙</b>${res.taken?` · −${res.taken} ❤️`:''}${res.crit?' · <b>CRÍTICO!</b>':''}${res.skills.length?' · '+res.skills.join(' · '):''}${res.steal?' · 💰 roubo!':''}`,m.dragon?'epic':'');
    if(m.reg==='costa'||m.aq)S.stats.aqKills=(S.stats.aqKills||0)+(envNow().rain&&m.aq?1:0);
    if(m.anc){if(T)T.deep=(T.deep||0)+1;S.stats.anc=(S.stats.anc||0)+1}
    const ch=(m.dragon?1:m.elite?.5:.16)*cls().loot*(1+bonus('loot'))*(1+Math.min(1.5,(m.depth||0)/80));
    if(Math.random()<ch)handleItem(makeItem(Math.max(rollRar(Math.min(.6,(m.depth||0)/200)),m.dragon?3:m.elite||m.anc?1:0)));
  }else{
    S.hp=Math.round(maxHP()*.35);const lost=Math.floor(S.gold*.08);S.gold-=lost;
    floatTxt('Recuou!','hp');hero3d('act','hit');
    card('😵',`${m.n} te venceu!`,`Você recuou e se recuperou${lost?` · −${lost} 🪙`:''}`,'lose');
  }
  checkQuests();checkAch();hud();save();
}
