-- M43 — rendez-vous fixes hebdomadaires (lot 4c, plan du 20 nov. 2026 dans tasks/todo.md, ajouts A1 et A2).
-- Inverse : supabase/migrations_down/20261120120000_m43_rendez_vous_fixes_down.sql.
--
-- « Piscine · tous les jeudis », « Bibliothèque · tous les mardis », chacun avec sa liste « À prévoir ».
-- - rendez_vous_fixes : un rendez-vous par enfant (un enfant = un carnet), jour de la semaine (1 = lundi … 7),
--   heure facultative, catégorie facultative (identifiant stable de src/theme/categories.ts), liste « À prévoir »
--   (tableau de textes). « Ajouté par » : cree_par posé par le serveur. Lu, créé, MODIFIÉ et SUPPRIMÉ par tout
--   responsable de l'enfant (règle du 20 nov.). Pas d'affichage pendant les vacances : calcul de l'app
--   (src/utils/vacances.ts, fichier statique), rien en base.
-- - rendez_vous_coches : un élément « À prévoir » coché pour une SEMAINE (lundi), partagé entre TOUS les responsables
--   de l'enfant (y compris d'un autre foyer : règle des parents séparés). Coché = la ligne existe ; décoché = supprimée.
-- - rendez_vous_coches_auteurs : auteur et heure de la coche, écrits par le SERVEUR (déclencheur), lisibles
--   SEULEMENT par les responsables du foyer de l'auteur (règle des parents séparés : hors foyer, « Fait »).
-- Advisors : aucun WARN nouveau attendu (politiques avec (select auth.uid()) ou fonctions déjà listées ; déclencheurs
-- SECURITY DEFINER non exécutables par un compte ; une politique par commande et par table).

CREATE TABLE public.rendez_vous_fixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  titre text NOT NULL CHECK (length(btrim(titre)) BETWEEN 1 AND 80),
  jour_semaine smallint NOT NULL CHECK (jour_semaine BETWEEN 1 AND 7),
  heure time,
  categorie text CHECK (categorie IS NULL OR categorie ~ '^[a-z-]{1,30}$'),
  a_prevoir jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(a_prevoir) = 'array' AND jsonb_array_length(a_prevoir) <= 12),
  cree_par uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rendez_vous_fixes_child ON public.rendez_vous_fixes USING btree (child_id);
CREATE INDEX idx_rendez_vous_fixes_annee ON public.rendez_vous_fixes USING btree (academic_year_id);
CREATE INDEX idx_rendez_vous_fixes_cree_par ON public.rendez_vous_fixes USING btree (cree_par);
CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.rendez_vous_fixes
  FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('child_id');
ALTER TABLE public.rendez_vous_fixes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rendez_vous_fixes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rendez_vous_fixes TO authenticated;
CREATE POLICY rendez_vous_fixes_select ON public.rendez_vous_fixes FOR SELECT TO authenticated USING (public.is_responsable(child_id));
CREATE POLICY rendez_vous_fixes_insert ON public.rendez_vous_fixes FOR INSERT TO authenticated WITH CHECK (public.is_responsable(child_id));
CREATE POLICY rendez_vous_fixes_update ON public.rendez_vous_fixes FOR UPDATE TO authenticated
  USING (public.is_responsable(child_id)) WITH CHECK (public.is_responsable(child_id));
CREATE POLICY rendez_vous_fixes_delete ON public.rendez_vous_fixes FOR DELETE TO authenticated USING (public.is_responsable(child_id));
COMMENT ON TABLE public.rendez_vous_fixes IS
  'Rendez-vous fixes hebdomadaires d''un enfant (piscine le jeudi…), avec liste « À prévoir ». Tout responsable de l''enfant les lit, crée, modifie, supprime. M43.';

-- Auteur posé par le serveur ; l'enfant, l'auteur et la date de création ne changent jamais.
CREATE OR REPLACE FUNCTION public.rendez_vous_fixes_poser()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.cree_par := (SELECT auth.uid());
    NEW.created_at := now();
  ELSE
    NEW.child_id := OLD.child_id;
    NEW.cree_par := CASE WHEN NEW.cree_par IS NULL AND (SELECT auth.uid()) IS NULL THEN NULL ELSE OLD.cree_par END;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.a_prevoir) e
             WHERE jsonb_typeof(e) <> 'string' OR length(btrim(e #>> '{}')) NOT BETWEEN 1 AND 60) THEN
    RAISE EXCEPTION 'liste « À prévoir » invalide' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.rendez_vous_fixes_poser() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER rendez_vous_fixes_poser BEFORE INSERT OR UPDATE ON public.rendez_vous_fixes
  FOR EACH ROW EXECUTE FUNCTION public.rendez_vous_fixes_poser();

-- Coches « À prévoir », par semaine, partagées entre tous les responsables de l'enfant.
CREATE TABLE public.rendez_vous_coches (
  rdv_id uuid NOT NULL REFERENCES public.rendez_vous_fixes(id) ON DELETE CASCADE,
  semaine date NOT NULL CHECK (extract(isodow FROM semaine) = 1),
  item text NOT NULL CHECK (length(btrim(item)) BETWEEN 1 AND 60),
  PRIMARY KEY (rdv_id, semaine, item)
);
ALTER TABLE public.rendez_vous_coches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rendez_vous_coches FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.rendez_vous_coches TO authenticated;
CREATE POLICY rendez_vous_coches_select ON public.rendez_vous_coches FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rendez_vous_fixes r WHERE r.id = rendez_vous_coches.rdv_id AND public.is_responsable(r.child_id)));
CREATE POLICY rendez_vous_coches_insert ON public.rendez_vous_coches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.rendez_vous_fixes r WHERE r.id = rendez_vous_coches.rdv_id AND public.is_responsable(r.child_id)));
CREATE POLICY rendez_vous_coches_delete ON public.rendez_vous_coches FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rendez_vous_fixes r WHERE r.id = rendez_vous_coches.rdv_id AND public.is_responsable(r.child_id)));

-- Auteur et heure des coches : écrits par le serveur, lisibles dans le foyer de l'auteur seulement.
CREATE TABLE public.rendez_vous_coches_auteurs (
  rdv_id uuid NOT NULL,
  semaine date NOT NULL,
  item text NOT NULL,
  fait_par uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  fait_le timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rdv_id, semaine, item),
  FOREIGN KEY (rdv_id, semaine, item) REFERENCES public.rendez_vous_coches(rdv_id, semaine, item) ON DELETE CASCADE
);
CREATE INDEX idx_rendez_vous_coches_auteurs_fait_par ON public.rendez_vous_coches_auteurs USING btree (fait_par);
ALTER TABLE public.rendez_vous_coches_auteurs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rendez_vous_coches_auteurs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.rendez_vous_coches_auteurs TO authenticated;
CREATE POLICY rendez_vous_coches_auteurs_select ON public.rendez_vous_coches_auteurs FOR SELECT TO authenticated
  USING (
    fait_par = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.rendez_vous_fixes r
      JOIN public.responsables moi ON moi.child_id = r.child_id AND moi.user_id = (SELECT auth.uid())
      JOIN public.responsables auteur ON auteur.child_id = r.child_id AND auteur.user_id = rendez_vous_coches_auteurs.fait_par
                                     AND auteur.foyer_id = moi.foyer_id
      WHERE r.id = rendez_vous_coches_auteurs.rdv_id
    )
  );

CREATE OR REPLACE FUNCTION public.rendez_vous_coches_poser_auteur()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.rendez_vous_coches_auteurs (rdv_id, semaine, item, fait_par, fait_le)
  VALUES (NEW.rdv_id, NEW.semaine, NEW.item, (SELECT auth.uid()), now());
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.rendez_vous_coches_poser_auteur() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER rendez_vous_coches_poser_auteur AFTER INSERT ON public.rendez_vous_coches
  FOR EACH ROW EXECUTE FUNCTION public.rendez_vous_coches_poser_auteur();

COMMENT ON TABLE public.rendez_vous_coches IS
  'Élément « À prévoir » d''un rendez-vous fixe coché pour une semaine (lundi), partagé entre tous les responsables de l''enfant. M43.';
COMMENT ON TABLE public.rendez_vous_coches_auteurs IS
  'Auteur et heure d''une coche « À prévoir » (déclencheur), lisibles dans le foyer de l''auteur seulement (règle des parents séparés). M43.';
