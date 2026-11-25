/* =========================================================
   TABATA CORDE — js/ui.js
   ---------------------------------------------------------
   Module « Tabata.ui » : tout ce qui touche à l'AFFICHAGE
   du chronomètre (cadran, aiguille, textes, boutons).

   Ce module ne contient aucune logique de chronométrage :
   il reçoit un « état à afficher » et le dessine.

   API publique :
     Tabata.ui.init()                    → prépare le cadran
     Tabata.ui.render(vue)               → dessine l'état courant
     Tabata.ui.setStartButton(txt, run)  → texte/couleur du bouton principal
     Tabata.ui.setSoundIcon(actif)       → icône haut-parleur / muet
     Tabata.ui.setVolumeLabel(pourcent)  → affiche « 70% »
   ========================================================= */

(function () {
  "use strict";

  const Tabata = window.Tabata;

  /* -------------------------------------------------------
     Anneau de progression
     Rayon du cercle SVG (r="46" dans index.html) et sa
     circonférence, nécessaire pour dessiner l'arc.
     ------------------------------------------------------- */
  const RING_RADIUS = 46;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  /* -------------------------------------------------------
     Textes et classes CSS de chaque phase
     ------------------------------------------------------- */
  const PHASES = {
    prepare: { label: "PRÉPARATION", css: "prepare" },
    work:    { label: "SAUT",        css: "work" },
    rest:    { label: "REPOS",       css: "rest" }
  };

  /* -------------------------------------------------------
     Icônes du haut-parleur (contenu SVG)
     ------------------------------------------------------- */
  const ICON_SOUND_ON = `
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  `;

  const ICON_SOUND_OFF = `
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <line x1="23" y1="9" x2="17" y2="15"></line>
    <line x1="17" y1="9" x2="23" y2="15"></line>
  `;

  // Éléments HTML utilisés (remplis dans init)
  const el = {};


  /* -------------------------------------------------------
     INITIALISATION
     Récupère les éléments HTML et prépare le cadran.
     ------------------------------------------------------- */
  function init() {
    el.dial = document.getElementById("dial");
    el.phaseLabel = document.getElementById("phaseLabel");
    el.seconds = document.getElementById("seconds");
    el.roundLabel = document.getElementById("roundLabel");
    el.needle = document.getElementById("needle");
    el.progress = document.getElementById("progressValue");
    el.ticks = document.getElementById("ticks");
    el.startButton = document.getElementById("startButton");
    el.soundIcon = document.getElementById("soundIcon");
    el.volumeValue = document.getElementById("volumeValue");

    // L'arc de progression est un trait en pointillés géant :
    // on joue sur le décalage (dashoffset) pour le remplir.
    el.progress.style.strokeDasharray = RING_CIRCUMFERENCE;
    el.progress.style.strokeDashoffset = RING_CIRCUMFERENCE;

    buildTicks();
    positionTicks();

    // Les graduations dépendent de la taille du cadran
    window.addEventListener("resize", positionTicks);
  }


  /* -------------------------------------------------------
     GRADUATIONS
     60 petits traits ; un trait « major » toutes les 5.
     ------------------------------------------------------- */
  function buildTicks() {
    for (let i = 0; i < 60; i++) {
      const tick = document.createElement("div");
      tick.className = "tick";

      if (i % 5 === 0) {
        tick.classList.add("major");
      }

      el.ticks.appendChild(tick);
    }
  }

  // Place chaque trait sur le pourtour du cadran
  // (rotation de 6° par trait, puis déplacement vers le bord)
  function positionTicks() {
    const dialSize = el.dial.getBoundingClientRect().width;
    const radius = dialSize * 0.425;

    el.ticks.querySelectorAll(".tick").forEach((tick, index) => {
      const angle = index * 6;
      tick.style.transform = `rotate(${angle}deg) translateY(-${radius}px)`;
    });
  }


  /* -------------------------------------------------------
     AFFICHAGE PRINCIPAL
     « vue » est un objet décrivant l'état à dessiner :
       phase       : "prepare" | "work" | "rest"
       finished    : true si la séance est terminée
       duration    : durée totale de la phase (s)
       elapsed     : temps écoulé dans la phase (s)
       remaining   : temps restant dans la phase (s)
       round       : numéro du round en cours
       totalRounds : nombre total de rounds
     ------------------------------------------------------- */
  function render(view) {

    // --- Progression de la phase, entre 0 et 1 ---
    // Cas particulier : une phase de durée 0 (préparation à 0 s)
    // est considérée comme complète.
    const progress =
      view.duration === 0
        ? 1
        : Math.min(1, Math.max(0, view.elapsed / view.duration));

    // L'aiguille part de -90° (en haut) et fait un tour complet
    const angle = -90 + progress * 360;

    // Arc coloré : plus le décalage est faible, plus l'arc est rempli
    el.progress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);
    el.needle.style.transform = `rotate(${angle}deg)`;

    // Grand chiffre central (arrondi au-dessus : 0,4 s → « 1 »)
    el.seconds.textContent = Math.ceil(view.remaining);

    // --- Couleurs et textes selon la phase ---
    el.phaseLabel.classList.remove("work", "rest", "prepare");
    el.dial.classList.remove("rest", "prepare");

    if (view.finished) {
      // Séance terminée : libellé neutre + animation
      el.phaseLabel.textContent = "TERMINÉ";
      el.phaseLabel.classList.add("finished");
      el.roundLabel.textContent = `${view.totalRounds} rounds terminés`;
      return;
    }

    el.phaseLabel.classList.remove("finished");

    const phase = PHASES[view.phase];

    el.phaseLabel.textContent = phase.label;
    el.phaseLabel.classList.add(phase.css);

    // Le cadran ne change de couleur que pour préparation et repos
    // (le saut utilise la couleur par défaut).
    if (view.phase !== "work") {
      el.dial.classList.add(phase.css);
    }

    el.roundLabel.textContent =
      view.phase === "prepare"
        ? `Préparation · Round 1 / ${view.totalRounds}`
        : `Round ${view.round} / ${view.totalRounds}`;
  }


  /* -------------------------------------------------------
     BOUTON PRINCIPAL (Démarrer / En cours / Reprendre…)
     ------------------------------------------------------- */
  function setStartButton(text, running) {
    el.startButton.textContent = text;
    el.startButton.classList.toggle("running", running);
  }


  /* -------------------------------------------------------
     SON : icône et pourcentage affichés
     ------------------------------------------------------- */
  function setSoundIcon(enabled) {
    el.soundIcon.innerHTML = enabled ? ICON_SOUND_ON : ICON_SOUND_OFF;
  }

  function setVolumeLabel(percent) {
    el.volumeValue.textContent = `${percent}%`;
  }


  Tabata.ui = { init, render, setStartButton, setSoundIcon, setVolumeLabel };

})();
