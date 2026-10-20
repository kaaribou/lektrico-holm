# Changelog

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
