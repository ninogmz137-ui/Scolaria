# Lot 3 — procédures Paris (M38, puis M39, puis M40), à exécuter par l'utilisateur

## Toutes les migrations du lot 3, dans l'ordre d'application (mis à jour le 18 nov. 2026, fin du lot 3c)

| Ordre | Sous-lot | Migration | Fichier | Objet | WARN attendu |
|-------|----------|-----------|---------|-------|--------------|
| — | 3a (fils, sans migration) | aucune | — | — | — |
| 1 | 3b | **M38** | `supabase/migrations/20261118100000_m38_lectures_mot.sql` | compteur « ont lu » (`lectures_mot`) | 1 (à valider, § « Le WARN de M38 ») |
| 2 | 3b | **M39** | `supabase/migrations/20261118110000_m39_mot_complet.sql` | mot complet : question, réponse privée citant le mot | 0 |
| 3 | 3b | **M40** | `supabase/migrations/20261118120000_m40_annonce_seule.sql` | annonce seule (réactions et `messages` retirés aux parents) | 0 (jusqu'à 7 WARN disparaissent) |
| — | 3c (fils réels côté parent) | **aucune** | — | tout existait déjà sur Paris : fils « foyer » et « individuel » (M22, M29), `fil_enseignant`, `class_posts` (M12) | — |

Le lot 3 ne demande donc que **trois cycles**, décrits ci-dessous. L'app des lots 3b et 3c fonctionne avant, pendant et après ces
cycles (sans M39 : pas de question ni de « Répondre à » ; sans M38 : pas de compteur) : l'ordre app / base n'est pas contraignant.
Inverses : `supabase/migrations_down/` (un fichier `…_down.sql` par migration), à appliquer seulement sur un « VERDICT : ARRÊT ».

**État au 19 nov. 2026 : LES TROIS CYCLES SONT FAITS sur Paris, chacun « VERDICT : OK »** (lancés par Claude sur autorisation
explicite, `--yes` à l'étape d'application seulement) :
- M38 : sauvegarde `avant_M38_cycle\2026-11-19_2021` vérifiée ; 103 → 104 WARN (celui de M38, attendu).
- M39 : sauvegarde `avant_M39_cycle\2026-11-19_2030` vérifiée ; 2.11 et 2.11 bis conformes ; 104 → 104, 0 nouveau, 0 disparu.
- M40 : sauvegarde `avant_M40_cycle\2026-11-19_2032` vérifiée ; 3.11 conforme ; 104 → 97, 0 nouveau, exactement les 7 disparitions annoncées.

**Confirmation de la CLI 3.2.0** : tapée dans PowerShell, `db push` (et `db query` sans `--read-only`) demande `Y`. Lancée sans
clavier (par Claude), la CLI refuse (« HostedMutationConsentRequiredError … Nothing was changed ») : il faut alors `--yes`,
uniquement sur l'étape d'application ou de retour arrière, et uniquement avec l'autorisation explicite de l'utilisateur.

*Rédigé le 18 nov. 2026. Une migration par cycle, dans l'ordre M38 → M39 → M40 ; un cycle ne
commence que si le précédent s'est terminé sur « VERDICT : OK ». En cas de doute à n'importe quelle étape : s'arrêter, ne pas
appliquer, m'envoyer la sortie.*

## Avant le premier cycle (une fois)

Toutes les commandes se tapent dans **PowerShell**, dans `C:\Users\admin\Scolaria`.

| # | Commande | Ce que vous devez voir |
|---|----------|------------------------|
| 0.0 | `New-Item -ItemType Directory -Force C:\Users\admin\ScolariaBackups\migrations-en-attente` | le dossier est listé (ou déjà présent : aucune erreur) |
| 0.1 | `git status` | `On branch archi-lot-3c` (elle contient tout le lot 3b ; `archi-lot-3b` convient aussi) et `nothing to commit, working tree clean` |
| 0.2 | `npx supabase@3.2.0 --version` | `3.2.0` |
| 0.3 | `Get-Content supabase\.temp\project-ref` | `nmizwmymhqleasnxcyvu` (Paris) |
| 0.4 | `Test-Path .env.local` | `False` |

**À savoir sur la CLI 3.2.0** (constaté le 18 nov.) : la cible par défaut est désormais la base **locale**. Paris se désigne
par `--remote`. L'ancien `--linked` marche encore mais est déprécié (retrait annoncé en v4) : les commandes ci-dessous
utilisent `--remote`. Le script de sauvegarde aussi (19 nov.) : sur Paris, `db query` sans `--read-only` demande une
confirmation, que la sauvegarde (sans clavier) ne peut pas donner (échec du 19 nov. à l'étape 1.4) ; ses requêtes passent
donc toutes en `--read-only`, jamais `--yes`. Le journal garde désormais toute l'erreur (stderr et stdout) et s'écrit en UTF-8 avec BOM.
`db advisors` sort du texte par défaut : il faut `--output-format json` pour la comparaison.

---

## Cycle 1 — M38 seule (compteur « ont lu »)

**Ce que fait M38** : ajoute une fonction `lectures_mot` qui rend à l'auteur d'un mot deux nombres (élèves destinataires,
élèves dont au moins un responsable a lu). Aucune table modifiée, aucune donnée touchée.

**Avertissement attendu, à valider avant ce cycle** :
`authenticated_security_definer_function_executable_public_lectures_mot_p_mot_id uuid`
(explication et alternative : § « Le WARN de M38 » en bas de page).

| # | Commande | Ce que vous devez voir |
|---|----------|------------------------|
| 1.1 | `Move-Item supabase\migrations\20261118110000_m39_mot_complet.sql C:\Users\admin\ScolariaBackups\migrations-en-attente\` | rien |
| 1.2 | `Move-Item supabase\migrations\20261118120000_m40_annonce_seule.sql C:\Users\admin\ScolariaBackups\migrations-en-attente\` | rien |
| 1.3 | `git status --short` | exactement deux lignes ` D supabase/migrations/…m39…` et ` D …m40…` |
| 1.4 | `node scripts/sauvegarde-semaine.mjs --racine 'C:\Users\admin\ScolariaBackups\avant_M38_cycle'` | se termine sans erreur ; `Get-Content C:\Users\admin\ScolariaBackups\avant_M38_cycle\journal.log -Tail 1` montre `OK \| remote \| AAAA-MM-JJ_HHmm \| … tables, … lignes, … fichiers` |
| 1.5 | `Get-ChildItem C:\Users\admin\ScolariaBackups\avant_M38_cycle -Directory` | un dossier `AAAA-MM-JJ_HHmm` (notez son nom) |
| 1.6 | `node scripts/verifier-sauvegarde.mjs 'C:\Users\admin\ScolariaBackups\avant_M38_cycle\AAAA-MM-JJ_HHmm'` | dernière ligne `VÉRIFICATION RÉUSSIE.` |
| 1.7 | `npx supabase@3.2.0 db advisors --remote --output-format json \| Out-File -Encoding utf8 C:\Users\admin\ScolariaBackups\avant_M38_cycle\advisors-avant.txt` | rien (le fichier est créé) |
| 1.8 | `node scripts/comparer-advisors.mjs C:\Users\admin\ScolariaBackups\avant_M38_cycle\advisors-avant.txt C:\Users\admin\ScolariaBackups\avant_M38_cycle\advisors-avant.txt` | `Avant : 0 ERROR, 103 WARN, 0 INFO`. **Un autre nombre : arrêt**, m'envoyer le fichier (une version plus récente du contrôleur peut avoir ajouté des avertissements déjà présents ; à trier avant d'appliquer) |
| 1.9 | `npx supabase@3.2.0 db push --remote --dry-run --skip-vault` | **une seule** migration listée : `20261118100000_m38_lectures_mot.sql`. Deux ou plus : arrêt |
| 1.10 | `npx supabase@3.2.0 db push --remote --skip-vault` | **commande seule**. Répondre `Y` à la confirmation ; voir `Applying migration 20261118100000_m38_lectures_mot.sql...` puis `Finished supabase db push.` |
| 1.11 | `npx supabase@3.2.0 db query --remote --read-only "select p.prosecdef as definer, p.proconfig as config, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as authentifie from pg_proc p where p.proname = 'lectures_mot'"` | une ligne : `definer` vrai, `config` = `search_path=""`, `anon` faux, `authentifie` vrai |
| 1.12 | `npx supabase@3.2.0 migration list --remote` | la ligne `20261118100000` a la même valeur en Local et en Remote |
| 1.13 | `npx supabase@3.2.0 db advisors --remote --output-format json \| Out-File -Encoding utf8 C:\Users\admin\ScolariaBackups\avant_M38_cycle\advisors-apres.txt` | rien |
| 1.14 | `node scripts/comparer-advisors.mjs C:\Users\admin\ScolariaBackups\avant_M38_cycle\advisors-avant.txt C:\Users\admin\ScolariaBackups\avant_M38_cycle\advisors-apres.txt --attendu "authenticated_security_definer_function_executable_public_lectures_mot_p_mot_id uuid"` | `Nouvelles clés (1)` marquée `attendue`, `Clés disparues (0)`, `VERDICT : OK` |
| 1.15 | `Move-Item C:\Users\admin\ScolariaBackups\migrations-en-attente\20261118110000_m39_mot_complet.sql supabase\migrations\` | rien |
| 1.16 | `Move-Item C:\Users\admin\ScolariaBackups\migrations-en-attente\20261118120000_m40_annonce_seule.sql supabase\migrations\` | rien |
| 1.17 | `git status` | `nothing to commit, working tree clean` |

**Si 1.14 dit ARRÊT** (ou si 1.10 échoue après avoir commencé) — retour en arrière :
1. `npx supabase@3.2.0 db query --remote -f supabase\migrations_down\20261118100000_m38_lectures_mot_down.sql` (répondre `Y` si demandé)
2. `npx supabase@3.2.0 migration repair --status reverted 20261118100000 --remote`
3. `npx supabase@3.2.0 migration list --remote` : `20261118100000` n'a plus de valeur en Remote.
4. Remettre M39 et M40 (1.15, 1.16), puis m'envoyer les sorties. La sauvegarde de 1.4 n'est à restaurer que si une donnée a
   été touchée — M38 n'en touche aucune.

---

## Cycle 2 — M39 seule (mot complet : question, réponse privée citant le mot)

**Ce que fait M39** : deux colonnes sur `mots_liaison` (`question`, `question_libelle`) ; les anciens mots « participation »
reçoivent `question = vrai` (Paris : table vide le 18 nov., donc 0 ligne) ; le contrôle des réponses accepte oui / peut-être /
non sur une question ; `teacher_messages.mot_id` (le mot cité) ; un parent ne cite un mot que dans son fil individuel ; plus
personne ne peut réécrire le texte d'un message de fil (seul « lu » reste modifiable). **Aucun WARN nouveau attendu.**

Même déroulé que le cycle 1, avec ces différences :

| # | Différence |
|---|------------|
| 2.1-2.2 | Ranger **M38 n'est pas nécessaire** (déjà appliquée, elle n'apparaîtra pas) ; ranger seulement M40 : `Move-Item supabase\migrations\20261118120000_m40_annonce_seule.sql C:\Users\admin\ScolariaBackups\migrations-en-attente\` |
| 2.3 | `git status --short` : une seule ligne ` D …m40…` |
| 2.4-2.8 | Dossier `C:\Users\admin\ScolariaBackups\avant_M39_cycle` partout. En 2.8 : `Avant : 0 ERROR, 104 WARN, 0 INFO` (103 + celui de M38) |
| 2.9 | Essai à blanc : **seule** `20261118110000_m39_mot_complet.sql` |
| 2.10 | `npx supabase@3.2.0 db push --remote --skip-vault`, commande seule, `Y` |
| 2.11 | `npx supabase@3.2.0 db query --remote --read-only "select table_name, column_name from information_schema.columns where table_schema = 'public' and ((table_name = 'mots_liaison' and column_name in ('question', 'question_libelle')) or (table_name = 'teacher_messages' and column_name = 'mot_id')) order by 1, 2"` → 3 lignes (`mots_liaison question`, `mots_liaison question_libelle`, `teacher_messages mot_id`) |
| 2.11 bis | `npx supabase@3.2.0 db query --remote --read-only "select has_column_privilege('authenticated', 'public.teacher_messages', 'text', 'update') as texte, has_column_privilege('authenticated', 'public.teacher_messages', 'read', 'update') as lu"` → `texte` faux, `lu` vrai |
| 2.14 | `node scripts/comparer-advisors.mjs …\avant_M39_cycle\advisors-avant.txt …\avant_M39_cycle\advisors-apres.txt` (**sans** `--attendu`) → `Nouvelles clés (0)`, `VERDICT : OK` |
| 2.15 | Remettre M40 seulement |
| Retour arrière | `supabase\migrations_down\20261118110000_m39_mot_complet_down.sql`, puis `migration repair --status reverted 20261118110000 --remote`. Attention : l'inverse retire les colonnes, donc les questions et les citations écrites entre-temps (aucune tant que l'app n'est pas publiée) |

---

## Cycle 3 — M40 seule (annonce seule)

**Ce que fait M40** : les parents ne peuvent plus réagir aux annonces de classe ni voir les réactions des autres familles
(l'enseignant voit celles de ses annonces) ; la règle d'écriture de l'ancienne table `messages` est retirée (l'app n'y écrit
plus depuis M32 ; les messages parent → enseignant passent par les fils, testé T24). Réactions déjà en base : conservées.
**Aucun WARN nouveau attendu ; jusqu'à 7 disparitions attendues** (politiques supprimées) :
`auth_rls_init_plan_public_class_post_reactions_Anyone can react` et les 6 `multiple_permissive_policies` de
`public.class_post_reactions` (anon, authenticated, authenticator, cli_login_postgres, dashboard_user,
supabase_privileged_role). Toute autre disparition : me l'envoyer.

| # | Différence |
|---|------------|
| 3.1-3.3 | Rien à ranger (M38 et M39 déjà appliquées) ; `git status` propre |
| 3.4-3.8 | Dossier `C:\Users\admin\ScolariaBackups\avant_M40_cycle`. En 3.8 : `Avant : 0 ERROR, 104 WARN, 0 INFO` |
| 3.9 | Essai à blanc : **seule** `20261118120000_m40_annonce_seule.sql` |
| 3.10 | `npx supabase@3.2.0 db push --remote --skip-vault`, commande seule, `Y` |
| 3.11 | `npx supabase@3.2.0 db query --remote --read-only "select tablename, policyname, cmd from pg_policies where tablename in ('class_post_reactions', 'messages') order by 1, 3"` → `class_post_reactions reactions_select SELECT`, `messages messages_select SELECT`, `messages messages_update UPDATE` (et rien d'autre) |
| 3.14 | `comparer-advisors.mjs` sans `--attendu` → `Nouvelles clés (0)`, disparues = celles annoncées ci-dessus, `VERDICT : OK` |
| Retour arrière | `supabase\migrations_down\20261118120000_m40_annonce_seule_down.sql`, puis `migration repair --status reverted 20261118120000 --remote` |

---

## Après les trois cycles

- Dites-moi « M38/M39/M40 appliquées » : je déplace le WARN de M38 dans la liste validée de `tasks/warns-attendus.md`, je
  mets à jour todo.md et primer, puis on décide de la fusion d'`archi-lot-3b` dans main.
- L'app de la branche fonctionne **avant comme après** les migrations : sans M39 elle relit les mots sans la question et
  masque « Répondre à… » ; sans M38 le compteur « ont lu » est simplement absent. Aucun ordre imposé entre app et base.

---

## Le WARN de M38

**Ce que Supabase signale** : `lectures_mot` s'exécute avec les droits de son créateur (SECURITY DEFINER) et tout compte
connecté peut l'appeler par l'API ; une telle fonction contourne la RLS, donc mal écrite elle pourrait laisser lire ce qu'on ne
doit pas. **Pourquoi c'est acceptable ici** : elle ne rend que deux nombres agrégés, et seulement à l'auteur du mot (tout autre
appelant obtient 0 ligne ; `anon` n'y a pas accès, `search_path` vide), c'est testé (T21 à T23 en SQL, 2 vérifications dans
`scripts/test-lot3b-local.mjs`), et c'est le même schéma que les 32 fonctions déjà validées de la section 1.

**Version sans avertissement** : elle existe, mais ne change rien à la sécurité. On garde dans `public` une fonction
SECURITY INVOKER (exécutée avec les droits de l'appelant, donc non signalée) qui appelle une fonction SECURITY DEFINER rangée
dans un schéma `private` non exposé par l'API. Le contrôleur ne regarde que les schémas exposés, donc plus de WARN. Mais
`authenticated` doit pouvoir exécuter la fonction privée, qui reste joignable par l'enveloppe : on masque le signal sans réduire
l'exposition, au prix d'un nouveau schéma et de droits supplémentaires. Indice local : la base locale ne produit aucun de ces
WARN (les schémas exposés n'y sont pas déclarés), ce qui confirme que le contrôle dépend de l'exposition — à confirmer sur Paris
si cette voie était retenue. **Recommandation : garder M38 telle quelle et valider le WARN.**
