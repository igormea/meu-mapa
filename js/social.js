'use strict';
/* ── MULTIPLAYER: login Google, apelido, companheiros e guilda ─────────
   Firebase Realtime Database via REST (o mesmo do compartilhamento ao vivo).
   Login: no navegador, botão do Google (Google Identity Services); no APK, tela nativa do Google
   (plugin SocialLogin). O token do Google vira sessão do Firebase (accounts:signInWithIdp).
   Estrutura: users/{uid} perfil público · nicks/{apelido} → uid · friends/{uid}/{outro} = out|in|ok
              groups/{gid} guilda (líder, membros) · invites/{uid}/{gid} convite de guilda
   As regras de segurança no console garantem que cada um só mexe no que é seu. */
const NICK_RE=/^[a-zA-Z0-9_]{3,16}$/;
const SOC={me:null,friends:{},profiles:{},group:null,gid:null,invites:{},busy:false,err:'',view:'comp',rk:'wk'};

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
    toast('Conectado com Google');SOC.loaded=true;gateClose();CLOUD.checked=false;cloudCheck();await socLoad(true);
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
    <a class="gate-skip" onclick="gateSkip()">Agora não, só navegar</a>
    <a class="gate-skip" style="font-size:12px;margin-top:4px" href="privacidade.html" target="_blank">Política de privacidade</a></div>`;
  if(!NATIVE&&!SOC.busy)socGisButton('gisGate');
}
function gateSkip(){localStorage.setItem('ranvus_skiplogin','1');gateClose()}
function gateClose(){$('loginGate')?.remove()}
function socLogout(){localStorage.removeItem('ranvus_fbauth');CLOUD.checked=false;CLOUD.dirty=false;localStorage.setItem('ranvus_skiplogin','1');Object.assign(SOC,{me:null,friends:{},profiles:{},group:null,gid:null,invites:{}});
  try{google?.accounts?.id?.disableAutoSelect()}catch{};try{NAT.social?.logout({provider:'google'})}catch{};renderSheet()}

/* ═════ EXCLUIR CONTA (exigência da Play Store): apaga tudo do servidor e a conta de login ═════ */
function socDelAsk(){SOC.delAsk=true;renderSheet()}
async function socDeleteAccount(){
  const u=uidMe();if(!u)return;SOC.busy=true;renderSheet();
  const q=p=>fbDel(p).catch(()=>{});
  try{
    // guilda: líder passa a liderança (ou apaga a guilda se estiver sozinho); membro só sai
    const g=SOC.group,gid=SOC.gid;
    if(g&&gid){const others=Object.keys(g.members||{}).filter(x=>x!==u);
      if(g.leader===u&&!others.length)await q('groups/'+gid);
      else{if(g.leader===u)await fbWrite('groups/'+gid,{leader:others[0]}).catch(()=>{});await fbWrite('groups/'+gid,seatOut(g,u)).catch(()=>{})}
      await q(`gloc/${gid}/${u}`)}
    for(const f of Object.keys(SOC.friends||{}))await q(`friends/${f}/${u}`);
    if(SOC.me?.nick)await q('nicks/'+SOC.me.nick.toLowerCase());
    for(const p of ['friends/','invites/','trades/','saves/','users/'])await q(p+u);
    // por último, a conta de login
    const a=await fbToken();
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FB_CONFIG.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:a.token})});
    S.gloc=0;S.gid=null;save();SOC.delAsk=false;SOC.busy=false;socLogout();toast('Conta excluída. Seus dados foram apagados do servidor.');
  }catch(e){SOC.busy=false;toast('Não consegui excluir tudo agora. Tente de novo.');renderSheet()}
}

/* ═════ REST ═════ */
async function fbGet(path){const a=await fbToken();const r=await fetch(`${FB_CONFIG.databaseURL}/${path}.json?auth=${a.token}`);if(!r.ok)throw new Error('fb '+r.status);return r.json()}
const fbSet=(p,v)=>fbWrite(p,v,'PUT'),fbDel=p=>fbWrite(p,null,'DELETE');
const uidMe=()=>fbAuth()?.uid;

/* ═════ PERFIL ═════ */
function myPublic(){if(typeof ensureWeek==='function')ensureWeek();
  return{nick:SOC.me?.nick,cls:S.cls,lvl:S.lvl,km:Math.round(S.stats.km),t:Date.now(),realms:(S.realms||[]).length,honor:S.honor||0,gid:SOC.gid||null,
    wk:Math.round((S.week?.km||0)*10)/10,wkid:S.week?.key||'',kills:S.stats.kills||0,best:Object.keys(S.best||{}).length,raids:S.stats.raids||0}}
async function socLoad(full){
  if(!isLogged())return;
  const u=uidMe();
  try{
    SOC.me=await fbGet('users/'+u);
    if(SOC.me&&'gid' in SOC.me)SOC.gid=SOC.me.gid||null;      // guilda vem do perfil ANTES de regravá-lo
    if(SOC.me?.nick){fbWrite('users/'+u,myPublic()).catch(()=>{})}
    if(!SOC.me?.nick)return;
    SOC.friends=await fbGet('friends/'+u)||{};
    SOC.invites=await fbGet('invites/'+u)||{};
    SOC.gid=SOC.me?.gid||S.gid||null;SOC.group=SOC.gid?await fbGet('groups/'+SOC.gid).catch(()=>null):null;
    if(SOC.gid&&!SOC.group?.members?.[u]){SOC.gid=null;SOC.group=null}
    if((S.gid||null)!==SOC.gid){S.gid=SOC.gid;save()}                          // cópia local (recupera a guilda se o perfil perder)
    if(SOC.gid&&!SOC.me.gid)fbWrite('users/'+u,{gid:SOC.gid}).catch(()=>{});
    await guildSeatFix();
    if(typeof tradeLoad==='function')await tradeLoad();
    const ids=new Set([...Object.keys(SOC.friends),...Object.keys(SOC.group?.members||{})]);
    await Promise.all([...ids].filter(id=>full||!SOC.profiles[id]).map(async id=>{SOC.profiles[id]=await fbGet('users/'+id).catch(()=>null)}));
    if(typeof raidTierSync==='function'){raidTierSync();raidCheckWin()}
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
  try{await fbSet('groups/'+gid,{name,leader:u,t:Date.now(),members:{[u]:{nick:SOC.me.nick,t:Date.now()}},seats:{1:u}});
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
  try{const g=await fbGet('groups/'+gid);const n=seatFree(g);if(!n)return toast(`Guilda cheia (máx. ${G_MAX})`);
    await fbWrite('groups/'+gid,{['members/'+u]:{nick:SOC.me.nick,t:Date.now()},['seats/'+n]:u});await fbDel(`invites/${u}/${gid}`);
    SOC.gid=gid;await fbWrite('users/'+u,{gid});toast('Você entrou na guilda!');await socLoad(true);renderSheet();checkAch()}catch{toast('Convite inválido ou guilda cheia')}
}
const seatOf=(g,m)=>Object.keys(g?.seats||{}).find(k=>g.seats[k]===m);
function seatFree(g){const S2=g?.seats||{};for(let i=1;i<=G_MAX;i++)if(!S2[i])return i;return 0}
function seatOut(g,m){const o={['members/'+m]:null},k=seatOf(g,m);if(k)o['seats/'+k]=null;return o}
// guildas criadas antes das vagas: o líder distribui as vagas uma vez
async function guildSeatFix(){
  const g=SOC.group;if(!g||g.leader!==uidMe())return;
  const miss=Object.keys(g.members||{}).filter(m=>!seatOf(g,m));if(!miss.length)return;
  const o={};g.seats=g.seats||{};for(const m of miss){const n=seatFree(g);if(!n)break;g.seats[n]=m;o['seats/'+n]=m}
  await fbWrite('groups/'+SOC.gid,o).catch(()=>{});
}
async function guildDecline(gid){try{await fbDel(`invites/${uidMe()}/${gid}`);await socLoad(true);renderSheet()}catch{}}
async function guildKick(m){
  if(SOC.group?.leader!==uidMe()||m===uidMe())return;
  try{await fbWrite('groups/'+SOC.gid,seatOut(SOC.group,m));toast('Membro expulso');await socLoad(true);renderSheet()}catch{toast('Falhou')}
}
async function guildLead(m){
  if(SOC.group?.leader!==uidMe())return;
  try{await fbWrite('groups/'+SOC.gid,{leader:m});toast('Liderança passada');await socLoad(true);renderSheet()}catch{toast('Falhou')}
}
async function guildLeave(){
  const u=uidMe(),g=SOC.group;if(!g)return;
  const others=Object.keys(g.members||{}).filter(x=>x!==u);
  if(S.gloc){fbDel(`gloc/${SOC.gid}/${u}`).catch(()=>{});S.gloc=0}
  try{
    if(g.leader===u){if(others.length)await fbWrite('groups/'+SOC.gid,{leader:others[0]});else{await fbDel('groups/'+SOC.gid);}}
    if(others.length||g.leader!==u)await fbWrite('groups/'+SOC.gid,seatOut(g,u));
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
  const offers=Object.keys(TR.in||{}).length,invs=Object.keys(SOC.invites).length;
  let h=`<div class="soc-me">${a.photo?`<img src="${esc(a.photo)}" alt="">`:''}<div><b>${esc(SOC.me.nick)}</b><small>${esc(a.email||'')}</small></div><button class="mini2" onclick="socRefresh()">↻</button></div>`;
  const tab=(id,t,n)=>`<button class="soc-tab${SOC.view===id?' on':''}" onclick="socView('${id}')">${t}${n?`<i>${n}</i>`:''}</button>`;
  h+=`<div class="soc-tabs">${tab('comp','🤝 Amigos',inn.length+offers)}${tab('guild','🏰 Guilda',invs)}${tab('rank','🏆 Ranking')}</div>`;
  if(SOC.view==='guild'){
    if(g){h+=`<div class="row"><div class="r1"><span><b>${esc(g.name)}</b></span><b>${mem.length}/${G_MAX}</b></div>${raidHTML(g,lead)}</div>${glocHTML()}
      <div class="sect">Membros</div>${mem.map(m=>`<div class="sp">${pLine(m,P[m]||g.members[m])}${m===g.leader?'<span class="crown">👑</span>':''}
        ${lead&&m!==u?`<button class="mini2" onclick="guildLead('${m}')" title="Passar liderança">👑</button><button class="mini2 del" onclick="guildKick('${m}')" title="Expulsar">✕</button>`:''}</div>`).join('')}
      ${lead&&ok.some(f=>!mem.includes(f))?`<div class="r2" style="margin-top:6px">Convide companheiros na aba 🤝 Amigos (botão 🏰+).</div>`:''}
      <button class="btn" style="margin-top:10px" onclick="guildLeave()">Sair da guilda</button>`}
    else{
      h+=Object.entries(SOC.invites).map(([gid,iv])=>`<div class="row"><div class="r1"><span>📨 <b>${esc(iv.from)}</b> te convidou para <b>${esc(iv.name)}</b></span></div>
        <div class="soc-act"><button class="mini" onclick="guildJoin('${gid}')">Entrar</button><button class="mini2" onclick="guildDecline('${gid}')">Recusar</button></div></div>`).join('');
      h+=`<div class="r2" style="margin:4px 2px 8px">Numa guilda (até ${G_MAX} pessoas), vocês enfrentam chefes juntos: cada km que qualquer um dirige é um golpe.</div>
        <div class="soc-row"><input id="guildIn" class="soc-in" maxlength="24" placeholder="Nome da nova guilda"><button class="mini" onclick="guildCreate()">Criar</button></div>`;
    }
  }else if(SOC.view==='rank')h+=rankHTML();
  else{
    h+=tradeHTML();
    h+=`<div class="sect">🤝 Companheiros</div><div class="soc-row"><input id="friendIn" class="soc-in" maxlength="16" placeholder="Apelido do amigo"><button class="mini" onclick="socAddFriend()">Adicionar</button></div>`;
    if(inn.length)h+=inn.map(f=>`<div class="sp">${pLine(f,P[f])}<button class="mini" onclick="socAccept('${f}')">Aceitar</button><button class="mini2 del" onclick="socRemove('${f}')">✕</button></div>`).join('');
    h+=ok.length?ok.map(f=>`<div class="sp">${pLine(f,P[f])}${GL.data[f]&&glocFresh(GL.data[f])?'<span title="localização ligada pra guilda">📍</span>':''}<button class="mini2" onclick="tradePick('${f}')" title="Oferecer item">🎁</button>${lead&&!mem.includes(f)?`<button class="mini2" onclick="guildInvite('${f}')" title="Convidar pra guilda">🏰+</button>`:''}<button class="mini2 del" onclick="socRemove('${f}')" title="Remover">✕</button></div>`).join('')
      :'<div class="r2" style="margin:6px 2px">Nenhum companheiro ainda. Peça o apelido dos seus amigos e adicione aqui.</div>';
    if(out.length)h+=`<div class="r2" style="margin-top:8px">Pedidos enviados: ${out.map(f=>`${esc(P[f]?.nick||'?')} <a onclick="socRemove('${f}')">cancelar</a>`).join(' · ')}</div>`;
  }
  h+=`<div class="r2" style="margin-top:14px"><a onclick="socLogout()">sair da conta</a> · <a onclick="socDelAsk()" style="color:#f3a3a3">excluir minha conta</a></div>`;
  if(SOC.delAsk)h+=`<div class="row" style="border-color:#c0392b"><div class="r1"><span>🗑️ Excluir conta</span></div>
    <div class="r2">Apaga do servidor: apelido, perfil, amigos, guilda, trocas, localização e o save na nuvem. Seu herói <b>neste aparelho</b> continua. Não dá pra desfazer.</div>
    <div class="soc-act"><button class="mini" style="background:#c0392b" onclick="socDeleteAccount()" ${SOC.busy?'disabled':''}>${SOC.busy?'Excluindo…':'Excluir tudo'}</button><button class="mini2" onclick="SOC.delAsk=false;renderSheet()">Cancelar</button></div></div>`;
  return h;
}
function socView(v){SOC.view=v;renderSheet()}
/* ── ranking: eu + companheiros (+ membros da guilda) ── */
const RK={wk:['Km na semana',p=>p.wkid===weekKey()?p.wk||0:0,' km'],lvl:['Nível',p=>p.lvl||1,''],km:['Km total',p=>p.km||0,' km'],kills:['Monstros',p=>p.kills||0,''],best:['Bestiário',p=>p.best||0,'']};
function rankHTML(){
  const u=uidMe(),P=SOC.profiles,F=SOC.friends;
  const ids=new Set([u,...Object.keys(F).filter(k=>F[k]==='ok'),...Object.keys(SOC.group?.members||{})]);
  const me={...myPublic()},[lab,fn,un]=RK[SOC.rk];
  const rows=[...ids].map(id=>[id,id===u?me:P[id]]).filter(x=>x[1]).sort((a,b)=>fn(b[1])-fn(a[1]));
  const med=['🥇','🥈','🥉'];
  return`<div class="soc-chips">${Object.entries(RK).map(([k,v])=>`<button class="chip${SOC.rk===k?' on':''}" onclick="SOC.rk='${k}';renderSheet()">${v[0]}</button>`).join('')}</div>`+
    rows.map(([id,p],i)=>`<div class="sp rk${id===u?' me':''}"><span class="rk-n">${med[i]||i+1}</span>${pLine(id,p)}<b class="rk-v">${Math.round(fn(p)*10)/10}${un}</b></div>`).join('')+
    (rows.length<2?'<div class="r2" style="margin-top:8px">Adicione companheiros pra competir com eles.</div>':'')+
    `<div class="r2" style="margin-top:8px">A semana começa na segunda-feira. Atualiza quando cada um abre o app.</div>`;
}
async function socRefresh(){toast('Atualizando…');await socLoad(true);renderSheet()}
function socOnTab(){                                   // chamado sempre que a aba 👥 é desenhada
  if(!isLogged()){if(!NATIVE)setTimeout(socGisButton,30);return}
  if(!SOC.loaded){SOC.loaded=true;socLoad(true).then(()=>{if(sheetTab==='soc')renderSheet()})}
}
/* ═════ AVISOS: a cada 2,5 min olha pedidos, convites, ofertas, chefe da guilda e amigos ao vivo ═════ */
let socPolling=false;
function seenGet(){try{return JSON.parse(localStorage.getItem('ranvus_seen')||'{}')}catch{return{}}}
function notifyUser(ic,title,body,k='gold'){
  card(ic,esc(title),esc(body),k);
  if(document.hidden&&NAT?.notif)NAT.notif.schedule({notifications:[{id:Math.floor(Math.random()*2e9),title,body}]}).catch(()=>{});
}
async function socPoll(){
  if(!isLogged()||socPolling)return;socPolling=true;
  try{
    await socLoad(false);if(!SOC.me?.nick)return;
    const sn=seenGet(),first=!sn.init,P=SOC.profiles,F=SOC.friends,u=uidMe();
    const fr=Object.keys(F).filter(k=>F[k]==='in'),inv=Object.keys(SOC.invites),tr=Object.keys(TR.in||{});
    if(!first){
      for(const f of fr)if(!(sn.fr||[]).includes(f))notifyUser('🤝','Pedido de companheiro',`${P[f]?.nick||'Alguém'} quer ser seu companheiro de estrada`);
      for(const g of inv)if(!(sn.inv||[]).includes(g))notifyUser('🏰','Convite de guilda',`${SOC.invites[g].from} te convidou para ${SOC.invites[g].name}`);
      for(const t of tr)if(!(sn.tr||[]).includes(t))notifyUser('🎁','Oferta de troca',`${TR.in[t].nick} te ofereceu ${TR.in[t].it.name}`);
      const r=SOC.group?.raid;if(r&&r.id!==sn.raid&&SOC.group.leader!==u&&!raidDone(r)&&!raidOver(r))notifyUser('⚔️','Chefe da guilda invocado',`${RAIDS[r.tier].n}: dirija pra ajudar a guilda`,'epic');
    }
    localStorage.setItem('ranvus_seen',JSON.stringify({init:1,fr,inv,tr,raid:SOC.group?.raid?.id||sn.raid}));
    glocWatch();
    if($('sheet')?.classList.contains('on')&&sheetTab==='soc')renderSheet();
  }catch(e){console.warn('poll',e)}
  finally{socPolling=false}
}
setTimeout(socPoll,6000);setInterval(socPoll,150000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)socPoll()});
gateOpen();
