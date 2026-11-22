'use strict';
/* ═════ CHEFE DE GUILDA ═════
   O líder invoca o chefe (em casa). Cada km que QUALQUER membro dirige é um golpe (+0,3 por monstro).
   groups/{gid}/raid = {id, tier, hp, start, exp, dmg:{uid:km}, claimed:{uid:true}}
   groups/{gid}/last = último chefe derrotado (pra quem só abrir o app depois ainda receber a recompensa)
   groups/{gid}/tier = maior chefe já derrotado → libera o próximo. */
const RAIDS=[null,
  {n:'Ouriço Azul do Pirambu',      km:40,  d:'Rola pelas calçadas espetando pneus.'},
  {n:'Escaravelho da Beira-Mar',    km:80,  d:'Cava túneis sob o calçadão.'},
  {n:'Serpe do Rio Ceará',          km:120, d:'Sobe o rio nas noites de maré alta.'},
  {n:'Colosso do Dragão do Mar',    km:180, d:'Feito das pedras do velho porto.'},
  {n:'Touro Bravo de Maranguape',   km:250, d:'Desce a serra arrastando nuvens.'},
  {n:'Morcego-Rei da Catedral',     km:330, d:'Suas asas cobrem a lua da Sé.'},
  {n:'Tiranossauro do Cocó',        km:420, d:'Acordou de um sono de milhões de anos no mangue.'},
  {n:'Tartaruga-Ilha do Mucuripe',  km:550, d:'Uma ilha inteira que anda. Lenda final.'}];
const RAID_DAYS=7,RAID_KILL=.3;
const raidPic=t=>`<img class="raid-pic" src="models/raid/r${t}.png" alt="">`;
const raidSum=r=>Object.values(r?.dmg||{}).reduce((a,b)=>a+(+b||0),0);
const raidLeft=r=>Math.max(0,(r?.hp||0)-raidSum(r));
const raidDone=r=>!!r&&raidSum(r)>=r.hp;
const raidOver=r=>!!r&&!raidDone(r)&&Date.now()>r.exp;
let RAID_PEND=0,RAID_LAST=0;

// km ou monstros desta viagem → dano guardado; envia no máx. a cada 2 min (ou ao chegar)
function raidDamage(n){
  const g=SOC?.group,r=g?.raid;if(simSnap||!r||raidDone(r)||raidOver(r)||!isLogged())return;
  S.raidKm=S.raidKm||{};S.raidKm[r.id]=(S.raidKm[r.id]||0)+n;RAID_PEND+=n;
  if(RAID_PEND>=.5&&Date.now()-RAID_LAST>120000)raidPush();
}
async function raidPush(){
  const g=SOC.group,r=g?.raid,u=uidMe();if(!r||!u||!S.raidKm?.[r.id])return;
  const v=Math.round(S.raidKm[r.id]*10)/10;RAID_PEND=0;RAID_LAST=Date.now();
  const before=raidLeft(r);r.dmg=r.dmg||{};r.dmg[u]=Math.max(r.dmg[u]||0,v);
  try{await fbSet(`groups/${SOC.gid}/raid/dmg/${u}`,r.dmg[u])}catch(e){console.warn('raid',e)}
  raidMilestones(before,r);raidCheckWin();
}
function raidMilestones(before,r){
  const b=RAIDS[r.tier],now=raidLeft(r);
  for(const q of [.25,.5,.75])if(before>r.hp*q&&now<=r.hp*q){card(raidPic(r.tier),`${b.n}: ${Math.round(q*100)}% de vida`,'Sua guilda está vencendo!','gold');break}
}
// recompensa: cheia pra quem ajudou, metade pra quem não dirigiu nada
function raidCheckWin(){
  const g=SOC.group;if(!g)return;
  for(const r of [g.raid,g.last])if(r&&raidDone(r)&&!(S.raidWon||{})[r.id])raidWin(r);
}
function raidWin(r){
  if(simSnap)return;S.raidWon=S.raidWon||{};S.raidWon[r.id]=1;
  const b=RAIDS[r.tier],mine=(r.dmg||{})[uidMe()]||0,k=mine>=1?1:.5;
  const x=gainXP(Math.round(r.tier*(600+S.lvl*60)*k)),go=gainGold(Math.round(r.tier*(120+S.lvl*12)*k));
  const it=handleItem(makeItem(Math.random()<(.15+r.tier*.08)*k?4:3));
  S.stats.raids=(S.stats.raids||0)+1;
  card(raidPic(r.tier),`${b.n} derrotado pela guilda!`,`Você causou <b>${Math.round(mine)} km</b> de dano · <b>+${x} XP</b> · <b>+${go} 🪙</b>`,'epic');
  speak(`Sua guilda derrotou ${b.n}!`,'fun');
  fbSet(`groups/${SOC.gid}/raid/claimed/${uidMe()}`,true).catch(()=>{});
  checkAch();save();
}
async function raidStart(){
  const g=SOC.group,u=uidMe();if(!g||g.leader!==u)return;
  if(isNav)return toast('Invoque com o carro parado 😉');
  if(g.raid&&!raidDone(g.raid)&&!raidOver(g.raid))return toast('Já há um chefe invocado');
  const tier=Math.min(RAIDS.length-1,(g.tier||0)+1),b=RAIDS[tier],t=Date.now();
  const n=Math.max(2,Object.keys(g.members||{}).length),hp=Math.round(b.km*(.6+n*.2));   // escala com o tamanho da guilda
  const raid={id:'r'+t,tier,hp,start:t,exp:t+RAID_DAYS*864e5,dmg:{}};
  const patch={raid};if(g.raid&&raidDone(g.raid))patch.last=g.raid;
  try{await fbWrite('groups/'+SOC.gid,patch);g.raid=raid;if(patch.last)g.last=patch.last;
    card(raidPic(tier),`${b.n} foi invocado!`,`A guilda tem ${RAID_DAYS} dias para dirigir ${hp} km juntos`,'epic');
    speak(`${b.n} foi invocado. Cada quilômetro da guilda é um golpe.`,'fun');renderSheet()}catch{toast('Falhou, tente de novo')}
}
// quando a guilda vence, o próximo nível fica liberado (o líder grava o recorde)
async function raidTierSync(){
  const g=SOC.group;if(!g||g.leader!==uidMe())return;
  const best=Math.max(...[g.raid,g.last].filter(r=>r&&raidDone(r)).map(r=>r.tier),0);
  if(best>(g.tier||0)){g.tier=best;fbWrite('groups/'+SOC.gid,{tier:best}).catch(()=>{})}
}
function raidHTML(g,lead){
  const r=g.raid,P=SOC.profiles;
  const next=Math.min(RAIDS.length-1,(g.tier||0)+1);
  if(!r||raidDone(r)||raidOver(r)){
    const b=RAIDS[next];
    let h=r&&raidOver(r)?`<div class="r2" style="color:#f3a3a3">${RAIDS[r.tier].n} fugiu: o prazo acabou com ${Math.round(raidLeft(r))} km faltando.</div>`:
      r&&raidDone(r)?`<div class="r2" style="color:#9fe0a5">✔ ${RAIDS[r.tier].n} foi derrotado!</div>`:'';
    return h+`<div class="raid next">${raidPic(next)}<div><b>Próximo chefe: ${b.n}</b><small>${b.d}</small>
      <small>${lead?'Você é o líder: invoque quando a guilda estiver pronta.':'Só o líder pode invocar.'}</small></div></div>
      ${lead?`<button class="btn prim" onclick="raidStart()">⚔️ Invocar chefe da guilda</button>`:''}`;
  }
  const b=RAIDS[r.tier],sum=raidSum(r),pct=Math.min(100,sum/r.hp*100),days=Math.max(0,Math.ceil((r.exp-Date.now())/864e5));
  const rows=Object.keys(g.members||{}).map(m=>[m,(r.dmg||{})[m]||0]).sort((a,b)=>b[1]-a[1]);
  return`<div class="raid">${raidPic(r.tier)}<div><b>${b.n}</b><small>${b.d}</small>
      <div class="raid-bar"><i style="width:${100-pct}%"></i></div><small><b>${Math.round(raidLeft(r))} km</b> de vida · ${days} dia(s) restantes</small></div></div>
    <div class="raid-dmg">${rows.map(([m,v])=>`<div><span>${esc((P[m]||g.members[m])?.nick||'?')}</span><b>${Math.round(v*10)/10} km</b></div>`).join('')}</div>
    <div class="r2">Cada km que qualquer membro dirigir é um golpe. Não precisa fazer nada, só dirigir.</div>`;
}
