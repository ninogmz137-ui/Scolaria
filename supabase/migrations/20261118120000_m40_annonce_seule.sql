-- M40 — fil de classe en annonce seule (lot 3b, décision du 16 nov. 2026 ; plan : tasks/lot3b-plan-sql.md).
-- Inverse : supabase/migrations_down/20261118120000_m40_annonce_seule_down.sql.
--
--  1. Réactions aux annonces : plus aucune réaction écrite depuis l'app ; chacun ne voit que les siennes,
--     l'enseignant voit celles de ses annonces (avant : toutes les familles voyaient qui avait réagi).
--  2. Table messages (aucun lecteur ni écrivain dans l'app) : plus d'écriture depuis l'app (avant : un parent
--     pouvait écrire à n'importe quel compte, y compris une autre famille).
--  3. class_posts : inchangé — déjà en lecture seule pour les parents (prouvé par supabase/tests/m40_annonce_seule.sql).
-- Aucune donnée touchée (réactions existantes conservées en base).

-- ─── 1. Réactions aux annonces ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can react" ON public.class_post_reactions;
DROP POLICY IF EXISTS "Anyone can see reactions" ON public.class_post_reactions;
CREATE POLICY reactions_select ON public.class_post_reactions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR post_id IN (SELECT cp.id FROM public.class_posts cp WHERE cp.teacher_id = (SELECT auth.uid()))
  );
-- Aucune politique INSERT / UPDATE / DELETE : personne n'écrit de réaction depuis l'app.

-- ─── 2. Table messages : plus d'écriture depuis l'app ───────────────────────
DROP POLICY IF EXISTS messages_insert ON public.messages;
