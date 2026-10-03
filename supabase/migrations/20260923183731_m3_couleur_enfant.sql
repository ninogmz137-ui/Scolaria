-- ════════════════════════════════════════════════════════════════════════════
-- M3 · Couleur de l'enfant (Phase A, lot 2) — 2026-09-23
-- Inverse : supabase/migrations_down/<version>_m3_couleur_enfant_down.sql
--
-- Couleur personnelle (CLAUDE.md) : avatar + header de l'Accueil de SON carnet uniquement.
-- Défaut neutre : indigo #4338CA. Modifiable par un responsable de l'enfant uniquement :
-- c'est la policy children_update (is_responsable(id), M2) qui s'applique.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.children
  ADD COLUMN color text DEFAULT '#4338CA'::text NOT NULL;

ALTER TABLE public.children
  ADD CONSTRAINT children_color_hex_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
