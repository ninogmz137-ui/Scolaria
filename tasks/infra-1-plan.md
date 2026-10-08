# INFRA-1 — Migration Supabase Londres → Paris (plan, 25 sept 2026)

**Statut : PLAN À VALIDER. Rien n'a été exécuté. Aucune action sur la prod.**

## État de départ (lu en lecture seule le 25 sept)
- Projet `eklpzspvfjfqgqgugmxl` « Scolaria », région **eu-west-2 (Londres)**, Postgres 17, plan gratuit.
- Données : 3 comptes auth (3 emails confirmés, uniquement email + mot de passe, 0 MFA), 2 profils, 2 enfants, **8 lignes** au total dans `public`. Aucune vraie famille.
- Storage : **0 bucket, 0 fichier** (M15 « bucket » pas encore créée).
- Edge Functions : `aria` seule (v4, verify_jwt = true). Secrets : `ANTHROPIC_API_KEY`, `ARIA_MODEL`.
- Extensions : pgcrypto, uuid-ossp, pg_stat_statements, pg_graphql, supabase_vault (par défaut). Pas de pg_cron, pg_net ni wrappers.
- 26 migrations dans `supabase/migrations`. Un `db reset` local les rejoue toutes sur une base vide (fait pour les tests M17/M18) → le rejeu fonctionne.
- App : URL et clé anon uniquement dans `.env` (non versionné). L'app de dev sur le Redmi lit le JS depuis Metro → bascule = `.env` + redémarrage de Metro. Aucun build de production publié.

## Principe
Nouveau projet en **eu-west-3 (Paris)**. Doc Supabase « Change Project Region » : une région ne se change pas, on crée un projet et on migre. « Restore to a new project » est réservé aux plans payants **et garde la même région** → inutilisable ici.

## Étapes

### 0. Gel et sauvegarde
- Faire : plus aucune écriture sur Londres pendant l'opération. Nouvelle sauvegarde hors dépôt, `C:\Users\admin\ScolariaBackups\<date>_avant_INFRA-1\` : rôles, schéma, données (`db dump --linked`, `--role-only`, `--data-only --use-copy`).
- Risque : quasi nul (lecture seule).
- Vérification : fichiers non vides ; `data.sql` contient `auth.users` (3 lignes) et les 8 lignes de `public`.
- Retour arrière : sans objet.

### 1. Création du projet Paris (plan gratuit)
- Faire : **vous**, depuis le tableau de bord (organisation actuelle, région « West EU (Paris) », nouveau mot de passe base dans votre gestionnaire). ⚠ Le plan gratuit limite le nombre de projets actifs : vérifier qu'un 2e projet actif est possible pendant la bascule (sinon, mettre Londres en pause d'abord, après l'étape 0).
- Risque : faible.
- Vérification : `get_project` → `region = eu-west-3`, statut ACTIVE_HEALTHY.
- Retour arrière : supprimer le projet vide.

### 2. Rejeu des 26 migrations (pas de restauration du schéma)
- Faire : `supabase link` vers Paris, `db push --dry-run` (26 attendues), puis `db push`.
- Risque : moyen si une migration dépend d'un état créé à la main à Londres. Le rejeu local réussi le rend peu probable.
- Vérification : `list_migrations` = 26 ; diff de schéma Londres ↔ Paris (`db dump` des deux, comparaison de `public`) : aucune différence hors ordre ; grants et politiques identiques.
- Retour arrière : supprimer le projet Paris et en recréer un (rien ne pointe encore vers lui).

### 3. Transfert des données, dont auth.users
- Faire : importer d'abord **auth** (`users`, `identities`), puis **public** (8 lignes, dans l'ordre des clés étrangères), avec `session_replication_role = replica` pour ne pas redéclencher les triggers (création d'enfant, verrous M17/M18). Sessions, refresh tokens et journaux d'audit ne sont **pas** copiés.
- Mots de passe : la doc Supabase (« Migrating Auth Users Between Supabase Projects ») confirme que les hachages bcrypt se transfèrent ; les mots de passe restent valables. Le secret JWT change : les jetons Londres deviennent invalides, il faut se reconnecter une fois (accepté, 3 comptes de test).
- Risque : moyen (ordre des clés étrangères, colonnes d'auth propres à la version de GoTrue).
- Vérification : mêmes comptages qu'à l'étape 0 ; `select count(*)` par table identique ; **connexion réelle des 3 comptes de test** (mot de passe inchangé) ; un parent voit ses enfants et rien d'autre.
- Retour arrière : vider Paris (truncate) et recommencer ; Londres n'a pas bougé.

### 4. Storage
- Faire : rien à copier (0 bucket, 0 fichier). Les buckets viendront de migrations (M15) : ne jamais les créer à la main.
- Vérification : `storage.buckets` vide des deux côtés.
- Retour arrière : sans objet.

### 5. Edge Function « aria » et secrets
- Faire : `supabase functions deploy aria` vers Paris (code du dépôt) ; **vous** posez les secrets dans le tableau de bord ou avec `supabase secrets set` : `ANTHROPIC_API_KEY` (nouvelle clé dédiée, l'ancienne révoquée après bascule), `ARIA_MODEL`. Jamais dans le dépôt ni un `.env`.
- Nouveau : dans `ariaApi.ts`, `functions.invoke('aria', { region: 'eu-west-3' })`. D'après la doc Supabase « Regional Invocations », une Edge Function s'exécute par défaut dans la région **la plus proche de l'utilisateur**, qui n'est pas forcément dans l'UE.
- Risque : faible.
- Vérification : une question à Aria depuis l'app → réponse ; en-tête `x-sb-edge-region: eu-west-3` ; journaux sans texte de message ; `npm run test:emergency` (22 cas) ; urgence toujours interceptée sans appel au modèle.
- Retour arrière : l'app repointe sur Londres (étape 7).

### 6. Configuration Auth
- Faire : **vous**, dans le tableau de bord Paris, en recopiant Londres : Site URL, URL de redirection (schéma `scolaria://` et URL de dev), « Confirm email » activé, modèles d'email en français, durées d'OTP et de session, limites de débit.
- Découverte de l'audit : le SMTP par défaut de Supabase n'envoie **qu'aux membres de l'équipe** du projet (doc « Send emails with custom SMTP »). Confirmation d'email et invitations d'un 2e responsable **ne partiront pas vers de vraies familles** sans SMTP personnalisé → à choisir avant l'ouverture (voir audit).
- Vérification : création d'un compte de test (email d'un membre de l'équipe) → email reçu, lien qui ouvre l'app ; réinitialisation du mot de passe.
- Retour arrière : sans objet (configuration propre au projet Paris).

### 7. Bascule de l'app
- Faire : `.env` → URL et clé anon de Paris ; redémarrage de Metro. Variables EAS (profil development) mises à jour si elles existent. Aucun build EAS (les builds suivent la vérification locale).
- Risque : faible, une seule source de configuration.
- Vérification : Redmi et web : connexion, Accueil, Suivi, invitation ; `grep -r eklpzspvfjfqgqgugmxl` hors `.temp` / backups → 0.
- Retour arrière : remettre l'ancien `.env` (Londres reste intact tant qu'il n'est pas en pause).

### 8. Tests RLS rejoués sur Paris
- Faire : les suites SQL (`supabase/tests`, dont M17 25 cas et M18 11 cas, et les tests multi-utilisateurs de la Phase A) sont prévues pour une base **locale** jetable. Sur Paris : lancer uniquement les tests qui s'exécutent dans une transaction annulée (`BEGIN … ROLLBACK`). Les autres restent en local, rejoués sur un dump du schéma Paris.
- Vérification : tous verts, aucune ligne résiduelle (comptages identiques avant / après).
- Retour arrière : sans objet.

### 9. Advisors
- Faire : sécurité + performance sur Paris.
- Attendu : 0 ERROR, mêmes WARN qu'à Londres (pg_graphql, SECURITY DEFINER voulues, protection des mots de passe divulgués = plan Pro).

### 10. Londres en pause (pas supprimé), 2 semaines
- Faire : mise en pause depuis le tableau de bord ; date de suppression notée au todo (J+14), **suppression seulement sur votre accord**.
- Retour arrière : « Restore project » pendant la pause.

## Hors périmètre de ce lot (à décider)
- SMTP personnalisé (fournisseur UE), region forcée pour Aria : voir l'audit.
- Suppression définitive de Londres (J+14, sur votre accord).

## Audit « aucun transit hors UE » (25 sept)

| Service | Données qui sortent | Pourquoi | Hors UE ? | Alternative UE |
|---|---|---|---|---|
| Supabase (après migration) | Tout le carnet | Base, Auth, fonctions | Stockage à Paris. Supabase et AWS sont des sociétés américaines (sous-traitants) [à vérifier : DPA Supabase et liste des sous-traitants] | Déjà UE pour le stockage |
| Edge Function `aria` | Question du parent, prénom + niveau | Exécution de la fonction | Par défaut, région la plus proche de l'utilisateur | Forcer `region: 'eu-west-3'` |
| **Anthropic (Aria)** | Question du parent, prénom + niveau de l'enfant, consigne fixe | Réponse d'Aria | **Oui.** API directe : `inference_geo` = `global` ou `us` seulement ; stockage aux États-Unis | Claude via Google Cloud multi-région `eu` ou Amazon Bedrock (régions UE), +10 % [à vérifier, voir plus bas] |
| Emails Auth (confirmation, invitation, mot de passe) | Adresse email, lien | Comptes | SMTP par défaut de Supabase : localisation non documentée ; n'envoie qu'à l'équipe | SMTP UE, par exemple Brevo (France, cité par la doc Supabase) [autres fournisseurs à vérifier] |
| Notifications push | Aujourd'hui : **aucune** (notifications locales seulement). Plus tard : jeton + titre (prénom + objet) | Push | Oui le jour où elles arrivent : service push Expo (États-Unis), FCM (Google), APNs (Apple) | Pas d'alternative UE pour FCM / APNs ; levier = contenu minimal |
| EAS Build (Expo) | Code source et variables publiques (URL + clé anon), **aucune donnée de famille** | Compilation | Oui (Expo : transferts vers les États-Unis, clauses contractuelles types, DPF) | Build local (`eas build --local`) |
| EAS Update (`u.expo.dev`) | Adresse IP et informations de l'appareil au téléchargement d'une mise à jour, aucune donnée de carnet | Mises à jour OTA | Oui | Serveur de mises à jour auto-hébergé, ou pas d'OTA |
| Polices (Figtree, Rufina) | Rien | Embarquées dans l'app (`@expo-google-fonts`) | Non | — |
| Analytics / crash | Rien | Aucun SDK (vérifié : pas de Sentry, Firebase, PostHog…) | Non | — |
| Google Vision | Rien | Plus de clé dans l'app (seules `EXPO_PUBLIC_SUPABASE_*` restent) | Non | — |
| Stores (Google Play, App Store) | Rapports de plantage et statistiques des stores | Distribution | Oui (réglages des stores) | — |

### Anthropic : ce que disent les sources officielles
- Data residency : `inference_geo` n'accepte que `"global"` (par défaut, « may run in any available geography ») ou `"us"` ; « Workspace geo: Only "us" is currently available ». Aucune option UE sur l'API directe. — https://platform.claude.com/docs/en/manage-claude/data-residency
- Localisation : trafic routé vers des pays des États-Unis, d'Europe, d'Asie et d'Australie ; « Data is stored in the US ». — https://privacy.claude.com/en/articles/7996890
- Conservation (API commerciale) : entrées et sorties supprimées « within 30 days » ; jusqu'à 2 ans si contenu signalé (scores de classification jusqu'à 7 ans). — https://privacy.claude.com/en/articles/7996866
- La doc plateforme dit aussi : « Conversation content … is not retained by default », sauf les Covered Models (30 jours). Les deux pages ne disent pas la même chose → **retenir la plus prudente (≤ 30 jours)**. Claude Sonnet 5 **n'est pas** un Covered Model. Données « never used for model training without your express permission ». ZDR (zéro conservation) : sur demande à l'équipe commerciale d'Anthropic, après accord. — https://platform.claude.com/docs/en/manage-claude/api-and-data-retention · https://support.claude.com/en/articles/15425695
- Google Cloud : points de terminaison multi-région `eu`, +10 %. Claude Sonnet 5 listé ; « specific regional endpoints support Claude Sonnet 4.6 and earlier ». [à vérifier : quelles régions compose `eu`, et si Londres / Zurich en font partie]. — https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai
- Amazon Bedrock : Claude Sonnet 5 ouvert à tous ; le profil d'inférence « EU » couvre aussi **Londres (eu-west-2) et Zurich (eu-central-2)**, qui ne sont pas dans l'UE ; routage dans une seule région (« In-region only ») dans l'UE : Irlande (eu-west-1) et Stockholm (eu-north-1). [à vérifier dans la console AWS : Sonnet 5 disponible en point de terminaison régional à Dublin]. — https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock

## Formulation validée (25 sept) — à appliquer APRÈS la migration réussie
> « Les données du carnet de votre enfant sont hébergées dans l'Union européenne, à Paris. Aria s'appuie sur un modèle d'Anthropic, société américaine. Quand vous utilisez Aria, vos messages, l'historique de la conversation, le prénom et le niveau scolaire de l'enfant sont traités hors de l'Union européenne. Anthropic les efface sous 30 jours, sauf s'ils sont signalés pour non-respect de ses règles d'utilisation (conservation jusqu'à 2 ans). Ils ne servent jamais à entraîner le modèle. Aria ne reçoit rien d'autre du carnet. En cas de message de détresse, rien n'est envoyé à Aria. »

Remplace « OVH France » et « aucun transit hors UE » dans CLAUDE.md, VISION.md et la charte.

AES-256 : **confirmé**, à garder avec sa source — « All customer data is encrypted at rest with AES-256 and in transit via TLS. » (https://supabase.com/security, lu le 25 sept 2026).

Étape 1 vérifiée (25 sept) : plan gratuit = 2 projets actifs, comptés sur toutes les organisations dont on est propriétaire ou administrateur ; les projets en pause ne comptent pas (docs « About billing on Supabase » et « Billing FAQ »). Situation : 1 organisation (plan free), 1 projet actif (Londres) → le projet Paris peut être créé sans mettre Londres en pause.

## Formulation proposée initialement (remplacée par la version validée ci-dessus)
> « Les données du carnet de votre enfant (comptes, mots, messages, compétences, documents) sont hébergées dans l'Union européenne, à Paris. Aria, l'assistante, s'appuie sur un modèle d'intelligence artificielle d'Anthropic, société américaine : quand vous lui posez une question, votre question, le prénom et le niveau scolaire de l'enfant sont traités hors de l'Union européenne, puis effacés par Anthropic sous 30 jours au plus. Ils ne servent jamais à entraîner le modèle. Aria ne reçoit rien d'autre du carnet. En cas de message de détresse, rien n'est envoyé à Aria. »

Si Aria passe par un point de terminaison UE (Bedrock en Irlande, par exemple, vérifié), la 2e phrase devient : « … sont traités dans l'Union européenne ; Anthropic, société américaine, n'y a pas accès. »

À retirer ou corriger ensuite (sur votre accord) : « Hébergement OVH France » (faux), « aucun transit hors UE » (faux tant qu'Aria passe par l'API directe et pour les push), « Chiffrement AES-256 at-rest » [à vérifier dans la doc sécurité Supabase avant de le garder].
