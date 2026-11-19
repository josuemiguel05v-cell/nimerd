/* Nime RD · recursos locales con prioridad a versiones en línea. */
const CACHE='nime-rd-v3-20261119';
const ART=['astral','celestial','eclipse','kitsune','midnight','neon','reverie','sakura','shadow','starlight'].map(name=>`./assets/art/${name}.svg`);
const SHELL=['./','./index.html','./assets/css/styles.css','./assets/js/app.js','./assets/js/api.js','./assets/js/demo.js','./assets/favicon.svg','./manifest.webmanifest','./data/streams.json','./privacidad.html',...ART];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()).catch(()=>{}));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nime-rd-')&&key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()]));});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 if(new URL(request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});}
  return response;
 }).catch(()=>caches.match(request).then(cached=>cached||(request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
