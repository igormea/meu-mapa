'use strict';
/* ═════ SAVE NA NUVEM ═════
   saves/{uid} = {t, lvl, km, cls, name, v, data:"<S em JSON>"} — só o dono lê/escreve (regras do RTDB).
   S._syncT = horário do último save que este aparelho mandou/recebeu da nuvem.
   Envio: no máx. a cada 3 min quando algo mudou; na hora ao chegar, subir de nível ou sair do app.
   Ao entrar/abrir: se a nuvem tem algo mais novo que este aparelho, pergunta — nunca sobrescreve sozinho. */
const CLOUD={dirty:false,last:0,busy:false,checked:false,hold:false};
const CLOUD_EVERY=180000;
const cloudSum=s=>({lvl:s.lvl||1,km:Math.round(s.stats?.km||0),cls:s.cls,name:s.name||'',kills:s.stats?.kills||0,best:Object.keys(s.best||{}).length});
const cloudEmpty=s=>!s.cls||((s.lvl||1)<=1&&(s.xp||0)<20&&(s.stats?.km||0)<1);
const cloudOn=()=>typeof isLogged==='function'&&isLogged()&&!simSnap&&!CLOUD.hold&&S.cls;

// chamado a cada save(): marca que há mudança; força envio em momentos importantes
function cloudSoon(now){
  if(!cloudOn())return;CLOUD.dirty=true;
  if(now||Date.now()-CLOUD.last>CLOUD_EVERY)cloudPush();
}
async function cloudPush(){
  if(!cloudOn()||!CLOUD.checked||CLOUD.busy||!CLOUD.dirty)return;
  CLOUD.busy=true;const t=Date.now();
  try{
    const prev=S._syncT;S._syncT=t;
    const sm=cloudSum(S);
    await fbSet('saves/'+uidMe(),{t,lvl:sm.lvl,km:sm.km,cls:S.cls,name:S.name,v:APPV,data:JSON.stringify(S)});
    CLOUD.dirty=false;CLOUD.last=t;try{localStorage.setItem(SAVE_KEY,JSON.stringify(S))}catch{}
  }catch(e){S._syncT=prev;console.warn('nuvem',e)}
  CLOUD.busy=false;
}
// ao entrar com Google ou abrir o app já logado
async function cloudCheck(){
  if(!isLogged()||simSnap||CLOUD.checked)return;
  let c=null;
  try{c=await fbGet('saves/'+uidMe())}catch(e){console.warn('nuvem',e);return}
  CLOUD.checked=true;
  if(!c||!c.data){CLOUD.dirty=true;return cloudPush()}               // primeira vez: sobe o save deste aparelho
  if(c.t<=(S._syncT||0)){CLOUD.dirty=true;return cloudPush()}         // este aparelho está em dia (ou à frente)
  let cs;try{cs=JSON.parse(c.data)}catch{return}
  const a=cloudSum(S),b=cloudSum(cs);
  if(a.lvl===b.lvl&&a.km===b.km&&a.kills===b.kills){S._syncT=c.t;save();return}   // mesmo progresso
  cloudAsk(cs,c.t,cloudEmpty(S));
}
function cloudCard(s,lab,when){const m=cloudSum(s);const c=(typeof CLASSES!=='undefined'&&CLASSES[m.cls])||{};
  return`<div class="cl-card"><div class="cl-lab">${lab}</div><b>${esc(m.name)}</b><span>${esc(c.nome||m.cls||'')}</span>
    <div class="cl-n">Nv ${m.lvl}</div><span>${m.km} km · ${m.kills} monstros · ${m.best} no bestiário</span>${when?`<small>${when}</small>`:''}</div>`}
function cloudAsk(cs,t,localEmpty){
  CLOUD.hold=true;$('cloudDlg')?.remove();
  const d=document.createElement('div');d.id='cloudDlg';
  const when='salvo '+new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  d.innerHTML=localEmpty
    ?`<div class="cl-box"><div class="cl-t">☁️ Encontrei seu progresso</div>${cloudCard(cs,'Na nuvem',when)}
       <button class="btn prim" onclick="cloudRestore()">Restaurar meu herói</button>
       <a class="gate-skip" onclick="cloudKeepLocal(true)">Começar do zero (apaga o da nuvem)</a></div>`
    :`<div class="cl-box"><div class="cl-t">☁️ Qual progresso você quer manter?</div>
       <div class="r2" style="color:#c7d0e4;margin-bottom:6px">Este aparelho e a nuvem têm heróis diferentes. O que você não escolher será substituído.</div>
       <div class="cl-two">${cloudCard(S,'Neste aparelho','')}${cloudCard(cs,'Na nuvem',when)}</div>
       <div class="cl-two"><button class="btn" onclick="cloudKeepLocal()">Manter este</button><button class="btn prim" onclick="cloudRestore()">Usar o da nuvem</button></div></div>`;
  document.body.appendChild(d);CLOUD.pending={cs,t};
}
function cloudRestore(){
  const p=CLOUD.pending;if(!p)return;p.cs._syncT=p.t;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(p.cs))}catch{}
  simSnap=null;S=load();CLOUD.hold=false;$('cloudDlg')?.remove();
  toast('Herói restaurado da nuvem');setTimeout(()=>location.reload(),600);
}
function cloudKeepLocal(fromEmpty){
  const p=CLOUD.pending;CLOUD.hold=false;CLOUD.pending=null;$('cloudDlg')?.remove();
  if(p)S._syncT=p.t;CLOUD.dirty=true;                     // sem herói ainda: sobe assim que escolher a classe
  if(S.cls){cloudPush();toast(fromEmpty?'Começando do zero':'Progresso deste aparelho salvo na nuvem')}
}
setInterval(()=>{if(CLOUD.dirty&&Date.now()-CLOUD.last>CLOUD_EVERY)cloudPush()},60000);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&CLOUD.dirty)cloudPush()});
setTimeout(cloudCheck,2500);
