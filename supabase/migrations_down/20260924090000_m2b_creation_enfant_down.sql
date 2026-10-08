-- M2b · INVERSE — rétablit l'état après M2 (insert direct + trigger du créateur, lecture par le créateur).
DROP TRIGGER IF EXISTS ensure_child_keeps_year ON public.academic_years;
DROP TRIGGER IF EXISTS ensure_child_has_year ON public.children;
DROP FUNCTION IF EXISTS public.ensure_child_has_year();
DROP FUNCTION IF EXISTS public.create_child(text, text, date, integer, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.current_school_year();

CREATE OR REPLACE FUNCTION public.add_child_creator_as_responsable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_foyer uuid;
BEGIN
  SELECT r.foyer_id INTO v_foyer FROM public.responsables r WHERE r.user_id = NEW.parent_id ORDER BY r.created_at LIMIT 1;
  IF v_foyer IS NULL THEN
    INSERT INTO public.foyers (created_by) VALUES (NEW.parent_id) RETURNING id INTO v_foyer;
  END IF;
  INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  VALUES (v_foyer, NEW.parent_id, NEW.id, 'parent')
  ON CONFLICT (user_id, child_id) DO NOTHING;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.add_child_creator_as_responsable() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER add_child_creator_as_responsable
  AFTER INSERT ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.add_child_creator_as_responsable();

CREATE POLICY children_insert ON public.children AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = parent_id));
ALTER POLICY children_select ON public.children USING (parent_id = auth.uid() OR public.is_responsable(id));
