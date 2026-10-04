# Enquête iOS sans compte Apple — l'app peut-elle tourner dans Expo Go sur un iPhone ? (4 oct 2026)

Rapport seulement : aucun compte créé, aucun achat, rien d'irréversible, aucune modification du projet.

## 1. Réponse courte
**Techniquement oui (rien ne bloque côté code) ; en pratique, ça dépend d'un seul fait que je ne peux pas vérifier d'ici : la version d'Expo Go disponible aujourd'hui sur l'App Store de ton iPhone.** Le projet est en **SDK 55** ; Expo Go sur iPhone n'ouvre que **la version de SDK qu'il embarque** (un seul SDK à la fois sur l'App Store).

## 2. SDK du projet et d'Expo Go
- Projet : `expo ~55.0.8`, `react-native 0.83.2`, `react 19.2.0` (SDK **55**).
- Expo Go (sources : changelog Expo de mai 2026, [expo-go-and-app-store-may-2026](https://expo.dev/changelog/expo-go-and-app-store-may-2026) et [sdk-56](https://expo.dev/changelog/sdk-56)) : au 4 mai 2026 l'App Store proposait Expo Go pour le **SDK 54** ; la version **SDK 55** y était « en attente d'approbation d'Apple, sans échéance » ; le **SDK 56** (sorti le 21 mai 2026) n'est **ni sur l'App Store ni sur Google Play**. Ces informations ont 5 mois : **l'état d'aujourd'hui est à lire sur ton iPhone** (voir §5). Je ne peux pas le déduire.
- Sans compte Apple payant, l'iPhone physique n'a que l'Expo Go de l'App Store. Les autres voies sont fermées : `eas go` (ta propre copie d'Expo Go via TestFlight) **exige l'Apple Developer Program (payant)** ; la bêta TestFlight externe d'Expo Go SDK 56 était « complète » ; l'Expo Go « simulateur » (téléchargeable pour SDK 55) ne tourne que sur un **Mac** avec Xcode — pas sous Windows.

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

## 5. Marche à suivre pour toi (gratuite, réversible)
1. Sur l'iPhone, installer **Expo Go** depuis l'App Store (gratuit, Apple ID ordinaire). L'ouvrir : l'écran d'accueil et ses réglages indiquent la version **et le SDK** pris en charge. Noter le SDK.
2. **Si c'est le SDK 55** : sur le PC (même réseau Wi-Fi que l'iPhone) lancer `npx expo start --go`, scanner le QR code avec l'appareil photo de l'iPhone, ouvrir dans Expo Go. Je peux lancer Metro et surveiller les journaux ; tu manipules l'iPhone (je ne saisis aucun identifiant).
3. **Si c'est le SDK 54 ou 56** : Expo Go refusera le projet (« incompatible SDK »). Sans compte Apple payant, il n'y a pas de contournement raisonnable. Options : attendre l'arrivée du SDK 55 sur l'App Store ; ou, plus tard, un build de développement iOS (compte Apple Developer payant : **décision à toi**, rien à faire maintenant et rien lié au nom tant que « ARRÊT NOM » tient).
4. Dans tous les cas, l'aperçu **web** du projet (react-native-web) ne prouve rien pour iOS (leçon du 18 sept : le web n'est pas le moteur natif).

## 6. Questions pour toi
- Quel SDK affiche Expo Go sur ton iPhone après installation ? (Réponse = feu vert ou non.)
- As-tu un Mac (simulateur iOS, SDK 55 téléchargeable gratuitement) ? Sinon, la voie simulateur est fermée.
