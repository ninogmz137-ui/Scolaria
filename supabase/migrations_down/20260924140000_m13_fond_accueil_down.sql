-- Inverse de M13 · fond de l'Accueil par enfant
ALTER TABLE public.children DROP CONSTRAINT IF EXISTS children_fond_check;
ALTER TABLE public.children DROP COLUMN IF EXISTS fond;
