# Tabata Corde

Application web (PWA) de chronomètre **Tabata pour corde à sauter** : préparation, alternance saut / repos, sons de compte à rebours, fonctionnement hors ligne.

## Fonctionnalités

- Chronomètre à cadran avec aiguille, anneau de progression et couleurs par phase (préparation, saut, repos)
- **Réglages personnalisables** : durée de préparation, de saut, de repos et nombre de rounds, choisis avec quatre **roulettes** façon cadenas à code (vues de côté, en cylindre)
  - au doigt : on fait défiler, la roulette s'arrête toujours sur une valeur
  - à la souris : molette, glisser, ou clic sur une valeur
  - au clavier : flèches ↑ ↓, Page ↑ / Page ↓, Début, Fin
- **Interrupteur ON / OFF « Réglages »**, toujours visible sous les boutons : il affiche ou masque les roulettes pour un écran épuré. Il est **100 % manuel** (ni le démarrage, ni la pause, ni la réinitialisation n'y touchent) et son état est mémorisé
- Réglages **sauvegardés** automatiquement dans le navigateur
- Sons : début de saut / repos, mi-phase, compte à rebours 3-2-1, fin de séance, avec volume réglable
- Installable sur l'écran d'accueil, utilisable **hors ligne**

## Structure du projet

```
tabata-corde/
├── index.html              Structure de la page (HTML uniquement)
├── manifest.webmanifest    Informations d'installation (PWA)
├── service-worker.js       Cache hors ligne
├── README.md
│
├── css/
│   ├── base.css            Thème (couleurs), mise en page, en-tête, panneau son
│   ├── timer.css           Cadran du chronomètre
│   ├── controls.css        Boutons Réinitialiser / Démarrer / Pause
│   └── settings.css        Réglages : interrupteur, panneau repliable, roulettes
│
├── js/
│   ├── config.js           Configuration : valeurs par défaut, limites, fichiers audio
│   ├── audio.js            Lecture des sons et volume
│   ├── ui.js               Affichage (cadran, aiguille, textes)
│   ├── settings.js         Réglages : roulettes, sauvegarde, interrupteur du panneau
│   ├── timer.js            Logique du chronomètre (phases, rounds, sons)
│   ├── main.js             Point d'entrée : relie les boutons aux actions
│   └── pwa.js              Enregistrement du service worker
│
├── audio/                  Fichiers sonores (.mp3)
└── icons/                  Icônes de l'application
```

Les scripts s'appuient sur un objet global unique `Tabata` et doivent être chargés **dans l'ordre** indiqué en bas de `index.html`.

## Fichiers audio attendus (dossier `audio/`)

| Fichier              | Moment                          |
|----------------------|---------------------------------|
| `start-saut.mp3`     | Début de chaque phase de saut   |
| `start-repos.mp3`    | Début de chaque phase de repos  |
| `milieu.mp3`         | Moitié d'une phase (saut/repos) |
| `countdown-3.mp3`    | « 3 »                           |
| `countdown-2.mp3`    | « 2 »                           |
| `countdown-1.mp3`    | « 1 »                           |
| `termine.mp3`        | Fin de la séance                |

## Personnalisation

Tout se règle dans `js/config.js` :

- `defaults` : valeurs au premier lancement
- `limits` : minimum, maximum et pas (écart entre deux graduations) de chaque réglage ; les valeurs de la roulette en découlent
- `sounds` : chemins des fichiers audio

Les couleurs se modifient dans `css/base.css` (bloc `:root`).

## Lancer l'application

Un service worker nécessite un serveur (ou `localhost`), un simple double-clic sur `index.html` suffit pour tester l'interface, mais pas le mode hors ligne.

```bash
# Exemple avec Python
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Pour la publier : GitHub Pages, Netlify, etc. (HTTPS requis pour l'installation).

## ⚠ Mise à jour de l'application

Après chaque modification du code, changer le numéro de version `CACHE_NAME` dans `service-worker.js` (`tabata-corde-v4` → `v5`…). Sinon les appareils déjà installés garderont l'ancienne version en cache.
