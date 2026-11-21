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
const MONS=[
  {n:'Rato de Esgoto',e:'🐀',t:1,r:['cidade','centro']},
  {n:'Morcego Noturno',e:'🦇',t:1,night:1},
  {n:'Caranguejo da Beira-Mar',e:'🦀',t:1,r:['costa'],aq:1},
  {n:'Gaivota Ladra',e:'🐦',t:1,r:['costa']},
  {n:'Sapo Venenoso',e:'🐸',t:1,r:['mata'],aq:1},
  {n:'Calango Ligeiro',e:'🦎',t:1,r:['sertao'],hot:1},
  {n:'Cacto Vivo',e:'🌵',t:2,r:['sertao','mata']},
  {n:'Serpente do Mangue',e:'🐍',t:2,r:['mata','costa'],aq:1},
  {n:'Aranha Gigante',e:'🕷️',t:2,r:['mata','centro','cidade']},
  {n:'Polvo das Jangadas',e:'🐙',t:3,r:['costa'],aq:1},
  {n:'Lobo Cinzento',e:'🐺',t:3,r:['cidade','mata','sertao'],moon:1},
  {n:'Escorpião do Sertão',e:'🦂',t:3,r:['sertao','cidade'],hot:1},
  {n:'Javali Furioso',e:'🐗',t:3,r:['mata','sertao']},
  {n:'Jacaré do Mangue',e:'🐊',t:4,r:['mata','costa'],aq:1},
  {n:'Esqueleto Errante',e:'💀',t:4,r:['centro','cidade']},
  {n:'Zumbi da Madrugada',e:'🧟',t:4,night:1,r:['centro','cidade']},
  {n:'Fantasma',e:'👻',t:4,night:1,r:['centro']},
  {n:'Lagarto de Fogo',e:'🦎',t:4,r:['sertao'],hot:1},
  {n:'Tubarão de Areia',e:'🦈',t:5,r:['costa'],aq:1},
  {n:'Ogro da Ponte',e:'👹',t:5,r:['cidade','centro']},
  {n:'Troll das Dunas',e:'🧌',t:5,r:['costa','sertao']},
  {n:'Ent Jovem',e:'🌳',t:5,r:['mata']},
  {n:'Lobisomem',e:'🐺',t:5,moonOnly:1},
  {n:'Dragão Ancião',e:'🐉',t:6},
];
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
  {id:'reg',n:'Andarilho de Fortaleza',d:'Visite as 5 regiões',f:()=>(S.regions||[]).length>=5},
  {id:'set',n:'Conjunto Completo',d:'Equipe as 3 peças de um conjunto',f:()=>!!activeSet()},
  {id:'chuva',n:'Caçador da Chuva',d:'Derrote um monstro aquático na chuva',f:()=>(S.stats.aqKills||0)>=1},
  {id:'tal',n:'Mestre dos Talentos',d:'Distribua 10 pontos de talento',f:()=>talentSpent()>=10},
];
