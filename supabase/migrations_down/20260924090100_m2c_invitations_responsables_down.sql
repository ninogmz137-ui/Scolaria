-- M2c · INVERSE — supprime les invitations (⚠️ perte des invitations en cours ; les responsables déjà ajoutés restent).
DROP FUNCTION IF EXISTS public.respond_invitation(uuid, boolean);
DROP TABLE IF EXISTS public.invitations_responsable;
