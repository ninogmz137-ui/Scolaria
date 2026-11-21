-- Inverse de M38 (compteur enseignant « ont lu »). Aucune donnée touchée.
BEGIN;
DROP FUNCTION IF EXISTS public.lectures_mot(uuid);
COMMIT;
