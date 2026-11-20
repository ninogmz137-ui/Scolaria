-- M39 — mot complet (lot 3b, décisions du 16 et du 18 nov. 2026 ; plan : tasks/lot3b-plan-sql.md).
-- Inverse : supabase/migrations_down/20261118110000_m39_mot_complet_down.sql.
--
--  1. Un mot peut poser une question (oui / peut-être / non) en plus d'une signature ; libellé facultatif.
--  2. Une réponse doit correspondre à ce que le mot demande (autorisation → oui/non ; question → oui/peut-être/non).
--  3. Réponse privée à un mot : message du fil avec l'enseignant qui CITE le mot (teacher_messages.mot_id) ;
--     côté parent, seulement dans un fil INDIVIDUEL (l'autre responsable ne la lit jamais).
--  4. Messages des fils : on ne modifie plus que le marqueur « lu », jamais le texte (droit par colonne).
-- Aucune colonne supprimée ; données existantes conservées (Paris : tables vides au 18 nov.).

-- ─── 1. Question sur un mot ─────────────────────────────────────────────────
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

COMMENT ON COLUMN public.mots_liaison.question IS
  'Le mot pose une question oui / peut-être / non (réponse dans reponses_mot.participation), cumulable avec la signature.';
COMMENT ON COLUMN public.mots_liaison.question_libelle IS
  'Libellé facultatif de la question (1 à 200 caractères) ; seulement si question = true.';

-- ─── 2. Réponses cohérentes avec le mot ─────────────────────────────────────
-- Le contrôle vit déjà côté serveur dans le déclencheur reponses_mot_controler (M8, M27) : il est étendu
-- (pas de seconde règle dans les politiques). Autorisation → oui/non ; question (ou ancien type
-- « participation », pour l'ancienne app) → oui / peut-être / non ; sinon refus. Le reste est inchangé.
CREATE OR REPLACE FUNCTION public.reponses_mot_controler()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_mot public.mots_liaison%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Anonymisation (suppression du compte du répondant) : seul responsable_id passe à NULL.
    IF OLD.responsable_id IS NOT NULL AND NEW.responsable_id IS NULL
       AND NEW.mot_id = OLD.mot_id AND NEW.child_id = OLD.child_id
       AND NEW.autorisation IS NOT DISTINCT FROM OLD.autorisation
       AND NEW.participation IS NOT DISTINCT FROM OLD.participation THEN
      RETURN NEW;
    END IF;
    IF NEW.mot_id <> OLD.mot_id OR NEW.child_id <> OLD.child_id OR NEW.responsable_id IS DISTINCT FROM OLD.responsable_id THEN
      RAISE EXCEPTION 'seule la réponse peut être modifiée' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_mot FROM public.mots_liaison WHERE id = NEW.mot_id;
  IF v_mot.statut IS DISTINCT FROM 'envoyé' THEN
    RAISE EXCEPTION 'ce mot n''accepte pas de réponse' USING ERRCODE = '23514';
  END IF;
  IF v_mot.type = 'autorisation' THEN
    IF NEW.autorisation IS NULL THEN
      RAISE EXCEPTION 'un mot d''autorisation attend oui ou non' USING ERRCODE = '23514';
    END IF;
  ELSIF v_mot.question OR v_mot.type = 'participation' THEN
    IF NEW.participation IS NULL THEN
      RAISE EXCEPTION 'cette question attend oui, peut-être ou non' USING ERRCODE = '23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'ce mot n''attend pas de réponse' USING ERRCODE = '23514';
  END IF;

  SELECT mc.academic_year_id INTO NEW.academic_year_id
  FROM public.mot_carnets mc WHERE mc.mot_id = NEW.mot_id AND mc.child_id = NEW.child_id;
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

-- ─── 3. Réponse privée : message du fil qui cite le mot ─────────────────────
ALTER TABLE public.teacher_messages
  ADD COLUMN mot_id uuid REFERENCES public.mots_liaison(id) ON DELETE SET NULL;
CREATE INDEX teacher_messages_mot_id_idx ON public.teacher_messages (mot_id) WHERE mot_id IS NOT NULL;
COMMENT ON COLUMN public.teacher_messages.mot_id IS
  'Mot cité (réponse privée à un mot). Côté parent, uniquement dans un fil individuel.';

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

-- ─── 4. Messages des fils : seul le marqueur « lu » est modifiable ──────────
-- La politique fils_messages_update existante limite QUELLES lignes ; le droit par colonne limite QUOI.
REVOKE UPDATE ON public.teacher_messages FROM authenticated, anon;
GRANT UPDATE (read) ON public.teacher_messages TO authenticated;
