'use strict';
/* ── PROGRESSÃO ──────────────────────────────────────── */
function rawXP(n){
  S.xp+=n;if(T)T.xp+=n;let up=false;
  while(S.xp>=needXP(S.lvl)){S.xp-=needXP(S.lvl);S.lvl++;up=true}
  if(up){S.hp=maxHP();levelUp()}
  return n;
}
const gainXP=n=>rawXP(Math.max(1,Math.round(n*cls().xp*(1+amu()/100))));
function gainGold(n){n=Math.max(1,Math.round(n*cls().gold*(1+amu()/100)));S.gold+=n;S.stats.gold+=n;if(T)T.gold+=n;smith();return n}
const smithCost=()=>Math.round(40*Math.pow(S.smith.w+S.smith.a+1,1.6));
function smith(){let c;while(S.gold>=(c=smithCost())){S.gold-=c;const w=S.smith.w<=S.smith.a;if(w)S.smith.w++;else S.smith.a++;
  card('🔨','O ferreiro trabalhou!',w?`Sua arma agora é <b>+${S.smith.w}</b>`:`Sua armadura agora é <b>+${S.smith.a}</b>`,'gold')}}
function levelUp(){
  $('lvNum').textContent=S.lvl;const o=$('lvlUp');o.classList.remove('on');void o.offsetWidth;o.classList.add('on');
  speak(`Subiu para o nível ${S.lvl}!`,'fun');
}
let lastRegen=Date.now();
function regen(){const now=Date.now(),dt=(now-lastRegen)/60000;lastRegen=now;const mx=maxHP();if(S.hp==null)S.hp=mx;S.hp=Math.min(mx,S.hp+mx*.06*dt)}
let xpFrac=0;
function addDistance(m){
  S.stats.km+=m/1000;ensureDaily();S.daily.km+=m/1000;if(T)T.m+=m;weekAdd('km',m/1000);
  xpFrac+=m/20*cls().xp*(1+amu()/100);
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
  const hp=(14+lvl*6)*(1+.25*(t-1)),at=(3+lvl*1.5)*(1+.12*(t-1));
  const xp=(8+lvl*3)*(1+.3*(t-1)),gold=(2+lvl*1.5)*(1+.2*t);
  const k=o.dragon?{hp:1.6,at:1.5,r:5}:o.elite?{hp:2,at:1.3,r:2}:{hp:1,at:1,r:1};
  return{...b,lvl,hp:Math.round(hp*k.hp),atk:at*k.at,xp:Math.round(xp*k.r),gold:Math.round(gold*k.r*rnd(.7,1.3)),elite:!!o.elite,dragon:!!o.dragon};
}
function rollMonster(){
  if(S.lvl>=5&&Math.random()<.015)return mkMon(MONS.find(m=>m.t===6),{dragon:true});
  const mt=Math.min(5,1+Math.floor((S.lvl-1)/3)),night=isNight();
  const pool=MONS.filter(m=>m.t<=mt&&(!m.night||night));
  const w=pool.map(m=>Math.pow(m.t,1.5));let r=Math.random()*w.reduce((a,b)=>a+b,0);
  let p=pool[0];for(let i=0;i<pool.length;i++){r-=w[i];if(r<=0){p=pool[i];break}}
  return mkMon(p,{elite:Math.random()<.1});
}
function fight(m){
  let php=S.hp??maxHP(),mhp=m.hp,crit=false,rounds=0,taken=0;const A=atk(),D=def();
  while(mhp>0&&php>0&&rounds<30){
    rounds++;let d=A*rnd(.85,1.15);if(Math.random()<cls().crit){d*=2;crit=true}
    mhp-=d;if(mhp<=0)break;
    const t=Math.max(1,m.atk*rnd(.85,1.15)-D*.7);php-=t;taken+=t;
  }
  return{win:mhp<=0,taken:Math.round(taken),crit,php};
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
  return{slot,r,pow,name:`${base} ${pick(SUF)}`};
}
const statTxt=it=>it.slot==='weapon'?`ATK +${it.pow}`:it.slot==='armor'?`DEF +${it.pow}`:`+${it.pow}% XP e ouro`;
function handleItem(it){
  const cur=S.equip[it.slot];let act,g=0;
  if(!cur||it.pow>cur.pow){S.equip[it.slot]=it;act='equipado'}
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
  if(res.win){
    S.hp=Math.max(1,Math.round(res.php));
    const x=gainXP(m.xp),g=gainGold(m.gold);
    S.stats.kills++;ensureDaily();S.daily.kills++;if(T)T.kills++;if(!simSnap)weekAdd('kills',1);if(m.dragon){S.stats.dragons++;speak('Você derrotou um Dragão Ancião!','fun')}
    floatTxt(`+${x} XP`,'xp');
    card(m.e,`${m.n}${m.elite?' ★':''} <span style="color:#b59f7b">Nv ${m.lvl}</span> derrotado!`,
      `<b>+${x} XP</b> · <b>+${g} 🪙</b>${res.taken?` · −${res.taken} ❤️`:''}${res.crit?' · <b>CRÍTICO!</b>':''}`,m.dragon?'epic':'');
    const ch=(m.dragon?1:m.elite?.5:.16)*cls().loot;
    if(Math.random()<ch)handleItem(makeItem(Math.max(rollRar(),m.dragon?3:m.elite?1:0)));
  }else{
    S.hp=Math.round(maxHP()*.35);const lost=Math.floor(S.gold*.08);S.gold-=lost;
    floatTxt('Recuou!','hp');
    card('😵',`${m.n} te venceu!`,`Você recuou e se recuperou${lost?` · −${lost} 🪙`:''}`,'lose');
  }
  checkQuests();checkAch();hud();save();
}
