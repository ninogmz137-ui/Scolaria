-- ════════════════════════════════════════════════════════════════════════════
-- M13 · Fond de l'Accueil par enfant (Phase B, lot B2.6) — 2026-09-24
-- Inverse : supabase/migrations_down/20260924140000_m13_fond_accueil_down.sql
--
-- Décision du 24 sept : fond de l'Accueil stocké en base, PAR ENFANT, commun aux responsables.
-- Les images restent intégrées à l'app : la base ne stocke que l'identifiant du fond choisi.
-- NULL = couleur de l'enfant (children.color). Ajout non destructif : colonne nullable, aucune
-- donnée modifiée. Modifiable par un responsable de l'enfant (policy children_update existante,
-- is_responsable).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS fond text NULL;

ALTER TABLE public.children
  ADD CONSTRAINT children_fond_check CHECK (fond IS NULL OR fond ~ '^[a-z0-9-]{1,40}$');

COMMENT ON COLUMN public.children.fond IS
  'Identifiant du fond de l''Accueil choisi pour cet enfant (image intégrée à l''app) ; NULL = couleur de l''enfant.';
