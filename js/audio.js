/* =========================================================
   TABATA CORDE — js/audio.js
   ---------------------------------------------------------
   Module « Tabata.audio » : tout ce qui concerne les sons.

   API publique :
     Tabata.audio.init()           → précharge les sons
     Tabata.audio.setVolume(0-100) → règle le volume
     Tabata.audio.isEnabled()      → true si le volume > 0
     Tabata.audio.play("nom")      → joue un son
   ========================================================= */

(function () {
  "use strict";

  const Tabata = window.Tabata;

  // Un objet Audio par son, indexé par son nom (workStart, midpoint…)
  const sounds = {};

  // Volume courant, entre 0 et 1
  let volume = 0.7;

  // Le son est actif tant que le volume n'est pas à zéro
  let enabled = true;


  /* -------------------------------------------------------
     Précharge tous les sons listés dans config.js
     ------------------------------------------------------- */
  function init() {
    Object.entries(Tabata.config.sounds).forEach(([name, file]) => {
      const audio = new Audio(file);
      audio.preload = "auto";
      audio.volume = volume;
      sounds[name] = audio;
    });
  }


  /* -------------------------------------------------------
     Règle le volume (valeur de 0 à 100, comme le curseur)
     ------------------------------------------------------- */
  function setVolume(percent) {
    volume = Math.min(1, Math.max(0, percent / 100));
    enabled = volume > 0;

    Object.values(sounds).forEach(sound => {
      sound.volume = volume;
    });
  }


  function isEnabled() {
    return enabled;
  }


  /* -------------------------------------------------------
     Joue un son depuis le début.
     Une erreur audio (fichier manquant, lecture bloquée par
     le navigateur…) ne doit JAMAIS arrêter le chronomètre :
     on l'ignore donc volontairement.
     ------------------------------------------------------- */
  function play(name) {
    if (!enabled) {
      return;
    }

    const sound = sounds[name];

    if (!sound) {
      return;
    }

    try {
      sound.pause();
      sound.currentTime = 0;
      sound.volume = volume;

      const promise = sound.play();

      if (promise) {
        promise.catch(() => {
          /* ignoré : voir commentaire ci-dessus */
        });
      }
    } catch (error) {
      /* ignoré : voir commentaire ci-dessus */
    }
  }


  Tabata.audio = { init, setVolume, isEnabled, play };

})();
