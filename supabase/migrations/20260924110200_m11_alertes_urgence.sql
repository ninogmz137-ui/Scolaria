-- ════════════════════════════════════════════════════════════════════════════
-- M11 · Alertes du protocole d'urgence (Phase A, lot 3b) — 2026-09-24
-- Inverse : supabase/migrations_down/20260924110200_m11_alertes_urgence_down.sql
--
-- DÉCISION : une alerte est PRIVÉE À SON AUTEUR. Jamais partagée automatiquement avec l'autre
-- responsable (ex. maltraitance signalée contre l'autre parent), ni avec l'enseignant.
-- Stockage minimal : catégorie + date + enfant (+ année). JAMAIS le texte du message :
-- la table n'a aucune colonne de texte libre.
--  - Écriture : l'auteur lui-même (enfant absent ou dont il est responsable).
--  - Lecture / suppression : l'auteur uniquement. Aucune modification.
--  - Suppression du carnet de l'enfant : l'alerte reste à son auteur (child_id → NULL).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE public.alertes_urgence (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  auteur_id uuid DEFAULT auth.uid() NOT NULL,
  child_id uuid,
  academic_year_id uuid,
  categorie text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT alertes_urgence_pkey PRIMARY KEY (id),
  CONSTRAINT alertes_urgence_categorie_check CHECK (categorie = ANY (ARRAY['suicide'::text, 'harcelement'::text, 'maltraitance'::text])),
  CONSTRAINT alertes_urgence_auteur_id_fkey FOREIGN KEY (auteur_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT alertes_urgence_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE SET NULL,
  CONSTRAINT alertes_urgence_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE SET NULL
);
CREATE INDEX idx_alertes_urgence_auteur ON public.alertes_urgence USING btree (auteur_id);
CREATE INDEX idx_alertes_urgence_child ON public.alertes_urgence USING btree (child_id);
CREATE INDEX idx_alertes_urgence_year ON public.alertes_urgence USING btree (academic_year_id);

CREATE TRIGGER set_academic_year BEFORE INSERT OR UPDATE ON public.alertes_urgence
  FOR EACH ROW EXECUTE FUNCTION public.set_academic_year('child_id');

ALTER TABLE public.alertes_urgence ENABLE ROW LEVEL SECURITY;
CREATE POLICY alertes_urgence_select ON public.alertes_urgence FOR SELECT TO authenticated
  USING (auteur_id = auth.uid());
CREATE POLICY alertes_urgence_insert ON public.alertes_urgence FOR INSERT TO authenticated
  WITH CHECK (auteur_id = auth.uid() AND (child_id IS NULL OR public.is_responsable(child_id)));
CREATE POLICY alertes_urgence_delete ON public.alertes_urgence FOR DELETE TO authenticated
  USING (auteur_id = auth.uid());
-- Pas d'UPDATE.
REVOKE ALL ON public.alertes_urgence FROM anon;
