'use strict';
/* ═════ ABERTURA ═════
   As 5 classes saem dos cantos correndo por trilhas douradas (como rotas num mapa) e se encontram no meio;
   cai o pino com "Ranvus Maps" e tudo some. ~2,6 s; um toque pula. Uma vez por abertura do app.
   Fluidez: só anima "transform" e "opacity" (a placa de vídeo cuida disso), então não trava
   enquanto o app carrega o mapa e o 3D por trás. O caminho é amostrado em pontos e vira deslocamentos. */
(function(){
  const el=document.getElementById('intro');if(!el)return;
  let seen=false;try{seen=sessionStorage.getItem('ranvus_intro')==='1'}catch{}
  if(window.__noIntro||seen){el.remove();return}
  try{sessionStorage.setItem('ranvus_intro','1')}catch{}
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W=innerWidth,H=innerHeight,cx=W/2,cy=H*0.46,R=Math.min(W,H)*0.055;
  // largura de cada quadro (sprite 8 quadros, altura 160)
  const C=[['cavaleiro',114],['mago',133],['arqueiro',98],['barbaro',114],['ladino',136]];
  const start=[[-60,H*.12],[W+60,H*.2],[-60,H*.82],[W+60,H*.78],[W*.5,H+80]];
  const end=[[cx-R*2.2,cy+R*.3],[cx+R*2.2,cy+R*.3],[cx-R*1.2,cy+R*1.6],[cx+R*1.2,cy+R*1.6],[cx,cy+R*2.4]];
  const street=(a,b,i)=>{   // rota com uma curva de 90° arredondada, como uma rua
    const mx=i%2?b[0]:a[0],my=i%2?a[1]:b[1],k=18,sx=Math.sign(b[0]-a[0])||1,sy=Math.sign(b[1]-a[1])||1;
    if(i===4)return`M${a[0]},${a[1]} L${a[0]},${b[1]+40} Q${a[0]},${b[1]} ${b[0]},${b[1]}`;
    return i%2?`M${a[0]},${a[1]} L${mx-sx*k},${a[1]} Q${mx},${a[1]} ${mx},${a[1]+sy*k} L${b[0]},${b[1]}`
              :`M${a[0]},${a[1]} L${a[0]},${my-sy*k} Q${a[0]},${my} ${a[0]+sx*k},${my} L${b[0]},${b[1]}`;
  };
  const NS='http://www.w3.org/2000/svg',svg=el.querySelector('svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const T=reduce?600:1500,hH=Math.round(Math.min(78,H*.095)),ease='cubic-bezier(.3,.1,.3,1)';
  C.forEach(([cls,fw],i)=>{
    const d=street(start[i],end[i],i);
    const p=document.createElementNS(NS,'path');p.setAttribute('d',d);p.setAttribute('class','in-route');svg.appendChild(p);
    p.animate([{opacity:0},{opacity:1}],{duration:350,delay:i*40,fill:'both'});
    // pontos do caminho → deslocamentos (só transform: roda na placa de vídeo)
    const L=p.getTotalLength(),N=28,s=hH/160,w=fw*s,kf=[];
    for(let j=0;j<=N;j++){const q=p.getPointAtLength(L*j/N);kf.push({transform:`translate(${(q.x-w/2).toFixed(1)}px,${(q.y-hH*.92).toFixed(1)}px)`})}
    // herói = moldura (anda pelo caminho) + tira de 8 quadros (corre, deslizando dentro da moldura)
    const flip=end[i][0]<start[i][0];
    const h=document.createElement('div');h.className='in-hero';h.style.cssText=`width:${w}px;height:${hH}px;transform:${kf[0].transform}`;
    const inner=document.createElement('div');inner.className='in-flip';if(flip)inner.style.transform='scaleX(-1)';
    const strip=document.createElement('div');strip.className='in-strip';
    strip.style.cssText=`width:${w*8}px;height:${hH}px;background-image:url(models/run/${cls}.webp);background-size:${w*8}px ${hH}px`;
    inner.appendChild(strip);h.appendChild(inner);el.appendChild(h);
    const run=strip.animate([{transform:'translateX(0)'},{transform:`translateX(${-w*8}px)`}],{duration:420,iterations:Infinity,easing:'steps(8)'});
    h.animate(kf,{duration:T,easing:ease,fill:'forwards',delay:i*40}).onfinish=()=>{
      run.cancel();h.classList.add('arrived');
      const t0=kf[N].transform;
      h.animate([{transform:t0},{transform:t0+' translateY(-14px)'},{transform:t0}],{duration:450,easing:'ease-out',fill:'forwards',delay:120});
    };
  });
  // pino + nome
  const ttl=el.querySelector('.in-title');if(ttl)ttl.style.top=(cy+R*2.4+hH*.35+18)+'px';
  const pin=el.querySelector('.in-pin');if(pin)pin.style.top=(cy-hH*.55)+'px';
  setTimeout(()=>{
    pin?.animate([{opacity:0,transform:'translate(-50%,-150%) scale(.4)'},{opacity:1,transform:'translate(-50%,-100%) scale(1)'}],{duration:550,easing:'cubic-bezier(.2,1.6,.4,1)',fill:'forwards'});
    ttl?.animate([{opacity:0,transform:'translate(-50%,10px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:400,delay:150,easing:'ease-out',fill:'forwards'});
    el.classList.add('pin');
  },T-150);
  const close=()=>{if(el.classList.contains('out'))return;el.classList.add('out');
    el.animate([{opacity:1},{opacity:0}],{duration:350,fill:'forwards'}).onfinish=()=>el.remove()};
  setTimeout(close,T+1050);
  el.addEventListener('pointerdown',close);
})();
