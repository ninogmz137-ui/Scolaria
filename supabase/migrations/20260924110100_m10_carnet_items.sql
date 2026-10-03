-- ════════════════════════════════════════════════════════════════════════════
-- M10 · Ajouts au carnet par la famille (Phase A, lot 3b) — 2026-09-24
-- Inverse : supabase/migrations_down/20260924110100_m10_carnet_items_down.sql
--
--  - Photographier / importer une capture / ajouter un document / noter une première fois.
--  - Rattachés à child_id + academic_year_id ; catégorie mot | livret | souvenir | jalon.
--  - visibilite 'foyer' (défaut) : visible de tous les responsables de l'enfant.
--    visibilite 'prive' : visible de son auteur UNIQUEMENT (l'autre responsable ne le voit pas).
--  - Modification / suppression : par l'auteur uniquement. Aucun accès enseignant.
--  - fichier = chemin dans le Storage (bucket privé + policies : à créer avec l'écran d'import).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.carnet_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  child_id uuid NOT NULL,
  academic_year_id uuid,
  categorie text NOT NULL,
  titre text DEFAULT ''::text NOT NULL,
  note text,
  fichier text,
  date date DEFAULT CURRENT_DATE NOT NULL,
  ajoute_par uuid DEFAULT auth.uid() NOT NULL,
  visibilite text DEFAULT 'foyer'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT carnet_items_pkey PRIMARY KEY (id),
  CONSTRAINT carnet_items_categorie_check CHECK (categorie = ANY (ARRAY['mot'::text, 'livret'::text, 'souvenir'::text, 'jalon'::text])),
  CONSTRAINT carnet_items_visibilite_check CHECK (visibilite = ANY (ARRAY['foyer'::text, 'prive'::text])),
  CONSTRAINT carnet_items_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE,
  CONSTRAINT carnet_items_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL,
  CONSTRAINT carnet_items_ajoute_par_fkey FOREIGN KEY (ajoute_par) REFERENCES public.profiles(id) ON DELETE CASCADE
);
CREATE INDEX idx_carnet_items_child ON public.carnet_items USING btree (child_id);
CREATE INDEX idx_carnet_items_year ON public.carnet_items USING btree (academic_year_id);
CREATE INDEX idx_carnet_items_ajoute_par ON public.carnet_items USING btree (ajoute_par);

CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.carnet_items
  FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('child_id');

-- Enfant et auteur non modifiables ; horodatage serveur.
CREATE OR REPLACE FUNCTION public.carnet_items_controler()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.child_id <> OLD.child_id OR NEW.ajoute_par <> OLD.ajoute_par THEN
      RAISE EXCEPTION 'enfant et auteur d''un ajout ne sont pas modifiables' USING ERRCODE = '42501';
    END IF;
  ELSE
    NEW.created_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.carnet_items_controler() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER carnet_items_controler BEFORE INSERT OR UPDATE ON public.carnet_items
  FOR EACH ROW EXECUTE FUNCTION public.carnet_items_controler();

ALTER TABLE public.carnet_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY carnet_items_select ON public.carnet_items FOR SELECT TO authenticated
  USING (public.is_responsable(child_id) AND (visibilite = 'foyer' OR ajoute_par = auth.uid()));
CREATE POLICY carnet_items_insert ON public.carnet_items FOR INSERT TO authenticated
  WITH CHECK (ajoute_par = auth.uid() AND public.is_responsable(child_id));
CREATE POLICY carnet_items_update ON public.carnet_items FOR UPDATE TO authenticated
  USING (ajoute_par = auth.uid() AND public.is_responsable(child_id))
  WITH CHECK (ajoute_par = auth.uid() AND public.is_responsable(child_id));
CREATE POLICY carnet_items_delete ON public.carnet_items FOR DELETE TO authenticated
  USING (ajoute_par = auth.uid() AND public.is_responsable(child_id));
