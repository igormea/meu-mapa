'use strict';
/* ── TERRENOS ────────────────────────────────────────────
   Onde você está define quais monstros aparecem. A grade vem do OpenStreetMap (data/terrain.json, robô semanal):
   praia, lagoa/rio, mangue, mata/parque, zona industrial/porto, comércio, rural; o resto é zona urbana.
   Fora da Grande Fortaleza (ou em alta velocidade na rodovia) vira "Estrada". */
const TER={
  u:{n:'Zona Urbana',ic:'🏙️'},c:{n:'Comércio',ic:'🛍️'},h:{n:'Centro Histórico',ic:'🏛️'},i:{n:'Zona Industrial',ic:'🏭'},
  p:{n:'Praia e Dunas',ic:'🏖️'},a:{n:'Lagoa e Rio',ic:'🏞️'},m:{n:'Mangue',ic:'🦀'},v:{n:'Mata e Parque',ic:'🌳'},
  r:{n:'Sertão',ic:'🌵'},e:{n:'Estrada',ic:'🛣️'}};
const OLD_REG={costa:'p',centro:'h',mata:'v',sertao:'r',cidade:'u'};   // saves antigos
let TG=null,tgLoading=null;
function loadTerrain(){
  if(TG||tgLoading)return tgLoading;
  tgLoading=fetch('data/terrain.json?v='+APPV).then(r=>r.ok?r.json():null).then(j=>{
    if(!j||!j.rows)return;
    const R=j.rows.length,C=Math.round((j.bb[3]-j.bb[1])/j.step),g=new Uint8Array(R*C);
    j.rows.forEach((row,r)=>{let c=0;for(const m of row.matchAll(/([a-z])(\d+)/g)){g.fill(m[1].charCodeAt(0),r*C+c,r*C+c+(+m[2]));c+=+m[2]}});
    // praia de verdade é uma faixa comprida no litoral; manchas pequenas de areia (bancos de rio, terrenos) viram zona urbana
    const P=112,U=117,seen=new Uint8Array(R*C);
    for(let i=0;i<R*C;i++){if(g[i]!==P||seen[i])continue;const st=[i],comp=[];seen[i]=1;
      while(st.length){const x=st.pop();comp.push(x);const r=(x/C)|0,c=x%C;
        for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if(rr<0||cc<0||rr>=R||cc>=C)continue;const y=rr*C+cc;if(g[y]===P&&!seen[y]){seen[y]=1;st.push(y)}}}
      if(comp.length<12)for(const x of comp)g[x]=U}
    TG={bb:j.bb,step:j.step,R,C,g,gen:j.gen};
  }).catch(()=>{});
  return tgLoading;
}
function tgCell(lat,lon){
  if(!TG)return null;const r=Math.floor((lat-TG.bb[0])/TG.step),c=Math.floor((lon-TG.bb[1])/TG.step);
  if(r<0||c<0||r>=TG.R||c>=TG.C)return undefined;
  return String.fromCharCode(TG.g[r*TG.C+c]);
}
let curKmh=0;
function terrainAt(lat,lon,kmh=curKmh){
  const inCentro=hav(lat,lon,-3.7275,-38.5275)<1500;
  if(TG){
    const k=tgCell(lat,lon);
    if(k===undefined)return isNav?'e':'r';             // fora da Grande Fortaleza
    if(kmh>=75)return'e';                              // rodovia
    if(k==='u'||k==='c'){                              // faixa fina de praia a ~1 quadra também conta (rio não: ia virar "rio" a cidade toda)
      for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=tgCell(lat+dr*TG.step,lon+dc*TG.step);if(n==='p')return n}
      if(inCentro)return'h';
    }
    return k||'u';
  }
  // sem a grade ainda: aproximação antiga
  if(kmh>=75)return'e';
  return OLD_REG[regionAtOld(lat,lon)]||'u';
}
setTimeout(loadTerrain,2500);
// saves antigos: regiões viram terrenos
try{if(S.regions)S.regions=[...new Set(S.regions.map(r=>OLD_REG[r]||r))];if(OLD_REG[S.curRegion])S.curRegion=OLD_REG[S.curRegion]}catch{}
