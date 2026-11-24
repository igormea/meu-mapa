'use strict';
/* ── VOLTAR DO CELULAR + ARRASTAR PRA FECHAR ─────────────────
   Cada janela aberta (ficha, busca, prévia da rota, paradas...) vira uma "camada" no histórico.
   O botão voltar fecha a de cima; no mapa, pergunta se quer sair do app.
   Janelas com a barrinha no topo fecham arrastando pra baixo. */
const LAYERS=[];let layerSkip=0,exitOpen=false;
function layerPush(id,close){
  if(LAYERS.length&&LAYERS[LAYERS.length-1].id===id)return;
  LAYERS.push({id,close});try{history.pushState({ly:id},'')}catch{}
}
// a janela foi fechada pela própria tela (✕, arrastar, escolher algo): tira a entrada do histórico também
function layerPop(id){
  const i=LAYERS.map(l=>l.id).lastIndexOf(id);if(i<0)return;
  if(i===LAYERS.length-1){LAYERS.pop();layerSkip++;try{history.back()}catch{layerSkip--}}
  else LAYERS.splice(i,1);
}
function onBack(){
  if(exitOpen){exitClose();return}
  if(LAYERS.length){const L=LAYERS.pop();try{L.close(true)}catch(e){console.warn(e)}return}
  exitAsk();
}
addEventListener('popstate',e=>{
  if(layerSkip>0){layerSkip--;return}
  const top=e.state&&e.state.rv==='root';
  onBack();
  if(top)try{history.pushState({rv:'guard'},'')}catch{}     // sempre deixa uma "trava" pra o voltar não fechar o app direto
});
try{history.replaceState({rv:'root'},'');history.pushState({rv:'guard'},'')}catch{}

/* aviso de saída */
function exitAsk(){
  let d=$('exitAsk');
  if(!d){d=document.createElement('div');d.id='exitAsk';d.innerHTML=`<div class="ex-box"><div class="ex-t">Sair do Ranvus Maps?</div>
    <div class="ex-s"></div><div class="opt"><button id="exStay">Ficar</button><button id="exGo" class="prim">Sair</button></div></div>`;
    document.body.appendChild(d);d.onclick=e=>{if(e.target===d)exitClose()};
    $('exStay').onclick=exitClose;$('exGo').onclick=exitApp}
  d.querySelector('.ex-s').textContent=isNav?'A jornada em andamento será interrompida.':'Seu progresso já está salvo.';
  d.classList.add('on');exitOpen=true;
}
function exitClose(){$('exitAsk')?.classList.remove('on');exitOpen=false}
function exitApp(){
  exitClose();try{save()}catch{}
  if(NATIVE&&NAT?.app?.exitApp){if(isNav)try{endNav(false)}catch{};NAT.app.exitApp();return}
  toast('Para sair, feche o app pela lista de apps recentes');
}
// APK novo: o plugin nativo entrega o botão voltar aqui (no APK antigo, o voltar já navega pelo histórico acima)
try{if(NATIVE&&NAT?.app?.addListener)NAT.app.addListener('backButton',()=>{if(history.state?.rv==='root')onBack();else history.back()})}catch{}

/* arrastar pra baixo pela barrinha (ou pelo topo da janela) para fechar */
function dragToClose(box,close,zone=46){
  let y0=null,dy=0,samp=[];
  box.addEventListener('pointerdown',e=>{
    const r=box.getBoundingClientRect();if(e.clientY-r.top>zone&&!e.target.closest('.handle'))return;
    if(e.target.closest('input,textarea,button:not(.handle)'))return;
    y0=e.clientY;dy=0;samp=[[e.timeStamp,e.clientY]];box.style.transition='none';try{box.setPointerCapture(e.pointerId)}catch{}
  });
  box.addEventListener('pointermove',e=>{if(y0==null)return;dy=e.clientY-y0;samp.push([e.timeStamp,e.clientY]);if(samp.length>5)samp.shift();
    const d=dy<0?dy*.2:dy;   // pra cima só "resiste" um pouquinho
    box.style.transform=`translateY(${d}px)`});
  const end=()=>{if(y0==null)return;y0=null;const a=samp[0],b=samp[samp.length-1],v=(b[1]-a[1])/Math.max(1,b[0]-a[0]);
    const ease='transform .3s cubic-bezier(.22,1,.36,1)';
    if(dy>110||(dy>24&&v>.45)){box.style.transition='transform .22s cubic-bezier(.4,0,1,1)';box.style.transform='translateY(110%)';
      setTimeout(()=>{box.style.transition='none';box.style.transform='';close();requestAnimationFrame(()=>box.style.transition='')},220)}
    else{box.style.transition=ease;box.style.transform='';setTimeout(()=>box.style.transition='',320)}};
  box.addEventListener('pointerup',end);box.addEventListener('pointercancel',end);
}
