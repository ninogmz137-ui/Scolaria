# Build de démonstration Android autonome (APK sans Metro) — profil EAS « preview » — état au 4 oct 2026

**Statut (session 5, 4 oct) : variante « démo » IMPLÉMENTÉE dans `app.config.js` et `eas.json` (diff au § 6), vérifiée en local ; AUCUN build lancé. J'attends ton « go build » et ton choix de libellé (§ 6).** Les §§ 1 à 5 sont l'état de la session 4 (constats) ; le § 6 les met à jour.

## 1. Constats (vérifiés le 4 oct)
| Point | Constat |
|---|---|
| Variables du profil `preview` (EAS › Environment variables) | **2 variables seulement, visibilité PUBLIC** : `EXPO_PUBLIC_SUPABASE_URL` → `https://<Paris nmizwmy…>.supabase.co` (référence de Paris, aucun autre projet) ; `EXPO_PUBLIC_SUPABASE_ANON_KEY` → clé de forme `sb_publishable_…` (46 caractères, clé PUBLIQUE). Aucune clé secrète, aucune clé d'API tierce. Mêmes 2 variables pour `development` (Paris) ; `production` : aucune variable (volontairement). Valeurs masquées à l'affichage. |
| Londres | aucune variable du profil ne vise l'ancien projet. |
| Fichier `.env` | exclu de l'archive EAS (`.easignore`) ; l'URL vient des variables EAS. |
| Quota EAS (`eas account:usage`) | Plan **Free** (le CLAUDE.md dit « Starter » : à corriger si l'écart est réel). Cycle du 1er oct au 1er nov : **0 build Android utilisé sur 15** (0 / 30 au total), dépassement : 0 €. Concurrence : 1 build à la fois ; en plan Free la file est basse priorité (attente possible de plusieurs dizaines de minutes). |
| Dernier build Android | 28 sept, profil `development`, `com.scolaria.app` (client de développement installé sur le Redmi). |
| Profil `preview` actuel (`eas.json`) | `distribution: internal`, `buildType: apk` ; **pas** de client de développement, pas de Metro : le JavaScript est embarqué (build de type release). |
| `applicationId` actuel | `com.scolaria.app`, **identique** à celui du client de développement installé. |
| Mises à jour à distance (`expo-updates`) | `updates.url` est configurée (`u.expo.dev`), `runtimeVersion` « 1.0.0 », **aucun canal** dans `eas.json`. |

## 2. Effet d'un `applicationId` distinct (et d'un identifiant inchangé)
- **Identique (`com.scolaria.app`) — situation actuelle** : l'APK « preview » s'installe PAR-DESSUS le client de développement (même signature EAS) : **le client de développement disparaît**, et l'application conserve les données du client précédent, **dont la session du compte RÉEL** : à montrer à une enseignante, l'app s'ouvrirait sur ton vrai carnet. À éviter.
- **Distinct (ex. `com.scolaria.app.demo`)** : s'installe **à côté** ; stockage vierge (écran de connexion → « Essayer en mode démo », aucune session réelle) ; le client de développement reste utilisable. Deux icônes sur le téléphone : il faut un libellé différent pour les distinguer.
- **Attention — règle « ARRÊT NOM »** (ne pas changer le bundle id ni le nom) : la variante ne touche que le profil `preview` ; `development` et `production` gardent `com.scolaria.app`. **C'est à toi de dire si cette exception est acceptée** (§ 3, décision A).
- Conséquence sur les liens : le schéma `scolaria://` ne serait pas repris par la variante (règle : pas de `scolaria://` dans de nouvelles configs ; la démo n'utilise aucun lien de messagerie) → pas de conflit de lien entre les deux applications.

## 3. Ce que je compte changer (PROPOSITION, rien d'appliqué)
**Décisions à prendre par toi :** A) accepter l'`applicationId` distinct pour la démo (sinon : désinstaller le client de développement avant et accepter la session réelle héritée) ; B) libellé de l'icône de la démo ; C) désactiver les mises à jour à distance dans la démo (recommandé : un APK « autonome » ne doit rien télécharger).

1. `app.config.js` — lire une variable `APP_VARIANT` (non secrète) ; **si elle vaut `demo`** :
   - `android.package` = valeur actuelle + suffixe `.demo` (aucun nom en dur : calculé à partir de la valeur existante) ;
   - libellé = variable `APP_LIBELLE_DEMO` (défaut : libellé actuel + « démo ») — jamais le nom écrit en dur ailleurs ;
   - pas de `scheme` ;
   - `updates.enabled = false` (aucune requête de mise à jour) ;
   - `versionCode` inchangé.
   Sans `APP_VARIANT` : **configuration strictement identique à aujourd'hui** (production et développement inchangés ; preuve : `npx expo config --type public` avant / après, diff vide).
2. `eas.json` — profil `preview` : ajouter `"env": { "APP_VARIANT": "demo" }` (non secret ; les 2 variables Paris restent fournies par l'environnement EAS `preview`). Rien d'autre.
3. Vérifications locales AVANT le build : `npx tsc --noEmit` ; `npx expo config` en mode démo (package, libellé, absence de scheme, updates désactivées) ET sans variante (diff vide) ; `npm run test:bundle-prod` (§ 4) ; `npx expo-doctor`.
4. Le build (APRÈS ton « go build ») : `npx eas-cli@latest build --platform android --profile preview` ; l'APK se télécharge depuis le lien EAS (téléchargement et installation sur le Redmi : **à toi de confirmer** ; installation par `adb install` seulement avec ton accord, premier plan vérifié).

## 4. Preuve « aucune chaîne de développement » dans le bundle
- `npm run test:bundle-prod` exporte un bundle Android de production (`__DEV__` faux) et y cherche les chaînes de développement (liens `dev/…`, « Passer en démo », « Revenir à mon compte », notification de test) : **9/9 le 4 oct 2026** (3 témoins présents, 6 chaînes absentes). Le bundle de la variante « démo » est le MÊME code JavaScript (la variante ne change que la configuration native et deux valeurs publiques) : la preuve vaut pour elle ; elle sera rejouée après la modification du § 3.
- **Recherche de secrets dans le bundle (clé Anthropic, clé « secret » Supabase, clé de rôle service) : NON ajoutée** — le garde-fou a bloqué l'édition du script qui contient ces préfixes ; je n'ai pas contourné. Bloc PowerShell de secours donné dans le rapport (à exécuter par toi) ; en attendant, la preuve par le code : aucune clé de ce type dans `app.config.js`, seules 2 variables publiques dans EAS `preview`.

## 5. Ce que la démo montre / ne montre pas
Le mode démo ouvre la vue PARENT (famille Moreau : Léa, Lucas, Emma). **Pas de vue enseignant à présenter** : un détour (Créer un compte → Enseignant) ouvre bien une interface enseignant avec des données d'exemple, mais elle n'est pas montrable en l'état. Voir `tasks/demo-plan.md` § 7.

## 6. Mise à jour de la session 5 — variante démo implémentée (rien de lancé)
**Décisions de l'utilisateur appliquées :** A) identifiant distinct `.demo` **uniquement par le profil de build** (la ligne de l'identifiant de base n'est pas modifiée) ; C) mises à jour à distance désactivées ; B) libellé : à choisir (ci-dessous).

**Diff exact** (`git diff app.config.js eas.json`) :
- `app.config.js` : `module.exports = {` devient `const config = {` (aucune autre ligne de la configuration de base touchée), puis, en fin de fichier :
  `if (process.env.APP_VARIANT === 'demo') { expo.android.package += '.demo'; expo.name = process.env.APP_LIBELLE_DEMO || 'Démo'; delete expo.scheme; expo.updates = { enabled: false }; expo.extra = { …, EXPO_PUBLIC_SUPABASE_URL: 'https://your-demo.invalid', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'demo-sans-serveur' }; }` puis `module.exports = config;`.
- `eas.json` (profil `preview` seulement) : `"environment": "production"` (environnement EAS sans aucune variable : les variables Paris du profil `preview` NE sont PAS fournies à ce build), `"env": { "APP_VARIANT": "demo", "EXPO_PUBLIC_SUPABASE_URL": "https://your-demo.invalid", "EXPO_PUBLIC_SUPABASE_ANON_KEY": "demo-sans-serveur" }`.
  **Pourquoi `environment: production`** : la doc EAS que j'ai lue ne dit pas qui l'emporte entre `env` de `eas.json` et les variables du serveur ; en pointant le build sur l'environnement vide, il n'existe aucun conflit possible. **Effet de bord à connaître** : tous les builds du profil `preview` sont désormais des builds de démonstration.

**Preuves :**
- Sans `APP_VARIANT`, la configuration est identique octet pour octet à celle d'avant (comparaison JSON de `HEAD` et du fichier modifié : identique) ; avec `APP_VARIANT=demo`, seules cinq clés changent : `name`, `android` (package `com.scolaria.app.demo`), `extra`, `updates`, `scheme`.
- **Réponse à ta question : OUI, le mode démo tourne avec une URL et une clé factices, sans aucun accès à Paris.** `AuthContext` et `database.ts` tiennent l'app pour « non configurée » dès que l'URL est vide ou contient `your-` : tout passe en démo, aucune session lue, aucun appel. Exécution réelle (variante démo, port 8083, serveur arrêté ensuite) : le bundle servi contient l'URL factice et **0 occurrence de la référence de Paris** ; « Essayer en mode démo » → Accueil, Agenda, Suivi parcourus : **seul `localhost` est contacté** (0 hôte externe). Une URL vide est impossible : `createClient` lève une erreur au chargement ; d'où le domaine `.invalid`, qui ne se résout jamais.
- **Effet secondaire constaté** : « Se connecter » tente un appel vers le domaine factice et affiche « Failed to fetch » (honnête, aucune requête réelle) ; « Créer un compte » ouvre en revanche un compte de DÉMONSTRATION (sans serveur) et propose le rôle Enseignant (cf. `tasks/demo-plan.md` § 7). **Recommandation (décision à toi)** : masquer « Se connecter » et « Créer un compte » dans la variante démo (petit changement de code dans `LoginScreen`, commandé par `Constants.expoConfig.extra.APP_VARIANT`), pour que l'APK ne propose que « Essayer en mode démo » et n'ouvre pas l'interface enseignant. Je ne l'ai PAS fait (non demandé : ta consigne était de masquer seulement si la démo ne tournait pas sans serveur).

**B) Trois libellés d'icône** (contenant « Démo ; Android tronque autour de 12 caractères) — à choisir, puis la valeur va dans la variable `APP_LIBELLE_DEMO` de `eas.json` (aucun nom écrit en dur) :
1. **Carnet · Démo** (13 car.)
2. **Démo du carnet** (13 car.)
3. **Carnet Démo** (11 car.) — le plus court, ne se tronque pas.
Sans choix, le libellé par défaut est « Démo ».

**Avant le build (je les rejoue) :** `npx tsc --noEmit` ; `npm run test:bundle-prod` (12/12) ; `npx expo config` avec et sans variante. Puis, sur ton « go build » : `npx eas-cli@latest build --platform android --profile preview` (plan Free : file basse priorité, 0 / 15 builds Android utilisés ce cycle).

## 7. Session 6 — état final avant le build (rien de lancé) et marche à suivre APRÈS le build
**Ce qui remplace les §§ 3 et 6 (obsolètes sur le profil)** : le profil **`demo`** (eas.json) étend `preview`, `environment: production` (aucune variable), `APP_VARIANT=demo`, `APP_LIBELLE_DEMO=Carnet Démo` ; **`preview` est revenu à son état d'origine** (prouvé par `npm run test:variante-demo`). Un seul endroit active la variante : le profil `demo`. En variante : l'écran d'ouverture ne propose que « Essayer en mode démo » ; les routes Connexion, Inscription, Mot de passe oublié, Nouveau mot de passe, Espace enseignant et Espace élève sont absentes de la navigation. Preuves : `test:variante-demo` (configuration identique sans variante ; cinq clés changent avec ; preview intact ; aucun autre fichier ne navigue vers ces écrans), `test:bundle-prod` 13/13 avec la variante, exécution réelle (écran d'ouverture : « Essayer en mode démo » seul ; l'adresse `/Inscription` retombe sur l'ouverture). **Constat honnête** : le JavaScript ne contient jamais l'URL (elle vit dans la configuration `extra`, embarquée au build natif) ; la preuve « 0 référence à Paris » porte donc sur la CONFIGURATION résolue (URL de Paris injectée en entrée, ignorée par la variante), pas sur le bundle (qui n'en contient jamais, variante ou non).

### Après le « go build » — marche à suivre (à exécuter dans cet ordre ; adb : premier plan vérifié avant chaque appui ; AUCUNE déconnexion)
**0. Lancer (moi, après ton « go build »)** : `npx eas-cli@latest build --platform android --profile demo --non-interactive` (plan Free : file basse priorité, attente possible ; 0 / 15 builds Android utilisés ce cycle).
**1. Récupérer l'APK, hors dépôt** : `node scripts/telecharger-apk-demo.mjs` → `C:\Users\admin\ScolariaDemo\carnet-demo-<id>.apk`, avec la taille et le SHA-256 ; le script **n'affiche jamais le lien d'artefact** et refuse tout build dont l'identifiant n'est pas `com.scolaria.app.demo`. **Le lien d'artefact EAS n'est pas à partager** (ni dans un message, ni dans un journal, ni à l'enseignante : il donne accès au fichier). Pour donner l'APK à une personne : copier le fichier lui-même, pas le lien.
**2. Installer à côté du client de développement** (`source scripts/adbui.sh` pour les appuis ; installation, pas d'appui) :
```
adb -s a3a0cfea shell pm list packages | findstr scolaria        (attendu : com.scolaria.app seulement, avant)
adb -s a3a0cfea install C:\Users\admin\ScolariaDemo\carnet-demo-<id>.apk   (SANS -r : jamais un remplacement)
adb -s a3a0cfea shell pm list packages | findstr scolaria        (attendu : com.scolaria.app ET com.scolaria.app.demo)
```
Si `pm list` ne montre pas les DEUX paquets : stop. Ne JAMAIS utiliser `-r` ni `-d`, et ne JAMAIS toucher au paquet `com.scolaria.app` (client de développement + ta session réelle).
**3. Vérifier que ta session réelle n'y est pas** : lancer la démo (`adb shell monkey -p com.scolaria.app.demo -c android.intent.category.LAUNCHER 1`), vérifier le premier plan (`dumpsys window | grep mCurrentFocus` → `com.scolaria.app.demo`), puis `voir` (adbui.sh) : l'écran d'ouverture doit montrer UNIQUEMENT « Essayer en mode démo » (pas d'Accueil de Laia/Evan, aucun e-mail réel). Le stockage de l'application est celui d'un autre paquet : il ne peut pas contenir ta session ; ce contrôle visuel le confirme. Icône : libellé « Carnet Démo », à côté de l'icône de l'application habituelle.
**4. Tester en MODE AVION** : `adb -s a3a0cfea shell cmd connectivity airplane-mode enable` ; contrôle `settings get global airplane_mode_on` = 1 et `ping 8.8.8.8` → « Network is unreachable » ; arrêt forcé de la démo (`am force-stop com.scolaria.app.demo`, jamais l'autre paquet), relance, « Essayer en mode démo » (`tap_texte "Essayer en mode démo"`), parcourir Accueil, Suivi, Agenda, Messages, changer d'enfant (Léa / Lucas / Emma) : tout doit s'afficher SANS message « Pas de connexion ». Une capture éventuelle ne sort pas du téléphone si elle montre autre chose que la démo.
   **Fin du test, TOUJOURS** : `airplane-mode disable`, `settings get global airplane_mode_on` = 0, `ping` répond, puis contrôle visuel que le client de développement est intact.
**5. Désinstaller la démo** : `adb -s a3a0cfea uninstall com.scolaria.app.demo` — **uniquement ce nom exact** ; vérifier ensuite que `com.scolaria.app` est toujours installé (`pm list packages`). Supprimer l'APK local si plus utile.
**Garde-fous** : aucun appui sans passer par `tap_texte` / `tap_xy` (mots interdits : déconnexion, suppression, signature, envoi…) ; jamais « adb shell input tap » direct ; jamais plus d'un retour sans contrôle (leçon du 4 oct) ; aucun identifiant saisi (la démo n'en demande aucun).
