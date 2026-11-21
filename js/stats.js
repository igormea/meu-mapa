'use strict';
/* ── ESTATÍSTICAS ────────────────────────────────────────
   Histórico por dia (S.hist['2026-11-21'] = {km, k: monstros, tr: viagens, min: minutos dirigindo})
   + recordes + bestiário (S.best = {nome: abates}). Mostrado na aba 📊 da ficha. */
function histDay(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function histAdd(k,n){
  if(simSnap)return;S.hist=S.hist||{};const d=histDay();const h=S.hist[d]=S.hist[d]||{km:0,k:0,tr:0,min:0};h[k]=(h[k]||0)+n;
  const ks=Object.keys(S.hist);if(ks.length>400){ks.sort();for(const x of ks.slice(0,ks.length-400))delete S.hist[x]}   // ~13 meses
}
function bestAdd(name){if(simSnap)return;S.best=S.best||{};const n=name.replace(/ \(cerco\)$/,'').replace(/ Ancestral$/,'');S.best[n]=(S.best[n]||0)+1}
function tripRecord(km,kills,min){
  if(simSnap)return;const r=S.rec=S.rec||{};
  if(km>(r.km||0))r.km=+km.toFixed(1);if(kills>(r.kills||0))r.kills=kills;if(min>(r.min||0))r.min=min;
}
function sumDays(from,to){let o={km:0,k:0,tr:0,min:0};for(const [d,h] of Object.entries(S.hist||{}))if(d>=from&&d<=to)for(const k in o)o[k]+=h[k]||0;return o}
const kmTxt=v=>(v>=100?Math.round(v):v.toFixed(1)).toString().replace('.',',');
function barsSVG(vals,labels,hi){
  const mx=Math.max(1,...vals),W=100/vals.length;
  return `<div class="sbars">${vals.map((v,i)=>`<div class="sbar ${i===hi?'hi':''}"><b>${v?kmTxt(v):''}</b><i style="height:${Math.max(2,v/mx*100)}%"></i><span>${labels[i]}</span></div>`).join('')}</div>`;
}
function statsHTML(){
  const now=new Date(),days=[...Array(7)].map((_,i)=>{const d=new Date(now);d.setDate(d.getDate()-6+i);return d});
  const DW=['dom','seg','ter','qua','qui','sex','sáb'];
  const wk=days.map(d=>(S.hist?.[histDay(d)]?.km)||0);
  const months=[...Array(6)].map((_,i)=>new Date(now.getFullYear(),now.getMonth()-5+i,1));
  const MN=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const mk=months.map(m=>{const a=histDay(m),b=histDay(new Date(m.getFullYear(),m.getMonth()+1,0));return sumDays(a,b).km});
  const w7=sumDays(histDay(days[0]),histDay(now)),m30=sumDays(histDay(new Date(now-29*864e5)),histDay(now));
  const prev7=sumDays(histDay(new Date(now-13*864e5)),histDay(new Date(now-7*864e5)));
  const trend=prev7.km>0?Math.round((w7.km/prev7.km-1)*100):null;
  const r=S.rec||{},hrs=String(Math.round((Object.values(S.hist||{}).reduce((a,h)=>a+(h.min||0),0))/6)/10).replace('.',',');
  const best=Object.entries(S.best||{}).sort((a,b)=>b[1]-a[1]).slice(0,8);
  return `
    <div class="stats">
      <div class="st"><span>📅 Esta semana</span><b>${kmTxt(w7.km)} km</b></div><div class="st"><span>🗓️ Últimos 30 dias</span><b>${kmTxt(m30.km)} km</b></div>
      <div class="st"><span>🚗 Viagens (30 d)</span><b>${m30.tr}</b></div><div class="st"><span>⏱️ Ao volante (30 d)</span><b>${String(Math.round(m30.min/6)/10).replace('.',',')} h</b></div>
    </div>
    ${trend!=null?`<div class="r2" style="margin:6px 2px 0;color:${trend>=0?'#8fd18f':'#e59a8a'}">${trend>=0?'▲':'▼'} ${Math.abs(trend)}% em relação à semana passada</div>`:''}
    <div class="sect">Últimos 7 dias (km)</div>${barsSVG(wk,days.map(d=>DW[d.getDay()]),6)}
    <div class="sect">Últimos 6 meses (km)</div>${barsSVG(mk,months.map(m=>MN[m.getMonth()]),5)}
    <div class="sect">Totais</div>
    <div class="stats">
      <div class="st"><span>🗺️ Distância</span><b>${kmTxt(S.stats.km)} km</b></div><div class="st"><span>🏰 Jornadas</span><b>${S.stats.trips}</b></div>
      <div class="st"><span>💀 Monstros</span><b>${fmtN(S.stats.kills)}</b></div><div class="st"><span>🐉 Dragões</span><b>${S.stats.dragons}</b></div>
      <div class="st"><span>🏘️ Reinos</span><b>${(S.realms||[]).length}</b></div><div class="st"><span>⚖️ Honra</span><b>${S.honor||0}</b></div>
      <div class="st"><span>🌙 Viagens noturnas</span><b>${S.stats.nightTrips||0}</b></div><div class="st"><span>⏱️ Ao volante</span><b>${hrs} h</b></div>
    </div>
    <div class="sect">Recordes</div>
    <div class="stats">
      <div class="st"><span>📏 Maior viagem</span><b>${r.km?kmTxt(r.km)+' km':'—'}</b></div><div class="st"><span>⚔️ Mais monstros</span><b>${r.kills||'—'}</b></div>
      <div class="st"><span>⌛ Viagem mais longa</span><b>${r.min?r.min+' min':'—'}</b></div><div class="st"><span>🏛️ Ancestrais</span><b>${S.stats.anc||0}</b></div>
    </div>
    <div class="sect">Bestiário (mais derrotados)</div>
    ${best.length?best.map(([n,c])=>{const m=MONS.find(x=>x.n===n);return`<div class="row best"><div class="r1"><span>${m?.m3d?monPic(m.m3d):(m?.e||'👾')} ${esc(n)}</span><b>${c}×</b></div></div>`}).join(''):'<div class="r2">Nenhum monstro derrotado ainda.</div>'}
    <div class="r2" style="font-size:11px;color:#837aa8;margin-top:10px">O histórico por dia começa a contar a partir desta versão.</div>`;
}
