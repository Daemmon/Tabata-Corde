/* =========================================================
   TABATA CORDE — service-worker.js
   ---------------------------------------------------------
   Met en cache tous les fichiers de l'application pour
   qu'elle fonctionne sans connexion.

   ⚠ À CHAQUE MODIFICATION DU CODE : changer le numéro de
   version ci-dessous (v4 → v5…). Sinon les téléphones
   continueront d'afficher l'ancienne version en cache.
   ========================================================= */

const CACHE_NAME = "tabata-corde-v2";

// Liste de tous les fichiers à conserver hors ligne
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",

  // Styles
  "./css/base.css",
  "./css/timer.css",
  "./css/controls.css",
  "./css/settings.css",

  // Scripts
  "./js/config.js",
  "./js/audio.js",
  "./js/ui.js",
  "./js/settings.js",
  "./js/timer.js",
  "./js/main.js",
  "./js/pwa.js",

  // Icônes
  "./icons/icon-192.png",
  "./icons/icon-512.png",

  // Sons
  "./audio/start-saut.mp3",
  "./audio/start-repos.mp3",
  "./audio/milieu.mp3",
  "./audio/countdown-3.mp3",
  "./audio/countdown-2.mp3",
  "./audio/countdown-1.mp3",
  "./audio/termine.mp3"
];


/* =========================================================
   INSTALLATION : remplit le cache.
   Chaque fichier est ajouté séparément : si l'un d'eux est
   introuvable (ex. un son manquant), les autres sont quand
   même mis en cache (avec « addAll », un seul échec ferait
   échouer toute l'installation).
   ========================================================= */

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        FILES_TO_CACHE.map(file =>
          cache.add(file).catch(() => {
            console.warn("Fichier non mis en cache :", file);
          })
        )
      )
    )
  );

  self.skipWaiting();
});


/* =========================================================
   ACTIVATION : supprime les anciens caches (versions
   précédentes) et prend le contrôle des pages ouvertes.
   ========================================================= */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names =>
        Promise.all(
          names
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});


/* =========================================================
   REQUÊTES AUDIO PARTIELLES (« Range »)
   Les navigateurs (Safari surtout) demandent les fichiers
   audio par morceaux. Une réponse du cache doit donc savoir
   répondre à ces demandes, sinon le son ne se lit pas hors
   ligne.
   ========================================================= */

async function respondToRange(request, cachedResponse) {
  const buffer = await cachedResponse.arrayBuffer();
  const total = buffer.byteLength;

  // En-tête de la forme « bytes=début-fin »
  const match = /bytes=(\d*)-(\d*)/.exec(request.headers.get("range"));

  let start = 0;
  let end = total - 1;

  if (match) {
    if (match[1] === "" && match[2] !== "") {
      // « bytes=-N » : les N derniers octets
      start = Math.max(0, total - parseInt(match[2], 10));
    } else {
      start = match[1] ? parseInt(match[1], 10) : 0;
      end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
    }
  }

  // Plage demandée invalide
  if (start > end || start >= total) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` }
    });
  }

  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": cachedResponse.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Content-Length": String(end - start + 1)
    }
  });
}


/* =========================================================
   REQUÊTES : on sert d'abord le cache, puis le réseau.
   ========================================================= */

self.addEventListener("fetch", event => {
  const request = event.request;

  // On ne gère que les lectures (GET)
  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (!cached) {
        return fetch(request);
      }

      return request.headers.has("range")
        ? respondToRange(request, cached)
        : cached;
    })
  );
});
