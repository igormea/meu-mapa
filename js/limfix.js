'use strict';
/* ── "LIMITE ERRADO" ─────────────────────────────────────────
   Toque na placa (ou no velocímetro) durante a jornada → escolha o limite certo.
   1) Na hora: o app passa a usar o seu número naquele trecho (e em toda rota futura que passar ali).
   2) A correção vai no seu save (nuvem), então não se perde ao reinstalar.
   3) O app abre uma "nota" anônima no OpenStreetMap, pra um mapeador conferir e corrigir
      o mapa de verdade (aí todo mundo ganha, inclusive Waze-like apps que usam OSM).        */
const LIM_OPTS=[20,30,40,50,60,70,80,90,100,110];
function limFixes(){return S.limFix||(S.limFix=[])}
// distância (m) de um ponto até um trecho de linha, em plano local
function dSeg(p,a,b){
  const k=111320,c=Math.cos(p[0]*Math.PI/180);
  const ax=(a[1]-p[1])*k*c,ay=(a[0]-p[0])*k,bx=(b[1]-p[1])*k*c,by=(b[0]-p[0])*k;
  const dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy;let t=L?-(ax*dx+ay*dy)/L:0;t=Math.max(0,Math.min(1,t));
  return Math.hypot(ax+t*dx,ay+t*dy);
}
function nearFix(p,fx,tol=22){const q=fx.p;for(let i=1;i<q.length;i++)if(dSeg(p,q[i-1],q[i])<tol)return true;return q.length===1&&hav(p[0],p[1],q[0][0],q[0][1])<tol}
// aplica as correções salvas nos limites de uma rota (chamado quando os limites chegam).
// Os trechos do mapa podem ser longos (km): corta em pedaços de 25 m e troca só onde a correção passa.
function fixBox(f){if(!f.bb){let a=90,b=180,c=-90,d=-180;for(const q of f.p){a=Math.min(a,q[0]);b=Math.min(b,q[1]);c=Math.max(c,q[0]);d=Math.max(d,q[1])}
  const m=.0004;f.bb=[a-m,b-m,c+m,d+m]}return f.bb}
function applyLimFix(Rt){
  if(!Rt?.limits)return;
  const base=Rt.limBase||(Rt.limBase=Rt.limits.map(e=>({a:e.a,b:e.b,v:e.v})));
  const F=limFixes();
  if(!F.length){Rt.limits=base.map(e=>({...e,o:e.v}));Rt.limIdx=0;return}
  const out=[],push=(a,b,v,o,fix)=>{const l=out[out.length-1];if(l&&l.v===v&&l.o===o&&l.fix===fix&&Math.abs(l.b-a)<1)l.b=b;else out.push({a,b,v,o,fix})};
  for(const e of base){
    for(let s=e.a;s<e.b;s+=25){
      const t=Math.min(e.b,s+25),m=pointAt(Rt,(s+t)/2);
      const fx=F.find(f=>{const bb=fixBox(f);return m[0]>=bb[0]&&m[0]<=bb[2]&&m[1]>=bb[1]&&m[1]<=bb[3]&&nearFix(m,f)});
      push(s,t,fx?fx.v:e.v,e.v,!!fx);
    }
  }
  Rt.limits=out;Rt.limIdx=0;
}
function limTap(){
  if(!isNav||!R)return;
  const L=R.limits,i=L?.length?(limitAt(R,R.prog||0),R.limIdx||0):-1,e=i>=0?L[i]:null,cur=e?.v||0;
  const d=$('limDlg');
  d.innerHTML=`<div class="ld-box"><div class="ld-t">🪧 Qual é o limite aqui?</div>
    <div class="ld-s">Agora o mapa diz <b>${cur?cur+' km/h':'sem limite'}</b>. Toque no certo:</div>
    <div class="ld-g">${LIM_OPTS.map(v=>`<button class="${v===cur?'on':''}" onclick="limSet(${v})">${v}</button>`).join('')}</div>
    ${e?.fix?`<button class="ld-undo" onclick="limUndo()">↩ Voltar ao limite do mapa (${e.o||'sem limite'})</button>`:''}
    <div class="ld-n">A correção vale na hora pra você. Também avisamos o OpenStreetMap (anônimo) pra corrigirem o mapa de todos.</div>
    <button class="ld-x" onclick="limClose()">Cancelar</button></div>`;
  d.classList.add('on');layerPush('limDlg',limClose);
}
function limClose(){$('limDlg').classList.remove('on');layerPop('limDlg')}
// trecho "com o mesmo limite" em volta de onde você está (até ~1,5 km pra cada lado)
function limStretch(){
  const L=R.limits,p=R.prog||0;limitAt(R,p);let i=R.limIdx||0;if(!L?.[i])return null;
  const o=L[i].o??L[i].v;let a=i,b=i;
  while(a>0&&(L[a-1].o??L[a-1].v)===o&&p-L[a-1].a<1500)a--;
  while(b<L.length-1&&(L[b+1].o??L[b+1].v)===o&&L[b+1].b-p<1500)b++;
  return{o,from:Math.max(L[a].a,p-1500),to:Math.min(L[b].b,p+1500)};
}
function limSet(v){
  limClose();const st=limStretch();if(!st)return toast('Ainda carregando os limites desta rota');
  const stp=Math.max(30,(st.to-st.from)/90),pts=[];for(let s=st.from;s<st.to;s+=stp)pts.push(pointAt(R,s).map(x=>+x.toFixed(5)));
  pts.push(pointAt(R,st.to).map(x=>+x.toFixed(5)));
  const fx={p:pts,v,o:st.o,t:Date.now()};
  // troca correções antigas do mesmo trecho
  const here=pointAt(R,R.prog||0);
  S.limFix=limFixes().filter(f=>!nearFix(here,f,40)).concat(fx).slice(-200);
  applyLimFix(R);save();cloudSoon?.();
  toast(`🪧 Limite corrigido pra ${v} km/h neste trecho`);
  limNoteOSM(fx);
}
function limUndo(){
  limClose();const mid=pointAt(R,R.prog||0);
  S.limFix=limFixes().filter(f=>!nearFix(mid,f,40));applyLimFix(R);save();toast('↩ Voltou ao limite do mapa');
}
// nota anônima no OpenStreetMap (sem conta). Um mapeador da região confere e corrige.
async function limNoteOSM(fx){
  if(location.hostname==='localhost'||window.__noOSM)return;
  const m=fx.p[Math.floor(fx.p.length/2)];
  const txt=`Limite de velocidade aqui parece ser ${fx.v} km/h (o mapa diz ${fx.o?fx.o+' km/h':'nenhum'}).\n`+
    `Trecho de ~${Math.round(hav(fx.p[0][0],fx.p[0][1],fx.p[fx.p.length-1][0],fx.p[fx.p.length-1][1]))} m. `+
    `Informado por um motorista local pelo app Ranvus Maps. Por favor confiram a placa (maxspeed).`;
  try{
    const body=new URLSearchParams({lat:m[0],lon:m[1],text:txt});
    await fetch('https://api.openstreetmap.org/api/0.6/notes.json',{method:'POST',body});
    S.osmNotes=(S.osmNotes||0)+1;save();
  }catch{}
}
