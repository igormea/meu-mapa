'use strict';
/* ── FICHA DO HERÓI ──────────────────────────────────── */
let sheetTab='heroi',resetArm=0;
const TABS=[['heroi','🧙','Herói'],['tal','✨','Talentos'],['equip','🎒','Equipar'],['quests','📜','Missões'],['ach','🏅','Troféus'],['best','📖','Bestiário'],['soc','👥','Social'],['stats','📊','Números'],['cfg','⚙️','Ajustes']];
function openSheet(){regen();renderSheet();$('sheet').classList.add('on');layerPush('sheet',()=>closeSheet(true))}
function closeSheet(fromBack){$('sheet').classList.remove('on');if(!fromBack)layerPop('sheet')}
function setTab(t){sheetTab=t;renderSheet()}
function renderSheet(){
  $('tabs').innerHTML=TABS.map(([k,ic,n])=>`<div class="tab ${k===sheetTab?'on':''}" onclick="setTab('${k}')"><i>${ic}</i><span>${n}</span></div>`).join('');
  const c=cls(),mx=maxHP();let h='';
  if(sheetTab==='heroi'){
    h=`<div class="hero"><div class="big">${heroPic(S.cls)}</div><div>
        <div class="hn">${esc(S.name)}</div><div class="hc">${c.nome} · Nível ${S.lvl}</div>
        ${S.title?`<div class="htitle">« ${esc(S.title)} »</div>`:''}</div></div>
      <div class="row"><div class="r1"><span>✨ Experiência</span><b>${fmtN(S.xp)} / ${fmtN(needXP(S.lvl))}</b></div><div class="qbar"><i style="width:${S.xp/needXP(S.lvl)*100}%;background:linear-gradient(90deg,#2f4fc9,#8fb0ff)"></i></div></div>
      <div class="row"><div class="r1"><span>❤️ Vida</span><b>${Math.round(S.hp)} / ${mx}</b></div><div class="qbar"><i style="width:${S.hp/mx*100}%;background:linear-gradient(90deg,#a3221d,#e5534b)"></i></div></div>
      <div class="stats">
        <div class="st"><span>⚔️ Ataque</span><b>${atk()}</b></div><div class="st"><span>🛡️ Defesa</span><b>${def()}</b></div>
        <div class="st"><span>💥 Crítico</span><b>${Math.round(critChance()*100)}%</b></div><div class="st"><span>🪙 Ouro</span><b>${fmtN(S.gold)}</b></div>
        <div class="st"><span>✨ Bônus XP</span><b>+${Math.round(((c.xp-1)+amu()/100+bonus('xp'))*100)}%</b></div><div class="st"><span>🏹 Alcance</span><b>${c.reach} m</b></div>
      </div>
      <div class="stats">
        <div class="st"><span>⚖️ Honra</span><b>${S.honor||0} · ${honorRank()}</b></div><div class="st"><span>🏰 Reinos</span><b>${(S.realms||[]).length} bairros</b></div>
      </div>
      <div class="r2" style="color:#837aa8;font-size:11.5px;margin:4px 2px 0">Honra: respeite os limites de velocidade (+1% XP e ouro por patente). Reinos: bairros que você já atravessou.</div>
      <div class="sect">Habilidade da classe</div>
      <div class="row"><div class="r1"><span>${SKILL[S.cls||'cavaleiro'].ic} ${SKILL[S.cls||'cavaleiro'].n}</span><b>automática</b></div><div class="r2">${SKILL[S.cls||'cavaleiro'].d}${S.talents?.dominio?` · +${S.talents.dominio*25}% (Domínio)`:''}</div></div>
      <div class="sect">Companheiro</div>
      ${(()=>{const p=S.pet;if(!p)return`<div class="row lock"><div class="r1"><span>🥚 Nenhum ainda</span></div><div class="r2">No nível 3 você encontra um ovo misterioso.</div></div>`;
        if(p.egg)return`<div class="row"><div class="r1"><span>🥚 Ovo misterioso</span><b>${p.km.toFixed(1).replace('.',',')} / ${PET_HATCH_KM} km</b></div><div class="r2">Choca andando. O que será que vai sair?</div><div class="qbar"><i style="width:${Math.min(100,p.km/PET_HATCH_KM*100)}%"></i></div></div>`;
        const P=PETS[p.type];return`<div class="row"><div class="r1"><span>${P.e} ${P.n} · Nv ${p.lvl}</span><b>+${Math.round(P.per*(1+(p.lvl-1)*.1)*100)}% ${P.d}</b></div><div class="r2">Ajuda em toda batalha · próximo nível em ${Math.max(0,PET_KM_LVL*p.lvl-p.km).toFixed(1).replace('.',',')} km</div><div class="qbar"><i style="width:${Math.min(100,p.km/(PET_KM_LVL*p.lvl)*100)}%"></i></div></div>`})()}
      <div class="sect">Mundo</div>
      <div class="row"><div class="r1"><span>${REGION[S.curRegion]?REGION[S.curRegion].ic+' '+REGION[S.curRegion].n:'🗺️ Região desconhecida'}</span><b>${(S.regions||[]).length}/5 regiões</b></div>
        <div class="r2">${(()=>{const e=envNow(),t=[];if(e.rain)t.push('🌧️ Chuva: aquáticos aparecem mais, +10% XP');if(e.moon)t.push('🌕 Lua cheia: lobos e lobisomens, +25% XP');if(e.hot)t.push('☀️ Calor: criaturas de fogo, +10% ouro');if(isNight())t.push('🌙 Noite: morcegos, zumbis e fantasmas');return t.join('<br>')||'Tempo calmo'})()}</div></div>
      <div class="sect">Registros</div>
      <div class="stats">
        <div class="st"><span>🗺️ Distância</span><b>${S.stats.km.toFixed(1).replace('.',',')} km</b></div><div class="st"><span>💀 Monstros</span><b>${fmtN(S.stats.kills)}</b></div>
        <div class="st"><span>🏰 Jornadas</span><b>${S.stats.trips}</b></div><div class="st"><span>🐉 Dragões</span><b>${S.stats.dragons}</b></div>
      </div>
      <div class="r2" style="font-size:11.5px;color:#837aa8;margin-top:10px">${esc(c.desc)}</div>`;
  }else if(sheetTab==='soc'){
    h=socialHTML();
  }else if(sheetTab==='best'){
    h=bestHTML();
  }else if(sheetTab==='stats'){
    h=statsHTML();
  }else if(sheetTab==='tal'){
    const pts=talentPoints();
    h=`<div class="row"><div class="r1"><span>✨ Pontos disponíveis</span><b style="color:${pts?'#e8c86a':'inherit'}">${pts}</b></div><div class="r2">Você ganha 1 ponto a cada nível. Distribua com o carro parado.</div></div>`+
      Object.entries(TAL).map(([id,T])=>{const r=S.talents?.[id]||0,lock=T.lvl&&S.lvl<T.lvl;
        return `<div class="row tal ${lock?'lock':''}"><div class="ti">${T.ic}</div><div class="tx"><div class="r1"><span><b>${T.n}</b></span><span style="color:#9b93c4">${r}/${T.max}</span></div>
          <div class="r2">${T.d}${lock?` · libera no nível ${T.lvl}`:''}</div><div class="pips">${Array.from({length:T.max},(_,i)=>`<i class="${i<r?'on':''}"></i>`).join('')}</div></div>
          <button onclick="learnTalent('${id}')" ${!pts||r>=T.max||lock?'disabled':''} aria-label="Aprender ${T.n}">+</button></div>`}).join('')+
      `<button class="btn sec" style="margin-top:8px" onclick="respecTalents()">Redistribuir pontos (${fmtN(respecCost())} 🪙)</button>`;
  }else if(sheetTab==='equip'){
    const sc=setCount(),as=activeSet();
    h=(Object.keys(sc).length?`<div class="row"><div class="r1"><span>💠 Conjuntos</span><b>${as?'ativo!':''}</b></div><div class="r2">${Object.entries(sc).map(([s,n])=>`${s}: ${n}/3 — ${SETS[s].d}${s===as?' ✅':''}`).join('<br>')}</div></div>`:
      `<div class="row lock"><div class="r1"><span>💠 Conjuntos</span></div><div class="r2">Itens "do Sertão", "da Beira-Mar", "do Dragão", "da Lua Cheia", "do Farol" e "do Cangaço" formam conjuntos. 3 peças iguais = bônus.</div></div>`)+
      Object.keys(SLOT).map(k=>{const it=S.equip[k];
      return `<div class="row"><div class="r1"><span>${SLOT[k]}</span>${it?`<b class="r-${it.r}">${esc(it.name)}</b>`:'<span style="color:#6f679a">vazio</span>'}</div>
        <div class="r2">${it?`${RAR[it.r].n} · ${statTxt(it)}`:'Itens caem dos monstros e dos baús'}${k==='weapon'&&S.smith.w?` · ferreiro +${S.smith.w}`:''}${k==='armor'&&S.smith.a?` · ferreiro +${S.smith.a}`:''}</div></div>`}).join('')+
      `<div class="row"><div class="r1"><span>🔨 Próximo aprimoramento</span><b>${fmtN(smithCost())} 🪙</b></div><div class="r2">O ferreiro usa seu ouro automaticamente</div><div class="qbar"><i style="width:${Math.min(100,S.gold/smithCost()*100)}%"></i></div></div>
      ${bagHTML()}<div class="sect">Últimos achados</div>`+
      (S.loot.length?S.loot.map(it=>`<div class="row"><div class="r1"><span class="r-${it.r}">${esc(it.name)}</span><span style="font-size:11.5px;color:#9b93c4">${it.act==='equipado'?'equipado':it.act==='guardado'?'no baú 🧰':'+'+it.g+' 🪙'}</span></div><div class="r2">${RAR[it.r].n} · ${statTxt(it)}</div></div>`).join('')
        :'<div class="r2" style="color:#6f679a">Nada ainda. Faça uma jornada!</div>');
  }else if(sheetTab==='quests'){
    ensureDaily();
    h=scrollsHTML()+'<div class="sect">Diárias</div><div class="r2" style="color:#837aa8;margin-bottom:9px">Renovam todo dia. Recompensas entregues automaticamente.</div>'+
      DQ.map(q=>{const v=S.daily[q.id],done=S.daily.claimed.includes(q.id),k=1+.15*(S.lvl-1);
        return `<div class="row"><div class="r1"><span>${done?'✅':'📜'} ${q.t}</span><b>${q.u==='km'?v.toFixed(1).replace('.',','):v} / ${q.goal}</b></div>
          <div class="r2">Recompensa: ${Math.round(q.xp*k)} XP · ${Math.round(q.gold*k)} 🪙</div><div class="qbar"><i style="width:${Math.min(100,v/q.goal*100)}%"></i></div></div>`}).join('');
    ensureWeek();
    h+='<div class="sect">Semanais</div><div class="r2" style="color:#837aa8;margin-bottom:9px">Renovam toda segunda-feira.</div>'+
      WQ.map(q=>{const v=S.week[q.id]||0,done=S.week.claimed.includes(q.id),k=1+.15*(S.lvl-1);
        return `<div class="row"><div class="r1"><span>${done?'✅':'🏆'} ${q.t}</span><b>${q.u==='km'?v.toFixed(1).replace('.',','):v} / ${q.goal}</b></div>
          <div class="r2">Recompensa: ${Math.round(q.xp*k)} XP · ${Math.round(q.gold*k)} 🪙</div><div class="qbar"><i style="width:${Math.min(100,v/q.goal*100)}%"></i></div></div>`}).join('');
    const wk=weekKey();
    h+='<div class="sect">Masmorras</div><div class="r2" style="color:#837aa8;margin-bottom:9px">Estacione perto (fique parado ~40 s) ou chegue de rota. Uma vez por dia cada.</div>'+
      DUNGEONS.map(d=>`<div class="row ${S.dungeons?.[d.id]===dayKey()?'':'lock'}"><div class="r1"><span>🏯 ${d.n}</span><b>${S.dungeons?.[d.id]===dayKey()?'concluída hoje ✔':'aberta'}</b></div></div>`).join('');
    h+='<div class="sect">Chefes lendários de Fortaleza</div><div class="r2" style="color:#837aa8;margin-bottom:9px">Passe perto deles para lutar. Voltam toda semana.</div>'+
      BOSSES.map(b=>`<div class="row ${S.bosses?.[b.id]===wk?'':'lock'}"><div class="r1"><span>${b.e} ${b.n}</span><b>${S.bosses?.[b.id]===wk?'derrotado ✔':'à solta'}</b></div></div>`).join('')+
      `<div class="r2" style="color:#837aa8;margin-top:8px">🗺️ Áreas exploradas: <b style="color:#e8c86a">${fmtN(S.stats.cells||0)}</b></div>`;
  }else if(sheetTab==='ach'){
    h=`<div class="r2" style="color:#837aa8;margin-bottom:9px">${S.ach.length} de ${ACH.length} desbloqueadas. A última vira seu título.</div>`+
      ACH.map(a=>`<div class="row ${S.ach.includes(a.id)?'':'lock'}"><div class="r1"><span>${S.ach.includes(a.id)?'🏅':'🔒'} ${a.n}</span></div><div class="r2">${a.d}</div></div>`).join('');
  }else{
    const th=themeKey();
    h=`<div class="row"><div class="r1"><span>🗺️ Visual do mapa</span></div><div class="opt">
        ${[['castelo','Castelo'],['dia','Pergaminho'],['noite','Masmorra']].map(([k,n])=>`<button class="${th===k?'on':''}" onclick="setTheme('${k}')">${n}</button>`).join('')}</div></div>
      <div class="row"><div class="r1"><span>🧭 Estilo do mapa</span></div><div class="opt">
        <button class="${S.mapDet!==true?'on':''}" onclick="S.mapDet=false;applyTheme();save();renderSheet()">Limpo</button><button class="${S.mapDet===true?'on':''}" onclick="S.mapDet=true;applyTheme();save();renderSheet()">Detalhado</button></div>
        <div class="r2">Limpo: só ruas e quarteirões, fácil de ler dirigindo. Detalhado: o mapa antigo, com lojas e ícones.</div></div>
      <div class="row"><div class="r1"><span>🔊 Voz</span></div><div class="opt">
        <button class="${!S.mute&&!S.less?'on':''}" onclick="setVoice('full')">Completa</button><button class="${!S.mute&&S.less?'on':''}" onclick="setVoice('less')">Menos falante</button><button class="${S.mute?'on':''}" onclick="setVoice('off')">Desligada</button></div>
        <div class="r2">"Menos falante": só as curvas na hora e os alertas de segurança.</div></div>
      <div class="row"><div class="r1"><span>🧍 Tamanho dos personagens</span></div><div class="opt">
        ${[['p','Pequeno'],['m','Médio'],['g','Grande']].map(([k,n])=>`<button class="${(S.charSize||'m')===k?'on':''}" onclick="S.charSize='${k}';save();renderSheet();window.__map?.triggerRepaint()">${n}</button>`).join('')}</div>
        <div class="r2">Menor parece andar na rua; maior é mais fácil de enxergar.</div></div>
      <div class="row"><div class="r1"><span>➤ Seta de direção</span></div><div class="opt">
        <button class="${S.arrow!==false?'on':''}" onclick="S.arrow=true;save();renderSheet();window.__map?.triggerRepaint()">Mostrar</button><button class="${S.arrow===false?'on':''}" onclick="S.arrow=false;save();renderSheet();window.__map?.triggerRepaint()">Esconder</button></div>
        <div class="r2">Seta dourada no chão, à frente do herói, mostrando pra onde ele vai.</div></div>
      <div class="row"><div class="r1"><span>🚗 Veículo</span></div><div class="opt">
        <button class="${S.vehicle!=='moto'?'on':''}" onclick="S.vehicle='car';save();renderSheet()">Carro</button><button class="${S.vehicle==='moto'?'on':''}" onclick="S.vehicle='moto';save();renderSheet()">Moto</button></div>
        <div class="r2">Moto: tempo estimado menor e aviso de lombada em qualquer velocidade.</div></div>
      <div class="row"><div class="r1"><span>💰 Evitar pedágio</span></div><div class="opt">
        <button class="${S.avoidToll?'on':''}" onclick="S.avoidToll=true;save();renderSheet()">Sim</button><button class="${!S.avoidToll?'on':''}" onclick="S.avoidToll=false;save();renderSheet()">Não</button></div></div>
      <div class="row"><div class="r1"><span>🌫️ Névoa de exploração</span></div><div class="opt">
        <button class="${S.fog!==false?'on':''}" onclick="S.fog=true;save();scheduleFog();renderSheet()">Ligada</button><button class="${S.fog===false?'on':''}" onclick="S.fog=false;save();scheduleFog();renderSheet()">Desligada</button></div>
        <div class="r2">Áreas onde você ainda não passou ficam escurecidas (só fora da navegação).</div></div>
      <div class="row"><div class="r1"><span>🏠 Casa / 💼 Trabalho</span></div><div class="opt">
        <button onclick="favClear('home');renderSheet()">${S.fav?.home?'Apagar casa':'Casa não definida'}</button><button onclick="favClear('work');renderSheet()">${S.fav?.work?'Apagar trabalho':'Trabalho não definido'}</button></div>
        <div class="r2">Para definir, use os botões na tela de busca.</div></div>
      <div class="row"><div class="r1"><span>🏙️ Prédios em 3D</span></div><div class="opt">
        <button class="${S.b3d===true?'on':''}" onclick="S.b3d=true;applyTheme();save();renderSheet()">Ligado</button><button class="${S.b3d!==true?'on':''}" onclick="S.b3d=false;applyTheme();save();renderSheet()">Desligado</button></div></div>
      <button class="btn prim" style="margin-top:6px" onclick="closeSheet();openReport()">🐞 Reportar bug / sugestão</button>
      <button class="btn prim" style="margin-top:8px" onclick="closeSheet();showNews(true)">📜 Novidades (Patch Notes) · v${APPV}</button>
      <div class="r2" style="text-align:center;margin-top:10px"><a href="privacidade.html" target="_blank">Política de privacidade</a> · <a href="privacidade.html#excluir" target="_blank">excluir conta</a></div>
      <button class="btn prim" style="margin-top:8px" onclick="closeSheet();openClassSel(false)">Trocar classe / nome</button>
      <div class="r2" style="color:#837aa8;margin:6px 2px 14px;font-size:11.5px">Trocar de classe mantém nível, ouro e conquistas.</div>
      <div class="sect">Backup do progresso</div>
      <div class="r2" style="color:#837aa8;margin-bottom:7px">Gera um código com todo o seu progresso. Guarde no WhatsApp/Keep e cole em outro aparelho (ou no app) para continuar de onde parou.</div>
      <div class="opt"><button onclick="exportSave()">📤 Exportar</button><button onclick="importSave()">📥 Importar</button></div>
      <textarea id="bkText" rows="3" style="display:none"></textarea>
      <div style="height:12px"></div>
      <button class="btn sec" id="resetBtn" onclick="resetTap()">Apagar todo o progresso</button>
      <div class="sect">Diagnóstico de rota</div>
      <div class="r2" style="color:#837aa8;font-size:11.5px;line-height:1.5">${(()=>{try{const a=JSON.parse(localStorage.getItem('meumapa_log')||'[]');return a.length?a.map(esc).join('<br>'):'Nenhum registro ainda.'}catch{return ''}})()}</div>`;
  }
  $('sheetBody').innerHTML=h;
  if(sheetTab==='soc')socOnTab();
}
function setTheme(t){S.theme=t;applyTheme();save();renderSheet()}
function setVoice(v){S.mute=v==='off';S.less=v==='less';if(S.mute)stopVoice();hud();save();renderSheet()}
function resetTap(){
  if(Date.now()-resetArm<4000){try{localStorage.removeItem(SAVE_KEY)}catch{}location.reload();return}
  resetArm=Date.now();$('resetBtn').textContent='Toque de novo para apagar TUDO';
}

/* ── ESCOLHA DE CLASSE ───────────────────────────────── */
let selCls='cavaleiro';
function openClassSel(){
  selCls=S.cls||'cavaleiro';$('heroName').value=S.name==='Aventureiro'?'':S.name;
  renderClassGrid();$('classSel').classList.add('on');
}
function renderClassGrid(){
  $('clsGrid').innerHTML=Object.entries(CLASSES).map(([k,c])=>`<div class="cc ${k===selCls?'sel':''}" onclick="selCls='${k}';renderClassGrid()">
    <div class="cv">${heroPic(k)}</div><div class="cn">${c.nome}</div><div class="cdx">${c.desc}</div></div>`).join('');
}
function confirmClass(){
  const first=!S.cls;S.cls=selCls;S.name=$('heroName').value.trim()||S.name||'Aventureiro';
  if(S.hp==null||first)S.hp=maxHP();else S.hp=Math.min(S.hp,maxHP());
  save();$('classSel').classList.remove('on');refreshAll();
  if(first){startGPS();card('🗡️',`Bem-vindo, ${esc(S.name)}!`,'Coloque um destino e a aventura começa.','gold')}
}

/* ── PERMISSÕES (app Android) ───────────────────────────── */
const permTxt=s=>s==='granted'?'✅ ok':s==='denied'?'❌ negada':'pendente';
async function permState(){
  let loc='prompt',not='prompt';
  try{const r=await NAT.geo.checkPermissions();loc=r.location}catch{}
  try{const r=await NAT.notif.checkPermissions();not=r.display}catch{}
  $('pmLoc').textContent=permTxt(loc);$('pmNot').textContent=permTxt(not);
  return{loc,not};
}
async function askPerms(){
  try{await NAT.geo.requestPermissions({permissions:['location','coarseLocation']})}catch(e){}
  try{await NAT.notif.requestPermissions()}catch(e){}
  const s=await permState();
  if(s.loc==='granted'){closePerms();startGPS();toast('📍 Localização liberada')}
  else toast('Sem localização o herói não consegue te acompanhar. Libere em Configurações → Apps → Ranvus Maps → Permissões.',6000);
}
function closePerms(){$('permSel').classList.remove('on')}
async function checkPermsAtStart(){
  if(!NATIVE||!NAT.geo)return;
  const s=await permState();
  if(s.loc!=='granted'||s.not!=='granted')$('permSel').classList.add('on');
}
