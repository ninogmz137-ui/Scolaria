# Plan — mise à jour des 19 paquets Expo (SANS CODE : ni package.json, ni verrou touchés)

*8 octobre 2026. Décision du 7 oct. : l'échec d'`expo-doctor` est accepté pour le build de démo ; cette mise à jour est BLOQUANTE avant le premier
build pour de vrais utilisateurs (TestFlight). Lot séparé : `npx expo install --check`, tsc, tous les tests, rebuild du client de développement,
tour complet sur le Redmi. Les versions ci-dessous viennent de `npx expo-doctor` (7 oct.) et de la lecture de `package.json` / `node_modules`
(lecture seule) : « SDK 55 identique », seules des versions de CORRECTIF changent.*

## 1. Liste des paquets et sauts de version

| Paquet | Installé (= package.json) | Attendu par le SDK 55 | Saut | Natif ? |
|---|---|---|---|---|
| expo | ~55.0.8 | ~55.0.31 | +23 correctifs | oui (cœur) |
| react-native | 0.83.2 | 0.83.10 | +8 correctifs | oui |
| expo-dev-client | ~55.0.18 | ~55.0.40 | +22 | oui (lanceur et menu de développement) |
| expo-updates | ~55.0.15 | ~55.0.33 | +18 | oui |
| expo-notifications | ~55.0.13 | ~55.0.27 | +14 | oui |
| expo-file-system | ~55.0.11 | ~55.0.26 | +15 | oui |
| expo-image-picker | ~55.0.13 | ~55.0.24 | +11 | oui |
| expo-sharing | ~55.0.14 | ~55.0.24 | +10 | oui |
| expo-splash-screen | ~55.0.12 | ~55.0.25 | +13 | oui |
| expo-print | ~55.0.9 | ~55.0.19 | +10 | oui |
| expo-localization | ~55.0.9 | ~55.0.19 | +10 | oui |
| expo-document-picker | ~55.0.9 | ~55.0.17 | +8 | oui |
| expo-constants | ~55.0.9 | ~55.0.17 | +8 | oui (config embarquée) |
| expo-linear-gradient | ~55.0.9 | ~55.0.18 | +9 | oui |
| expo-blur | ~55.0.10 | ~55.0.18 | +8 | oui |
| expo-font | ~55.0.4 | ~55.0.8 | +4 | oui |
| expo-status-bar | ~55.0.4 | ~55.0.6 | +2 | peu |
| react-native-worklets | ^0.7.2 | 0.7.4 | +2 | oui |
| **react-native-pager-view** | **^8.0.1** | **8.0.0** | **−1 (RÉTROGRADATION)** | oui |

Hors liste (déjà conformes, non touchés) : `expo-image-manipulator ~55.0.21`, `react 19.2.0`, `react-native-reanimated 4.2.1` (compatible avec les
worklets 0.7.x : à revérifier par `expo-doctor` après la mise à jour), `@supabase/supabase-js ^2.99.3` (hors SDK Expo).

**Point d'attention : pager-view (journal LU le 8 oct., voir `tasks/preparation-maj-paquets-expo.md` § 1).** Le SDK épingle 8.0.0 alors que le dépôt a `^8.0.1`. 8.0.1 ne contient
qu'UN correctif (l'événement `onPageScroll` n'émet plus un décalage nul à l'arrêt, ce qui faisait sauter l'indicateur) ; le pager porte les 4 onglets
via `@react-navigation/material-top-tabs`. Rétrograder réintroduirait ce défaut. Recommandation : garder 8.0.1 et l'inscrire dans `expo.install.exclude` avec
la raison (décision de l'utilisateur).

## 2. Ce qui risque de casser (par ordre de sensibilité pour CE projet)

1. **expo-image-picker (+11) et expo-file-system (+15)** : toute la photo de l'enfant en dépend (recadrage carré 1:1, `exif: false`, lecture des octets
   par `new File(uri).bytes()`, export zip, `File.downloadFileAsync`). Une différence de comportement casserait l'ajout de photo ou l'export sans
   que les tests purs la voient. → test sur appareil obligatoire (voir § 3).
2. **expo-constants (+8)** : la configuration de la variante démo (`extra.APP_VARIANT`, libellé, URL Supabase vide) passe par là. → `expo config`
   avec et sans variante, `test:variante-demo`, `test:nom-affiche-demo`, `test:bundle-prod`.
3. **expo-updates (+18)** : la variante démo désactive les mises à jour (`updates.enabled = false`) ; la version normale garde l'URL EAS Update.
   `runtimeVersion` est une chaîne FIXE (`'1.0.0'`, `app.config.js` ligne 98) : changer le natif ne change PAS la version d'exécution. Risque inverse
   de ce qu'on croit : une mise à jour OTA publiée plus tard pour `1.0.0` serait envoyée aussi aux anciens builds (natif d'avant la mise à jour des
   paquets) → JavaScript incompatible avec leur natif. → au moment de cette mise à jour, passer `runtimeVersion` à `1.0.1` (ou à une politique par
   empreinte) ; aucun OTA n'est publié aujourd'hui, donc pas d'urgence, mais à décider AVANT le premier OTA.
4. **expo-dev-client (+22)** : le client de développement doit être RECONSTRUIT (voir § 4) ; un ancien client avec un nouveau JavaScript est
   « Incompatible native modules ».
5. **react-native-pager-view (−1)** : navigation (voir ci-dessus) ; **react-native-worklets / reanimated** : animations (fondu d'en-tête, cartes) ;
   **expo-linear-gradient (+9)** : le fondu de l'Accueil est un dégradé précis (10 arrêts) → `test:entete` + capture.
6. **expo-font (+4), expo-splash-screen (+13), expo-status-bar (+2)** : démarrage (polices Figtree, écran d'attente, barre d'état claire de l'Accueil).
7. **expo-notifications (+14)** : aucune notification n'existe (NON IMPLÉMENTÉ) ; vérifier seulement l'absence de demande d'autorisation au démarrage
   et la permission `POST_NOTIFICATIONS` du manifeste (déjà présente).
8. **expo-sharing / expo-print / expo-document-picker / expo-localization / expo-blur** : export (partage du zip), impression, import de documents,
   langue ; faible risque, mais à parcourir.
9. **expo 55.0.8 → 55.0.31, react-native 0.83.2 → 0.83.10** : correctifs seuls ; risque faible mais **tout le natif change** (reconstruction obligatoire).
   Le CLI et la configuration Metro peuvent changer : `expo start --web` (utilisé par `test:nom-affiche-demo`) doit être rejoué.

## 3. Tests à rejouer (dans cet ordre ; un échec = arrêt et retour arrière)

1. `npx expo install --check` en LECTURE d'abord (liste), puis, après validation de ce plan : `npx expo install --check` pour appliquer (modifie
   package.json et le verrou : un commit SEUL, `package.json` + `package-lock.json`, avant toute autre chose) ; `npx expo-doctor` : 20/20 attendu.
2. `npx tsc --noEmit`.
3. Tests purs : `test:photo-annee`, `test:photo-enfant`, `test:zones-tactiles`, `test:entete`, `test:categories`, `test:carnet-vide`, `test:export`,
   `test:exif`, `test:photo`, `test:mots`, `test:erreurs`, `test:appui-redmi`, etc. (tous les scripts `test:*` de package.json qui ne demandent pas de base).
4. Configuration : `npx expo config` avec et sans `APP_VARIANT=demo` (seules les différences voulues), `test:variante-demo`, `test:bundle-prod` (12/12),
   `test:nom-affiche-demo` (serveur de démo sur le port 8083 d'abord, puis cache Metro vidé), `test:garde-hote`.
5. Base locale : suites SQL (21 fichiers), `audit:securite-local` (670/0), `test:parcours-complet-local`, `test:photo-annee-local`,
   `test:photo-enfant-local`, `test:effacement-local`, `test:ancienne-app-base-m36-local`, `test:restauration-photo-annee-local` (le dépôt n'a pas de
   changement de base ici : ces tests servent de filet, pas de preuve nouvelle).
6. **Sur le Redmi (client de développement reconstruit, outil d'appuis gardé, premier plan vérifié)** : démarrage à froid (polices, écran d'attente),
   glissement entre onglets (pager), fondu de l'Accueil (dégradé), top bar et bottom bar (`preuve-zones-tactiles-redmi.mjs`, STAB-2), **photo : prendre,
   choisir dans la galerie, remplacer, supprimer** (compte réel de l'utilisateur, sur Evan), **export du carnet (zip) et partage**, ajout d'un
   document (Ajouter au carnet : photographier, capture, PDF), recherche, Aria (écran, historique), mode démo complet, Famille & paramètres.
7. `test:bundle-prod` + `expo config` une dernière fois sur le commit final, puis le build de démo (§ 4).

## 4. Reconstruction

- **Client de développement** : `npx eas-cli@latest build --platform android --profile development` (APK, distribution interne) ; installation par
  l'utilisateur (je n'installe ni ne désinstalle rien) ; aucun test sur le téléphone avant son « build terminé ».
- **Build de démo** : `--profile demo` (le natif change aussi pour la démo ; le schéma `exp+scolaria` à retirer au même moment : voir todo).
- **Quota** : 2 builds Android (Free : 15 par période, 1 utilisé le 7 oct.). **iOS** : aucun build encore ; la mise à jour doit précéder le premier
  build TestFlight (c'est l'objet du « BLOQUANT »).
- **Retour arrière** : le commit unique `package.json` + verrou se défait par `git revert` ; les builds déjà produits restent installables.
  Aucune migration de base n'est en jeu.

## 5. Estimation et ordre

- 1 j : mise à jour, doctor, tsc, tests purs et de configuration, base locale (filet).
- 0,5 j : lecture de la rétrogradation du pager, décision (rétrograder ou exclure).
- 0,5 j : reconstruction (file d'attente EAS en priorité basse : prévoir des heures d'attente) puis tour complet sur le Redmi.
- **Ordre** : après la validation de ce plan et avant tout autre lot qui touche au natif ; jamais en même temps que M37 ni qu'un cycle Paris.
- **Dépendances** : l'utilisateur doit être disponible pour installer le client reconstruit et faire les gestes photo sur son compte réel.
