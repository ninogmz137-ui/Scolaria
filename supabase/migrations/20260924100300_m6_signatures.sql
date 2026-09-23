-- ════════════════════════════════════════════════════════════════════════════
-- M6 · Signatures : une ligne par (mot, enfant, responsable) (Phase A, lot 3a) — 2026-09-24
-- Inverse : supabase/migrations_down/20260924100300_m6_signatures_down.sql
--
--  - UNIQUE (mot_id, student_id, parent_id) : chaque responsable signe une fois, en son nom.
--  - Le mot doit être dans le carnet de l'enfant (FK vers mot_carnets), envoyé, et demander une signature.
--  - parent_name / student_name / signed_at / academic_year_id sont fixés côté serveur.
--  - Signatures immuables (aucune policy UPDATE / DELETE).
--  - Vue mot_carnets_statut : est_signe par carnet
--      one  → au moins 1 signature
--      both → les 2 responsables ont signé (si l'enfant n'a qu'UN responsable : sa signature suffit)
--      none → NULL (pas de signature attendue)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.signatures DROP CONSTRAINT signatures_mot_id_student_id_key;
ALTER TABLE public.signatures
  ADD CONSTRAINT signatures_mot_student_parent_key UNIQUE (mot_id, student_id, parent_id),
  ADD CONSTRAINT signatures_mot_carnet_fkey FOREIGN KEY (mot_id, student_id)
    REFERENCES public.mot_carnets(mot_id, child_id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_signatures_student ON public.signatures USING btree (student_id);

-- ─── Contrôles et champs fixés côté serveur ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.signatures_remplir()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_mot public.mots_liaison%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'une signature ne peut pas être modifiée' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_mot FROM public.mots_liaison WHERE id = NEW.mot_id;
  IF v_mot.statut IS DISTINCT FROM 'envoyé' THEN
    RAISE EXCEPTION 'ce mot n''est pas ouvert à la signature' USING ERRCODE = '23514';
  END IF;
  IF v_mot.signature_mode = 'none' THEN
    RAISE EXCEPTION 'ce mot ne demande pas de signature' USING ERRCODE = '23514';
  END IF;

  SELECT btrim(p.first_name || ' ' || p.family_name) INTO NEW.parent_name FROM public.profiles p WHERE p.id = NEW.parent_id;
  NEW.parent_name := COALESCE(NEW.parent_name, '');
  SELECT c.first_name INTO NEW.student_name FROM public.children c WHERE c.id = NEW.student_id;
  NEW.student_name := COALESCE(NEW.student_name, '');
  NEW.signed_at := now();
  SELECT mc.academic_year_id INTO NEW.academic_year_id
  FROM public.mot_carnets mc WHERE mc.mot_id = NEW.mot_id AND mc.child_id = NEW.student_id;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.signatures_remplir() FROM PUBLIC, anon, authenticated;
-- Nommé après « set_academic_year » : s'exécute ensuite et impose l'année du carnet.
CREATE TRIGGER signatures_remplir BEFORE INSERT OR UPDATE ON public.signatures
  FOR EACH ROW EXECUTE FUNCTION public.signatures_remplir();

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Insertion inchangée : parent_id = auth.uid() AND is_responsable(student_id) — on ne signe qu'en son nom.
ALTER POLICY sig_parent_select ON public.signatures
  USING (public.is_responsable(student_id) OR public.is_mot_teacher(mot_id));

-- Nombre de responsables d'un enfant pour un carnet donné, visible des seuls responsables de
-- l'enfant ou de l'enseignant auteur du mot (NULL sinon).
CREATE OR REPLACE FUNCTION public.nb_responsables_carnet(p_mot_id uuid, p_child_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT CASE
    WHEN public.is_responsable(p_child_id)
      OR (public.is_mot_teacher(p_mot_id)
          AND EXISTS (SELECT 1 FROM public.mot_carnets mc WHERE mc.mot_id = p_mot_id AND mc.child_id = p_child_id))
    THEN (SELECT count(*)::integer FROM public.responsables r WHERE r.child_id = p_child_id)
  END;
$function$;
REVOKE EXECUTE ON FUNCTION public.nb_responsables_carnet(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nb_responsables_carnet(uuid, uuid) TO authenticated;

-- ─── Statut de signature par carnet ─────────────────────────────────────────
CREATE VIEW public.mot_carnets_statut WITH (security_invoker = true) AS
 SELECT mc.id AS mot_carnet_id,
    mc.mot_id,
    mc.child_id,
    mc.academic_year_id,
    m.signature_mode,
    COALESCE(s.cnt, 0) AS nb_signatures,
    public.nb_responsables_carnet(mc.mot_id, mc.child_id) AS nb_responsables,
    CASE m.signature_mode
      WHEN 'one'  THEN COALESCE(s.cnt, 0) >= 1
      WHEN 'both' THEN COALESCE(s.cnt, 0) >= 1
                   AND COALESCE(s.cnt, 0) >= LEAST(2, public.nb_responsables_carnet(mc.mot_id, mc.child_id))
      ELSE NULL
    END AS est_signe
   FROM public.mot_carnets mc
     JOIN public.mots_liaison m ON m.id = mc.mot_id
     LEFT JOIN ( SELECT signatures.mot_id, signatures.student_id, (count(*))::integer AS cnt
           FROM public.signatures
          GROUP BY signatures.mot_id, signatures.student_id) s ON s.mot_id = mc.mot_id AND s.student_id = mc.child_id;
REVOKE ALL ON public.mot_carnets_statut FROM anon;

-- Vue enrichie : signatures_count = nombre de carnets signés.
CREATE OR REPLACE VIEW public.mots_liaison_enriched WITH (security_invoker = true) AS
 SELECT m.id,
    m.teacher_id,
    m.classe,
    m.type,
    m.titre,
    m.contenu,
    m.date_envoi,
    m.date_limite,
    m.statut,
    m.requires_signature,
    m.created_at,
    COALESCE(st.signes, 0) AS signatures_count,
    COALESCE(st.total, 0) AS total_students,
    m.classe_id,
    m.signature_mode,
    m.event_date,
    m.a_prevoir
   FROM public.mots_liaison m
     LEFT JOIN ( SELECT mot_carnets_statut.mot_id,
            (count(*))::integer AS total,
            (count(*) FILTER (WHERE mot_carnets_statut.est_signe))::integer AS signes
           FROM public.mot_carnets_statut
          GROUP BY mot_carnets_statut.mot_id) st ON st.mot_id = m.id;
REVOKE ALL ON public.mots_liaison_enriched FROM anon;
