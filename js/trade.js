'use strict';
/* ═════ BAÚ, LOJAS E TROCAS ═════
   Baú: itens Raros ou melhores que não foram equipados ficam guardados (até 12) em vez de vendidos na hora.
   Lojas: ao passar perto de um posto ⛽ ou farmácia 💊 navegando, o herói vende os Raros do baú
          e compra poções sozinho. A poção é bebida sozinha antes de uma luta se a vida estiver baixa.
   Trocas: oferecer um item do baú a um companheiro. Ele aceita (pode mandar outro de volta) ou recusa (volta pra você). */
const BAG_MAX=12,POT_MAX=3,SHOP_R=70,SHOP_GAP=15*60000;
const bag=()=>S.bag=S.bag||[];
const itemVal=it=>Math.round(it.pow*2*RAR[it.r].m);
function bagAdd(it){
  const b=bag();b.push({slot:it.slot,r:it.r,pow:it.pow,name:it.name,set:it.set||null});
  if(b.length>BAG_MAX){b.sort((x,y)=>itemVal(y)-itemVal(x));const w=b.pop();return gainGold(itemVal(w))}   // cheio: vende o mais fraco
  return 0;
}
/* ── loja automática ── */
const potPrice=()=>20+S.lvl*6;
let SHOPS=null,shopLastCheck=0;
function shopList(){
  if(SHOPS||!PL)return SHOPS;
  SHOPS=PL.items.filter(p=>p.c==='g'||(p.c==='h'&&/farm|drog/i.test(p.n))).map(p=>({n:p.n,lat:p.lat,lon:p.lon,k:p.c==='g'?'posto':'farmacia'}));
  return SHOPS;
}
function shopTick(f){
  if(simSnap||!f||Date.now()-shopLastCheck<3000)return;shopLastCheck=Date.now();
  if(Date.now()-(S.shopT||0)<SHOP_GAP)return;
  const L=shopList();if(!L)return;
  const dl=.0009;let hit=null;
  for(const p of L){if(Math.abs(p.lat-f.lat)>dl||Math.abs(p.lon-f.lon)>dl)continue;if(hav(p.lat,p.lon,f.lat,f.lon)<=SHOP_R){hit=p;break}}
  if(hit)shopVisit(hit);
}
function shopVisit(p){
  S.shopT=Date.now();let sold=0,gold=0,bought=0;
  const keep=[];for(const it of bag()){if(it.r<=2||bag().length-sold>8&&it.r===3){gold+=itemVal(it);sold++}else keep.push(it)}
  S.bag=keep;if(gold)gold=gainGold(gold);
  S.pots=S.pots||0;while(S.pots<POT_MAX&&S.gold>=potPrice()){S.gold-=potPrice();S.pots++;bought++}
  S.stats.shops=(S.stats.shops||0)+1;
  if(!sold&&!bought)return save();
  const ic=p.k==='posto'?'⛽':'💊';
  card(ic,`Parada rápida: ${esc(short(p.n))}`,[sold?`vendeu ${sold} item(ns) por ${gold} 🪙`:'',bought?`comprou ${bought} poção(ões) 🧪`:''].filter(Boolean).join(' · '),'gold');
  checkAch();save();
}
// antes de lutar: vida abaixo de 45% e tem poção → bebe sozinho
function potAuto(){
  if(!S.pots||S.hp==null)return;const mx=maxHP();
  if(S.hp<mx*.45){S.pots--;S.hp=Math.min(mx,S.hp+mx*.5);floatTxt('🧪 Poção','hp');S.stats.pots=(S.stats.pots||0)+1}
}
/* ── trocas ── */
const TR={in:{},to:null,re:null};
function itemSafe(o){
  try{if(typeof o==='string')o=JSON.parse(o)}catch{return null}
  if(!o||!['weapon','armor','amulet'].includes(o.slot)||!(o.r>=0&&o.r<=4)||!(o.pow>0&&o.pow<=900))return null;
  return{slot:o.slot,r:o.r|0,pow:Math.round(o.pow),name:String(o.name||'Item').slice(0,60),set:SETS[o.set]?o.set:null};
}
function trId(){const b=new Uint8Array(10);crypto.getRandomValues(b);return't'+Date.now().toString(36)+[...b].map(x=>(x%36).toString(36)).join('')}
async function tradeSend(to,i,kind='offer',re=null){
  const it=bag()[i];if(!it||!to)return;
  try{await fbSet(`trades/${to}/${trId()}`,{from:uidMe(),nick:SOC.me?.nick||'',item:JSON.stringify(it),kind,t:Date.now(),...(re?{re}:{})});
    bag().splice(i,1);S.stats.trades=(S.stats.trades||0)+1;save();checkAch();
    toast(kind==='offer'?`Oferta enviada para ${SOC.profiles[to]?.nick||'seu companheiro'}`:'Item enviado');
  }catch{toast('Não consegui enviar o item')}
  TR.to=null;TR.re=null;renderSheet();
}
function receiveItem(it,from){
  const r=handleItem(it);   // equipa se for melhor; senão vai pro baú (Raro+) ou é vendido
  return r;
}
async function tradeLoad(){
  if(!isLogged())return;
  const all=await fbGet('trades/'+uidMe()).catch(()=>null)||{};TR.in={};
  for(const [id,t] of Object.entries(all)){
    const it=itemSafe(t.item);
    if(!it){fbDel(`trades/${uidMe()}/${id}`).catch(()=>{});continue}
    if(t.kind==='offer'){TR.in[id]={...t,it};continue}
    // presente de volta ou devolução: entra sozinho
    await fbDel(`trades/${uidMe()}/${id}`).catch(()=>{});
    receiveItem(it);card('🎁',t.kind==='back'?`${esc(t.nick)} recusou a troca`:`${esc(t.nick)} te mandou um item!`,`<span class="r-${it.r}">${esc(it.name)}</span>${t.kind==='back'?' voltou pra você':''}`,'gold');
  }
  save();
}
async function tradeAccept(id,back){
  const t=TR.in[id];if(!t)return;
  try{await fbDel(`trades/${uidMe()}/${id}`)}catch{return toast('Falhou, tente de novo')}
  delete TR.in[id];receiveItem(t.it);save();
  if(back){TR.to=t.from;TR.re=id;toast('Escolha um item do baú pra mandar de volta')}
  renderSheet();
}
async function tradeDecline(id){
  const t=TR.in[id];if(!t)return;
  try{await fbSet(`trades/${t.from}/${trId()}`,{from:uidMe(),nick:SOC.me?.nick||'',item:JSON.stringify(t.it),kind:'back',t:Date.now()});
    await fbDel(`trades/${uidMe()}/${id}`);delete TR.in[id];toast('Item devolvido')}catch{toast('Falhou, tente de novo')}
  renderSheet();
}
function tradePick(f){TR.to=TR.to===f?null:f;TR.re=null;renderSheet()}
const itemLine=it=>`<span class="r-${it.r}">${esc(it.name)}</span> <small>${RAR[it.r].n} · ${statTxt(it)}</small>`;
function tradeHTML(){
  let h='';
  const offers=Object.entries(TR.in);
  if(offers.length)h+=`<div class="sect">🎁 Ofertas pra você</div>`+offers.map(([id,t])=>`<div class="row"><div class="r1"><span><b>${esc(t.nick)}</b> oferece</span></div>
    <div class="r2">${itemLine(t.it)}</div><div class="soc-act"><button class="mini" onclick="tradeAccept('${id}')">Aceitar</button>
    ${bag().length?`<button class="mini" onclick="tradeAccept('${id}',1)">Aceitar e mandar outro</button>`:''}<button class="mini2" onclick="tradeDecline('${id}')">Recusar</button></div></div>`).join('');
  if(TR.to){
    const p=SOC.profiles[TR.to];
    h+=`<div class="sect">🎁 ${TR.re?'Mandar de volta para':'Oferecer para'} ${esc(p?.nick||'?')}</div>`+
      (bag().length?bag().map((it,i)=>`<div class="sp tr-it" onclick="tradeSend('${TR.to}',${i},'${TR.re?'gift':'offer'}','${TR.re||''}')">${itemLine(it)}<span class="mini">Enviar</span></div>`).join('')
        :'<div class="r2">Seu baú está vazio. Itens Raros ou melhores que você não equipar ficam guardados lá.</div>')+
      `<a class="gate-skip" onclick="tradePick(null)">cancelar</a>`;
  }
  return h;
}
function bagHTML(){
  const b=bag();
  return`<div class="sect">🧰 Baú <small>${b.length}/${BAG_MAX}</small> · 🧪 ${S.pots||0}/${POT_MAX} poções</div>`+
    (b.length?b.map(it=>`<div class="row"><div class="r1">${itemLine(it)}<span style="font-size:11.5px;color:#9b93c4">${itemVal(it)} 🪙</span></div></div>`).join('')
      :'<div class="r2">Vazio. Itens Raros ou melhores que você não equipar ficam guardados aqui pra trocar com amigos.</div>')+
    `<div class="r2" style="margin-top:6px">Passando por posto ⛽ ou farmácia 💊, o herói vende os Raros e compra poções sozinho (${potPrice()} 🪙 cada). A poção é bebida sozinha antes de uma luta quando a vida está baixa.</div>`;
}
