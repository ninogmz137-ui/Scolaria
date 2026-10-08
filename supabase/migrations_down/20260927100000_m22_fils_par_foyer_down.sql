-- Inverse de M22 · fils par foyer. Revient au modèle « un parent ↔ un enseignant » (baseline).
-- ⚠ Les fils famille (portee = 'foyer', sans parent_id) ne rentrent pas dans l'ancien modèle : ils sont
-- supprimés avec leurs messages. Tables vides en production le 27 sept 2026.
DROP FUNCTION IF EXISTS public.envoye_aussi_a(uuid);
DROP FUNCTION IF EXISTS public.envoyer_a_tous_les_representants(uuid, text);
DROP FUNCTION IF EXISTS public.fil_enseignant(uuid);
DROP POLICY IF EXISTS fils_select ON public.teacher_conversations;
DROP POLICY IF EXISTS fils_insert ON public.teacher_conversations;
DROP POLICY IF EXISTS fils_update ON public.teacher_conversations;
DROP POLICY IF EXISTS fils_messages_select ON public.teacher_messages;
DROP POLICY IF EXISTS fils_messages_insert ON public.teacher_messages;
DROP POLICY IF EXISTS fils_messages_update ON public.teacher_messages;
DROP TRIGGER IF EXISTS fils_dernier_message ON public.teacher_messages;
DROP TRIGGER IF EXISTS fils_verrou ON public.teacher_messages;
DROP TRIGGER IF EXISTS fils_verrou ON public.teacher_conversations;
DROP FUNCTION IF EXISTS public.fils_dernier_message();
DROP FUNCTION IF EXISTS public.fils_verrou();
DROP FUNCTION IF EXISTS public.role_dans_fil(uuid);
DROP FUNCTION IF EXISTS public.peut_lire_fil(uuid);
DROP FUNCTION IF EXISTS public.est_titulaire_enfant(uuid, uuid);
DROP FUNCTION IF EXISTS public.est_du_foyer(uuid, uuid);
DELETE FROM public.teacher_conversations WHERE portee = 'foyer';
DROP INDEX IF EXISTS public.idx_teacher_messages_conversation;
DROP INDEX IF EXISTS public.idx_teacher_messages_envoi;
ALTER TABLE public.teacher_messages
  DROP CONSTRAINT IF EXISTS teacher_messages_envoi_enseignant,
  DROP COLUMN IF EXISTS envoi_id;
DROP INDEX IF EXISTS public.teacher_conversations_fil_individuel_key;
DROP INDEX IF EXISTS public.teacher_conversations_fil_foyer_key;
ALTER TABLE public.teacher_conversations
  DROP CONSTRAINT IF EXISTS teacher_conversations_portee_coherente,
  DROP CONSTRAINT IF EXISTS teacher_conversations_portee_check,
  DROP COLUMN IF EXISTS foyer_id,
  DROP COLUMN IF EXISTS portee,
  ALTER COLUMN parent_id SET NOT NULL,
  ALTER COLUMN student_code DROP DEFAULT,
  ALTER COLUMN parent_name DROP DEFAULT;
-- Politiques d'origine (baseline).
CREATE POLICY "Parents see own conversations" ON public.teacher_conversations AS PERMISSIVE FOR SELECT TO public
  USING ((parent_id = auth.uid()));
CREATE POLICY "Teachers see own conversations" ON public.teacher_conversations AS PERMISSIVE FOR ALL TO public
  USING ((teacher_id = auth.uid()));
CREATE POLICY "Conversation participants see messages" ON public.teacher_messages AS PERMISSIVE FOR SELECT TO public
  USING ((conversation_id IN ( SELECT teacher_conversations.id FROM teacher_conversations
  WHERE ((teacher_conversations.teacher_id = auth.uid()) OR (teacher_conversations.parent_id = auth.uid())))));
CREATE POLICY "Conversation participants send messages" ON public.teacher_messages AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((sender_id = auth.uid()) AND (conversation_id IN ( SELECT teacher_conversations.id FROM teacher_conversations
  WHERE ((teacher_conversations.teacher_id = auth.uid()) OR (teacher_conversations.parent_id = auth.uid()))))));
CREATE POLICY "Conversation participants update read status" ON public.teacher_messages AS PERMISSIVE FOR UPDATE TO public
  USING ((conversation_id IN ( SELECT teacher_conversations.id FROM teacher_conversations
  WHERE ((teacher_conversations.teacher_id = auth.uid()) OR (teacher_conversations.parent_id = auth.uid())))));
