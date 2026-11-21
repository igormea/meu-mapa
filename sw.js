/* Ranvus Maps — cache offline.
   App: rede primeiro (sempre pega a versão nova), cache se estiver sem internet.
   Mapa (tiles OSM): cache primeiro, até ~3.500 pedaços dos lugares que você já viu. */
const APP_CACHE='mmrpg-app-5.6.0', TILE_CACHE='mmrpg-tiles', MAX_TILES=3500;
const SHELL=['./','index.html','css/app.css','vendor/maplibre-gl.js','vendor/maplibre-gl.css',
  'vendor/fonts/pixelify-sans-latin-400-normal.woff2','vendor/fonts/pixelify-sans-latin-600-normal.woff2','vendor/fonts/pixelify-sans-latin-700-normal.woff2','vendor/fonts/fredoka-latin-400-normal.woff2','vendor/fonts/fredoka-latin-500-normal.woff2','vendor/fonts/fredoka-latin-600-normal.woff2','vendor/fonts/fredoka-latin-700-normal.woff2','vendor/fonts/cinzel-latin-700-normal.woff2','vendor/fonts/alegreya-sans-latin-500-normal.woff2','vendor/fonts/alegreya-sans-latin-700-normal.woff2',
  'icon-192.png','manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(APP_CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('mmrpg-app-')&&k!==APP_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.hostname==='tile.openstreetmap.org'){e.respondWith(tile(req));return}
  if(u.origin===self.location.origin)e.respondWith(
    fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(APP_CACHE).then(c=>c.put(req,cp))}return r})
      .catch(()=>caches.match(req).then(h=>h||caches.match(req,{ignoreSearch:true})).then(h=>h||Response.error())));
});
let trimming=false;
async function tile(req){
  const c=await caches.open(TILE_CACHE);const hit=await c.match(req);if(hit)return hit;
  try{const r=await fetch(req);if(r.ok){await c.put(req,r.clone());trim(c)}return r}catch(e){return Response.error()}
}
async function trim(c){
  if(trimming)return;trimming=true;
  try{const ks=await c.keys();if(ks.length>MAX_TILES)for(const k of ks.slice(0,ks.length-MAX_TILES+300))await c.delete(k)}finally{trimming=false}
}
