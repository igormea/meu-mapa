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

const PX_TALL = 44;            // altura do herói na tela (pixels)
const H = { ready: false, cls: null, heading: 0, shownHeading: 0, speed: 0, model: null, height: 1,
            mixer: null, actions: {}, current: null, oneShot: null, loading: null, failed: false };
let renderer, scene, camera, loader, lastT = performance.now(), nextFrame = 0;

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
    if (!H.model || !window.__heroPos) return;
    const ll = window.__heroPos(); if (!ll) return;
    const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    H.mixer?.update(dt);
    // gira suavemente até a direção de movimento
    let d = ((H.heading - H.shownHeading + 540) % 360) - 180;
    H.shownHeading = (H.shownHeading + d * Math.min(1, dt * 6) + 360) % 360;

    const mc = maplibregl.MercatorCoordinate.fromLngLat([ll.lng, ll.lat], 0);
    const z = window.__map.getZoom();
    const mpp = 2 * Math.PI * 6378137 * Math.cos(ll.lat * Math.PI / 180) / (512 * Math.pow(2, z));
    const s = mc.meterInMercatorCoordinateUnits() * (PX_TALL * mpp) / H.height;
    const rotX = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    const rotY = new THREE.Matrix4().makeRotationY(-H.shownHeading * Math.PI / 180 + Math.PI);
    // com o mapa pouco inclinado, o herói "se levanta" em direção à câmera (senão só se vê o topo da cabeça)
    const pitch = window.__map.getPitch(), tilt = Math.max(0, 58 - pitch) * Math.PI / 180;
    const b = window.__map.getBearing() * Math.PI / 180;
    const tiltM = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(Math.cos(b), -Math.sin(b), 0), -tilt);
    const l = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new THREE.Vector3(s, -s, s)).multiply(tiltM).multiply(rotX).multiply(rotY);
    camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(l);
    renderer.resetState();
    renderer.clearDepth();           // herói sempre visível (por cima de prédios 3D)
    renderer.render(scene, camera);
    // animação a ~30 fps; parado e sem navegar, ~12 fps (economiza bateria)
    const fps = H.speed > 0.5 || window.__heroBusy?.() || H.oneShot ? 30 : 12;
    if (now >= nextFrame) { nextFrame = now + 1000 / fps; setTimeout(() => window.__map.triggerRepaint(), 1000 / fps); }
  },
};

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
  const m = gltf.scene;
  m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) o.material.side = THREE.FrontSide; } });
  const box = new THREE.Box3().setFromObject(m); H.height = Math.max(0.5, box.max.y - box.min.y);
  scene.add(m); H.model = m;
  H.mixer = new THREE.AnimationMixer(m); H.actions = {}; H.current = null;
  for (const clip of gltf.animations) H.actions[clip.name] = H.mixer.clipAction(clip);
  for (const k of ['attack', 'cheer', 'hit']) if (H.actions[k]) { H.actions[k].setLoop(THREE.LoopOnce, 1); H.actions[k].clampWhenFinished = true; }
  H.mixer.addEventListener('finished', () => { H.oneShot = null; locomotion(); });
  locomotion();
  H.ready = true; document.body.classList.add('has3d');
  window.__map.triggerRepaint();
}
function fail() { H.failed = true; document.body.classList.remove('has3d'); }

// API usada pelo resto do app (scripts clássicos)
window.Hero3D = {
  setClass,
  setMotion(heading, speed) { if (heading != null && !isNaN(heading)) H.heading = heading; H.speed = speed || 0; locomotion(); },
  act(name) { if (!H.actions[name]) return; H.oneShot = name; H.current?.fadeOut(0.1); const a = H.actions[name]; a.reset().fadeIn(0.1).play(); H.current = a; window.__map.triggerRepaint(); },
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
