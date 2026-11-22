'use strict';
/* ── SPRITES (pixel art 12×14) ───────────────────────── */
const PAL_BASE={s:'#f1c27d',e:'#1a1a1a',h:'#f1c27d',F:'#3b2a1a'};
const TORSO=["..ABBBBBBA..",".AABBbbBBAA.",".hABBbbBBAh.","..ABBBBBBA..","...bbbbbb...","...BBBBBB..."];
const LEGS_A=["...LL..LL...","...LL..LL...","...LL..LL...","..FFF..FFF.."];
const LEGS_B=["...LL..LL...","..LL....LL..",".LL......LL.",".FF......FF."];
const line=(x,y1,y2,k)=>{const a=[];for(let y=y1;y<=y2;y++)a.push([x,y,k]);return a};

const CLASSES={
  cavaleiro:{nome:'Cavaleiro',desc:'Armadura pesada. +30% de vida e defesa.',hp:1.3,atk:1,def:1.3,xp:1,gold:1,crit:.08,loot:1,reach:45,
    arma:'Espada',armadura:'Armadura de Placas',
    head:["....HHHH....","...HHHHHH...","...HeHHeH...","....HHHH...."],
    pal:{H:'#c9d0da',e:'#111',B:'#8f9bab',b:'#5d6b80',A:'#b8242b',L:'#4b5563',W:'#eef2f7',g:'#a16207',S:'#1e4fd8',Y:'#facc15'},
    ov:[...line(11,0,6,'W'),[10,7,'g'],[11,7,'g'],[11,8,'g'],...line(0,5,8,'S'),...line(1,5,8,'S'),[1,6,'Y'],[5,0,'A'],[6,0,'A']]},
  ladino:{nome:'Ladino',desc:'Mãos leves. +40% de ouro e mais golpes críticos.',hp:1,atk:1.1,def:.9,xp:1,gold:1.4,crit:.25,loot:1,reach:45,
    arma:'Adaga',armadura:'Manto Sombrio',
    head:["....CCCC....","...CCCCCC...","...CsesesC..","....CmmC...."],
    pal:{C:'#2d2a3e',m:'#0d0d12',B:'#3f3b52',b:'#6b4f2a',A:'#3b2f5c',L:'#2a2738',W:'#dfe3e8',g:'#6b4f2a'},
    ov:[[11,5,'W'],[11,6,'W'],[11,7,'g'],[0,5,'W'],[0,6,'W'],[0,7,'g']]},
  arqueiro:{nome:'Arqueiro',desc:'Olho de águia. Ataca de longe e acha +25% de tesouros.',hp:1,atk:1.1,def:1,xp:1,gold:1,crit:.15,loot:1.25,reach:90,
    arma:'Arco',armadura:'Gibão de Couro',
    head:["....GGGG.f..","...GGGGGGf..","..GGsesesG..","....ssss...."],
    pal:{G:'#2f7a3a',f:'#e2c044',B:'#4d7c3a',b:'#6b4423',A:'#6b4423',L:'#5b3a1e',W:'#8b5a2b',w:'#ece7df',a:'#d6d3d1'},
    ov:[[1,2,'W'],...line(0,3,8,'W'),[1,9,'W'],...line(1,3,8,'w'),[10,1,'a'],[10,2,'a'],[11,2,'a'],[10,3,'b']]},
  mago:{nome:'Mago',desc:'Sabedoria arcana. +25% de XP em tudo.',hp:.9,atk:1.15,def:.85,xp:1.25,gold:1,crit:.12,loot:1,reach:55,
    arma:'Cajado',armadura:'Túnica Arcana',
    head:[".....HH.....","....HHHH....","..HHHHHHHH..","...sesses..."],
    pal:{H:'#4338ca',B:'#4f46e5',b:'#facc15',A:'#312e81',L:'#312e81',W:'#7c4a1e',O:'#67e8f9',F:'#1e1b4b'},
    ov:[...line(11,2,12,'W'),[10,0,'O'],[11,0,'O'],[10,1,'O'],[11,1,'O'],[6,0,'b']]},
  barbaro:{nome:'Bárbaro',desc:'Fúria selvagem. +35% de ataque.',hp:1.15,atk:1.35,def:.9,xp:1,gold:1,crit:.12,loot:1,reach:45,
    arma:'Machado',armadura:'Peles de Fera',
    head:["...RRRRRR...","..RRRRRRRR..","..RsessesR..","...DDDDDD..."],
    pal:{R:'#b45309',D:'#92400e',B:'#e0a96d',b:'#7c5a3a',A:'#e0a96d',L:'#6b4423',W:'#cbd5e1',g:'#5b3a1e'},
    ov:[...line(11,1,9,'g'),[9,1,'W'],[10,1,'W'],[9,2,'W'],[10,2,'W'],[9,3,'W'],[10,3,'W'],[10,0,'W']]},
};

function spriteSVG(key){
  const c=CLASSES[key]||CLASSES.cavaleiro;const P={...PAL_BASE,...c.pal};
  const rect=(x,y,k)=>P[k]?`<rect x="${x}" y="${y}" width="1.04" height="1.04" fill="${P[k]}"/>`:'';
  const rows=(arr,y0)=>arr.map((r,i)=>[...r].map((ch,x)=>ch==='.'?'':rect(x,y0+i,ch)).join('')).join('');
  const top=rows(c.head,0)+rows(TORSO,4)+c.ov.map(o=>rect(o[0],o[1],o[2])).join('');
  return `<svg viewBox="0 0 12 14" xmlns="http://www.w3.org/2000/svg"><g class="fa">${rows(LEGS_A,10)}</g><g class="fb">${rows(LEGS_B,10)}</g>${top}</svg>`;
}

/* ── MONSTROS / ITENS / CONQUISTAS ───────────────────── */
// Monstros. r = regiões onde aparecem (sem r = qualquer lugar); night = só à noite;
// aq = aquático (mais comum na chuva); moon = mais comum na lua cheia; moonOnly = só na lua cheia; hot = mais comum no calor
/* BESTIÁRIO — ter: terrenos onde aparece (u urbano · c comércio · h centro histórico · i industrial · p praia · a lagoa/rio ·
   m mangue · v mata · r sertão · e estrada · * qualquer). rar: 1 comum · 2 incomum · 3 raro · 4 épico · 5 lendário.
   Condições: night (só à noite), moonOnly (só lua cheia), rain (só com chuva), hot (calor), deep (km mínimos na viagem).
   aq/moon/hot também aumentam a chance com chuva/lua/calor. tint: cor aplicada ao modelo 3D (variantes). */
const MONS=[
  // ── zona urbana
  {n:'Rato de Esgoto',e:'🐀',t:1,ter:'ui',rar:1},
  {n:'Slime do Esgoto',e:'🟢',t:1,ter:'u',rar:1,m3d:'q_slime'},
  {n:'Morcego Noturno',e:'🦇',t:1,ter:'uhv',rar:1,night:1,m3d:'q_bat'},
  {n:'Galinha Possuída',e:'🐔',t:1,ter:'ur',rar:2,m3d:'q_chicken',tint:'#c9a0ff'},
  {n:'Aranha Gigante',e:'🕷️',t:2,ter:'uv',rar:1},
  {n:'Lacaio Esquelético',e:'💀',t:2,ter:'uh',rar:2,m3d:'esq_lacaio'},
  {n:'Gato das Sombras',e:'🐈‍⬛',t:2,ter:'uh',rar:2,night:1,m3d:'a_cat',tint:'#4a3a6a'},
  {n:'Diabrete do Beco',e:'😈',t:3,ter:'ui',rar:2,night:1,m3d:'q_gdemon'},
  {n:'Caveira Flutuante',e:'💀',t:3,ter:'uh',rar:3,night:1,m3d:'q_skull'},
  {n:'Zumbi da Madrugada',e:'🧟',t:4,ter:'uh',rar:2,night:1,m3d:'ug_orc_skull',tint:'#a8d890'},
  {n:'Ogro da Ponte',e:'👹',t:5,ter:'uc',rar:3,m3d:'q_cyclops'},
  // ── comércio / shoppings
  {n:'Porco Ganancioso',e:'🐷',t:2,ter:'c',rar:1,m3d:'q_pig',tint:'#ffd76a'},
  {n:'Panda Glutão',e:'🐼',t:2,ter:'cv',rar:2,m3d:'q_panda'},
  {n:'Saqueador Esquelético',e:'💀',t:3,ter:'chp',rar:2,m3d:'esq_ladino'},
  {n:'Mímico de Vitrine',e:'🎁',t:3,ter:'c',rar:3},
  {n:'Ciclope Cobrador',e:'👁️',t:4,ter:'c',rar:4,m3d:'q_cyclops',tint:'#9fe0a8'},
  // ── centro histórico
  {n:'Esqueleto Errante',e:'💀',t:4,ter:'hu',rar:2,m3d:'esq_guerreiro'},
  {n:'Fantasma',e:'👻',t:4,ter:'h',rar:2,night:1,m3d:'q_ghost'},
  {n:'Necromante Esquelético',e:'💀',t:4,ter:'h',rar:3,night:1,m3d:'esq_mago'},
  {n:'Gárgula de Pedra',e:'🗿',t:4,ter:'h',rar:3,m3d:'uf_goleling',tint:'#9a9aa8'},
  {n:'Fantasma Dourado',e:'👻',t:5,ter:'h',rar:5,night:1,moonOnly:1,m3d:'q_ghost',tint:'#ffd76a'},
  // ── zona industrial / porto
  {n:'Rato Mutante',e:'🐀',t:2,ter:'i',rar:1},
  {n:'Slime Tóxico',e:'🟣',t:3,ter:'i',rar:2,m3d:'q_slime',tint:'#b06bff'},
  {n:'Golem de Sucata',e:'🤖',t:4,ter:'i',rar:2,m3d:'m_mike'},
  {n:'Alien Operário',e:'👽',t:3,ter:'ie',rar:3,m3d:'q_alien'},
  {n:'Ciclope Ferreiro',e:'🔨',t:5,ter:'i',rar:3,m3d:'q_cyclops',tint:'#8fa6c9'},
  {n:'Demônio da Fornalha',e:'🔥',t:5,ter:'i',rar:4,hot:1,m3d:'q_demon',tint:'#ff9a4a'},
  // ── praia e dunas
  {n:'Caranguejo da Beira-Mar',e:'🦀',t:1,ter:'p',rar:1,aq:1,m3d:'q_crab'},
  {n:'Gaivota Ladra',e:'🐦',t:1,ter:'p',rar:1,m3d:'uf_pigeon',tint:'#f4f4f4'},
  {n:'Slime de Areia',e:'🟡',t:1,ter:'p',rar:1,m3d:'q_slime',tint:'#e8c77a'},
  {n:'Pinguim Perdido',e:'🐧',t:2,ter:'p',rar:3,m3d:'q_penguin'},
  {n:'Polvo das Jangadas',e:'🐙',t:3,ter:'pa',rar:2,aq:1,m3d:'q_cthulhu'},
  {n:'Cacto das Dunas',e:'🌵',t:2,ter:'p',rar:2,hot:1,m3d:'q_cactus',tint:'#f0e0a0'},
  {n:'Troll das Dunas',e:'🧌',t:5,ter:'pr',rar:3,m3d:'q_yeti',tint:'#e8cf9a'},
  {n:'Tubarão de Areia',e:'🦈',t:5,ter:'p',rar:3,aq:1,m3d:'a_shark',tint:'#e8cf9a'},
  {n:'Caranguejo Rei',e:'👑',t:5,ter:'p',rar:5,moonOnly:1,m3d:'q_crab',tint:'#ffd76a'},
  // ── lagoa e rio
  {n:'Sapo Venenoso',e:'🐸',t:1,ter:'am',rar:1,aq:1,m3d:'ug_frog'},
  {n:'Peixe-Lâmina',e:'🐟',t:2,ter:'a',rar:1,aq:1,m3d:'a_piranha'},
  {n:'Serpente do Lago',e:'🐍',t:2,ter:'a',rar:2,aq:1},
  {n:'Fada do Lago',e:'🧚',t:3,ter:'a',rar:4,night:1,m3d:'uf_hywirl',tint:'#a0e8ff'},
  {n:'Jacaré do Mangue',e:'🐊',t:4,ter:'am',rar:3,aq:1,m3d:'ug_dino',tint:'#5f8a45'},
  {n:'Kraken da Lagoa',e:'🦑',t:5,ter:'a',rar:4,rain:1,aq:1,m3d:'q_cthulhu',tint:'#5fd0c8'},
  // ── mangue
  {n:'Caranguejo-Uçá Gigante',e:'🦀',t:2,ter:'m',rar:1,aq:1,m3d:'q_crab',tint:'#5a6fb0'},
  {n:'Serpente do Mangue',e:'🐍',t:2,ter:'m',rar:1,aq:1},
  {n:'Cogumelo do Mangue',e:'🍄',t:1,ter:'mv',rar:1,m3d:'q_mushroom',tint:'#b08a6a'},
  {n:'Garça Assombrada',e:'🦢',t:3,ter:'m',rar:2,night:1,m3d:'uf_pigeon',tint:'#d8d0ff'},
  {n:'Guardião do Mangue',e:'🌳',t:5,ter:'m',rar:4,m3d:'q_tree',tint:'#4f8a4f'},
  // ── mata e parques
  {n:'Cogumelo Saltitante',e:'🍄',t:1,ter:'v',rar:1,m3d:'q_mushroom'},
  {n:'Abelha Assassina',e:'🐝',t:2,ter:'vr',rar:1,m3d:'q_bee'},
  {n:'Javali Furioso',e:'🐗',t:3,ter:'vr',rar:1,m3d:'q_pig'},
  {n:'Lobo Cinzento',e:'🐺',t:3,ter:'vr',rar:2,moon:1,m3d:'a_wolf'},
  {n:'Cervo Espectral',e:'🦌',t:4,ter:'v',rar:4,night:1,m3d:'q_deer',tint:'#bfe8ff'},
  {n:'Ent Jovem',e:'🌳',t:5,ter:'v',rar:3,m3d:'q_tree'},
  {n:'Abelha Rainha',e:'🐝',t:5,ter:'v',rar:5,hot:1,m3d:'q_bee',tint:'#ff7a5a'},
  // ── sertão / rural
  {n:'Calango Ligeiro',e:'🦎',t:1,ter:'r',rar:1,hot:1,m3d:'ug_dino',tint:'#d0a868'},
  {n:'Cacto Vivo',e:'🌵',t:2,ter:'r',rar:1,m3d:'q_cactus'},
  {n:'Cervo do Sertão',e:'🦌',t:2,ter:'r',rar:2,m3d:'q_deer'},
  {n:'Escorpião do Sertão',e:'🦂',t:3,ter:'r',rar:2,hot:1},
  {n:'Bode Demoníaco',e:'🐐',t:3,ter:'r',rar:3,night:1},
  {n:'Lagarto de Fogo',e:'🦎',t:4,ter:'r',rar:3,hot:1,m3d:'q_ydragon'},
  // ── estrada (fora da cidade)
  {n:'Grifo da Rodovia',e:'🦅',t:4,ter:'e',rar:2,m3d:'a_eagle'},
  {n:'Alien Viajante',e:'👽',t:4,ter:'e',rar:3,night:1,m3d:'q_alientall'},
  {n:'Yeti Errante',e:'❄️',t:5,ter:'e',rar:3,deep:40,m3d:'q_yeti'},
  {n:'Cavaleiro Sem Cabeça',e:'🏇',t:5,ter:'e',rar:4,night:1,deep:60,m3d:'a_horse',tint:'#3a3a55'},
  {n:'Ciclope Primordial',e:'👁️',t:5,ter:'er',rar:5,deep:100,m3d:'q_cyclops',tint:'#ff6a6a'},
  {n:'Dragão Dourado',e:'🐲',t:5,ter:'e',rar:5,deep:150,m3d:'q_ydragon',tint:'#ffd76a'},
  // ── bichos e máquinas
  {n:'Cachorro Caramelo Valente',e:'🐕',t:1,ter:'u',rar:1,m3d:'a_dog'},
  {n:'Cão de Guarda Infernal',e:'🐕',t:3,ter:'i',rar:3,night:1,m3d:'a_dog',tint:'#ff7a5a'},
  {n:'Robô Vigia',e:'🤖',t:3,ter:'c',rar:3,m3d:'m_leela'},
  {n:'Mecha do Porto',e:'🦾',t:5,ter:'i',rar:4,m3d:'m_george'},
  {n:'Autômato Errante',e:'🤖',t:4,ter:'e',rar:3,m3d:'m_stan'},
  {n:'Arraia Elétrica',e:'⚡',t:3,ter:'pa',rar:3,aq:1,m3d:'a_manta',tint:'#7fdfff'},
  {n:'Boto Encantado',e:'🐬',t:4,ter:'a',rar:4,night:1,m3d:'a_dolphin',tint:'#f2a1b5'},
  {n:'Vaca Zumbi',e:'🐄',t:2,ter:'r',rar:2,night:1,m3d:'a_cow',tint:'#9fd08a'},
  {n:'Ovelha Negra',e:'🐑',t:2,ter:'r',rar:2,m3d:'a_sheep',tint:'#3a3a44'},
  // ── Ultimate Monsters (Quaternius) e animais
  {n:'Pombo Fofoqueiro',e:'🐦',t:1,ter:'uh',rar:1,m3d:'uf_pigeon'},
  {n:'Bolha Rosa',e:'🫧',t:1,ter:'u',rar:1,m3d:'ub_pinkblob'},
  {n:'Cão Bolota',e:'🐶',t:1,ter:'u',rar:1,m3d:'ub_dog'},
  {n:'Gato Bolota',e:'🐱',t:1,ter:'uc',rar:1,m3d:'ub_cat'},
  {n:'Passarinho Raivoso',e:'🐤',t:1,ter:'uv',rar:1,m3d:'ub_birb'},
  {n:'Coelho Maluco',e:'🐰',t:2,ter:'uv',rar:2,m3d:'ug_bunny'},
  {n:'Ninja Bolota',e:'🥷',t:2,ter:'uh',rar:2,night:1,m3d:'ub_ninja'},
  {n:'Ninja do Telhado',e:'🥷',t:4,ter:'uc',rar:3,night:1,m3d:'ug_ninja'},
  {n:'Mago Ambulante',e:'🧙',t:3,ter:'ch',rar:3,m3d:'ub_wizard'},
  {n:'Rei Alpaca',e:'🦙',t:4,ter:'c',rar:4,m3d:'uf_alpaking'},
  {n:'Imperador Alpaca',e:'👑',t:5,ter:'c',rar:5,deep:30,m3d:'uf_alpaking_evolved'},
  {n:'Fantasma Caveira',e:'💀',t:4,ter:'h',rar:3,night:1,m3d:'uf_ghost_skull'},
  {n:'Morcego-Fantasma',e:'👻',t:3,ter:'hu',rar:2,night:1,m3d:'uf_ghost'},
  {n:'Orc Caveira',e:'💀',t:5,ter:'h',rar:4,night:1,m3d:'ug_orc_skull'},
  {n:'Orc Bolota',e:'👺',t:1,ter:'i',rar:1,m3d:'ub_orc'},
  {n:'Orc da Fábrica',e:'👺',t:3,ter:'i',rar:2,m3d:'ug_orc'},
  {n:'Demônio Azul',e:'👿',t:4,ter:'i',rar:3,night:1,m3d:'ug_bluedemon'},
  {n:'Demônio Rubro',e:'👿',t:5,ter:'ie',rar:4,night:1,hot:1,m3d:'ug_demon'},
  {n:'Goleling',e:'🪨',t:2,ter:'i',rar:2,m3d:'uf_goleling'},
  {n:'Goleling Coroado',e:'👑',t:5,ter:'i',rar:4,m3d:'uf_goleling_evolved'},
  {n:'Peixe Bolota',e:'🐡',t:1,ter:'pa',rar:1,aq:1,m3d:'ub_fish'},
  {n:'Homem-Peixe',e:'🐟',t:3,ter:'p',rar:2,aq:1,m3d:'ug_fish'},
  {n:'Pássaro-Lagarto',e:'🦎',t:2,ter:'p',rar:2,m3d:'ug_birb'},
  {n:'Squidle',e:'🦑',t:3,ter:'pa',rar:3,aq:1,m3d:'uf_squidle'},
  {n:'Glub',e:'🫧',t:2,ter:'a',rar:2,aq:1,m3d:'uf_glub'},
  {n:'Glub Ancião',e:'🫧',t:4,ter:'a',rar:4,aq:1,m3d:'uf_glub_evolved'},
  {n:'Sapo-Boi',e:'🐸',t:3,ter:'am',rar:2,aq:1,m3d:'ug_frog',tint:'#7fbf5a'},
  {n:'Bolha Verde',e:'🟢',t:1,ter:'m',rar:1,m3d:'ub_greenblob'},
  {n:'Ouriço do Mangue',e:'🦔',t:2,ter:'m',rar:2,m3d:'ub_greenspikyblob'},
  {n:'Macaco do Mangue',e:'🐒',t:3,ter:'mv',rar:2,m3d:'ug_monkroose'},
  {n:'Cogumelo Bolota',e:'🍄',t:1,ter:'v',rar:1,m3d:'ub_mushnub'},
  {n:'Cogumelo Coroado',e:'🍄',t:3,ter:'v',rar:3,m3d:'ub_mushnub_evolved'},
  {n:'Rei Cogumelo',e:'👑',t:5,ter:'v',rar:5,rain:1,m3d:'ug_mushroomking'},
  {n:'Abelhão',e:'🐝',t:2,ter:'vr',rar:2,m3d:'uf_armabee'},
  {n:'Abelhão Blindado',e:'🐝',t:4,ter:'v',rar:4,hot:1,m3d:'uf_armabee_evolved'},
  {n:'Raposa Ladina',e:'🦊',t:2,ter:'vr',rar:2,night:1,m3d:'an_fox'},
  {n:'Cervo Real',e:'🦌',t:4,ter:'v',rar:3,m3d:'an_stag'},
  {n:'Lobo Alfa',e:'🐺',t:5,ter:'vr',rar:4,moon:1,m3d:'an_wolf'},
  {n:'Guerreiro Tribal',e:'🗿',t:3,ter:'v',rar:3,m3d:'ug_tribal'},
  {n:'Espírito Tribal',e:'🗿',t:4,ter:'v',rar:4,night:1,m3d:'uf_tribal'},
  {n:'Cacto Bolota',e:'🌵',t:1,ter:'r',rar:1,m3d:'ub_cactoro'},
  {n:'Cactoro Bandido',e:'🌵',t:3,ter:'r',rar:2,hot:1,m3d:'ug_cactoro'},
  {n:'Touro Bravo',e:'🐂',t:3,ter:'r',rar:2,m3d:'an_bull'},
  {n:'Jumento Teimoso',e:'🫏',t:1,ter:'r',rar:1,m3d:'an_donkey'},
  {n:'Alpaca Cuspideira',e:'🦙',t:2,ter:'r',rar:2,m3d:'an_alpaca'},
  {n:'Cavalo Branco Fantasma',e:'🐴',t:4,ter:'e',rar:4,night:1,m3d:'an_horse_white'},
  {n:'Husky Errante',e:'🐺',t:2,ter:'e',rar:2,m3d:'an_husky'},
  {n:'Shiba Viajante',e:'🐕',t:2,ter:'e',rar:2,m3d:'an_shibainu'},
  {n:'Dragão Voador',e:'🐉',t:4,ter:'e',rar:3,m3d:'uf_dragon'},
  {n:'Dragão Alado Supremo',e:'🐉',t:5,ter:'e',rar:4,deep:60,m3d:'uf_dragon_evolved'},
  {n:'Demônio Alado',e:'😈',t:4,ter:'eh',rar:3,night:1,m3d:'uf_demon'},
  {n:'Dino Primordial',e:'🦖',t:5,ter:'er',rar:5,deep:120,m3d:'ug_dino',tint:'#ff8a4a'},
  {n:'Alien Bolota',e:'👽',t:2,ter:'*',rar:3,night:1,m3d:'ub_alien'},
  {n:'Alien Grandalhão',e:'👽',t:4,ter:'ei',rar:3,night:1,m3d:'ug_alien'},
  {n:'Yeti Bolota',e:'❄️',t:2,ter:'e',rar:2,m3d:'ub_yeti'},
  {n:'Espírito do Vento',e:'🌪️',t:4,ter:'*',rar:4,rain:1,m3d:'uf_hywirl'},
  // ── em qualquer lugar (condições especiais)
  {n:'Lobisomem',e:'🐺',t:5,ter:'*',rar:3,moonOnly:1,m3d:'a_wolf',tint:'#6a4a30'},
  {n:'Diabrete do Farol',e:'😈',t:5,ter:'ph',rar:4,night:1,m3d:'q_demon'},
  {n:'Espírito da Chuva',e:'🌧️',t:3,ter:'*',rar:4,rain:1,m3d:'q_ghost',tint:'#7fb2ff'},
  {n:'Dragão Ancião',e:'🐉',t:6,ter:'*',rar:5,m3d:'q_dragon'},
  // ── evento de Natal (1º/dez a 6/jan)
  {n:'Duende Travesso',e:'🧝',t:1,ter:'*',rar:1,ev:'natal',m3d:'q_alien',tint:'#7fe08a'},
  {n:'Boneco de Neve Raivoso',e:'⛄',t:2,ter:'*',rar:2,ev:'natal',m3d:'q_yeti',tint:'#f4f8ff'},
  {n:'Rena Sombria',e:'🦌',t:3,ter:'vre',rar:3,ev:'natal',night:1,m3d:'q_deer',tint:'#ff6a6a'},
  {n:'Krampus',e:'👹',t:5,ter:'*',rar:5,ev:'natal',night:1,m3d:'q_demon',tint:'#5a1a2a'},
];
// eventos sazonais (datas fixas do ano)
const EVENTS={natal:{n:'Natal',ic:'🎄',on:(d=new Date())=>(d.getMonth()===11)||(d.getMonth()===0&&d.getDate()<=6),xp:.10}};
const eventOn=k=>!!EVENTS[k]?.on();
const RARW=[0,60,25,9,3,.7];
const RARN=['','Comum','Incomum','Raro','Épico','Lendário'];
const RARC=['','#c8c3e0','#7fd18f','#6fa8ff','#c98bff','#ffc94a'];
const monKey=m=>m.m3d?m.m3d+(m.tint?'_'+m.tint.slice(1):''):null;
const RAR=[{n:'Comum',m:1,w:60},{n:'Incomum',m:1.3,w:25},{n:'Raro',m:1.7,w:10},{n:'Épico',m:2.3,w:4},{n:'Lendário',m:3.2,w:1}];
const SUF=['do Sertão','da Beira-Mar','de Iracema','do Mucuripe','da Jangada','das Dunas','do Cangaço','da Lua Cheia','do Farol','do Dragão','dos Ventos','da Serra'];
const SLOT={weapon:'🗡️ Arma',armor:'🛡️ Armadura',amulet:'📿 Amuleto'};
const DQ=[
  {id:'km',t:'Percorra 10 km',goal:10,xp:150,gold:40,u:'km'},
  {id:'kills',t:'Derrote 15 monstros',goal:15,xp:120,gold:50,u:''},
  {id:'trips',t:'Conclua 2 jornadas',goal:2,xp:100,gold:30,u:''},
];
const ACH=[
  {id:'trip1',n:'Primeiro Passo',d:'Conclua sua primeira jornada',f:()=>S.stats.trips>=1},
  {id:'km10',n:'Andarilho',d:'Percorra 10 km',f:()=>S.stats.km>=10},
  {id:'km100',n:'Viajante',d:'Percorra 100 km',f:()=>S.stats.km>=100},
  {id:'km1000',n:'Lenda das Estradas',d:'Percorra 1.000 km',f:()=>S.stats.km>=1000},
  {id:'k10',n:'Caçador',d:'Derrote 10 monstros',f:()=>S.stats.kills>=10},
  {id:'k100',n:'Exterminador',d:'Derrote 100 monstros',f:()=>S.stats.kills>=100},
  {id:'k1000',n:'Flagelo dos Monstros',d:'Derrote 1.000 monstros',f:()=>S.stats.kills>=1000},
  {id:'drag',n:'Matador de Dragões',d:'Derrote um Dragão Ancião',f:()=>S.stats.dragons>=1},
  {id:'l10',n:'Veterano',d:'Alcance o nível 10',f:()=>S.lvl>=10},
  {id:'l25',n:'Herói do Ceará',d:'Alcance o nível 25',f:()=>S.lvl>=25},
  {id:'leg',n:'Relíquia Lendária',d:'Encontre um item lendário',f:()=>S.stats.legend>=1},
  {id:'night',n:'Cavaleiro da Noite',d:'Conclua uma jornada à noite',f:()=>S.stats.nightTrips>=1},
  {id:'rich',n:'Barão do Ouro',d:'Junte 5.000 de ouro no total',f:()=>S.stats.gold>=5000},
  {id:'pet',n:'Melhor Amigo',d:'Choque o ovo do seu companheiro',f:()=>!!S.pet?.type},
  {id:'dun',n:'Explorador de Masmorras',d:'Conclua uma masmorra',f:()=>(S.stats.dungeons||0)>=1},
  {id:'reg',n:'Andarilho de Fortaleza',d:'Visite 5 tipos de terreno',f:()=>(S.regions||[]).length>=5},
  {id:'pergaminho',n:'Invocador',d:'Derrote um chefe de pergaminho',f:()=>(S.stats.scrollWins||0)>=1},
  {id:'compa',n:'Companheiro de Estrada',d:'Faça um amigo no Ranvus',f:()=>Object.values(SOC?.friends||{}).includes('ok')},
  {id:'guilda',n:'Irmandade',d:'Entre ou crie uma guilda',f:()=>!!SOC?.gid},
  {id:'best25',n:'Caçador de Lendas',d:'Registre 25 monstros no bestiário',f:()=>Object.keys(S.best||{}).length>=25},
  {id:'bestlend',n:'Mito Vivo',d:'Derrote um monstro lendário',f:()=>MONS.some(m=>m.rar===5&&S.best?.[m.n])},
  {id:'set',n:'Conjunto Completo',d:'Equipe as 3 peças de um conjunto',f:()=>!!activeSet()},
  {id:'chuva',n:'Caçador da Chuva',d:'Derrote um monstro aquático na chuva',f:()=>(S.stats.aqKills||0)>=1},
  {id:'tal',n:'Mestre dos Talentos',d:'Distribua 10 pontos de talento',f:()=>talentSpent()>=10},
  {id:'reinos5',n:'Explorador de Reinos',d:'Descubra 5 bairros',f:()=>(S.realms||[]).length>=5},
  {id:'reinos30',n:'Cartógrafo do Reino',d:'Descubra 30 bairros',f:()=>(S.realms||[]).length>=30},
  {id:'honra',n:'Cavaleiro Honrado',d:'Junte 20 pontos de honra respeitando os limites',f:()=>(S.honor||0)>=20},
  {id:'ancestral',n:'Além das Fronteiras',d:'Derrote um monstro ancestral (viagem de 60+ km)',f:()=>(S.stats.anc||0)>=1},
];
