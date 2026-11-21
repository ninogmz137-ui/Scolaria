# Lot 6 — procédure Paris (M45), à exécuter par l'utilisateur

*Rédigé le 21 nov. 2026, sur le modèle de `tasks/lot5-procedures-paris.md`. RIEN n'a été appliqué à Paris.
Un seul cycle. En cas de doute à n'importe quelle étape : s'arrêter, ne rien appliquer, m'envoyer la sortie.*

## La migration

| Migration | Fichier | Objet | WARN avant → après |
|-----------|---------|-------|--------------------|
| **M45** | `supabase/migrations/20261122100000_m45_annuler_absence.sql` | annuler une absence : statut « annulée », `annulee_le` / `annulee_par`, mise à jour par le foyer de l'auteur, déclencheur `absences_controler_modification` (avant 8 h / 13 h heure de Paris, rien d'autre ne change, figée ensuite, justificatif retiré) | **97 → 96** : 0 nouveau, **1 disparu ANNONCÉ** (voir ci-dessous) |

**Disparition annoncée (avant application)** : `auth_rls_initplan` sur la politique `absences_parent_update` de
`public.absences`. M45 réécrit cette politique avec `(SELECT auth.uid())` : l'avertissement de performance n'a plus
lieu d'être. Mesuré en local : 61 → 60 WARN, aucune mention des objets de M45. **Toute autre disparition, ou tout
nouvel avertissement : arrêt.**

Inverse : `supabase/migrations_down/20261122100000_m45_annuler_absence_down.sql` (en transaction ; les absences
« annulée » repassent « signalée », aucune ligne supprimée ; les justificatifs déjà retirés ne reviennent pas).

**Données** : M45 ne modifie ni ne supprime aucune ligne existante (colonnes ajoutées vides).

**L'app et la base** : l'app de la branche fonctionne avant comme après. Sans M45, le bouton « Annuler l'absence »
s'affiche mais la base refuse (contrainte de statut) : message « L'annulation n'est pas encore possible sur ce
serveur. Écrivez à l'enseignant. » → **appliquer M45 avant de publier l'app du lot 6.**

**CLI 3.2.0** : Paris = `--remote`. Tapée dans PowerShell, `db push` demande `Y`.

---

## Cycle — M45 seule

Toutes les commandes se tapent dans **PowerShell**, dans `C:\Users\admin\Scolaria`, sur la branche `archi-lot-6`.

| # | Commande | Ce que vous devez voir |
|---|----------|------------------------|
| 0.1 | `git status` | `On branch archi-lot-6` et `nothing to commit, working tree clean` |
| 0.2 | `npx supabase@3.2.0 --version` | `3.2.0` |
| 0.3 | `Get-Content supabase\.temp\project-ref` | `nmizwmymhqleasnxcyvu` (Paris) |
| 0.4 | `Test-Path .env.local` | `False` |
| 0.5 | `npx supabase@3.2.0 migration list --remote` | `20261121100000` (M44) a la même valeur en Local et en Remote ; `20261122100000` n'a **pas** de valeur en Remote |
| 0.6 | `npx supabase@3.2.0 db query --remote --read-only "select count(*) as absences, count(*) filter (where statut not in ('signalée','prise_en_compte')) as autres from public.absences"` | deux nombres ; `autres` = 0 |
| 1.4 | `node scripts/sauvegarde-semaine.mjs --racine 'C:\Users\admin\ScolariaBackups\avant_M45_cycle'` | `OK \| remote \| …` en dernière ligne de `avant_M45_cycle\journal.log` |
| 1.5 | `Get-ChildItem C:\Users\admin\ScolariaBackups\avant_M45_cycle -Directory` | un dossier `AAAA-MM-JJ_HHmm` |
| 1.6 | `node scripts/verifier-sauvegarde.mjs 'C:\Users\admin\ScolariaBackups\avant_M45_cycle\AAAA-MM-JJ_HHmm'` | `VÉRIFICATION RÉUSSIE.` |
| 1.7 | `npx supabase@3.2.0 db advisors --remote --output-format json \| Out-File -Encoding utf8 C:\Users\admin\ScolariaBackups\avant_M45_cycle\advisors-avant.txt` | rien |
| 1.8 | `node scripts/comparer-advisors.mjs C:\Users\admin\ScolariaBackups\avant_M45_cycle\advisors-avant.txt C:\Users\admin\ScolariaBackups\avant_M45_cycle\advisors-avant.txt` | `Avant : 0 ERROR, 97 WARN, 0 INFO`. Un autre nombre : arrêt |
| 1.9 | `npx supabase@3.2.0 db push --remote --dry-run --skip-vault` | **une seule** migration : `20261122100000_m45_annuler_absence.sql` |
| 1.10 | `npx supabase@3.2.0 db push --remote --skip-vault` | **commande seule**, `Y` ; `Applying migration 20261122100000_m45_annuler_absence.sql...` puis `Finished supabase db push.` |
| 1.11 | `npx supabase@3.2.0 db query --remote --read-only "select (select pg_get_constraintdef(oid) like '%annulée%' from pg_constraint where conname = 'absences_statut_check') as statut_annulee, (select count(*) from information_schema.columns where table_name = 'absences' and column_name in ('annulee_le','annulee_par')) as colonnes, (select count(*) from pg_trigger where tgname = 'absences_controler_modification') as declencheur, has_function_privilege('authenticated', 'public.absences_controler_modification()', 'execute') as appelable, (select count(*) from pg_policy where polrelid = 'public.absences'::regclass and polcmd = 'w') as politiques_update, (select count(*) from public.absences) as absences"` | `statut_annulee` vrai, `colonnes` 2, `declencheur` 1, `appelable` **faux**, `politiques_update` 1, `absences` = le nombre de 0.6 |
| 1.12 | `npx supabase@3.2.0 migration list --remote` | `20261122100000` a la même valeur en Local et en Remote |
| 1.13 | `npx supabase@3.2.0 db advisors --remote --output-format json \| Out-File -Encoding utf8 C:\Users\admin\ScolariaBackups\avant_M45_cycle\advisors-apres.txt` | rien |
| 1.14 | `node scripts/comparer-advisors.mjs C:\Users\admin\ScolariaBackups\avant_M45_cycle\advisors-avant.txt C:\Users\admin\ScolariaBackups\avant_M45_cycle\advisors-apres.txt` (**sans** `--attendu`) | `Après : 0 ERROR, 96 WARN`, `Nouvelles clés (0)`, `Clés disparues (1)` = **exactement** `auth_rls_initplan` sur `absences_parent_update`, `VERDICT : OK` |
| 1.15 | `git status` | `nothing to commit, working tree clean` |

**Si 1.14 n'est pas exactement cela** (autre disparition, nouvelle clé, ERROR) ou si 1.10 échoue après avoir commencé —
retour en arrière :
1. `npx supabase@3.2.0 db query --remote -f supabase\migrations_down\20261122100000_m45_annuler_absence_down.sql` (`Y` si demandé)
2. `npx supabase@3.2.0 migration repair --status reverted 20261122100000 --remote`
3. `npx supabase@3.2.0 migration list --remote` : `20261122100000` n'a plus de valeur en Remote.

## Après le cycle

Dites-moi « M45 appliquée » : je noterai 96 WARN dans `tasks/warns-attendus.md`, puis `todo.md` et le primer.
Ne créez aucune absence sur Paris pour essayer (aucune famille réelle ne l'a encore fait).
