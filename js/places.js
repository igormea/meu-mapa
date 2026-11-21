'use strict';
/* ── ÍNDICE PRÓPRIO DA GRANDE FORTALEZA ─────────────────────
   data/places.json (gerado pelo robô a partir do OpenStreetMap): ruas, bairros e lugares.
   Busca instantânea, sem internet, sem acento, por pedaço de palavra e com 1 erro de digitação. */
const PCAT={r:['🛣️','Rua'],b:['🏘️','Bairro'],g:['⛽','Posto'],h:['🏥','Saúde'],e:['🎓','Educação'],f:['🍽️','Comida'],
  m:['🏦','Banco'],c:['⛪','Igreja'],x:['🚉','Transporte'],p:['🅿️','Estacionamento'],s:['🛒','Loja'],S:['🛍️','Shopping'],
  l:['🌴','Lazer'],t:['🏛️','Turismo'],o:['📍','Lugar']};
// palavras de categoria que a pessoa pode digitar ("farmácia", "posto"...) → categoria
const PKW={posto:'g',combustivel:'g',gasolina:'g',hospital:'h',farmacia:'h',clinica:'h',upa:'h',escola:'e',faculdade:'e',universidade:'e',
  restaurante:'f',lanchonete:'f',pizzaria:'f',padaria:'f',banco:'m',igreja:'c',shopping:'S',supermercado:'s',mercado:'s',praia:'l',praca:'l',parque:'l',
  estacionamento:'p',aeroporto:'x',rodoviaria:'x',metro:'x',bairro:'b'};
let PL=null,plLoading=null;
function loadPlaces(){
  if(PL||plLoading)return plLoading;
  plLoading=fetch('data/places.json?v='+APPV).then(r=>r.ok?r.json():null).then(j=>{
    if(!j||!j.d)return;
    PL={subs:j.subs||[],gen:j.gen,items:j.d.map(x=>{const n=norm(x[0]);return{n:x[0],w:n.split(/[^a-z0-9]+/).filter(Boolean),
      lat:x[1]/1e5,lon:x[2]/1e5,c:x[3],s:x[4]}})};
  }).catch(()=>{});
  return plLoading;
}
// distância de edição ≤ 1 (troca, falta ou sobra de 1 letra), comparando com o começo da palavra
function near1(t,w){
  if(w.startsWith(t))return true;
  if(t.length<4)return false;
  const p=w.slice(0,t.length);let i=0;while(i<t.length&&t[i]===p[i])i++;
  return t.slice(i+1)===p.slice(i+1)||t.slice(i+1)===w.slice(i,t.length-1)||t.slice(i)===w.slice(i+1,t.length+1)||
    (t[i]===p[i+1]&&t[i+1]===p[i]&&t.slice(i+2)===p.slice(i+2));
}
// toks: palavras já normalizadas e com abreviações expandidas (expandQ)
function localSearch(toks,c){
  const pt=typeof portalSearch==='function'?portalSearch(toks):[];
  if(!PL||!toks.length)return pt;
  const res=[],k=Math.cos(c.lat*Math.PI/180);
  for(const it of PL.items){
    let sc=0,ok=true;
    for(const t of toks){
      const cb=PKW[t]===it.c?.3:0;                                  // nome E categoria batem ("posto" → postos de combustível)
      if(it.w.includes(t))sc+=1.2+cb;                              // palavra exata ("rua 10" ≠ "rua 102")
      else if(it.w.some(w=>w.startsWith(t)))sc+=1+cb;
      else if(PKW[t]===it.c)sc+=.8;                                 // "farmácia" acha farmácias mesmo sem a palavra no nome
      else if(it.w.some(w=>near1(t,w)))sc+=.7;
      else if(t.length>=3&&it.w.some(w=>w.includes(t)))sc+=.5;
      else{ok=false;break}
    }
    if(!ok)continue;
    const d2=(it.lat-c.lat)**2+((it.lon-c.lon)*k)**2;
    res.push([Math.round(sc*5)/5,d2,it]);
  }
  res.sort((a,b)=>(b[0]-a[0])||(a[1]-b[1]));
  return pt.concat(res.slice(0,12-pt.length).map(([,,it])=>({name:it.n,lat:it.lat,lon:it.lon,loc:1,ic:PCAT[it.c]?.[0]||'📍',
    sub:[PCAT[it.c]?.[1],it.s>=0?PL.subs[it.s]:''].filter(Boolean).join(' · ')})));
}
setTimeout(loadPlaces,4000);   // já deixa o índice pronto antes da primeira busca
