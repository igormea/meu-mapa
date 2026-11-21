'use strict';
/* ── BUSCA ───────────────────────────────────────────── */
/* Busca perto → longe: Photon (com viés pela sua posição) + Nominatim local,
   tudo ordenado pela distância até você, igual o Waze. */
function searchCenter(){return lastFix||{lat:map.getCenter().lat,lon:map.getCenter().lng}}
async function searchPlaces(q){
  const c=searchCenter(),res=[];
  const ph=fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${c.lat}&lon=${c.lon}&limit=10`).then(r=>r.json()).then(j=>{
    for(const f of j.features||[]){const p=f.properties;if(p.countrycode&&p.countrycode!=='BR')continue;
      const st=[p.street,p.housenumber].filter(Boolean).join(', ');
      const name=p.name||st||p.city;if(!name)continue;
      const sub=[p.name&&st&&p.name!==p.street?st:'',p.district||p.locality,p.city||p.county,p.state].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(', ');
      res.push({name,sub,lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0]})}
  }).catch(()=>{});
  const nm=fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=6&accept-language=pt-BR&countrycodes=br`+
    `&viewbox=${c.lon-.2},${c.lat+.2},${c.lon+.2},${c.lat-.2}&bounded=1`).then(r=>r.json()).then(d=>{
    for(const x of d){const p=x.display_name.split(', ');res.push({name:p.slice(0,2).join(', '),sub:p.slice(2,5).join(', '),lat:+x.lat,lon:+x.lon})}
  }).catch(()=>{});
  await Promise.all([ph,nm]);
  res.forEach(r=>r.dist=hav(c.lat,c.lon,r.lat,r.lon));
  res.sort((a,b)=>a.dist-b.dist);
  const out=[];for(const r of res)if(!out.some(o=>hav(o.lat,o.lon,r.lat,r.lon)<60&&short(o.name)===short(r.name)))out.push(r);
  return out.slice(0,8);
}
const _ac={};
function setupAC(inpId,listId,onPick){
  const inp=$(inpId),lst=$(listId);let seq=0;
  inp.addEventListener('input',()=>{
    clearTimeout(_ac[inpId]);const q=inp.value.trim();
    if(q.length<3){lst.style.display='none';return}
    _ac[inpId]=setTimeout(async()=>{
      const my=++seq;const d=await searchPlaces(q);if(my!==seq)return;
      if(!d.length){lst.style.display='none';return}
      lst.innerHTML=d.map((x,i)=>`<div class="aci" data-i="${i}"><div class="am"><span>${esc(x.name)}</span><span class="ad2">${fmtD(x.dist)}</span></div><div class="as">${esc(x.sub)}</div></div>`).join('');
      lst.querySelectorAll('.aci').forEach(el=>{
        const go=e=>{e.preventDefault();lst.style.display='none';inp.blur();onPick(d[+el.dataset.i])};
        el.addEventListener('mousedown',go);el.addEventListener('touchend',go);
      });
      lst.style.display='block';
    },350);
  });
  inp.addEventListener('blur',()=>setTimeout(()=>lst.style.display='none',220));
}
setupAC('inpD','ac-d',d=>{if(favConsume(d))return;$('inpD').value=d.name;goTo(d)});
setupAC('inpS','ac-s',d=>addStop(d));
setupAC('inpO','ac-o',d=>{originOverride={lat:d.lat,lon:d.lon};$('originLbl').textContent=d.name;$('inpO').value='';$('originBox').style.display='none'});
$('inpD').addEventListener('keydown',async e=>{
  if(e.key!=='Enter')return;const q=$('inpD').value.trim();if(q.length<2)return;
  $('ac-d').style.display='none';$('inpD').blur();setStatus('🔎 Procurando…');
  const d=await searchPlaces(q);if(!d.length)return setStatus('Não encontrei esse lugar','err');
  if(favConsume(d[0]))return;
  goTo(d[0]);
});
let originOverride=null;
function showOriginInput(){$('originBox').style.display='block';$('inpO').focus()}
function setStatus(m,k=''){const s=$('searchStatus');s.textContent=m;s.className=k}
function addRecent(d){S.recents=[d,...S.recents.filter(x=>x.name!==d.name)].slice(0,6);save();renderRecents()}
function renderRecents(){
  const r=$('recents');r.innerHTML=S.recents.map((x,i)=>`<div class="chip" data-i="${i}">🕘 ${esc(short(x.name))}</div>`).join('');
  r.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{const d=S.recents[+c.dataset.i];$('inpD').value=d.name;goTo(d)});
}
map.on('contextmenu',e=>{if(isNav||PR.length)return;goTo({name:'Ponto marcado no mapa',sub:'',lat:e.lngLat.lat,lon:e.lngLat.lng},true)});
