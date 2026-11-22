'use strict';
/* ═════ REGISTRO AUTOMÁTICO DE ERROS ═════
   Quando algo dá errado no celular de alguém, o app guarda sozinho o que aconteceu, sem dados pessoais:
   versão, tela, mensagem, onde no código, tipo de aparelho e um ID aleatório do aparelho (sem nome, e-mail ou localização).
   errors/{AAAAMMDD}/{id} — ninguém lê pelo app (as regras bloqueiam); só no painel do Firebase.
   Mesmo erro: 1 vez por dia por aparelho. Máximo de 20 por sessão. Fora do ar em testes (localhost). */
(function(){
  if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&!window.__errlogTest)return;
  const MAX=20,Q=[];let sent=0;
  const dev=(()=>{try{let d=localStorage.getItem('ranvus_dev');if(!d){d=Math.random().toString(36).slice(2,10);localStorage.setItem('ranvus_dev',d)}return d}catch{return'?'}})();
  const day=()=>new Date().toISOString().slice(0,10).replace(/-/g,'');
  // tira coordenadas, e-mails e tokens que possam aparecer numa mensagem
  const clean=s=>String(s||'').replace(/-?\d{1,3}\.\d{3,}/g,'#').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,'@').replace(/(auth|token|key)=[^&\s]+/gi,'$1=…').slice(0,400);
  const IGNORE=/ResizeObserver loop|^Script error\.?$|chrome-extension:|Load failed|AbortError|The user aborted|NetworkError when attempting|Failed to fetch/i;
  function where(){
    try{const p=[];if(typeof isNav!=='undefined'&&isNav)p.push('nav');
      if(document.getElementById('sheet')?.classList.contains('on'))p.push('ficha:'+(typeof sheetTab!=='undefined'?sheetTab:'?'));
      if(document.body.classList.contains('arrive'))p.push('chegada');return p.join(',')||'mapa'}catch{return'?'}
  }
  function report(kind,msg,src,stack){
    msg=clean(msg);if(!msg||IGNORE.test(msg)||sent>=MAX)return;
    const sig=(kind+msg+(src||'')).slice(0,200);let h=0;for(const c of sig)h=(h*31+c.charCodeAt(0))|0;
    const key='ranvus_err_'+h;try{if(localStorage.getItem(key)===day())return;localStorage.setItem(key,day())}catch{}
    sent++;
    Q.push({k:kind,msg,src:clean(src).slice(0,160),stack:clean(stack).slice(0,900),
      v:typeof APPV!=='undefined'?APPV:'?',t:Date.now(),dev,where:where(),
      app:typeof NATIVE!=='undefined'&&NATIVE?'apk':'web',ua:clean(navigator.userAgent.replace(/^Mozilla\/5\.0 /,'')).slice(0,160)});
    setTimeout(flush,1500);
  }
  async function flush(){
    if(!Q.length||typeof fbToken!=='function')return;
    let a;try{a=await fbToken()}catch{return}
    while(Q.length){const e=Q.shift();
      try{await fetch(`${FB_CONFIG.databaseURL}/errors/${day()}.json?auth=${a.token}`,{method:'POST',body:JSON.stringify(e)})}catch{}}
  }
  window.addEventListener('error',e=>{if(e.target&&e.target!==window&&e.target.src){report('recurso','não carregou: '+String(e.target.src).split('?')[0].split('/').slice(-2).join('/'),'');return}
    report('erro',e.message,`${String(e.filename||'').split('/').pop().split('?')[0]}:${e.lineno}:${e.colno}`,e.error?.stack)},true);
  window.addEventListener('unhandledrejection',e=>{const r=e.reason;report('promessa',r?.message||String(r),'',r?.stack)});
  // falhas que o app já trata (login, nuvem, guilda…) também são registradas
  const w=console.warn.bind(console);
  console.warn=(...a)=>{w(...a);if(typeof a[0]==='string'&&a[0].length<30&&a.length>1){const e=a[1];report('aviso:'+a[0],e?.message||String(e),'',e?.stack)}};
  window.logErr=(tag,e)=>report('aviso:'+tag,e?.message||String(e),'',e?.stack);
  window.addEventListener('load',()=>setTimeout(flush,4000));
})();
