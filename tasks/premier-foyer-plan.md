# Plan « Premier vrai foyer » — 27 sept 2026

> **Objectif** : deux responsables réels utilisent Scolaria pour un enfant réel, dont l'école n'est PAS sur
> Scolaria. **Cible du premier test : iPhone** (les deux responsables ont un iPhone) via **TestFlight**.
> Android (Redmi) reste le banc d'essai : tout ce qui peut être prouvé sur Android l'est AVANT d'acheter
> quoi que ce soit chez Apple.
>
> **Plan seulement : aucun code, aucun achat, aucune action lancée.** Chaque lot commence sur ton feu vert.

---

## 0. Ce que le premier foyer utilisera (et n'utilisera pas)

Utilisé :
- inscription par email, confirmation de l'email par un lien qui ouvre l'app ;
- création de l'enfant (école hors Scolaria : pas de classe rattachée) ;
- invitation du second responsable, acceptation dans l'app ;
- « Ajouter au carnet » : photos (HEIC sur iPhone), captures, PDF, jalons ; Suivi › Souvenirs / Livrets ;
- Messages › Général : état vide « Les mots de l'école de [prénom] arriveront ici… » + « Ajouter un mot reçu ailleurs » ;
- Agenda (événements ajoutés par la famille), Accueil, Aria (si décidé : voir D8) ;
- mot de passe oublié.

Pas utilisé (école hors Scolaria) : mots de l'enseignant, signatures, fils avec l'enseignant (M22 en place mais
non branchés), notifications distantes. **Notifications push iOS (APNs) : hors du premier foyer** (§ Plus tard).

---

## 1. Reprise de « BLOQUANT avant toute famille réelle » (todo.md)

| Bloquant (todo) | Lot du plan |
|---|---|
| PDF / fichiers du carnet : jamais de copie dans un dossier public | **L6** |
| Rendre RÉELS l'export et l'effacement (droits RGPD) ; code de transfert masqué | **L7** |
| Nettoyage des fichiers orphelins du bucket « carnet » | **L7** |
| Lot « Emails et liens Auth » (Brevo, domaine, SPF/DKIM, modèles FR, Site/Redirect URL, test de bout en bout) | **L2 + L3 + L4** |

Ajoutés par ce plan (constatés en préparant) :
- **Invitation du second responsable** : l'invitation s'enregistre (`invitations_responsable`) mais **aucun email ne part** et **aucun écran ne permet de l'accepter** (`respond_invitation` n'est appelé nulle part dans l'app) → **L4**.
- **Liens des emails** : l'app ne traite aucun lien d'authentification (`emailRedirectTo`, échange du code) ; **pas de « Mot de passe oublié »** → **L3**.
- **expo-image-manipulator OBLIGATOIRE** (HEIC → JPEG, redimensionnement, métadonnées supprimées), iOS et Android → **L5**.
- **Configuration iOS** (textes de permissions, schéma, identifiant) → **L8** ; textes actuels faux (« scanner les bulletins scolaires »).
- **EAS** : `eas.json` sans profil iOS ni variables d'environnement ; règle « variables EAS → Paris avant tout build » → **L9**.
- **Aria** (todo, section Aria) : écran d'information à la 1re utilisation + Aria désactivable → **L10** (décision D8).

---

## 2. Ordre des lots (dépendances)

```
L1 Domaine ──► L2 Brevo + SMTP ──► L3 Liens Auth + mot de passe oublié ──► L4 Invitation (email + écran)
                                                                                   │
L5 Photos (image-manipulator) ──► L9 Builds Android (dev + preview) ◄──────────────┤
L6 Fichiers privés ──────────────►        │                                        │
L7 RGPD réels + orphelins ───────►        │                                        │
L8 Config iOS (app.config) ──────►        │                                        │
L10 Aria (si décidé) ────────────►        ▼                                        │
                              L11 RÉPÉTITION GÉNÉRALE sur Android (Redmi + 2e compte) ◄┘
                                          │
                                          ▼
                     L12 ACHAT Apple Developer (le plus tard possible)
                                          │
                                          ▼
                     L13 Premier build iOS + TestFlight (testeurs internes)
                                          │
                                          ▼
                     L14 Corrections d'affichage iOS (captures iPhone)
                                          │
                                          ▼
                     L15 Premier foyer (installation accompagnée, suivi)
```

Règles : **domaine avant Brevo, Brevo avant invitation, build avant photos redimensionnées (module natif),
tout ce qui ne dépend pas d'Apple AVANT l'achat Apple**. L5 à L8 et L10 peuvent avancer en parallèle de L1-L4.

---

## 3. Les lots

Légende — **Toi** : achats, comptes, réglages de consoles, saisie de secrets et mots de passe (je n'en saisis
jamais). **Moi** : code, migrations (locale d'abord, arrêt avant la prod pour ta validation), tests, documentation.
Durées = temps de travail estimé, hors attentes externes (DNS, Apple).

### L1 — Nom de domaine
- **Toi** : choisir et acheter le domaine (D1) chez un registrar européen (ex. OVHcloud, Gandi) ; me donner accès
  en lecture à la zone DNS ou me lire les enregistrements.
- **Moi** : liste exacte des enregistrements à créer (L2) ; vérification de la propagation (`nslookup`).
- Durée : 30 min pour toi ; propagation DNS jusqu'à 24 h. Risque : **faible** (nom indisponible → D1 bis).
- Test / prêt : le domaine résout ; la zone DNS est modifiable.

### L2 — Brevo + SMTP de Supabase Auth
- **Toi** : compte Brevo (gratuit, 300 emails/jour) ; ajouter le domaine d'envoi dans Brevo ; créer dans ta zone
  DNS les enregistrements SPF, DKIM, DMARC que Brevo affiche (je les relis) ; créer une clé SMTP Brevo ;
  la saisir dans Supabase (Dashboard › Authentication › SMTP) : hôte, port, identifiant, clé, expéditeur
  `notifications@<domaine>` (réponse vers `contact@<domaine>`, D10 : jamais de no-reply), nom « Scolaria ».
- **Moi** : modèles d'email EN FRANÇAIS (confirmation, invitation Auth, réinitialisation, changement d'email)
  prêts à coller ; vérification des en-têtes d'un email reçu (SPF/DKIM « pass »).
- Durée : 1 h pour toi (+ validation Brevo du domaine, souvent < 1 h) ; 1 h pour moi. Risque : **moyen**
  (délivrabilité : emails en spam si DKIM/DMARC incomplets).
- Test / prêt : un email de confirmation arrive dans une boîte Gmail ET une boîte iCloud (pas en spam), en
  français, expéditeur à ton domaine, SPF/DKIM = pass.

### L3 — Liens d'authentification + mot de passe oublié
- **Toi** : dans Supabase › URL Configuration : Site URL et Redirect URLs que je te donne
  (ex. `scolaria://auth/callback`) — aujourd'hui Site URL = `http://localhost:3000`, aucune Redirect URL.
- **Moi** : flux PKCE dans l'app (`emailRedirectTo`, échange du code au retour du lien) ; écran « Mot de passe
  oublié » + écran « Nouveau mot de passe » ; lien expiré → message clair ; tests (script + appareil).
  **Limite connue** : un lien `scolaria://` ne s'ouvre que sur un téléphone où l'app est installée ;
  ouvert sur un ordinateur, il ne fait rien → page web de repli sur le domaine (D5).
- Durée : 1 session. Risque : **moyen** (comportement des liens dans Gmail / Mail iOS).
- Test / prêt : sur le Redmi (build de dev), inscription → email → lien → app ouverte, compte confirmé ;
  mot de passe oublié → email → lien → nouveau mot de passe → connexion. Refait sur iPhone en L13.

### L4 — Invitation du second responsable (email + acceptation)
- **Toi** : clé API Brevo (transactionnel) saisie comme **secret Supabase** (jamais dans l'app) ; une 2e adresse
  email à toi pour les tests.
- **Moi** : Edge Function d'envoi de l'invitation (Brevo), texte FR (« Claire vous invite à suivre le carnet de
  [prénom] ») ; dans l'app : invitations en attente visibles après connexion, écran « Accepter / Refuser »
  (`respond_invitation`, email confirmé exigé, déjà en base) ; invitation expirée / annulée → message clair ;
  migration seulement si nécessaire (locale, tests, arrêt avant la prod).
- Durée : 1 à 2 sessions. Risque : **moyen** (invité sans compte : il doit s'inscrire avec l'adresse invitée).
- Test / prêt : compte A invite l'adresse B → email reçu → B s'inscrit/se connecte → accepte → B voit l'enfant ;
  A et B voient les mêmes ajouts « foyer » ; un ajout « privé » de A reste invisible pour B ; B peut se retirer,
  A reste seul responsable.

### L5 — Photos : expo-image-manipulator (OBLIGATOIRE)
- **Toi** : rien (sinon : m'envoyer une vraie photo HEIC d'iPhone, D7).
- **Moi** : ajout du module ; à l'import : HEIC → JPEG, redimensionnement (ex. 2048 px au plus grand côté,
  qualité 0,8), **toutes les métadonnées supprimées** (GPS, appareil, date EXIF) — l'effacement EXIF en JS
  actuel reste en double sécurité ; HEIC accepté (aujourd'hui refusé) ; limite 10 Mo revue après compression.
  **Module natif → nécessite un nouveau build (L9)**.
- Durée : 1 session + build. Risque : **moyen** (décodage HEIC selon la version d'Android ; iOS natif).
- Test / prêt : tests automatiques (fichier JPEG avec GPS → sortie sans EXIF) ; sur le Redmi avec une **vraie photo
  HEIC** poussée par adb : importée, JPEG ≤ 2048 px, aucune métadonnée (vérifiée sur le fichier du bucket) ;
  refait sur iPhone en L13 avec une photo prise à l'instant.

### L6 — Fichiers du carnet ouverts en privé
- **Toi** : rien.
- **Moi** : « Voir le fichier » télécharge dans le stockage PRIVÉ de l'app (cache), ouvre avec la visionneuse du
  système (Android : intent sur un content:// ; iOS : aperçu Quick Look / feuille de partage), **aucune copie
  publique** ; fichier temporaire supprimé ensuite. URL signée 1 h inchangée.
- Durée : 0,5 à 1 session (+ build si module natif). Risque : **faible à moyen** (visionneuse PDF absente sur
  certains Android).
- Test / prêt : Redmi : ouvrir un PDF et une photo → rien dans Téléchargements / Images (vérifié par adb) ;
  iPhone : rien dans Fichiers / Photos.

### L7 — Droits RGPD réels + fichiers orphelins
- **Toi** : décider des délais (D6) ; valider les migrations avant la prod.
- **Moi** : export réel (JSON + fichiers du carnet, archive téléchargée dans le stockage privé puis partagée par
  l'utilisateur) ; effacement réel (Edge Function serveur : enfant + données + fichiers du bucket via l'API
  Storage, délai et annulation selon D6) ; nettoyage des orphelins (suppression d'enfant, d'élément, départ d'un
  responsable → ses éléments PRIVÉS) ; écrans Export / Effacement réaffichés SEULEMENT une fois réels.
- Durée : 2 à 3 sessions. Risque : **élevé** (suppression définitive : tests exhaustifs en local d'abord).
- Test / prêt : local : export contient tout le carnet (fichiers compris) ; effacement → plus aucune ligne ni aucun
  fichier sous `<child_id>/` ; puis sur Paris avec un enfant de test créé pour l'occasion.

### L8 — Configuration iOS (app.config.js)
- **Toi** : valider les textes (D4) et l'identifiant (D3).
- **Moi** :
  - `ios.bundleIdentifier` (aujourd'hui `com.scolaria.app`, à confirmer disponible au moment de L13) ;
  - `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` en français et VRAIS (aujourd'hui « scanner les
    bulletins scolaires ») : ex. « Scolaria utilise l'appareil photo pour ajouter au carnet de votre enfant une
    photo de dessin, de cahier ou de document papier. » ;
  - schéma `scolaria://` (déjà présent) pour les liens des emails (L3) ;
  - `supportsTablet` (D3 : iPhone seulement recommandé pour ce test) ;
  - retrait de `UIBackgroundModes: remote-notification` tant que le push est hors périmètre ;
  - `ios.buildNumber`, `version`, `ITSAppUsesNonExemptEncryption: false` (déjà présent).
- Durée : 1 h. Risque : **faible**. Test / prêt : `npx expo config --type introspect` montre les bonnes valeurs ;
  vérifié à la 1re installation (L13 : textes des demandes d'autorisation).

### L9 — Builds Android (dev + preview) et EAS
- **Toi** : lancer/autoriser les builds (compte Expo), vérifier les **variables d'environnement EAS = Paris**
  (`eas env:list`) — règle existante.
- **Moi** : `eas.json` : profils `development`, `preview` (Android APK) et `production` iOS (store) ; variables
  d'environnement par profil ; `npm run test:bundle-prod` avant chaque build de test (aucun outil de dev) ;
  installation sur le Redmi par adb.
- Durée : 1 session + ~20 min de build. Risque : **faible**.
- Test / prêt : build de dev avec image-manipulator installé ; build preview (release) : aucun lien `dev/`,
  pas de « Passer en démo », connexion à Paris.

### L10 — Aria pour une famille réelle (selon D8)
- **Moi** : écran d'information à la 1re utilisation (formulation validée du 25 sept) ; interrupteur dans
  Famille & paramètres (désactivée = aucun appel au modèle, vérifié dans les journaux de l'Edge Function).
- Durée : 1 session. Risque : **faible**. Test / prêt : désactivée → la pill Aria ne l'appelle plus (0 appel).

### L-SAUV — Sauvegarde hebdomadaire automatique (décision D2 du 27 sept : pas de Supabase Pro pour l'instant)
- **Toi** : laisser le PC allumé le jour choisi (ou accepter le rattrapage au démarrage) ; valider le dossier de destination.
- **Moi** : script (Planificateur de tâches Windows) : `supabase db dump --linked` (schéma, rôles, données) + copie de TOUS les
  fichiers du bucket « carnet » (API Storage, clé de service lue dans un fichier local hors dépôt, jamais commité) vers
  `C:/Users/admin/ScolariaBackups/hebdo/AAAA-MM-JJ/` ; rotation (garder les 8 dernières) ; journal d'exécution ;
  **script de restauration testé** sur le Supabase LOCAL (base + fichiers), avec comparaison des comptes de lignes et des fichiers.
- Durée : 1 session. Risque : **moyen** (PC éteint = pas de sauvegarde ; perte possible d'une semaine au pire).
- Test / prêt : une sauvegarde complète produite par la tâche planifiée ; restauration sur le local : mêmes lignes, mêmes fichiers.
- **Supabase Pro** : avant la première famille EXTÉRIEURE ou la première école (D2).

### L11 — Répétition générale sur Android
- **Toi** : 2 adresses email (A et B), le Redmi ; jouer le parcours avec moi.
- **Moi** : le script du parcours complet (inscription A, enfant, invitation B, acceptation, ajouts photo HEIC /
  PDF / jalon, privé vs foyer, mot de passe oublié, export, effacement d'un enfant de test) ; journaux Paris ;
  corrections.
- Durée : 1 session. Risque : **faible** (c'est le filet). Test / prêt : **tout le parcours passe sur le build
  preview du Redmi sans intervention de ma part, aucune erreur dans les journaux.** → feu vert pour l'achat Apple.

### L12 — ACHAT Apple Developer (le plus tard possible)
- **Toi** : Apple Developer Program, **compte individuel** (nom de l'éditeur = ton nom sur TestFlight) ;
  identifiant Apple avec double authentification ; paiement ; vérification d'identité.
- Coût : **99 €/an** (prix affiché en France — à vérifier au moment de l'achat). Délai : quelques heures à 48 h
  pour l'activation. Risque : **faible** (vérification d'identité parfois plus longue).
- Prêt : accès à developer.apple.com et App Store Connect.

### L13 — Premier build iOS (EAS, cloud, sans Mac) + TestFlight
- **Toi** :
  - première connexion Apple dans EAS (`eas build -p ios`) : **c'est toi qui saisis ton identifiant Apple et le
    code 2FA** (EAS crée le certificat et le profil de provisionnement) ;
  - App Store Connect : fiche de l'app (nom, identifiant) — ou création par `eas submit` ;
  - **testeurs internes** : inviter les deux responsables comme **utilisateurs App Store Connect** (rôle le plus
    limité possible) puis dans le groupe TestFlight interne (D9) ; ils installent l'app **TestFlight**.
- **Moi** : profil `production` iOS, `eas build -p ios --profile production`, `eas submit -p ios` vers
  TestFlight ; « Export compliance » déjà déclarée ; checklist d'installation.
- Durée : 1 session + 20-40 min de build + traitement Apple (souvent < 1 h). Risque : **moyen** (certificats,
  identifiant déjà pris, première soumission).
- Test / prêt : les deux iPhone installent la version TestFlight ; connexion ; les demandes d'autorisation
  (appareil photo, photos) affichent les textes FR ; photo HEIC importée en JPEG sans métadonnées ; lien d'email
  ouvre l'app.

### L14 — Corrections d'affichage iOS
- **Toi** : captures iPhone (écran entier) des écrans de la checklist, envoyées dans la conversation.
- **Moi** : mesures sur captures, sur le modèle des mesures adb (encoche / Dynamic Island, zone du bas et
  indicateur d'accueil, clavier qui masque les champs, polices Figtree / Rufina, voiles haut/bas, feuilles du bas,
  retour par glissement) ; corrections ; nouveau build TestFlight.
- Durée : 1 à 2 sessions + builds. Risque : **moyen** (je ne vois pas l'écran en direct : dépend des captures).
- Test / prêt : checklist d'écrans validée sur les deux iPhone (modèles notés), aucune zone coupée ni masquée.

### L15 — Premier foyer
- **Toi** : accompagner l'installation ; recueillir les retours ; décider de la durée de l'essai.
- **Moi** : suivi des journaux (Auth, Edge Functions, Storage) sans lire les contenus ; corrections ; rapport.
- Prêt : les deux responsables utilisent Scolaria une semaine pour l'enfant : inscription, invitation acceptée,
  ≥ 5 ajouts au carnet (dont photos iPhone), aucune perte de session, aucune erreur bloquante.

---

## 4. Plus tard (hors du premier foyer)
- **Notifications push iOS (APNs)** : clé APNs dans le compte Apple, configuration EAS, `expo-notifications`
  distant, règles B4 (prénom + contenu utile, ouverture exacte, pas de renvoi sur modification). Push Android (FCM) avec.
- Supabase Pro (sauvegardes quotidiennes, « Leaked password protection ») si non décidé en D2.
- Fils réels avec l'enseignant (M22 en place) ; table des enseignants d'une classe (avant le collège).
- Aria via Bedrock en Irlande (avant le premier contrat école).
- Traductions des textes juridiques (autres langues).
- Test externe TestFlight / publication App Store (revue Apple, fiche, politique de confidentialité publique).

---

## 5. Coûts prévisibles
| Poste | Coût | Quand |
|---|---|---|
| Nom de domaine | ~10-15 €/an | L1 |
| Brevo | 0 € (300 emails/jour) | L2 |
| Apple Developer (individuel) | 99 €/an (à vérifier) | L12 |
| EAS (plan Starter actuel) | inchangé ; builds iOS décomptés du quota (à vérifier) | L9, L13 |
| Supabase Pro | ~25 $/mois | PAS pour le premier foyer (D2) : avant la première famille extérieure ou école |

---

## 6. Décisions (prises le 27 sept 2026)

| # | Décision |
|---|---|
| D1 | Nom de domaine : **acheté par toi après vérification INPI. En attente.** |
| D2 | **Pas de Supabase Pro pour l'instant** → lot **L-SAUV** (sauvegarde hebdomadaire base + fichiers sur ton PC, hors dépôt, restauration testée). Pro avant la première famille extérieure ou la première école. |
| D3 | `com.scolaria.app`, **iPhone uniquement**. |
| D4 | Textes des autorisations validés, **précis sur l'usage** (dessins, cahiers, documents scolaires). |
| D5 | **Une page simple** sur le domaine : politique de confidentialité, mentions légales, repli des liens ouverts sur ordinateur. |
| D6 | Effacement **différé de 30 jours avec annulation**, MAIS **compte désactivé et données invisibles immédiatement**. |
| D7 | Photo HEIC **d'un dessin**, envoyée par toi. |
| D8 | **Aria activée**, écran d'information + interrupteur (L10). |
| D9 | TestFlight : **testeurs internes**. |
| D10 | Envoi depuis **notifications@<domaine>**, réponses vers **contact@<domaine>**. **Jamais de no-reply.** |

Lancés le 27 sept sans attendre les achats : L3, L4, L6, L7, L10 et le code de L5 (emails testés avec le SMTP par défaut de
Supabase, qui n'envoie qu'aux membres de l'équipe). Migrations locales, arrêt avant Paris.

## 7. Tes achats et actions, dans l'ordre
1. ~~Décisions D1 à D10~~ (prises le 27 sept ; D1 en attente de ta vérification INPI).
2. **Acheter le nom de domaine** (L1).
3. **Créer le compte Brevo**, ajouter le domaine, créer les enregistrements DNS (SPF, DKIM, DMARC), créer la clé
   SMTP et la **saisir dans Supabase** ; créer la clé API transactionnelle et la **saisir comme secret Supabase** (L2, L4).
4. **Régler Site URL / Redirect URLs** dans Supabase (L3).
5. (Plus tard, D2) Supabase Pro avant la première famille extérieure ou école. Pour le premier foyer : sauvegarde hebdomadaire (L-SAUV).
6. Fournir 2 adresses email de test et la photo HEIC (L4, L5, L11) ; jouer la répétition générale sur le Redmi (L11).
7. **Acheter Apple Developer (individuel)** — seulement après L11 réussi (L12).
8. **Première connexion Apple dans EAS** (identifiant + code 2FA, par toi), fiche App Store Connect, **inviter les
   deux parents** comme testeurs (L13).
9. Captures iPhone de la checklist (L14), puis accompagnement du premier foyer (L15).
