/* =========================================================
   TABATA CORDE — js/pwa.js
   ---------------------------------------------------------
   Enregistre le service worker, ce qui permet à l'application
   de fonctionner hors ligne et d'être installée sur l'écran
   d'accueil (PWA).
   ========================================================= */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}
