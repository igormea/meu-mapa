// Otimiza os personagens KayKit (CC0) para o Meu Mapa RPG:
// mantém só a arma da classe e as animações usadas, comprime com meshopt.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, weld, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const SRC = process.argv[2], OUT = process.argv[3];
const SKEL = process.argv[4] === 'skel';
const CLASSES = SKEL ? {
  esq_guerreiro: { file: 'Skeleton_Warrior.glb', keep: [], atk: '1H_Melee_Attack_Chop' },
  esq_lacaio:    { file: 'Skeleton_Minion.glb',  keep: [], atk: '1H_Melee_Attack_Chop' },
  esq_mago:      { file: 'Skeleton_Mage.glb',    keep: [], atk: 'Spellcast_Shoot' },
  esq_ladino:    { file: 'Skeleton_Rogue.glb',   keep: [], atk: 'Dualwield_Melee_Attack_Chop' },
} : {
  cavaleiro: { file: 'Knight.glb',       keep: ['1H_Sword', 'Round_Shield'],      atk: '1H_Melee_Attack_Chop' },
  barbaro:   { file: 'Barbarian.glb',    keep: ['2H_Axe'],                        atk: '2H_Melee_Attack_Chop' },
  mago:      { file: 'Mage.glb',         keep: ['2H_Staff'],                      atk: 'Spellcast_Shoot' },
  ladino:    { file: 'Rogue.glb',        keep: ['Knife', 'Knife_Offhand'],        atk: 'Dualwield_Melee_Attack_Chop' },
  arqueiro:  { file: 'Rogue_Hooded.glb', keep: ['2H_Crossbow'],                   atk: '2H_Ranged_Shoot' },
};
const WEAPONS = ['1H_Sword_Offhand','Badge_Shield','Rectangle_Shield','Round_Shield','Spike_Shield','1H_Sword','2H_Sword',
  '1H_Axe_Offhand','Barbarian_Round_Shield','1H_Axe','2H_Axe','Mug','Spellbook','Spellbook_open','1H_Wand','2H_Staff',
  'Knife_Offhand','1H_Crossbow','2H_Crossbow','Knife','Throwable'];
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
for (const [cls, c] of Object.entries(CLASSES)) {
  const doc = await io.read(`${SRC}/${c.file}`);
  const root = doc.getRoot();
  for (const n of root.listNodes()) if (WEAPONS.includes(n.getName()) && !c.keep.includes(n.getName())) n.dispose();
  const animKeep = SKEL ? { Idle_Combat: 'idle', Walking_D_Skeletons: 'walk', Hit_A: 'hit', Death_A: 'death', Spawn_Ground_Skeletons: 'spawn', [c.atk]: 'attack' }
                       : { Idle: 'idle', Walking_A: 'walk', Running_A: 'run', Cheer: 'cheer', Hit_A: 'hit', [c.atk]: 'attack' };
  for (const a of root.listAnimations()) {
    const nm = a.getName();
    if (animKeep[nm]) a.setName(animKeep[nm]);
    else { a.listChannels().forEach(ch => ch.dispose()); a.listSamplers().forEach(sm => sm.dispose()); a.dispose(); }
  }
  await doc.transform(prune(), dedup(), resample({ tolerance: 1e-3 }), weld(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(`${OUT}/${cls}.glb`, doc);
  console.log(cls, root.listAnimations().map(a => a.getName()).join(','), root.listNodes().filter(n => n.getMesh()).map(n => n.getName()).join(','));
}
