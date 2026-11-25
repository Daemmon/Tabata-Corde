/* =========================================================
   TABATA CORDE — js/settings.js
   ---------------------------------------------------------
   Module « Tabata.settings » : les réglages de la séance.

   Il gère :
   1. Les valeurs (préparation, saut, repos, rounds)
   2. Leur sauvegarde dans le navigateur (localStorage)
   3. Les ROULETTES de choix (une par réglage) : défilement au
      doigt, à la molette ou en glissant à la souris, toucher
      d'une valeur, flèches du clavier
   4. L'interrupteur ON / OFF qui affiche ou masque le panneau

   API publique :
     Tabata.settings.values             → { prepare, work, rest, rounds }
     Tabata.settings.init({ onChange }) → démarre le module
     Tabata.settings.setOpen(bool)      → affiche / masque le panneau
     Tabata.settings.toggle()           → inverse l'état du panneau
   ========================================================= */

(function () {
  "use strict";

  const Tabata = window.Tabata;
  const config = Tabata.config;


  /* =======================================================
     CONSTANTES DE L'EFFET « CYLINDRE »
     ======================================================= */

  // Angle (en degrés) entre deux valeurs voisines sur le cylindre.
  // Plus il est grand, plus la roulette paraît courbée.
  const ANGLE_STEP = 30;

  // Angle à partir duquel une valeur est de profil : elle est alors masquée
  const ANGLE_MAX = 80;

  // Nombre de valeurs mises à jour de chaque côté du centre
  // (celles qui sont plus loin ne sont de toute façon pas visibles)
  const VISIBLE_RADIUS = 4;

  // Délai (ms) après l'arrêt de la roulette avant de valider la valeur.
  // Évite de relancer la séance à chaque valeur traversée en défilant.
  const COMMIT_DELAY = 150;


  /* =======================================================
     ÉTAT DU MODULE
     ======================================================= */

  // Valeurs validées (copie des valeurs par défaut au départ)
  const values = Object.assign({}, config.defaults);

  // Une entrée par roulette, indexée par réglage (prepare, work…)
  const wheels = {};

  // Fonction appelée quand un réglage change réellement
  let onChange = null;

  // Éléments du panneau repliable
  let panel = null;
  let toggleButton = null;


  /* =======================================================
     1. VALIDATION
     ======================================================= */

  // Ramène une valeur à la graduation valide la plus proche
  // (entre le min et le max, et alignée sur le pas).
  // Une valeur non numérique est remplacée par la valeur actuelle.
  function snap(key, raw) {
    const limits = config.limits[key];

    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      return values[key];
    }

    const maxSteps = Math.floor((limits.max - limits.min) / limits.step);
    const steps = Math.round((raw - limits.min) / limits.step);

    return limits.min + Math.min(maxSteps, Math.max(0, steps)) * limits.step;
  }


  /* =======================================================
     2. SAUVEGARDE / CHARGEMENT
     Un échec (navigation privée, stockage plein…) ne doit
     jamais empêcher l'application de fonctionner.
     ======================================================= */

  function save() {
    try {
      localStorage.setItem(config.storageKey, JSON.stringify(values));
    } catch (error) {
      /* ignoré */
    }
  }

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(config.storageKey));

      if (stored && typeof stored === "object") {
        Object.keys(values).forEach(key => {
          if (key in stored) {
            values[key] = snap(key, stored[key]);
          }
        });
      }
    } catch (error) {
      /* ignoré : on garde les valeurs par défaut */
    }
  }

  // Le panneau était-il ouvert à la dernière visite ? (ouvert par défaut)
  function loadPanelState() {
    try {
      return localStorage.getItem(config.panelStorageKey) !== "closed";
    } catch (error) {
      return true;
    }
  }

  function savePanelState(open) {
    try {
      localStorage.setItem(config.panelStorageKey, open ? "open" : "closed");
    } catch (error) {
      /* ignoré */
    }
  }


  /* =======================================================
     3. ROULETTES — AFFICHAGE
     ======================================================= */

  /*
    Met à jour l'effet « cylindre » de la roulette.

    Principe : imaginons les valeurs collées sur un cylindre vu de
    côté. Une valeur située à « d » lignes du centre est tournée de
    d × 30°. On en déduit :
      - son inclinaison : elle s'écrase verticalement (rotateX) ;
      - son décalage : elle se rapproche du centre (translateY),
        puisque la surface s'éloigne de l'œil en s'incurvant ;
      - son opacité : elle s'estompe vers le haut et le bas.
  */
  function update(wheel) {
    const total = wheel.items.length;
    const row = wheel.row;

    // Position fractionnaire de la roulette, exprimée en « lignes »
    // (ex. 12.4 = entre la 12e et la 13e valeur)
    const position = wheel.scroller.scrollTop / row;

    // Valeur la plus proche du centre
    const nearest = Math.min(total - 1, Math.max(0, Math.round(position)));

    // Changement de valeur sélectionnée : on déplace la surbrillance
    if (nearest !== wheel.index) {
      if (wheel.index >= 0) {
        wheel.items[wheel.index].classList.remove("is-selected");
      }

      wheel.items[nearest].classList.add("is-selected");
      wheel.index = nearest;
      wheel.scroller.setAttribute("aria-valuenow", wheel.list[nearest]);
    }

    // Rayon du cylindre, en pixels (une ligne = ANGLE_STEP degrés d'arc)
    const radius = row / (ANGLE_STEP * Math.PI / 180);

    const first = Math.max(0, nearest - VISIBLE_RADIUS);
    const last = Math.min(total - 1, nearest + VISIBLE_RADIUS);

    for (let i = first; i <= last; i++) {
      const distance = i - position;   // distance au centre, en lignes
      const angle = distance * ANGLE_STEP;
      const item = wheel.items[i];

      // Valeur passée « derrière » le cylindre (vue de profil) :
      // on la masque, et on la rend intouchable pour ne pas gêner
      // le toucher des valeurs visibles.
      if (Math.abs(angle) >= ANGLE_MAX) {
        item.style.opacity = 0;
        item.style.pointerEvents = "none";
        continue;
      }

      // Hauteur réelle sur le cylindre, moins la hauteur naturelle dans la liste
      const shift = radius * Math.sin(angle * Math.PI / 180) - distance * row;

      item.style.transform = `translateY(${shift}px) rotateX(${-angle}deg)`;
      item.style.opacity = Math.max(0.12, 1 - Math.abs(distance) * 0.3);
      item.style.pointerEvents = "";
    }
  }

  // Mesure la hauteur d'une ligne (elle change selon la taille d'écran)
  function measureRow(wheel) {
    wheel.row = wheel.items[0].offsetHeight || 30;
  }


  /* =======================================================
     4. ROULETTES — SÉLECTION
     ======================================================= */

  // Fait défiler la roulette jusqu'à la valeur d'indice donné
  function selectIndex(wheel, index, smooth) {
    const clamped = Math.min(wheel.items.length - 1, Math.max(0, index));

    wheel.scroller.scrollTo({
      top: clamped * wheel.row,
      behavior: smooth ? "smooth" : "auto"
    });
  }

  // Valide la valeur sélectionnée : sauvegarde + prévient le reste
  // de l'application (qui relance alors la séance à zéro).
  function commit(wheel) {

    // Pas de validation tant que la souris tient encore la roulette
    if (wheel.drag) {
      return;
    }

    update(wheel);

    const value = wheel.list[wheel.index];

    // Rien n'a changé : on ne relance pas la séance pour rien
    if (value === values[wheel.key]) {
      return;
    }

    values[wheel.key] = value;
    save();

    if (onChange) {
      onChange(wheel.key, value);
    }
  }


  /* =======================================================
     5. ROULETTES — CONSTRUCTION D'UNE CARTE
     ======================================================= */

  function bindWheel(card) {
    const key = card.dataset.setting;
    const limits = config.limits[key];
    const scroller = card.querySelector(".wheel-scroll");

    // --- Liste des valeurs possibles, d'après config.js ---
    const list = [];

    for (let v = limits.min; v <= limits.max; v += limits.step) {
      list.push(v);
    }

    // --- Une ligne HTML par valeur ---
    const items = list.map((value, index) => {
      const item = document.createElement("div");

      item.className = "wheel-item";
      item.dataset.index = index;
      item.textContent = value;

      scroller.appendChild(item);

      return item;
    });

    const wheel = {
      key,
      scroller,
      list,
      items,
      row: 30,             // hauteur d'une ligne (mesurée juste après)
      index: -1,           // indice de la valeur sélectionnée (-1 = aucune)
      frame: null,         // image d'animation en attente
      commitTimer: null,   // minuteur de validation
      drag: null,          // glisser à la souris en cours
      suppressClick: false // ignorer le clic qui suit un glisser
    };

    wheels[key] = wheel;
    measureRow(wheel);

    // Accessibilité : la roulette se comporte comme un champ numérique
    scroller.setAttribute("aria-valuemin", limits.min);
    scroller.setAttribute("aria-valuemax", limits.max);

    // --- Défilement (doigt, molette, clavier ou souris) ---
    scroller.addEventListener("scroll", () => {

      // Redessine au maximum une fois par image
      if (!wheel.frame) {
        wheel.frame = requestAnimationFrame(() => {
          wheel.frame = null;
          update(wheel);
        });
      }

      // Valide la valeur quand la roulette s'est arrêtée
      clearTimeout(wheel.commitTimer);
      wheel.commitTimer = setTimeout(() => commit(wheel), COMMIT_DELAY);

    }, { passive: true });

    // --- Toucher / cliquer une valeur : la roulette s'y place ---
    scroller.addEventListener("click", event => {

      // Un glisser à la souris se termine par un clic : on l'ignore
      if (wheel.suppressClick) {
        wheel.suppressClick = false;
        return;
      }

      const item = event.target.closest(".wheel-item");

      if (item) {
        selectIndex(wheel, Number(item.dataset.index), true);
      }
    });

    // --- Glisser à la souris (le doigt, lui, défile nativement) ---
    scroller.addEventListener("pointerdown", event => {
      if (event.pointerType !== "mouse" || event.button !== 0) {
        return;
      }

      const drag = {
        startY: event.clientY,
        startTop: scroller.scrollTop,
        moved: false
      };

      wheel.drag = drag;
      wheel.suppressClick = false;
      scroller.classList.add("dragging");

      function onMove(moveEvent) {
        const delta = moveEvent.clientY - drag.startY;

        // Petit seuil pour distinguer un clic d'un vrai glisser
        if (Math.abs(delta) > 4) {
          drag.moved = true;
        }

        scroller.scrollTop = drag.startTop - delta;
      }

      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);

        wheel.drag = null;
        wheel.suppressClick = drag.moved;
        scroller.classList.remove("dragging");

        // La roulette s'aimante sur la valeur la plus proche
        selectIndex(wheel, Math.round(scroller.scrollTop / wheel.row), true);
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    });

    // --- Clavier : flèches, Page précédente / suivante, Début, Fin ---
    scroller.addEventListener("keydown", event => {
      const moves = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 };
      let target = null;

      if (event.key in moves) {
        target = wheel.index + moves[event.key];
      } else if (event.key === "Home") {
        target = 0;
      } else if (event.key === "End") {
        target = list.length - 1;
      }

      if (target !== null) {
        event.preventDefault();
        selectIndex(wheel, target, true);
      }
    });

    // --- Position de départ : sur la valeur enregistrée ---
    // (sans animation ; mise en place immédiate du cylindre)
    selectIndex(wheel, list.indexOf(values[key]), false);
    update(wheel);
  }

  // Si la taille d'écran change, la hauteur d'une ligne change aussi :
  // on remesure et on replace chaque roulette sur sa valeur.
  function resyncWheels() {
    Object.values(wheels).forEach(wheel => {
      measureRow(wheel);
      wheel.scroller.scrollTop = wheel.index * wheel.row;
      update(wheel);
    });
  }


  /* =======================================================
     6. PANNEAU : INTERRUPTEUR ON / OFF
     Le panneau ne s'affiche et ne se masque QUE par l'action
     de l'utilisateur sur l'interrupteur.
     ======================================================= */

  function setOpen(open) {
    panel.classList.toggle("collapsed", !open);

    // « inert » retire le panneau du clavier et des lecteurs d'écran
    // quand il est masqué (ses roulettes ne sont plus accessibles).
    panel.inert = !open;

    toggleButton.setAttribute("aria-checked", String(open));

    savePanelState(open);
  }

  function toggle() {
    setOpen(panel.classList.contains("collapsed"));
  }


  /* =======================================================
     7. INITIALISATION
     ======================================================= */

  function init(options) {
    onChange = options && options.onChange;

    panel = document.getElementById("settingsPanel");
    toggleButton = document.getElementById("settingsSwitch");

    // 1. Récupère les réglages de la séance précédente
    load();

    // 2. Construit les 4 roulettes
    document.querySelectorAll(".setting[data-setting]").forEach(bindWheel);

    // 3. Rétablit l'état du panneau (sans animation au chargement)
    panel.classList.add("no-anim");
    setOpen(loadPanelState());

    requestAnimationFrame(() => {
      requestAnimationFrame(() => panel.classList.remove("no-anim"));
    });

    window.addEventListener("resize", resyncWheels);
  }


  Tabata.settings = { values, init, setOpen, toggle };

})();
