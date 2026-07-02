"use strict";

const CACHE_NAME = "cloud-hop-adventure-v13";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles.css?v=13",
  "./app.js",
  "./app.js?v=13",
  "./assets/hero.png",
  "./assets/hero-jump.png",
  "./assets/hero-run-1.png",
  "./assets/hero-run-2.png",
  "./assets/moss-shell.png",
  "./assets/background-hills.png",
  "./assets/background-sunset.png",
  "./assets/background-night.png",
  "./assets/terrain-tile.png",
  "./assets/wind-coin.png",
  "./assets/goal-flag.png",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/launch-2048x2732.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const networkFirstPaths = [
    "/cloud-hop-adventure/",
    "/cloud-hop-adventure/index.html",
    "/cloud-hop-adventure/app.js",
    "/cloud-hop-adventure/styles.css",
    "/cloud-hop-adventure/manifest.webmanifest"
  ];

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (networkFirstPaths.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
