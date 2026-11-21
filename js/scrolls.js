'use strict';
/* ── PERGAMINHOS DE CHEFE (estilo Habitica) ─────────────────
   Monstros fortes às vezes deixam um pergaminho. Em casa, você escolhe qual chefe invocar.
   Depois ele perde vida conforme você dirige (1 de dano por km) e a cada monstro derrotado (+0,3).
   Recompensa grande: XP, ouro e item épico ou lendário garantido.
   (No futuro, com grupos, o dano de todo mundo vai somar.) */
const SCROLLS={
  hidra:   {n:'Hidra do Cocó',          e:'🐍',hp:15, lvl:1, d:'Três cabeças à espreita no mangue.'},
  golem:   {n:'Golem do Porto do Mucuripe',e:'🗿',hp:25, lvl:3, d:'Feito de contêineres e ferrugem.'},
  bruxa:   {n:'Bruxa da Lagoa da Messejana',e:'🧙‍♀️',hp:35,lvl:5,d:'Dizem que canta nas noites de lua.'},
  leviata: {n:'Leviatã de Iracema',      e:'🐋',hp:50, lvl:8, d:'Emerge quando o mar fica bravo.'},
  fenix:   {n:'Fênix do Sertão',         e:'🔥',hp:70, lvl:11,d:'Renasce das cinzas do sol do meio-dia.'},
  rei:     {n:'Rei Esqueleto do Centro', e:'👑',hp:100,lvl:14,d:'Governa as catacumbas sob a Praça do Ferreira.'},
};
// chance de o pergaminho cair: elites e ancestrais, guardião no fim de viagens de 5+ km, masmorras
function scrollDrop(src){
  const ch=src==='guardian'?.18:src==='dungeon'?.35:src==='ancient'?.12:src==='elite'?.05:0;
  if(simSnap||Math.random()>=ch)return;
  const ids=Object.keys(SCROLLS).filter(k=>SCROLLS[k].lvl<=S.lvl+2);if(!ids.length)return;
  const id=pick(ids);S.scrolls=S.scrolls||[];S.scrolls.push(id);
  setTimeout(()=>card('📜',`Pergaminho: ${SCROLLS[id].n}`,'Abra a ficha (Missões) em casa para invocar o chefe','epic'),700);
}
function scrollStart(i){
  if(isNav)return toast('Invoque com o carro parado, em casa 😉');
  if(S.scrollBoss)return toast('Já há um chefe invocado');
  const id=(S.scrolls||[])[i];if(!id)return;const b=SCROLLS[id];
  S.scrolls.splice(i,1);S.scrollBoss={id,hp:b.hp,max:b.hp,t:Date.now()};save();
  card(b.e,`${b.n} foi invocado!`,`Dirija ${b.hp} km para derrotá-lo · cada monstro derrotado também causa dano`,'epic');
  speak(`${b.n} foi invocado. Cada quilômetro dirigido é um golpe.`,'fun');renderSheet?.();
}
function scrollDamage(n,why){
  const B=S.scrollBoss;if(!B||simSnap||n<=0)return;
  const before=B.hp/B.max;B.hp=Math.max(0,B.hp-n);const after=B.hp/B.max;
  for(const q of [.75,.5,.25])if(before>q&&after<=q){const b=SCROLLS[B.id];card(b.e,`${b.n}: ${Math.round(q*100)}% de vida`,'O chefe está cedendo!','gold');break}
  if(B.hp<=0)scrollWin();
}
function scrollWin(){
  const B=S.scrollBoss,b=SCROLLS[B.id];S.scrollBoss=null;
  const x=gainXP(Math.round(b.hp*(40+S.lvl*6))),g=gainGold(Math.round(b.hp*(8+S.lvl)));
  const it=handleItem(makeItem(Math.random()<.25+b.hp/400?4:3));
  S.bossEver=S.bossEver||{};S.bossEver['sc_'+B.id]=(S.bossEver['sc_'+B.id]||0)+1;
  S.stats.scrollWins=(S.stats.scrollWins||0)+1;
  card('🏆',`${b.n} derrotado!`,`+${fmtN(x)} XP · +${fmtN(g)} 🪙 · ${esc(it.it.name)}`,'epic');
  speak(`Vitória! ${b.n} foi derrotado.`,'fun');hero3d('act','cheer');checkAch();save();
}
function scrollsHTML(){
  const B=S.scrollBoss,L=S.scrolls||[];
  let h='<div class="sect">Pergaminhos de chefe</div>';
  if(B){const b=SCROLLS[B.id];h+=`<div class="row"><div class="r1"><span>${b.e} <b>${b.n}</b></span><b>${B.hp.toFixed(1).replace('.',',')} / ${B.max} km</b></div>
    <div class="qbar"><i style="width:${B.hp/B.max*100}%;background:linear-gradient(90deg,#a3221d,#e5534b)"></i></div><div class="r2">Dirija para causar dano (1 por km) · monstros derrotados também ferem o chefe</div></div>`}
  if(L.length)h+=L.map((id,i)=>{const b=SCROLLS[id];return`<div class="row"><div class="r1"><span>📜 ${b.e} ${b.n}</span><button class="mini" onclick="scrollStart(${i})" ${B?'disabled':''}>Invocar</button></div><div class="r2">${b.d} · ${b.hp} km de vida</div></div>`}).join('');
  else if(!B)h+='<div class="r2" style="margin:2px 2px 8px">Nenhum pergaminho ainda. Monstros elite, ancestrais, guardiões de fim de viagem e masmorras podem deixar um.</div>';
  return h;
}
