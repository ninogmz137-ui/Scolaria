-- Tests M36 · photo de l'enfant PAR ANNÉE (academic_years.photo_path, chemins <enfant>/<année>.jpg, variante A du plan).
-- Base LOCALE, transaction annulée, comptes fictifs @test.local.
--   docker exec -i supabase_db_Scolaria psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/m36_photo_par_annee.sql
-- A et B : responsables de Lucas (même foyer, 3 années + l'ancien avatar.jpg de M35) ; C : autre foyer (Zoé, 1 année) ;
-- T1 : enseignant de la classe rattachée à l'année ACTIVE de Lucas ; T2 : enseignant d'une classe rattachée à une année ARCHIVÉE.
-- Les dépôts sont simulés par des INSERT dans storage.objects sous le rôle authenticated (mêmes politiques que l'API Storage) ;
-- les objets, les suppressions et le nettoyage sont prouvés de bout en bout par scripts/test-photo-annee-local.mts.

\set ON_ERROR_STOP on
\set QUIET on
BEGIN;

-- Aides : une requête exécutée sous un rôle (compte connecté ou anonyme) ; `compte` renvoie un nombre de lignes, `essaie` un résultat.
CREATE FUNCTION pg_temp.compte(p_uid text, p_from text) RETURNS bigint LANGUAGE plpgsql AS $f$
DECLARE n bigint;
BEGIN
  IF p_uid IS NULL THEN PERFORM set_config('request.jwt.claims', '', true); SET LOCAL ROLE anon;
  ELSE PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true); SET LOCAL ROLE authenticated; END IF;
  EXECUTE 'SELECT count(*) FROM (' || p_from || ') q' INTO n;
  RESET ROLE;
  RETURN n;
END $f$;
CREATE FUNCTION pg_temp.essaie(p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE n bigint;
BEGIN
  IF p_uid IS NULL THEN PERFORM set_config('request.jwt.claims', '', true); SET LOCAL ROLE anon;
  ELSE PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true); SET LOCAL ROLE authenticated; END IF;
  BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RESET ROLE;
    RETURN 'ok:' || n;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN 'refus:' || SQLSTATE;
  END;
END $f$;
CREATE FUNCTION pg_temp.attendu(p_nom text, p_obtenu text, p_voulu text) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  IF p_obtenu IS DISTINCT FROM p_voulu THEN RAISE EXCEPTION 'ÉCHEC % : obtenu %, attendu %', p_nom, p_obtenu, p_voulu; END IF;
  RAISE NOTICE 'OK %', p_nom;
END $f$;

INSERT INTO auth.users (id, email, aud, role, raw_user_meta_data) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@test.local', 'authenticated', 'authenticated', '{}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@test.local', 'authenticated', 'authenticated', '{}'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@test.local', 'authenticated', 'authenticated', '{}'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 't1@test.local', 'authenticated', 'authenticated', '{}'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 't2@test.local', 'authenticated', 'authenticated', '{}');

SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS lucas FROM public.create_child('Lucas', 'Test', NULL, 10, 'CM2', 'École test') \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true) \gset
SET LOCAL ROLE authenticated;
SELECT id AS zoe FROM public.create_child('Zoé', 'Autre', NULL, 9, 'CM1', 'École test') \gset
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true) \gset

INSERT INTO public.responsables (foyer_id, user_id, child_id, lien)
  SELECT foyer_id, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', child_id, 'parent' FROM public.responsables WHERE child_id = :'lucas';
SELECT id AS ay_lucas, annee_scolaire AS millesime FROM public.academic_years WHERE student_id = :'lucas' \gset
SELECT id AS ay_zoe FROM public.academic_years WHERE student_id = :'zoe' \gset
-- Deux années précédentes (archivées) + une année vide pour les essais de dépôt (créées par le serveur : postgres).
INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, etablissement, statut)
  VALUES (:'lucas', (substr(:'millesime',1,4)::int - 1) || '-' || substr(:'millesime',1,4), 'CM1', 'École test', 'archivée') RETURNING id AS ay_n1 \gset
INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, etablissement, statut)
  VALUES (:'lucas', (substr(:'millesime',1,4)::int - 2) || '-' || (substr(:'millesime',1,4)::int - 1), 'CE2', 'École test', 'archivée') RETURNING id AS ay_n2 \gset
INSERT INTO public.academic_years (student_id, annee_scolaire, niveau, etablissement, statut)
  VALUES (:'lucas', (substr(:'millesime',1,4)::int - 3) || '-' || (substr(:'millesime',1,4)::int - 2), 'CE1', 'École test', 'archivée') RETURNING id AS ay_n3 \gset

-- Classes : T1 titulaire de la classe de l'année ACTIVE ; T2 titulaire d'une classe rattachée à une année ARCHIVÉE (N−1).
INSERT INTO public.ecoles (nom) VALUES ('École test') RETURNING id AS ecole \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
  VALUES (:'ecole', :'millesime', 'CM2', 'CM2 B', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') RETURNING id AS classe1 \gset
INSERT INTO public.classes (ecole_id, annee_scolaire, niveau, nom, enseignant_id)
  VALUES (:'ecole', (SELECT annee_scolaire FROM public.academic_years WHERE id = :'ay_n1'), 'CM1', 'CM1 A', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee') RETURNING id AS classe2 \gset
UPDATE public.academic_years SET classe_id = :'classe1' WHERE id = :'ay_lucas';
UPDATE public.academic_years SET classe_id = :'classe2' WHERE id = :'ay_n1';

-- Objets et références (créés par le serveur) : 3 années de Lucas + l'ancien avatar.jpg (M35) ; 1 année de Zoé.
INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
  ('child-photos', :'lucas' || '/' || :'ay_lucas' || '.jpg', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('child-photos', :'lucas' || '/' || :'ay_n1' || '.jpg', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('child-photos', :'lucas' || '/' || :'ay_n2' || '.jpg', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('child-photos', :'lucas' || '/avatar.jpg', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('child-photos', :'zoe' || '/' || :'ay_zoe' || '.jpg', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
UPDATE public.academic_years SET photo_path = student_id::text || '/' || id::text || '.jpg' WHERE id IN (:'ay_lucas', :'ay_n1', :'ay_n2', :'ay_zoe');
SELECT set_config('test.lucas', :'lucas', true), set_config('test.zoe', :'zoe', true), set_config('test.ay_lucas', :'ay_lucas', true),
       set_config('test.ay_n1', :'ay_n1', true), set_config('test.ay_n2', :'ay_n2', true), set_config('test.ay_n3', :'ay_n3', true),
       set_config('test.ay_zoe', :'ay_zoe', true), set_config('test.millesime', :'millesime', true) \gset

-- ─── T0 · bucket inchangé et colonne ─────────────────────────────────────────
DO $$
DECLARE b storage.buckets%ROWTYPE;
BEGIN
  SELECT * INTO b FROM storage.buckets WHERE id = 'child-photos';
  IF b.public OR b.allowed_mime_types IS DISTINCT FROM ARRAY['image/jpeg'] OR b.file_size_limit <> 1048576 THEN RAISE EXCEPTION 'ÉCHEC T0 bucket modifié'; END IF;
  RAISE NOTICE 'OK T0 bucket toujours privé, JPEG seulement, 1 Mo';
END $$;

-- ─── T1 · contrainte de chemin, verrous d'année (M17/M18/M19) et écriture ────────────────────
DO $$
DECLARE
  a text := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  l text := current_setting('test.lucas'); y text := current_setting('test.ay_lucas'); n1 text := current_setting('test.ay_n1');
  z text := current_setting('test.zoe'); yz text := current_setting('test.ay_zoe');
BEGIN
  PERFORM pg_temp.attendu('T1a A efface puis repose la photo de l''année ACTIVE (rattachée à une classe : verrous M18/M19 sans effet)',
    pg_temp.essaie(a, format('UPDATE public.academic_years SET photo_path = NULL WHERE id = %L', y)) || '/' ||
    pg_temp.essaie(a, format('UPDATE public.academic_years SET photo_path = %L WHERE id = %L', l || '/' || y || '.jpg', y)), 'ok:1/ok:1');
  PERFORM pg_temp.attendu('T1b A remplace / supprime la photo d''une année ARCHIVÉE rattachée à une classe (M17 : statut inchangé)',
    pg_temp.essaie(a, format('UPDATE public.academic_years SET photo_path = NULL WHERE id = %L', n1)) || '/' ||
    pg_temp.essaie(a, format('UPDATE public.academic_years SET photo_path = %L WHERE id = %L', l || '/' || n1 || '.jpg', n1)), 'ok:1/ok:1');
  PERFORM pg_temp.attendu('T1c chemin d''une AUTRE année du même enfant refusé (contrainte)',
    pg_temp.essaie(a, format('UPDATE public.academic_years SET photo_path = %L WHERE id = %L', l || '/' || n1 || '.jpg', y)), 'refus:23514');
  PERFORM pg_temp.attendu('T1d chemin de l''année d''un AUTRE enfant refusé (contrainte)',
    pg_temp.essaie(a, format('UPDATE public.academic_years SET photo_path = %L WHERE id = %L', l || '/' || yz || '.jpg', y)), 'refus:23514');
  PERFORM pg_temp.attendu('T1e chemin d''un autre enfant (autre foyer) refusé',
    pg_temp.essaie(a, format('UPDATE public.academic_years SET photo_path = %L WHERE id = %L', z || '/' || yz || '.jpg', y)), 'refus:23514');
  PERFORM pg_temp.attendu('T1f millésime au lieu de l''identifiant, extension quelconque : refusés',
    pg_temp.essaie(a, format('UPDATE public.academic_years SET photo_path = %L WHERE id = %L', l || '/' || current_setting('test.millesime') || '.jpg', y)) || '/' ||
    pg_temp.essaie(a, format('UPDATE public.academic_years SET photo_path = %L WHERE id = %L', l || '/' || y || '.png', y)), 'refus:23514/refus:23514');
  PERFORM pg_temp.attendu('T1g autre foyer (C), enseignants T1 / T2, anonyme : aucune écriture sur les années de Lucas',
    pg_temp.essaie('cccccccc-cccc-4ccc-8ccc-cccccccccccc', format('UPDATE public.academic_years SET photo_path = NULL WHERE id = %L', y)) || '/' ||
    pg_temp.essaie('dddddddd-dddd-4ddd-8ddd-dddddddddddd', format('UPDATE public.academic_years SET photo_path = NULL WHERE id = %L', y)) || '/' ||
    pg_temp.essaie('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', format('UPDATE public.academic_years SET photo_path = NULL WHERE id = %L', n1)) || '/' ||
    pg_temp.essaie(NULL, format('UPDATE public.academic_years SET photo_path = NULL WHERE id = %L', y)), 'ok:0/ok:0/ok:0/refus:42501');
  PERFORM pg_temp.attendu('T1h les années de Lucas gardent leurs 3 références',
    (SELECT count(*) FROM public.academic_years WHERE student_id = l::uuid AND photo_path IS NOT NULL)::text, '3');
END $$;

-- ─── T2 · politiques de stockage : dépôt ─────────────────────────────────────────────────
DO $$
DECLARE
  a text := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  l text := current_setting('test.lucas'); n3 text := current_setting('test.ay_n3');
  z text := current_setting('test.zoe'); yz text := current_setting('test.ay_zoe');
  ins text := 'INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES (''child-photos'', %L, %L)';
BEGIN
  PERFORM pg_temp.attendu('T2a A dépose la photo d''une année de Lucas (<enfant>/<année>.jpg)', pg_temp.essaie(a, format(ins, l || '/' || n3 || '.jpg', a)), 'ok:1');
  PERFORM pg_temp.attendu('T2b année qui n''existe pas : refusé', pg_temp.essaie(a, format(ins, l || '/' || gen_random_uuid() || '.jpg', a)), 'refus:42501');
  PERFORM pg_temp.attendu('T2c ANNÉE D''UN AUTRE ENFANT sous le dossier de Lucas : refusé', pg_temp.essaie(a, format(ins, l || '/' || yz || '.jpg', a)), 'refus:42501');
  PERFORM pg_temp.attendu('T2d dossier d''un enfant d''un autre foyer : refusé', pg_temp.essaie(a, format(ins, z || '/' || gen_random_uuid() || '.jpg', a)), 'refus:42501');
  PERFORM pg_temp.attendu('T2e extension, sous-dossier, nom libre : refusés',
    pg_temp.essaie(a, format(ins, l || '/' || n3 || '.png', a)) || '/' || pg_temp.essaie(a, format(ins, l || '/x/' || n3 || '.jpg', a)) || '/' ||
    pg_temp.essaie(a, format(ins, l || '/photo.jpg', a)), 'refus:42501/refus:42501/refus:42501');
  PERFORM pg_temp.attendu('T2f dépôt au nom d''un autre compte : refusé', pg_temp.essaie(a, format(ins, l || '/' || gen_random_uuid() || '.jpg', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')), 'refus:42501');
  PERFORM pg_temp.attendu('T2g enseignants et anonyme ne déposent rien (année active, archivée)',
    pg_temp.essaie('dddddddd-dddd-4ddd-8ddd-dddddddddddd', format(ins, l || '/' || current_setting('test.ay_lucas') || '.jpg', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')) || '/' ||
    pg_temp.essaie('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', format(ins, l || '/' || current_setting('test.ay_n1') || '.jpg', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')) || '/' ||
    pg_temp.essaie(NULL, format('INSERT INTO storage.objects (bucket_id, name) VALUES (''child-photos'', %L)', l || '/' || n3 || '.jpg')),
    'refus:42501/refus:42501/refus:42501');
  PERFORM pg_temp.attendu('T2h C (autre foyer) ne dépose pas sur une année de Lucas', pg_temp.essaie('cccccccc-cccc-4ccc-8ccc-cccccccccccc', format(ins, l || '/' || current_setting('test.ay_n2') || '.jpg', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')), 'refus:42501');
END $$;

-- ─── T3 · lecture : A, B oui (3 années + avatar + dépôt T2a) ; autre foyer, enseignants, anonyme : JAMAIS ─────────
DO $$
DECLARE
  tout text := 'SELECT 1 FROM storage.objects WHERE bucket_id = ''child-photos''';
  luc text := 'SELECT 1 FROM storage.objects WHERE bucket_id = ''child-photos'' AND name LIKE ' || quote_literal(current_setting('test.lucas') || '/%');
BEGIN
  PERFORM pg_temp.attendu('T3a A (responsable) lit les photos de TOUTES les années de Lucas (+ ancien avatar)', pg_temp.compte('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', luc)::text, '5');
  PERFORM pg_temp.attendu('T3b B (co-responsable) lit les mêmes', pg_temp.compte('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', luc)::text, '5');
  PERFORM pg_temp.attendu('T3c C (autre foyer) : aucune photo de Lucas, sa propre photo oui', pg_temp.compte('cccccccc-cccc-4ccc-8ccc-cccccccccccc', luc)::text || '/' || pg_temp.compte('cccccccc-cccc-4ccc-8ccc-cccccccccccc', tout)::text, '0/1');
  PERFORM pg_temp.attendu('T3d T1 (enseignant, classe de l''ANNÉE ACTIVE) : aucune photo, d''aucune année', pg_temp.compte('dddddddd-dddd-4ddd-8ddd-dddddddddddd', tout)::text, '0');
  PERFORM pg_temp.attendu('T3e T2 (enseignant, classe d''une ANNÉE ARCHIVÉE) : aucune photo, d''aucune année', pg_temp.compte('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', tout)::text, '0');
  PERFORM pg_temp.attendu('T3f anonyme : aucune photo', pg_temp.compte(NULL, tout)::text, '0');
  -- Les enseignants ne lisent pas non plus les LIGNES d'année qui portent le chemin (photo_path).
  PERFORM pg_temp.attendu('T3g enseignants : aucune ligne academic_years lisible (donc aucun chemin de photo)',
    pg_temp.compte('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'SELECT 1 FROM public.academic_years WHERE photo_path IS NOT NULL')::text || '/' ||
    pg_temp.compte('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'SELECT 1 FROM public.academic_years WHERE photo_path IS NOT NULL')::text, '0/0');
END $$;

-- ─── T4 · remplacement et suppression : responsables seulement ──────────────────────────────
DO $$
DECLARE
  obj text := current_setting('test.lucas') || '/' || current_setting('test.ay_n1') || '.jpg';
  maj text := format('UPDATE storage.objects SET updated_at = now() WHERE bucket_id = ''child-photos'' AND name = %L', obj);
BEGIN
  PERFORM pg_temp.attendu('T4a B remplace la photo d''une année PRÉCÉDENTE posée par A', pg_temp.essaie('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', maj), 'ok:1');
  PERFORM pg_temp.attendu('T4b autre foyer, enseignants : remplacement sans effet (0 ligne)',
    pg_temp.essaie('cccccccc-cccc-4ccc-8ccc-cccccccccccc', maj) || '/' || pg_temp.essaie('dddddddd-dddd-4ddd-8ddd-dddddddddddd', maj) || '/' ||
    pg_temp.essaie('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', maj), 'ok:0/ok:0/ok:0');
  -- Anonyme : 0 ligne touchée OU refus de privilège (les deux = aucun effet ; comme en M35).
  PERFORM pg_temp.attendu('T4c anonyme : remplacement sans effet', CASE WHEN pg_temp.essaie(NULL, maj) IN ('ok:0', 'refus:42501') THEN 'sans effet' ELSE 'EFFET' END, 'sans effet');
  -- storage.protect_delete interdit tout DELETE SQL direct : la suppression par les responsables et son refus aux autres sont prouvés par l'API Storage.
END $$;

-- ─── T5 · service seulement : photos_a_effacer / photos_orphelines ───────────────────────────
DO $$
BEGIN
  PERFORM pg_temp.attendu('T5a photos_orphelines et photos_a_effacer refusées aux comptes connectés et à anonyme',
    pg_temp.essaie('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'SELECT public.photos_orphelines()') || '/' ||
    pg_temp.essaie('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'SELECT public.photos_a_effacer(gen_random_uuid())') || '/' ||
    pg_temp.essaie(NULL, 'SELECT public.photos_orphelines()'), 'refus:42501/refus:42501/refus:42501');
END $$;

-- ─── T6 · nettoyage : référencé par UNE des deux colonnes = jamais orphelin ; l'ancien avatar.jpg l'est dès que la colonne est NULL ─
DO $$
DECLARE
  n int; l text := current_setting('test.lucas'); o text[];
BEGIN
  -- Tous les objets vieillissent de 3 jours (le déclencheur de Storage remet updated_at à now() : on le contourne en session locale).
  SET LOCAL session_replication_role = replica;
  UPDATE storage.objects SET created_at = now() - interval '3 days', updated_at = now() - interval '3 days' WHERE bucket_id = 'child-photos';
  SET LOCAL session_replication_role = origin;
  -- Références : 3 années de Lucas + 1 de Zoé (academic_years.photo_path) ; avatar.jpg et le dépôt T2a (année N−3, sans colonne) non référencés.
  SELECT array_agg(x ORDER BY x) INTO o FROM public.photos_orphelines() x;
  IF o IS DISTINCT FROM (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY[l || '/avatar.jpg', l || '/' || current_setting('test.ay_n3') || '.jpg']) x) THEN
    RAISE EXCEPTION 'ÉCHEC T6a orphelins : % (attendu : avatar.jpg et le dépôt non référencé)', o;
  END IF;
  RAISE NOTICE 'OK T6a un objet référencé par academic_years.photo_path n''est jamais orphelin ; avatar.jpg (colonne children NULL) et un dépôt non référencé le sont';
  -- La colonne de l'ancien modèle le protège encore (transition) : avatar.jpg référencé par children.photo_path → plus orphelin.
  UPDATE public.children SET photo_path = l || '/avatar.jpg' WHERE id = l::uuid;
  SELECT count(*) INTO n FROM public.photos_orphelines() x WHERE x = l || '/avatar.jpg';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T6b avatar.jpg référencé par children.photo_path jugé orphelin'; END IF;
  UPDATE public.children SET photo_path = NULL WHERE id = l::uuid;
  RAISE NOTICE 'OK T6b children.photo_path protège encore l''ancien avatar.jpg pendant la transition';
  -- Objet ancien tout juste REMPLACÉ : jamais listé (l'âge se mesure sur la dernière écriture).
  SET LOCAL session_replication_role = replica;
  UPDATE storage.objects SET updated_at = now() WHERE bucket_id = 'child-photos' AND name = l || '/avatar.jpg';
  SET LOCAL session_replication_role = origin;
  SELECT count(*) INTO n FROM public.photos_orphelines() x WHERE x = l || '/avatar.jpg';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T6c un objet ancien tout juste remplacé est listé'; END IF;
  RAISE NOTICE 'OK T6c un objet ancien tout juste remplacé n''est pas listé';
  SET LOCAL session_replication_role = replica;
  UPDATE storage.objects SET created_at = now() WHERE bucket_id = 'child-photos' AND name = l || '/' || current_setting('test.ay_n3') || '.jpg';
  UPDATE storage.objects SET updated_at = now() WHERE bucket_id = 'child-photos' AND name = l || '/' || current_setting('test.ay_n3') || '.jpg';
  SET LOCAL session_replication_role = origin;
  SELECT count(*) INTO n FROM public.photos_orphelines() x WHERE x = l || '/' || current_setting('test.ay_n3') || '.jpg';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T6d un dépôt récent est listé'; END IF;
  RAISE NOTICE 'OK T6d un dépôt récent est conservé';
END $$;

-- ─── T6e · NETTOYAGE PENDANT LA TRANSITION : les quatre cas (children seulement, année seulement, aucun des deux, trop récent) ─────
DO $$
DECLARE
  l text := current_setting('test.lucas'); z text := current_setting('test.zoe');
  x text := l || '/avatar.jpg';                                   -- X : référencé par children.photo_path SEULEMENT
  y text := l || '/' || current_setting('test.ay_n2') || '.jpg'; -- Y : référencé par academic_years.photo_path SEULEMENT
  zz text := l || '/' || current_setting('test.ay_n3') || '.jpg'; -- Z : référencé par AUCUN des deux modèles, ancien
  w text := z || '/' || gen_random_uuid() || '.jpg';             -- W : référencé par AUCUN des deux, mais RÉCENT (délai non atteint)
  o text[];
BEGIN
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('child-photos', w, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  SET LOCAL session_replication_role = replica;
  UPDATE storage.objects SET created_at = now() - interval '3 days', updated_at = now() - interval '3 days' WHERE bucket_id = 'child-photos' AND name IN (x, y, zz);
  SET LOCAL session_replication_role = origin;
  UPDATE public.children SET photo_path = x WHERE id = l::uuid;   -- X référencé par l'ancien modèle seulement
  IF (SELECT count(*) FROM public.academic_years WHERE photo_path = x) <> 0 THEN RAISE EXCEPTION 'ÉCHEC T6e préparation : X référencé par une année'; END IF;
  IF (SELECT count(*) FROM public.academic_years WHERE photo_path = y) <> 1 OR (SELECT count(*) FROM public.children WHERE photo_path = y) <> 0 THEN RAISE EXCEPTION 'ÉCHEC T6e préparation : Y mal référencé'; END IF;
  SELECT array_agg(n ORDER BY n) INTO o FROM public.photos_orphelines() n WHERE n IN (x, y, zz, w);
  IF o IS DISTINCT FROM ARRAY[zz] THEN RAISE EXCEPTION 'ÉCHEC T6e-1 listés : % (attendu : Z seul)', o; END IF;
  RAISE NOTICE 'OK T6e-1 children seulement (X) : non listé ; année seulement (Y) : non listé ; aucun des deux (Z), ancien : LISTÉ ; aucun des deux mais récent (W) : non listé';
  SET LOCAL session_replication_role = replica;
  UPDATE storage.objects SET created_at = now() - interval '2 days', updated_at = now() - interval '2 days' WHERE bucket_id = 'child-photos' AND name = w;
  SET LOCAL session_replication_role = origin;
  SELECT array_agg(n ORDER BY n) INTO o FROM public.photos_orphelines() n WHERE n IN (x, y, zz, w);
  IF o IS DISTINCT FROM (SELECT array_agg(n ORDER BY n) FROM unnest(ARRAY[zz, w]) n) THEN RAISE EXCEPTION 'ÉCHEC T6e-2 listés : % (attendu : Z et W)', o; END IF;
  RAISE NOTICE 'OK T6e-2 non référencé dans les deux modèles : listé dès que le délai (1 jour) est dépassé (W)';
  UPDATE public.children SET photo_path = NULL WHERE id = l::uuid;
  SELECT array_agg(n ORDER BY n) INTO o FROM public.photos_orphelines() n WHERE n IN (x, y, zz, w);
  IF o IS DISTINCT FROM (SELECT array_agg(n ORDER BY n) FROM unnest(ARRAY[x, zz, w]) n) THEN RAISE EXCEPTION 'ÉCHEC T6e-3 listés : % (attendu : X, Z, W)', o; END IF;
  RAISE NOTICE 'OK T6e-3 children.photo_path remis à NULL (fin de transition, M37) : l''ancien avatar.jpg (X) devient orphelin ; Y, toujours référencé par l''année, reste';
  UPDATE public.academic_years SET photo_path = NULL WHERE photo_path = y;
  SELECT array_agg(n ORDER BY n) INTO o FROM public.photos_orphelines() n WHERE n IN (x, y, zz, w);
  IF o IS DISTINCT FROM (SELECT array_agg(n ORDER BY n) FROM unnest(ARRAY[x, y, zz, w]) n) THEN RAISE EXCEPTION 'ÉCHEC T6e-4 listés : % (attendu : les 4)', o; END IF;
  RAISE NOTICE 'OK T6e-4 plus aucune référence : les 4 objets sont listés';
  -- Remise en état pour la suite du test (W supprimé : le garde-fou de Storage est levé pour cette transaction seulement).
  UPDATE public.academic_years SET photo_path = student_id::text || '/' || id::text || '.jpg' WHERE id = current_setting('test.ay_n2')::uuid;
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects WHERE bucket_id = 'child-photos' AND name = w;
END $$;

-- ─── T7 · test STRUCTUREL : aucune politique du bucket ne mentionne classes, enseignant_id ni classe_id ─────────
DO $$
DECLARE r record; n int := 0; def text;
BEGIN
  FOR r IN
    SELECT polname, coalesce(pg_get_expr(polqual, polrelid), '') || ' ' || coalesce(pg_get_expr(polwithcheck, polrelid), '') AS texte,
           (SELECT string_agg(rolname, ',') FROM pg_roles WHERE oid = ANY (polroles)) AS roles
    FROM pg_policy WHERE polrelid = 'storage.objects'::regclass
      AND (coalesce(pg_get_expr(polqual, polrelid), '') || coalesce(pg_get_expr(polwithcheck, polrelid), '')) ~ 'child-photos|child_photo_chemin_autorise'
  LOOP
    n := n + 1;
    IF r.texte ~* 'classes|enseignant_id|classe_id|est_enseignant|est_titulaire|teacher' THEN
      RAISE EXCEPTION 'ÉCHEC T7a la politique % mentionne les classes / enseignants : %', r.polname, r.texte;
    END IF;
    IF r.roles IS DISTINCT FROM 'authenticated' THEN RAISE EXCEPTION 'ÉCHEC T7b la politique % vise les rôles % (authenticated seul attendu)', r.polname, r.roles; END IF;
  END LOOP;
  IF n <> 4 THEN RAISE EXCEPTION 'ÉCHEC T7c % politique(s) sur le bucket (4 attendues : lecture, dépôt, remplacement, suppression)', n; END IF;
  def := pg_get_functiondef('public.child_photo_chemin_autorise(text)'::regprocedure);
  IF def ~* 'classes|enseignant_id|classe_id|est_enseignant|est_titulaire|teacher' THEN RAISE EXCEPTION 'ÉCHEC T7d la fonction d''aide mentionne les classes / enseignants'; END IF;
  IF def !~ 'is_responsable' THEN RAISE EXCEPTION 'ÉCHEC T7e la fonction d''aide n''exige plus is_responsable'; END IF;
  IF has_function_privilege('anon', 'public.child_photo_chemin_autorise(text)', 'EXECUTE') THEN RAISE EXCEPTION 'ÉCHEC T7f la fonction d''aide est appelable par anon'; END IF;
  RAISE NOTICE 'OK T7 structurel : 4 politiques, rôle authenticated seul, aucune mention de classes / enseignant_id / classe_id (politiques ni fonction d''aide)';
END $$;

-- ─── T8 · NON-FUITE, repli compris : un responsable DÉTACHÉ de l'enfant ──────────────────────────────
DO $$
DECLARE
  b text := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; a text := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; l text := current_setting('test.lucas');
  repli text := format('SELECT id, annee_scolaire, photo_path, updated_at FROM public.academic_years WHERE student_id = %L AND photo_path IS NOT NULL ORDER BY annee_scolaire DESC', l);
  luc text := format('SELECT 1 FROM storage.objects WHERE bucket_id = ''child-photos'' AND name LIKE %L', l || '/%');
BEGIN
  PERFORM pg_temp.attendu('T8a avant de partir, B voit les 3 années photographiées (requête de repli) et les objets', pg_temp.compte(b, repli)::text || '/' || pg_temp.compte(b, luc)::text, '3/5');
  PERFORM pg_temp.attendu('T8b B QUITTE le carnet (quitter_carnet)', pg_temp.essaie(b, format('SELECT public.quitter_carnet(%L::uuid)', l)), 'ok:1');
  PERFORM pg_temp.attendu('T8c responsable détaché : AUCUNE photo d''aucune année lisible (objets de tous les chemins)', pg_temp.compte(b, luc)::text, '0');
  PERFORM pg_temp.attendu('T8d … et le REPLI (requête sur academic_years) ne renvoie ni année, ni chemin', pg_temp.compte(b, repli)::text, '0');
  PERFORM pg_temp.attendu('T8e … il ne remplace, ne dépose et n''écrit plus rien',
    pg_temp.essaie(b, format('UPDATE storage.objects SET updated_at = now() WHERE bucket_id = ''child-photos'' AND name = %L', l || '/' || current_setting('test.ay_n1') || '.jpg')) || '/' ||
    pg_temp.essaie(b, format('INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES (''child-photos'', %L, %L)', l || '/' || gen_random_uuid() || '.jpg', b)) || '/' ||
    pg_temp.essaie(b, format('UPDATE public.academic_years SET photo_path = NULL WHERE student_id = %L', l)), 'ok:0/refus:42501/ok:0');
  PERFORM pg_temp.attendu('T8f A (resté responsable) lit toujours tout (témoin positif)', pg_temp.compte(a, repli)::text || '/' || pg_temp.compte(a, luc)::text, '3/5');
END $$;

-- ─── T9 · NON-FUITE : enfant EN COURS D'EFFACEMENT (repli compris), puis effacement de TOUTES ses photos ───────────
DO $$
DECLARE
  a text := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; l text := current_setting('test.lucas'); v_dem uuid; f text[]; n int;
  repli text := format('SELECT id, annee_scolaire, photo_path FROM public.academic_years WHERE student_id = %L AND photo_path IS NOT NULL ORDER BY annee_scolaire DESC', l);
  luc text := format('SELECT 1 FROM storage.objects WHERE bucket_id = ''child-photos'' AND name LIKE %L', l || '/%');
BEGIN
  INSERT INTO public.demandes_effacement (user_id, portee, child_id, execution_prevue_le)
    VALUES (a::uuid, 'enfant', l::uuid, now() - interval '1 minute') RETURNING id INTO v_dem;
  PERFORM pg_temp.attendu('T9a enfant en cours d''effacement : A ne lit plus aucune photo d''aucune année', pg_temp.compte(a, luc)::text, '0');
  PERFORM pg_temp.attendu('T9b … le REPLI ne renvoie rien (années invisibles)', pg_temp.compte(a, repli)::text, '0');
  PERFORM pg_temp.attendu('T9c … ni remplacement ni écriture de photo_path',
    pg_temp.essaie(a, format('UPDATE storage.objects SET updated_at = now() WHERE bucket_id = ''child-photos'' AND name = %L', l || '/' || current_setting('test.ay_lucas') || '.jpg')) || '/' ||
    pg_temp.essaie(a, format('UPDATE public.academic_years SET photo_path = NULL WHERE student_id = %L', l)), 'ok:0/ok:0');
  -- photos_a_effacer : TOUTES les photos de l'enfant (3 années, dépôt non référencé N−3, ancien avatar.jpg), jamais celle de Zoé.
  SELECT array_agg(x ORDER BY x) INTO f FROM public.photos_a_effacer(v_dem) x;
  IF f IS DISTINCT FROM (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY[
        l || '/' || current_setting('test.ay_lucas') || '.jpg', l || '/' || current_setting('test.ay_n1') || '.jpg',
        l || '/' || current_setting('test.ay_n2') || '.jpg', l || '/' || current_setting('test.ay_n3') || '.jpg', l || '/avatar.jpg']) x) THEN
    RAISE EXCEPTION 'ÉCHEC T9d photos_a_effacer : %', f;
  END IF;
  RAISE NOTICE 'OK T9d photos_a_effacer = TOUTES les photos de Lucas (5 objets, toutes années + ancien avatar), pas celle de Zoé';
  PERFORM public.executer_effacement(v_dem);
  -- Les objets touchés plus haut portent l'heure de la transaction : on les vieillit pour que « 0 seconde » les compte tous.
  SET LOCAL session_replication_role = replica;
  UPDATE storage.objects SET created_at = now() - interval '3 days', updated_at = now() - interval '3 days' WHERE bucket_id = 'child-photos';
  SET LOCAL session_replication_role = origin;
  SELECT count(*) INTO n FROM public.children WHERE id = l::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T9e l''enfant existe encore'; END IF;
  SELECT count(*) INTO n FROM public.academic_years WHERE student_id = l::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T9f des années de l''enfant effacé existent encore (%)', n; END IF;
  SELECT count(*) INTO n FROM public.photos_orphelines(interval '0 seconds') x WHERE x LIKE l || '/%';
  IF n <> 5 THEN RAISE EXCEPTION 'ÉCHEC T9g filet de sécurité : % objet(s) de l''enfant effacé repris par le nettoyage (5 attendus)', n; END IF;
  SELECT count(*) INTO n FROM public.photos_orphelines(interval '0 seconds') x WHERE x LIKE current_setting('test.zoe') || '/%';
  IF n <> 0 THEN RAISE EXCEPTION 'ÉCHEC T9h la photo d''un autre foyer est reprise par le nettoyage'; END IF;
  RAISE NOTICE 'OK T9e-h enfant effacé : lignes et années supprimées ; si des objets restaient, le nettoyage reprend les 5 de Lucas, jamais ceux de Zoé';
END $$;

ROLLBACK;
\echo 'M36 : tous les tests passent (transaction annulée)'
