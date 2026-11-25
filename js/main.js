/* =========================================================
   TABATA CORDE — js/main.js
   ---------------------------------------------------------
   Point d'entrée : chargé en dernier, il initialise les
   modules et relie les boutons de la page à leurs actions.
   ========================================================= */

(function () {
  "use strict";

  const Tabata = window.Tabata;


  /* =======================================================
     1. INITIALISATION DES MODULES
     ======================================================= */

  Tabata.ui.init();
  Tabata.audio.init();

  // À chaque changement d'un réglage (durée, rounds…),
  // la séance repart du début avec les nouvelles valeurs.
  Tabata.settings.init({
    onChange: () => Tabata.timer.reset()
  });


  /* =======================================================
     2. VOLUME ET PANNEAU SON
     ======================================================= */

  const volumeSlider = document.getElementById("volume");
  const soundButton = document.getElementById("soundButton");
  const soundPanel = document.getElementById("soundPanel");

  // Applique la position du curseur au son et à l'affichage
  function updateVolume() {
    const percent = Number(volumeSlider.value);

    Tabata.audio.setVolume(percent);
    Tabata.ui.setVolumeLabel(percent);
    Tabata.ui.setSoundIcon(Tabata.audio.isEnabled());
  }

  volumeSlider.addEventListener("input", updateVolume);

  // Bouton haut-parleur : affiche / masque le panneau du volume
  soundButton.addEventListener("click", () => {
    const open = soundPanel.classList.toggle("open");
    soundButton.setAttribute("aria-expanded", String(open));
  });


  /* =======================================================
     3. RÉGLAGES : interrupteur ON / OFF
     Le panneau ne s'affiche ou ne se masque que lorsque
     l'utilisateur agit sur l'interrupteur (jamais tout seul).
     ======================================================= */

  document
    .getElementById("settingsSwitch")
    .addEventListener("click", Tabata.settings.toggle);


  /* =======================================================
     4. COMMANDES DU CHRONOMÈTRE
     ======================================================= */

  document
    .getElementById("startButton")
    .addEventListener("click", Tabata.timer.start);

  document
    .getElementById("pauseButton")
    .addEventListener("click", Tabata.timer.pause);

  document
    .getElementById("resetButton")
    .addEventListener("click", Tabata.timer.reset);


  /* =======================================================
     5. PREMIER AFFICHAGE
     ======================================================= */

  updateVolume();
  Tabata.timer.reset(); // dessine l'état initial avec les réglages chargés

})();
