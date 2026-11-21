// Otimiza Ultimate Monsters + Ultimate Animated Animals (Quaternius, CC0): escolhe animações e comprime.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, weld, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import path from 'path';
const OUT = process.argv[2], FILES = process.argv.slice(3);
const PREF = [['idle', ['Idle', 'Flying_Idle']], ['attack', ['Bite_Front', 'Punch', 'Headbutt', 'Weapon', 'Attack', 'Attack_Headbutt', 'Attack_Kick']],
  ['hit', ['HitRecieve', 'HitReact', 'Idle_HitReact1']], ['death', ['Death']], ['spawn', ['Jump', 'Jump_toIdle', 'Jump_ToIdle']]];
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
for (const f of FILES) {
  const grp = f.includes('/a/') ? 'an' : f.includes('/Big/') ? 'ug' : f.includes('/Flying/') ? 'uf' : 'ub';
  const id = `${grp}_${path.basename(f, '.gltf').toLowerCase()}`;
  const doc = await io.read(f); const root = doc.getRoot();
  const by = new Map(root.listAnimations().map(a => [a.getName().split('|').pop(), a]));
  const keep = new Map();
  for (const [nm, cands] of PREF) { const c = cands.find(x => by.has(x)); if (c && ![...keep.values()].includes(by.get(c))) keep.set(nm, by.get(c)); }
  for (const a of root.listAnimations()) {
    const nm = [...keep].find(([, v]) => v === a)?.[0];
    if (nm) { a.setName(nm); continue; }
    a.listChannels().forEach(c => c.dispose()); a.listSamplers().forEach(s => s.dispose()); a.dispose();
  }
  await doc.transform(prune(), dedup(), resample({ tolerance: 1e-3 }), weld(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(`${OUT}/${id}.glb`, doc);
  console.log(id, [...keep.keys()].join(','));
}
