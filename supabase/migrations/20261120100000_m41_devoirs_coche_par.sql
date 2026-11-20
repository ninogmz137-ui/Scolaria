-- M41 — devoirs : « Coché par [prénom] · [heure] », visible dans le foyer de l'auteur seulement
-- (lot 4a, plan du 20 nov. 2026 dans tasks/todo.md ; règle des parents séparés du 20 nov. 2026).
-- Inverse : supabase/migrations_down/20261120100000_m41_devoirs_coche_par_down.sql.
--
-- Règle (CLAUDE.md § Garde partagée, COMPONENTS §18.6) :
--   - la coche « fait » (agenda_events.is_done) est partagée entre TOUS les responsables de l'enfant, y compris
--     d'un autre foyer (inchangé : politiques agenda_select / agenda_update, is_responsable) ;
--   - l'AUTEUR et l'HEURE de la coche ne sont visibles qu'à l'intérieur du foyer de celui qui a coché ; un
--     responsable d'un autre foyer voit seulement « Fait ». Le masquage est fait par la base.
--
-- Mise en œuvre :
--   - agenda_coches : auteur et heure de la coche, une ligne par événement coché. Écrite par le SERVEUR seul
--     (déclencheur sur agenda_events.is_done : cocher pose (auth.uid(), now()), décocher efface la ligne) ;
--     AUCUNE lecture ni écriture directe par un compte (RLS active, politique qui refuse tout, droits retirés).
--   - coches_devoirs(p_child_id) : les coches de l'enfant pour un de ses responsables, auteur et heure à null
--     quand l'auteur n'est pas du même foyer que le lecteur (pour cet enfant) — sauf si c'est le lecteur lui-même.
--   - agenda_events n'est PAS modifiée : `select('*')` de l'app (et d'une app plus ancienne) reste valide.
-- Advisors : 1 WARN attendu (authenticated_security_definer_function_executable sur coches_devoirs), à déclarer
-- dans tasks/warns-attendus.md avant le cycle. Le déclencheur (SECURITY DEFINER) n'est exécutable par personne.

CREATE TABLE public.agenda_coches (
  event_id uuid PRIMARY KEY REFERENCES public.agenda_events(id) ON DELETE CASCADE,
  fait_par uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  fait_le timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agenda_coches_fait_par ON public.agenda_coches USING btree (fait_par);
ALTER TABLE public.agenda_coches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.agenda_coches FROM PUBLIC, anon, authenticated;
-- Politique explicite qui refuse tout (lecture par coches_devoirs seulement) : pas de table « RLS sans politique ».
CREATE POLICY agenda_coches_aucun_acces ON public.agenda_coches FOR ALL TO authenticated USING (false) WITH CHECK (false);
COMMENT ON TABLE public.agenda_coches IS
  'Auteur et heure de la coche « fait » d''un événement (devoir). Écrite par le déclencheur agenda_events_poser_coche, lue par coches_devoirs (auteur et heure masqués hors du foyer de l''auteur). M41.';

-- Déclencheur : la coche pose l'auteur et l'heure, la décoche les efface. Jamais une valeur venue du client.
CREATE OR REPLACE FUNCTION public.agenda_events_poser_coche()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.is_done IS DISTINCT FROM OLD.is_done THEN
    IF NEW.is_done THEN
      INSERT INTO public.agenda_coches (event_id, fait_par, fait_le)
      VALUES (NEW.id, (SELECT auth.uid()), now())
      ON CONFLICT (event_id) DO UPDATE SET fait_par = EXCLUDED.fait_par, fait_le = EXCLUDED.fait_le;
    ELSIF TG_OP = 'UPDATE' THEN
      DELETE FROM public.agenda_coches WHERE event_id = NEW.id;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.agenda_events_poser_coche() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER agenda_events_poser_coche AFTER INSERT OR UPDATE OF is_done ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.agenda_events_poser_coche();

-- Lecture : les coches de l'enfant, pour un de ses responsables seulement ; auteur et heure dans le foyer de
-- l'auteur seulement (ou pour l'auteur lui-même), sinon null (« Fait »).
CREATE OR REPLACE FUNCTION public.coches_devoirs(p_child_id uuid)
RETURNS TABLE (event_id uuid, fait_par uuid, fait_le timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.event_id,
         CASE WHEN v.visible THEN c.fait_par END,
         CASE WHEN v.visible THEN c.fait_le END
  FROM public.agenda_coches c
  JOIN public.agenda_events e ON e.id = c.event_id
  CROSS JOIN LATERAL (
    SELECT c.fait_par = (SELECT auth.uid())
        OR EXISTS (
             SELECT 1
             FROM public.responsables moi
             JOIN public.responsables auteur
               ON auteur.foyer_id = moi.foyer_id
              AND auteur.child_id = p_child_id
              AND auteur.user_id = c.fait_par
             WHERE moi.user_id = (SELECT auth.uid())
               AND moi.child_id = p_child_id
           ) AS visible
  ) v
  WHERE e.child_id = p_child_id
    AND public.is_responsable(p_child_id);
$$;
REVOKE ALL ON FUNCTION public.coches_devoirs(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coches_devoirs(uuid) TO authenticated;
COMMENT ON FUNCTION public.coches_devoirs(uuid) IS
  'Coches « fait » des événements d''un enfant, pour un de ses responsables. Auteur et heure seulement dans le foyer de l''auteur (règle des parents séparés, 20 nov. 2026), sinon null. M41.';
