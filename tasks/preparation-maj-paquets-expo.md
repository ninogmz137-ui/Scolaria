# Préparation (SANS EXÉCUTER) — mise à jour des 19 paquets Expo

*8 octobre 2026. Complète `tasks/plan-maj-paquets-expo.md` (liste des paquets, sauts, risques) : ceci est le MODE D'EMPLOI de l'exécution, à lancer sur le
« go » de l'utilisateur. **Rien de ce document n'a été exécuté** : `package.json`, `package-lock.json` et `node_modules` sont intacts, aucune branche n'est créée.*

## 1. Journal de react-native-pager-view lu et résumé

Sources : pages de version GitHub de `callstack/react-native-pager-view` (lues le 8 oct.) et dates de publication npm.

| Version | Publiée | Contenu |
|---|---|---|
| **8.0.0** (version épinglée par le SDK 55) | 17 déc. 2025 | iOS entièrement réécrit en **SwiftUI** (API publique inchangée). Changement de majeure : les animations de navigation entre pages non adjacentes **défilent désormais à travers les pages** au lieu d'un simple glissement. Correctif : sur-défilement du hook `usePagerView`. |
| **8.0.1** (version du dépôt, `^8.0.1`) | 11 avr. 2026 | **UN seul correctif** : l'événement `onPageScroll` n'émet plus un décalage nul à l'arrêt (« idle »), ce qui faisait **sauter l'indicateur** (PR n° 1076). Aucun changement cassant. |
| 8.0.2 · 8.0.3 · 8.0.4 | 20 mai · 3 juil. · 10 juil. 2026 | (notes non lues, sauf 8.0.4 : iOS, propagation des marges de zone sûre aux vues enfants). Plus récentes que ce que le SDK 55 épingle. |
| 9.x (hors sujet) | à partir d'août 2026 | majeure suivante (Jetpack Compose côté Android) : NE PAS y aller dans ce lot. |

**Comment l'app s'en sert** : le dépôt n'importe PAS `react-native-pager-view` directement ; il est le pair de `@react-navigation/material-top-tabs` (7.4.24 →
`react-native-tab-view` 4.3.0, pair `react-native-pager-view >= 6.0.0`) qui porte les 4 onglets (Accueil, Suivi, Agenda, Messages) et leur glissement.
Les deux versions, 8.0.0 et 8.0.1, satisfont ce pair.

**Conséquence de la rétrogradation (8.0.1 → 8.0.0)** : on retrouve le défaut corrigé par 8.0.1 (saut de position/indicateur quand le pager s'arrête) ;
la gravité dépend de ce que notre barre du haut dessine à partir de cette position. [UNCLEAR : je n'ai pas lu ce que `TopBar` fait de la position défilée ;
le défaut ne peut se constater que sur appareil.]

**Recommandation (à valider par l'utilisateur)** : **B — garder 8.0.1** et l'inscrire dans `expo.install.exclude` de `package.json` avec la raison (un
correctif sans changement cassant, même base SwiftUI que 8.0.0), à réévaluer à la prochaine mise à jour du SDK. Option A (suivre le SDK, 8.0.0) : à ne
choisir que si le tour sur appareil ne montre aucun saut ; dans ce cas, comparer glissement et barre du haut sur le Redmi avant/après.

## 2. Branche locale et ordre des étapes

**Branche** : `maj-expo-55-correctifs`, locale seulement (jamais poussée ; aucun worktree), créée depuis `main` PROPRE et poussé. Avant : `git tag avant-maj-expo`
(étiquette locale, retour arrière instantané). Un seul commit pour `package.json` + `package-lock.json` (ne rien mélanger avec un autre changement).

| # | Étape (quoi, commande) | Porte de sortie (sinon STOP et retour arrière) |
|---|---|---|
| 0 | **État de référence** : `git status` propre, HEAD = origin/main ; rejouer et noter les résultats de référence du § 3 ; `git switch -c maj-expo-55-correctifs` | tout vert avant de commencer |
| 1 | **Lire sans rien changer** : `npx expo-doctor` (déjà : 19/20) et `npx expo install --check` en répondant NON à la proposition de correction (liste seulement) [UNCLEAR : comportement sans console interactive non vérifié ; si la commande applique sans demander, ne PAS la lancer ainsi] | la liste = les 19 paquets du plan, ni plus ni moins |
| 2 | **Décision pager-view** (§ 1) : B (exclusion) ou A | décision de l'utilisateur écrite dans le todo |
| 3 | **Appliquer** : `npx expo install --check` (oui) ou `npx expo install <paquets@versions du SDK>` ; **jamais** `--force` ni `--legacy-peer-deps` ; `git diff --stat` : seuls `package.json` et `package-lock.json` changent ; `package.json` : exactement les lignes des 18 paquets (+ l'exclusion de pager-view si B) | `npm ls` sans « invalid » ni ERESOLVE ; `npx expo-doctor` : **20/20** (ou 19/20 si B, avec l'exclusion déclarée) |
| 4 | `npx tsc --noEmit` | 0 erreur |
| 5 | **Tests purs, configuration et bundle** (§ 3.1 et 3.2) | mêmes comptes qu'à l'étape 0 |
| 6 | **Filet base locale** (§ 3.3) : `npx supabase@latest db reset --local`, suites SQL, audit, e2e photo | mêmes comptes ; aucune base de Paris n'est en jeu |
| 7 | `runtimeVersion` (`app.config.js`, ligne 98, `'1.0.0'` fixe) → `'1.0.1'` : **commit séparé**, décision écrite (aucun OTA publié aujourd'hui ; sans ce changement, un futur OTA irait aussi aux anciens builds) | `expo config` avec et sans variante : seules les différences voulues |
| 8 | **Commit** : `package.json` + verrou (un seul), puis `runtimeVersion` ; **PAS de push de la branche** | `git status` propre |
| 9 | **Client de développement** : `npx eas-cli@latest build --platform android --profile development --no-wait` (« go build » requis ; quota Android 1/15) ; l'utilisateur l'installe ; **aucun test sur le téléphone avant son « build terminé »** | build vert, version affichée du client |
| 10 | **Tour sur le Redmi** (§ 4), outil d'appuis gardé | tout conforme |
| 11 | **Build de démo** (`--profile demo`), avec retrait du schéma `exp+scolaria` si décidé (todo) ; contrôle du manifeste final | manifeste : aucun schéma, aucun nom de marque affiché |
| 12 | **Fusion** dans `main` en avance rapide (`git merge --ff-only`), `git push origin main` simple, suppression de la branche locale, todo et primer | HEAD = origin/main |

**Retour arrière** : avant l'étape 12, `git switch main` puis `git branch -D maj-expo-55-correctifs` et `npm ci` (le verrou de `main` rétablit `node_modules`) ;
après l'étape 12, `git revert` du commit unique. Aucune migration de base n'est en jeu ; les builds déjà produits restent installables.

## 3. Tests à rejouer (références du 8 oct., à retrouver à l'identique)

**3.1 Purs** : `test:photo-annee` 26 · `test:photo-enfant` 54 · `test:zones-tactiles` 13 · `test:entete` 5 · `test:categories` 29 · `test:carnet-vide` 38 · `test:export` 21 ·
`test:appui-redmi` 34 · et tous les autres `test:*` sans base de package.json (`exif`, `photo`, `erreurs`, `mots`, `roles-inscription`, `invitation-expiree`,
`role-profil`, `profil`, `liens-auth`, `email-invitation`, `journaux`, `emergency`, `garde-hote`, `garde-destination`, `rotation-sauvegardes`).
**3.2 Configuration et bundle** : `npx tsc --noEmit` · `npx expo config` avec et sans `APP_VARIANT=demo` (différences attendues : nom, scheme, package, libellés iOS,
URL et clé Supabase, `updates`, `APP_VARIANT`, `APP_LIBELLE`) · `test:bundle-prod` 12/12 · `test:variante-demo` · `test:nom-affiche-demo` 119/119 (serveur de démo
sur le port 8083, puis arrêt et cache Metro vidé) · `npx expo-doctor`.
**3.3 Filet base locale** (aucun changement de base prévu) : 21 suites SQL (`supabase/tests/*.sql`) · `audit:securite-local` 670/0 · `test:parcours-complet-local` 45/45 ·
`test:photo-annee-local` 62 · `test:photo-enfant-local` 47 · `test:effacement-local` 31 · `test:ancienne-app-base-m36-local` 14 · `test:photo-annee-sans-colonne-local` 7 ·
restauration locale 12 (puis `db reset --local`).

## 4. Écrans et gestes à vérifier sur appareil (client reconstruit, démo puis compte réel)

| Zone | À vérifier | Paquet visé |
|---|---|---|
| Démarrage | écran d'attente (symbole sur blanc), polices Figtree, pas de clignotement ; mode démo ET compte réel | splash-screen, font, constants |
| **Glissement entre onglets** | glisser Accueil ↔ Suivi ↔ Agenda ↔ Messages, aller-retour rapide, sauts de plusieurs onglets ; pastille active de la barre du haut sans saut à l'arrêt | **pager-view**, react-native |
| Accueil | dégradé de fondu (couleur de l'enfant, 3 enfants en démo), barre d'état claire, en-tête (photo, pastille d'année), carte de l'assistant, défilement | linear-gradient, reanimated / worklets, status-bar |
| **Photo de l'enfant** (compte réel, Evan) | prendre une photo, choisir dans la galerie, remplacer, supprimer ; recadrage carré ; refus de permission ; relance | image-picker, image-manipulator, file-system |
| **Export** | export du carnet (zip), partage système, LISEZMOI et photos par année dans l'archive | file-system, sharing |
| Ajouter au carnet | photographier, importer une capture, ajouter un PDF, noter une première fois | image-picker, document-picker |
| Barre du bas / du haut | preuve d'appuis STAB-2 (`preuve-zones-tactiles-redmi.mjs`, outil gardé) ; recherche ; sélecteur d'enfant | react-native |
| Assistant, Messages, Agenda | écrans et saisie (clavier), historique | react-native |
| Famille & paramètres, À propos, Effacement | écrans complets | tous |
| Impression / PDF | export PDF d'un bulletin ou d'une note si accessible | print |
| Langue | changement de langue (10), arabe (sens de lecture) | localization |
| Notifications | AUCUNE demande d'autorisation au démarrage (rien n'est implémenté) | notifications |
| Liens | ouverture d'un lien de connexion / invitation (schéma), retour dans l'app | constants, dev-client, linking |
| Démo | APK de démo (`com.scolaria.app.demo`) installé À CÔTÉ du client : libellé « Carnet Démo », écrans, aucun accès réseau | constants, updates |

## 5. Conditions d'arrêt

Un seul test de référence qui change de résultat sans explication ; `npm ls` en erreur ; `expo-doctor` qui signale un nouveau problème ; un défaut de glissement ou de
photo sur le Redmi ; tout écart entre les 19 paquets annoncés et la liste réelle. Dans tous les cas : retour arrière (§ 2) et rapport, jamais de contournement.
