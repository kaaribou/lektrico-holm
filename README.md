# ⚡ HOLM Lektrico

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
![Version](https://img.shields.io/github/v/release/kaaribou/lektrico-holm)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2025.8%2B-03a9f4)

**Votre borne Lektrico (1P7K, 3P22K) dans Home Assistant, en local, sans la surcharger, avec sa carte et un délestage prêt à l'emploi.**

HOLM Lektrico remplace l'intégration Lektrico officielle. Elle parle à la borne par son **API locale** (JSON-RPC du micrologiciel) mais l'interroge **avec parcimonie**. Sur certaines bornes, l'interrogation intensive de l'intégration officielle (3 à 4 requêtes toutes les 10 secondes, connexions maintenues ouvertes, détection automatique) finit par bloquer la pile réseau de la borne. Elle disparaît alors du Wi-Fi jusqu'à une coupure de courant.

### En bref

- 🐢 **Économe** : 2 requêtes au plus par cycle, toutes les 30 s par défaut (réglable de 15 à 300 s). Une seule requête à la fois, et la connexion est refermée après chaque réponse.
- 🔁 **Données lentes en tourniquet** : une seule par cycle. Réglages de la borne toutes les 2 min (une puissance changée dans l'application Lektrico remonte vite), Wi-Fi et compteurs toutes les 5 min, courants système un cycle sur deux.
- 🛟 **Recul automatique** : si la borne répond mal, l'intervalle double à chaque échec (60, 120, 240 s… jusqu'à 5 min), puis revient à la normale dès qu'elle répond.
- 🙅 **Aucune détection automatique** : la borne n'est ajoutée qu'avec son adresse IP, quand vous le décidez.
- 🧩 **Toutes les entités** : état, mesures, défauts détaillés, courants système, Wi-Fi, compteurs, réglages et commandes.
- 🎴 **Carte HOLM Borne incluse**, déclarée automatiquement.
- 🔌 **Délestage** : deux automatisations prêtes à copier pour ne jamais dépasser votre abonnement.
- 🔗 **Compatible** avec les identifiants de l'intégration officielle : vos cartes et automatisations continuent de fonctionner.

---

## Installation

### Via HACS (recommandé)

1. HACS → menu ⋮ → **Dépôts personnalisés** → ajoutez `https://github.com/kaaribou/lektrico-holm`, catégorie **Intégration**.
2. Recherchez **HOLM Lektrico** et installez.
3. Redémarrez Home Assistant.

### Manuelle

Copiez le dossier `custom_components/lektrico_holm` dans le dossier `custom_components` de votre configuration, puis redémarrez Home Assistant.

## Configuration

> ⚠️ Supprimez d'abord l'intégration Lektrico officielle (et ignorez sa détection automatique). Deux intégrations qui interrogent la même borne doublent la charge.

Paramètres → Appareils et services → **Ajouter une intégration** → **HOLM Lektrico** :

- **Adresse IP de la borne** : réservez-lui une adresse fixe dans votre routeur.
- **Nom de l'appareil** : « Borne de recharge » par défaut.
- **Préfixe des entités** : `garage_borne_de_recharge` par défaut. Les entités s'appellent alors `sensor.garage_borne_de_recharge_etat`, `number.garage_borne_de_recharge_limite_dynamique`… Gardez le préfixe de vos anciennes entités pour que vos cartes et automatisations les retrouvent.

**Options** : intervalle d'interrogation (30 s par défaut).
**Reconfigurer** : changer l'adresse IP sans tout refaire.

## Entités

| Type | Entités |
|---|---|
| **Capteurs** | État, puissance, énergie de la session, énergie totale, temps de charge, température, courant, tension, courant de l'installation, raison de la limite ; en triphasé : courants et tensions L1 à L3 |
| **Diagnostic** | État IEC 61851, courant PWM, mémoire libre, temps de fonctionnement, courants système (charge autorisée, maximum, programme, température, puissance utilisateur), signal Wi-Fi, reconnexions Wi-Fi, adresse IP, requêtes envoyées, échecs de communication |
| **Compteurs** | Nombre de sessions, temps de charge total, énergie de la dernière session |
| **Défauts** | Erreur EV, limitation thermique, surchauffe, surintensité, erreur de comptage, sous-tension, surtension, différentiel (RCD), test du différentiel, diode EV, relais soudés, erreur de tension, erreur état F |
| **États** | Véhicule branché, en charge, en pause, dérogation active, erreurs actives, Wi-Fi connecté |
| **Réglages** | Authentification, verrou, programme de charge, mise à jour automatique, buzzer, redémarrage si Wi-Fi perdu, limite dynamique (0–32 A), limite utilisateur (6–32 A), puissance maximale, luminosité et atténuation de la LED |
| **Commandes** | Démarrer, arrêter, mettre en pause, reprendre, dérogation du programme, redémarrer |

Quelques entités avancées sont désactivées par défaut (MQTT, gestion d'énergie, couleurs LED, PWM précis, courant minimal du véhicule, courant d'installation, remise à zéro de l'énergie…). Activez-les depuis la page de l'appareil si besoin. Les données qu'un micrologiciel ne fournit pas sont détectées et ne sont plus demandées.

### Tableau de bord Énergie

Dans **Consommation individuelle d'appareils**, ajoutez `sensor.<préfixe>_energie_totale`, le compteur cumulé de la borne en kWh, et `sensor.<préfixe>_puissance` comme puissance instantanée.

## 🎴 La carte HOLM Borne

La carte est fournie avec l'intégration et déclarée automatiquement dans les ressources du tableau de bord. Si une ressource `holm-borne-card.js` existe déjà, l'intégration n'en ajoute pas une seconde.

```yaml
type: custom:holm-borne-card
entity: sensor.garage_borne_de_recharge_etat
name: Borne du garage
delestage_entity: automation.borne_delestage   # facultatif : bouton Délestage
```

- **Illustration animée** borne → câble → voiture selon l'état, puissance en grand.
- **Charge** :
  - mesures (courant, tension, énergie, durée, température, puissance maximale) ;
  - limite de charge en A et en kW, raison de la limite, limites autorisée, utilisateur, puissance et installation ;
  - boutons Démarrer, Arrêter, Pause, Reprendre, Dérogation, et Redémarrer avec confirmation.
- **Limite de charge** :
  - délestage actif : le curseur est verrouillé et piloté par l'automatisation ;
  - délestage coupé : réglage manuel au curseur ou par boutons rapides (6, 10, 16, 20, 25, 32 A, avec leur équivalent en kW).
- **Réglages** : tous les interrupteurs de la borne et les curseurs limite utilisateur, puissance maximale, courant minimal du véhicule et LED.
- **Statistiques** : énergie totale, sessions, temps de charge, dernière session, moyenne par session.
- **Diagnostic** : contrôles de défauts, signal Wi-Fi, santé de la liaison et courants internes.

Options : `name`, `delestage_entity`, `default_tab` (`charge`, `settings`, `stats`, `diag`), `show_settings`, `show_diagnostic`, `car_color` (couleur de la voiture, ex. `#4a5d70`), `phases` (`1` ou `3`, pour l'équivalent en kW), `voltage` (tension nominale, 230 par défaut). L'éditeur visuel est disponible.

La carte fonctionne aussi avec l'intégration Lektrico officielle : les entités sont retrouvées à partir de l'appareil de l'entité « État ».

## 🔌 Délestage : 2 automatisations à créer

Le délestage n'est pas activé par l'intégration : il faut **créer deux automatisations**. Elles sont prêtes dans [`examples/delestage.yaml`](examples/delestage.yaml). Pour chacune : Paramètres → Automatisations → Créer → ⋮ → **Modifier en YAML**, collez-la, adaptez-la, enregistrez.

Il vous faut un capteur de **puissance consommée au compteur**, en W (Linky/TIC, Ecojoko, Shelly EM…).

1. **Borne – délestage** module la limite dynamique pour ne pas dépasser votre abonnement :
   - elle n'agit que pendant une session de charge, et ne se déclenche pas quand aucune voiture n'est branchée ;
   - elle baisse immédiatement la limite si la maison consomme plus, et ne la remonte qu'après 60 s de stabilité (pas d'effet yo-yo) ;
   - elle met la charge en pause sous 6 A et la reprend à partir de 7 A ;
   - si le compteur ne répond plus depuis 5 min, elle plafonne la charge à 16 A ;
   - quand la voiture est débranchée, elle remet la borne à 32 A.
2. **Borne – délestage désactivé → 32 A** est un filet de sécurité : quand on coupe le délestage, la borne retrouve toute sa puissance au lieu de rester bridée, voire en pause à 0 A. **Laissez-la toujours activée.**

À adapter dans le fichier :

- `sensor.puissance_compteur` : votre capteur de puissance au compteur ;
- `p_max` : votre abonnement moins une marge (12 kVA → 11 500 W, 9 kVA → 8 500 W, 6 kVA → 5 500 W) ;
- `garage_borne_de_recharge` : le préfixe de vos entités ;
- `32` : le courant maximal de votre borne ou de votre installation.

Le bouton **Délestage** de la carte allume ou éteint la première automatisation (indiquez-la dans `delestage_entity`). Délestage coupé, vous réglez la limite à la main depuis la carte.

## FAQ

**La borne disparaît encore du réseau.** Vérifiez que l'intégration officielle est bien supprimée, que la page web de la borne n'est pas restée ouverte (elle s'actualise en continu), et augmentez l'intervalle dans les options. Le capteur « Échecs de communication » et le diagnostic téléchargeable aident à suivre la situation.

**La température diffère d'un dixième de l'application.** L'application Lektrico arrondit au degré. Le capteur et la carte affichent aussi des degrés entiers.

**Limite dynamique ou limite utilisateur ?** La limite utilisateur est votre plafond permanent (comme dans l'application). La limite dynamique est celle que pilotent les automatisations (délestage, recharge solaire) : 0 = pause. La borne applique la plus basse des deux.

---

Fait partie de **HOLM — Home Orchestration & Living Management** : la gestion et l'orchestration intelligente de la maison.

Les autres projets : [Volets HOLM](https://github.com/kaaribou/volets-holm) · [Climat HOLM](https://github.com/kaaribou/climat-holm) · [Carburant HOLM](https://github.com/kaaribou/carburant-holm) · [Commandes à la maison HOLM](https://github.com/kaaribou/commandes-holm) · [HOLM LaMetric](https://github.com/kaaribou/lametric-holm) · [HOLM My Menu](https://github.com/kaaribou/holm-mymenu) · [HOLM Navbar Card](https://github.com/kaaribou/holm-navbar-card) · [HOLM Climate Card](https://github.com/kaaribou/climate-card-holm) · [HOLM Music Card](https://github.com/kaaribou/holm-music-card) · [HOLM Sentinel Card](https://github.com/kaaribou/holm-sentinel-card) · [HOLM Security Card](https://github.com/kaaribou/holm-security-card) · [HOLM Recordings Card](https://github.com/kaaribou/holm-recordings-card) · [HOLM Covers Card](https://github.com/kaaribou/holm-covers-card) · [HOLM Power Flow Card](https://github.com/kaaribou/holm-power-flow-card) · [HOLM Energy Cards](https://github.com/kaaribou/holm-energy-cards) · [HOLM Radiator Card](https://github.com/kaaribou/holm-radiator-card) · [HOLM Floor Card](https://github.com/kaaribou/holm-floor-card) · [HOLM Ecojoko Card](https://github.com/kaaribou/holm-ecojoko-card) · [HOLM Smoke Card](https://github.com/kaaribou/holm-smoke-card) · [HOLM BG Card](https://github.com/kaaribou/holm-bg-card).

Licence MIT · Non affilié à Lektrico. · [☕ Offrir une bière](https://paypal.me/kaaribou)
