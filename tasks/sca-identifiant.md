# Identifiant « SCA-… » : où il s'affiche, à quoi il sert, ce que coûterait de le masquer

*11 oct. 2026, constat en lecture seule, RIEN modifié (consigne : ne pas toucher).*

## Où il s'affiche (écran ou document)

| Lieu | Fichier | Ce que voit l'utilisateur |
|---|---|---|
| Création d'un enfant : carte « Identifiant {app} » + pastille « Auto » | `src/screens/AjouterEnfantScreen.tsx:299–300` | `SCA-2026-FR-XXXXXX` généré sur l'appareil à l'ouverture de l'écran |
| Création : aperçu de la carte de l'enfant | `AjouterEnfantScreen.tsx:519` | idem, sous la classe et l'école |
| Création : message de succès | `AjouterEnfantScreen.tsx:161` | « Le carnet … est créé (identifiant SCA-…) » |
| Profil de l'enfant : pastille discrète sous l'en-tête | `src/screens/ProfilEnfantScreen.tsx:512` | `SCA-…` (gris, petite taille, icône empreinte) |
| Export PDF du carnet : badge d'identité | `src/services/pdfExport.ts:135` | `SCA-…` dans l'en-tête du document |
| Code de transfert à 18 ans (`SCA-TRANSFER-…`) | `src/services/rgpdService.ts:61`, `src/screens/rgpd/TransfertCodeScreen.tsx` | code de transfert du carnet, distinct de l'identifiant de l'enfant |

Côté base : `children.scolaria_id` (UNIQUE, défaut généré par le déclencheur `generate_scolaria_id`, `20260923140000_baseline.sql:498–551`), figé après création (trigger M30 `children_verrou_createur`). La création passe `p_scolaria_id` à `create_child()`.

## Sert-il à quelque chose à l'écran ?

**Non, pour l'utilisateur.** Aucune action ne le demande ni ne le consomme : pas de recherche par identifiant, pas de saisie, pas de partage, pas de support client qui s'en serve. Le seul usage technique est la contrainte d'unicité en base ; les clés réelles sont les UUID (`children.id`). Ce n'est ni l'identifiant national de l'élève (INE) ni un identifiant d'école : il n'a aucune valeur hors de l'application.

**Constats à signaler**
1. **Préfixe de marque dans une donnée figée** : « SCA » est un sigle du nom provisoire ; il est écrit en base à la création et ne change pas avec `NOM_APP` (le renommage laisserait des identifiants « SCA-… » ; le test `test:nom-en-dur` ne le voit pas : ce n'est pas un nom).
2. **Repli sur des valeurs de démonstration** : `ProfilEnfantScreen.tsx:388` affiche `child.scolaria_id || mock.scolariaId` ; si la colonne est vide, c'est un identifiant FICTIF (`SCA-2026-FR-0487xx`) qui s'affiche pour un vrai enfant. Même repli dans `childContext.ts`. À corriger avant tout vrai utilisateur (« Rien dans l'app qui ne soit vrai aujourd'hui »).
3. **Double génération** : l'app génère un identifiant sur l'appareil (aléatoire, 6 chiffres) et la base sait aussi le générer : deux sources, un risque de collision sur la contrainte UNIQUE (faible, mais réel à grande échelle).
4. **Le libellé « Identifiant {app} » est traduit** (`scolariaId` dans 10 langues) et suit le nom ; la valeur, non.

## Ce que coûterait de le masquer

- **Écran** (création : carte + aperçu + message ; profil : pastille ; PDF : badge) : **faible**, 4 retraits d'affichage dans 3 fichiers + la clé `scolariaId` des 10 langues et les `scaText`/`idCard`/`previewId` des styles. Aucune migration, aucun effet sur les données, les tests ou le RLS.
- **Données** : on peut laisser la colonne telle quelle (invisible, unique, remplie par le déclencheur). La supprimer = migration (hors lot) ; non nécessaire.
- **Risque** : nul pour l'utilisateur ; le seul « coût » est de perdre la carte « Auto » qui donne un air d'officiel à la création (décision de produit, pas technique).
- **Recommandation** (à décider, non appliquée) : masquer partout, supprimer le repli sur les valeurs fictives, laisser la colonne ; le code de transfert `SCA-TRANSFER-` est un autre sujet (il est affiché parce qu'il sert) : à renommer avec le reste des identifiants techniques (tasks/renommage.md).
