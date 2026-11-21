// Otimiza os monstros Quaternius (CC0) convertidos de FBX: renomeia animações e comprime.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, weld, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const SRC = process.argv[2], OUT = process.argv[3];
const M = {   // arquivo → [id no app, {animação original: nome no app}]
  Crab: ['q_crab'], Bat: ['q_bat'], Cactus: ['q_cactus'], Ghost: ['q_ghost'], Tree: ['q_tree'], Cthulhu: ['q_cthulhu'],
  YellowDragon: ['q_ydragon'], Demon: ['q_demon'], Cyclops: ['q_cyclops'], Pig: ['q_pig'], Bee: ['q_bee'],
  Mushroom: ['q_mushroom'], Skull: ['q_skull'], Yeti: ['q_yeti'], Old_Slime: ['q_slime'], Old_Dragon: ['q_dragon'],
};
const NAME = n => {
  const s = n.split('|').pop().replace(/\.\d+$/, '');
  if (/^(Idle|Slime_Idle)$/.test(s)) return 'idle';
  if (/^(Flying|Dragon_Flying)$/.test(s)) return 'fly';
  if (/^(Bite_Front|Slime_Attack|Dragon_Attack)$/.test(s)) return 'attack';
  if (/^(Death|Slime_Death|Dragon_Death)$/.test(s)) return 'death';
  if (/^(HitRecieve|Dragon_Hit)$/.test(s)) return 'hit';
  if (/^Jump$/.test(s)) return 'spawn';
  return null;
};
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
for (const [file, [id]] of Object.entries(M)) {
  const doc = await io.read(`${SRC}/${file}.glb`); const root = doc.getRoot(); const seen = new Set();
  for (const a of root.listAnimations()) {
    let nm = NAME(a.getName());
    if (nm === 'fly' && !root.listAnimations().some(x => NAME(x.getName()) === 'idle')) nm = 'idle';
    if (!nm || nm === 'fly' || seen.has(nm)) { a.listChannels().forEach(c => c.dispose()); a.listSamplers().forEach(s => s.dispose()); a.dispose(); continue; }
    seen.add(nm); a.setName(nm);
  }
  await doc.transform(prune(), dedup(), resample({ tolerance: 1e-3 }), weld(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(`${OUT}/${id}.glb`, doc);
  console.log(id, [...seen].join(','));
}
