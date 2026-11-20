-- M3 · INVERSE — supprime la couleur de l'enfant (colonne ajoutée par M3 ; ⚠️ perte des couleurs choisies).
ALTER TABLE public.children DROP CONSTRAINT IF EXISTS children_color_hex_check;
ALTER TABLE public.children DROP COLUMN IF EXISTS color;
