/* Ranvus Maps — cache offline.
   App: rede primeiro (sempre pega a versão nova), cache se estiver sem internet.
   Mapa (tiles OSM): cache primeiro, até ~3.500 pedaços dos lugares que você já viu. */
const APP_CACHE='mmrpg-app-1.31.0', TILE_CACHE='mmrpg-tiles', ASSET_CACHE='mmrpg-assets-1', MAX_TILES=6000;
const SHELL=['./','index.html','css/app.css','vendor/maplibre-gl.js','vendor/maplibre-gl.css',
  'vendor/fonts/pixelify-sans-latin-400-normal.woff2','vendor/fonts/pixelify-sans-latin-600-normal.woff2','vendor/fonts/pixelify-sans-latin-700-normal.woff2','vendor/fonts/fredoka-latin-400-normal.woff2','vendor/fonts/fredoka-latin-500-normal.woff2','vendor/fonts/fredoka-latin-600-normal.woff2','vendor/fonts/fredoka-latin-700-normal.woff2','vendor/fonts/cinzel-latin-700-normal.woff2','vendor/fonts/alegreya-sans-latin-500-normal.woff2','vendor/fonts/alegreya-sans-latin-700-normal.woff2',
  'icon-192.png','manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(APP_CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('mmrpg-app-')&&k!==APP_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.hostname==='tile.openstreetmap.org'){e.respondWith(tile(req));return}
  // mapa limpo: pedaços vetoriais (endereço já tem a versão) e fontes dos nomes
  if(u.hostname==='tiles.openfreemap.org'&&u.pathname.endsWith('.pbf')){e.respondWith(tile(req));return}
  if(u.origin===self.location.origin){
    // arquivos com versão no endereço (?v=1.31.0) e bibliotecas: cache primeiro → abre na hora.
    // A página (index.html) vem da rede (com limite de espera), e ela aponta pra versão nova.
    if(u.searchParams.has('v')||/\/vendor\//.test(u.pathname)){e.respondWith(cacheFirst(req,APP_CACHE));return}
    e.respondWith(netFirst(req,req.mode==='navigate'?3500:6000));
  }
});
async function cacheFirst(req,name){
  const c=await caches.open(name);const hit=await c.match(req);if(hit)return hit;
  try{const r=await fetch(req);if(r.ok)c.put(req,r.clone());return r}catch(e){return Response.error()}
}
async function netFirst(req,ms){
  const c=await caches.open(APP_CACHE);
  const net=fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r});
  const slow=new Promise(res=>setTimeout(res,ms)).then(()=>c.match(req,{ignoreSearch:true}));
  try{const r=await Promise.race([net,slow]);if(r)return r;return await net}
  catch(e){return (await c.match(req))||(await c.match(req,{ignoreSearch:true}))||Response.error()}
}
let trimming=false;
async function tile(req){
  const c=await caches.open(TILE_CACHE);const hit=await c.match(req);if(hit)return hit;
  try{const r=await fetch(req);if(r.ok){await c.put(req,r.clone());trim(c)}return r}catch(e){return Response.error()}
}
async function trim(c){
  if(trimming)return;trimming=true;
  try{const ks=await c.keys();if(ks.length>MAX_TILES)for(const k of ks.slice(0,ks.length-MAX_TILES+300))await c.delete(k)}finally{trimming=false}
}
