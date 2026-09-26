# B4 — Messagerie : décisions validées (26 sept 2026)

> Documentation uniquement (file de réserve R1). **Aucun code** dans ce lot.
> Référence composants : COMPONENTS.md §6 (Messages) et §7 (Card message), mis à jour en même temps.

## 1. Structure de l'onglet
- L'onglet garde son nom : **« Messages »**.
- Segmented en tête : **« Général · [prénom de l'enfant] »** (ex. « Général · Lucas »).
- **Général par défaut** ; on revient ensuite au **dernier segment consulté**.

## 2. Segment « Général » : le collectif
- Tout ce qui s'adresse à un groupe : classe, école, mairie.
- Mots à signer, avec les **statuts de signature par responsable**.
- Liste « À prévoir » en **pastilles** (pique-nique, casquette…).
- **Carte « À traiter »** en tête : c'est la **seule carte de l'écran**.
  - Bouton **« Signer »**, avec **confirmation obligatoire**.
  - Statuts par responsable : « Sophie ✓ · Vous ».

## 3. Segment « [Prénom] » : ce qui concerne seulement cet enfant
Règle de visibilité **par FOYER** :
- **Responsables du même foyer** : un **fil famille partagé** avec l'enseignant ; chaque message affiche son **auteur**.
- **Responsables de foyers différents** : **un fil par foyer** ; aucun ne voit les réponses de l'autre.
- **Absences** : dans ce segment.

### Côté enseignant
- Destinataires : **« Tous les représentants »** par défaut. C'est le réglage obligatoire par défaut.
- Option **« Un seul parent »** : fil **individuel**, invisible pour l'autre responsable, **même dans le même foyer**.

### Côté parent
- Son message va au **fil famille** par défaut.
- Option **« Seulement moi »**.

### Mentions
- **« Envoyé aussi à [prénom] »** quand le message a été reçu aussi par l'autre foyer.
- **Un mot à signer reste UN seul mot**, avec ses statuts visibles des deux côtés (jamais dupliqué par foyer).

## 4. Liste « à plat », façon X
- Avatar **44 px** · nom + date · aperçu sur **une ligne**.
- **Gras si non lu** + **point indigo**.
- Séparateurs : **à trancher sur le Redmi** (capture avec et sans). **Sans séparateur par défaut**, marge verticale ~**14 px**.
- Barre : **recherche en pill pleine largeur** + menu **« Tout ⌄ »** (Tout · Non lus · À signer · Tout marquer comme lu).

### Supprimés de la liste
- Bandeau « 1 mot à signer », tout rouge, résumé Aria, rôle de l'expéditeur, tags de catégorie.
- **Expéditeur lisible** : « Direction », « Mairie · Cantine ». **Jamais de code administratif.**

## 5. Notifications (leçons tirées de Beneylu)
- **Prénom de l'enfant + contenu utile** dans la notification.
- La notification ouvre **exactement l'élément** concerné.
- Élément retiré : **message clair** (« Mme Dupont a retiré ce devoir »), jamais d'erreur.
- Une **modification ne renvoie pas** de nouvelle notification.

## 6. Hors périmètre de B4 (à trancher en B4b)
- **Historique du fil famille quand un parent quitte le foyer** : garder la lecture de l'historique ? le retirer ? le partager ?

## 7. Déjà noté pour B4
- Les **mots importés par la famille** (carnet_items, catégorie « mot », lot B5) s'affichent dans **Général** (décision B4a du 26 sept 2026, remplace « segment [prénom] »), avec la ligne source « Importé par vous » ; « Visible par vous seul » respecté.
- Le ✏️ de la bottom bar ouvre aujourd'hui « Écrire à un enseignant » et « Signaler une absence » (masqués sans enseignant rattaché) ; B4 le raccordera à la rédaction réelle.
