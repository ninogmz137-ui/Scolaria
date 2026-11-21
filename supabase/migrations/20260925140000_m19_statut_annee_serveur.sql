-- ════════════════════════════════════════════════════════════════════════════
-- M19 · Statut d'une année : réservé au serveur (Phase B, lot B3b) — 2026-09-25
-- Inverse : supabase/migrations_down/20260925140000_m19_statut_annee_serveur_down.sql
--
-- Faille corrigée (signalée à l'audit M18) : la politique academic_years_update (is_responsable)
-- laisse un parent changer academic_years.statut. Or le statut décide de l'année « en cours », celle
-- où arrivent les nouvelles données (mots, compétences…). Le passage d'année est une opération serveur.
--
-- Règles (validées le 25 sept 2026) :
--   · app (anon / authenticated, parent comme enseignant) : ne MODIFIE jamais statut ; ne CRÉE une
--     année qu'en statut 'importée' (le parent recopie une année passée) ;
--   · serveur (postgres, service_role, et create_child qui s'exécute avec les droits du serveur) :
--     tout est permis ;
--   · une seule année par enfant et par millésime (contrainte unique) ;
--   · une année 'importée' est antérieure à l'année active de l'enfant (pour tous) ;
--   · millésime au format « AAAA-AAAA » (années consécutives) : condition pour comparer deux années.
-- Trigger (et non politique) : une politique ne voit pas l'ancienne valeur d'une colonne.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Format du millésime et unicité ──────────────────────────────────────
ALTER TABLE public.academic_years
  ADD CONSTRAINT academic_years_annee_scolaire_format CHECK (
    annee_scolaire ~ '^[0-9]{4}-[0-9]{4}$'
    AND substr(annee_scolaire, 6, 4)::int = substr(annee_scolaire, 1, 4)::int + 1
  );

ALTER TABLE public.academic_years
  ADD CONSTRAINT academic_years_enfant_millesime_unique UNIQUE (student_id, annee_scolaire);

-- ─── 2. Statut réservé au serveur ; année importée antérieure à l'année active ─
CREATE OR REPLACE FUNCTION public.verrou_statut_annee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_active text;
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' AND NEW.statut IS DISTINCT FROM 'importée' THEN
      RAISE EXCEPTION 'une année créée depuis l''app est toujours « importée » (le passage d''année est fait par le serveur)'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.statut IS DISTINCT FROM OLD.statut THEN
      RAISE EXCEPTION 'le statut d''une année est fixé par le serveur' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.statut = 'importée'
     AND (TG_OP = 'INSERT' OR NEW.statut IS DISTINCT FROM OLD.statut
          OR NEW.annee_scolaire IS DISTINCT FROM OLD.annee_scolaire) THEN
    SELECT ay.annee_scolaire INTO v_active
    FROM public.academic_years ay
    WHERE ay.student_id = NEW.student_id AND ay.statut = 'active' AND ay.id <> NEW.id
    ORDER BY ay.annee_scolaire DESC
    LIMIT 1;
    IF v_active IS NULL OR NEW.annee_scolaire >= v_active THEN
      RAISE EXCEPTION 'une année importée est antérieure à l''année en cours de l''enfant'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.verrou_statut_annee() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER verrou_statut_annee BEFORE INSERT OR UPDATE ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION public.verrou_statut_annee();
