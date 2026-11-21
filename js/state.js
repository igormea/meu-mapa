'use strict';
/* ── SAVE ────────────────────────────────────────────── */
const SAVE_KEY='meumapa_rpg_v1';
const defSave=()=>({name:'Aventureiro',cls:null,lvl:1,xp:0,hp:null,gold:0,title:'',theme:'castelo',mute:false,
  equip:{weapon:null,armor:null,amulet:null},smith:{w:0,a:0},
  stats:{km:0,kills:0,trips:0,dragons:0,gold:0,items:0,legend:0,nightTrips:0},
  daily:{date:'',km:0,kills:0,trips:0,claimed:[]},ach:[],loot:[],recents:[]});
function load(){
  const d=defSave();
  try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s){const o=Object.assign(d,s);
    o.stats=Object.assign(defSave().stats,s.stats);o.smith=Object.assign({w:0,a:0},s.smith);
    o.equip=Object.assign(defSave().equip,s.equip);return o}}catch{}
  return d;
}
let S=load(), simSnap=null;
function save(){if(simSnap)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(S))}catch{}}

/* ── ATRIBUTOS ───────────────────────────────────────── */
const cls=()=>CLASSES[S.cls]||CLASSES.cavaleiro;
const maxHP=()=>Math.round(((50+S.lvl*12)*cls().hp+S.smith.a*3)*(1+bonus('hp')));
const atk=()=>Math.round(((6+S.lvl*2.2)*cls().atk+(S.equip.weapon?.pow||0)+S.smith.w*2)*(1+bonus('atk')));
const def=()=>Math.round(((3+S.lvl*1.4)*cls().def+(S.equip.armor?.pow||0)+S.smith.a*2)*(1+bonus('def')));
const amu=()=>S.equip.amulet?.pow||0;
const needXP=l=>Math.round(100*Math.pow(l,1.5));
function isNight(){const h=new Date().getHours();return h>=18||h<6}
