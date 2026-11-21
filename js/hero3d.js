/* ── HERÓI 3D ──────────────────────────────────────────────
   Personagem 3D (KayKit Adventurers, CC0) desenhado dentro do mapa.
   Fica de pé no chão, vira para a direção em que você anda e acompanha a
   câmera: na navegação você o vê de costas correndo; girando/inclinando o
   mapa com os dedos, vê de lado e de frente.
   Animações: idle (parado), walk, run, attack (batalha), cheer (nível/chegada), hit.
   Se algo falhar (sem WebGL etc.), o boneco 2D antigo continua funcionando. */
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/three/addons/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from '../vendor/three/addons/utils/SkeletonUtils.js';

const PX_TALL = 44;            // altura do herói na tela (pixels)
const H = { ready: false, cls: null, heading: 0, shownHeading: 0, speed: 0, model: null, height: 1,
            mixer: null, actions: {}, current: null, oneShot: null, loading: null, failed: false };
let ORG = { x: 0, y: 0, z: 0 }, renderer, scene, camera, loader, lastT = performance.now(), nextFrame = 0;

const layer = {
  id: 'hero3d', type: 'custom', renderingMode: '3d',
  onAdd(map, gl) {
    camera = new THREE.Camera();
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff2d8, 0x6b4a2a, 2.4));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-1, 2, 1.5); scene.add(sun);
    renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
    renderer.autoClear = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  },
  render(gl, matrix) {
    const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    const map = window.__map;
    // desenha relativo ao centro do mapa (evita perder precisão com coordenadas do planeta inteiro → modelo "estilhaçado")
    const c = map.getCenter(); ORG = maplibregl.MercatorCoordinate.fromLngLat([c.lng, c.lat], 0);
    camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(new THREE.Matrix4().makeTranslation(ORG.x, ORG.y, ORG.z));
    let any = false;
    // herói
    const ll = H.model && window.__heroPos ? window.__heroPos() : null;
    if (ll) {
      H.mixer?.update(dt);
      let d = ((H.heading - H.shownHeading + 540) % 360) - 180;   // gira suavemente até a direção de movimento
      H.shownHeading = (H.shownHeading + d * Math.min(1, dt * 6) + 360) % 360;
      placeAt(H.model, ll.lat, ll.lng, H.shownHeading, PX_TALL, H.height, map); any = true;
    }
    // monstros 3D próximos
    for (const m of MON.values()) {
      if (!m.obj) continue;
      m.mixer.update(dt);
      const face = ll ? bearingTo(m.lat, m.lon, ll.lat, ll.lng) : 0;      // olha para o herói
      // sem animação de morte: encolhe até sumir
      const shrink = m.dying && !m.actions.death ? Math.max(0.01, 1 - (performance.now() - m.dying) / 500) : 1;
      placeAt(m.obj, m.lat, m.lon, face, m.px * shrink, m.height, map); any = true;
    }
    if (!any) return;
    renderer.resetState();
    renderer.clearDepth();           // personagens sempre visíveis (por cima de prédios 3D)
    renderer.render(scene, camera);
    // animação a ~30 fps; parado e sem navegar, ~12 fps (economiza bateria)
    const fps = H.speed > 0.5 || window.__heroBusy?.() || H.oneShot || MON.size ? 30 : 12;
    if (now >= nextFrame) { nextFrame = now + 1000 / fps; setTimeout(() => map.triggerRepaint(), 1000 / fps); }
  },
};
const _v = new THREE.Vector3(), _rx = new THREE.Matrix4().makeRotationX(Math.PI / 2);
// posiciona um modelo de pé no chão do mapa, com tamanho fixo em pixels e voltado para "heading"
function placeAt(obj, lat, lon, heading, px, height, map) {
  const mc = maplibregl.MercatorCoordinate.fromLngLat([lon, lat], 0);
  const mpp = 2 * Math.PI * 6378137 * Math.cos(lat * Math.PI / 180) / (512 * Math.pow(2, map.getZoom()));
  const s = mc.meterInMercatorCoordinateUnits() * (px * mpp) / height;
  const rotY = new THREE.Matrix4().makeRotationY(-heading * Math.PI / 180 + Math.PI);
  // com o mapa pouco inclinado, o personagem "se levanta" em direção à câmera (senão só se vê o topo da cabeça)
  const tilt = Math.max(0, 58 - map.getPitch()) * Math.PI / 180, b = map.getBearing() * Math.PI / 180;
  const tiltM = new THREE.Matrix4().makeRotationAxis(_v.set(Math.cos(b), -Math.sin(b), 0), -tilt);
  obj.matrixAutoUpdate = false;
  obj.matrix.makeTranslation(mc.x - ORG.x, mc.y - ORG.y, mc.z - ORG.z).scale(_v.set(s, -s, s)).multiply(tiltM).multiply(_rx).multiply(rotY);
  obj.matrixWorldNeedsUpdate = true;
}
function bearingTo(la1, lo1, la2, lo2) {
  const r = Math.PI / 180, y = Math.sin((lo2 - lo1) * r) * Math.cos(la2 * r),
    x = Math.cos(la1 * r) * Math.sin(la2 * r) - Math.sin(la1 * r) * Math.cos(la2 * r) * Math.cos((lo2 - lo1) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}

/* ── MONSTROS 3D ── modelos carregados uma vez por tipo e clonados por monstro */
const MON = new Map(), TPL = {};
async function template(kind) {
  if (!TPL[kind]) TPL[kind] = loader.loadAsync(`models/mon/${kind}.glb?v=2`).then(g => {
    g.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    const box = new THREE.Box3().setFromObject(g.scene); return { g, height: Math.max(.5, box.max.y - box.min.y) };
  });
  return TPL[kind];
}
async function monAdd(id, kind, lat, lon, px = 36, tint = null) {
  if (MON.has(id) || H.failed) return;
  const m = { id, kind, lat, lon, px, obj: null }; MON.set(id, m);
  try {
    const t = await template(kind); if (!MON.has(id)) return;
    const obj = cloneSkinned(t.g.scene); m.obj = obj; m.height = t.height; scene.add(obj);
    // variantes: mesmo modelo com outra cor (ex.: Slime de Areia, Caranguejo Rei)
    if (tint) obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.set(tint); o.material.emissive?.set(tint).multiplyScalar(.28); } });
    m.mixer = new THREE.AnimationMixer(obj); m.actions = {};
    for (const c of t.g.animations) m.actions[c.name] = m.mixer.clipAction(c);
    for (const k of ['spawn', 'attack', 'hit', 'death']) if (m.actions[k]) { m.actions[k].setLoop(THREE.LoopOnce, 1); m.actions[k].clampWhenFinished = true; }
    const idle = () => { if (m.dying) return; m.actions.idle?.reset().fadeIn(.3).play(); };
    m.mixer.addEventListener('finished', e => { if (e.action === m.actions.spawn) { m.actions.spawn.fadeOut(.3); idle(); } });
    if (m.actions.spawn) m.actions.spawn.play(); else idle();
    window.__onMon3D?.(id, true);
    window.__map.triggerRepaint();
  } catch (e) { MON.delete(id); window.__onMon3D?.(id, false); }
}
function monRemove(id) { const m = MON.get(id); if (!m) return; if (m.obj) scene.remove(m.obj); MON.delete(id); }
function monKill(id) {
  const m = MON.get(id); if (!m || !m.obj || m.dying) return monRemove(id);
  m.dying = performance.now(); m.mixer.stopAllAction(); m.actions.death?.reset().play();
  setTimeout(() => monRemove(id), m.actions.death ? 1600 : 520);
}

function play(name, fade = 0.25) {
  const a = H.actions[name]; if (!a || H.current === a) return;
  a.reset().setEffectiveWeight(1).fadeIn(fade).play();
  H.current?.fadeOut(fade);
  H.current = a;
}
function locomotion() {
  if (H.oneShot) return;
  const v = H.speed;
  if (v < 0.6) play('idle');
  else if (v < 2.6) { play('walk'); H.actions.walk.timeScale = Math.min(1.6, 0.7 + v / 3); }
  else { play('run'); H.actions.run.timeScale = Math.min(1.5, 0.85 + v / 40); }
}

async function setClass(cls) {
  if (H.failed || !cls || H.cls === cls) return;
  H.cls = cls;
  const job = H.loading = loader.loadAsync(`models/${cls}.glb?v=1`);
  let gltf;
  try { gltf = await job; } catch (e) { console.warn('herói 3D:', e); return fail(); }
  if (H.loading !== job) return;           // trocou de classe no meio
  if (H.model) scene.remove(H.model);
  const m = gltf.scene; m.matrixAutoUpdate = false;
  m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) o.material.side = THREE.FrontSide; } });
  const box = new THREE.Box3().setFromObject(m); H.height = Math.max(0.5, box.max.y - box.min.y);
  scene.add(m); H.model = m;
  H.mixer = new THREE.AnimationMixer(m); H.actions = {}; H.current = null;
  for (const clip of gltf.animations) H.actions[clip.name] = H.mixer.clipAction(clip);
  for (const k of ['attack', 'cheer', 'hit']) if (H.actions[k]) { H.actions[k].setLoop(THREE.LoopOnce, 1); H.actions[k].clampWhenFinished = true; }
  H.mixer.addEventListener('finished', () => { H.oneShot = null; locomotion(); });
  locomotion();
  H.ready = true; document.body.classList.add('has3d');
  try { if (typeof S === 'object') GEAR = { w: S.equip.weapon ? S.equip.weapon.r : null, a: S.equip.armor ? S.equip.armor.r : null }; } catch {}
  applyGear();
  window.__map.triggerRepaint();
}
/* equipamento visível: arma/escudo só com arma equipada, elmo/capa só com armadura; brilho na cor da raridade */
let GEAR = { w: null, a: null };
const RCOL = ['#000000', '#3f8f4f', '#3b6fd1', '#9b4fe0', '#e0a020'];   // incomum, raro, épico, lendário
function applyGear() {
  if (!H.model) return;
  H.model.traverse(o => {
    if (!o.isMesh) return;
    const nm = o.name || '';
    const isW = /Sword|Axe|Staff|Knife|Crossbow|Shield/i.test(nm), isA = /Helmet|Hat|Cape/i.test(nm);
    if (!isW && !isA) return;
    const r = isW ? GEAR.w : GEAR.a;
    o.visible = r != null;
    if (!o.userData.mat0) o.userData.mat0 = o.material;
    if (r >= 1) { o.material = o.userData.mat0.clone(); o.material.emissive?.set(RCOL[Math.min(4, r)]).multiplyScalar(r >= 3 ? .55 : .35); }
    else o.material = o.userData.mat0;
  });
  window.__map?.triggerRepaint();
}
function fail() { H.failed = true; document.body.classList.remove('has3d'); }

// API usada pelo resto do app (scripts clássicos)
window.Hero3D = {
  setClass,
  setMotion(heading, speed) { if (heading != null && !isNaN(heading)) H.heading = heading; H.speed = speed || 0; locomotion(); },
  act(name) { if (!H.actions[name]) return; H.oneShot = name; H.current?.fadeOut(0.1); const a = H.actions[name]; a.reset().fadeIn(0.1).play(); H.current = a; window.__map.triggerRepaint(); },
  // monstros 3D: sync(lista desejada [{id,kind,lat,lon,px}]) adiciona/remove; kill(id) toca a morte e some
  monSync(list) {
    if (!H.ready) return;
    const want = new Set(list.map(x => x.id));
    for (const id of [...MON.keys()]) if (!want.has(id) && !MON.get(id).dying) monRemove(id);
    for (const x of list) monAdd(x.id, x.kind, x.lat, x.lon, x.px, x.tint);
  },
  get __model() { return H.model; },
  gear(g) { GEAR = { w: g?.w ?? null, a: g?.a ?? null }; applyGear(); },
  monKill, monAttack(id) { const m = MON.get(id); (m?.actions?.attack || m?.actions?.hit)?.reset().play(); },
  get mons() { return [...MON.values()].map(m => ({ id: m.id, kind: m.kind, ready: !!m.obj, dying: !!m.dying })); },
  get state() { return { ready: H.ready, cls: H.cls, anim: Object.keys(H.actions).find(k => H.actions[k] === H.current) || null, heading: H.heading, failed: H.failed }; },
};

function start() {
  const map = window.__map;
  // __mapReady é uma Promise: funciona mesmo se o mapa terminou de carregar antes deste módulo
  window.__mapReady.then(() => {
    try { if (!map.getLayer('hero3d')) map.addLayer(layer); } catch (e) { console.warn(e); return fail(); }
    if (window.__heroCls) setClass(window.__heroCls());
  });
}
if (window.__map) start(); else window.addEventListener('mapready', start, { once: true });
