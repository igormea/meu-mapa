'use strict';
/* ── MULTIPLAYER: login Google, apelido, companheiros e guilda ─────────
   Firebase Realtime Database via REST (o mesmo do compartilhamento ao vivo).
   Login: no navegador, botão do Google (Google Identity Services); no APK, tela nativa do Google
   (plugin SocialLogin). O token do Google vira sessão do Firebase (accounts:signInWithIdp).
   Estrutura: users/{uid} perfil público · nicks/{apelido} → uid · friends/{uid}/{outro} = out|in|ok
              groups/{gid} guilda (líder, membros) · invites/{uid}/{gid} convite de guilda
   As regras de segurança no console garantem que cada um só mexe no que é seu. */
const NICK_RE=/^[a-zA-Z0-9_]{3,16}$/;
const SOC={me:null,friends:{},profiles:{},group:null,gid:null,invites:{},busy:false,err:''};

/* ═════ SESSÃO ═════ */
function fbAuth(){try{return JSON.parse(localStorage.getItem('ranvus_fbauth')||'null')}catch{return null}}
function isLogged(){const a=fbAuth();return!!(a&&a.google)}
// navegador: botão oficial do Google (Google Identity Services) desenhado dentro da aba
function gisLoad(){
  if(window.google?.accounts?.id)return Promise.resolve();
  return new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=res;s.onerror=rej;document.head.appendChild(s)});
}
function socGisButton(id='gisBtn'){
  const box=$(id);if(!box||box.dataset.on)return;box.dataset.on=1;
  gisLoad().then(()=>{
    google.accounts.id.initialize({client_id:FB_CONFIG.webClientId,callback:r=>r.credential&&socFinish(r.credential)});
    google.accounts.id.renderButton(box,{theme:'filled_black',size:'large',shape:'pill',text:'signin_with',locale:'pt-BR'});
  }).catch(()=>{box.textContent='Não consegui carregar o botão do Google (sem internet?)'});
}
// APK: tela nativa do Google
// (no Android o plugin recusa a opção "scopes": e-mail e perfil já vêm por padrão)
let socInit=false;
async function socLogin(){
  if(!NATIVE||!NAT.social)return;
  SOC.err='';SOC.busy=true;socRender();
  try{
    if(!socInit){await NAT.social.initialize({google:{webClientId:FB_CONFIG.webClientId,mode:'online'}});socInit=true}
    const r=await NAT.social.login({provider:'google',options:{}});
    const t=r?.result?.idToken;if(!t)throw new Error('sem token');
    await socFinish(t);
  }catch(e){const m=String(e?.message||e||'');SOC.err=/cancel/i.test(m)?'':'Não deu pra entrar ('+m.slice(0,90)+')';console.warn('login',e);SOC.busy=false;socRender()}
}
function socRender(){renderSheet();gateRender()}
// token do Google → sessão do Firebase
async function socFinish(idt){
  SOC.busy=true;
  try{
    const j=await(await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FB_CONFIG.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({postBody:`id_token=${idt}&providerId=google.com`,requestUri:location.origin||'http://localhost',returnSecureToken:true})})).json();
    if(!j.idToken)throw new Error(j.error?.message||'login');
    localStorage.setItem('ranvus_fbauth',JSON.stringify({uid:j.localId,token:j.idToken,refresh:j.refreshToken,exp:Date.now()+(+j.expiresIn)*1000,
      google:true,name:j.displayName||j.fullName||'',photo:j.photoUrl||'',email:j.email||''}));
    toast('Conectado com Google');SOC.loaded=true;gateClose();await socLoad(true);
  }catch(e){SOC.err='Não deu pra entrar ('+String(e?.message||'erro').slice(0,90)+')';console.warn('login',e)}
  SOC.busy=false;socRender();
}

/* ═════ TELA DE ENTRADA (primeira coisa ao abrir, até entrar ou escolher "agora não") ═════ */
function gateNeeded(){return!window.__noGate&&!isLogged()&&!localStorage.getItem('ranvus_skiplogin')}
function gateOpen(){
  if(!gateNeeded()||$('loginGate'))return;
  const d=document.createElement('div');d.id='loginGate';document.body.appendChild(d);gateRender();
}
function gateRender(){
  const d=$('loginGate');if(!d)return;
  d.innerHTML=`<div class="gate-box"><img src="icon-192.png" alt="" class="gate-logo" onerror="this.remove()">
    <div class="gate-t">Ranvus Maps</div><div class="gate-s">Entre pra jogar com seus amigos, ter um apelido e formar uma guilda.</div>
    ${NATIVE?`<button class="btn prim gate-btn" onclick="socLogin()" ${SOC.busy?'disabled':''}>${SOC.busy?'Entrando…':'<b>G</b>&nbsp; Entrar com Google'}</button>`
      :SOC.busy?'<div class="gate-s">Entrando…</div>':'<div id="gisGate" class="gate-gis"></div>'}
    ${SOC.err?`<div class="gate-err">${esc(SOC.err)}</div>`:''}
    <a class="gate-skip" onclick="gateSkip()">Agora não, só navegar</a></div>`;
  if(!NATIVE&&!SOC.busy)socGisButton('gisGate');
}
function gateSkip(){localStorage.setItem('ranvus_skiplogin','1');gateClose()}
function gateClose(){$('loginGate')?.remove()}
function socLogout(){localStorage.removeItem('ranvus_fbauth');localStorage.setItem('ranvus_skiplogin','1');Object.assign(SOC,{me:null,friends:{},profiles:{},group:null,gid:null,invites:{}});
  try{google?.accounts?.id?.disableAutoSelect()}catch{};try{NAT.social?.logout({provider:'google'})}catch{};renderSheet()}

/* ═════ REST ═════ */
async function fbGet(path){const a=await fbToken();const r=await fetch(`${FB_CONFIG.databaseURL}/${path}.json?auth=${a.token}`);if(!r.ok)throw new Error('fb '+r.status);return r.json()}
const fbSet=(p,v)=>fbWrite(p,v,'PUT'),fbDel=p=>fbWrite(p,null,'DELETE');
const uidMe=()=>fbAuth()?.uid;

/* ═════ PERFIL ═════ */
function myPublic(){return{nick:SOC.me?.nick,cls:S.cls,lvl:S.lvl,km:Math.round(S.stats.km),t:Date.now(),realms:(S.realms||[]).length,honor:S.honor||0,gid:SOC.gid||null}}
async function socLoad(full){
  if(!isLogged())return;
  const u=uidMe();
  try{
    SOC.me=await fbGet('users/'+u);
    if(SOC.me?.nick){fbWrite('users/'+u,myPublic()).catch(()=>{})}
    if(!full)return;
    SOC.friends=await fbGet('friends/'+u)||{};
    SOC.invites=await fbGet('invites/'+u)||{};
    SOC.gid=SOC.me?.gid||null;SOC.group=SOC.gid?await fbGet('groups/'+SOC.gid).catch(()=>null):null;
    if(SOC.gid&&!SOC.group?.members?.[u]){SOC.gid=null;SOC.group=null}
    const ids=new Set([...Object.keys(SOC.friends),...Object.keys(SOC.group?.members||{})]);
    await Promise.all([...ids].map(async id=>{SOC.profiles[id]=await fbGet('users/'+id).catch(()=>null)}));
  }catch(e){console.warn('social',e)}
}
async function socSetNick(){
  const n=($('nickIn')?.value||'').trim();
  if(!NICK_RE.test(n))return toast('Apelido: 3 a 16 letras, números ou _');
  const k=n.toLowerCase(),u=uidMe();
  try{
    const owner=await fbGet('nicks/'+k);if(owner&&owner!==u)return toast('Esse apelido já tem dono');
    await fbSet('nicks/'+k,u);
    if(SOC.me?.nick&&SOC.me.nick.toLowerCase()!==k)fbDel('nicks/'+SOC.me.nick.toLowerCase()).catch(()=>{});
    SOC.me={...(SOC.me||{}),nick:n};await fbSet('users/'+u,myPublic());
    toast('Apelido salvo: '+n);await socLoad(true);renderSheet();
  }catch(e){toast('Não consegui salvar o apelido')}
}

/* ═════ COMPANHEIROS ═════ */
async function socAddFriend(){
  const n=($('friendIn')?.value||'').trim().toLowerCase();if(!n)return;
  const u=uidMe();
  try{
    const f=await fbGet('nicks/'+n);
    if(!f)return toast('Ninguém com esse apelido');if(f===u)return toast('Esse é você 😄');
    if(SOC.friends[f]==='ok')return toast('Vocês já são companheiros');
    if(SOC.friends[f]==='in')return socAccept(f);
    await fbSet(`friends/${u}/${f}`,'out');await fbSet(`friends/${f}/${u}`,'in');
    toast('Pedido enviado');$('friendIn').value='';await socLoad(true);renderSheet();
  }catch(e){toast('Não consegui enviar o pedido')}
}
async function socAccept(f){const u=uidMe();try{await fbSet(`friends/${u}/${f}`,'ok');await fbSet(`friends/${f}/${u}`,'ok');toast('Novo companheiro!');await socLoad(true);renderSheet();checkAch()}catch{toast('Falhou, tente de novo')}}
async function socRemove(f){const u=uidMe();try{await fbDel(`friends/${u}/${f}`);await fbDel(`friends/${f}/${u}`).catch(()=>{});await socLoad(true);renderSheet()}catch{toast('Falhou, tente de novo')}}

/* ═════ GUILDA ═════ */
const G_MAX=8;
function gidNew(){const b=new Uint8Array(12);crypto.getRandomValues(b);return'g'+[...b].map(x=>(x%36).toString(36)).join('')}
async function guildCreate(){
  const name=($('guildIn')?.value||'').trim().slice(0,24);if(name.length<3)return toast('Nome da guilda: pelo menos 3 letras');
  const u=uidMe(),gid=gidNew();
  try{await fbSet('groups/'+gid,{name,leader:u,t:Date.now(),members:{[u]:{nick:SOC.me.nick,t:Date.now()}}});
    SOC.gid=gid;await fbWrite('users/'+u,{gid});toast('Guilda criada: '+name);await socLoad(true);renderSheet();checkAch()}catch{toast('Não consegui criar a guilda')}
}
async function guildInvite(f){
  if(!SOC.group||SOC.group.leader!==uidMe())return;
  if(Object.keys(SOC.group.members||{}).length>=G_MAX)return toast(`Guilda cheia (máx. ${G_MAX})`);
  try{await fbSet(`invites/${f}/${SOC.gid}`,{name:SOC.group.name,from:SOC.me.nick,t:Date.now()});toast('Convite enviado')}catch{toast('Não consegui convidar')}
}
async function guildJoin(gid){
  const u=uidMe();
  if(SOC.gid)return toast('Saia da sua guilda atual antes');
  try{await fbSet(`groups/${gid}/members/${u}`,{nick:SOC.me.nick,t:Date.now()});await fbDel(`invites/${u}/${gid}`);
    SOC.gid=gid;await fbWrite('users/'+u,{gid});toast('Você entrou na guilda!');await socLoad(true);renderSheet();checkAch()}catch{toast('Convite inválido ou guilda cheia')}
}
async function guildDecline(gid){try{await fbDel(`invites/${uidMe()}/${gid}`);await socLoad(true);renderSheet()}catch{}}
async function guildKick(m){
  if(SOC.group?.leader!==uidMe()||m===uidMe())return;
  try{await fbDel(`groups/${SOC.gid}/members/${m}`);toast('Membro expulso');await socLoad(true);renderSheet()}catch{toast('Falhou')}
}
async function guildLead(m){
  if(SOC.group?.leader!==uidMe())return;
  try{await fbWrite('groups/'+SOC.gid,{leader:m});toast('Liderança passada');await socLoad(true);renderSheet()}catch{toast('Falhou')}
}
async function guildLeave(){
  const u=uidMe(),g=SOC.group;if(!g)return;
  const others=Object.keys(g.members||{}).filter(x=>x!==u);
  try{
    if(g.leader===u){if(others.length)await fbWrite('groups/'+SOC.gid,{leader:others[0]});else{await fbDel('groups/'+SOC.gid);}}
    if(others.length||g.leader!==u)await fbDel(`groups/${SOC.gid}/members/${u}`);
    await fbWrite('users/'+u,{gid:null});SOC.gid=null;SOC.group=null;toast('Você saiu da guilda');await socLoad(true);renderSheet();
  }catch{toast('Falhou, tente de novo')}
}

/* ═════ TELA (aba 👥 da ficha) ═════ */
const ago=t=>{if(!t)return'';const m=Math.round((Date.now()-t)/60000);return m<2?'online agora':m<60?`há ${m} min`:m<1440?`há ${Math.round(m/60)} h`:`há ${Math.round(m/1440)} d`};
function pLine(id,p){const c=CLASSES[p?.cls];return`<span class="sp-ic">${c?heroPic(p.cls):'🧙'}</span><span class="sp-tx"><b>${esc(p?.nick||'?')}</b><small>${c?c.nome:''} nv ${p?.lvl||1} · ${p?.km||0} km · ${ago(p?.t)}</small></span>`}
function socialHTML(){
  if(!isLogged())return`<div class="soc-box"><div class="soc-t">👥 Jogue com seus amigos</div>
    <div class="r2">Entre com sua conta Google pra ter um apelido, adicionar companheiros e formar uma guilda. Seu progresso continua no celular.</div>
    ${NATIVE?`<button class="btn prim" style="margin-top:10px" onclick="socLogin()" ${SOC.busy?'disabled':''}>${SOC.busy?'Abrindo…':'Entrar com Google'}</button>`
      :SOC.busy?'<div class="r2" style="margin-top:12px">Entrando…</div>':`<div id="gisBtn" style="margin-top:12px;min-height:44px"></div>`}
    ${SOC.err?`<div class="r2" style="color:#f3a3a3;margin-top:6px">${SOC.err}</div>`:''}</div>`;
  const a=fbAuth(),u=a.uid;
  if(!SOC.me?.nick)return`<div class="soc-box"><div class="soc-t">Escolha seu apelido</div><div class="r2">É por ele que seus amigos vão te achar (3 a 16 letras, números ou _).</div>
    <input id="nickIn" class="soc-in" maxlength="16" placeholder="ex.: Ranvus" value="${esc((S.name||'').replace(/[^a-zA-Z0-9_]/g,''))}"><button class="btn prim" onclick="socSetNick()">Salvar apelido</button>
    <div class="r2" style="margin-top:10px">Conectado como ${esc(a.email||a.name)} · <a onclick="socLogout()">sair</a></div></div>`;
  const F=SOC.friends,P=SOC.profiles,ok=Object.keys(F).filter(k=>F[k]==='ok'),inn=Object.keys(F).filter(k=>F[k]==='in'),out=Object.keys(F).filter(k=>F[k]==='out');
  const g=SOC.group,lead=g&&g.leader===u,mem=g?Object.keys(g.members||{}):[];
  let h=`<div class="soc-me">${a.photo?`<img src="${esc(a.photo)}" alt="">`:''}<div><b>${esc(SOC.me.nick)}</b><small>${esc(a.email||'')}</small></div><button class="mini2" onclick="socRefresh()">↻</button></div>`;
  // guilda
  h+='<div class="sect">🏰 Guilda</div>';
  if(g){h+=`<div class="row"><div class="r1"><span><b>${esc(g.name)}</b></span><b>${mem.length}/${G_MAX}</b></div>
      ${mem.map(m=>`<div class="sp">${pLine(m,P[m]||g.members[m])}${m===g.leader?'<span class="crown">👑</span>':''}
        ${lead&&m!==u?`<button class="mini2" onclick="guildLead('${m}')" title="Passar liderança">👑</button><button class="mini2 del" onclick="guildKick('${m}')" title="Expulsar">✕</button>`:''}</div>`).join('')}
      <button class="btn" style="margin-top:8px" onclick="guildLeave()">Sair da guilda</button></div>`}
  else{
    h+=Object.entries(SOC.invites).map(([gid,iv])=>`<div class="row"><div class="r1"><span>📨 <b>${esc(iv.from)}</b> te convidou para <b>${esc(iv.name)}</b></span></div>
      <div class="soc-act"><button class="mini" onclick="guildJoin('${gid}')">Entrar</button><button class="mini2" onclick="guildDecline('${gid}')">Recusar</button></div></div>`).join('');
    h+=`<div class="soc-row"><input id="guildIn" class="soc-in" maxlength="24" placeholder="Nome da nova guilda"><button class="mini" onclick="guildCreate()">Criar</button></div>`;
  }
  // companheiros
  h+=`<div class="sect">🤝 Companheiros</div><div class="soc-row"><input id="friendIn" class="soc-in" maxlength="16" placeholder="Apelido do amigo"><button class="mini" onclick="socAddFriend()">Adicionar</button></div>`;
  if(inn.length)h+=inn.map(f=>`<div class="sp">${pLine(f,P[f])}<button class="mini" onclick="socAccept('${f}')">Aceitar</button><button class="mini2 del" onclick="socRemove('${f}')">✕</button></div>`).join('');
  h+=ok.length?ok.map(f=>`<div class="sp">${pLine(f,P[f])}${lead&&!mem.includes(f)?`<button class="mini2" onclick="guildInvite('${f}')" title="Convidar pra guilda">🏰+</button>`:''}<button class="mini2 del" onclick="socRemove('${f}')" title="Remover">✕</button></div>`).join('')
    :'<div class="r2" style="margin:6px 2px">Nenhum companheiro ainda. Peça o apelido dos seus amigos e adicione aqui.</div>';
  if(out.length)h+=`<div class="r2" style="margin-top:8px">Pedidos enviados: ${out.map(f=>`${esc(P[f]?.nick||'?')} <a onclick="socRemove('${f}')">cancelar</a>`).join(' · ')}</div>`;
  h+=`<div class="r2" style="margin-top:12px">Em breve: troca de itens e chefes de pergaminho em guilda. · <a onclick="socLogout()">sair da conta</a></div>`;
  return h;
}
async function socRefresh(){toast('Atualizando…');await socLoad(true);renderSheet()}
function socOnTab(){                                   // chamado sempre que a aba 👥 é desenhada
  if(!isLogged()){if(!NATIVE)setTimeout(socGisButton,30);return}
  if(!SOC.loaded){SOC.loaded=true;socLoad(true).then(()=>{if(sheetTab==='soc')renderSheet()})}
}
// presença: atualiza o perfil público ao abrir e ao chegar de viagem
setTimeout(()=>socLoad(false),6000);
gateOpen();
