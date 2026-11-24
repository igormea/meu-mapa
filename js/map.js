'use strict';
/* ── MAPA ────────────────────────────────────────────── */
// Estilo próprio, "limpo" (inspirado no Waze): o mapa é desenhado pelo app a partir
// dos dados vetoriais do OpenStreetMap (OpenFreeMap). Quarteirões lisos, ruas com
// contraste forte, só nome de rua e de bairro. O RPG fica na mecânica, não no chão.
// "Detalhado" (opção) = o mapa-imagem antigo do OpenStreetMap.
const RD={minor:['minor','service'],maj:['primary','secondary','tertiary'],hwy:['motorway','trunk']};
const rf=(cls,extra)=>['all',['in',['get','class'],['literal',cls]],['!=',['get','brunnel'],'tunnel'],...(extra?[extra]:[])];
const zw=(a,b,c,d)=>['interpolate',['exponential',1.5],['zoom'],10,a,14,b,17,c,20,d];
const NM=['coalesce',['get','name:pt'],['get','name']];
const STYLE={version:8,glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources:{
    osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,
      attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'},
    omt:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'},
    tint:{type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[-180,-85],[180,-85],[180,85],[-180,85],[-180,-85]]]}}},
  },
  layers:[
    {id:'bg',type:'background',paint:{'background-color':'#151a2e'}},
    {id:'osm',type:'raster',source:'osm',layout:{visibility:'none'}},
    {id:'tint',type:'fill',source:'tint',layout:{visibility:'none'},paint:{'fill-color':'#a8782a','fill-opacity':.2}},
    {id:'v-park',type:'fill',source:'omt','source-layer':'park',paint:{'fill-color':'#16302b'}},
    {id:'v-green',type:'fill',source:'omt','source-layer':'landcover',filter:['in',['get','class'],['literal',['grass','wood','farmland']]],paint:{'fill-color':'#16302b','fill-opacity':.55}},
    {id:'v-water',type:'fill',source:'omt','source-layer':'water',paint:{'fill-color':'#0f2a4a'}},
    {id:'v-river',type:'line',source:'omt','source-layer':'waterway',minzoom:12,paint:{'line-color':'#0f2a4a','line-width':zw(.5,1.5,3,6)}},
    {id:'v-bld',type:'fill',source:'omt','source-layer':'building',minzoom:15,paint:{'fill-color':'#1d2340','fill-opacity':['interpolate',['linear'],['zoom'],15,0,16,1]}},
    {id:'v-svc-c',type:'line',source:'omt','source-layer':'transportation',minzoom:15,filter:rf(['service']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#0b0f1f','line-width':zw(0,1,7,18)}},
    {id:'v-min-c',type:'line',source:'omt','source-layer':'transportation',minzoom:12,filter:rf(['minor']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#0b0f1f','line-width':zw(.5,3,11,30)}},
    {id:'v-maj-c',type:'line',source:'omt','source-layer':'transportation',minzoom:9,filter:rf(RD.maj),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#0b0f1f','line-width':zw(1.5,6,17,44)}},
    {id:'v-hwy-c',type:'line',source:'omt','source-layer':'transportation',minzoom:6,filter:rf(RD.hwy),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#0b0f1f','line-width':zw(2.5,8,21,52)}},
    {id:'v-svc',type:'line',source:'omt','source-layer':'transportation',minzoom:15,filter:rf(['service']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#353e66','line-width':zw(0,.5,5,14)}},
    {id:'v-min',type:'line',source:'omt','source-layer':'transportation',minzoom:12,filter:rf(['minor']),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#4b5585','line-width':zw(.3,2,8.5,25)}},
    {id:'v-maj',type:'line',source:'omt','source-layer':'transportation',minzoom:9,filter:rf(RD.maj),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#8a93d0','line-width':zw(1,4.5,14,38)}},
    {id:'v-hwy',type:'line',source:'omt','source-layer':'transportation',minzoom:6,filter:rf(RD.hwy),layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#d9a441','line-width':zw(1.5,6,17,45)}},
    {id:'b3d',type:'fill-extrusion',source:'omt','source-layer':'building',minzoom:15,layout:{visibility:'none'},paint:{
      'fill-extrusion-color':'#d8bf8c','fill-extrusion-opacity':.85,
      'fill-extrusion-height':['coalesce',['get','render_height'],8],
      'fill-extrusion-base':['coalesce',['get','render_min_height'],0]}},
    {id:'v-street',type:'symbol',source:'omt','source-layer':'transportation_name',minzoom:14,
      filter:['in',['get','class'],['literal',['minor','primary','secondary','tertiary','motorway','trunk']]],
      layout:{'symbol-placement':'line','text-field':NM,'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],14,11,18,15],
        'text-max-angle':30,'symbol-spacing':320,'text-padding':4},
      paint:{'text-color':'#c9cff0','text-halo-color':'#121628','text-halo-width':1.6}},
    {id:'v-place',type:'symbol',source:'omt','source-layer':'place',minzoom:11,maxzoom:16,
      filter:['in',['get','class'],['literal',['suburb','neighbourhood','quarter','town','city']]],
      layout:{'text-field':NM,'text-font':['Noto Sans Bold'],'text-transform':'uppercase','text-letter-spacing':.12,
        'text-size':['interpolate',['linear'],['zoom'],11,10,15,13],'text-max-width':8,'text-padding':12},
      paint:{'text-color':'#8f97c8','text-halo-color':'#121628','text-halo-width':1.4,'text-opacity':.85}},
  ]};
// Paleta de cada visual. route: [principal, brilho, borda, tracejado]
// Escuros têm o toque de RPG só na cor (azul/roxo de noite de jogo, avenidas douradas).
const THEMES={
  castelo:{bg:'#1a1430',bld:'#251d44',park:'#1b2e2a',water:'#15204c',cas:'#0d0a1c',svc:'#3d346e',min:'#5c4f98',maj:'#9480de',hwy:'#e0a83a',
    lab:'#e4deff',halo:'#140f26',plc:'#9d92d4',sky:['#0d0a1c','#2a2050'],
    osm:{'raster-saturation':-.35,'raster-contrast':.2,'raster-brightness-min':.88,'raster-brightness-max':.04,'raster-hue-rotate':205},tint:['#2a0f55',.32],
    b3d:'#2d2552',route:['#ff3d6a','#ff2d55','#2a0610','#ffd9a0']},
  noite:{bg:'#151a2e',bld:'#1e2442',park:'#16302b',water:'#0f2a4a',cas:'#0b0f1f',svc:'#3a4370',min:'#56609a',maj:'#8a93d0',hwy:'#d9a441',
    lab:'#cdd3f2',halo:'#11152a',plc:'#8f97c8',sky:['#0b0f1f','#222a4a'],
    osm:{'raster-saturation':.1,'raster-contrast':.15,'raster-brightness-min':.9,'raster-brightness-max':.08,'raster-hue-rotate':180},tint:['#4a3418',.25],
    b3d:'#3a4266',route:['#ffd54f','#ffcc33','#4a2c08','#fff6d0']},
  dia:{bg:'#ebe5d5',bld:'#ddd4bf',park:'#cfe0b0',water:'#a7cde6',cas:'#bfb497',svc:'#f7f3ea',min:'#ffffff',maj:'#ffd768',hwy:'#ffab4a',
    lab:'#3a3122',halo:'#ffffff',plc:'#7a6a4c',sky:['#cfe3f2','#ebe5d5'],
    osm:{'raster-saturation':.15,'raster-contrast':.05,'raster-brightness-min':0,'raster-brightness-max':1,'raster-hue-rotate':-10},tint:['#a8782a',.2],
    b3d:'#d8bf8c',route:['#3d7cff','#2f6bff','#123a8a','#e6efff']},
};
const VLAY={'v-park':['fill-color','park'],'v-green':['fill-color','park'],'v-water':['fill-color','water'],'v-river':['line-color','water'],'v-bld':['fill-color','bld'],
  'v-svc-c':['line-color','cas'],'v-min-c':['line-color','cas'],'v-maj-c':['line-color','cas'],'v-hwy-c':['line-color','cas'],
  'v-svc':['line-color','svc'],'v-min':['line-color','min'],'v-maj':['line-color','maj'],'v-hwy':['line-color','hwy']};
function themeKey(){const m=S.theme||'castelo';return m==='auto'?'castelo':THEMES[m]?m:'castelo'}
function paintTheme(){
  if(!map.getLayer('osm'))return;const t=THEMES[themeKey()],det=S.mapDet===true;
  const vis=(id,on)=>map.getLayer(id)&&map.setLayoutProperty(id,'visibility',on?'visible':'none');
  map.setPaintProperty('bg','background-color',t.bg);
  for(const id in VLAY){vis(id,!det);map.setPaintProperty(id,VLAY[id][0],t[VLAY[id][1]])}
  // nomes ficam por cima das duas versões; no detalhado a imagem já traz os nomes
  for(const id of ['v-street','v-place']){vis(id,!det);map.setPaintProperty(id,'text-color',t[id==='v-street'?'lab':'plc']);map.setPaintProperty(id,'text-halo-color',t.halo)}
  vis('osm',det);vis('tint',det);
  for(const k in t.osm)map.setPaintProperty('osm',k,t.osm[k]);
  map.setPaintProperty('tint','fill-color',t.tint[0]);map.setPaintProperty('tint','fill-opacity',t.tint[1]);
  map.setPaintProperty('b3d','fill-extrusion-color',t.b3d);vis('b3d',S.b3d===true);
  try{map.setSky({'sky-color':t.sky[0],'horizon-color':t.sky[1],'fog-color':t.sky[1],'sky-horizon-blend':.6,'horizon-fog-blend':.6,'fog-ground-blend':.3})}catch{}
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
  paintTheme();
  res();
}));
window.__map=map;window.__mapReady=mapReady;window.dispatchEvent(new Event('mapready'));
function elOf(html){const d=document.createElement('div');d.innerHTML=html;return d}
function addMk(html,lat,lon,anchor='center'){return new maplibregl.Marker({element:elOf(html),anchor}).setLngLat([lon,lat]).addTo(map)}
function applyTheme(){const k=themeKey();document.body.classList.toggle('castle',k==='castelo');document.body.classList.toggle('night',k==='noite');document.body.classList.toggle('day',k==='dia');paintTheme()}
