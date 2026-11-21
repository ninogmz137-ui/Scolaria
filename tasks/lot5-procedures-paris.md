# Lot 5 — procédure Paris (M44), à exécuter par l'utilisateur

*Rédigé le 21 nov. 2026, sur le modèle de `tasks/lot4-procedures-paris.md`. RIEN n'a été appliqué à Paris.
Un seul cycle. En cas de doute à n'importe quelle étape : s'arrêter, ne rien appliquer, m'envoyer la sortie.*

## La migration

| Migration | Fichier | Objet | WARN avant → après |
|-----------|---------|-------|--------------------|
| **M44** | `supabase/migrations/20261121100000_m44_absence_classe_titulaire.sql` | la base refuse une absence si l'année active de l'enfant n'a pas de classe avec un titulaire (déclencheur `verifier_classe_absence`, fonction `absences_verifier_classe` non exécutable par un compte) | **97 → 97** attendu (0 nouveau, 0 disparu ; mesuré en local : aucune mention de M44 dans les advisors) |

Inverse : `supabase/migrations_down/20261121100000_m44_absence_classe_titulaire_down.sql` (supprime le déclencheur et
la fonction ; ne touche aucune ligne).

**Données** : M44 ne modifie ni ne supprime aucune ligne. Une absence déjà enregistrée reste modifiable ; seules les
nouvelles (et un changement d'enfant ou d'année) sont contrôlées. Paris avait 0 absence le 21 nov.

**L'app et la base** : l'app de la branche fonctionne avant comme après. Sans M44, la règle n'est appliquée que par
l'écran (« Signaler une absence » masqué sans classe). Avec M44, si la base refuse, l'app affiche « L'école de votre
enfant n'est pas encore sur l'app : rien n'a été envoyé. »

**CLI 3.2.0** : Paris = `--remote`. Tapée dans PowerShell, `db push` demande `Y`.

---

## Cycle — M44 seule

Toutes les commandes se tapent dans **PowerShell**, dans `C:\Users\admin\Scolaria`, sur la branche `archi-lot-5`.

| # | Commande | Ce que vous devez voir |
|---|----------|------------------------|
| 0.1 | `git status` | `On branch archi-lot-5` et `nothing to commit, working tree clean` |
| 0.2 | `npx supabase@3.2.0 --version` | `3.2.0` |
| 0.3 | `Get-Content supabase\.temp\project-ref` | `nmizwmymhqleasnxcyvu` (Paris) |
| 0.4 | `Test-Path .env.local` | `False` |
| 0.5 | `npx supabase@3.2.0 migration list --remote` | `20261120120000` (M43) a la même valeur en Local et en Remote ; `20261121100000` n'a **pas** de valeur en Remote |
| 0.6 | `npx supabase@3.2.0 db query --remote --read-only "select count(*) as absences from public.absences"` | un nombre (à noter) |
| 1.4 | `node scripts/sauvegarde-semaine.mjs --racine 'C:\Users\admin\ScolariaBackups\avant_M44_cycle'` | se termine sans erreur ; `Get-Content C:\Users\admin\ScolariaBackups\avant_M44_cycle\journal.log -Tail 1` montre `OK \| remote \| …` |
| 1.5 | `Get-ChildItem C:\Users\admin\ScolariaBackups\avant_M44_cycle -Directory` | un dossier `AAAA-MM-JJ_HHmm` (notez son nom) |
| 1.6 | `node scripts/verifier-sauvegarde.mjs 'C:\Users\admin\ScolariaBackups\avant_M44_cycle\AAAA-MM-JJ_HHmm'` | dernière ligne `VÉRIFICATION RÉUSSIE.` |
| 1.7 | `npx supabase@3.2.0 db advisors --remote --output-format json \| Out-File -Encoding utf8 C:\Users\admin\ScolariaBackups\avant_M44_cycle\advisors-avant.txt` | rien (le fichier est créé) |
| 1.8 | `node scripts/comparer-advisors.mjs C:\Users\admin\ScolariaBackups\avant_M44_cycle\advisors-avant.txt C:\Users\admin\ScolariaBackups\avant_M44_cycle\advisors-avant.txt` | `Avant : 0 ERROR, 97 WARN, 0 INFO`. **Un autre nombre : arrêt** |
| 1.9 | `npx supabase@3.2.0 db push --remote --dry-run --skip-vault` | **une seule** migration listée : `20261121100000_m44_absence_classe_titulaire.sql`. Deux ou plus : arrêt |
| 1.10 | `npx supabase@3.2.0 db push --remote --skip-vault` | **commande seule**. Répondre `Y` ; voir `Applying migration 20261121100000_m44_absence_classe_titulaire.sql...` puis `Finished supabase db push.` |
| 1.11 | `npx supabase@3.2.0 db query --remote --read-only "select p.prosecdef as definer, p.proconfig as config, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as authentifie, (select count(*) from pg_trigger where tgname = 'verifier_classe_absence') as declencheur, (select count(*) from public.absences) as absences from pg_proc p where p.proname = 'absences_verifier_classe'"` | une ligne : `definer` vrai, `config` = `search_path=""`, `anon` et `authentifie` **faux**, `declencheur` 1, `absences` = le nombre de 0.6 |
| 1.12 | `npx supabase@3.2.0 migration list --remote` | `20261121100000` a la même valeur en Local et en Remote |
| 1.13 | `npx supabase@3.2.0 db advisors --remote --output-format json \| Out-File -Encoding utf8 C:\Users\admin\ScolariaBackups\avant_M44_cycle\advisors-apres.txt` | rien |
| 1.14 | `node scripts/comparer-advisors.mjs C:\Users\admin\ScolariaBackups\avant_M44_cycle\advisors-avant.txt C:\Users\admin\ScolariaBackups\avant_M44_cycle\advisors-apres.txt` (**sans** `--attendu`) | `Après : 0 ERROR, 97 WARN`, `Nouvelles clés (0)`, `Clés disparues (0)`, `VERDICT : OK` |
| 1.15 | `git status` | `nothing to commit, working tree clean` |

**Si 1.14 dit ARRÊT** (ou si 1.10 échoue après avoir commencé) — retour en arrière :
1. `npx supabase@3.2.0 db query --remote -f supabase\migrations_down\20261121100000_m44_absence_classe_titulaire_down.sql` (répondre `Y` si demandé)
2. `npx supabase@3.2.0 migration repair --status reverted 20261121100000 --remote`
3. `npx supabase@3.2.0 migration list --remote` : `20261121100000` n'a plus de valeur en Remote.

Perte en cas de retour arrière : aucune (M44 ne crée ni ne modifie aucune ligne).

## Après le cycle

Dites-moi « M44 appliquée » : je noterai l'état mesuré dans `tasks/warns-attendus.md`, puis `todo.md` et le primer.
Vérification conseillée sur le Redmi contre Paris : avec votre compte réel (Laia, Evan sans classe), ni « Signaler une
absence » ni « Écrire à l'enseignant » dans le « + ». Ne créez aucune absence sur Paris.
