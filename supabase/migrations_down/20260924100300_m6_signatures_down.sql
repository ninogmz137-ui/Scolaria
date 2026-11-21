-- M6 · INVERSE — une signature par (mot, enfant) (état après M5).
-- ⚠️ Échoue si un même carnet a déjà 2 signatures : les dédoublonner d'abord (avec accord).
CREATE OR REPLACE VIEW public.mots_liaison_enriched WITH (security_invoker = true) AS
 SELECT m.id, m.teacher_id, m.classe, m.type, m.titre, m.contenu, m.date_envoi, m.date_limite, m.statut,
    m.requires_signature, m.created_at,
    0 AS signatures_count,
    COALESCE(mc.cnt, 0) AS total_students,
    m.classe_id, m.signature_mode, m.event_date, m.a_prevoir
   FROM public.mots_liaison m
     LEFT JOIN ( SELECT mot_carnets.mot_id, (count(*))::integer AS cnt FROM public.mot_carnets GROUP BY mot_carnets.mot_id) mc ON mc.mot_id = m.id;

DROP VIEW IF EXISTS public.mot_carnets_statut;
DROP FUNCTION IF EXISTS public.nb_responsables_carnet(uuid, uuid);

ALTER POLICY sig_parent_select ON public.signatures USING (public.is_responsable(student_id));

DROP TRIGGER IF EXISTS signatures_remplir ON public.signatures;
DROP FUNCTION IF EXISTS public.signatures_remplir();

DROP INDEX IF EXISTS public.idx_signatures_student;
ALTER TABLE public.signatures
  DROP CONSTRAINT IF EXISTS signatures_mot_carnet_fkey,
  DROP CONSTRAINT IF EXISTS signatures_mot_student_parent_key;
ALTER TABLE public.signatures ADD CONSTRAINT signatures_mot_id_student_id_key UNIQUE (mot_id, student_id);
