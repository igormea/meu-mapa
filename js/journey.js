'use strict';
/* ── JORNADA SEM TOQUE ───────────────────────────────────────
   Tudo aqui acontece sozinho enquanto você dirige:
   • Honra no volante — respeitar o limite rende bônus; correr demais custa honra
   • Bardo — cada bairro é um reino; o bardo anuncia quando você entra num novo
   • Cerco — parado no engarrafamento, o herói enfrenta ondas de monstros sozinho
   • Crônica — ao chegar, um resumo épico da viagem
   • Patrulhas — o app aprende suas rotas da rotina e oferece a rota no horário de sempre */

/* ═════ HONRA ═════ */
const HONOR_RANKS=[[0,'Escudeiro'],[20,'Cavaleiro Honrado'],[60,'Guardião da Estrada'],[150,'Paladino do Asfalto'],[400,'Lenda da Via']];
function honorRank(h=S.honor||0){let r=HONOR_RANKS[0];for(const x of HONOR_RANKS)if(h>=x[0])r=x;return r[1]}
// +1% de XP e ouro por patente de honra (até +4%)
function honorBonus(){const h=S.honor||0;return HONOR_RANKS.filter(x=>h>=x[0]).length-1}
let honorWarnT=0;
function honorTick(kmh,lim,dm){
  if(!T||!lim||kmh<15||dm<=0||dm>200)return;        // só conta onde o limite é conhecido e o carro está andando
  const over=kmh>lim+Math.max(3,lim*.07);
  if(over){T.hOver=(T.hOver||0)+dm;T.overRun=(T.overRun||0)+dm;
    if(T.overRun>350&&Date.now()-honorWarnT>150000){honorWarnT=Date.now();speak(pick(['A honra do cavaleiro pede calma, aventureiro.','Devagar, herói. A pressa mancha sua honra.','O bardo não canta sobre quem corre demais.']),'fun')}}
  else{T.hOk=(T.hOk||0)+dm;T.overRun=0}
}
function honorResult(){
  const ok=T?.hOk||0,ov=T?.hOver||0,tot=ok+ov;
  if(tot<800)return null;                            // trecho com limite conhecido curto demais pra julgar
  const pct=ok/tot,km=tot/1000;let pts=0,txt;
  if(pct>=.97){pts=Math.max(1,Math.round(km));txt=`⚖️ Honra intacta: ${Math.round(pct*100)}% dentro do limite (+${pts} honra)`}
  else if(pct>=.85){pts=0;txt=`⚖️ Honra abalada: ${Math.round(pct*100)}% dentro do limite`}
  else{pts=-Math.max(1,Math.round(km/2));txt=`⚖️ Honra manchada: só ${Math.round(pct*100)}% dentro do limite (${pts} honra)`}
  return{pct,pts,txt};
}

/* ═════ BARDO: BAIRROS SÃO REINOS ═════ */
let realmCur=null,realmCand=null,realmCandN=0,realmSaid=0;
function bairroAt(lat,lon){
  if(!PL)return null;
  if(!PL.bairros)PL.bairros=PL.items.filter(x=>x.c==='b');
  let best=null,bd=1e9;const k=Math.cos(lat*Math.PI/180);
  for(const b of PL.bairros){const d=(b.lat-lat)**2+((b.lon-lon)*k)**2;if(d<bd){bd=d;best=b}}
  return best&&bd<(0.022**2)?best.n:null;           // até ~2,4 km do centro do bairro
}
function bardTick(lat,lon){
  const b=bairroAt(lat,lon);if(!b)return;
  if(b===realmCur){realmCand=null;return}
  if(b!==realmCand){realmCand=b;realmCandN=1;return}
  if(++realmCandN<3)return;                          // 3 leituras seguidas no mesmo bairro (evita pisca-pisca na divisa)
  const first=realmCur===null;realmCur=b;realmCand=null;
  if(T){T.realms=T.realms||[];if(!T.realms.includes(b))T.realms.push(b)}
  S.realms=S.realms||[];const isNew=!S.realms.includes(b);
  if(isNew&&!simSnap){S.realms.push(b);const x=gainXP(25+S.lvl*3);if(T)T.newRealms=(T.newRealms||0)+1;
    card('🏰',`Reino descoberto: ${esc(b)}`,`+${x} XP · ${S.realms.length} reinos conhecidos`,'gold');checkAch()}
  if(first&&!isNew)return;
  if(complexNear||Date.now()-realmSaid<70000)return;  // nunca atrapalha a voz das manobras
  realmSaid=Date.now();
  speak(isNew?pick([`Um novo reino surge no horizonte: ${b}!`,`Terras inexploradas! Você descobriu o reino de ${b}.`,`O bardo anota no mapa: o reino de ${b}.`])
    :pick([`Você adentra o reino de ${b}.`,`Bem-vindo de volta às terras de ${b}.`,`O estandarte de ${b} tremula à sua passagem.`]),'fun');
}

/* ═════ CERCO NO ENGARRAFAMENTO ═════ */
let jamHist=[],jamWave=0,jamLast=0,jamActive=false;
function siegeTick(f,rem){
  if(!T)return;
  const now=Date.now();jamHist.push([now,f.lat,f.lon]);while(jamHist.length&&now-jamHist[0][0]>130000)jamHist.shift();
  if(jamHist.length<5||now-jamHist[0][0]<110000||rem<600){if(jamActive&&rem<600)jamActive=false;return}
  const moved=hav(jamHist[0][1],jamHist[0][2],f.lat,f.lon),kmh=(f.spd||0)*3.6;
  const jam=moved<260&&kmh<15;                        // < 260 m em ~2 min: engarrafado (semáforo não chega nisso)
  if(!jam){if(jamActive){jamActive=false;if(jamWave)card('🛡️','O cerco foi rompido!',`${jamWave} onda(s) repelida(s)`,'gold')}jamWave=0;return}
  if(!jamActive){jamActive=true;jamWave=0;jamLast=0;speak('Engarrafamento! Os monstros cercam o comboio. Seu herói vai defender sozinho.','fun')}
  if(jamWave>=6||now-jamLast<45000)return;
  jamLast=now;jamWave++;T.siege=(T.siege||0)+1;
  const m=rollMonster(f.lat,f.lon,T.m/1000);m.n=m.n+' (cerco)';
  battle({id:0,done:false,m,mk:null,lat:f.lat,lon:f.lon});
  card('🛡️',`Cerco — onda ${jamWave}`,'Seu herói segura a linha enquanto o trânsito anda','');
}

/* ═════ CRÔNICA DA VIAGEM ═════ */
function chronicle(km,bossWin,honor){
  const p=[];
  const dist=km>=1?`${km.toFixed(1).replace('.',',')} km`:`${Math.round(km*1000)} m`;
  p.push(pick([`Partindo sob ${isNight()?'o céu da noite':'a luz do dia'}, ${S.name} percorreu ${dist} rumo a ${short(dest.name)}.`,
    `Foram ${dist} de estrada até ${short(dest.name)}.`]));
  if(T.realms?.length>1)p.push(`Atravessou ${T.realms.length} reinos${T.newRealms?`, ${T.newRealms} deles nunca vistos antes`:''}.`);
  if(T.kills)p.push(T.kills===1?'Um monstro caiu pelo caminho.':`${T.kills} monstros tombaram pelo caminho${T.siege?`, ${T.siege} deles durante um cerco no trânsito`:''}.`);
  if(T.deep)p.push(`Nas terras distantes, enfrentou ${T.deep} criatura(s) ancestral(is).`);
  p.push(bossWin?`O guardião de ${short(dest.name)} foi derrotado.`:`O guardião de ${short(dest.name)} resistiu, mas o baú foi conquistado.`);
  if(honor)p.push(honor.pct>=.97?'E o fez com honra: respeitou os limites da estrada.':honor.pct>=.85?'A pressa falou mais alto em alguns trechos.':'A estrada lembrará da velocidade imprudente.');
  return p.join(' ');
}

/* ═════ PATRULHAS (rotas da rotina) ═════ */
function tripLog(){
  if(simSnap||!dest||!T)return;
  const o=T.origin;if(!o)return;
  const d=new Date();S.tripsLog=S.tripsLog||[];
  S.tripsLog.push({n:short(dest.name),la:+dest.lat.toFixed(5),lo:+dest.lon.toFixed(5),ola:+o[0].toFixed(4),olo:+o[1].toFixed(4),
    h:d.getHours()+d.getMinutes()/60,wd:d.getDay()>=1&&d.getDay()<=5?1:0,t:Date.now()});
  if(S.tripsLog.length>120)S.tripsLog=S.tripsLog.slice(-120);
}
// uma rotina = mesma origem (<600 m) e mesmo destino (<200 m), mesmo tipo de dia, horário parecido (±1 h), 3+ vezes
function patrolFor(lat,lon,now=new Date()){
  const L=S.tripsLog||[];if(L.length<3)return null;
  const h=now.getHours()+now.getMinutes()/60,wd=now.getDay()>=1&&now.getDay()<=5?1:0;
  const cand=L.filter(x=>x.wd===wd&&Math.abs(x.h-h)<=1&&hav(lat,lon,x.ola,x.olo)<600&&hav(lat,lon,x.la,x.lo)>800);
  const groups=[];
  for(const x of cand){const g=groups.find(g=>hav(g[0].la,g[0].lo,x.la,x.lo)<200);if(g)g.push(x);else groups.push([x])}
  groups.sort((a,b)=>b.length-a.length);
  const g=groups[0];if(!g||g.length<3)return null;
  const last=g[g.length-1];return{name:last.n,lat:last.la,lon:last.lo,n:g.length};
}
let patrolOffered=0;
function patrolCheck(){
  if(isNav||PR.length||!lastFix||Date.now()-patrolOffered<20*60000)return;
  if(!$('searchPanel')||$('searchPanel').style.display==='none'||document.body.classList.contains('searching'))return;
  const p=patrolFor(lastFix.lat,lastFix.lon);if(!p)return;
  patrolOffered=Date.now();
  const fav=S.fav&&['home','work'].find(k=>S.fav[k]&&hav(S.fav[k].lat,S.fav[k].lon,p.lat,p.lon)<200);
  const nm=fav==='home'?'Casa':fav==='work'?'Trabalho':p.name;
  showPatrol(nm,p);
  speak(`Patrulha de sempre: ${nm}? Toque em partir.`,'nav');
}
function showPatrol(nm,p){
  let b=$('patrolCard');
  if(!b){b=document.createElement('div');b.id='patrolCard';document.body.appendChild(b)}
  b.innerHTML=`<div class="pc-ic">⚔️</div><div class="pc-tx"><b>Patrulha: ${esc(nm)}</b><span>Sua rota de sempre neste horário (${p.n}×)</span></div>
    <button class="pc-go">Partir</button><button class="pc-x" aria-label="Agora não">✕</button>`;
  b.querySelector('.pc-go').onclick=()=>{b.classList.remove('on');window.__patrol=1;goTo({name:nm,sub:'',lat:p.lat,lon:p.lon})};
  b.querySelector('.pc-x').onclick=()=>b.classList.remove('on');
  b.classList.add('on');setTimeout(()=>b.classList.remove('on'),60000);
}

/* ═════ LIGAÇÕES ═════ */
let jLast=null;
// chamado a cada posição durante a navegação
function journeyTick(f,sn,kmh,lim){
  if(!T||window.__noJourney)return;   // __noJourney: só nos testes
  if(!T.origin)T.origin=[f.lat,f.lon];
  const dm=jLast?hav(jLast[0],jLast[1],f.lat,f.lon):0;jLast=[f.lat,f.lon];
  honorTick(kmh,lim,dm);
  bardTick(f.lat,f.lon);
  siegeTick(f,Math.max(0,R.total-sn.prog));
}
function journeyStart(){jLast=null;jamHist=[];jamWave=0;jamActive=false;realmCur=null;realmCand=null}
setInterval(patrolCheck,30000);
