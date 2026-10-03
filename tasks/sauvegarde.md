# Sauvegarde hebdomadaire et restauration (L-SAUV, 3 oct 2026)

## Ce qui est sauvegardé
Tâche planifiée Windows **« Scolaria - Sauvegarde hebdomadaire »** : **dimanche 10 h** ; si le PC est éteint à ce moment, la
tâche part dès que possible (rattrapage) ; session Windows ouverte et réseau requis ; aucun mot de passe stocké.
Script : `scripts/sauvegarde-semaine.mjs` (Node, lecture seule sur Paris ; la tâche lance `node.exe` dans le dépôt). Destination, **hors dépôt** :
`C:\Users\admin\ScolariaBackups\hebdo\AAAA-MM-JJ_HHmm\`, **8 sauvegardes complètes conservées** (les plus anciennes sont supprimées
après une réussite).

| Fichier | Contenu |
|---|---|
| `roles.sql`, `schema.sql`, `data.sql` | `supabase db dump` : rôles, schéma (public), données de `public` ET `auth` (comptes) et `storage` (métadonnées) |
| `extras-auth-storage.sql` | ce que `db dump` n'exporte pas : déclencheur `on_auth_user_created` (profil à l'inscription) et politiques de `storage.objects` (bucket carnet) — rejouable |
| `fichiers/carnet/…` + `fichiers.json` | tous les fichiers du bucket (API Storage), avec taille et SHA-256 |
| `comptes.json` | nombre de lignes par table (public, auth) au moment de la sauvegarde |
| `manifeste.json` | statut `complete`, durée, nombres, structure (politiques, fonctions, déclencheurs, index) |

Une sauvegarde n'existe que si le dossier a été renommé (`.en-cours-…` → date) : tout échec supprime le dossier partiel.
**Journal** : `C:\Users\admin\ScolariaBackups\hebdo\journal.log` (une ligne par exécution : `OK` ou `ECHEC` + raison). **À lire en début de
session** (comme `journal_executions_effacement`) ; une ligne `ECHEC` ou une sauvegarde de plus de 8 jours = à traiter le jour même.

## Aucun secret
La CLI Supabase s'authentifie avec ta session (`supabase login`) et joint la base par un rôle temporaire ; les fichiers passent par
l'API Storage de la CLI. Rien n'est lu dans `.env`, rien dans le dépôt. Si la session CLI expire : `npx supabase login` (toi, dans ton
terminal), puis relancer la tâche.

## Prérequis techniques (constatés)
- **Antivirus Avast** (actif ; Defender est désactivé) : il a SUPPRIMÉ à trois reprises des scripts `.ps1` écrits dans le dépôt et un `supabase.exe` fraîchement installé. Les scripts sont donc en **Node** (`.mjs`), comme les `test-*.mts` qui survivent. Si un script disparaît : regarder la quarantaine d'Avast (c'est à toi de décider d'une exclusion ; je ne touche pas aux réglages de sécurité).
- **Sortie JSON de la CLI** : hors session d'agent (tâche planifiée) la CLI imprime un tableau texte au lieu de JSON ; le script passe `--agent yes` à `db query` et `storage ls`.
- **Docker Desktop** : `db dump` s'exécute dans un conteneur. Le script le démarre s'il est arrêté (attente 3 min max).
- **CLI Supabase** : le script utilise la copie intacte du cache npx (`%LOCALAPPDATA%\npm-cache\_npx\*\node_modules\.bin\supabase.cmd`).
  Un `npm install supabase` frais dans un autre dossier a vu son binaire `supabase.exe` disparaître juste après l'installation (cause non
  établie, aucune détection Defender) : ne pas réinstaller ; si le cache npx est vidé, le journal dira « CLI Supabase introuvable » —
  relancer une fois `npx supabase --version` pour le reconstituer.
- La sauvegarde contient des données personnelles (comptes, enfants, hachages de mots de passe) : le dossier reste sur ce PC, hors dépôt ;
  à chiffrer (BitLocker) ou à copier sur un support de ton choix si tu veux une copie hors du PC. **Un PC perdu = sauvegardes perdues** :
  la copie hors PC est un choix qui te revient (non faite).

## Restauration (testée sur la base LOCALE)
```
node scripts/restaurer-sauvegarde.mjs C:\Users\admin\ScolariaBackups\hebdo\<date>
```
Cible codée en dur : base locale Docker (`supabase_db_Scolaria`), **jamais Paris**. Étapes : `db reset` local, vidage, rôles, schéma,
déclencheurs/politiques auth+storage, données (sans `storage.objects`), envoi des fichiers un par un (type MIME fixé par l'extension),
puis contrôles : lignes de chaque table, politiques / fonctions / déclencheurs / index, déclencheur d'inscription, bucket, objets,
**SHA-256 de chaque fichier**. Code de sortie 0 = identique. Après un test, `npx supabase db reset` remet la base locale propre.

Résultats (3 oct) : sauvegarde locale (443 lignes, 10 fichiers) restaurée : 66 tables, structure et 10/10 fichiers identiques ;
sauvegarde RÉELLE de Paris (99 lignes, 0 fichier) restaurée : 66 tables et structure identiques ; test inverse (fichier altéré, comptage
falsifié) : détecté, code 1.

## Restaurer vers un projet Supabase distant (sinistre) — à la main, sur validation
Nouveau projet (Paris) → appliquer `schema.sql` (ou les migrations jusqu'à la version de la sauvegarde) → `extras-auth-storage.sql` →
`data.sql` (`session_replication_role = replica` en tête : aucun déclencheur) → renvoyer les fichiers (`storage cp`, un par un, type MIME
par extension) → rejouer les contrôles ci-dessus à la main. Les secrets (Vault `cle_service_effacements`, secrets des Edge Functions,
tâches pg_cron de M26) ne sont PAS dans la sauvegarde : à reposer.

## Limites connues
- Le Vault, les secrets d'Edge Functions, la configuration Auth (dashboard) et les tâches `cron` ne sont pas sauvegardés.
- PC éteint plus d'une semaine = pas de sauvegarde (perte possible d'une semaine ; rattrapage au prochain démarrage).
- Supabase Pro (sauvegardes quotidiennes + PITR) : avant la première famille extérieure (décision D2).
