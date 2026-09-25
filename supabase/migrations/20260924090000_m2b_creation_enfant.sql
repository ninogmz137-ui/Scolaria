-- ════════════════════════════════════════════════════════════════════════════
-- M2b · Création d'un enfant atomique (Phase A, lot 2-bis) — 2026-09-24
-- Inverse : supabase/migrations_down/<version>_m2b_creation_enfant_down.sql
--
-- 1. L'accès à un enfant passe UNIQUEMENT par responsables (plus de parent_id = auth.uid()).
-- 2. Plus d'insertion directe dans children : create_child() crée, dans UNE transaction,
--    l'enfant + le lien responsable (foyer créé si besoin) + l'année scolaire en cours.
--    Remplace le trigger add_child_creator_as_responsable (M2), supprimé.
-- 3. Un enfant a TOUJOURS au moins une année scolaire (contrainte différée, vérifiée au COMMIT) :
--    ni création sans année, ni suppression de sa dernière année.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Accès et insertion ──────────────────────────────────────────────────
ALTER POLICY children_select ON public.children USING (public.is_responsable(id));
DROP POLICY children_insert ON public.children;          -- plus d'insert direct : create_child()

DROP TRIGGER add_child_creator_as_responsable ON public.children;
DROP FUNCTION public.add_child_creator_as_responsable();

-- ─── 2. Année scolaire en cours (bascule en août, heure de Paris) ───────────
CREATE OR REPLACE FUNCTION public.current_school_year()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path = public, pg_temp
AS $function$
  SELECT CASE
    WHEN extract(month FROM now() AT TIME ZONE 'Europe/Paris') >= 8
      THEN extract(year FROM now() AT TIME ZONE 'Europe/Paris')::int || '-' || (extract(year FROM now() AT TIME ZONE 'Europe/Paris')::int + 1)
    ELSE (extract(year FROM now() AT TIME ZONE 'Europe/Paris')::int - 1) || '-' || extract(year FROM now() AT TIME ZONE 'Europe/Paris')::int
  END;
$function$;

-- ─── 3. create_child : enfant + responsable + année, en une transaction ─────
CREATE OR REPLACE FUNCTION public.create_child(
  p_first_name text,
  p_last_name text DEFAULT '',
  p_birth_date date DEFAULT NULL,
  p_age integer DEFAULT NULL,
  p_classe text DEFAULT '',
  p_school text DEFAULT '',
  p_avatar_emoji text DEFAULT '👦',
  p_color text DEFAULT '#4338CA',
  p_scolaria_id text DEFAULT ''
)
 RETURNS public.children
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_child public.children;
  v_foyer uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentification requise' USING ERRCODE = '42501';
  END IF;
  IF coalesce(trim(p_first_name), '') = '' THEN
    RAISE EXCEPTION 'le prénom est obligatoire' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.children (parent_id, first_name, last_name, birth_date, age, classe, school, avatar_emoji, color, scolaria_id)
  VALUES (
    v_uid, trim(p_first_name), coalesce(p_last_name, ''), p_birth_date, p_age,
    coalesce(p_classe, ''), coalesce(p_school, ''),
    coalesce(nullif(p_avatar_emoji, ''), '👦'), coalesce(nullif(p_color, ''), '#4338CA'),
    coalesce(p_scolaria_id, '')
  )
  RETURNING * INTO v_child;

  SELECT r.foyer_id INTO v_foyer
  FROM public.responsables r WHERE r.user_id = v_uid ORDER BY r.created_at LIMIT 1;
  IF v_foyer IS NULL THEN
    INSERT INTO public.foyers (created_by) VALUES (v_uid) RETURNING id INTO v_foyer;
  END IF;

  INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  VALUES (v_foyer, v_uid, v_child.id, 'parent');

  INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, etablissement, classe, statut)
  VALUES (
    v_child.id, public.current_school_year(),
    coalesce(nullif(trim(p_classe), ''), 'non renseigné'),
    nullif(trim(p_school), ''), nullif(trim(p_classe), ''), 'active'
  );

  RETURN v_child;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.create_child(text, text, date, integer, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_child(text, text, date, integer, text, text, text, text, text) TO authenticated;

-- ─── 4. Jamais d'enfant sans année (vérifié au COMMIT) ──────────────────────
CREATE OR REPLACE FUNCTION public.ensure_child_has_year()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_child uuid;
BEGIN
  IF TG_TABLE_NAME = 'children' THEN
    v_child := NEW.id;
  ELSE
    v_child := OLD.student_id;
  END IF;

  IF EXISTS (SELECT 1 FROM public.children c WHERE c.id = v_child)
     AND NOT EXISTS (SELECT 1 FROM public.academic_years ay WHERE ay.student_id = v_child) THEN
    RAISE EXCEPTION 'un enfant doit toujours avoir au moins une année scolaire' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.ensure_child_has_year() FROM PUBLIC, anon, authenticated;

CREATE CONSTRAINT TRIGGER ensure_child_has_year
  AFTER INSERT ON public.children
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.ensure_child_has_year();

CREATE CONSTRAINT TRIGGER ensure_child_keeps_year
  AFTER DELETE ON public.academic_years
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.ensure_child_has_year();
