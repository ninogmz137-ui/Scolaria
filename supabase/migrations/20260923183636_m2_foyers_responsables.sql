-- ════════════════════════════════════════════════════════════════════════════
-- M2 · Foyers et responsables (Phase A, lot 2) — 2026-09-23
-- Inverse : supabase/migrations_down/<version>_m2_foyers_responsables_down.sql
--
-- Un responsable ne voit QUE les enfants auxquels il est rattaché (table responsables).
-- Deux responsables d'un même enfant partagent les données école de cet enfant, mais JAMAIS
-- leurs conversations privées (aria_conversations, messages, teacher_conversations : inchangées,
-- réservées à leurs participants).
-- children.parent_id est conservé (= créateur) ; le créateur devient automatiquement responsable.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Tables ─────────────────────────────────────────────────────────────────
CREATE TABLE public.foyers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nom text DEFAULT ''::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT foyers_pkey PRIMARY KEY (id),
  CONSTRAINT foyers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.responsables (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  foyer_id uuid NOT NULL,
  user_id uuid NOT NULL,
  child_id uuid NOT NULL,
  lien text DEFAULT 'parent'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT responsables_pkey PRIMARY KEY (id),
  CONSTRAINT responsables_user_child_key UNIQUE (user_id, child_id),
  CONSTRAINT responsables_foyer_id_fkey FOREIGN KEY (foyer_id) REFERENCES public.foyers(id) ON DELETE CASCADE,
  CONSTRAINT responsables_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT responsables_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE,
  CONSTRAINT responsables_lien_check CHECK ((lien = ANY (ARRAY['parent'::text, 'tuteur'::text, 'autre'::text])))
);
CREATE INDEX idx_responsables_child ON public.responsables USING btree (child_id);
CREATE INDEX idx_responsables_foyer ON public.responsables USING btree (foyer_id);

-- ─── Fonction d'accès (SECURITY DEFINER : évite la récursion RLS sur responsables) ─
CREATE OR REPLACE FUNCTION public.is_responsable(p_child_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.responsables r
    WHERE r.child_id = p_child_id AND r.user_id = auth.uid()
  );
$function$;
REVOKE EXECUTE ON FUNCTION public.is_responsable(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_responsable(uuid) TO authenticated;

-- ─── Le créateur d'un enfant en devient responsable (foyer créé si besoin) ──
CREATE OR REPLACE FUNCTION public.add_child_creator_as_responsable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_foyer uuid;
BEGIN
  SELECT r.foyer_id INTO v_foyer
  FROM public.responsables r
  WHERE r.user_id = NEW.parent_id
  ORDER BY r.created_at
  LIMIT 1;

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

-- ─── Reprise de l'existant : un foyer par créateur, une ligne par enfant ────
DO $$
DECLARE
  c record;
  v_foyer uuid;
BEGIN
  FOR c IN SELECT id, parent_id FROM public.children ORDER BY created_at LOOP
    SELECT r.foyer_id INTO v_foyer FROM public.responsables r WHERE r.user_id = c.parent_id LIMIT 1;
    IF v_foyer IS NULL THEN
      INSERT INTO public.foyers (created_by) VALUES (c.parent_id) RETURNING id INTO v_foyer;
    END IF;
    INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
    VALUES (v_foyer, c.parent_id, c.id, 'parent')
    ON CONFLICT (user_id, child_id) DO NOTHING;
  END LOOP;
END $$;

-- ─── RLS des nouvelles tables ───────────────────────────────────────────────
ALTER TABLE public.foyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsables ENABLE ROW LEVEL SECURITY;

-- Un responsable voit ses lignes et les co-responsables de ses enfants. Écriture : triggers /
-- service_role uniquement (l'invitation d'un second responsable viendra avec son écran).
CREATE POLICY responsables_select ON public.responsables FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_responsable(child_id));

CREATE POLICY foyers_select ON public.foyers FOR SELECT TO authenticated
  USING (id IN (SELECT r.foyer_id FROM public.responsables r WHERE r.user_id = auth.uid()));
CREATE POLICY foyers_update ON public.foyers FOR UPDATE TO authenticated
  USING (id IN (SELECT r.foyer_id FROM public.responsables r WHERE r.user_id = auth.uid()))
  WITH CHECK (id IN (SELECT r.foyer_id FROM public.responsables r WHERE r.user_id = auth.uid()));

-- ─── Données de carnet : accès par is_responsable(enfant) ───────────────────
-- children : le créateur voit la ligne dès l'insertion (le lien responsable est posé juste après).
ALTER POLICY children_select ON public.children USING (parent_id = auth.uid() OR public.is_responsable(id));
ALTER POLICY children_update ON public.children USING (public.is_responsable(id)) WITH CHECK (public.is_responsable(id));
ALTER POLICY children_delete ON public.children USING (public.is_responsable(id));

ALTER POLICY absences_parent_insert ON public.absences WITH CHECK (signalee_par = auth.uid() AND public.is_responsable(student_id));
ALTER POLICY absences_parent_select ON public.absences USING (public.is_responsable(student_id));
ALTER POLICY absences_parent_update ON public.absences USING (public.is_responsable(student_id));

ALTER POLICY academic_years_select ON public.academic_years USING (public.is_responsable(student_id));
ALTER POLICY academic_years_insert ON public.academic_years WITH CHECK (public.is_responsable(student_id));
ALTER POLICY academic_years_update ON public.academic_years USING (public.is_responsable(student_id));
ALTER POLICY academic_years_delete ON public.academic_years USING (public.is_responsable(student_id));

-- Agenda : partagé par les responsables de l'enfant ; l'auteur reste tracé (parent_id).
ALTER POLICY agenda_select ON public.agenda_events USING (public.is_responsable(child_id));
ALTER POLICY agenda_insert ON public.agenda_events WITH CHECK (auth.uid() = parent_id AND public.is_responsable(child_id));
ALTER POLICY agenda_update ON public.agenda_events USING (public.is_responsable(child_id));
ALTER POLICY agenda_delete ON public.agenda_events USING (public.is_responsable(child_id));

-- Aria : conversation PRIVÉE du responsable (lecture inchangée : parent_id = auth.uid()).
ALTER POLICY aria_conv_insert ON public.aria_conversations WITH CHECK (auth.uid() = parent_id AND public.is_responsable(child_id));

ALTER POLICY bulletins_select ON public.bulletins USING (public.is_responsable(child_id));
ALTER POLICY bulletins_insert ON public.bulletins WITH CHECK (public.is_responsable(child_id));
ALTER POLICY bulletins_update ON public.bulletins USING (public.is_responsable(child_id));
ALTER POLICY bulletins_delete ON public.bulletins USING (public.is_responsable(child_id));

ALTER POLICY checkins_select ON public.checkins USING (public.is_responsable(child_id));
ALTER POLICY checkins_insert ON public.checkins WITH CHECK (public.is_responsable(child_id));

ALTER POLICY grades_select ON public.grades USING (public.is_responsable(child_id));
ALTER POLICY grades_insert ON public.grades WITH CHECK (public.is_responsable(child_id));
ALTER POLICY grades_update ON public.grades USING (public.is_responsable(child_id));
ALTER POLICY grades_delete ON public.grades USING (public.is_responsable(child_id));

ALTER POLICY subjects_select ON public.subjects USING (public.is_responsable(child_id));
ALTER POLICY subjects_insert ON public.subjects WITH CHECK (public.is_responsable(child_id));
ALTER POLICY subjects_update ON public.subjects USING (public.is_responsable(child_id));

-- Signatures : chacun signe en son nom ; le statut est visible par tous les responsables de l'enfant.
ALTER POLICY sig_parent_insert ON public.signatures WITH CHECK (parent_id = auth.uid() AND public.is_responsable(student_id));
ALTER POLICY sig_parent_select ON public.signatures USING (public.is_responsable(student_id));

-- Mots et publications de classe : via les enfants dont on est responsable
-- (rattachement par le NOM de classe : remplacé par un id école + classe au lot 3).
ALTER POLICY mots_parent_select ON public.mots_liaison
  USING (classe IN (SELECT c.classe FROM public.children c WHERE public.is_responsable(c.id)));
ALTER POLICY "Parents read class posts" ON public.class_posts
  USING (classe IN (SELECT c.classe FROM public.children c WHERE public.is_responsable(c.id)));
ALTER POLICY "Parents read events" ON public.class_events
  USING (classe IN (SELECT c.classe FROM public.children c WHERE public.is_responsable(c.id)));
