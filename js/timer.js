/* =========================================================
   TABATA CORDE — js/timer.js
   ---------------------------------------------------------
   Module « Tabata.timer » : la logique du chronomètre.

   Une séance se déroule ainsi :

     PRÉPARATION → SAUT → REPOS → SAUT → REPOS → … → SAUT → TERMINÉ

   (pas de repos après le dernier saut)

   API publique :
     Tabata.timer.start()   → démarre / reprend
     Tabata.timer.pause()   → met en pause
     Tabata.timer.reset()   → revient au début (préparation)
   ========================================================= */

(function () {
  "use strict";

  const Tabata = window.Tabata;


  /* =======================================================
     1. ÉTAT
     ======================================================= */

  const state = {
    phase: "prepare",        // "prepare" | "work" | "rest"
    round: 1,                // round en cours (1 à rounds)
    elapsed: 0,              // secondes écoulées dans la phase
    running: false,          // le chrono tourne-t-il ?
    finished: false,         // la séance est-elle terminée ?
    frame: null,             // identifiant de l'animation en cours
    previousTimestamp: null, // horodatage de l'image précédente
    lastAnnouncedSecond: null, // dernier « 3, 2, 1 » joué (évite les doublons)
    midpointAnnounced: false   // le son de mi-phase a-t-il été joué ?
  };


  /* =======================================================
     2. OUTILS
     ======================================================= */

  // Durée (en secondes) de la phase en cours, d'après les réglages
  function getCurrentDuration() {
    const settings = Tabata.settings.values;

    if (state.phase === "prepare") {
      return settings.prepare;
    }

    if (state.phase === "work") {
      return settings.work;
    }

    return settings.rest;
  }

  function getRemaining() {
    return Math.max(0, getCurrentDuration() - state.elapsed);
  }

  // Remet à zéro les compteurs propres à une phase
  function resetPhaseCounters() {
    state.elapsed = 0;
    state.previousTimestamp = null;
    state.lastAnnouncedSecond = null;
    state.midpointAnnounced = false;
  }

  // Annule l'animation en cours, si elle existe
  function cancelLoop() {
    if (state.frame) {
      cancelAnimationFrame(state.frame);
      state.frame = null;
    }
  }


  /* =======================================================
     3. AFFICHAGE
     Construit la « vue » attendue par Tabata.ui.render().
     ======================================================= */

  function render() {
    Tabata.ui.render({
      phase: state.phase,
      finished: state.finished,
      duration: getCurrentDuration(),
      elapsed: state.elapsed,
      remaining: getRemaining(),
      round: state.round,
      totalRounds: Tabata.settings.values.rounds
    });
  }


  /* =======================================================
     4. SONS DE COMPTE À REBOURS ET DE MI-PHASE
     ======================================================= */

  function announceCountdown() {
    const second = Math.ceil(getRemaining());

    // « 3, 2, 1 » à la fin de CHAQUE phase
    // (préparation, saut et repos)
    if (
      second >= 1 &&
      second <= 3 &&
      second !== state.lastAnnouncedSecond
    ) {
      state.lastAnnouncedSecond = second;
      Tabata.audio.play(`countdown${second}`);
    }

    // Son de mi-phase : uniquement pour SAUT et REPOS
    if (
      state.phase !== "prepare" &&
      !state.midpointAnnounced &&
      state.elapsed >= getCurrentDuration() / 2
    ) {
      state.midpointAnnounced = true;
      Tabata.audio.play("midpoint");
    }
  }


  /* =======================================================
     5. CHANGEMENT DE PHASE
     ======================================================= */

  function changePhase() {

    // PRÉPARATION → SAUT (round 1)
    if (state.phase === "prepare") {
      state.phase = "work";
      state.round = 1;
    }

    // SAUT → REPOS (ou fin de séance)
    else if (state.phase === "work") {

      // Pas de repos après le dernier round
      if (state.round >= Tabata.settings.values.rounds) {
        finish();
        return;
      }

      state.phase = "rest";
    }

    // REPOS → SAUT (round suivant)
    else if (state.phase === "rest") {
      state.round += 1;
      state.phase = "work";
    }

    resetPhaseCounters();
    render();

    // Son de début de phase
    Tabata.audio.play(state.phase === "work" ? "workStart" : "restStart");
  }


  /* =======================================================
     6. FIN DE SÉANCE
     ======================================================= */

  function finish() {
    state.running = false;
    state.finished = true;
    cancelLoop();

    // La phase est considérée comme complète (aiguille au sommet)
    state.elapsed = getCurrentDuration();

    render();
    Tabata.ui.setStartButton("Recommencer", false);
    Tabata.audio.play("finish");
  }


  /* =======================================================
     7. BOUCLE PRINCIPALE
     Appelée ~60 fois par seconde par le navigateur.
     On mesure le temps réellement écoulé entre deux images
     (et non un simple « +1/60 ») pour rester précis.
     ======================================================= */

  function loop(timestamp) {
    if (!state.running) {
      return;
    }

    if (state.previousTimestamp === null) {
      state.previousTimestamp = timestamp;
    }

    state.elapsed += (timestamp - state.previousTimestamp) / 1000;
    state.previousTimestamp = timestamp;

    const duration = getCurrentDuration();

    // Préparation réglée à 0 s : on passe directement au saut
    if (duration === 0 && state.phase === "prepare") {
      state.elapsed = 0;
      changePhase();
    }

    // Fin de la phase en cours
    else if (state.elapsed >= duration) {
      state.elapsed = duration;
      render();
      changePhase();

      // La séance peut s'être terminée dans changePhase()
      if (!state.running) {
        return;
      }
    }

    // Phase en cours : simple mise à jour
    else {
      render();
      announceCountdown();
    }

    state.frame = requestAnimationFrame(loop);
  }


  /* =======================================================
     8. COMMANDES
     ======================================================= */

  function start() {
    if (state.running) {
      return;
    }

    // Séance terminée : « Recommencer » repart de la préparation
    if (state.finished) {
      reset();
    }

    state.running = true;
    state.previousTimestamp = null;

    Tabata.ui.setStartButton("En cours", true);

    // Aucun son au tout début de la préparation : les sons
    // commencent avec le compte à rebours 3 → 2 → 1.

    // Préparation à 0 s : on passe immédiatement au saut
    if (
      state.phase === "prepare" &&
      Tabata.settings.values.prepare === 0
    ) {
      changePhase();
    }

    state.frame = requestAnimationFrame(loop);
  }

  function pause() {
    if (!state.running) {
      return;
    }

    state.running = false;
    cancelLoop();
    state.previousTimestamp = null;

    Tabata.ui.setStartButton("Reprendre", false);
  }

  function reset() {
    state.running = false;
    state.finished = false;
    cancelLoop();

    // Le reset revient toujours à la phase de préparation
    state.phase = "prepare";
    state.round = 1;
    resetPhaseCounters();

    Tabata.ui.setStartButton("Démarrer", false);
    render();
  }


  Tabata.timer = { start, pause, reset };

})();
