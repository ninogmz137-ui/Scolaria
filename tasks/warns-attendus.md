# WARN advisors attendus (Paris) — au 4 oct 2026

*Critère d'une migration sur Paris (remplace le comptage) : **0 ERROR** et **aucun WARN absent de cette liste**. La comparaison se fait par
« nom du contrôle | objet », jamais par nombre. Obtenir la liste : `npx supabase db advisors --linked` (JSON, champ `results`, niveau WARN).
Un WARN nouveau n'est jamais ajouté ici par la migration qui le crée : il est déclaré AVANT l'application et validé par l'utilisateur.*

État mesuré après M33 : 0 ERROR, 0 INFO, 101 WARN, tous ci-dessous (liste étendue à 103 par la validation de M34 du 4 oct).

## 1. authenticated_security_definer_function_executable — 32 fonctions (dont `annuler_invitation` et `renvoyer_invitation`, M34, validées par l'utilisateur le 4 oct 2026)
Raison : ce sont des fonctions SECURITY DEFINER appelées par l'application (RPC) ou par des politiques RLS ; l'EXECUTE est retiré à
PUBLIC et à `anon` (M32 et migrations antérieures), accordé à `authenticated` seulement, et chacune contrôle l'appelant (`auth.uid()`)
à l'intérieur — vérifié par l'audit local (npm run audit:securite-local, 670 tests). Retirer l'EXECUTE à `authenticated` casserait les
politiques ou l'application. `est_enseignant()` (M33) : sans argument, ne répond que pour l'appelant (sa propre ligne de profiles).
```
authenticated_security_definer_function_executable | public.annuler_effacement(p_demande_id uuid) / authenticated
authenticated_security_definer_function_executable | public.annuler_invitation(p_invitation_id uuid) / authenticated
authenticated_security_definer_function_executable | public.apercu_effacement_compte() / authenticated
authenticated_security_definer_function_executable | public.carnet_chemin_autorise(p_name text) / authenticated
authenticated_security_definer_function_executable | public.compte_en_effacement(p_user_id uuid) / authenticated
authenticated_security_definer_function_executable | public.create_child(p_first_name text, p_last_name text, p_birth_date date, p_age integer, p_classe text, p_school text, p_avatar_emoji text, p_color text, p_scolaria_id text) / authenticated
authenticated_security_definer_function_executable | public.decoupage_annee(p_academic_year_id uuid) / authenticated
authenticated_security_definer_function_executable | public.demander_effacement_compte() / authenticated
authenticated_security_definer_function_executable | public.demander_effacement_enfant(p_child_id uuid) / authenticated
authenticated_security_definer_function_executable | public.depart_du_fil(p_conversation_id uuid) / authenticated
authenticated_security_definer_function_executable | public.distribuer_mot(p_mot_id uuid, p_child_ids uuid[]) / authenticated
authenticated_security_definer_function_executable | public.echelle_competences_annee(p_academic_year_id uuid) / authenticated
authenticated_security_definer_function_executable | public.enfant_en_effacement(p_child_id uuid) / authenticated
authenticated_security_definer_function_executable | public.envoye_aussi_a(p_message_id uuid) / authenticated
authenticated_security_definer_function_executable | public.envoyer_a_tous_les_representants(p_child_id uuid, p_text text) / authenticated
authenticated_security_definer_function_executable | public.est_du_foyer(p_foyer_id uuid, p_child_id uuid) / authenticated
authenticated_security_definer_function_executable | public.est_enseignant() / authenticated
authenticated_security_definer_function_executable | public.est_titulaire_enfant(p_child_id uuid, p_teacher_id uuid) / authenticated
authenticated_security_definer_function_executable | public.fil_enseignant(p_conversation_id uuid) / authenticated
authenticated_security_definer_function_executable | public.is_mot_teacher(p_mot_id uuid) / authenticated
authenticated_security_definer_function_executable | public.is_responsable(p_child_id uuid) / authenticated
authenticated_security_definer_function_executable | public.is_titulaire_annee(p_academic_year_id uuid) / authenticated
authenticated_security_definer_function_executable | public.is_titulaire_classe(p_classe_id uuid) / authenticated
authenticated_security_definer_function_executable | public.mes_effacements() / authenticated
authenticated_security_definer_function_executable | public.mes_invitations() / authenticated
authenticated_security_definer_function_executable | public.mot_expediteur(p_mot_id uuid) / authenticated
authenticated_security_definer_function_executable | public.nb_responsables_carnet(p_mot_id uuid, p_child_id uuid) / authenticated
authenticated_security_definer_function_executable | public.peut_lire_fil(p_conversation_id uuid) / authenticated
authenticated_security_definer_function_executable | public.renvoyer_invitation(p_invitation_id uuid) / authenticated
authenticated_security_definer_function_executable | public.respond_invitation(p_invitation_id uuid, p_accept boolean) / authenticated
authenticated_security_definer_function_executable | public.responsables_enfant(p_child_id uuid) / authenticated
authenticated_security_definer_function_executable | public.role_dans_fil(p_conversation_id uuid) / authenticated
```

## 2. auth_rls_initplan — 48 politiques
Raison : performance seulement — `auth.uid()` / `current_setting()` réévalué par ligne au lieu de `(select auth.uid())`. Aucun effet de
sécurité ; sans importance aux volumes actuels ; à corriger politique par politique quand une table grossit (une migration dédiée, pas
avec une autre). Les politiques de `messages`, `deletion_requests`, `export_history`, `person_permissions`, `transfer_codes`,
`access_journal` portent sur des tables sans droit depuis M32 (inutilisées) : elles disparaîtront avec ces tables.
```
auth_rls_initplan | public.absences / absences_parent_insert
auth_rls_initplan | public.absences / absences_parent_update
auth_rls_initplan | public.access_journal / journal_owner_insert
auth_rls_initplan | public.access_journal / journal_owner_select
auth_rls_initplan | public.agenda_events / agenda_insert
auth_rls_initplan | public.alertes_urgence / alertes_urgence_delete
auth_rls_initplan | public.alertes_urgence / alertes_urgence_insert
auth_rls_initplan | public.alertes_urgence / alertes_urgence_select
auth_rls_initplan | public.aria_conversations / aria_conv_insert
auth_rls_initplan | public.aria_messages / aria_msg_insert
auth_rls_initplan | public.carnet_items / carnet_items_delete
auth_rls_initplan | public.carnet_items / carnet_items_insert
auth_rls_initplan | public.carnet_items / carnet_items_select
auth_rls_initplan | public.carnet_items / carnet_items_update
auth_rls_initplan | public.class_events / class_events_teacher_delete
auth_rls_initplan | public.class_events / class_events_teacher_insert
auth_rls_initplan | public.class_events / class_events_teacher_select
auth_rls_initplan | public.class_events / class_events_teacher_update
auth_rls_initplan | public.class_post_reactions / Anyone can react
auth_rls_initplan | public.class_post_seen / Parents mark seen
auth_rls_initplan | public.class_post_seen / Teachers see who viewed
auth_rls_initplan | public.class_posts / class_posts_teacher_delete
auth_rls_initplan | public.class_posts / class_posts_teacher_insert
auth_rls_initplan | public.class_posts / class_posts_teacher_select
auth_rls_initplan | public.class_posts / class_posts_teacher_update
auth_rls_initplan | public.classes / classes_enseignant_select
auth_rls_initplan | public.competences / competences_delete
auth_rls_initplan | public.competences / competences_insert
auth_rls_initplan | public.competences / competences_update
auth_rls_initplan | public.deletion_requests / deletion_owner
auth_rls_initplan | public.export_history / export_owner
auth_rls_initplan | public.foyers / foyers_select
auth_rls_initplan | public.foyers / foyers_update
auth_rls_initplan | public.invitations_responsable / invitations_insert
auth_rls_initplan | public.messages / messages_select
auth_rls_initplan | public.messages / messages_update
auth_rls_initplan | public.mots_liaison / mots_teacher_delete
auth_rls_initplan | public.mots_liaison / mots_teacher_select
auth_rls_initplan | public.person_permissions / perms_owner
auth_rls_initplan | public.profiles / profiles_insert
auth_rls_initplan | public.profiles / profiles_select
auth_rls_initplan | public.profiles / profiles_update
auth_rls_initplan | public.reponses_mot / reponses_mot_insert
auth_rls_initplan | public.reponses_mot / reponses_mot_update
auth_rls_initplan | public.responsables / responsables_delete_self
auth_rls_initplan | public.responsables / responsables_select
auth_rls_initplan | public.signatures / sig_parent_insert
auth_rls_initplan | public.transfer_codes / transfer_owner
```

## 3. multiple_permissive_policies — 21 (table / rôle)
Raison : performance seulement — deux politiques permissives pour le même rôle et la même action (enseignant / famille) sur
`class_events`, `class_posts`, `classes`, `class_post_reactions`, `class_post_seen`, `mots_liaison`. Voulu : une politique par profil
d'accès, plus lisible à auditer qu'une politique unique à OR. Les lignes « rôle système » (authenticator, dashboard_user…) sont la
même table vue par les rôles internes de Supabase.
```
multiple_permissive_policies | public.class_events / authenticated
multiple_permissive_policies | public.class_post_reactions / anon
multiple_permissive_policies | public.class_post_reactions / authenticated
multiple_permissive_policies | public.class_post_reactions / authenticator
multiple_permissive_policies | public.class_post_reactions / cli_login_postgres
multiple_permissive_policies | public.class_post_reactions / dashboard_user
multiple_permissive_policies | public.class_post_reactions / supabase_privileged_role
multiple_permissive_policies | public.class_post_seen / anon
multiple_permissive_policies | public.class_post_seen / authenticated
multiple_permissive_policies | public.class_post_seen / authenticator
multiple_permissive_policies | public.class_post_seen / cli_login_postgres
multiple_permissive_policies | public.class_post_seen / dashboard_user
multiple_permissive_policies | public.class_post_seen / supabase_privileged_role
multiple_permissive_policies | public.class_posts / authenticated
multiple_permissive_policies | public.classes / authenticated
multiple_permissive_policies | public.mots_liaison / anon
multiple_permissive_policies | public.mots_liaison / authenticated
multiple_permissive_policies | public.mots_liaison / authenticator
multiple_permissive_policies | public.mots_liaison / cli_login_postgres
multiple_permissive_policies | public.mots_liaison / dashboard_user
multiple_permissive_policies | public.mots_liaison / supabase_privileged_role
```

## 4. extension_in_public
```
extension_in_public | pg_net
```
Raison : `pg_net` est installée par Supabase dans le schéma public ; la déplacer casserait les appels HTTP de la base (tâche
d'effacement). Géré par la plateforme.

## 5. auth_leaked_password_protection
```
auth_leaked_password_protection | 
```
Raison : la protection contre les mots de passe divulgués (HaveIBeenPwned) est une option du plan Pro de Supabase. À activer avec
le passage Pro, **avant la première famille extérieure** (tasks/todo.md).

## WARN annoncés par une migration, en attente de validation
Aucun.

*M34 : `annuler_invitation` et `renvoyer_invitation` validés par l'utilisateur le 4 oct 2026 (« j'accepte les 2 WARN ») et déplacés en section 1.
Raison : SECURITY DEFINER appelées par l'application, EXECUTE retiré à PUBLIC et à `anon`, accordé à `authenticated`, search_path figé, contrôle de
l'appelant (responsable de l'enfant) à l'intérieur, même erreur pour un étranger, un enseignant, un invité et une invitation inconnue ; testées par
supabase/tests/m34_invitations_expirees.sql (9 groupes). `invitations_liberer_expirees()` (déclencheur) n'est exécutable par personne : pas de WARN.*
