-- M5a · INVERSE — revient au rattachement par NOM de classe (état après M2). ⚠️ Perte des écoles / classes.
ALTER POLICY "Parents read events" ON public.class_events
  USING (classe IN (SELECT c.classe FROM public.children c WHERE public.is_responsable(c.id)));
ALTER POLICY "Parents read class posts" ON public.class_posts
  USING (classe IN (SELECT c.classe FROM public.children c WHERE public.is_responsable(c.id)));

-- (échoue si des lignes ont un nom de classe NULL : les renseigner d'abord)
ALTER TABLE public.class_events ALTER COLUMN classe SET NOT NULL;
ALTER TABLE public.class_posts  ALTER COLUMN classe SET NOT NULL;
ALTER TABLE public.mots_liaison ALTER COLUMN classe SET NOT NULL;

ALTER TABLE public.class_events   DROP COLUMN IF EXISTS classe_id;
ALTER TABLE public.class_posts    DROP COLUMN IF EXISTS classe_id;
ALTER TABLE public.mots_liaison   DROP COLUMN IF EXISTS classe_id;
ALTER TABLE public.academic_years DROP COLUMN IF EXISTS classe_id;

DROP TABLE IF EXISTS public.classes;
DROP TABLE IF EXISTS public.ecoles;
