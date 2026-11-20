-- ════════════════════════════════════════════════════════════════════════════
-- M17 · Suivi : découpage de l'année et échelle des compétences (Phase B, lot B3a) — 2026-09-25
-- Inverse : supabase/migrations_down/20260925120000_m17_suivi_decoupage_echelle_down.sql
--
-- Le carnet suit l'enfant d'une école à l'autre : chaque année garde SON découpage et chaque
-- évaluation SON échelle, pour rester lisibles dans les archives.
--
--  - classes.decoupage / echelle_competences : réglages de l'enseignant, nullables, SANS valeur
--    par défaut (NULL = « pas encore choisi »). Pas d'écriture depuis l'app dans ce lot.
--  - academic_years.decoupage / echelle_competences : réglages propres à une année SANS classe
--    (école hors Scolaria, année importée), nullables. Ignorés dès que l'année est rattachée.
--  - Résolution à un seul endroit (fonctions SQL), selon le rattachement — aucune copie, donc
--    aucune valeur périmée :
--      · année AVEC classe_id : classe → défaut
--      · année SANS classe_id : année → défaut
--    Défauts : découpage = trimestres (collège / lycée) sinon périodes ; échelle = 4 (LSU).
--    L'app s'en sert pour PRÉ-REMPLIR la saisie ; la base ne complète jamais une échelle.
--  - Verrou : un utilisateur de l'app ne modifie decoupage / echelle_competences d'une année que
--    si elle n'est rattachée à aucune classe (ni avant, ni après la modification).
--  - competences.echelle (3 | 4) : NOT NULL, toujours explicite, figée à la saisie (non modifiable).
--    Lignes existantes : 4. niveau BETWEEN 1 AND echelle.
--  - competences.periode : numéro de période / semestre / trimestre (1-5), cohérent avec le
--    découpage résolu de l'année (P1-P5, S1-S2, T1-T3).
--  - RLS : politiques inchangées (elles portent sur les lignes, donc sur les nouvelles colonnes) ;
--    la règle « colonne modifiable seulement si … » est portée par un trigger (une politique ne
--    voit pas l'ancienne valeur).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Colonnes ────────────────────────────────────────────────────────────

ALTER TABLE public.academic_years
  ADD COLUMN decoupage text,
  ADD COLUMN echelle_competences smallint,
  ADD CONSTRAINT academic_years_decoupage_check
    CHECK (decoupage IN ('periodes', 'semestres', 'trimestres')),
  ADD CONSTRAINT academic_years_echelle_competences_check
    CHECK (echelle_competences IN (3, 4));

ALTER TABLE public.classes
  ADD COLUMN decoupage text,
  ADD COLUMN echelle_competences smallint,
  ADD CONSTRAINT classes_decoupage_check
    CHECK (decoupage IN ('periodes', 'semestres', 'trimestres')),
  ADD CONSTRAINT classes_echelle_competences_check
    CHECK (echelle_competences IN (3, 4));

ALTER TABLE public.competences
  ADD COLUMN echelle smallint,
  ADD COLUMN periode smallint;

-- Lignes existantes : échelle LSU à 4 niveaux (seule échelle possible jusqu'ici).
UPDATE public.competences SET echelle = 4 WHERE echelle IS NULL;

ALTER TABLE public.competences
  ALTER COLUMN echelle SET NOT NULL,
  ADD CONSTRAINT competences_echelle_check CHECK (echelle IN (3, 4)),
  ADD CONSTRAINT competences_periode_check CHECK (periode BETWEEN 1 AND 5),
  DROP CONSTRAINT competences_niveau_check,
  ADD CONSTRAINT competences_niveau_check CHECK (niveau BETWEEN 1 AND echelle);

-- ─── 2. Résolution (un seul endroit) ────────────────────────────────────────
-- Accès : responsables de l'enfant, titulaire de la classe, ou appel serveur (pas d'utilisateur).

CREATE OR REPLACE FUNCTION public.decoupage_annee(p_academic_year_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(
    CASE WHEN ay.classe_id IS NOT NULL THEN c.decoupage ELSE ay.decoupage END,
    CASE
      WHEN ay.niveau ~* '^(6|5|4|3)(e|è|ème|eme)?$|^(2nde|seconde|1(re|ère)|premi|term)' THEN 'trimestres'
      ELSE 'periodes'
    END
  )
  FROM public.academic_years ay
  LEFT JOIN public.classes c ON c.id = ay.classe_id
  WHERE ay.id = p_academic_year_id
    AND (auth.uid() IS NULL OR public.is_responsable(ay.student_id) OR public.is_titulaire_annee(ay.id));
$function$;
REVOKE EXECUTE ON FUNCTION public.decoupage_annee(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decoupage_annee(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.echelle_competences_annee(p_academic_year_id uuid)
 RETURNS smallint
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(
    CASE WHEN ay.classe_id IS NOT NULL THEN c.echelle_competences ELSE ay.echelle_competences END,
    4
  )::smallint
  FROM public.academic_years ay
  LEFT JOIN public.classes c ON c.id = ay.classe_id
  WHERE ay.id = p_academic_year_id
    AND (auth.uid() IS NULL OR public.is_responsable(ay.student_id) OR public.is_titulaire_annee(ay.id));
$function$;
REVOKE EXECUTE ON FUNCTION public.echelle_competences_annee(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.echelle_competences_annee(uuid) TO authenticated;

-- ─── 3. Verrou : réglages d'une année modifiables seulement sans classe ─────

CREATE OR REPLACE FUNCTION public.verrou_reglages_annee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Appels via l'API uniquement ; service_role / postgres gardent la main (imports serveur).
  IF current_user IN ('anon', 'authenticated')
     AND (NEW.decoupage IS DISTINCT FROM OLD.decoupage
          OR NEW.echelle_competences IS DISTINCT FROM OLD.echelle_competences)
     AND (OLD.classe_id IS NOT NULL OR NEW.classe_id IS NOT NULL) THEN
    RAISE EXCEPTION 'année rattachée à une classe : le découpage et l''échelle sont ceux de la classe'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.verrou_reglages_annee() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER verrou_reglages_annee BEFORE UPDATE ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION public.verrou_reglages_annee();

-- ─── 4. Échelle figée, période cohérente avec le découpage ──────────────────
-- Nommé « valider_… » : s'exécute après set_academic_year (année connue).

CREATE OR REPLACE FUNCTION public.valider_echelle_periode()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_decoupage text;
  v_max smallint;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.echelle IS DISTINCT FROM OLD.echelle THEN
    RAISE EXCEPTION 'l''échelle d''une compétence est fixée à la saisie et n''est pas modifiable'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.periode IS NOT NULL AND NEW.academic_year_id IS NOT NULL THEN
    v_decoupage := public.decoupage_annee(NEW.academic_year_id);
    v_max := CASE v_decoupage WHEN 'semestres' THEN 2 WHEN 'trimestres' THEN 3 ELSE 5 END;
    IF NEW.periode > v_max THEN
      RAISE EXCEPTION 'période % incohérente avec le découpage de l''année (%)', NEW.periode, v_decoupage
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.valider_echelle_periode() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER valider_echelle_periode BEFORE INSERT OR UPDATE ON public.competences
  FOR EACH ROW EXECUTE FUNCTION public.valider_echelle_periode();
