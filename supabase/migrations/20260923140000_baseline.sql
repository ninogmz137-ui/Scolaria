-- ════════════════════════════════════════════════════════════════════════════
-- M0 · BASELINE — état réel de la base au 2026-09-23, avant M1.
-- NE PAS REJOUER : enregistrée comme « appliquée » dans l'historique distant (elle décrit l'existant).
-- Source : catalogues Postgres du projet (27 tables, 29 FK, 31 CHECK, 35 PK/UNIQUE, 30 index,
-- 69 policies, 3 fonctions, 9 triggers, 3 vues). Aucune donnée.
-- À partir d'ici, supabase/migrations/ est la SEULE référence du schéma ; les anciens fichiers
-- supabase/*.sql sont archivés dans docs/archives/sql/.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Extensions présentes ────────────────────────────────
-- pg_graphql 1.5.11, pg_stat_statements 1.11, pgcrypto 1.3, plpgsql 1.0, supabase_vault 0.3.1, uuid-ossp 1.1
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Tables (sans FK) ────────────────────────────────────

CREATE TABLE public.absences (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  student_id uuid NOT NULL,
  student_name text DEFAULT ''::text NOT NULL,
  student_avatar text DEFAULT '👦'::text NOT NULL,
  academic_year_id text DEFAULT ''::text NOT NULL,
  date_debut date DEFAULT CURRENT_DATE NOT NULL,
  date_fin date,
  demi_journee text DEFAULT 'journee'::text NOT NULL,
  motif text DEFAULT 'autre'::text NOT NULL,
  commentaire text,
  statut text DEFAULT 'signalée'::text NOT NULL,
  signalee_par uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT absences_pkey PRIMARY KEY (id),
  CONSTRAINT absences_demi_journee_check CHECK ((demi_journee = ANY (ARRAY['matin'::text, 'apres_midi'::text, 'journee'::text]))),
  CONSTRAINT absences_motif_check CHECK ((motif = ANY (ARRAY['maladie'::text, 'maladie_avec_certificat'::text, 'raison_familiale'::text, 'autre'::text]))),
  CONSTRAINT absences_statut_check CHECK ((statut = ANY (ARRAY['signalée'::text, 'prise_en_compte'::text])))
);

CREATE TABLE public.academic_years (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  student_id uuid NOT NULL,
  annee_scolaire text NOT NULL,
  niveau text NOT NULL,
  etablissement text,
  classe text,
  statut text DEFAULT 'active'::text NOT NULL,
  score_joie_moyen numeric(3,1),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT academic_years_pkey PRIMARY KEY (id),
  CONSTRAINT academic_years_statut_check CHECK ((statut = ANY (ARRAY['active'::text, 'archivée'::text, 'importée'::text])))
);

CREATE TABLE public.access_journal (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  family_id uuid NOT NULL,
  person_name text NOT NULL,
  person_avatar text DEFAULT '👤'::text NOT NULL,
  person_role text DEFAULT ''::text NOT NULL,
  action text NOT NULL,
  module text NOT NULL,
  module_icon text DEFAULT '📄'::text NOT NULL,
  child_name text,
  ip_address text,
  device text,
  color text DEFAULT '#6366F1'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT access_journal_pkey PRIMARY KEY (id)
);

CREATE TABLE public.agenda_events (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  child_id uuid NOT NULL,
  parent_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_type text DEFAULT 'cours'::text NOT NULL,
  subject text,
  color text DEFAULT '#22D3EE'::text NOT NULL,
  location text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  is_all_day boolean DEFAULT false NOT NULL,
  is_done boolean DEFAULT false NOT NULL,
  reminder_minutes integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT agenda_events_pkey PRIMARY KEY (id),
  CONSTRAINT agenda_events_event_type_check CHECK ((event_type = ANY (ARRAY['cours'::text, 'devoir'::text, 'examen'::text, 'activite'::text, 'reunion'::text, 'sortie'::text])))
);

CREATE TABLE public.appreciations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_name text NOT NULL,
  level text NOT NULL,
  competences text[] DEFAULT '{}'::text[] NOT NULL,
  text text NOT NULL,
  trimestre integer DEFAULT 1 NOT NULL,
  academic_year text DEFAULT '2025-2026'::text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT appreciations_pkey PRIMARY KEY (id),
  CONSTRAINT appreciations_level_check CHECK ((level = ANY (ARRAY['excellent'::text, 'bien'::text, 'assez_bien'::text, 'insuffisant'::text]))),
  CONSTRAINT appreciations_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'validated'::text, 'sent'::text]))),
  CONSTRAINT appreciations_trimestre_check CHECK (((trimestre >= 1) AND (trimestre <= 3)))
);

CREATE TABLE public.aria_conversations (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL,
  title text DEFAULT 'Nouvelle conversation'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT aria_conversations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.aria_messages (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  conversation_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  action_tags jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT aria_messages_pkey PRIMARY KEY (id),
  CONSTRAINT aria_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);

CREATE TABLE public.bulletins (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  child_id uuid NOT NULL,
  academic_year_id uuid NOT NULL,
  period text DEFAULT 'Trimestre 1'::text NOT NULL,
  content jsonb DEFAULT '[]'::jsonb NOT NULL,
  overall_avg numeric(4,2),
  teacher_appreciation text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT bulletins_child_id_academic_year_id_period_key UNIQUE (child_id, academic_year_id, period),
  CONSTRAINT bulletins_pkey PRIMARY KEY (id),
  CONSTRAINT bulletins_period_check CHECK ((period = ANY (ARRAY['Trimestre 1'::text, 'Trimestre 2'::text, 'Trimestre 3'::text, 'Annuel'::text])))
);

CREATE TABLE public.checkins (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  child_id uuid NOT NULL,
  mode text DEFAULT 'primaire'::text NOT NULL,
  emotion text,
  energy integer,
  stress integer,
  motivation integer,
  social integer,
  joy_score integer,
  message text,
  is_confidential boolean DEFAULT false NOT NULL,
  xp_earned integer DEFAULT 0 NOT NULL,
  date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT checkins_pkey PRIMARY KEY (id),
  CONSTRAINT checkins_energy_check CHECK (((energy >= 0) AND (energy <= 10))),
  CONSTRAINT checkins_joy_score_check CHECK (((joy_score >= 1) AND (joy_score <= 10))),
  CONSTRAINT checkins_mode_check CHECK ((mode = ANY (ARRAY['maternelle'::text, 'primaire'::text, 'lycee'::text]))),
  CONSTRAINT checkins_motivation_check CHECK (((motivation >= 0) AND (motivation <= 10))),
  CONSTRAINT checkins_social_check CHECK (((social >= 0) AND (social <= 10))),
  CONSTRAINT checkins_stress_check CHECK (((stress >= 0) AND (stress <= 10)))
);

CREATE TABLE public.children (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  parent_id uuid NOT NULL,
  scolaria_id text DEFAULT ''::text NOT NULL,
  first_name text NOT NULL,
  last_name text DEFAULT ''::text NOT NULL,
  avatar_emoji text DEFAULT '👦'::text NOT NULL,
  birth_date date,
  age integer,
  classe text DEFAULT ''::text NOT NULL,
  school text DEFAULT ''::text NOT NULL,
  super_power text,
  super_power_emoji text DEFAULT '⭐'::text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT uq_children_scolaria_id UNIQUE (scolaria_id),
  CONSTRAINT children_pkey PRIMARY KEY (id)
);

CREATE TABLE public.class_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  teacher_id uuid NOT NULL,
  classe text NOT NULL,
  title text NOT NULL,
  description text,
  emoji text DEFAULT '📅'::text NOT NULL,
  event_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT class_events_pkey PRIMARY KEY (id)
);

CREATE TABLE public.class_post_reactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT class_post_reactions_post_id_user_id_emoji_key UNIQUE (post_id, user_id, emoji),
  CONSTRAINT class_post_reactions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.class_post_seen (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  post_id uuid NOT NULL,
  parent_id uuid NOT NULL,
  seen_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT class_post_seen_post_id_parent_id_key UNIQUE (post_id, parent_id),
  CONSTRAINT class_post_seen_pkey PRIMARY KEY (id)
);

CREATE TABLE public.class_posts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  teacher_id uuid NOT NULL,
  classe text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  emoji text DEFAULT '📢'::text NOT NULL,
  pinned boolean DEFAULT false NOT NULL,
  photo_count integer DEFAULT 0,
  notify_parents boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT class_posts_pkey PRIMARY KEY (id),
  CONSTRAINT class_posts_type_check CHECK ((type = ANY (ARRAY['annonce'::text, 'photo'::text, 'evenement'::text, 'felicitation'::text])))
);

CREATE TABLE public.deletion_requests (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  family_id uuid NOT NULL,
  child_id uuid,
  scope text DEFAULT 'child'::text NOT NULL,
  confirm_email text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  confirm_deadline timestamp with time zone DEFAULT (now() + '48:00:00'::interval) NOT NULL,
  execute_deadline timestamp with time zone DEFAULT (now() + '72:00:00'::interval) NOT NULL,
  completed_at timestamp with time zone,
  CONSTRAINT deletion_requests_pkey PRIMARY KEY (id),
  CONSTRAINT deletion_requests_scope_check CHECK ((scope = ANY (ARRAY['child'::text, 'account'::text]))),
  CONSTRAINT deletion_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'executing'::text, 'completed'::text, 'cancelled'::text])))
);

CREATE TABLE public.export_history (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  family_id uuid NOT NULL,
  format text DEFAULT 'json'::text NOT NULL,
  modules jsonb DEFAULT '[]'::jsonb NOT NULL,
  total_size text DEFAULT '0 Ko'::text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  file_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT export_history_pkey PRIMARY KEY (id),
  CONSTRAINT export_history_format_check CHECK ((format = ANY (ARRAY['json'::text, 'pdf'::text, 'json+pdf'::text]))),
  CONSTRAINT export_history_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);

CREATE TABLE public.grades (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  child_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  value numeric(4,2) NOT NULL,
  max_value numeric(4,2) DEFAULT 20 NOT NULL,
  class_avg numeric(4,2),
  type text DEFAULT 'Contrôle'::text NOT NULL,
  comment text,
  date date DEFAULT CURRENT_DATE NOT NULL,
  trimester integer DEFAULT 1 NOT NULL,
  coefficient numeric(3,1) DEFAULT 1 NOT NULL,
  appreciation text,
  source text DEFAULT 'manual'::text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT grades_pkey PRIMARY KEY (id),
  CONSTRAINT grades_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'ocr'::text, 'import'::text]))),
  CONSTRAINT grades_trimester_check CHECK (((trimester >= 1) AND (trimester <= 3)))
);

CREATE TABLE public.messages (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  subject text DEFAULT ''::text NOT NULL,
  body text NOT NULL,
  thread_id uuid,
  date timestamp with time zone DEFAULT now() NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  read_at timestamp with time zone,
  child_id uuid,
  type text DEFAULT 'message'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_type_check CHECK ((type = ANY (ARRAY['message'::text, 'absence_notification'::text, 'info_classe'::text])))
);

CREATE TABLE public.mots_liaison (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  teacher_id uuid NOT NULL,
  classe text NOT NULL,
  type text NOT NULL,
  titre text NOT NULL,
  contenu text NOT NULL,
  date_envoi date DEFAULT CURRENT_DATE NOT NULL,
  date_limite date,
  statut text DEFAULT 'brouillon'::text NOT NULL,
  requires_signature boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT mots_liaison_pkey PRIMARY KEY (id),
  CONSTRAINT mots_liaison_statut_check CHECK ((statut = ANY (ARRAY['brouillon'::text, 'envoyé'::text, 'clos'::text]))),
  CONSTRAINT mots_liaison_type_check CHECK ((type = ANY (ARRAY['info'::text, 'autorisation'::text, 'bon_de_sortie'::text])))
);

CREATE TABLE public.person_permissions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  family_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  avatar text DEFAULT '👤'::text NOT NULL,
  role text DEFAULT 'famille_proche'::text NOT NULL,
  access_level text DEFAULT 'minimal'::text NOT NULL,
  modules jsonb DEFAULT '{"aria": false, "notes": false, "agenda": false, "photos": false, "profil": false, "ressenti": false}'::jsonb NOT NULL,
  last_access timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT person_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT person_permissions_access_level_check CHECK ((access_level = ANY (ARRAY['tuteur'::text, 'famille_proche'::text, 'accompagnant'::text, 'minimal'::text])))
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  family_name text DEFAULT ''::text NOT NULL,
  first_name text DEFAULT ''::text NOT NULL,
  phone text,
  role text DEFAULT 'parent'::text NOT NULL,
  plan text DEFAULT 'free'::text NOT NULL,
  language text DEFAULT 'fr'::text NOT NULL,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_plan_check CHECK ((plan = ANY (ARRAY['free'::text, 'premium'::text]))),
  CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['parent'::text, 'enseignant'::text, 'eleve'::text, 'enfant'::text])))
);

CREATE TABLE public.read_receipts (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  mot_id uuid NOT NULL,
  parent_id uuid NOT NULL,
  read_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT read_receipts_mot_id_parent_id_key UNIQUE (mot_id, parent_id),
  CONSTRAINT read_receipts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.signatures (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  mot_id uuid NOT NULL,
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_name text DEFAULT ''::text NOT NULL,
  parent_name text DEFAULT ''::text NOT NULL,
  signed_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT signatures_mot_id_student_id_key UNIQUE (mot_id, student_id),
  CONSTRAINT signatures_pkey PRIMARY KEY (id)
);

CREATE TABLE public.subjects (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  child_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#22D3EE'::text NOT NULL,
  classe text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT subjects_child_id_name_key UNIQUE (child_id, name),
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);

CREATE TABLE public.teacher_conversations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  teacher_id uuid NOT NULL,
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_code text NOT NULL,
  student_avatar text DEFAULT '👦'::text NOT NULL,
  parent_name text NOT NULL,
  parent_avatar text DEFAULT '👨‍👩‍👧'::text NOT NULL,
  pinned boolean DEFAULT false NOT NULL,
  last_message text,
  last_message_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT teacher_conversations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.teacher_messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  conversation_id uuid NOT NULL,
  sender_role text NOT NULL,
  sender_id uuid NOT NULL,
  text text NOT NULL,
  read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT teacher_messages_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_messages_sender_role_check CHECK ((sender_role = ANY (ARRAY['teacher'::text, 'parent'::text])))
);

CREATE TABLE public.transfer_codes (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  family_id uuid NOT NULL,
  child_id uuid NOT NULL,
  child_name text DEFAULT ''::text NOT NULL,
  child_avatar text DEFAULT '👦'::text NOT NULL,
  code text NOT NULL,
  from_school text DEFAULT ''::text NOT NULL,
  to_school text,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '90 days'::interval) NOT NULL,
  used_by text,
  used_at timestamp with time zone,
  CONSTRAINT transfer_codes_code_key UNIQUE (code),
  CONSTRAINT transfer_codes_pkey PRIMARY KEY (id),
  CONSTRAINT transfer_codes_status_check CHECK ((status = ANY (ARRAY['active'::text, 'used'::text, 'expired'::text, 'revoked'::text])))
);

-- ─── Clés étrangères (après toutes les tables) ───────────

ALTER TABLE public.absences ADD CONSTRAINT absences_signalee_par_fkey FOREIGN KEY (signalee_par) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.absences ADD CONSTRAINT absences_student_id_fkey FOREIGN KEY (student_id) REFERENCES children(id) ON DELETE CASCADE;
ALTER TABLE public.academic_years ADD CONSTRAINT academic_years_student_id_fkey FOREIGN KEY (student_id) REFERENCES children(id) ON DELETE CASCADE;
ALTER TABLE public.agenda_events ADD CONSTRAINT agenda_events_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;
ALTER TABLE public.agenda_events ADD CONSTRAINT agenda_events_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.aria_conversations ADD CONSTRAINT aria_conversations_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;
ALTER TABLE public.aria_conversations ADD CONSTRAINT aria_conversations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.aria_messages ADD CONSTRAINT aria_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES aria_conversations(id) ON DELETE CASCADE;
ALTER TABLE public.bulletins ADD CONSTRAINT bulletins_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;
ALTER TABLE public.bulletins ADD CONSTRAINT bulletins_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;
ALTER TABLE public.checkins ADD CONSTRAINT checkins_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;
ALTER TABLE public.children ADD CONSTRAINT children_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.class_post_reactions ADD CONSTRAINT class_post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES class_posts(id) ON DELETE CASCADE;
ALTER TABLE public.class_post_seen ADD CONSTRAINT class_post_seen_post_id_fkey FOREIGN KEY (post_id) REFERENCES class_posts(id) ON DELETE CASCADE;
ALTER TABLE public.grades ADD CONSTRAINT grades_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;
ALTER TABLE public.grades ADD CONSTRAINT grades_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT fk_messages_thread FOREIGN KEY (thread_id) REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD CONSTRAINT messages_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.mots_liaison ADD CONSTRAINT mots_liaison_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.read_receipts ADD CONSTRAINT read_receipts_mot_id_fkey FOREIGN KEY (mot_id) REFERENCES mots_liaison(id) ON DELETE CASCADE;
ALTER TABLE public.read_receipts ADD CONSTRAINT read_receipts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.signatures ADD CONSTRAINT signatures_mot_id_fkey FOREIGN KEY (mot_id) REFERENCES mots_liaison(id) ON DELETE CASCADE;
ALTER TABLE public.signatures ADD CONSTRAINT signatures_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.signatures ADD CONSTRAINT signatures_student_id_fkey FOREIGN KEY (student_id) REFERENCES children(id) ON DELETE CASCADE;
ALTER TABLE public.subjects ADD CONSTRAINT subjects_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;
ALTER TABLE public.teacher_messages ADD CONSTRAINT teacher_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES teacher_conversations(id) ON DELETE CASCADE;

-- ─── Index (hors PK / UNIQUE) ────────────────────────────

CREATE INDEX idx_absences_date ON public.absences USING btree (date_debut DESC);
CREATE INDEX idx_absences_student ON public.absences USING btree (student_id);
CREATE INDEX idx_academic_years_student ON public.academic_years USING btree (student_id);
CREATE INDEX idx_access_journal_date ON public.access_journal USING btree (created_at DESC);
CREATE INDEX idx_access_journal_family ON public.access_journal USING btree (family_id);
CREATE INDEX idx_agenda_child ON public.agenda_events USING btree (child_id);
CREATE INDEX idx_agenda_date ON public.agenda_events USING btree (start_time);
CREATE INDEX idx_aria_conv_parent ON public.aria_conversations USING btree (parent_id);
CREATE INDEX idx_aria_messages_conv ON public.aria_messages USING btree (conversation_id);
CREATE INDEX idx_bulletins_academic_year ON public.bulletins USING btree (academic_year_id);
CREATE INDEX idx_bulletins_child ON public.bulletins USING btree (child_id);
CREATE INDEX idx_checkins_child ON public.checkins USING btree (child_id);
CREATE INDEX idx_checkins_date ON public.checkins USING btree (date DESC);
CREATE INDEX idx_children_classe ON public.children USING btree (classe);
CREATE INDEX idx_children_parent ON public.children USING btree (parent_id);
CREATE INDEX idx_deletion_family ON public.deletion_requests USING btree (family_id);
CREATE INDEX idx_export_family ON public.export_history USING btree (family_id);
CREATE INDEX idx_grades_child ON public.grades USING btree (child_id);
CREATE INDEX idx_grades_date ON public.grades USING btree (date DESC);
CREATE INDEX idx_grades_subject ON public.grades USING btree (subject_id);
CREATE INDEX idx_messages_date ON public.messages USING btree (date DESC);
CREATE INDEX idx_messages_receiver ON public.messages USING btree (receiver_id);
CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);
CREATE INDEX idx_mots_liaison_classe ON public.mots_liaison USING btree (classe);
CREATE INDEX idx_mots_liaison_teacher ON public.mots_liaison USING btree (teacher_id);
CREATE INDEX idx_person_perms_family ON public.person_permissions USING btree (family_id);
CREATE INDEX idx_signatures_mot ON public.signatures USING btree (mot_id);
CREATE INDEX idx_subjects_child ON public.subjects USING btree (child_id);
CREATE INDEX idx_transfer_code ON public.transfer_codes USING btree (code);
CREATE INDEX idx_transfer_family ON public.transfer_codes USING btree (family_id);

-- ─── Fonctions ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_scolaria_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.scolaria_id IS NULL OR NEW.scolaria_id = '' THEN
    NEW.scolaria_id := 'SCA-' || TO_CHAR(NOW(), 'YYYY') || '-FR-' ||
      LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, family_name, first_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'family_name',
      SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
    ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', '')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ─── Triggers ────────────────────────────────────────────

CREATE TRIGGER upd_academic_years_updated_at BEFORE UPDATE ON public.academic_years FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_agenda_updated_at BEFORE UPDATE ON public.agenda_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_aria_conv_updated_at BEFORE UPDATE ON public.aria_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_bulletins_updated_at BEFORE UPDATE ON public.bulletins FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_scolaria_id BEFORE INSERT ON public.children FOR EACH ROW EXECUTE FUNCTION generate_scolaria_id();
CREATE TRIGGER upd_children_updated_at BEFORE UPDATE ON public.children FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_person_permissions_updated_at BEFORE UPDATE ON public.person_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER upd_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Vues ────────────────────────────────────────────────

CREATE VIEW public.child_overview AS
 SELECT c.id AS child_id,
    c.first_name,
    c.classe,
    c.school,
    round(avg(g.value), 1) AS overall_avg,
    count(DISTINCT s.id) AS subject_count,
    count(g.id) AS total_grades,
    ( SELECT round(avg(ck.joy_score), 1) AS round
           FROM checkins ck
          WHERE ((ck.child_id = c.id) AND (ck.date >= (CURRENT_DATE - '7 days'::interval)))) AS weekly_joy_avg
   FROM ((children c
     LEFT JOIN subjects s ON ((s.child_id = c.id)))
     LEFT JOIN grades g ON ((g.child_id = c.id)))
  GROUP BY c.id, c.first_name, c.classe, c.school;

CREATE VIEW public.mots_liaison_enriched AS
 SELECT m.id,
    m.teacher_id,
    m.classe,
    m.type,
    m.titre,
    m.contenu,
    m.date_envoi,
    m.date_limite,
    m.statut,
    m.requires_signature,
    m.created_at,
    COALESCE(sig.cnt, 0) AS signatures_count,
    COALESCE(stu.cnt, 0) AS total_students
   FROM ((mots_liaison m
     LEFT JOIN ( SELECT signatures.mot_id,
            (count(*))::integer AS cnt
           FROM signatures
          GROUP BY signatures.mot_id) sig ON ((sig.mot_id = m.id)))
     LEFT JOIN ( SELECT children.classe,
            (count(*))::integer AS cnt
           FROM children
          GROUP BY children.classe) stu ON ((stu.classe = m.classe)));

CREATE VIEW public.subject_averages AS
 SELECT s.id AS subject_id,
    s.child_id,
    s.name AS subject_name,
    s.color,
    round(avg(g.value), 1) AS average,
    round(avg(g.class_avg), 1) AS class_avg,
    count(g.id) AS grade_count,
    max(g.date) AS last_grade_date
   FROM (subjects s
     LEFT JOIN grades g ON ((g.subject_id = s.id)))
  GROUP BY s.id, s.child_id, s.name, s.color;

-- ─── RLS ─────────────────────────────────────────────────

ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appreciations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aria_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_post_seen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mots_liaison ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_codes ENABLE ROW LEVEL SECURITY;

-- ─── Policies (69) ───────────────────────────────────────

CREATE POLICY absences_parent_insert ON public.absences AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((signalee_par = auth.uid()) AND (student_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid())))));
CREATE POLICY absences_parent_select ON public.absences AS PERMISSIVE FOR SELECT TO public
  USING ((student_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));
CREATE POLICY absences_parent_update ON public.absences AS PERMISSIVE FOR UPDATE TO public
  USING ((student_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));
CREATE POLICY absences_teacher_select ON public.absences AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text)))));
CREATE POLICY absences_teacher_update ON public.absences AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text)))));
CREATE POLICY academic_years_delete ON public.academic_years AS PERMISSIVE FOR DELETE TO public
  USING ((student_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));
CREATE POLICY academic_years_insert ON public.academic_years AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((student_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));
CREATE POLICY academic_years_select ON public.academic_years AS PERMISSIVE FOR SELECT TO public
  USING ((student_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));
CREATE POLICY academic_years_update ON public.academic_years AS PERMISSIVE FOR UPDATE TO public
  USING ((student_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));
CREATE POLICY journal_owner_insert ON public.access_journal AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((family_id = auth.uid()));
CREATE POLICY journal_owner_select ON public.access_journal AS PERMISSIVE FOR SELECT TO public
  USING ((family_id = auth.uid()));
CREATE POLICY agenda_delete ON public.agenda_events AS PERMISSIVE FOR DELETE TO public
  USING ((auth.uid() = parent_id));
CREATE POLICY agenda_insert ON public.agenda_events AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = parent_id));
CREATE POLICY agenda_select ON public.agenda_events AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = parent_id));
CREATE POLICY agenda_update ON public.agenda_events AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = parent_id));
CREATE POLICY "Teachers manage own appreciations" ON public.appreciations AS PERMISSIVE FOR ALL TO public
  USING ((teacher_id = auth.uid()));
CREATE POLICY aria_conv_insert ON public.aria_conversations AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = parent_id));
CREATE POLICY aria_conv_select ON public.aria_conversations AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = parent_id));
CREATE POLICY aria_msg_insert ON public.aria_messages AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((conversation_id IN ( SELECT aria_conversations.id
   FROM aria_conversations
  WHERE (aria_conversations.parent_id = auth.uid()))));
CREATE POLICY aria_msg_select ON public.aria_messages AS PERMISSIVE FOR SELECT TO public
  USING ((conversation_id IN ( SELECT aria_conversations.id
   FROM aria_conversations
  WHERE (aria_conversations.parent_id = auth.uid()))));
CREATE POLICY bulletins_delete ON public.bulletins AS PERMISSIVE FOR DELETE TO public
  USING ((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));
CREATE POLICY bulletins_insert ON public.bulletins AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));
CREATE POLICY bulletins_select ON public.bulletins AS PERMISSIVE FOR SELECT TO public
  USING ((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));
CREATE POLICY bulletins_update ON public.bulletins AS PERMISSIVE FOR UPDATE TO public
  USING ((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));
CREATE POLICY checkins_insert ON public.checkins AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));
CREATE POLICY checkins_select ON public.checkins AS PERMISSIVE FOR SELECT TO public
  USING ((child_id IN ( SELECT checkins.child_id
   FROM (children c
     JOIN profiles p ON ((c.parent_id = auth.uid())))
UNION ALL
 SELECT checkins.child_id
   FROM children
  WHERE (auth.uid() IN ( SELECT p.id
           FROM profiles p
          WHERE (p.role = 'enseignant'::text))))));
CREATE POLICY children_delete ON public.children AS PERMISSIVE FOR DELETE TO public
  USING ((auth.uid() = parent_id));
CREATE POLICY children_insert ON public.children AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = parent_id));
CREATE POLICY children_select ON public.children AS PERMISSIVE FOR SELECT TO public
  USING (((auth.uid() = parent_id) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text))))));
CREATE POLICY children_update ON public.children AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = parent_id));
CREATE POLICY "Parents read events" ON public.class_events AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Teachers manage own events" ON public.class_events AS PERMISSIVE FOR ALL TO public
  USING ((teacher_id = auth.uid()));
CREATE POLICY "Anyone can react" ON public.class_post_reactions AS PERMISSIVE FOR ALL TO public
  USING ((user_id = auth.uid()));
CREATE POLICY "Anyone can see reactions" ON public.class_post_reactions AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Parents mark seen" ON public.class_post_seen AS PERMISSIVE FOR ALL TO public
  USING ((parent_id = auth.uid()));
CREATE POLICY "Teachers see who viewed" ON public.class_post_seen AS PERMISSIVE FOR SELECT TO public
  USING ((post_id IN ( SELECT class_posts.id
   FROM class_posts
  WHERE (class_posts.teacher_id = auth.uid()))));
CREATE POLICY "Parents read class posts" ON public.class_posts AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Teachers manage own class posts" ON public.class_posts AS PERMISSIVE FOR ALL TO public
  USING ((teacher_id = auth.uid()));
CREATE POLICY deletion_owner ON public.deletion_requests AS PERMISSIVE FOR ALL TO public
  USING ((family_id = auth.uid()))
  WITH CHECK ((family_id = auth.uid()));
CREATE POLICY export_owner ON public.export_history AS PERMISSIVE FOR ALL TO public
  USING ((family_id = auth.uid()))
  WITH CHECK ((family_id = auth.uid()));
CREATE POLICY grades_delete ON public.grades AS PERMISSIVE FOR DELETE TO public
  USING (((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text))))));
CREATE POLICY grades_insert ON public.grades AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text))))));
CREATE POLICY grades_select ON public.grades AS PERMISSIVE FOR SELECT TO public
  USING (((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text))))));
CREATE POLICY grades_update ON public.grades AS PERMISSIVE FOR UPDATE TO public
  USING (((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text))))));
CREATE POLICY messages_insert ON public.messages AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = sender_id));
CREATE POLICY messages_select ON public.messages AS PERMISSIVE FOR SELECT TO public
  USING (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));
CREATE POLICY messages_update ON public.messages AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = receiver_id));
CREATE POLICY mots_parent_select ON public.mots_liaison AS PERMISSIVE FOR SELECT TO public
  USING ((classe IN ( SELECT c.classe
   FROM children c
  WHERE (c.parent_id = auth.uid()))));
CREATE POLICY mots_teacher_delete ON public.mots_liaison AS PERMISSIVE FOR DELETE TO public
  USING ((teacher_id = auth.uid()));
CREATE POLICY mots_teacher_insert ON public.mots_liaison AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((teacher_id = auth.uid()));
CREATE POLICY mots_teacher_select ON public.mots_liaison AS PERMISSIVE FOR SELECT TO public
  USING ((teacher_id = auth.uid()));
CREATE POLICY mots_teacher_update ON public.mots_liaison AS PERMISSIVE FOR UPDATE TO public
  USING ((teacher_id = auth.uid()));
CREATE POLICY perms_owner ON public.person_permissions AS PERMISSIVE FOR ALL TO public
  USING ((family_id = auth.uid()))
  WITH CHECK ((family_id = auth.uid()));
CREATE POLICY profiles_insert ON public.profiles AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = id));
CREATE POLICY profiles_select ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = id));
CREATE POLICY profiles_update ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = id));
CREATE POLICY rr_owner ON public.read_receipts AS PERMISSIVE FOR ALL TO public
  USING ((parent_id = auth.uid()))
  WITH CHECK ((parent_id = auth.uid()));
CREATE POLICY sig_parent_insert ON public.signatures AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((parent_id = auth.uid()) AND (student_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid())))));
CREATE POLICY sig_parent_select ON public.signatures AS PERMISSIVE FOR SELECT TO public
  USING ((parent_id = auth.uid()));
CREATE POLICY sig_teacher_select ON public.signatures AS PERMISSIVE FOR SELECT TO public
  USING ((mot_id IN ( SELECT mots_liaison.id
   FROM mots_liaison
  WHERE (mots_liaison.teacher_id = auth.uid()))));
CREATE POLICY subjects_insert ON public.subjects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));
CREATE POLICY subjects_select ON public.subjects AS PERMISSIVE FOR SELECT TO public
  USING (((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'enseignant'::text))))));
CREATE POLICY subjects_update ON public.subjects AS PERMISSIVE FOR UPDATE TO public
  USING ((child_id IN ( SELECT children.id
   FROM children
  WHERE (children.parent_id = auth.uid()))));
CREATE POLICY "Parents see own conversations" ON public.teacher_conversations AS PERMISSIVE FOR SELECT TO public
  USING ((parent_id = auth.uid()));
CREATE POLICY "Teachers see own conversations" ON public.teacher_conversations AS PERMISSIVE FOR ALL TO public
  USING ((teacher_id = auth.uid()));
CREATE POLICY "Conversation participants see messages" ON public.teacher_messages AS PERMISSIVE FOR SELECT TO public
  USING ((conversation_id IN ( SELECT teacher_conversations.id
   FROM teacher_conversations
  WHERE ((teacher_conversations.teacher_id = auth.uid()) OR (teacher_conversations.parent_id = auth.uid())))));
CREATE POLICY "Conversation participants send messages" ON public.teacher_messages AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((sender_id = auth.uid()) AND (conversation_id IN ( SELECT teacher_conversations.id
   FROM teacher_conversations
  WHERE ((teacher_conversations.teacher_id = auth.uid()) OR (teacher_conversations.parent_id = auth.uid()))))));
CREATE POLICY "Conversation participants update read status" ON public.teacher_messages AS PERMISSIVE FOR UPDATE TO public
  USING ((conversation_id IN ( SELECT teacher_conversations.id
   FROM teacher_conversations
  WHERE ((teacher_conversations.teacher_id = auth.uid()) OR (teacher_conversations.parent_id = auth.uid())))));
CREATE POLICY transfer_owner ON public.transfer_codes AS PERMISSIVE FOR ALL TO public
  USING ((family_id = auth.uid()))
  WITH CHECK ((family_id = auth.uid()));
