/* =========================================================
   TABATA CORDE — js/config.js
   ---------------------------------------------------------
   Toute la configuration de l'application est ici.
   Pour modifier un comportement (bornes des réglages, valeurs
   par défaut, fichiers audio…), c'est le seul fichier à ouvrir.

   Organisation générale du code :
   Tous les fichiers partagent un unique objet global « Tabata »
   (window.Tabata) qui regroupe les « modules » :

     Tabata.config    → ce fichier
     Tabata.audio     → js/audio.js
     Tabata.ui        → js/ui.js
     Tabata.settings  → js/settings.js
     Tabata.timer     → js/timer.js
   ========================================================= */

(function () {
  "use strict";

  // Crée l'objet global s'il n'existe pas encore
  const Tabata = (window.Tabata = window.Tabata || {});

  Tabata.config = {

    /* -----------------------------------------------------
       Clé sous laquelle les réglages sont sauvegardés
       dans le navigateur (localStorage).
       ----------------------------------------------------- */
    storageKey: "tabata-corde-settings",

    /* -----------------------------------------------------
       Clé sous laquelle l'état du panneau de réglages
       (affiché / masqué) est mémorisé. Le masquage est
       toujours manuel : il dépend uniquement de l'interrupteur.
       ----------------------------------------------------- */
    panelStorageKey: "tabata-corde-panel",

    /* -----------------------------------------------------
       Valeurs par défaut (premier lancement)
       prepare / work / rest : en secondes
       rounds                : nombre de répétitions
       ----------------------------------------------------- */
    defaults: {
      prepare: 10,
      work: 20,
      rest: 10,
      rounds: 8
    },

    /* -----------------------------------------------------
       Limites de chaque réglage
       min  : valeur minimale
       max  : valeur maximale
       step : écart entre deux graduations de la roulette
       ----------------------------------------------------- */
    limits: {
      prepare: { min: 0, max: 60,  step: 1 },  // 0 = pas de préparation
      work:    { min: 5, max: 300, step: 5 },
      rest:    { min: 5, max: 180, step: 5 },
      rounds:  { min: 1, max: 50,  step: 1 }
    },

    /* -----------------------------------------------------
       Fichiers audio (dossier audio/)
       ----------------------------------------------------- */
    sounds: {
      workStart:  "audio/start-saut.mp3",   // début d'une phase de saut
      restStart:  "audio/start-repos.mp3",  // début d'une phase de repos
      midpoint:   "audio/milieu.mp3",       // moitié de la phase
      countdown3: "audio/countdown-3.mp3",  // « 3 »
      countdown2: "audio/countdown-2.mp3",  // « 2 »
      countdown1: "audio/countdown-1.mp3",  // « 1 »
      finish:     "audio/termine.mp3"       // fin de la séance
    }

  };

})();
