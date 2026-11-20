-- M10 · INVERSE — supprime les ajouts au carnet. ⚠️ Perte des ajouts (les fichiers du Storage restent) — avec accord uniquement.
DROP TABLE IF EXISTS public.carnet_items;
DROP FUNCTION IF EXISTS public.carnet_items_controler();
