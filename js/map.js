'use strict';
/* ── MAPA ────────────────────────────────────────────── */
// Estilo próprio: mapa do OpenStreetMap (o visual "temático") + prédios 3D + véu de pergaminho
const STYLE={version:8,
  sources:{
    osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,
      attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'},
    omt:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'<a href="https://openfreemap.org">OpenFreeMap</a>'},
    tint:{type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[-180,-85],[180,-85],[180,85],[-180,85],[-180,-85]]]}}},
  },
  layers:[
    {id:'bg',type:'background',paint:{'background-color':'#d9c8a0'}},
    {id:'osm',type:'raster',source:'osm'},
    {id:'tint',type:'fill',source:'tint',paint:{'fill-color':'#a8782a','fill-opacity':.2}},
    {id:'b3d',type:'fill-extrusion',source:'omt','source-layer':'building',minzoom:15,paint:{
      'fill-extrusion-color':'#d8bf8c','fill-extrusion-opacity':.85,
      'fill-extrusion-height':['coalesce',['get','render_height'],8],
      'fill-extrusion-base':['coalesce',['get','render_min_height'],0]}},
  ]};
// route: [principal, brilho, borda, tracejado]
const THEMES={
  castelo:{osm:{'raster-saturation':-.35,'raster-contrast':.2,'raster-brightness-min':.88,'raster-brightness-max':.04,'raster-hue-rotate':205},
       tint:['#2a0f55',.32],bg:'#0a0716',b3d:'#2d2552',route:['#e0284a','#ff2d55','#2a0610','#ffd9a0']},
  dia:{osm:{'raster-saturation':.15,'raster-contrast':.05,'raster-brightness-min':0,'raster-brightness-max':1,'raster-hue-rotate':-10},
       tint:['#a8782a',.2],bg:'#d9c8a0',b3d:'#d8bf8c',route:['#ffd54f','#ffcc33','#4a2c08','#fff6d0']},
  noite:{osm:{'raster-saturation':.1,'raster-contrast':.15,'raster-brightness-min':.9,'raster-brightness-max':.08,'raster-hue-rotate':180},
       tint:['#4a3418',.25],bg:'#1b1a22',b3d:'#4a4058',route:['#ffd54f','#ffcc33','#4a2c08','#fff6d0']},
};
function themeKey(){const m=S.theme||'castelo';return m==='auto'?'castelo':THEMES[m]?m:'castelo'}
function paintTheme(){
  if(!map.getLayer('osm'))return;const t=THEMES[themeKey()];
  for(const k in t.osm)map.setPaintProperty('osm',k,t.osm[k]);
  map.setPaintProperty('tint','fill-color',t.tint[0]);map.setPaintProperty('tint','fill-opacity',t.tint[1]);
  map.setPaintProperty('bg','background-color',t.bg);map.setPaintProperty('b3d','fill-extrusion-color',t.b3d);
  map.setLayoutProperty('b3d','visibility',S.b3d===false?'none':'visible');
  if(map.getLayer('route-main')){const r=t.route;
    map.setPaintProperty('route-main','line-color',r[0]);map.setPaintProperty('route-glow','line-color',r[1]);
    map.setPaintProperty('route-case','line-color',r[2]);map.setPaintProperty('route-dash','line-color',r[3])}
}
if(typeof maplibregl==='undefined')window.__showErr('A biblioteca do mapa (MapLibre) não carregou. Verifique a internet.');
else if(!(()=>{try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'))}catch{return false}})())window.__showErr('Este aparelho/app não liberou WebGL (gráficos 3D) para o mapa.');
const map=new maplibregl.Map({container:'map',style:STYLE,
  center:[-38.5267,-3.7319],zoom:13,pitch:0,maxPitch:70,attributionControl:{compact:true}});
const EMPTY={type:'FeatureCollection',features:[]};
const lineF=(coords,props={})=>({type:'Feature',properties:props,geometry:{type:'LineString',coordinates:coords.map(c=>[c[1],c[0]])}});
const mapReady=new Promise(res=>map.on('load',()=>{
  const sym=map.getStyle().layers.find(l=>l.type==='symbol')?.id;
  const lay={'line-cap':'round','line-join':'round'};
  const w=(a,b,c)=>['interpolate',['linear'],['zoom'],10,a,16,b,19,c];
  map.addSource('alts',{type:'geojson',data:EMPTY});
  map.addSource('route',{type:'geojson',data:EMPTY});
  map.addLayer({id:'alts',type:'line',source:'alts',layout:lay,paint:{'line-color':'#8a7350','line-width':w(3,7,14),'line-opacity':.8}},sym);
  map.addSource('fog',{type:'geojson',data:EMPTY});
  map.addLayer({id:'fog',type:'fill',source:'fog',paint:{'fill-color':'#020108','fill-opacity':.42,'fill-antialias':false}},'alts');
  map.addLayer({id:'route-glow',type:'line',source:'route',layout:lay,paint:{'line-color':'#ffcc33','line-width':w(10,26,48),'line-blur':w(6,14,26),'line-opacity':.55}},sym);
  map.addLayer({id:'route-case',type:'line',source:'route',layout:lay,paint:{'line-color':'#4a2c08','line-width':w(5,14,28)}},sym);
  map.addLayer({id:'route-main',type:'line',source:'route',layout:lay,paint:{'line-color':'#ffd54f','line-width':w(3.5,10,21)}},sym);
  map.addLayer({id:'route-dash',type:'line',source:'route',layout:{'line-join':'round'},paint:{'line-color':'#fff6d0','line-width':w(1,2.5,5),'line-dasharray':[1,5]}},sym);
  map.on('click','alts',e=>selectAlt(+e.features[0].properties.i));
  map.on('mouseenter','alts',()=>map.getCanvas().style.cursor='pointer');
  map.on('mouseleave','alts',()=>map.getCanvas().style.cursor='');
  try{map.setSky({'sky-color':'#2a1c12','horizon-color':'#d9b97a','fog-color':'#c9a86a','sky-horizon-blend':.6,'horizon-fog-blend':.6,'fog-ground-blend':.4})}catch{}
  paintTheme();
  res();
}));
window.__map=map;window.__mapReady=mapReady;window.dispatchEvent(new Event('mapready'));
function elOf(html){const d=document.createElement('div');d.innerHTML=html;return d}
function addMk(html,lat,lon,anchor='center'){return new maplibregl.Marker({element:elOf(html),anchor}).setLngLat([lon,lat]).addTo(map)}
function applyTheme(){const k=themeKey();document.body.classList.toggle('castle',k==='castelo');document.body.classList.toggle('night',k==='noite');document.body.classList.toggle('day',k==='dia');paintTheme()}
