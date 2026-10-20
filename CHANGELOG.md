# Changelog

## 1.1.0

- **Pilotage intégré de la charge**, sans automatisation (Options → Pilotage de la charge) :
  - sélecteur **Mode de charge** : Heures creuses, Maintenant (repasse en Heures creuses au débranchement), Arrêt ;
  - **heures creuses** lues depuis une entité au choix (capteur de tarif, interrupteur…) ;
  - **délestage** intégré (interrupteur dédié) : la limite suit la puissance du compteur, baisse immédiate, hausse au plus une fois par minute, pause sous 6 A, reprise à partir de 7 A, 16 A au plus si le compteur ne répond plus ;
  - **courant de charge** réglable et capteur **Pilotage** qui explique la décision en cours.
- Carte HOLM Borne 2.3 : trois boutons de mode, courant de charge avec raccourcis, état du pilotage ; le bouton Délestage commande l'interrupteur intégré.
- Les automatisations d'exemple de la version 1.0 sont remplacées par le pilotage intégré.

## 1.0.0

- Première version : borne Lektrico (1P7K, 3P22K) en local, interrogation économe pensée pour ne pas surcharger la borne.
- 2 requêtes au plus toutes les 30 s (réglable de 15 à 300 s), connexion refermée après chaque réponse, une seule requête à la fois.
- Données lentes en tourniquet, une par cycle : réglages toutes les 2 min, Wi-Fi et compteurs toutes les 5 min, courants système un cycle sur deux.
- Recul automatique : l'intervalle double à chaque échec jusqu'à 5 min, puis revient à la normale.
- Pas de détection automatique : ajout manuel par adresse IP, changement d'adresse via « Reconfigurer ».
- Près de 70 entités : état, mesures, défauts, courants système, Wi-Fi, compteurs, réglages, commandes, et le suivi des requêtes envoyées.
- Identifiants d'entités compatibles avec l'intégration officielle (préfixe configurable).
- Carte **HOLM Borne** incluse et déclarée automatiquement (sans doublon si elle est déjà installée) : onglets Charge, Réglages, Statistiques et Diagnostic, limites en A et en kW, réglage manuel quand le délestage est coupé.
- Exemple de délestage en deux automatisations (`examples/delestage.yaml`), actives uniquement pendant une charge.
