# Politique de confidentialité (page D5) — règles à y écrire

> Notes de travail pour rédiger la page D5 (politique de confidentialité, mentions légales, repli des liens ouverts
> sur ordinateur). Chaque règle ci-dessous est APPLIQUÉE par le code (référence entre crochets) ; ne rien écrire dans
> la page qui ne soit vrai au moment de la publication. Nom de l'app : `NOM_APP` (nom définitif à venir).

## Principe
Le carnet appartient à l'enfant, pas au compte qui l'a rempli.

## Droit à l'effacement [M25, décision D6 du 27 sept 2026]
- Demande depuis l'app (Famille & paramètres › Effacer des données), pour un carnet ou pour le compte.
- Exécution **30 jours** après la demande ; **annulable** jusque-là. Dès la demande, les données concernées ne sont
  plus visibles dans l'app et le compte est désactivé (seules actions possibles : annuler, se déconnecter).
- Effacer un **carnet** : seulement par son **unique** responsable. Tout est supprimé : années, apprentissages, mots,
  signatures, ajouts, photos et documents, messages, alertes.

## Suppression d'un compte (décision du 28 sept 2026)
| Donnée du compte supprimé | Sort |
|---|---|
| Carnets dont il est le **seul** responsable | effacés en entier |
| Carnets gardés par un **autre** responsable | conservés, rattachés à cet autre responsable |
| Ajouts au carnet **partagés avec le foyer** (photos, documents, jalons) | **conservés**, auteur affiché « Ajouté par un ancien responsable » |
| Ajouts **privés** | supprimés, fichiers compris |
| **Signatures** de mots | **conservées** : « Signé par un responsable (compte supprimé) le [date] » ; un mot signé ne repasse jamais « à signer » |
| Messages du **fil famille** avec l'enseignant | **conservés**, auteur « Ancien responsable » |
| Conversations **privées** avec l'enseignant | supprimées |
| Réponses aux mots (autorisation, participation) | supprimées (comportement actuel — voir question ouverte) |
| Conversations Aria, profil, agenda personnel, alertes | supprimés |
| Compte de connexion | supprimé |
Aucun nom ni adresse n'est conservé ; un registre garde seulement la date de la demande et de l'exécution.

## Départ d'un responsable (il se retire d'un carnet)
- Ses ajouts **privés** à ce carnet sont supprimés ; ses ajouts « foyer » restent au carnet [M25, déclencheur].
- Il perd tout accès au carnet [décision du 27 sept, M23].

## Export (portabilité) [L7b]
- Archive .zip du carnet de l'enfant affiché : données (JSON), photos et documents, notice en français.
- Contient ce que le compte qui exporte peut voir ; jamais ce qui est privé à l'autre responsable.

## Hébergement et Aria
Formulation validée le 25 sept 2026 : `FORMULATION_HEBERGEMENT_ARIA` (src/constants/textesLegaux.ts), à reprendre telle quelle.

## Questions ouvertes (à trancher avant publication)
- Réponses aux mots (autorisation / participation) d'un compte supprimé : effacées aujourd'hui ; les garder comme les signatures ?
- Événements d'agenda créés par le compte supprimé pour l'enfant : effacés aujourd'hui.
- Mode « une signature suffit » : l'app demande quand même à chaque responsable de signer en son nom (sauf mot signé par un compte supprimé).
