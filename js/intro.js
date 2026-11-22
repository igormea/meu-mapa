'use strict';
/* ═════ ABERTURA ═════
   As 5 classes saem dos cantos correndo por trilhas douradas (como rotas num mapa) e se encontram no meio;
   cai o pino com "Ranvus Maps" e tudo some. ~2,6 s; um toque pula. Uma vez por abertura do app. */
(function(){
  const el=document.getElementById('intro');if(!el)return;
  let seen=false;try{seen=sessionStorage.getItem('ranvus_intro')==='1'}catch{}
  if(window.__noIntro||seen){el.remove();return}
  try{sessionStorage.setItem('ranvus_intro','1')}catch{}
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W=innerWidth,H=innerHeight,cx=W/2,cy=H*0.46,R=Math.min(W,H)*0.055;
  // largura de cada quadro (sprite 8 quadros, altura 160)
  const C=[['cavaleiro',114],['mago',133],['arqueiro',98],['barbaro',114],['ladino',136]];
  // partida (cantos e base) → chegada (em roda no centro); trilhas em "L" como ruas
  const start=[[-60,H*.12],[W+60,H*.2],[-60,H*.82],[W+60,H*.78],[W*.5,H+80]];
  const end=[[cx-R*2.2,cy+R*.3],[cx+R*2.2,cy+R*.3],[cx-R*1.2,cy+R*1.6],[cx+R*1.2,cy+R*1.6],[cx,cy+R*2.4]];
  const street=(a,b,i)=>{   // rota com uma ou duas curvas de 90° arredondadas
    const mx=i%2?b[0]:a[0],my=i%2?a[1]:b[1];
    const k=18,sx=Math.sign(b[0]-a[0])||1,sy=Math.sign(b[1]-a[1])||1;
    if(i===4)return`M${a[0]},${a[1]} L${a[0]},${b[1]+40} Q${a[0]},${b[1]} ${b[0]},${b[1]}`;
    return i%2?`M${a[0]},${a[1]} L${mx-sx*k},${a[1]} Q${mx},${a[1]} ${mx},${a[1]+sy*k} L${b[0]},${b[1]}`
              :`M${a[0]},${a[1]} L${a[0]+0},${my-sy*k} Q${a[0]},${my} ${a[0]+sx*k},${my} L${b[0]},${b[1]}`;
  };
  const svg=el.querySelector('svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const T=reduce?600:1500,hH=Math.round(Math.min(78,H*.095));
  C.forEach(([cls,fw],i)=>{
    const d=street(start[i],end[i],i);
    const NS='http://www.w3.org/2000/svg',mk=(t,at)=>{const e=document.createElementNS(NS,t);for(const k in at)e.setAttribute(k,at[k]);return e};
    // trilha pontilhada dourada, revelada aos poucos por uma máscara que "anda" junto com o herói
    const msk=mk('mask',{id:'im'+i,maskUnits:'userSpaceOnUse',x:0,y:0,width:W,height:H}),mp=mk('path',{d,class:'in-mask'});
    msk.appendChild(mp);svg.appendChild(msk);
    const route=mk('path',{d,class:'in-route',mask:`url(#im${i})`});svg.appendChild(route);
    const L=mp.getTotalLength();mp.style.strokeDasharray=`${L} ${L}`;
    mp.animate([{strokeDashoffset:L},{strokeDashoffset:0}],{duration:T,easing:'cubic-bezier(.3,.1,.3,1)',fill:'forwards',delay:i*40});
    const h=document.createElement('div');h.className='in-hero';
    const s=hH/160;h.style.cssText=`width:${fw*s}px;height:${hH}px;background-image:url(models/run/${cls}.webp);background-size:${fw*8*s}px ${hH}px;offset-path:path('${d}');--fw:${-fw*8*s}px`;
    if(end[i][0]<start[i][0])h.classList.add('flip');
    el.appendChild(h);
    h.animate([{offsetDistance:'0%'},{offsetDistance:'100%'}],{duration:T,easing:'cubic-bezier(.3,.1,.3,1)',fill:'forwards',delay:i*40}).onfinish=()=>{h.classList.add('arrived')};
  });
  // pino + nome
  const ttl=el.querySelector('.in-title');if(ttl)ttl.style.top=(cy+R*2.4+hH*.35+18)+'px';
  const pin=el.querySelector('.in-pin');if(pin)pin.style.top=(cy-hH*.55)+'px';
  setTimeout(()=>el.classList.add('pin'),T-150);
  const close=()=>{if(el.classList.contains('out'))return;el.classList.add('out');setTimeout(()=>el.remove(),380)};
  setTimeout(close,T+1050);
  el.addEventListener('pointerdown',close);
})();
