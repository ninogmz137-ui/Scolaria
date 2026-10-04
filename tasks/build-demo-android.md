# Build de démonstration Android autonome (APK sans Metro) — profil EAS « preview » — état au 4 oct 2026

**Statut : constats faits (lecture seule), RIEN modifié, AUCUN build lancé. J'attends ton « go build » (et tes décisions du § 3).**

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
Le mode démo ouvre la vue PARENT (famille Moreau : Léa, Lucas, Emma). **Aucune vue enseignant en démo** [UNCLEAR : confirmer sur l'appareil ; l'interface enseignant n'est atteinte qu'avec un compte enseignant réel]. Voir `tasks/demo-plan.md`.
