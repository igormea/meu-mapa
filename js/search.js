'use strict';
/* ── BUSCA ───────────────────────────────────────────── */
/* Busca perto → longe: Photon (com viés pela sua posição) + Nominatim local,
   tudo ordenado pela distância até você, igual o Waze. */
function searchCenter(){return lastFix||{lat:map.getCenter().lat,lon:map.getCenter().lng}}
const norm=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// abreviações comuns → palavra completa (o Photon entende melhor)
const ABBR={av:'avenida',avn:'avenida',r:'rua',al:'alameda',tv:'travessa',trav:'travessa',pc:'praca',pca:'praca',pç:'praca',dr:'doutor',dra:'doutora',
  sta:'santa',sto:'santo',pres:'presidente',eng:'engenheiro',gal:'general',gen:'general',cel:'coronel',prof:'professor',cap:'capitao',
  sen:'senador',dep:'deputado',ten:'tenente',maj:'major',pe:'padre',n:'nossa',sra:'senhora',jd:'jardim',vl:'vila',res:'residencial',cj:'conjunto',cond:'condominio'};
function expandQ(q){return norm(q).replace(/[.,]/g,' ').split(/\s+/).filter(Boolean).map(w=>ABBR[w]||w)}
/* números por extenso ⇄ algarismos ("rua trezentos e vinte e um" ⇄ "rua 321"): o mapa tem as duas formas */
const NW={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10,onze:11,doze:12,treze:13,quatorze:14,catorze:14,quinze:15,
  dezesseis:16,dezessete:17,dezoito:18,dezenove:19,vinte:20,trinta:30,quarenta:40,cinquenta:50,sessenta:60,setenta:70,oitenta:80,noventa:90,
  cem:100,cento:100,duzentos:200,trezentos:300,quatrocentos:400,quinhentos:500,seiscentos:600,setecentos:700,oitocentos:800,novecentos:900};
const NU=['','um','dois','tres','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'],
  ND=['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'],
  NC=['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
function numWords(n){if(n===100)return'cem';const c=Math.floor(n/100),r=n%100,p=[];if(c)p.push(NC[c]);
  if(r<20){if(r)p.push(NU[r])}else{p.push(ND[Math.floor(r/10)]);if(r%10)p.push(NU[r%10])}return p.join(' e ')}
function wordsToNum(toks){   // junta sequências "trezentos e vinte e um" → "321"
  const o=[];for(let i=0;i<toks.length;i++){
    if(NW[toks[i]]==null){o.push(toks[i]);continue}
    let v=0,j=i;while(j<toks.length&&(NW[toks[j]]!=null||(toks[j]==='e'&&NW[toks[j+1]]!=null&&j>i))){if(toks[j]!=='e')v+=NW[toks[j]];j++}
    o.push(String(v));i=j-1}
  return o}
const numToWords=toks=>toks.map(t=>/^\d{1,3}$/.test(t)&&+t>0?numWords(+t):t);
const STREET=/^(rua|avenida|travessa|alameda|rodovia|estrada|praca|vila|beco|via)$/;
/* separa o número da casa: "rua um, 171" / "rua um 171" / "rua 321, 35, jurema" → rua + nº + resto */
function parseAddr(q){
  const parts=norm(q).split(',').map(x=>x.trim()).filter(Boolean);
  let num=null,rest=[];
  if(parts.length>1){const i=parts.findIndex((x,k)=>k>0&&/^(n|no|nº|n°)?\s*\d{1,5}[a-z]?$/.test(x));
    if(i>0){num=parts[i].match(/\d{1,5}[a-z]?/)[0];rest=parts.filter((x,k)=>k!==i&&k>0);return{street:expandQ(parts[0]),num,rest:rest.flatMap(expandQ)}}}
  const t=expandQ(q);
  // sem vírgula: último número é a casa se depois do tipo da rua já houver um nome ("rua um 171", "rua 321 35")
  const L=t.length-1,ti=t.findIndex(w=>STREET.test(w));
  if(ti>=0&&L>=ti+2&&/^\d{1,5}[a-z]?$/.test(t[L]))return{street:t.slice(0,L),num:t[L],rest:[]};
  return{street:t,num:null,rest:[]};
}
// quanto o resultado "bate" com o que foi digitado (0..1): palavra começando igual vale 1, contida vale .5
function textScore(toks,r){
  const words=norm(r.name+' '+r.sub).split(/[^a-z0-9]+/).filter(Boolean);let s=0;
  for(const t of toks)s+=words.some(w=>w.startsWith(t))?1:words.some(w=>w.includes(t))?.5:0;
  return toks.length?s/toks.length:0;
}
let nomLast=0;
// typing=true → sugestão enquanto digita: só Photon (o Nominatim proíbe autocompletar). Enter/voz → os dois.
async function searchPlaces(q,typing=false){
  const c=searchCenter(),res=[],A=parseAddr(q),toks=[...A.street,...A.rest],qx=toks.join(' ');
  // variantes: como foi escrito, com algarismos e por extenso (sem repetir)
  const vs=[...new Set([qx,wordsToNum(toks).join(' '),numToWords(toks).join(' ')])];
  const photon=v=>fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(v)}&lat=${c.lat}&lon=${c.lon}&limit=12&lang=default`).then(r=>r.json()).then(j=>{
    for(const f of j.features||[]){const p=f.properties;if(p.countrycode&&p.countrycode!=='BR')continue;
      const st=[p.street,p.housenumber].filter(Boolean).join(', ');
      let name=p.name||st||p.city;if(!name)continue;
      let sub=[p.name&&st&&p.name!==p.street?st:'',p.district||p.locality,p.city||p.county,p.state].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(', ');
      // rua sem o número no mapa: leva até a rua e mostra o número que você pediu
      const base=p.name||p.street||'';   // nome sem o número da casa (pra comparar com o que foi digitado)
      if(A.num&&p.type==='street'&&!p.housenumber){name=`${name}, ${A.num}`;sub='rua encontrada · confira o número no local'+(sub?' · '+sub:'')}
      res.push({name,sub,base,lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],v})}
  }).catch(()=>{});
  const ph=Promise.all(vs.map(photon));
  let nm=Promise.resolve();
  if(!typing&&Date.now()-nomLast>1100){nomLast=Date.now();   // política do Nominatim: no máx. 1 pedido/s, nunca a cada tecla
    nm=fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=6&accept-language=pt-BR&countrycodes=br`+
      `&viewbox=${c.lon-.2},${c.lat+.2},${c.lon+.2},${c.lat-.2}&bounded=1`).then(r=>r.json()).then(d=>{
      for(const x of d){const p=x.display_name.split(', ');res.push({name:p.slice(0,2).join(', '),sub:p.slice(2,5).join(', '),lat:+x.lat,lon:+x.lon})}
    }).catch(()=>{});}
  const loc=window.localSearch?localSearch(toks,c):[];   // índice próprio de Fortaleza (se carregado)
  await Promise.all([ph,nm]);
  const all=[...loc,...res];
  const tv=vs.map(v=>v.split(' '));
  const streetVs=new Set([A.street.join(' '),wordsToNum(A.street).join(' '),numToWords(A.street).join(' ')]);
  all.forEach(r=>{r.dist=hav(c.lat,c.lon,r.lat,r.lon);
    const rb=r.base!=null?{name:r.base,sub:r.sub}:r;
    r.ts=Math.max(...tv.map(t=>textScore(t,rb)));
    if(r.base!=null&&streetVs.has(expandQ(r.base).join(' ')))r.ts+=.5;   // nome da rua exatamente igual ao digitado vem primeiro
  });
  // primeiro o que bate com o texto, depois o mais perto
  all.sort((a,b)=>(Math.round(b.ts*4)-Math.round(a.ts*4))||(a.dist-b.dist));
  const out=[];for(const r of all)if(!out.some(o=>hav(o.lat,o.lon,r.lat,r.lon)<60&&short(o.name)===short(r.name)))out.push(r);
  return out.slice(0,typing?10:8);
}
const _ac={};
function setupAC(inpId,listId,onPick){
  const inp=$(inpId),lst=$(listId);let seq=0;
  const render=(d,q)=>{
    if(inp.value.trim()!==q)return;
    if(!d.length){lst.innerHTML='<div class="acn">Nada encontrado ainda… continue digitando ou toque em Ir</div>';lst.style.display='block';srchTyping(inpId==='inpD');return}
    lst.innerHTML=d.map((x,i)=>`<div class="aci" data-i="${i}"><div class="am"><span>${x.ic?`<i class="aic">${x.ic}</i>`:''}${esc(x.name)}</span><span class="ad2">${fmtD(x.dist)}</span></div><div class="as">${esc(x.sub)}</div></div>`).join('');
    lst.querySelectorAll('.aci').forEach(el=>{
      const go=e=>{e.preventDefault();lst.style.display='none';inp.blur();srchTyping(false);onPick(d[+el.dataset.i])};
      el.addEventListener('mousedown',e=>e.preventDefault());el.addEventListener('click',go);   // click: rolar a lista não escolhe sem querer
    });
    lst.style.display='block';srchTyping(inpId==='inpD');
  };
  inp.addEventListener('focus',()=>loadPlaces());
  inp.addEventListener('input',()=>{
    clearTimeout(_ac[inpId]);const q=inp.value.trim();
    if(q.length<2){lst.style.display='none';srchTyping(false);return}
    // 1) índice próprio: aparece na hora, a cada letra
    if(PL){const c=searchCenter(),loc=localSearch(expandQ(q),c);loc.forEach(r=>r.dist=hav(c.lat,c.lon,r.lat,r.lon));if(loc.length)render(loc.slice(0,10),q)}
    // 2) internet (Photon) completa logo depois, quando a pessoa dá uma pausa
    _ac[inpId]=setTimeout(async()=>{
      const my=++seq;const d=await searchPlaces(q,true);if(my!==seq)return;
      render(d,q);
    },PL?300:220);
  });
  // na busca em tela cheia a lista continua visível mesmo com o teclado fechado
  inp.addEventListener('blur',()=>setTimeout(()=>{if(!inp.closest('.full'))lst.style.display='none'},220));
}
setupAC('inpD','ac-d',d=>{srchFull(false);if(portalConsume(d)||favConsume(d))return;$('inpD').value=d.name;goTo(d,!!d.portal)});
setupAC('inpS','ac-s',d=>addStop(d));
setupAC('inpO','ac-o',d=>{originOverride={lat:d.lat,lon:d.lon};$('originLbl').textContent=d.name;$('inpO').value='';$('originBox').style.display='none'});
$('inpD').addEventListener('keydown',async e=>{
  if(e.key!=='Enter')return;const q=$('inpD').value.trim();if(q.length<2)return;
  $('ac-d').style.display='none';$('inpD').blur();srchFull(false);setStatus('🔎 Procurando…');
  const d=await searchPlaces(q);if(!d.length)return setStatus('Não encontrei esse lugar','err');
  if(favConsume(d[0]))return;
  goTo(d[0]);
});
let originOverride=null;
function showOriginInput(){$('originBox').style.display='block';$('inpO').focus()}
function setStatus(m,k=''){const s=$('searchStatus');s.textContent=m;s.className=k}
function addRecent(d){S.recents=[d,...S.recents.filter(x=>x.name!==d.name)].slice(0,6);save();renderRecents();if(typeof carSyncPlaces==='function')carSyncPlaces()}
function renderRecents(){
  const r=$('recents');r.innerHTML=S.recents.map((x,i)=>`<div class="chip" data-i="${i}">🕘 ${esc(short(x.name))}</div>`).join('');
  r.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{const d=S.recents[+c.dataset.i];$('inpD').value=d.name;goTo(d)});
}
map.on('contextmenu',e=>{if(isNav||PR.length)return;goTo({name:'Ponto marcado no mapa',sub:'',lat:e.lngLat.lat,lon:e.lngLat.lng},true)});

/* ── BUSCA EM TELA CHEIA (igual o Waze) ── tocou no campo, a busca ocupa a tela; nada fica por cima da lista */
function srchTyping(on){$('searchPanel').classList.toggle('typing',!!on)}
function srchFull(on,fromBack){
  const p=$('searchPanel');if(p.classList.contains('full')===on)return;
  p.classList.toggle('full',on);document.body.classList.toggle('searching',on);
  if(on)layerPush('search',()=>{$('inpD').blur();srchFull(false,true)});
  else{srchTyping(false);$('ac-d').style.display='none';if(!fromBack)layerPop('search')}
}
$('inpD').addEventListener('focus',()=>srchFull(true));
$('srchBack').onclick=()=>{$('inpD').blur();srchFull(false)};
