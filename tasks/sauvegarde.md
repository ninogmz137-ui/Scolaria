# Sauvegarde hebdomadaire et restauration (L-SAUV, 3 oct 2026)

## Ce qui est sauvegardé
Tâche planifiée Windows **« Scolaria - Sauvegarde hebdomadaire »** : **dimanche 10 h** ; si le PC est éteint à ce moment, la
tâche part dès que possible (rattrapage) ; session Windows ouverte et réseau requis ; aucun mot de passe stocké.
Script : `scripts/sauvegarde-semaine.mjs` (Node, lecture seule sur Paris ; la tâche lance `node.exe` dans le dépôt). Destination, **hors dépôt** :
`C:\Users\admin\ScolariaBackups\hebdo\AAAA-MM-JJ_HHmm\`, **conservées 56 jours (8 semaines)** : après chaque réussite, les sauvegardes hebdomadaires plus vieilles sont supprimées (la plus récente jamais) ;
les dossiers **« avant_Mxx »** (sauvegardes avant migration, dans `C:\Users\admin\ScolariaBackups\`) sont supprimés après **30 jours**. Chaque suppression est
**journalisée** (statut `PURGE` dans `hebdo\journal.log`). Voir la liste avec leur âge, sans rien supprimer : `node scripts/rotation-sauvegardes.mjs`.
Les dossiers **« captures-… »** (captures d'écran de test, qui montrent des données réelles) sont aussi supprimés après **30 jours** (date lue dans le nom, sinon dans un sous-dossier daté, sinon la date de modification). **Aucun fichier d'environnement (`.env`, `env.*`) ne doit se trouver dans un dossier de sauvegarde** (constat du 4 oct : un `env.londres` de 145 octets dans `2026-09-25_avant_INFRA-1`, à supprimer sur accord). La purge des `avant_Mxx` et des `captures-…` n'a lieu qu'avec la destination par défaut (ou `--purge-avant <dossier>`). Test : `npm run test:rotation-sauvegardes`.

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

## Copie chiffrée sur un disque externe (à faire par toi)
Pourquoi : les sauvegardes du PC disparaissent avec le PC. Contenu sensible (comptes, enfants, hachages de mots de passe) : **jamais en clair sur un support amovible**.

1. **Chiffrer le disque (BitLocker, intégré à Windows 11 Pro)** : brancher le disque → clic droit dessus dans l'Explorateur → « Activer BitLocker » → mot de passe long (gestionnaire de mots de passe) → **sauvegarder la clé de récupération AILLEURS que sur ce disque et que sur ce PC** (papier dans un lieu sûr, ou ton gestionnaire de mots de passe) → « chiffrer tout le lecteur » → mode « compatible » (disque amovible). Attendre la fin du chiffrement avant la première copie. Je n'ai jamais besoin du mot de passe ni de la clé.
2. **Copier** (dans un terminal, `E:` = le disque ; sauvegarde la plus récente) :
   ```
   robocopy "C:\Users\admin\ScolariaBackups\hebdo" "E:\ScolariaBackups\hebdo" /E /XD ".en-cours-*" /R:2 /W:5
   ```
   `/E` copie sans jamais supprimer sur le disque (pas de `/MIR`, qui effacerait aussi à la destination).
3. **Vérifier la copie** (empreintes SHA-256 de chaque fichier + comparaison avec l'original) :
   ```
   node scripts/verifier-sauvegarde.mjs "C:\Users\admin\ScolariaBackups\hebdo\<date>" "E:\ScolariaBackups\hebdo\<date>"
   ```
   Doit finir par `VÉRIFICATION RÉUSSIE`. Une fois par trimestre, aller plus loin : `node scripts/restaurer-sauvegarde.mjs "E:\ScolariaBackups\hebdo\<date>"` (base locale, jamais Paris) ; sortie 0 = la copie est restaurable. Ensuite `npx supabase db reset` remet la base locale propre.
4. **Rotation** : sur le disque, garder les **8 dernières semaines** (comme sur le PC) + éventuellement la première sauvegarde de chaque mois pendant 12 mois. Supprimer à la main les dossiers plus anciens, **jamais le seul exemplaire valide** : avant de supprimer, vérifier (étape 3) qu'au moins 2 copies récentes sont réussies. Rythme conseillé : une copie par mois (dimanche, après le passage de la tâche), plus avant tout changement risqué.
5. **Hygiène** : éjecter proprement le disque, le ranger débranché ; ne jamais le laisser branché en permanence (un incident sur le PC l'atteindrait aussi) ; changer le mot de passe BitLocker si le disque est perdu ou prêté. Les secrets (Vault, secrets d'Edge Functions) ne sont PAS dans la sauvegarde : les noter dans ton gestionnaire de mots de passe.

## Limites connues
- Le Vault, les secrets d'Edge Functions, la configuration Auth (dashboard) et les tâches `cron` ne sont pas sauvegardés.
- PC éteint plus d'une semaine = pas de sauvegarde (perte possible d'une semaine ; rattrapage au prochain démarrage).
- Supabase Pro (sauvegardes quotidiennes + PITR) : avant la première famille extérieure (décision D2).
