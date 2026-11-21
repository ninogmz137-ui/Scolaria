# Audit de sécurité — 2 octobre 2026

> Aucune modification en production. Catalogue lu sur **Paris** en lecture seule (état AVANT M30) ; tests dynamiques sur la base **locale** avec comptes de test (`npm run audit:securite-local`, 670 tests).
> Les corrections sont dans la migration **M30** (locale, NON appliquée à Paris). Rapport généré le 2 oct 2026.

## 0. Résumé

- **670 tests**, 4 acteurs : B (parent d'un AUTRE foyer), T0 (enseignant non rattaché), ANON (sans compte), TE (enseignant titulaire de la classe de Léa), + A (propriétaire) pour les champs modifiables.
- **Cloisonnement entre foyers, enseignants non rattachés et anonymes : aucun accès** en lecture, écriture ou suppression sur les 39 tables et 4 vues contenant des données d'enfants, ni sur le stockage.
- **19 lignes d'écart** au premier passage = **2 faux positifs de l'outil** (corrigés dans le script) + **15 corrigées** localement par M30 + **2 signalées** sans correction (§5). Après M30 : 2 écarts restants, tous deux faibles (`mots_liaison` : brouillon créable par un non-enseignant ; `profiles.email`).
- Une **faille d'une autre nature** avait été trouvée et corrigée juste avant (M28 : se réinviter après son départ, appliquée à Paris).
- Autres points signalés non corrigés (hors tests) : droits de table trop larges, pas de limite d'appels sur Aria, tables inutilisées (§5).

## 1. (a) Fonctions SECURITY DEFINER

48 fonctions DEFINER sur 62 (toutes avec `search_path` fixé : oui). « Appelable par » = droit EXECUTE effectif. « Vérifie l'appelant » = la fonction compare à `auth.uid()` ou passe par `is_responsable` & cie.

| Fonction | Appelable par | Lit / écrit | Vérifie l'appelant à l'intérieur |
|---|---|---|---|
| `annuler_effacement` | connecté, service | demandes_effacement | oui |
| `apercu_effacement_compte` | connecté, service | children, responsables | oui |
| `carnet_chemin_autorise` | connecté, service | academic_years | oui |
| `carnet_items_fichier_controler` | service | storage | sans objet (déclencheur, non appelable) |
| `compte_en_effacement` | connecté, service | demandes_effacement | NON avant M30 → oui (M30 : ne répond qu'au concerné) |
| `create_child` | connecté, service | academic_years, children, foyers, responsables | oui |
| `decoupage_annee` | connecté, service | academic_years, classes | oui |
| `demander_effacement_compte` | connecté, service | demandes_effacement, invitations_responsable, profiles | oui |
| `demander_effacement_enfant` | connecté, service | demandes_effacement, invitations_responsable, responsables | oui |
| `depart_du_fil` | connecté, service | departs_foyer, teacher_conversations | oui |
| `distribuer_mot` | connecté, service | academic_years, classes, mot_carnets, mots_liaison | oui |
| `distribuer_mot_classe` | service | academic_years, classes, mot_carnets | sans objet (déclencheur, non appelable) |
| `echelle_competences_annee` | connecté, service | academic_years, classes | oui |
| `effacements_dus` | service | demandes_effacement | service seulement (EXECUTE refusé aux comptes) |
| `enfant_en_effacement` | connecté, service | demandes_effacement | NON avant M30 → oui (M30 : ne répond qu'à un responsable) |
| `enfants_a_effacer` | service | children, demandes_effacement, responsables | service seulement (EXECUTE refusé aux comptes) |
| `enregistrer_depart_foyer` | service | children, departs_foyer, foyers, profiles | sans objet (déclencheur, non appelable) |
| `ensure_child_has_year` | service | academic_years, children | sans objet (déclencheur, non appelable) |
| `envoye_aussi_a` | connecté, service | profiles, responsables, teacher_conversations, teacher_messages | oui |
| `envoyer_a_tous_les_representants` | connecté, service | responsables, teacher_conversations, teacher_messages | oui |
| `est_du_foyer` | connecté, service | responsables | oui |
| `est_titulaire_enfant` | connecté, service | academic_years, classes | NON avant M30 → oui (M30 : concerné, titulaire ou responsable) |
| `executer_effacement` | service | access_journal, alertes_urgence, carnet_items, children, class_post_reactions, c | service seulement (EXECUTE refusé aux comptes) |
| `fichiers_a_effacer` | service | carnet_items, demandes_effacement, storage | service seulement (EXECUTE refusé aux comptes) |
| `fichiers_orphelins` | service | carnet_items, storage | service seulement (EXECUTE refusé aux comptes) |
| `fil_enseignant` | connecté, service | profiles, teacher_conversations | oui |
| `fils_dernier_message` | service | teacher_conversations | sans objet (déclencheur, non appelable) |
| `fils_verrou` | service | — | sans objet (déclencheur, non appelable) |
| `handle_new_user` | service | profiles | sans objet (déclencheur, non appelable) |
| `is_mot_teacher` | connecté, service | mots_liaison | oui |
| `is_responsable` | connecté, service | responsables | oui |
| `is_titulaire_annee` | connecté, service | academic_years, classes | oui |
| `is_titulaire_classe` | connecté, service | classes | oui |
| `journaliser_executions_effacement` | service | journal_executions_effacement, net | service seulement (EXECUTE refusé aux comptes) |
| `lancer_executer_effacements` | service | journal_executions_effacement, vault | service seulement (EXECUTE refusé aux comptes) |
| `marquer_effacement_execute` | service | demandes_effacement | service seulement (EXECUTE refusé aux comptes) |
| `mes_effacements` | connecté, service | children, demandes_effacement | oui |
| `mes_invitations` | connecté, service | auth, children, invitations_responsable, profiles | oui |
| `mot_expediteur` | connecté, service | mot_carnets, mots_liaison, profiles | oui |
| `nb_responsables_carnet` | connecté, service | mot_carnets, responsables | oui |
| `peut_lire_fil` | connecté, service | teacher_conversations | oui |
| `reponses_mot_controler` | service | mot_carnets, mots_liaison | sans objet (déclencheur, non appelable) |
| `respond_invitation` | connecté, service | auth, invitations_responsable, responsables | oui |
| `responsables_enfant` | connecté, service | profiles, responsables | oui |
| `role_dans_fil` | connecté, service | teacher_conversations | oui |
| `set_academic_year` | service | academic_years | sans objet (déclencheur, non appelable) |
| `signatures_remplir` | service | children, mot_carnets, mots_liaison, profiles | sans objet (déclencheur, non appelable) |
| `supprimer_prives_au_depart` | service | carnet_items, invitations_responsable | sans objet (déclencheur, non appelable) |

Fonctions appelables par un compte connecté **sans** vérification interne avant M30 : `compte_en_effacement`, `enfant_en_effacement`, `est_titulaire_enfant` (oracles d'état, **corrigés par M30**). Les fonctions d'exécution (`executer_effacement`, `effacements_dus`, `enfants_a_effacer`, `fichiers_a_effacer`, `fichiers_orphelins`, `marquer_effacement_execute`, `lancer_executer_effacements`, `journaliser_executions_effacement`) ne sont appelables que par le service : testé (refus pour B, T0, ANON). Les 14 fonctions INVOKER sont des déclencheurs ou des lectures soumises à la RLS (`apercu_depart_carnet`, `quitter_carnet`).

## 2. (b) RLS par table

RLS activée sur **toutes** les tables (`relrowsecurity` = oui) ; les 4 vues sont en `security_invoker`. Droits de table : voir §5 (larges). Politiques (état Paris, avant M30 ; les écarts corrigés par M30 sont notés).

| Table | SELECT | INSERT (with check) | UPDATE | DELETE |
|---|---|---|---|---|
| `absences` | is_responsable(student_id) | ((signalee_par = auth.uid()) AND is_responsable(student_id)) | ((signalee_par = auth.uid()) AND is_responsable(student_id)) | — (aucune politique : refusé) |
| `academic_years` | is_responsable(student_id) | is_responsable(student_id) | is_responsable(student_id) | is_responsable(student_id) |
| `access_journal` | (family_id = auth.uid()) | (family_id = auth.uid()) | — (aucune politique : refusé) | — (aucune politique : refusé) |
| `agenda_events` | is_responsable(child_id) | ((auth.uid() = parent_id) AND is_responsable(child_id)) | is_responsable(child_id) | is_responsable(child_id) |
| `alertes_urgence` | (auteur_id = auth.uid()) | ((auteur_id = auth.uid()) AND ((child_id IS NULL) OR is_responsable(child_id))) | — (aucune politique : refusé) | (auteur_id = auth.uid()) |
| `appreciations` | (teacher_id = auth.uid()) (ALL) | ALL | ALL | ALL |
| `aria_conversations` | ((auth.uid() = parent_id) AND (NOT compte_en_effacement(auth.uid()))) | ((auth.uid() = parent_id) AND is_responsable(child_id)) | — (aucune politique : refusé) | — (aucune politique : refusé) |
| `aria_messages` | (conversation_id IN ( SELECT c.id FROM aria_conversations c WHERE ((c.parent_id = auth.uid()) AND (NOT compte_ | (conversation_id IN ( SELECT aria_conversations.id FROM aria_conversations WHERE (aria_conversations.parent_id | — (aucune politique : refusé) | — (aucune politique : refusé) |
| `bulletins` | is_responsable(child_id) | is_responsable(child_id) | is_responsable(child_id) | is_responsable(child_id) |
| `carnet_items` | (is_responsable(child_id) AND ((visibilite = 'foyer'::text) OR (ajoute_par = auth.uid()))) | ((ajoute_par = auth.uid()) AND is_responsable(child_id)) | ((ajoute_par = auth.uid()) AND is_responsable(child_id)) | ((ajoute_par = auth.uid()) AND is_responsable(child_id)) |
| `checkins` | is_responsable(child_id) | is_responsable(child_id) | — (aucune politique : refusé) | — (aucune politique : refusé) |
| `children` | is_responsable(id) | — (aucune politique : refusé) | is_responsable(id) | — (aucune politique : refusé) |
| `class_events` | (classe_id IN ( SELECT ay.classe_id FROM academic_years ay WHERE is_responsable(ay.student_id))) ; (teacher_id = auth.uid()) | ((teacher_id = auth.uid()) AND is_titulaire_classe(classe_id)) | (teacher_id = auth.uid()) | (teacher_id = auth.uid()) |
| `class_post_reactions` | (user_id = auth.uid()) (ALL) | ALL | ALL | ALL |
| `class_post_seen` | (parent_id = auth.uid()) (ALL) | ALL | ALL | ALL |
| `class_posts` | (classe_id IN ( SELECT ay.classe_id FROM academic_years ay WHERE is_responsable(ay.student_id))) ; (teacher_id = auth.uid()) | ((teacher_id = auth.uid()) AND is_titulaire_classe(classe_id)) | (teacher_id = auth.uid()) | (teacher_id = auth.uid()) |
| `classes` | (enseignant_id = auth.uid()) ; (id IN ( SELECT ay.classe_id FROM academic_years ay WHERE is_responsable(ay.student_id))) | — (aucune politique : refusé) | — (aucune politique : refusé) | — (aucune politique : refusé) |
| `competences` | (is_responsable(child_id) OR ((source = 'ecole'::text) AND is_titulaire_annee(academic_year_id))) | (((source = 'ecole'::text) AND is_titulaire_annee(academic_year_id)) OR ((source = 'parent'::text) AND (saisi_ | (((source = 'ecole'::text) AND is_titulaire_annee(academic_year_id)) OR ((source = 'parent'::text) AND (saisi_ | (((source = 'ecole'::text) AND is_titulaire_annee(academic_year_id)) OR ((source = 'parent'::text) AND (saisi_ |
| `deletion_requests` | (family_id = auth.uid()) (ALL) | ALL | ALL | ALL |
| `demandes_effacement` | (user_id = auth.uid()) | — (aucune politique : refusé) | — (aucune politique : refusé) | — (aucune politique : refusé) |
| `departs_foyer` | — (aucune politique : refusé) | — (aucune politique : refusé) | — (aucune politique : refusé) | — (aucune politique : refusé) |
| `ecoles` | (id IN ( SELECT c.ecole_id FROM classes c)) | — (aucune politique : refusé) | — (aucune politique : refusé) | — (aucune politique : refusé) |
| `export_history` | (family_id = auth.uid()) (ALL) | ALL | ALL | ALL |
| `foyers` | (id IN ( SELECT r.foyer_id FROM responsables r WHERE (r.user_id = auth.uid()))) | — (aucune politique : refusé) | (id IN ( SELECT r.foyer_id FROM responsables r WHERE (r.user_id = auth.uid()))) | — (aucune politique : refusé) |
| `grades` | is_responsable(child_id) | is_responsable(child_id) | is_responsable(child_id) | is_responsable(child_id) |
| `invitations_responsable` | (is_responsable(child_id) OR (invited_email = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)))) | ((invited_by = auth.uid()) AND is_responsable(child_id) AND (statut = 'en_attente'::text)) | — (aucune politique : refusé) | — (aucune politique : refusé) |
| `journal_executions_effacement` | — (aucune politique : refusé) | — (aucune politique : refusé) | — (aucune politique : refusé) | — (aucune politique : refusé) |
| `messages` | ((auth.uid() = sender_id) OR (auth.uid() = receiver_id)) | (auth.uid() = sender_id) | (auth.uid() = receiver_id) | — (aucune politique : refusé) |
| `mot_carnets` | (is_responsable(child_id) OR is_mot_teacher(mot_id)) | — (aucune politique : refusé) | — (aucune politique : refusé) | — (aucune politique : refusé) |
| `mots_liaison` | ((statut <> 'brouillon'::text) AND (id IN ( SELECT mc.mot_id FROM mot_carnets mc WHERE is_responsable(mc.child ; (teacher_id = auth.uid()) | (teacher_id = auth.uid()) | (teacher_id = auth.uid()) | (teacher_id = auth.uid()) |
| `person_permissions` | (family_id = auth.uid()) (ALL) | ALL | ALL | ALL |
| `profiles` | (auth.uid() = id) | (auth.uid() = id) | (auth.uid() = id) | — (aucune politique : refusé) |
| `read_receipts` | (parent_id = auth.uid()) (ALL) | ALL | ALL | ALL |
| `reponses_mot` | (is_responsable(child_id) OR is_mot_teacher(mot_id)) | ((responsable_id = auth.uid()) AND is_responsable(child_id)) | ((responsable_id = auth.uid()) AND is_responsable(child_id)) | — (aucune politique : refusé) |
| `responsables` | ((user_id = auth.uid()) OR is_responsable(child_id)) | — (aucune politique : refusé) | — (aucune politique : refusé) | (user_id = auth.uid()) |
| `signatures` | (is_responsable(student_id) OR is_mot_teacher(mot_id)) | ((parent_id = auth.uid()) AND is_responsable(student_id)) | — (aucune politique : refusé) | — (aucune politique : refusé) |
| `subjects` | is_responsable(child_id) | is_responsable(child_id) | is_responsable(child_id) | — (aucune politique : refusé) |
| `teacher_conversations` | ((teacher_id = auth.uid()) OR ((portee = 'individuel'::text) AND (parent_id = auth.uid()) AND is_responsable(s | (est_titulaire_enfant(student_id, teacher_id) AND (((teacher_id = auth.uid()) AND (((portee = 'foyer'::text) A | (teacher_id = auth.uid()) | — (aucune politique : refusé) |
| `teacher_messages` | (peut_lire_fil(conversation_id) OR (created_at <= depart_du_fil(conversation_id))) | ((sender_id = auth.uid()) AND (sender_role = role_dans_fil(conversation_id))) | peut_lire_fil(conversation_id) | — (aucune politique : refusé) |
| `transfer_codes` | (family_id = auth.uid()) (ALL) | ALL | ALL | ALL |

**Colonnes modifiables par un utilisateur de l'app** : le droit `UPDATE` est accordé sur **toutes les colonnes** de chaque table (droits Supabase par défaut) ; la protection est portée par les politiques UPDATE et par des déclencheurs. Colonnes sensibles testées (propriétaire A sur ses propres données) :

| Colonne | Verrou | Résultat après M30 |
|---|---|---|
| `profiles.role` | déclencheur `protect_profile_role` | verrouillée |
| `profiles.plan` | M30 : même déclencheur | verrouillée |
| `profiles.email` | aucun (copie d'affichage, non utilisée par l'app) — signalé | **MODIFIABLE** (signalé) |
| `children.parent_id` | M30 : `children_verrou_createur` | verrouillée |
| `children.scolaria_id` | M30 : `children_verrou_createur` | verrouillée |
| `agenda_events.parent_id` | M30 : `agenda_events_verrou_auteur` | verrouillée |
| `carnet_items.ajoute_par` | déclencheur `carnet_items_controler` (M18) | verrouillée |
| `carnet_items.child_id` | idem | verrouillée |
| `competences.source` | déclencheur `set_source_competence` (M9b) | verrouillée |
| `absences.signalee_par` | politique UPDATE (check signalee_par = auth.uid()) | verrouillée |
| `messages.sender_id` | M30 : `messages_verrou` + politique | verrouillée |
| `signatures.parent_name` | pas de politique UPDATE | verrouillée |
| `signatures.signed_at` | pas de politique UPDATE | verrouillée |
| `reponses_mot.responsable_id` | déclencheur `reponses_mot_controler` | verrouillée |
| `academic_years.classe_id` | déclencheur `verrou_rattachement_annee` (M18) | verrouillée |
| `academic_years.statut` | déclencheur `verrou_statut_annee` (M19) | verrouillée |
| `foyers.created_by` | M30 : `foyers_verrou_createur` | verrouillée |
| `invitations_responsable.statut` | pas de politique UPDATE | verrouillée |
| `invitations_responsable.expires_at` | M30 : `invitations_expiration` (forcé à 7 jours) | verrouillée |
| `teacher_messages.sender_id` | déclencheur `fils_verrou` | verrouillée |
| `invitations_responsable.expires_at` | M30 : `invitations_expiration` (forcé à 7 jours) | verrouillée |

## 3. (c) Stockage

- Bucket **carnet** : privé (non public), taille max **10 Mo**, types : `image/jpeg,image/png,image/heic,application/pdf`.
- Dépôt : propriétaire = soi (`owner_id`) **et** chemin `<enfant>/<année>/<uuid>.<jpg|jpeg|png|heic|pdf>` sous un enfant dont on est responsable (`carnet_chemin_autorise`). Aucune politique UPDATE (pas d'écrasement).
- Lecture : propriétaire, ou responsable de l'enfant pour un ajout « foyer » (jamais l'ajout privé d'un autre). Suppression : propriétaire seul. Depuis M25 : rien n'est lisible pour un compte / un enfant en cours d'effacement.
- Toujours des **URL signées d'1 h** ; aucun lien public.

## 4. (d) Résultats des tests (base locale, après M30)

Légende : ✔ = refusé / aucune ligne (attendu) ; ✘ = ÉCART. Acteurs : **B** parent d'un autre foyer · **T0** enseignant non rattaché · **ANON** sans compte · **TE** titulaire (lecture seule testée : « ✔ » = ne voit pas, « rôle » = voit ce que son rôle justifie).

| Table | SELECT B/T0/ANON | SELECT TE | INSERT B/T0/ANON | UPDATE B/T0/ANON | DELETE B/T0/ANON |
|---|---|---|---|---|---|
| `absences` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `academic_years` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `access_journal` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `agenda_events` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `alertes_urgence` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `appreciations` | ✔ | rôle | ✔ | ✔ | ✔ |
| `aria_conversations` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `aria_messages` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `bulletins` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `carnet_items` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `checkins` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `child_overview (vue)` | ✔ | · | · | · | · |
| `children` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `class_events` | ✔ | rôle | ✔ | ✔ | ✔ |
| `class_post_reactions` | ✔ | rôle | ✔ | ✔ | ✔ |
| `class_post_seen` | ✔ | rôle | ✔ | ✔ | ✔ |
| `class_posts` | ✔ | rôle | ✔ | ✔ | ✔ |
| `classes` | ✔ | rôle | ✔ | ✔ | ✔ |
| `competences` | ✔ | rôle | ✔ | ✔ | ✔ |
| `deletion_requests` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `demandes_effacement` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `departs_foyer` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `ecoles` | ✔ | rôle | ✔ | ✔ | ✔ |
| `export_history` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `foyers` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `grades` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `invitations_responsable` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `messages` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `mot_carnets` | ✔ | rôle | ✔ | ✔ | ✔ |
| `mot_carnets_statut (vue)` | ✔ | · | · | · | · |
| `mots_liaison` | ✔ | rôle | ✘ B | ✔ | ✔ |
| `mots_liaison_enriched (vue)` | ✔ | · | · | · | · |
| `person_permissions` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `profiles` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `read_receipts` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `reponses_mot` | ✔ | rôle | ✔ | ✔ | ✔ |
| `responsables` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `signatures` | ✔ | rôle | ✔ | ✔ | ✔ |
| `subject_averages (vue)` | ✔ | · | · | · | · |
| `subjects` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `teacher_conversations` | ✔ | rôle | ✔ | ✔ | ✔ |
| `teacher_messages` | ✔ | rôle | ✔ | ✔ | ✔ |
| `transfer_codes` | ✔ | ✔ | ✔ | ✔ | ✔ |

**RPC (fonctions) appelées par B / T0 / ANON avec des identifiants appartenant à Léa** :

| Fonction | B | T0 | ANON |
|---|---|---|---|
| `annuler_effacement` | ✔ refusé | ✔ refusé | ✔ refusé |
| `apercu_depart_carnet` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `apercu_effacement_compte` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `carnet_chemin_autorise` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `compte_en_effacement` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `decoupage_annee` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `demander_effacement_enfant` | ✔ refusé | ✔ refusé | ✔ refusé |
| `depart_du_fil` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `distribuer_mot` | ✔ refusé | ✔ refusé | ✔ refusé |
| `echelle_competences_annee` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `effacements_dus` | ✔ refusé | ✔ refusé | ✔ refusé |
| `enfant_en_effacement` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `enfants_a_effacer` | ✔ refusé | ✔ refusé | ✔ refusé |
| `envoye_aussi_a` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `envoyer_a_tous_les_representants` | ✔ refusé | ✔ refusé | ✔ refusé |
| `est_du_foyer` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `est_titulaire_enfant` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `executer_effacement` | ✔ refusé | ✔ refusé | ✔ refusé |
| `fichiers_a_effacer` | ✔ refusé | ✔ refusé | ✔ refusé |
| `fichiers_orphelins` | ✔ refusé | ✔ refusé | ✔ refusé |
| `fil_enseignant` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `is_responsable` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `journaliser_executions_effacement` | ✔ refusé | ✔ refusé | ✔ refusé |
| `lancer_executer_effacements` | ✔ refusé | ✔ refusé | ✔ refusé |
| `marquer_effacement_execute` | ✔ refusé | ✔ refusé | ✔ refusé |
| `mes_effacements` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `mes_invitations` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `mot_expediteur` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `nb_responsables_carnet` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `peut_lire_fil` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `quitter_carnet` | ✔ refusé | ✔ refusé | ✔ refusé |
| `respond_invitation` | ✔ refusé | ✔ refusé | ✔ refusé |
| `responsables_enfant` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |
| `role_dans_fil` | ✔ aucune donnée | ✔ aucune donnée | ✔ refusé |

**Stockage et cas particuliers** :

| Test | Acteur | Résultat |
|---|---|---|
| contrôle après les appels RPC — ÉTAT | B/T0/ANON | ✔ enfant présent: 1, fils intrus: 0, copies du mot: 1 |
| mots_liaison → mot_carnets — INJECTION mot envoyé à la classe d'un autre | B | ✔ refusé (42501) |
| mots_liaison → mot_carnets — INJECTION mot envoyé à la classe d'un autre | T0 | ✔ refusé (42501) |
| children — SELECT (tout) | T0 | ✔ 0 enfant(s) visible(s) |
| children — SELECT (tout) | TE | ✔ 0 enfant(s) visible(s) (titulaire : l'accès aux enfants passe par les fils et les mots, pas par la fiche) |
| storage carnet — DÉPÔT par le propriétaire (A) | A | ✔ accepté |
| storage carnet — LECTURE (URL signée) du fichier de A | B | ✔ refusé |
| storage carnet — TÉLÉCHARGEMENT du fichier de A | B | ✔ refusé |
| storage carnet — LISTE du dossier de Léa | B | ✔ 0 entrée(s) |
| storage carnet — DÉPÔT sous le dossier de Léa | B | ✔ refusé |
| storage carnet — SUPPRESSION du fichier de A | B | ✔ refusé / sans effet |
| storage carnet — LECTURE (URL signée) du fichier de A | T0 | ✔ refusé |
| storage carnet — TÉLÉCHARGEMENT du fichier de A | T0 | ✔ refusé |
| storage carnet — LISTE du dossier de Léa | T0 | ✔ 0 entrée(s) |
| storage carnet — DÉPÔT sous le dossier de Léa | T0 | ✔ refusé |
| storage carnet — SUPPRESSION du fichier de A | T0 | ✔ refusé / sans effet |
| storage carnet — LECTURE (URL signée) du fichier de A | ANON | ✔ refusé |
| storage carnet — TÉLÉCHARGEMENT du fichier de A | ANON | ✔ refusé |
| storage carnet — LISTE du dossier de Léa | ANON | ✔ 0 entrée(s) |
| storage carnet — DÉPÔT sous le dossier de Léa | ANON | ✔ refusé |
| storage carnet — SUPPRESSION du fichier de A | ANON | ✔ refusé / sans effet |
| storage carnet — DÉPÔT type MIME text/html (extension .jpg) | A | ✔ refusé |
| storage carnet — DÉPÔT extension .exe | A | ✔ refusé |
| storage carnet — DÉPÔT de 11 Mo (limite annoncée : 10 Mo) | A | ✔ refusé |
| storage carnet — DÉPÔT d'un contenu HTML déclaré application/pdf | A | ✔ ACCEPTÉ (le contenu n'est pas inspecté) |
| storage carnet — DÉPÔT avec chemin « ../ » | A | ✔ refusé |
| storage — DÉPÔT dans un bucket inexistant | A | ✔ refusé |
| storage — LISTE des buckets | B | ✔ 0 bucket(s) visibles |

`mots_liaison` ✘ B : un parent peut encore créer un brouillon de mot SANS classe (aucun effet pour autrui) ; le rattachement à une classe d'autrui est refusé depuis M30.

Vues (`security_invoker`) : B, T0, ANON → 0 ligne ou refusé pour `child_overview`, `subject_averages`, `mot_carnets_statut`, `mots_liaison_enriched`.

## 5. (e) Écarts

### Corrigés localement — M30 (`20260928150000_m30_durcissement_audit.sql`, NON appliquée à Paris)

| # | Écart (premier passage) | Correction |
|---|---|---|
| 1 | `compte_en_effacement` : n'importe quel compte connecté savait si un autre compte (UUID connu) est en cours d'effacement | ne répond plus qu'au concerné ou au serveur |
| 2 | `enfant_en_effacement` : idem pour un enfant | ne répond plus qu'à un responsable de l'enfant ou au serveur |
| 3 | `est_titulaire_enfant` : « ce prof est-il titulaire de cet enfant ? » ouvert à tous | réservé au concerné, à un responsable de l'enfant ou au serveur |
| 4 | `appreciations` : un parent pouvait écrire une appréciation sur l'enfant d'un autre foyer | WITH CHECK `est_titulaire_enfant` |
| 5 | `messages` : message rattaché à l'enfant d'un autre foyer (table héritée, inutilisée) | WITH CHECK `is_responsable(child_id)` |
| 6 | `messages` : le destinataire pouvait réécrire le message | déclencheur `messages_verrou` (seuls `is_read` / `read_at`) |
| 7 | `read_receipts` : un étranger pouvait marquer « lu » un mot qui n'est pas dans ses carnets (gonflait « lu par ») | WITH CHECK : le mot doit être dans un carnet dont on est responsable |
| 8 | `mots_liaison` : `classe_id` d'une classe dont on n'est pas titulaire accepté à l'insertion / modification (la distribution était déjà bloquée par déclencheur) | WITH CHECK `is_titulaire_classe` |
| 9 | `agenda_events.parent_id` modifiable (usurper l'auteur) | déclencheur `agenda_events_verrou_auteur` |
| 10 | `children.parent_id` modifiable | déclencheur `children_verrou_createur` (le serveur garde la main) |
| 11 | `children.scolaria_id` modifiable | idem |
| 12 | `foyers.created_by` modifiable | déclencheur `foyers_verrou_createur` |
| 13 | `invitations_responsable.expires_at` libre (invitation qui n'expire jamais) | déclencheur `invitations_expiration` : 7 jours forcés |
| 14 | `profiles.plan` modifiable par l'utilisateur (« premium » à soi-même) | `protect_profile_role` verrouille aussi `plan` |

(Le décompte « 19 écarts » du premier passage regroupe ces lignes ; 2 faux positifs de l'outil ont été corrigés dans le script : lecture des réactions à ses propres annonces par l'enseignant, liste des propres enfants d'un parent.)

### Signalés, NON corrigés (à décider)

| # | Constat | Gravité | Proposition |
|---|---|---|---|
| 1 | **Droits de table très larges** : `anon` et `authenticated` ont tous les privilèges (dont `TRUNCATE`, `TRIGGER`, `REFERENCES`, `DELETE`) sur la quasi-totalité des tables ; seule la RLS protège (elle est activée partout et testée). `TRUNCATE` n'est pas soumis à la RLS mais n'est pas exposé par l'API | moyenne (défense en profondeur) | `REVOKE ALL … FROM anon` sur les tables d'enfants ; `REVOKE TRUNCATE, TRIGGER, REFERENCES FROM authenticated` ; à tester avec toutes les suites avant Paris |
| 2 | **Rôle enseignant non vérifié** : `mots_liaison` (brouillon sans classe) et `appreciations` n'exigent pas `profiles.role = 'enseignant'` ; un parent peut créer ses propres brouillons de mots (sans effet pour les autres) | faible | exiger le rôle à l'insertion, une fois le mode d'attribution du rôle défini (ci-dessous) |
| 3 | **Attribution du rôle « enseignant » indéfinie** : `handle_new_user` ne lit plus le rôle de l'inscription (il vaut « parent ») et `protect_profile_role` interdit de le changer : aucun chemin légitime ne produit un compte enseignant aujourd'hui (comptes de test créés par le serveur) | à décider avant le sprint enseignant | procédure serveur (invitation d'enseignant par l'école, ou validation manuelle) |
| 4 | `profiles.email` modifiable par le propriétaire (copie d'affichage ; l'autorisation passe par `auth.jwt()`, jamais par cette colonne) | faible | verrouiller comme `role` / `plan`, ou supprimer la colonne |
| 5 | **`invitations_select` par l'invité** : lit toutes les colonnes de l'invitation (`child_id`, `invited_by`) sans que son email soit confirmé ; `mes_invitations()` (M24) ne donne que les prénoms | faible | retirer la lecture directe pour l'invité, ne garder que `mes_invitations()` |
| 6 | **Aria sans limite d'appels par utilisateur** (la session est bien vérifiée) : un compte peut générer un coût Anthropic illimité | moyenne (coût, pas données) | plafond par compte et par jour dans l'Edge Function |
| 7 | **Contenu des fichiers non inspecté** : le bucket vérifie l'extension, le type déclaré et la taille, pas le contenu (un HTML déclaré PDF est accepté) ; sans effet d'accès (bucket privé, URL signées, ouverture dans un lecteur système) | faible | vérification des octets de tête (« magic bytes ») à la mise en ligne, côté Edge Function ou à l'ouverture |
| 8 | **Tables inutilisées** gardées avec RLS : `messages`, `deletion_requests`, `export_history`, `transfer_codes`, `access_journal`, `person_permissions`, `appreciations`/`class_*` (sprint enseignant) | faible (surface) | supprimer celles qui ne servent plus (les 5 premières) pour réduire la surface |
| 9 | **Erreurs de clé étrangère** : une insertion qui référence un UUID inexistant renvoie une erreur différente d'un refus RLS (existence d'un identifiant devinable) | très faible | aucune : UUID v4 non devinables |
| 10 | Protection des mots de passe divulgués (`auth_leaked_password_protection`) désactivée : plan Pro | faible | avec le passage au plan Pro (déjà au todo) |

### Hors périmètre de ces tests

- Aucun test de charge ni de déni de service ; pas de test de l'authentification elle-même (liens, mots de passe : voir L3) ; pas d'audit du code de l'app mobile.
- Les tests dynamiques portent sur la **base locale** (même schéma que Paris après M28/M29 ; M30 locale). Paris n'a pas reçu d'écriture.
