const C='mychat-v5',F=['./','index.html','manifest.json','icon.svg'];
const CDN=['esm.run','cdn.jsdelivr.net'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin===location.origin||CDN.includes(u.hostname)){
    e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{
      if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r;
    })));
  }
});
