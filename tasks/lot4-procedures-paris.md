# Lot 4 — procédures Paris (M41, puis M42, puis M43), à exécuter par l'utilisateur

*Rédigé le 21 nov. 2026, sur le modèle de `tasks/lot3b-procedures-paris.md`. RIEN n'a été appliqué à Paris.
Une migration par cycle, dans l'ordre M41 → M42 → M43 ; un cycle ne commence que si le précédent s'est terminé sur
« VERDICT : OK ». En cas de doute à n'importe quelle étape : s'arrêter, ne rien appliquer, m'envoyer la sortie.*

## Les trois migrations

| Ordre | Sous-lot | Migration | Fichier | Objet | WARN avant → après |
|-------|----------|-----------|---------|-------|--------------------|
| 1 | 4a | **M41** | `supabase/migrations/20261120100000_m41_devoirs_coche_par.sql` | « Coché par » des devoirs (`agenda_coches`, lisible par RLS dans le foyer de l'auteur seulement, sans fonction privilégiée) ; contenu et suppression d'un événement créé par un parent réservés au foyer de l'auteur (`agenda_events_verrou_foyer`, `agenda_delete`) | **97 → 97** (0 nouveau, 0 disparu) |
| 2 | 4b | **M42** | `supabase/migrations/20261120110000_m42_absence_signalee.sql` | motif « rendez-vous » ; lecture des absences par le titulaire ; justificatif par foyer (`absences_justificatifs`) ; lecture des fichiers ; orphelins et effacement | **97 → 97** (0 nouveau, 0 disparu) |
| 3 | 4c | **M43** | `supabase/migrations/20261120120000_m43_rendez_vous_fixes.sql` | rendez-vous fixes (`rendez_vous_fixes`, `rendez_vous_auteurs`, `rendez_vous_coches`, `rendez_vous_coches_auteurs`) | **97 → 97** (0 nouveau, 0 disparu) |

Inverses : `supabase/migrations_down/…_down.sql`, à appliquer seulement sur un « VERDICT : ARRÊT ».

**Aucun avertissement nouveau attendu sur les trois cycles** (97 WARN avant comme après chacun). Le masquage de
l'auteur hors foyer est fait par des politiques RLS (`agenda_coches`, `absences_justificatifs`, `rendez_vous_auteurs`,
`rendez_vous_coches_auteurs`), sans fonction SECURITY DEFINER exécutable par un compte ; les déclencheurs SECURITY
DEFINER ne sont exécutables par personne (révision du 21 nov. 2026 : `coches_devoirs` supprimée de M41).

**L'app et la base** : l'app de la branche fonctionne avant comme après chaque migration.
- **Sans M41** : la ligne source d'un devoir coché vaut « Fait », sans auteur ni heure (table `agenda_coches` absente). La règle « foyer de l'auteur » n'est appliquée que par l'écran.
- **Sans M42** : le motif « Rendez-vous » et le justificatif sont refusés par la base, avec un message clair.
- **Sans M43** : aucun rendez-vous fixe, et leur création est refusée avec un message.

Aucun ordre n'est imposé entre l'app et la base.

**À savoir sur la CLI 3.2.0** (rappel du lot 3) : Paris = `--remote`. Tapée dans PowerShell, `db push` demande `Y`.
Lancée sans clavier (par Claude, et seulement sur autorisation explicite pour CE cycle), il faut `--yes` à l'étape
d'application ou de retour arrière, jamais ailleurs. Les lectures passent toujours par `db query --read-only`.

---

## Avant le premier cycle (une fois)

Toutes les commandes se tapent dans **PowerShell**, dans `C:\Users\admin\Scolaria`.

| # | Commande | Ce que vous devez voir |
|---|----------|------------------------|
| 0.0 | `New-Item -ItemType Directory -Force C:\Users\admin\ScolariaBackups\migrations-en-attente` | le dossier est listé (ou déjà présent : aucune erreur) |
| 0.1 | `git status` | `On branch archi-lot-4` et `nothing to commit, working tree clean` |
| 0.2 | `npx supabase@3.2.0 --version` | `3.2.0` |
| 0.3 | `Get-Content supabase\.temp\project-ref` | `nmizwmymhqleasnxcyvu` (Paris) |
| 0.4 | `Test-Path .env.local` | `False` |
| 0.5 | `npx supabase@3.2.0 migration list --remote` | `20261118120000` (M40) a la même valeur en Local et en Remote ; `20261120100000`, `20261120110000`, `20261120120000` n'ont **pas** de valeur en Remote |
| 0.6 | `npx supabase@3.2.0 db query --remote --read-only "select (select count(*) from public.agenda_events) evenements, (select count(*) from public.absences) absences"` | deux nombres (à noter ; M41 et M42 ne suppriment ni ne modifient aucune ligne existante) |

---

## Cycle 1 — M41 seule (« Coché par », événements modifiables par le foyer de l'auteur)

| # | Commande | Ce que vous devez voir |
|---|----------|------------------------|
| 1.1 | `Move-Item supabase\migrations\20261120110000_m42_absence_signalee.sql C:\Users\admin\ScolariaBackups\migrations-en-attente\` | rien |
| 1.2 | `Move-Item supabase\migrations\20261120120000_m43_rendez_vous_fixes.sql C:\Users\admin\ScolariaBackups\migrations-en-attente\` | rien |
| 1.3 | `git status --short` | exactement deux lignes ` D supabase/migrations/…m42…` et ` D …m43…` |
| 1.4 | `node scripts/sauvegarde-semaine.mjs --racine 'C:\Users\admin\ScolariaBackups\avant_M41_cycle'` | se termine sans erreur ; `Get-Content C:\Users\admin\ScolariaBackups\avant_M41_cycle\journal.log -Tail 1` montre `OK \| remote \| AAAA-MM-JJ_HHmm \| … tables, … lignes, … fichiers` |
| 1.5 | `Get-ChildItem C:\Users\admin\ScolariaBackups\avant_M41_cycle -Directory` | un dossier `AAAA-MM-JJ_HHmm` (notez son nom) |
| 1.6 | `node scripts/verifier-sauvegarde.mjs 'C:\Users\admin\ScolariaBackups\avant_M41_cycle\AAAA-MM-JJ_HHmm'` | dernière ligne `VÉRIFICATION RÉUSSIE.` |
| 1.7 | `npx supabase@3.2.0 db advisors --remote --output-format json \| Out-File -Encoding utf8 C:\Users\admin\ScolariaBackups\avant_M41_cycle\advisors-avant.txt` | rien (le fichier est créé) |
| 1.8 | `node scripts/comparer-advisors.mjs C:\Users\admin\ScolariaBackups\avant_M41_cycle\advisors-avant.txt C:\Users\admin\ScolariaBackups\avant_M41_cycle\advisors-avant.txt` | `Avant : 0 ERROR, 97 WARN, 0 INFO`. **Un autre nombre : arrêt**, m'envoyer le fichier |
| 1.9 | `npx supabase@3.2.0 db push --remote --dry-run --skip-vault` | **une seule** migration listée : `20261120100000_m41_devoirs_coche_par.sql`. Deux ou plus : arrêt |
| 1.10 | `npx supabase@3.2.0 db push --remote --skip-vault` | **commande seule**. Répondre `Y` ; voir `Applying migration 20261120100000_m41_devoirs_coche_par.sql...` puis `Finished supabase db push.` |
| 1.11 | `npx supabase@3.2.0 db query --remote --read-only "select p.proname, p.prosecdef as definer, p.proconfig as config, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as authentifie from pg_proc p where p.proname in ('coches_devoirs', 'agenda_events_poser_coche', 'agenda_events_verrou_foyer') order by 1"` | **deux** lignes (`agenda_events_poser_coche`, `agenda_events_verrou_foyer`), aucune `coches_devoirs` ; `definer` vrai et `config` = `search_path=""` ; `anon` et `authentifie` **faux** partout |
| 1.11 bis | `npx supabase@3.2.0 db query --remote --read-only "select has_table_privilege('authenticated', 'public.agenda_coches', 'select') as lecture, has_table_privilege('authenticated', 'public.agenda_coches', 'insert') as ecriture, (select count(*) from pg_policies where tablename = 'agenda_coches') as politiques, (select count(*) from pg_trigger where tgname in ('agenda_events_poser_coche', 'agenda_events_verrou_foyer')) as declencheurs, (select qual like '%foyer_id%' from pg_policies where policyname = 'agenda_delete') as suppression_par_foyer"` | `lecture` vrai (filtrée par la politique), `ecriture` faux, `politiques` 1, `declencheurs` 2, `suppression_par_foyer` vrai |
| 1.12 | `npx supabase@3.2.0 migration list --remote` | la ligne `20261120100000` a la même valeur en Local et en Remote |
| 1.13 | `npx supabase@3.2.0 db advisors --remote --output-format json \| Out-File -Encoding utf8 C:\Users\admin\ScolariaBackups\avant_M41_cycle\advisors-apres.txt` | rien |
| 1.14 | `node scripts/comparer-advisors.mjs C:\Users\admin\ScolariaBackups\avant_M41_cycle\advisors-avant.txt C:\Users\admin\ScolariaBackups\avant_M41_cycle\advisors-apres.txt` (**sans** `--attendu`) | `Après : 0 ERROR, 97 WARN`, `Nouvelles clés (0)`, `Clés disparues (0)`, `VERDICT : OK` |
| 1.15 | `Move-Item C:\Users\admin\ScolariaBackups\migrations-en-attente\20261120110000_m42_absence_signalee.sql supabase\migrations\` | rien |
| 1.16 | `Move-Item C:\Users\admin\ScolariaBackups\migrations-en-attente\20261120120000_m43_rendez_vous_fixes.sql supabase\migrations\` | rien |
| 1.17 | `git status` | `nothing to commit, working tree clean` |

**Si 1.14 dit ARRÊT** (ou si 1.10 échoue après avoir commencé) — retour en arrière :
1. `npx supabase@3.2.0 db query --remote -f supabase\migrations_down\20261120100000_m41_devoirs_coche_par_down.sql` (répondre `Y` si demandé)
2. `npx supabase@3.2.0 migration repair --status reverted 20261120100000 --remote`
3. `npx supabase@3.2.0 migration list --remote` : `20261120100000` n'a plus de valeur en Remote.
4. Remettre M42 et M43 (1.15, 1.16), puis m'envoyer les sorties.

Perte en cas de retour arrière : l'auteur et l'heure des coches posées entre-temps. Les coches elles-mêmes
(`is_done`) et les événements restent. La sauvegarde de 1.4 n'est à restaurer que si une donnée a été touchée, et
M41 n'en touche aucune.

---

## Cycle 2 — M42 seule (absence signalée)

Même déroulé que le cycle 1, avec ces différences :

| # | Différence |
|---|------------|
| 2.1-2.2 | Ranger **M43 seulement** (M41 est appliquée) : `Move-Item supabase\migrations\20261120120000_m43_rendez_vous_fixes.sql C:\Users\admin\ScolariaBackups\migrations-en-attente\` |
| 2.3 | `git status --short` : une seule ligne ` D …m43…` |
| 2.4-2.8 | Dossier `C:\Users\admin\ScolariaBackups\avant_M42_cycle` partout. En 2.8 : `Avant : 0 ERROR, 97 WARN, 0 INFO` (M41 n'en ajoute aucun) |
| 2.9 | Essai à blanc : **seule** `20261120110000_m42_absence_signalee.sql` |
| 2.10 | `npx supabase@3.2.0 db push --remote --skip-vault`, commande seule, `Y` |
| 2.11 | `npx supabase@3.2.0 db query --remote --read-only "select tablename, policyname, cmd from pg_policies where tablename in ('absences', 'absences_justificatifs') order by 1, 3, 2"` → `absences absences_parent_insert INSERT`, `absences absences_select SELECT`, `absences absences_parent_update UPDATE`, `absences_justificatifs absences_justificatifs_insert INSERT`, `absences_justificatifs absences_justificatifs_select SELECT`, `absences_justificatifs absences_justificatifs_update UPDATE` (et rien d'autre) |
| 2.11 bis | `npx supabase@3.2.0 db query --remote --read-only "select has_table_privilege('authenticated', 'public.absences_justificatifs', 'delete') as suppression, has_function_privilege('authenticated', 'public.absences_justificatifs_controler()', 'execute') as declencheur, (select pg_get_constraintdef(oid) like '%rendez_vous%' from pg_constraint where conname = 'absences_motif_check') as motif_rdv, (select count(*) from public.absences) as absences"` → `suppression` faux, `declencheur` faux, `motif_rdv` vrai, `absences` = le nombre noté en 0.6 |
| 2.14 | `node scripts/comparer-advisors.mjs …\avant_M42_cycle\advisors-avant.txt …\avant_M42_cycle\advisors-apres.txt` (**sans** `--attendu`) → `Après : 0 ERROR, 97 WARN`, `Nouvelles clés (0)`, `Clés disparues (0)`, `VERDICT : OK` |
| 2.15 | Remettre M43 seulement ; `git status` propre |
| Retour arrière | `supabase\migrations_down\20261120110000_m42_absence_signalee_down.sql` (`Y` si demandé), puis `migration repair --status reverted 20261120110000 --remote`. **Attention** : l'inverse supprime `absences_justificatifs` (les justificatifs joints ne sont plus référencés ; leurs fichiers restent, puis le nettoyage des orphelins les supprime) et repasse les absences « rendez-vous » en « autre ». À faire avant toute famille réelle. |

---

## Cycle 3 — M43 seule (rendez-vous fixes)

| # | Différence |
|---|------------|
| 3.1-3.3 | Rien à ranger (M41 et M42 appliquées) ; `git status` propre |
| 3.4-3.8 | Dossier `C:\Users\admin\ScolariaBackups\avant_M43_cycle`. En 3.8 : `Avant : 0 ERROR, 97 WARN, 0 INFO` |
| 3.9 | Essai à blanc : **seule** `20261120120000_m43_rendez_vous_fixes.sql` |
| 3.10 | `npx supabase@3.2.0 db push --remote --skip-vault`, commande seule, `Y` |
| 3.11 | `npx supabase@3.2.0 db query --remote --read-only "select tablename, policyname, cmd from pg_policies where tablename like 'rendez_vous%' order by 1, 3"` → `rendez_vous_auteurs` : 1 politique SELECT ; `rendez_vous_coches` : DELETE, INSERT, SELECT ; `rendez_vous_coches_auteurs` : 1 SELECT ; `rendez_vous_fixes` : DELETE, INSERT, SELECT, UPDATE (9 lignes en tout) |
| 3.11 bis | `npx supabase@3.2.0 db query --remote --read-only "select has_table_privilege('authenticated', 'public.rendez_vous_auteurs', 'insert') as auteur_ecrit, has_table_privilege('authenticated', 'public.rendez_vous_coches_auteurs', 'insert') as auteur_coche_ecrit, (select count(*) from pg_proc p where p.proname like 'rendez_vous%' and has_function_privilege('authenticated', p.oid, 'execute')) as fonctions_appelables"` → `auteur_ecrit` faux, `auteur_coche_ecrit` faux, `fonctions_appelables` 0 |
| 3.14 | `comparer-advisors.mjs` **sans** `--attendu` → `Après : 0 ERROR, 97 WARN`, `Nouvelles clés (0)`, `Clés disparues (0)`, `VERDICT : OK` |
| Retour arrière | `supabase\migrations_down\20261120120000_m43_rendez_vous_fixes_down.sql` (`Y` si demandé), puis `migration repair --status reverted 20261120120000 --remote`. **Attention** : l'inverse supprime les rendez-vous fixes, leurs auteurs et leurs coches. |

**Retour arrière de plusieurs cycles** : toujours dans l'ordre inverse, M43, puis M42, puis M41.

---

## Après les trois cycles

- Dites-moi « M41/M42/M43 appliquées ». Je noterai l'état mesuré (97 WARN, inchangé) dans `tasks/warns-attendus.md`,
  puis je mettrai à jour `todo.md` et le primer. Ensuite, on décidera de la fusion d'`archi-lot-4` dans main.
- Vérification conseillée sur le Redmi, contre Paris, avec votre compte réel :
  - Agenda › Devoirs (« Coché par vous ») ;
  - un événement créé puis modifié ;
  - une absence avec justificatif ;
  - un rendez-vous fixe.
