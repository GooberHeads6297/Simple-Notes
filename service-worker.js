const CACHE_NAME = 'simplenotes-cache-v1';
const FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/offline.html',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/logo.svg'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then((cache)=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then((keys)=>Promise.all(keys.map((k)=>{ if(k !== CACHE_NAME) return caches.delete(k); }))));
  self.clients.claim();
});

self.addEventListener('fetch', (e)=>{
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if(url.origin === location.origin){
    e.respondWith(caches.match(e.request).then((res)=>res || fetch(e.request).then((fres)=>{ return caches.open(CACHE_NAME).then((cache)=>{ cache.put(e.request, fres.clone()); return fres; }); }).catch(()=>caches.match('/offline.html'))));
  }else{
    e.respondWith(fetch(e.request).catch(()=>caches.match('/offline.html')));
  }
});
