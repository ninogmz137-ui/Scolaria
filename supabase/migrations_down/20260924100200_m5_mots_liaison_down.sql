-- M5 · INVERSE — revient aux mots lus par NOM de classe (état après M5a). ⚠️ Perte des copies par carnet.
DROP VIEW IF EXISTS public.mots_liaison_enriched;
CREATE VIEW public.mots_liaison_enriched WITH (security_invoker = true) AS
 SELECT m.id, m.teacher_id, m.classe, m.type, m.titre, m.contenu, m.date_envoi, m.date_limite, m.statut,
    m.requires_signature, m.created_at,
    COALESCE(sig.cnt, 0) AS signatures_count,
    COALESCE(stu.cnt, 0) AS total_students
   FROM ((public.mots_liaison m
     LEFT JOIN ( SELECT signatures.mot_id, (count(*))::integer AS cnt FROM public.signatures GROUP BY signatures.mot_id) sig ON ((sig.mot_id = m.id)))
     LEFT JOIN ( SELECT children.classe, (count(*))::integer AS cnt FROM public.children GROUP BY children.classe) stu ON ((stu.classe = m.classe)));
REVOKE ALL ON public.mots_liaison_enriched FROM anon;

ALTER POLICY mots_parent_select ON public.mots_liaison
  USING (classe IN (SELECT c.classe FROM public.children c WHERE public.is_responsable(c.id)));

DROP TRIGGER IF EXISTS distribuer_mot_classe ON public.mots_liaison;
DROP FUNCTION IF EXISTS public.distribuer_mot_classe();
DROP FUNCTION IF EXISTS public.distribuer_mot(uuid, uuid[]);
DROP TABLE IF EXISTS public.mot_carnets;
DROP FUNCTION IF EXISTS public.is_mot_teacher(uuid);

DROP TRIGGER IF EXISTS sync_requires_signature ON public.mots_liaison;
DROP FUNCTION IF EXISTS public.sync_requires_signature();
ALTER TABLE public.mots_liaison
  DROP CONSTRAINT IF EXISTS mots_liaison_a_prevoir_check,
  DROP CONSTRAINT IF EXISTS mots_liaison_signature_mode_check,
  DROP COLUMN IF EXISTS a_prevoir,
  DROP COLUMN IF EXISTS event_date,
  DROP COLUMN IF EXISTS signature_mode;

ALTER TABLE public.mots_liaison DROP CONSTRAINT mots_liaison_type_check;
-- signature / participation n'ont pas d'équivalent : ramenés à info.
UPDATE public.mots_liaison SET type = CASE type WHEN 'information' THEN 'info' WHEN 'autorisation' THEN 'autorisation' ELSE 'info' END;
ALTER TABLE public.mots_liaison ADD CONSTRAINT mots_liaison_type_check
  CHECK (type = ANY (ARRAY['info'::text, 'autorisation'::text, 'bon_de_sortie'::text]));
