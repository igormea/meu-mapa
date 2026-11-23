'use strict';
/* ── APP ANDROID (Capacitor) ─────────────────────────────
   No APK, usa recursos nativos: GPS em segundo plano, voz nativa e tela ligada.
   No navegador, nada disso existe e o site segue funcionando igual. */
let NATIVE=false,NAT=null;
try{
  const C=window.Capacitor;
  NATIVE=!!(C&&C.isNativePlatform&&C.isNativePlatform());
  if(NATIVE){
    const reg=n=>C.registerPlugin?C.registerPlugin(n):(C.Plugins&&C.Plugins[n]);
    NAT={bg:reg('BackgroundGeolocation'),tts:reg('TextToSpeech'),awake:reg('KeepAwake'),geo:reg('Geolocation'),notif:reg('LocalNotifications'),speech:reg('SpeechRecognition'),app:reg('App'),social:reg('SocialLogin'),car:reg('RanvusCar')};
    if(!NAT.bg||!NAT.tts||!NAT.awake){NATIVE=false;NAT=null}
  }
}catch(e){NATIVE=false;NAT=null;window.__showErr&&window.__showErr('Capacitor: '+e.message)}
const rnd=(a,b)=>a+Math.random()*(b-a);
const ri=(a,b)=>Math.floor(rnd(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtN=n=>Math.round(n).toLocaleString('pt-BR');
