-- M22 · Fils parent ↔ enseignant PAR FOYER (lot B4b, 27 sept 2026 — tasks/b4-decisions.md §3).
--
-- On améliore teacher_conversations / teacher_messages (tables vides en production le 27 sept) :
--   - portee = 'foyer'      : fil FAMILLE d'un foyer avec l'enseignant, pour un enfant. Tous les
--                             responsables de CE foyer le lisent ; chaque message garde son auteur.
--   - portee = 'individuel' : fil d'UN responsable avec l'enseignant (« Seulement moi » côté parent,
--                             « un seul parent » côté enseignant). Invisible pour l'autre responsable,
--                             même dans le même foyer.
--   Deux foyers pour un enfant (parents séparés) = deux fils famille : aucun ne voit l'autre.
-- - envoi_id (teacher_messages) : le MÊME message de l'enseignant copié dans le fil de chaque foyer
--   (« Tous les représentants », défaut côté enseignant) ; « Envoyé aussi à [prénom] » se calcule par
--   envoye_aussi_a(), qui ne renvoie que des PRÉNOMS (jamais les réponses de l'autre foyer).
-- - Côté enseignant : modèle seulement (envoyer_a_tous_les_representants, fil individuel par insertion),
--   pas d'écran dans ce lot.
-- - Sécurité : l'enseignant d'un fil doit être le titulaire de la classe de l'enfant (année active) ;
--   avant M22, n'importe quel compte pouvait créer un fil « à son nom » vers n'importe quel élève.
-- - Non tranché (todo) : l'historique du fil famille quand un parent quitte le foyer.

-- ─── Colonnes ───────────────────────────────────────────────────────────────
ALTER TABLE public.teacher_conversations
  ADD COLUMN portee text NOT NULL DEFAULT 'individuel',
  ADD COLUMN foyer_id uuid REFERENCES public.foyers(id) ON DELETE CASCADE,
  ALTER COLUMN parent_id DROP NOT NULL,
  -- Colonnes héritées (code élève, avatars emoji) : plus jamais nécessaires ni affichées.
  ALTER COLUMN student_code SET DEFAULT '',
  ALTER COLUMN parent_name SET DEFAULT '',
  ADD CONSTRAINT teacher_conversations_portee_check CHECK (portee = ANY (ARRAY['foyer'::text, 'individuel'::text])),
  ADD CONSTRAINT teacher_conversations_portee_coherente CHECK (
    (portee = 'foyer' AND foyer_id IS NOT NULL AND parent_id IS NULL)
    OR (portee = 'individuel' AND parent_id IS NOT NULL AND foyer_id IS NULL)
  );
CREATE UNIQUE INDEX teacher_conversations_fil_foyer_key
  ON public.teacher_conversations (teacher_id, student_id, foyer_id) WHERE portee = 'foyer';
CREATE UNIQUE INDEX teacher_conversations_fil_individuel_key
  ON public.teacher_conversations (teacher_id, student_id, parent_id) WHERE portee = 'individuel';

ALTER TABLE public.teacher_messages
  ADD COLUMN envoi_id uuid,
  ADD CONSTRAINT teacher_messages_envoi_enseignant CHECK (envoi_id IS NULL OR sender_role = 'teacher');
CREATE INDEX idx_teacher_messages_envoi ON public.teacher_messages USING btree (envoi_id) WHERE envoi_id IS NOT NULL;
CREATE INDEX idx_teacher_messages_conversation ON public.teacher_messages USING btree (conversation_id);

-- ─── Fonctions d'accès ──────────────────────────────────────────────────────

-- L'appelant est-il responsable de l'enfant AU SEIN de ce foyer ?
CREATE OR REPLACE FUNCTION public.est_du_foyer(p_foyer_id uuid, p_child_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.responsables r
    WHERE r.foyer_id = p_foyer_id AND r.child_id = p_child_id AND r.user_id = auth.uid()
  );
$function$;

-- p_teacher_id est-il le titulaire de la classe de l'enfant (année active) ?
CREATE OR REPLACE FUNCTION public.est_titulaire_enfant(p_child_id uuid, p_teacher_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.academic_years ay JOIN public.classes c ON c.id = ay.classe_id
    WHERE ay.student_id = p_child_id AND ay.statut = 'active' AND c.enseignant_id = p_teacher_id
  );
$function$;

-- L'appelant peut-il lire ce fil ? (enseignant du fil ; responsable du foyer ; titulaire du fil individuel)
CREATE OR REPLACE FUNCTION public.peut_lire_fil(p_conversation_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_conversations c
    WHERE c.id = p_conversation_id
      AND (
        c.teacher_id = auth.uid()
        OR (c.portee = 'individuel' AND c.parent_id = auth.uid() AND public.is_responsable(c.student_id))
        OR (c.portee = 'foyer' AND public.est_du_foyer(c.foyer_id, c.student_id))
      )
  );
$function$;

-- Rôle de l'appelant dans le fil : 'teacher', 'parent' ou NULL.
CREATE OR REPLACE FUNCTION public.role_dans_fil(p_conversation_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT CASE
    WHEN c.teacher_id = auth.uid() THEN 'teacher'
    WHEN public.peut_lire_fil(c.id) THEN 'parent'
  END
  FROM public.teacher_conversations c WHERE c.id = p_conversation_id;
$function$;

REVOKE EXECUTE ON FUNCTION public.est_du_foyer(uuid, uuid), public.est_titulaire_enfant(uuid, uuid),
  public.peut_lire_fil(uuid), public.role_dans_fil(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.est_du_foyer(uuid, uuid), public.est_titulaire_enfant(uuid, uuid),
  public.peut_lire_fil(uuid), public.role_dans_fil(uuid) TO authenticated;

-- ─── Verrous : un fil ne change jamais de personnes ; un message ne change que « lu » ──────────
CREATE OR REPLACE FUNCTION public.fils_verrou()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'teacher_conversations' THEN
    IF NEW.teacher_id <> OLD.teacher_id OR NEW.student_id <> OLD.student_id OR NEW.portee <> OLD.portee
       OR NEW.foyer_id IS DISTINCT FROM OLD.foyer_id OR NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
      RAISE EXCEPTION 'les participants d''un fil ne peuvent pas être modifiés' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.conversation_id <> OLD.conversation_id OR NEW.sender_id <> OLD.sender_id OR NEW.sender_role <> OLD.sender_role
       OR NEW.text <> OLD.text OR NEW.envoi_id IS DISTINCT FROM OLD.envoi_id OR NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'un message ne peut pas être modifié' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.fils_verrou() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fils_verrou BEFORE UPDATE ON public.teacher_conversations FOR EACH ROW EXECUTE FUNCTION public.fils_verrou();
CREATE TRIGGER fils_verrou BEFORE UPDATE ON public.teacher_messages FOR EACH ROW EXECUTE FUNCTION public.fils_verrou();

-- Dernier message du fil tenu par le serveur (aperçu de la liste), quel que soit l'auteur.
CREATE OR REPLACE FUNCTION public.fils_dernier_message()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.teacher_conversations
     SET last_message = left(NEW.text, 200), last_message_at = NEW.created_at
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.fils_dernier_message() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fils_dernier_message AFTER INSERT ON public.teacher_messages FOR EACH ROW EXECUTE FUNCTION public.fils_dernier_message();

-- ─── Politiques ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Parents see own conversations" ON public.teacher_conversations;
DROP POLICY IF EXISTS "Teachers see own conversations" ON public.teacher_conversations;
DROP POLICY IF EXISTS "Conversation participants see messages" ON public.teacher_messages;
DROP POLICY IF EXISTS "Conversation participants send messages" ON public.teacher_messages;
DROP POLICY IF EXISTS "Conversation participants update read status" ON public.teacher_messages;

-- Calculée sur les colonnes de la LIGNE (et non par peut_lire_fil(id), qui relit la table) : sinon un
-- INSERT … RETURNING échoue, la nouvelle ligne n'étant pas encore visible de la relecture.
CREATE POLICY fils_select ON public.teacher_conversations FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR (portee = 'individuel' AND parent_id = auth.uid() AND public.is_responsable(student_id))
    OR (portee = 'foyer' AND public.est_du_foyer(foyer_id, student_id))
  );

-- Création d'un fil : toujours avec le TITULAIRE de l'enfant.
--   Enseignant : fil famille d'un foyer de l'enfant, ou fil individuel d'un responsable de l'enfant.
--   Parent     : fil famille de SON foyer, ou SON fil individuel (« Seulement moi »).
CREATE POLICY fils_insert ON public.teacher_conversations FOR INSERT TO authenticated
  WITH CHECK (
    public.est_titulaire_enfant(student_id, teacher_id)
    AND (
      (teacher_id = auth.uid() AND (
        (portee = 'foyer' AND EXISTS (SELECT 1 FROM public.responsables r WHERE r.foyer_id = teacher_conversations.foyer_id AND r.child_id = teacher_conversations.student_id))
        OR (portee = 'individuel' AND EXISTS (SELECT 1 FROM public.responsables r WHERE r.user_id = teacher_conversations.parent_id AND r.child_id = teacher_conversations.student_id))
      ))
      OR (teacher_id <> auth.uid() AND (
        (portee = 'foyer' AND public.est_du_foyer(foyer_id, student_id))
        OR (portee = 'individuel' AND parent_id = auth.uid() AND public.is_responsable(student_id))
      ))
    )
  );

-- Épingler un fil : l'enseignant seulement (les participants sont verrouillés par fils_verrou).
CREATE POLICY fils_update ON public.teacher_conversations FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

CREATE POLICY fils_messages_select ON public.teacher_messages FOR SELECT TO authenticated
  USING (public.peut_lire_fil(conversation_id));

-- Écrire : en son nom, dans un fil lisible, avec SON rôle dans ce fil.
CREATE POLICY fils_messages_insert ON public.teacher_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND sender_role = public.role_dans_fil(conversation_id));

-- Marquer lu : participants du fil (seul « read » peut changer, fils_verrou).
CREATE POLICY fils_messages_update ON public.teacher_messages FOR UPDATE TO authenticated
  USING (public.peut_lire_fil(conversation_id)) WITH CHECK (public.peut_lire_fil(conversation_id));

-- Nom affichable de l'enseignant d'un fil lisible (le parent ne lit pas son profil). Le nom SEUL.
CREATE OR REPLACE FUNCTION public.fil_enseignant(p_conversation_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(NULLIF(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.family_name, '')), ''), 'Enseignant')
  FROM public.teacher_conversations c LEFT JOIN public.profiles p ON p.id = c.teacher_id
  WHERE c.id = p_conversation_id AND public.peut_lire_fil(c.id);
$function$;
REVOKE EXECUTE ON FUNCTION public.fil_enseignant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fil_enseignant(uuid) TO authenticated;

-- ─── « Tous les représentants » (défaut côté enseignant) ────────────────────
-- Le titulaire envoie UN message : une copie dans le fil famille de CHAQUE foyer de l'enfant
-- (créé si besoin), toutes liées par le même envoi_id. Renvoie l'envoi_id.
CREATE OR REPLACE FUNCTION public.envoyer_a_tous_les_representants(p_child_id uuid, p_text text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_envoi uuid := gen_random_uuid();
  v_foyer uuid;
  v_fil uuid;
BEGIN
  IF NOT public.est_titulaire_enfant(p_child_id, auth.uid()) THEN
    RAISE EXCEPTION 'seul le titulaire de la classe peut écrire aux représentants' USING ERRCODE = '42501';
  END IF;
  IF coalesce(btrim(p_text), '') = '' THEN
    RAISE EXCEPTION 'message vide' USING ERRCODE = '23514';
  END IF;
  FOR v_foyer IN SELECT DISTINCT r.foyer_id FROM public.responsables r WHERE r.child_id = p_child_id LOOP
    SELECT id INTO v_fil FROM public.teacher_conversations
     WHERE teacher_id = auth.uid() AND student_id = p_child_id AND portee = 'foyer' AND foyer_id = v_foyer;
    IF v_fil IS NULL THEN
      INSERT INTO public.teacher_conversations (teacher_id, student_id, portee, foyer_id)
      VALUES (auth.uid(), p_child_id, 'foyer', v_foyer) RETURNING id INTO v_fil;
    END IF;
    INSERT INTO public.teacher_messages (conversation_id, sender_role, sender_id, text, envoi_id)
    VALUES (v_fil, 'teacher', auth.uid(), p_text, v_envoi);
    v_fil := NULL;
  END LOOP;
  RETURN v_envoi;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.envoyer_a_tous_les_representants(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.envoyer_a_tous_les_representants(uuid, text) TO authenticated;

-- « Envoyé aussi à [prénom] » : pour un message de l'enseignant lisible par l'appelant, les PRÉNOMS
-- des responsables des AUTRES foyers qui ont reçu la même copie. Jamais leurs réponses, jamais d'id.
CREATE OR REPLACE FUNCTION public.envoye_aussi_a(p_message_id uuid)
 RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
  SELECT DISTINCT COALESCE(NULLIF(btrim(p.first_name), ''), 'l’autre responsable')
  FROM public.teacher_messages m
  JOIN public.teacher_conversations c1 ON c1.id = m.conversation_id
  JOIN public.teacher_messages autre ON autre.envoi_id = m.envoi_id AND autre.id <> m.id
  JOIN public.teacher_conversations c2 ON c2.id = autre.conversation_id AND c2.student_id = c1.student_id
  JOIN public.responsables r ON r.child_id = c2.student_id
       AND ((c2.portee = 'foyer' AND r.foyer_id = c2.foyer_id) OR (c2.portee = 'individuel' AND r.user_id = c2.parent_id))
  JOIN public.profiles p ON p.id = r.user_id
  WHERE m.id = p_message_id
    AND m.envoi_id IS NOT NULL
    AND public.peut_lire_fil(m.conversation_id)
    AND NOT public.peut_lire_fil(c2.id)
    AND r.user_id <> auth.uid();
$function$;
REVOKE EXECUTE ON FUNCTION public.envoye_aussi_a(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.envoye_aussi_a(uuid) TO authenticated;
