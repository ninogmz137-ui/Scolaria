# Enquête iOS sans compte Apple — l'app peut-elle tourner dans Expo Go sur un iPhone ? (4 oct 2026)

Rapport seulement : aucun compte créé, aucun achat, rien d'irréversible, aucune modification du projet.

## 1. Réponse courte
**Techniquement oui (rien ne bloque côté code) ; en pratique, ça dépend d'un seul fait que je ne peux pas vérifier d'ici : la version d'Expo Go disponible aujourd'hui sur l'App Store de ton iPhone.** Le projet est en **SDK 55** ; Expo Go sur iPhone n'ouvre que **la version de SDK qu'il embarque** (un seul SDK à la fois sur l'App Store).

## 2. SDK du projet et d'Expo Go
- Projet : `expo ~55.0.8`, `react-native 0.83.2`, `react 19.2.0` (SDK **55**).
- Expo Go (sources : changelog Expo de mai 2026, [expo-go-and-app-store-may-2026](https://expo.dev/changelog/expo-go-and-app-store-may-2026) et [sdk-56](https://expo.dev/changelog/sdk-56)) : au 4 mai 2026 l'App Store proposait Expo Go pour le **SDK 54** ; la version **SDK 55** y était « en attente d'approbation d'Apple, sans échéance » ; le **SDK 56** (sorti le 21 mai 2026) n'est **ni sur l'App Store ni sur Google Play**. Ces informations ont 5 mois : **l'état d'aujourd'hui est à lire sur ton iPhone** (voir §5). Je ne peux pas le déduire.
- **CORRECTION (4 oct, sur ta remarque) : l'Expo Go de l'App Store s'arrête au SDK 54** (doc Expo : « Expo Go on the Apple App Store stops at SDK 54 »). Le projet est en SDK 55 : **l'Expo Go de l'App Store ne l'ouvrira pas** ; ma phrase « le SDK 55 y était en attente d'approbation » est devenue sans objet, et le « feu vert si SDK 55 » du §5 est abandonné.
- Voies pour un iPhone physique en SDK 55 : `eas go` (ta propre copie d'Expo Go via TestFlight) **exige l'Apple Developer Program (payant)** (doc Expo, relue le 4 oct) ; l'Expo Go « simulateur » ne tourne que sur un **Mac** avec Xcode. **Voie sans compte payant (indiquée par toi) : `sign.expo.dev`** — Apple ID gratuit, certificat d'environ 7 jours, installation par USB depuis le navigateur. **Confirmée le 4 oct** sur la page d'Expo [sign.expo.dev/how-it-works](https://sign.expo.dev/how-it-works) : Apple ID gratuit (« personal team »), certificat d'environ 7 jours, installation par USB depuis une page web (WebUSB, tout s'exécute côté navigateur). **Précision sur tes sources :** la page de doc « [Project is incompatible with this version of Expo Go](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/) » ne recommande PAS sign.expo.dev (relue le 4 oct : pour un iPhone physique en SDK 54 et plus, elle ne cite que `eas go` + TestFlight, qui exige l'Apple Developer Program) ; la voie gratuite repose donc sur la seule page sign.expo.dev. **Reste invérifiable par moi :** que WebUSB fonctionne sur ton navigateur et ton PC Windows (navigateur Chromium requis, pilote Apple/iTunes, iPhone déverrouillé et « Se fier à cet ordinateur »), et que la copie installée soit bien en SDK 55 : à constater à l'essai. Aucun identifiant Apple ne passe par moi : la saisie se fait par toi, dans le navigateur de ton PC et sur l'iPhone.

## 3. Modules natifs : rien ne bloque
J'ai comparé chaque dépendance du projet à `node_modules/expo/bundledNativeModules.json` (la liste de ce qu'embarque Expo Go pour ce SDK). **Tous les modules natifs sont embarqués** : `react-native-reanimated 4.2.1` + `react-native-worklets 0.7.2`, `react-native-svg 15.15.3`, `react-native-screens`, `react-native-safe-area-context`, `react-native-pager-view`, `@react-native-async-storage/async-storage`, `expo-image-picker`, `expo-document-picker`, `expo-file-system`, `expo-print`, `expo-sharing`, `expo-notifications`, `expo-linear-gradient`, `expo-blur`, `expo-localization`, `expo-font`, `expo-splash-screen`, `expo-status-bar`, `expo-constants`, `expo-updates`, `expo-system-ui`, `@react-native-community/slider`, `@react-native-masked-view/masked-view`.
- `expo-image-manipulator` : projet `~55.0.21`, Expo Go `~55.0.11` — écart de correctif, même API, aucun blocage attendu (la version native est celle d'Expo Go).
- `expo-intent-launcher` : API Android (ouverture d'un fichier) ; sans effet sur iOS (le chemin iOS passe par le partage / la visionneuse).
- Hors liste mais **JavaScript pur** (donc sans module natif) : `@react-navigation/*`, `@supabase/supabase-js`, `nativewind` + `react-native-css-interop`, `lucide-react-native`, `@getpapillon/papicons` (composants SVG), `fflate`, `i18n-js`, `@expo-google-fonts/*`.
- **Notifications** : l'app n'utilise que des notifications **locales** (`scheduleNotificationAsync`) et l'écouteur de réponse ; **aucun jeton push distant**. Les notifications locales fonctionnent dans Expo Go sur iPhone. (Le push distant, absent du code, serait de toute façon limité dans Expo Go.)
- `expo-dev-client` est installé : avec lui, `expo start` vise par défaut le client de développement ; il faut forcer Expo Go avec `--go`.

## 4. Ce qui est testable… et ce qui ne l'est pas dans Expo Go
**Testable sur iPhone** : rendu iOS (mise en page, zones de sécurité, encoche, polices Figtree / Rufina, navigation, gestes de retour), formulaires, sélecteur de photos et appareil photo (textes de permission génériques d'Expo Go), import de documents, export PDF et feuille de partage (`expo-print`, `expo-sharing`), notifications locales, connexion avec le compte réel (saisie du mot de passe par TOI), réseau coupé et « Réessayer » (mode avion), zones tactiles.
**Non testable (ou différent)** :
- les **liens de retour des emails** (confirmation, mot de passe oublié) : le schéma `scolaria://` n'existe pas dans Expo Go (qui utilise `exp://…`) ; ces parcours restent à vérifier sur un vrai build ;
- les **liens de développement** `scolaria://dev/…` (même raison) ;
- icône, écran de lancement, `bundleIdentifier`, `infoPlist` (textes de permission de l'app), `UIBackgroundModes` : ceux d'Expo Go s'appliquent à la place ;
- les variables EAS (`eas.json`) : Metro lit `.env` (`EXPO_PUBLIC_*`) tel quel — la base visée est celle du `.env` du PC ;
- le comportement d'un build autonome (démarrage à froid, mises à jour), le push distant, tout ce qui touche à l'App Store / TestFlight.

## 5. Marche à suivre INITIALE (caduque : remplacée par le §6 depuis la correction du 4 oct ; conservée pour mémoire)
1. Sur l'iPhone, installer **Expo Go** depuis l'App Store (gratuit, Apple ID ordinaire). L'ouvrir : l'écran d'accueil et ses réglages indiquent la version **et le SDK** pris en charge. Noter le SDK.
2. **Si c'est le SDK 55** : sur le PC (même réseau Wi-Fi que l'iPhone) lancer `npx expo start --go`, scanner le QR code avec l'appareil photo de l'iPhone, ouvrir dans Expo Go. Je peux lancer Metro et surveiller les journaux ; tu manipules l'iPhone (je ne saisis aucun identifiant).
3. **Si c'est le SDK 54 ou 56** : Expo Go refusera le projet (« incompatible SDK »). Sans compte Apple payant, il n'y a pas de contournement raisonnable. Options : attendre l'arrivée du SDK 55 sur l'App Store ; ou, plus tard, un build de développement iOS (compte Apple Developer payant : **décision à toi**, rien à faire maintenant et rien lié au nom tant que « ARRÊT NOM » tient).
4. Dans tous les cas, l'aperçu **web** du projet (react-native-web) ne prouve rien pour iOS (leçon du 18 sept : le web n'est pas le moteur natif).

## 6. Mise à jour du 4 oct — marche à suivre révisée (sans compte payant)
1. Sur le PC : ouvrir `sign.expo.dev` dans le navigateur, suivre les étapes de la page (Apple ID gratuit saisi par TOI, iPhone branché en USB). Résultat attendu : une copie d'Expo Go **compatible SDK 55** installée sur l'iPhone, valable ~7 jours (à refaire ensuite). Voie décrite par [sign.expo.dev/how-it-works](https://sign.expo.dev/how-it-works) ; reste à constater à l'essai : WebUSB sous Windows, SDK 55 effectivement installé.
2. Lancer Metro en mode Expo Go :
```bash
npx expo start --go
```
   `--go` force Expo Go ; sans lui, `expo-dev-client` (installé) vise le client de développement. L'iPhone et le PC sur le même Wi-Fi ; scanner le QR code avec l'appareil photo de l'iPhone. Si le réseau local bloque : `npx expo start --go --tunnel` (utilise `@expo/ngrok`, déjà présent dans les dépendances ; plus lent).
3. **Base visée = celle du `.env` du PC (Paris)** : ne PAS saisir d'identifiant de test ; le compte réel est saisi par toi, jamais par moi. Pour une base locale, il faudrait `scripts/web-local.mjs`-like (garde d'hôte) et une adresse du PC visible depuis le téléphone, pas `localhost` : non prévu ici.

## 7. Ce qui diffère dans Expo Go (SDK 55)
Versions de modules embarquées dans Expo Go (`bundledNativeModules.json`) et celles du projet (la version native est celle d'Expo Go, le JavaScript celui du projet) :
| Module | Projet | Expo Go |
|---|---|---|
| expo-image-manipulator | ~55.0.21 | ~55.0.11 |
| expo-intent-launcher | ~55.0.16 | ~55.0.9 (API Android, sans effet sur iOS) |
| expo-system-ui | ~55.0.22 | ~55.0.10 |
| expo-updates | ~55.0.15 | ~55.0.14 (inactif dans Expo Go) |
| react-native-pager-view | ^8.0.1 | 8.0.0 |
| react-native-worklets | ^0.7.2 | 0.7.2 |
Écarts de correctif : aucun blocage attendu ; **à surveiller** : `expo-image-manipulator` (redimensionnement des photos importées : `test:photo` ne couvre que la logique, pas le natif) et `react-native-pager-view` (le pager des onglets). Le reste de ce qui change (liens `scolaria://`, icône, textes de permission, variables EAS, push distant) est au §4.

## 8. Pare-feu Windows (réseau local pour Node)
Metro écoute sur le port 8081 ; Windows demande « Autoriser Node.js sur les réseaux privés » à la première exécution. **Si le téléphone n'atteint pas le PC** : régler le profil du Wi-Fi sur « Privé » et autoriser `node.exe` en entrée sur ce profil. Bloc PowerShell **à exécuter par toi, en administrateur** (je ne modifie pas le pare-feu) :
```powershell
# 1. Voir les règles existantes pour node
Get-NetFirewallRule -DisplayName "*node*" | Select-Object DisplayName, Enabled, Profile, Direction, Action
# 2. Autoriser Metro (8081) en entrée, réseau PRIVÉ seulement
New-NetFirewallRule -DisplayName "Metro (Expo) 8081 - réseau privé" -Direction Inbound -Protocol TCP -LocalPort 8081 -Profile Private -Action Allow
# 3. Le retirer plus tard
Remove-NetFirewallRule -DisplayName "Metro (Expo) 8081 - réseau privé"
```

## 9. Ce que tu testes sur l'iPhone (aucun identifiant à saisir par moi)
1. L'app s'ouvre dans Expo Go sans écran d'erreur ; polices Figtree / Rufina chargées ; barre d'état et encoche : l'Accueil flotte sous la barre d'état comme sur Android.
2. Connexion avec ton compte réel (saisie par toi) ; l'Accueil affiche l'enfant sélectionné.
3. Navigation : burger, avatar (sélecteur d'enfant), onglets Accueil / Suivi / Agenda / Messages ; geste de **retour par glissement depuis le bord gauche** sur une page profonde (comportement iOS natif, à comparer à Android).
4. Agenda : bande des jours, filtres ; Suivi : segments, périodes P1–P5, bouton année ; Messages : segments.
5. Ajouter au carnet : accès à la photothèque et à l'appareil photo (textes de permission génériques d'Expo Go) ; une photo importée est redimensionnée (expo-image-manipulator).
6. Export PDF d'un carnet et feuille de partage (expo-print, expo-sharing).
7. Mode avion : changement d'enfant → états d'erreur et « Réessayer », jamais les données de l'autre enfant.
8. Aria : la pill ouvre l'écran de consentement (ne pas activer sauf si tu veux tester) ; clavier qui ne masque pas le champ.
9. Zones tactiles : burger, avatar, onglets, jours, filtres, segments, boutons de la barre du bas (au doigt, sans viser).
10. **Non testable dans Expo Go** : liens des emails de confirmation / mot de passe oublié (`scolaria://` absent), icône, écran de lancement, push distant → à vérifier sur un vrai build.

## 10. Questions pour toi
- Au premier essai : WebUSB fonctionne-t-il sur ton PC (navigateur Chromium, iPhone branché) et l'Expo Go installé ouvre-t-il bien un projet SDK 55 ? (La page sign.expo.dev ne précise pas la version de SDK installée.)
- As-tu un Mac (simulateur iOS, SDK 55 téléchargeable gratuitement) ? Sinon, la voie simulateur est fermée.
