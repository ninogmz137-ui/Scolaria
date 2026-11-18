# Lot 3b — plan SQL (18 nov. 2026) — RIEN N'EST APPLIQUÉ NI CODÉ

Objet : le « mot complet » (signature + question + réponse privée), le « lu » par responsable et par mot,
et le fil de classe en annonce seule. Plan à valider avant toute ligne.

## 0. Ce que j'ai constaté (base locale = mêmes migrations que Paris, M24 à M36)

- **Paris : les 9 tables concernées sont VIDES** (lu le 18 nov., lecture seule) : 0 mot, 0 réponse, 0 « lu »,
  0 fil, 0 message de fil, 0 annonce, 0 réaction, 0 message. **Aucune donnée réelle n'est en jeu.**
- Un mot a aujourd'hui UN type exclusif (information, signature, autorisation, participation) et un mode de
  signature (aucune, un parent, les deux) : la signature se cumule déjà avec un type ; la question non.
- Les réponses (`reponses_mot`) sont déjà **une par responsable et par carnet** (oui/non pour une
  autorisation, oui/peut-être/non pour une participation).
- Le « lu » (`read_receipts`) est déjà **par responsable et par mot**.
- Les fils avec l'enseignant (`teacher_conversations`) existent déjà, en deux portées : « foyer » (partagé
  par les responsables d'un même foyer) ou « individuel » (un seul responsable).
- **Un parent ne peut déjà pas écrire dans le fil de classe** (`class_posts` : lecture seule pour lui).
- Trois trous à refermer, trouvés en lisant les politiques :
  1. **Réactions aux annonces** : tout parent peut réagir à une annonce, et **toutes les familles voient qui
     a réagi** — c'est une interaction entre familles, contraire à « annonce seule ».
  2. **Table `messages`** (inutilisée par l'app) : sa politique permettrait à un parent d'écrire à **n'importe
     quel compte**. *Correction du 18 nov., après tests : ce trou est seulement LATENT — depuis M32 l'app n'a
     plus aucun droit sur cette table, donc rien n'était possible en pratique. M40 retire quand même la
     politique, pour qu'un droit rétabli un jour par erreur ne la rouvre pas.*
  3. **Messages des fils** : toute personne qui lit un fil peut **modifier le texte** de n'importe quel
     message du fil (celui de l'enseignant compris) — la politique ne visait qu'à marquer « lu ».

## 1. Le plan, table par table (en clair)

Trois migrations, **une par cycle** (sauvegarde, essai à blanc, application seule, advisors), dans cet ordre :
**M38** compteur « ont lu » (déjà écrite, en attente), **M39** mot complet, **M40** annonce seule.
(Numéros provisoires : à fixer au moment du cycle, après M37 si elle passe avant.)

### M39 — mot complet

| Table | Ce qui change |
|---|---|
| `mots_liaison` (les mots) | Deux colonnes : « le mot pose une question » (oui/non) et le libellé de la question (facultatif, 200 caractères au plus). Un mot peut donc avoir une signature ET une question. |
| `reponses_mot` (les réponses) | Aucune colonne ajoutée : la réponse à une question réutilise le champ oui / peut-être / non. Les règles d'écriture vérifient désormais que la réponse correspond à ce que le mot demande. |
| `teacher_messages` (messages des fils) | Une colonne « mot cité » (facultative) : une réponse privée à un mot est un message du fil avec l'enseignant qui cite ce mot. |

### M40 — annonce seule

| Table | Ce qui change |
|---|---|
| `class_post_reactions` (réactions aux annonces) | Les parents ne peuvent plus réagir ; chacun ne voit que ses propres anciennes réactions ; l'enseignant voit celles de ses annonces. |
| `messages` (table inutilisée) | Plus personne ne peut y écrire depuis l'app (seul le serveur le pourrait). |
| `class_posts` (fil de classe) | Rien ne change : déjà en lecture seule pour les parents. Un test le prouve. |

### M38 — « lu » et compteur enseignant (déjà écrite : `supabase/migrations_en_attente/m38_lectures_mot.sql`)

| Table | Ce qui change |
|---|---|
| `read_receipts` (« lu ») | **Rien.** Déjà par responsable et par mot. |
| (nouvelle fonction `lectures_mot`) | Donne à l'auteur d'un mot deux nombres : élèves destinataires et élèves « lus » (un élève est lu dès qu'un de ses responsables a lu). Jamais qui a lu. |

## 2. Que deviennent les données existantes ? Rien n'est perdu.

- **Paris : aucune ligne** dans ces tables aujourd'hui : rien à transformer.
- Base locale et éventuelles données futures avant la migration :
  - mots « participation » → la colonne « question » passe à oui (même sens : oui / peut-être / non) ; leur
    type reste « participation » pour l'ancienne app ;
  - mots « autorisation » → inchangés (oui / non), sans question ;
  - réponses, signatures, « lu », fils, messages → **inchangés** (colonnes AJOUTÉES seulement, rien supprimé) ;
  - réactions aux annonces déjà posées → **conservées** en base ; elles ne sont simplement plus visibles des
    autres familles.
- **Ancienne app** après M39 : elle continue de fonctionner (elle lit `type`, qui est gardé) ; elle ne voit
  simplement pas la question d'un mot « signature + question » tant qu'elle n'est pas mise à jour.

## 3. Politiques de sécurité (RLS) modifiées, et ce qu'elles empêchent

| Politique | Avant | Après — ce qui est empêché |
|---|---|---|
| `reponses_mot` (contrôle serveur) | Le déclencheur `reponses_mot_controler` n'acceptait oui/peut-être/non que sur un mot de type « participation ». | *Correction du 18 nov., après tests : la règle vit dans ce déclencheur, pas dans les politiques (inchangées).* Il accepte oui/non pour une **autorisation**, oui/peut-être/non pour un mot **qui pose une question** (ou de l'ancien type « participation », pour l'ancienne app), et refuse toute réponse à un autre mot. |
| `teacher_messages` création | L'auteur du message est bien soi, avec son rôle dans le fil. | En plus, si le message cite un mot : (a) le mot est bien dans le carnet de l'élève du fil, (b) c'est un mot de **cet** enseignant, (c) côté parent, le fil est **individuel**. Empêche de citer le mot d'un autre enfant, et **empêche qu'une réponse privée parte dans le fil partagé du foyer** (l'autre responsable la lirait). |
| `teacher_messages` modification | Quiconque lit le fil peut modifier tout message. | On ne peut plus modifier **que le marqueur « lu »**, jamais le texte (droits par colonne). Empêche de réécrire le message de l'enseignant ou de l'autre responsable. |
| `class_post_reactions` | Tout parent réagit ; toutes les familles voient les réactions. | Aucun parent ne réagit ; chacun ne voit que les siennes ; l'enseignant voit celles de ses annonces. Empêche toute interaction et toute visibilité entre familles. |
| `messages` création | Un parent écrit à n'importe quel compte. | Plus aucune création depuis l'app. Empêche une messagerie entre familles et l'écriture dans un « fil école ». |
| `class_posts` | Lecture seule pour les parents. | Inchangée (prouvée par test). |

**Le parent séparé** : une réponse privée ne peut partir que dans le fil **individuel** de son auteur ;
ce fil n'est lisible que par lui et l'enseignant (règle existante `fils_select`). L'autre responsable, même
foyer ou foyer séparé, ne la voit jamais.

## 4. Tests sur Supabase local (avant tout cycle)

Fichiers `supabase/tests/m39_mot_complet.sql` et `supabase/tests/m40_annonce_seule.sql`, sur le modèle
des tests existants : comptes fictifs, transaction annulée, chaque test dit OK ou ÉCHEC.

Données de test : une classe, un enseignant titulaire T, un enseignant d'une autre classe T2, un élève E
avec deux responsables séparés A (foyer 1) et B (foyer 2), un élève F d'une autre famille (responsable C),
un mot « signature + question » de T envoyé à E et F.

**M39 — mot complet**
1. Un mot peut avoir signature (les deux parents) + question + libellé : accepté.
2. Libellé de question sans question : refusé. Question sur une autorisation : refusé.
3. A répond « peut-être » à la question pour E : accepté ; A répond une 2e fois : refusé (une réponse par
   responsable et par carnet) ; B répond pour E : accepté (sa propre réponse).
4. A répond oui/non (autorisation) à ce mot qui n'est pas une autorisation : refusé.
5. C répond pour E : refusé (pas responsable de E).
6. **Réponse privée** : A écrit dans son fil individuel avec T en citant le mot : accepté.
7. A cite le mot dans le fil **foyer** : refusé.
8. A cite un mot de T2, ou un mot qui n'est pas dans le carnet de E : refusé.
9. **Parent séparé** : B lit les messages de fil de E : **0 message** de la réponse privée de A.
10. C (autre famille) : 0 message.
11. T lit la réponse privée de A et voit le mot cité : accepté.
12. A essaie de modifier le texte du message de T : refusé ; A marque le message « lu » : accepté.
13. Inverse : après le script de retour, plus de colonne ni de politique nouvelle ; l'ancienne politique est revenue.

**M40 — annonce seule**
14. **A essaie de publier dans le fil de classe** (`class_posts`) : refusé.
15. A essaie de modifier ou supprimer une annonce de T : refusé.
16. A lit les annonces de la classe de E : accepté ; C (autre classe) : 0 annonce.
17. A essaie de réagir à une annonce : refusé.
18. A ne voit pas la réaction déjà posée par C ; T voit les réactions de ses annonces.
19. **A essaie d'écrire dans `messages`** (à T, à B, à C) : refusé dans les trois cas.
20. Inverse testé.

**M38 — compteur « ont lu »** (tests à écrire avec M38)
21. A lit le mot pour E → compteur de T : E lu ; B ne l'a pas lu → E reste compté UNE fois.
22. A lit le mot dans le carnet de E → il est lu pour A dans le carnet de F s'il en est responsable (même mot).
23. T2, A, C appellent le compteur : aucun nombre.

Puis les 21 suites SQL existantes, l'audit de sécurité local (670 tests) et les advisors (0 ERROR ; WARN
attendus déclarés dans `tasks/warns-attendus.md` : 1 pour M38, aucun nouveau pour M39 et M40).

## 5. Revenir en arrière

Chaque migration a son script inverse dans `supabase/migrations_down/`, testé en local (aller, retour, aller) :
- **M39** : supprime les colonnes « question », « libellé », « mot cité » et remet les politiques d'avant.
  **Perte possible** : les questions et citations créées entre l'application et le retour. Avant de
  revenir en arrière en production, on exporte ces colonnes (requête de lecture) pour les garder.
- **M40** : remet les politiques d'avant (réactions visibles, écriture dans `messages`) — aucune donnée touchée.
- **M38** : supprime la fonction — aucune donnée touchée.
Et la sauvegarde complète faite avant chaque cycle reste le dernier recours.

## 6. Points à trancher

- **Réactions aux annonces** : je propose de les retirer côté parents (annonce seule). Si vous voulez garder
  un « vu » ou un remerciement, il resterait **privé** (visible de l'enseignant seul).
- **Mot « autorisation »** : je le garde tel quel (oui / non) ; une question oui / peut-être / non ne s'y
  ajoute pas. Si vous voulez « autorisation + question », il faut une 2e valeur de réponse par responsable.

---

## Annexe A — SQL de M39 (mot complet)

> **Version INITIALE, remplacée le 18 nov. après les tests locaux.** La version à appliquer est le fichier
> `supabase/migrations/20261118110000_m39_mot_complet.sql` : la règle « la réponse correspond au mot » y est
> écrite dans le déclencheur existant `reponses_mot_controler` (qui refusait sinon toute question sur un mot
> « signature »), et les politiques de `reponses_mot` ne sont plus modifiées. Le reste est identique.

```sql
-- M39 (numéro provisoire) — mot complet : question cumulable, réponse privée qui cite le mot.

-- 1. Question sur un mot
ALTER TABLE public.mots_liaison
  ADD COLUMN question boolean NOT NULL DEFAULT false,
  ADD COLUMN question_libelle text;
ALTER TABLE public.mots_liaison
  ADD CONSTRAINT mots_liaison_question_libelle_check
    CHECK (question_libelle IS NULL OR (question AND char_length(question_libelle) BETWEEN 1 AND 200)),
  ADD CONSTRAINT mots_liaison_question_hors_autorisation
    CHECK (NOT (question AND type = 'autorisation'));
-- Les mots « participation » existants posaient déjà une question oui / peut-être / non.
UPDATE public.mots_liaison SET question = true WHERE type = 'participation';

-- 2. Réponses : correspondre à ce que le mot demande
DROP POLICY IF EXISTS reponses_mot_insert ON public.reponses_mot;
CREATE POLICY reponses_mot_insert ON public.reponses_mot
  FOR INSERT TO authenticated
  WITH CHECK (
    responsable_id = (SELECT auth.uid())
    AND public.is_responsable(child_id)
    AND EXISTS (
      SELECT 1 FROM public.mots_liaison m
      WHERE m.id = reponses_mot.mot_id
        AND ((reponses_mot.autorisation IS NOT NULL AND m.type = 'autorisation')
          OR (reponses_mot.participation IS NOT NULL AND m.question))
    )
  );
DROP POLICY IF EXISTS reponses_mot_update ON public.reponses_mot;
CREATE POLICY reponses_mot_update ON public.reponses_mot
  FOR UPDATE TO authenticated
  USING (responsable_id = (SELECT auth.uid()) AND public.is_responsable(child_id))
  WITH CHECK (
    responsable_id = (SELECT auth.uid())
    AND public.is_responsable(child_id)
    AND EXISTS (
      SELECT 1 FROM public.mots_liaison m
      WHERE m.id = reponses_mot.mot_id
        AND ((reponses_mot.autorisation IS NOT NULL AND m.type = 'autorisation')
          OR (reponses_mot.participation IS NOT NULL AND m.question))
    )
  );

-- 3. Réponse privée : un message du fil qui cite le mot
ALTER TABLE public.teacher_messages
  ADD COLUMN mot_id uuid REFERENCES public.mots_liaison(id) ON DELETE SET NULL;
CREATE INDEX teacher_messages_mot_id_idx ON public.teacher_messages (mot_id) WHERE mot_id IS NOT NULL;

DROP POLICY IF EXISTS fils_messages_insert ON public.teacher_messages;
CREATE POLICY fils_messages_insert ON public.teacher_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND sender_role = public.role_dans_fil(conversation_id)
    AND (
      mot_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.teacher_conversations tc
        JOIN public.mot_carnets mc ON mc.child_id = tc.student_id AND mc.mot_id = teacher_messages.mot_id
        JOIN public.mots_liaison m ON m.id = mc.mot_id AND m.teacher_id = tc.teacher_id
        WHERE tc.id = teacher_messages.conversation_id
          AND (teacher_messages.sender_role = 'teacher' OR tc.portee = 'individuel')
      )
    )
  );

-- 4. Messages des fils : on ne modifie plus que le marqueur « lu », jamais le texte
REVOKE UPDATE ON public.teacher_messages FROM authenticated;
GRANT UPDATE (read) ON public.teacher_messages TO authenticated;
-- (la politique fils_messages_update existante reste : elle limite QUELLES lignes ; le droit par colonne
--  limite QUOI.)
```

### Inverse de M39

```sql
REVOKE UPDATE (read) ON public.teacher_messages FROM authenticated;
GRANT UPDATE ON public.teacher_messages TO authenticated;

DROP POLICY IF EXISTS fils_messages_insert ON public.teacher_messages;
CREATE POLICY fils_messages_insert ON public.teacher_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()) AND sender_role = public.role_dans_fil(conversation_id));
DROP INDEX IF EXISTS public.teacher_messages_mot_id_idx;
ALTER TABLE public.teacher_messages DROP COLUMN IF EXISTS mot_id;

DROP POLICY IF EXISTS reponses_mot_insert ON public.reponses_mot;
CREATE POLICY reponses_mot_insert ON public.reponses_mot
  FOR INSERT TO authenticated
  WITH CHECK (responsable_id = auth.uid() AND public.is_responsable(child_id));
DROP POLICY IF EXISTS reponses_mot_update ON public.reponses_mot;
CREATE POLICY reponses_mot_update ON public.reponses_mot
  FOR UPDATE TO authenticated
  USING (responsable_id = auth.uid() AND public.is_responsable(child_id))
  WITH CHECK (responsable_id = auth.uid() AND public.is_responsable(child_id));

ALTER TABLE public.mots_liaison
  DROP CONSTRAINT IF EXISTS mots_liaison_question_hors_autorisation,
  DROP CONSTRAINT IF EXISTS mots_liaison_question_libelle_check,
  DROP COLUMN IF EXISTS question_libelle,
  DROP COLUMN IF EXISTS question;
```

## Annexe B — SQL de M40 (annonce seule)

```sql
-- M40 (numéro provisoire) — fil de classe en annonce seule : aucune interaction entre familles.

-- 1. Réactions aux annonces : plus de réaction des parents, plus de visibilité entre familles
DROP POLICY IF EXISTS "Anyone can react" ON public.class_post_reactions;
DROP POLICY IF EXISTS "Anyone can see reactions" ON public.class_post_reactions;
CREATE POLICY reactions_select ON public.class_post_reactions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR post_id IN (SELECT cp.id FROM public.class_posts cp WHERE cp.teacher_id = (SELECT auth.uid()))
  );
-- Aucune politique INSERT / UPDATE / DELETE : personne n'écrit de réaction depuis l'app.

-- 2. Table messages (inutilisée) : plus d'écriture depuis l'app
DROP POLICY IF EXISTS messages_insert ON public.messages;

-- 3. class_posts : inchangé (lecture seule pour les parents) — prouvé par les tests 14 à 16.
```

### Inverse de M40

```sql
DROP POLICY IF EXISTS reactions_select ON public.class_post_reactions;
CREATE POLICY "Anyone can see reactions" ON public.class_post_reactions
  FOR SELECT USING (post_id IN (SELECT cp.id FROM public.class_posts cp));
CREATE POLICY "Anyone can react" ON public.class_post_reactions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND post_id IN (SELECT cp.id FROM public.class_posts cp));

CREATE POLICY messages_insert ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = sender_id AND (child_id IS NULL OR public.is_responsable(child_id)));
```

## Annexe C — M38 (compteur « ont lu »)

`supabase/migrations/20261118100000_m38_lectures_mot.sql` et son inverse dans `supabase/migrations_down/`
(fonction `lectures_mot`, nombres agrégés, auteur du mot seulement).

## Annexe D — résultats en LOCAL (18 nov. 2026) — rien sur Paris

- M38, M39, M40 appliquées sur la base locale (`supabase migration up`).
- `supabase/tests/m38_m40_lot3b.sql` : **24 vérifications OK** (T1 à T23, dont T14 « un parent ne peut pas
  publier dans le fil de classe » et T9 « le parent séparé ne voit pas la réponse privée de l'autre »).
- Aller → retour → aller des trois inverses : le retour retire colonnes, fonction et règles nouvelles et remet
  les anciennes ; le nouvel aller les rétablit ; les 24 vérifications repassent.
- Suites SQL existantes : 22 sur 22 après adaptation de `m30_durcissement_audit.sql` (son test T10 attendait
  qu'un parent puisse écrire dans `messages` : M40 le refuse désormais, voulu).
