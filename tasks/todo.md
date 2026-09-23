# TODO — Scolaria

## Addendum v3.4 · PHASE A : BDD Supabase + sécurité Aria (23 sept 2026)

**Statut : plan M0–M12 VALIDÉ (4 opérations destructives acceptées). Lot 1 (M0 + M1) FAIT le 23 sept. Lot 2 (M2–M4) et lot 3 (M5–M12) : ATTENDRE LE FEU VERT.**

### Étape 2 · état Supabase (constaté le 23 sept)
- Projet `eklpzspvfjfqgqgugmxl` (« Scolaria », eu-west-2) : **en pause (INACTIVE)**, schéma illisible. 0 branche, 0 Edge Function.
- Schéma local (`supabase/schema-complet.sql`, dernier commit 2 mai) : 14 tables (profiles, children, academic_years, subjects, grades, bulletins, mots_liaison, signatures, messages, read_receipts, agenda_events, absences, checkins, aria_conversations/messages), 49 policies — à comparer au schéma réel.
- Décision : l’utilisateur réactive le projet et fait `supabase db dump` (schéma + données) dans `supabase/backups/` (ignoré par Git).
- Règle validée : **garder les noms de tables existants** (children, profiles…) ; toute table présente est modifiée, jamais recréée ; c’est CLAUDE.md qui sera mis à jour.
- [x] Projet réactivé ; sauvegarde schéma + données (voir ci-dessous)
- [x] Schéma réel lu et comparé → écarts listés ci-dessous
- [x] Plan de migration écrit ci-dessous
- [x] Plan validé : 3 lots avec arrêt et test entre chaque lot.

#### Lot 1 · M0 + M1 — FAIT (23 sept)
- [x] M0 : `supabase/migrations/` = seule référence. `20260923140000_baseline.sql` (état réel, enregistrée « appliquée » sans exécution) + 3 fichiers-repères pour les migrations distantes de mars. Anciens `supabase/*.sql` → `docs/archives/sql/`. Scripts inverses dans `supabase/migrations_down/` (hors du dossier lu par la CLI). `supabase migration list` : local = distant (5/5).
- [x] M1 `20260923145605_m1_securite` appliquée : vues en security_invoker + REVOKE anon ; search_path fixé ; handle_new_user non exécutable via l’API ; **profiles.role immuable** hors service_role (trigger `protect_profile_role` + WITH CHECK de `profiles_update`, profil créé par l’utilisateur = parent) ; **enseignants : plus aucune lecture de donnée d’enfant** (3 policies supprimées, children/subjects/grades/checkins réécrites) ; **publications de classe** : responsables d’un enfant de la classe uniquement.
- [x] Tests SQL (transactions annulées) : changement de rôle refusé (42501) ; modification du prénom autorisée ; anon sans accès aux vues ni à handle_new_user ; 0 policy « enseignant » ; 0 publication lisible par tous ; 66 policies (69 − 3).
- [x] Advisors sécurité : **0 ERROR** (3 avant). Restent des WARN : visibilité des tables dans le schéma GraphQL (structure, pas les lignes : la RLS s’applique) ; protection des mots de passe divulgués (réglage du tableau de bord, à activer par l’utilisateur).
- [x] Code : colonne `emoji` retirée de `database.ts` (select des notes, createSubject, createAgendaEvent). tsc OK.
- [x] `nul/` supprimé (export web d’avril, jamais suivi par Git).
- ⚠️ Limite connue : publications de classe rattachées par le texte `classe` (« CE1 » de deux écoles) → vrai identifiant de classe avec le lien enseignant ↔ classe.
- [x] Trigger `on_auth_user_created` vérifié après M1 (compte de test créé le 23 sept à 15:02) : profil créé automatiquement (+4 ms), rôle « parent », email renseigné.
- [ ] Reliquat : 1 compte auth du 21 mars 2026 SANS profil (bug d’inscription de l’époque, corrigé par 5b84de3) → créer son profil ou supprimer le compte (décision utilisateur).

#### Impact des migrations sur le code de l’app
| Migration | Impact | Action |
|---|---|---|
| M1 | `database.ts` : vues `subject_averages` (l. 215), `child_overview` (l. 527) → filtrées par la RLS (voulu). `teacherService` (météo de classe, élèves, ressentis) et `absenceService` côté enseignant → **listes vides** pour un vrai compte enseignant (voulu, démo inchangée). Aucune écriture de `profiles.role` dans l’app. | Colonne `emoji` retirée de `database.ts`. |
| M2 | Accès enfant par `is_responsable()` au lieu de `children.parent_id` : lectures inchangées pour le parent créateur ; `createChild` doit aussi créer le foyer + la ligne responsable (ou trigger). | À traiter dans le lot 2. |
| M3 | `children.color` : type `Child` (ActiveChildContext) + avatar / header de l’Accueil ; données de démo Moreau (couleur par enfant). | Lot 2. |
| M4 | `academic_year_id` nullable : aucune casse ; à renseigner dans les insert (notes, agenda, ressentis…). | Lot 2. |
| M5–M12 | Types de mots (information/…), `mot_carnets`, signatures par responsable, nouvelles tables : services liaison, signatures, absences, carnet. | Lot 3. |


### Étape 2 bis · schéma RÉEL vs fichiers locaux (lu le 23 sept, projet réactivé)
Sauvegarde faite le 23 sept (Docker arrêté → via les outils Supabase) : `supabase/backups/schema-2026-09-23.sql` (44 018 o) et `data-2026-09-23.sql` (1 156 o), ignorés par Git. Contrôle : 27 tables, 29 FK, 31 CHECK, 35 PK/UNIQUE, 30 index, 69 policies, 3 fonctions, 9 triggers, 3 vues = identique à la base. Données : 1 ligne (public.profiles), toutes les autres tables vides. Non sauvegardé : schéma auth (2 comptes — empreintes de mots de passe non lues), tables internes storage.

**Écarts avec `supabase/*.sql` (fichiers locaux périmés) :**
- 12 tables en base absentes des fichiers : access_journal, appreciations, class_events, class_post_reactions, class_post_seen, class_posts, deletion_requests, export_history, person_permissions, teacher_conversations, teacher_messages, transfer_codes.
- 0 table des fichiers absente de la base.
- Colonnes : `agenda_events.emoji` et `subjects.emoji` n’existent plus en base (encore dans les fichiers). ⚠️ `src/services/database.ts:129` sélectionne encore `subjects(name, emoji, color)` → la requête échouera sur un vrai compte.
- Policies : 69 en base contre 49 + 23 + 14 + 1 réparties dans 4 fichiers → les fichiers ne sont plus une source fiable. Désormais : `supabase/migrations/` = seule source (voir M0).

**Non conforme à « toute donnée de carnet → child_id + academic_year_id » :**
| Table | child_id | academic_year_id | Remarque |
|---|---|---|---|
| grades | ✓ | ✗ | |
| agenda_events | ✓ | ✗ | + pas de lien vers le mot source |
| messages | nullable | ✗ | |
| checkins | ✓ | ✗ | |
| subjects | ✓ | ✗ | matières propres à une année |
| absences | student_id ✓ | **text** `''` | type faux (pas de FK) |
| appreciations | student_id sans FK | `academic_year` text | |
| teacher_conversations | student_id sans FK | ✗ | |
| mots_liaison | ✗ (rattaché à `classe` texte) | ✗ | copie par carnet absente |
| signatures | ✓ | ✗ | UNIQUE(mot, élève) empêche la signature des 2 parents |
| bulletins, academic_years | ✓ | ✓ | conformes |

**Failles de sécurité constatées (advisors Supabase + lecture des policies) :**
1. 🔴 Les 3 vues (`child_overview`, `subject_averages`, `mots_liaison_enriched`) sont en SECURITY DEFINER : elles ignorent la RLS. `child_overview` renvoie prénom, classe, école et moyennes de TOUS les enfants à n’importe quel compte, et même à `anon`.
2. 🔴 Toute personne avec `profiles.role = 'enseignant'` lit TOUS les enfants, notes, matières, absences et ressentis (policies *_teacher_* / `children_select` / `grades_*` / `subjects_select` / `checkins_select`). Or le rôle est modifiable par l’utilisateur (`profiles_update` sans restriction de colonne) → n’importe quel parent peut se déclarer enseignant.
3. 🔴 `class_posts`, `class_events`, `class_post_reactions` : SELECT `USING (true)` → tout compte lit les publications de toutes les classes.
4. 🟠 `handle_new_user()` (SECURITY DEFINER) appelable via `/rest/v1/rpc` par anon et authenticated.
5. 🟠 `generate_scolaria_id`, `update_updated_at` : search_path non fixé.
6. 🟠 `checkins_select` : requête incohérente (UNION sans lien réel avec l’enfant).
7. 🟡 Protection contre les mots de passe divulgués (HaveIBeenPwned) désactivée — réglage Auth du tableau de bord.

### Plan de migration Phase A (À VALIDER — rien n’est exécuté)
Règles : noms existants conservés (children, profiles…) ; on modifie, on ne recrée pas ; une migration réversible par sujet dans `supabase/migrations/AAAAMMJJHHMM_sujet.sql`, chacune avec son script inverse `…_down.sql` ; après chaque migration : advisors sécurité + tsc. Les tables sont vides (sauf profiles) : aucune reprise de données lourde.

**Opérations destructives à approuver explicitement** (aucune ne supprime de table ni de colonne) : M1 `DROP VIEW`/re-create en security_invoker ; M2 `DROP POLICY` des policies enseignant trop larges ; M6 `DROP CONSTRAINT` (UNIQUE signatures, CHECK type de mots_liaison) ; M7 `ALTER COLUMN absences.academic_year_id TYPE uuid` (table vide).

- **M0 · Baseline** — `supabase/migrations/…_baseline.sql` = copie du schéma sauvegardé (référence, NON rejouée en base) ; les anciens `supabase/*.sql` déplacés dans `docs/archives/sql/` (déplacement, pas suppression).
- **M1 · Correctifs de sécurité immédiats** — vues en `security_invoker = true` ; `search_path` fixé sur les 2 fonctions ; `REVOKE EXECUTE` de `handle_new_user` pour anon/authenticated ; `REVOKE SELECT` des 3 vues pour anon. Down : état actuel.
- **M2 · Foyers et responsables** — nouvelles tables `foyers (id, nom, created_at)` et `responsables (foyer_id, user_id, child_id, lien, created_at, UNIQUE(user_id, child_id))` ; fonction `is_responsable(child_id)` SECURITY DEFINER STABLE (search_path fixé) ; reprise : un foyer + une ligne responsable par couple children.parent_id (0 enfant aujourd’hui) ; `children.parent_id` conservé (= créateur). Toutes les policies « `children.parent_id = auth.uid()` » réécrites en `is_responsable(child_id)`. Policies enseignant larges RETIRÉES (le lien enseignant ↔ classe viendra avec l’interface enseignant) ; `profiles_update` interdit de modifier `role`. Down : policies d’origine, tables supprimées.
- **M3 · Couleur de l’enfant** — `children.color text NOT NULL DEFAULT '#4338CA'` + CHECK format hex. Down : suppression de la colonne (ajoutée par nous).
- **M4 · Rattachement à l’année** — `academic_year_id uuid NULL REFERENCES academic_years` sur grades, agenda_events, messages, checkins, subjects, signatures, teacher_conversations ; FK `appreciations.student_id → children` + `academic_year_id` ; FK `teacher_conversations.student_id → children` ; index associés. NULL autorisé tant que l’app ne les renseigne pas (passage NOT NULL = migration ultérieure).
- **M5 · Mots de liaison** — `mots_liaison` : `signature_mode text (none|one|both) DEFAULT 'none'`, `event_date timestamptz NULL`, `a_prevoir jsonb NULL` ; nouveau CHECK `type` (information|signature|autorisation|participation) avec correspondance info→information, bon_de_sortie→autorisation ; `requires_signature` conservé (déprécié). Nouvelle table `mot_carnets (mot_id, child_id, academic_year_id, UNIQUE(mot_id, child_id))` = la copie du mot dans chaque carnet (fratrie = une copie par enfant) ; policy parent : via `is_responsable(child_id)` au lieu de `classe`. `agenda_events.mot_id NULL` (événement lié au mot source).
- **M6 · Signatures** — UNIQUE(mot_id, student_id) remplacé par UNIQUE(mot_id, student_id, parent_id) : une signature par responsable. Policy : chaque responsable voit les signatures des enfants dont il est responsable (statut visible par parent).
- **M7 · Absences** — `academic_year_id` text → uuid FK (table vide).
- **M8 · reponses_mot** — `(id, mot_id, child_id, responsable_id, autorisation boolean NULL, participation text NULL CHECK (oui|peut_etre|non), created_at, UNIQUE(mot_id, child_id, responsable_id))` + RLS responsable.
- **M9 · competences** — `(id, child_id, academic_year_id, domaine, competence, niveau smallint CHECK 1-4, source text CHECK (ecole|parent), saisi_par uuid, date, created_at)` + RLS responsable.
- **M10 · carnet_items** — `(id, child_id, academic_year_id, categorie CHECK (mot|livret|souvenir|jalon), fichier text, date, ajoute_par uuid, visibilite CHECK (foyer|prive) DEFAULT 'foyer', created_at)` ; RLS : `foyer` → responsables de l’enfant, `prive` → auteur seul. Bucket Storage privé (URLs signées 24 h) : migration séparée plus tard.
- **M11 · Alertes du protocole d’urgence** — `alertes (id, child_id NULL, auteur uuid, categorie CHECK (suicide|harcelement|maltraitance), created_at)` — jamais le texte du message ; RLS : auteur + responsables de l’enfant ; écriture par l’Edge Function uniquement. Notification des responsables : étape suivante.
- **M12 · Publications de classe** — `class_posts` / `class_events` / `class_post_reactions` : SELECT réservé aux responsables d’un enfant de la classe (remplace `USING (true)`).
- **Code (hors migration, après M3/M4)** — `database.ts:129` : retirer `emoji` du select ; données de démo Moreau : ajouter `color` à chaque enfant (Léa, Lucas, Emma) dans `demo-children.json` / `ActiveChildContext` ; CLAUDE.md § Architecture BDD mis à jour avec les noms réels (children, profiles…).
- **Hors SQL (tableau de bord)** — activer la protection des mots de passe divulgués (Auth → Password security).

Ordre proposé : M0 → M1 (sécurité, tout de suite) → M2 → M3 → M4 → M5/M6 → M7 → M8–M11 → M12.


### S · Sécurité Aria
- [x] S1 : aucune clé `sk-ant-` dans l’historique Git (toutes branches) ; `eas.json` propre depuis `6f641b9`. La clé était dans `.env` (non suivi) → `extra` → APK, et dans les variables EAS (supprimées par l’utilisateur, clé révoquée).
- [x] S2 : Edge Function `supabase/functions/aria/index.ts` (SDK `npm:@anthropic-ai/sdk`) : session Supabase obligatoire (JWT + getUser), modèle / max_tokens / fallbacks fixés côté serveur, garde-fous de taille, réponse `{ text }` ou `{ error: "unavailable" }`. App : `supabase.functions.invoke("aria")` ; mode démo = réponses locales sans réseau (vérifié en web).
  - Modèle : `claude-sonnet-5` par défaut (décision : coût), surchargeable sans redéployer par le secret `ARIA_MODEL`. Repli automatique DÉSACTIVÉ : un refus du modèle → « Aria est momentanément indisponible. ». L’ancien code utilisait `claude-sonnet-4-20250514`.
  - Minimisation : le contexte envoyé à Aria ne contient que le PRÉNOM (plus de nom de famille, d’école ni d’identifiant Scolaria) — `childContext.ts`.
  - Protocole d’urgence : `supabase/functions/_shared/emergency.ts` (module partagé). Edge Function : contrôle AVANT tout appel au modèle → message fixe 3114 / 3018 / 119 + 112, aucun appel Anthropic, alerte journalisée (catégorie + user id, jamais le texte). App : même contrôle, y compris en mode démo (vérifié en web). 22 cas de test (`npm run test:emergency`), dont les pièges violon / violent / violette / « ces devoirs vont me tuer » / « en finir avec les devoirs ».
  - TEMPORAIRE : le prompt système est encore construit côté app (données de démo locales). Quand les données seront en base, la fonction construira elle-même le contexte depuis child_id sous RLS et n’acceptera plus de `system` du client.
- [x] S3 : clés retirées de `app.config.js` (extra), `getEnv.ts` (+ journaux qui affichaient 12 caractères de la clé), `scripts/write-env.js`, `eas-hooks/eas-build-pre-install.sh`, `.env.example`, `.env`. `.env` déjà ignoré ; `supabase/backups/` ajouté au .gitignore.
- [x] Google Vision : la clé était embarquée mais **jamais utilisée** (aucun appel OCR dans le code) → retirée sans Edge Function. Le futur OCR suivra le même modèle (fonction dédiée + secret).
- [x] S4 : toute panne d’Aria → « Aria est momentanément indisponible. » (plus de mention de clé, .env, eas.json).
- [x] S5 : secret ANTHROPIC_API_KEY posé par l’utilisateur (tableau de bord) ; fonction déployée le 23 sept (`functions deploy aria --use-api`, Docker arrêté) : ACTIVE, verify_jwt. Contrôles faits : sans en-tête → 401 passerelle ; clé anon sans session → 401 `unavailable` (y compris phrase d’urgence).
- [x] Test Redmi (compte de test, 23 sept) — question normale : « indisponible ». Journaux : 1 appel, HTTP 500 AVANT tout appel Anthropic ; cause = secret ANTHROPIC_API_KEY contenant un retour à la ligne (Deno refuse l’en-tête). La valeur ressemble à l’ANCIENNE clé de .env (même coupure). ⚠️ L’erreur Deno a recopié la clé dans les journaux de la fonction.
  - Corrigé et redéployé (v2) : secret contrôlé (absent / espace / retour à la ligne → 503 + journal SANS la valeur) ; journaux d’erreur limités à statut / type / nom (jamais le message brut) ; succès journalisé avec le modèle ; 404 → « vérifier ARIA_MODEL ».
  - Compte réel sans enfant : contexte neutre envoyé à Aria (plus les données de démo de Léa).
  - [x] Utilisateur : anciennes clés révoquées, nouvelle clé posée sur une ligne, aucune clé dans .env.
  - [x] Retest Redmi (23 sept, 18:30) : journaux de la fonction → 1 exécution, « réponse Anthropic OK », modèle **claude-sonnet-5**, stop_reason end_turn, 0 erreur ; phrase d’urgence → 0 alerte serveur et aucune autre exécution (interceptée dans l’app) → Anthropic non appelé. (Ligne HTTP de la passerelle pas encore ingérée au moment du contrôle ; le 200 se déduit du chemin de code après « OK ».)
- [x] Phrase d’urgence (Redmi) : message correct ; journaux : AUCUN appel à la fonction pour ce message (détection côté app) → Anthropic non appelé.
  - [x] Numéros cliquables dans les bulles d’Aria (tel:3114 / 3018 / 119 / 112, pas les décimaux) ; ordre selon la catégorie (numéro concerné en premier, 112 en dernier) — `buildEmergencyMessage(category)`, testé (22 cas + 3 messages).
- [x] Compte orphelin du 21 mars supprimé par l’utilisateur.
- [ ] Protocole d’urgence — suites :
  - [x] Liste de mots-clés validée ; « en finir » seul remplacé par « envie d’en finir » / « en finir avec la vie » ; « me tuer » limité à une intention en 1re personne (pas l’hyperbole).
  - [x] 3020 → 3018 partout (hors service depuis le 1er janvier 2024 ; 3018 = numéro unique harcèlement + cyberharcèlement, e-Enfance, 7j/7 9h-23h) : code, message d’urgence, JoyAlerts, MonRessenti, CLAUDE.md, VISION.md. 112 conservé.
  - [ ] **Phase A** : table d’alertes (child_id + academic_year_id, catégorie, horodatage, jamais le texte du message) + notification des responsables légaux de l’enfant.
  - Ne pas ajouter la réponse « indisponible » / « urgence » à l’historique envoyé au modèle au tour suivant.

## Top bar · voile au défilement (23 sept 2026)

**Statut : FAIT. tsc OK, contrôlé en web. À REVÉRIFIER SUR LE REDMI.** Annule le fond opaque de la 0-ter (choix de design : jamais de bandeau opaque).
- [x] `components/navigation/ScrollVeil.tsx` : un seul voile haut/bas, dégradé vertical #F2F1EE (opaque du bord jusqu’au milieu de la barre, puis fondu 24 px), opacité 0 → 1 sur 16 px de scroll. Plus de BlurView pour les barres.
- [x] `TopbarScrollContext` : `scrollY` partagé (Reanimated) + `useTopbarScrollHandler()` (useAnimatedScrollHandler, republie le scroll de l’écran au focus)
- [x] Branché sur Accueil, Notes (2 vues : maternelle + collège), Agenda (jour + liste Devoirs), Messages
- [x] Top bar transparente ; pills claires sur le header indigo de l’Accueil au repos, sombres dès que le voile apparaît (inactives : icône à 60 % au lieu de 50 % pour le contraste sur #F2F1EE)
- Reste hors périmètre : BlurView encore utilisés dans AddToDiscussionSheet, JoyAlerts, JoyHistory, Portfolio, MonRessenti (à évaluer sur Android)

## Phase 0-ter · retours du test Android de la 0-bis (23 sept 2026)

**Statut : FAIT. tsc OK, contrôlé en web. À REVÉRIFIER SUR LE REDMI.**
- [x] Symbole : login et pill Aria rendaient DÉJÀ ScolariaSymbol. Les « tirets » venaient de la géométrie de référence à petite taille (ellipses de 1,4 × 2,8 px à 14 px). Ajout d’une géométrie compacte sous 32 px (mêmes 8 ellipses et angles, plus pleines). `CrownShapes` exporté et réutilisé par AriaOrb (qui avait sa propre copie avec les <G rotation> imbriqués). Icônes « sparkles » d’Aria remplacées par ScolariaSymbol : RGPD (Effacement, Export, Permissions), À propos, Météo classe, badge « Observé par Aria », onglet Aria de l’espace élève.
- [x] ~~Top bar opaque #F2F1EE~~ : annulé, remplacé par le voile au défilement (section du dessus)
- [x] « Mon compte » : lignes en ligne selon §8. Cause : `Pressable` natif + style en fonction `({ pressed }) => [...]`, ignoré sur Android (même cause que les cartes Agenda en 0-bis). Correctif global : le `Pressable` de `components/ui` résout lui-même la fonction de style, 43 fichiers redirigés. insets.bottom posé sur le conteneur de la feuille. La phase 0 n’avait remplacé aucun `gap` (seulement Pin et AjouterEnfant en 0-bis, réécrits en marges).
- [x] Initiales : `utils/childInitials.ts`, une lettre du prénom, deux si un autre enfant du foyer a la même initiale (Léa → Lé, Lucas → Lu). Appliqué : top bar, sélecteur, menu burger, Mon compte, ChildAvatar.

### Phase A/B · enfant actif incohérent (constaté sur le Redmi, NE PAS toucher avant)
- La top bar, « Mon compte », Messages et l’Emploi du temps n’utilisent pas le même enfant actif.
  - Top bar, Mon compte, Messages : `useActiveChild()` (ActiveChildContext) mais selon des chemins différents (`selectedChild` / `selectedChildId` / `getConversations(selectedChild.id)`) à réconcilier.
  - Emploi du temps : données démo codées en dur pour Emma 4ème (`TimetableScreen.tsx:70`), sans lien avec l’enfant sélectionné.
  - À traiter avec la source unique d’enfant actif (phase A/B).

## Phase 0-bis · retours du test Android (23 sept 2026)

**Statut : FAIT. tsc OK, contrôlé en web. À REVÉRIFIER SUR LE REDMI.**
- [x] ScolariaLogo : fontFamily Rufina_700Bold (au lieu de "Rufina-Bold"), fontWeight retiré
- [x] ScolariaSymbol : 8 ellipses en transform="rotate(22.5 + angle)", plus de <G rotation> imbriqués
- [x] Cartes Agenda §7 : TouchableOpacity, borderLeft 3px couleur, fond rgba(couleur, 0.08), radius 14, padding 10/12
- [x] Bas d’écran : getBottomChromeHeight() partagé par le voile flou et getBottomBarScrollPadding() (padding = voile + 12) ; conversation : « Aria peut résumer » au-dessus du champ
- [x] Messages : FAB supprimé (JSX, styles, import Plus) ; l’action reste le ✏️ de la bottom bar
- [x] Bouton « Tools » : FAB d’expo-dev-menu, dev client uniquement (absent des builds release), rien à changer dans le code
- [x] TextInput Figtree (wrapper ui) : 17 fichiers redirigés
- [x] PinScreen et AjouterEnfantScreen en clair : fond #F2F1EE, textes #0F172A, inputs §5, bouton primaire §2 (+ icônes lucide, gap → marges)
- Reste : Phase B (FAB Agenda vs + bottom bar, voir plus bas)

## Addendum v3.4 · PHASE 0 : nettoyage des anciennes décisions (22 sept 2026)

**Statut : FAIT (22 sept 2026). Liste validée, Q1-Q5 acceptées. tsc OK, vérifié en localhost (web). Commit 5116cca. Retours Android traités en phase 0-bis.**
Périmètre : aucun changement de BDD, aucun nouvel écran.

### Réalisé
- [x] Fonds → #F2F1EE : tokens `SCREEN_BACKGROUND`, `C.bg`, `PAGE_BG_OFF_WHITE`, `SchoolMode.bg`, `TabNavigator` (conteneur principal), 8 constantes locales, NotesScreen, EditProfile (fond sombre dégradé supprimé), thème React Navigation (`App.tsx`, fond des cartes de navigation `rgb(242,242,242)` → #F2F1EE), pdfExport
- [x] Emoji de matières : 121 clés JSON retirées (demo-agenda 100, demo-subjects 21), mocks + types (Agenda, Notes, DemoContext), `subjectEmoji` (SubjectDetail), cercle emoji des cartes Agenda + emoji des pills de type de la modale Agenda
- [x] Violets → #4338CA (104 remplacements + halo PIN) ; `Colors.violet*`, `tokens.accent/info`, `SchoolMode.accent` ; bloc « Child theme accents » retiré de tailwind.config.js
- [x] `constants/themes.ts` supprimé ; ChildThemeContext réduit à un passe-plat ; SchoolModeContext : thème unique (plus d'`ariaEmoji`, de « Aria Coach », de `headerGradientFull`)
- [x] Figtree par défaut : `Text` de `src/components/ui` (graisse → variante Figtree, fontWeight retiré) + `cssInterop` pour les className ; 66 fichiers redirigés de `react-native` vers `components/ui` ; DMSans → Figtree (9) ; tailwind `fontFamily` → Figtree. Contrôle web : 157 textes visibles en Figtree, 0 en police système.
- [x] `LogoScolaria.tsx` (Barlow/DM Sans) supprimé, remplacé par `ScolariaLogo` dans À propos
- [x] BurgerMenu : « Le carnet de scolarité numérique »
- [x] 25 dégradés décoratifs → fonds unis ; ~20 tuiles à bordures colorées → `rgba(15,23,42,0.06)`
- [x] Couleur enfant (Q1) : avatar top bar, sélecteur, profil et header Accueil en indigo neutre #4338CA (texte du header passé en blanc, dégradé vertical)

### Restes signalés (hors liste validée)
- ~~Écrans encore sombres (PinScreen, AjouterEnfant)~~ : faits en phase 0-bis.
- Emoji en état vide de l'Agenda (« Journée libre 🏖️ ») : ce n'est pas une carte, conservé.
- ~~TextInput en police système~~ : fait en phase 0-bis.
- `SuperPowerBadge.tsx` : jamais monté (seul son type est importé), à supprimer lors d'un nettoyage.
- Imports `LinearGradient` inutilisés déjà présents avant la phase 0 : AgendaScreen, MessagesListScreen, SignDocScreen.
- ~~ScolariaLogo Rufina-Bold~~ : corrigé en phase 0-bis.

### Phase B · écart à corriger (NE PAS toucher avant)
- **FAB Agenda** : CLAUDE.md prévoit un FAB circulaire sur l'Agenda et **aucune** action dans la bottom bar (« Agenda → rien, le FAB suffit »). Le code fait l'inverse : pas de FAB, et un `+` dans la bottom bar (`BottomBar.tsx:58`, `TabNavigator.tsx:659` `agendaActionRef`). À aligner en Phase B.

#### NAVIGATION (décision validée)
- Top bar : [☰ burger] [onglets] ... [avatar enfant]. On GARDE le burger (ne pas le supprimer même si CLAUDE.md dit autre chose : la doc sera mise à jour).
- ☰ burger → écran unique « Famille & paramètres ».
- Avatar → sélecteur d'enfant UNIQUEMENT (liste des enfants + indicateur de nouveauté + ajouter un enfant). Plus de réglages dans ce sélecteur.
- Supprimer l'ouverture du menu par swipe (conflit avec le pager).

#### FUSION RÉGLAGES → « Famille & paramètres » (base visuelle : écran Mon compte actuel)
- Structure : Mes enfants · Responsables légaux · Mon profil · Apparence (fond de l'Accueil PAR ENFANT : couleur de l'enfant ou photo nature, un seul système) · Notifications (3 réglages max : mots & messages / résumé 18h / silence 20h–7h) · Aria (activée, personnalité, langue saisie vocale) · Confidentialité & données (code, autorisations, export) · Système (haptique) · Compte (aide, à propos, quitter la démo / déconnexion).
- Supprimer l'ancien écran Réglages et ses entrées hors sujet : Capacités, Connecteurs, Liens partagés, Thème Auto, fonds dégradés abstraits.
- Supprimer le doublon « Résumé quotidien 8h00 » d'Aria.
- Ne pas déranger → 20h–7h.
- « Face ID » affiché sur Android → libellé selon la plateforme.


#### Phase 2 · protocole d’urgence en production
- La détection par mots-clés (`supabase/functions/_shared/emergency.ts`) est une solution de DÉMO. En production : détection plus robuste (contexte, formulations indirectes, fautes, langage enfant/ado), validée par le comité éthique avant mise en service.

#### AUTRES
- Écran Aria sur un compte SANS enfant : affiche « Comment va Léa aujourd’hui ? » et d’autres suggestions tirées des données de démo en dur → suggestions et titres liés à l’enfant actif (ou génériques s’il n’y a aucun enfant).
- Écran Aria : suggestions en cartes 2×2 avec emoji → pills horizontales (règle CLAUDE.md).
- Accueil : notes /20 et carte Aria sur Emma affichées pour Léa (GS) → toutes les données liées à l'enfant actif.
- Enfant actif incohérent entre top bar, sélecteur, Messages et Emploi du temps (codé en dur pour Emma) → une seule source (détail : section « Phase A/B · enfant actif incohérent »).
- Agenda : FAB prévu par CLAUDE.md, action + actuellement dans la bottom bar → à aligner (détail : « FAB Agenda » ci-dessus).
- Header de l'Accueil : carte 130px arrondie (CLAUDE.md), couleur de l'enfant.

### Contrôle préalable
- Un seul CLAUDE.md projet (`./CLAUDE.md` v3.1). Les autres CLAUDE.md sont dans `.claude-plugin/` (plugins tiers, gitignorés), donc hors sujet.
- Un seul addendum, `docs/archives/ADDENDUM_v3.4_Scolaria.md`, rangé au bon endroit.

### a) Fonds de page ≠ #F2F1EE
Cause racine : les tokens valent `#F7F7F5` (ancien fond). Corriger à la source suffit pour ~30 écrans.
- `src/constants/colors.ts:2` : `SCREEN_BACKGROUND = '#F7F7F5'` (utilisé par ~20 écrans et par `tokens/colors.ts`, `themes.ts`)
- `src/constants/design.ts:10` : `C.bg = '#F7F7F5'` (Accueil, Agenda, Messagerie, EventDetail, GradeDetail, Homework, SignDoc, SignSuccess, DeepScreenHeader)
- `src/constants/theme.ts:101` : `PAGE_BG_OFF_WHITE = '#F7F7F9'`
- **`src/navigation/TabNavigator.tsx:874` : conteneur principal `#F2F2F7`**, visible derrière toutes les stacks (contentStyle transparent l. 246-306)
- `src/contexts/SchoolModeContext.tsx:72,91` : `bg` / `backgroundColor` `#F2F2F7` (lus par AjouterAnneScreen:301, EleveTabNavigator:34,56,83,105,207)
- Constantes locales : `ConnexionScreen.tsx:18`, `EditProfileScreen.tsx:42`, `InscriptionScreen.tsx:11`, `LoginScreen.tsx:8` (`BG = '#F7F7F5'`) ; `MonRessentiScreen.tsx:30`, `ProfilEnfantScreen.tsx:64,660` (`'#F2F4F8'`)
- En dur : `NotesScreen.tsx:1996,2016` (`#F7F7F5`) ; `EditProfileScreen.tsx:451` (root `#1F1F2E`, sombre)
- Fonds de panneau `#F2F2F7` : `UniversalInputBar.tsx:244,257`, `chat/AddToDiscussionSheet.tsx:252`
- Hors appli : `services/pdfExport.ts:117,261,277,303` (`#F7F7F5` dans le HTML exporté)

### b) Emoji sur les matières
- Données de démo : `src/data/demo/demo-agenda.json` (100 lignes avec `"emoji"`), `src/data/demo/demo-subjects.json` (21 lignes, domaines maternelle + matières)
- `src/screens/NotesScreen.tsx:108` (type `emoji: string`), `:182,190` (mock matières), `:1164,1294` (repli `'📚'`). NB : pas affiché dans Notes (l. 399 retire déjà les pictogrammes).
- `src/screens/SubjectDetailScreen.tsx:5,40,155,187,256` : param `subjectEmoji` **affiché** en en-tête (aucun appelant ne le passe aujourd'hui)
- `src/screens/AgendaScreen.tsx:91` (type), `:123-125` (`NEW_EVENT_TYPE_EMOJI`), `:193-195` (`DEFAULT_EMOJI`), `:210-234` (mock), `:521,564`, **`:777-780` : cercle emoji affiché dans chaque carte Agenda** (interdit aussi par la règle « jamais d'emoji dans une card Agenda »)
- `src/services/database.ts:129` : `select('*, subjects(name, emoji, color)')`. Lecture seule, pas de changement de schéma. On ignore simplement le champ côté UI.
- Page « Personnaliser matières » : **n'existe pas dans src/**, rien à corriger.

### c) FAB non circulaires
- `src/screens/MessagerieScreen.tsx:1339-1368` : **déjà conforme** (48×48, radius 999, bottom 72, right 14)
- **Agenda : pas de FAB.** L'ajout passe par le `+` de la bottom bar (`BottomBar.tsx:58`, `TabNavigator.tsx:659`), ce qui contredit CLAUDE.md (« Agenda → rien, le FAB suffit »). → [UNCLEAR] voir Q2
- Commentaires obsolètes : `AgendaScreen.tsx:9-10` (« FAB: black square-rounded »), `messagerie/MessagesListScreen.tsx:8` (FAB inexistant)

### d) Thèmes par niveau / couleur enfant / #7C3AED
- `src/contexts/SchoolModeContext.tsx:1-9` : doc « maternelle chaude / primaire cosmique / lycée blanc » ; `:83-87` accent `#7C3AED` ; `:92` `headerGradientFull` bleu `#1E3A5F→#3B7DD8→#89B4E8` (non lu) ; `:104,111,118` `ariaEmoji` 🧸/✦/🎯 (non lu) ; `:112,119` `ariaLabel` « Aria ✦ » / « Aria Coach » (lu par `EleveTabNavigator.tsx:210`)
- `src/contexts/ChildThemeContext.tsx:49-53` : table thème par enfant (ambre/ocean/lavande), sans effet ; `:66` commentaire violet
- `src/constants/themes.ts` (103 l.) : `CHILD_THEMES` à 9 thèmes dont violet `#7C3AED`. **Aucun import : code mort.**
- `src/tokens/colors.ts:17,18,22,39,44` : `accent`/`info` `#7C3AED` / `#A78BFA`
- `src/constants/colors.ts:19-21` : `Colors.violet #6D28D9`, `violetLight #7C3AED`, `violetDark #5B21B6` (source de la majorité des violets ci-dessous)
- `src/constants/theme.ts:108` : commentaire « thème enfant Violet »
- `src/screens/EditProfileScreen.tsx:45` : `CHILD_COLORS` avec `#7C3AED`
- Couleur de l'enfant : **n'existe pas dans le modèle** (`ActiveChildContext.tsx:27-37`, pas de champ `color`). Avatar top bar = dégradé fixe `#818cf8→#6366f1` (`TopBar.tsx:146`) ; avatar du sélecteur = `#818cf8` (`ChildSelectorSheet.tsx:205`) ; header de l'Accueil = dégradé fixe multicolore mauve/rose/orange de 440 px (`AccueilScreen.tsx:123-135`). → [UNCLEAR] voir Q1
- Violets interdits (#7C3AED, #6D28D9, #8B5CF6, #A78BFA, #C4B5FD, #EDE9FE, rgba(124,58,237), Colors.violet*, C.violet, VIOLET), fichier : lignes
  - `components/ConseilDuMatin.tsx` : 51,233 · `GlobalChildSwitcher.tsx` : 26,36,148 · `chat/TypingIndicator.tsx` : 44 · `checkin/RessentiSlider.tsx` : 7,36
  - `profile/JoyAlerts.tsx` : 331,344 · `profile/JoyHistory.tsx` : 50 · `profile/Portfolio.tsx` : 7,40,114 · `profile/SuperPowerBadge.tsx` : 41
  - `contexts/WallpaperContext.tsx` : 95
  - `data/demo/demo-agenda.json` : 2,9,14,19,24,30,33,39,48,56,92 · `demo-dashboard.json` : 11,29,48 · `demo-subjects.json` : 8,14
  - `screens/AProposScreen.tsx` : 73,97,244,259,266,316,321,326,378,476
  - `screens/AgendaScreen.tsx` : 197,198,211,221,225,230,524,566
  - `screens/AjouterEnfantScreen.tsx` : 233,415,416,443,474
  - `screens/ArchivedYearDetailScreen.tsx` : 48,298 · `HomeworkScreen.tsx` : 87,88 · `MessagerieScreen.tsx` : 59
  - `screens/MonParcoursScreen.tsx` : 84,254,378 · `MonRessentiScreen.tsx` : 68 · `SignalerAbsenceScreen.tsx` : 78
  - `screens/NotesScreen.tsx` : 737,810-812,1033,1050,1069,1505,1513,1717,1725,2165,2177,2196,2261,2347,2377,2426,2433,2449
  - `screens/PinScreen.tsx` : 31,154,306
  - `screens/ProfilEnfantScreen.tsx` : 66,142,167,180,209,210,223,248,272,280,290,316,604,662,740,753,760,765,804,814,823,836
  - `screens/TextSizeScreen.tsx` : 83,116,122 · `WallpaperPickerScreen.tsx` : 187,201
  - `messagerie/EcoleListScreen.tsx` : 68 · `messagerie/MessagesListScreen.tsx` : 218,485 · `messagerie/MotDetailScreen.tsx` : 119
  - `rgpd/EffacementScreen.tsx` : 386
  - `teacher/AppreciationsScreen.tsx` : 278,279,312,313,344,345,430,459,461,473,481,514,519,521 · `teacher/MeteoClasseScreen.tsx` : 318,325 · `teacher/TeacherDashboardScreen.tsx` : 201 · `teacher/VieDeClasseScreen.tsx` : 190,375,392,395,422,504,505,520
  - `services/pdfExport.ts` : 68,82,104,114,125,268,292,299,379

### e) Polices (DM Sans, Barlow, système)
- `src/components/LogoScolaria.tsx` : **ancien logo** « SCOL » en BarlowCondensed + « aria » en DMSans avec dégradé (l. 26-27, 51-56, 74). Utilisé par `AProposScreen.tsx:36,167,277`. Viole aussi la règle « police uniforme, pas de traitement spécial sur ia ».
- `src/navigation/EleveTabNavigator.tsx:36,58,85` : `fontFamily: 'DMSans_700Bold'` (police non chargée, donc repli système)
- `tailwind.config.js:76-78` : `fontFamily.heading/body = ["System"]` (0 usage de `font-heading/font-body`)
- **Aucune police par défaut globale** : tout `<Text>` sans `fontFamily` s'affiche en police système. Fichiers sans aucune référence à Figtree :
  `ConseilDuMatin.tsx` (10 Text), `GlobalChildSwitcher.tsx` (6), `profile/SuperPowerBadge.tsx` (9), `AjouterAnneScreen.tsx` (28), `teacher/AbsencesEnseignantScreen.tsx` (15), `teacher/TeacherDashboardScreen.tsx` (40)
  + 193 `className="font-bold|semibold|…"` NativeWind (graisse système) dans : ChatBubble, ConseilDuMatin, GlobalChildSwitcher, JoyAlerts, SuperPowerBadge, AjouterAnne, AjouterEnfant et les 7 écrans teacher/
- `fontWeight` numérique combiné à une Figtree (sur Android, peut basculer en police système) : `RessentiSlider.tsx:57`, `TopBar.tsx:264`, `AccueilScreen.tsx:301,308`, `AriaConversationScreen.tsx:797`, `AriaHomeScreen.tsx:825`, `MonRessentiScreen.tsx:447`, `NotesScreen.tsx:2090,2117,2293`, `ProfilEnfantScreen.tsx:813,864,910`
- `services/pdfExport.ts:103,291` : `-apple-system, 'Segoe UI'` (PDF, hors appli)
- [UNCLEAR] `ScolariaLogo.tsx:54,65,76,87` : `fontFamily="Rufina-Bold"`, alors que la police est chargée sous le nom `Rufina_700Bold`. À vérifier sur appareil.

### f) Symbole ✧ et dégradé #8B5CF6 → #1B72E8
- **0 occurrence.** Déjà propre.
- Dégradés « faux Aria » violet→cyan hors contexte Aria : voir i).

### g) Graphie « ScolarIA »
- **0 occurrence** dans src/, app.config.js, package.json, eas.json. (`design.ts:2` « SCOLARIA » est un commentaire en capitales, pas un problème.)
- Traitement spécial de « aria » dans le wordmark : `LogoScolaria.tsx` (voir e).

### h) Tagline « copilote »
- **0 occurrence** de « copilot* ».
- Taglines non conformes (« passeport scolaire ») : `components/BurgerMenu.tsx:192` (« Passeport scolaire numérique ») ; `AjouterEnfantScreen.tsx:226` ; `i18n/locales/*.ts` `slide1Desc` (clés onboarding **non utilisées**, aucun `t('onboarding…')`).
- Conforme : `LoginScreen.tsx:26` « Le carnet de scolarité numérique ».

### i) Tuiles à bordures colorées / micro-dégradés (design de mars)
- Micro-dégradés décoratifs (hors Aria, hors wallpaper) :
  `NotesScreen.tsx:1032,1049,1068,1590,1632,1976` · `ProfilEnfantScreen.tsx:271,279,289` · `ArchivedYearDetailScreen.tsx:297` (`#7C3AED→#06B6D4`) · `EditProfileScreen.tsx:224,303` · `AjouterEnfantScreen.tsx:232,441,471` · `AjouterAnneScreen.tsx:359,375` · `PinScreen.tsx:80,153` · `profile/SuperPowerBadge.tsx:136,235` · `EventDetailScreen.tsx:138` · `TopBar.tsx:146` (avatar) · `teacher/*` : Absences:181, Appreciations:262,429, MeteoClasse:208,317, TeacherDashboard:151, VieDeClasse:357,421
- Dégradés conformes (Aria ou carte Aria) : AriaActionCard:135, AriaInlineCard:23, ChatBubble:112, ConseilDuMatin:220, JustifierAbsenceSheet:160, GradientButton:56, UniversalInputBar:153, Accueil:242, Bulletin:191, ConversationDetail:77
- Bordures colorées sur des tuiles : `teacher/CahierLiaisonScreen.tsx` (7 : 181,229,247,486…) · `teacher/AppreciationsScreen.tsx` (3) · `profile/SuperPowerBadge.tsx` (3, dont 232) · `AjouterEnfantScreen.tsx` (2) · `AjouterAnneScreen.tsx:240` · `AProposScreen.tsx` · `TeacherDashboardScreen.tsx:213` (orange) · `MessagerieParentsScreen.tsx` · `rgpd/PermissionsScreen.tsx` · `aria/AriaActionCard.tsx:160,172,177,219,247` · `MonRessentiScreen.tsx:464` · `teacher/MeteoClasseScreen.tsx:315` · `TextSizeScreen.tsx:83,116` + `WallpaperPickerScreen.tsx:187` (sélection violette)

### Questions à trancher avant correction
- **Q1 [UNCLEAR] Couleur de l'enfant** : le champ n'existe pas. Proposition phase 0 : ne pas le créer (ce serait de la donnée, donc hors phase 0). Supprimer tout le reste (themes.ts mort, table ChildThemeContext, accent violet), et passer l'avatar et le header de l'Accueil sur un neutre indigo `#4338CA` en attendant la phase qui ajoutera `students.color`.
- **Q2 [UNCLEAR] FAB Agenda** : il n'existe pas (c'est le `+` de la bottom bar). Proposition : ne rien ajouter en phase 0 (ce serait un nouvel élément d'UI) et le noter pour la phase Agenda.
- **Q3 Espaces enseignant / élève / sandbox** : les inclure dans le balayage ? Proposition : oui pour fond, violet et polices ; non pour le bandeau orange enseignant (thème de rôle, pas de niveau).
- **Q4 pdfExport.ts** (HTML exporté) : proposition : fond et violet oui, police non (Figtree n'est pas embarquée dans le PDF).
- **Q5 Emoji non-matière** (activités extrascolaires de ProfilEnfant, compétences d'Appreciations, ConseilDuMatin, Score de Joie) : proposition : on les garde (contenu autorisé), on ne retire que les emoji matière et Agenda.

### Plan de correction (après validation)
1. Tokens à la source : `SCREEN_BACKGROUND`, `C.bg`, `PAGE_BG_OFF_WHITE` → `#F2F1EE` ; `Colors.violet*`, `tokens.accent/info`, `SchoolMode.accent*` → `#4338CA` ; `TabNavigator:874` + `SchoolMode.bg` → `#F2F1EE`
2. Constantes locales et valeurs en dur (a, d)
3. Emoji matière : retrait des clés JSON, des types, des mocks et du cercle emoji dans les cartes Agenda ; retrait de `subjectEmoji`
4. Thèmes : suppression de `constants/themes.ts`, de la table ChildThemeContext, des `ariaEmoji` / `ariaLabel` par niveau, de `headerGradientFull` ; doc SchoolModeContext
5. Polices : police Figtree par défaut sur `Text` (un seul point d'entrée) + DMSans → Figtree + `LogoScolaria` → `ScolariaLogo` + suppression de `LogoScolaria.tsx`
6. Micro-dégradés hors Aria → aplat ; bordures colorées de tuiles → `rgba(15,23,42,0.06)`
7. Taglines « passeport » → « Le carnet de scolarité numérique » / « carnet »
8. `tsc --noEmit`, vérification localhost, pas de build EAS ; mise à jour de lessons.md

---

# Historique · UI Sprint v3.0

## Sprint v3.0 — COMPLÉTÉ (5 mai 2026)

### Fondations
- [x] `src/constants/design.ts` — tokens C, RADIUS, SHADOW, BOTTOM_BAR_HEIGHT
- [x] `src/components/WhiteCard.tsx` — carte blanche Android-safe (2 Views)
- [x] `src/components/DeepScreenHeader.tsx` — header écrans profonds
- [x] `src/components/AriaInlineCard.tsx` — card Aria gradient EEF2FF→F0FDFA

### Écrans mis à jour
- [x] `AccueilScreen.tsx` — fix gap Android, pattern 2-Views todayListWrap/recentCard, tokens C

### Nouveaux écrans deep
- [x] `HomeworkScreen.tsx` — cahier de texte Emma 4ᵉB
- [x] `TimetableScreen.tsx` — emploi du temps
- [x] `EventDetailScreen.tsx` — détail événement agenda
- [x] `GradeDetailScreen.tsx` — détail note + sparkline SVG
- [x] `SignDocScreen.tsx` — signature autorisation
- [x] `SignSuccessScreen.tsx` — confirmation signature

### Onboarding
- [x] `src/screens/onboarding/OnboardingSplashScreen.tsx`
- [x] `src/screens/onboarding/OnboardingSignupScreen.tsx`
- [x] `src/screens/onboarding/OnboardingSchoolCodeScreen.tsx`
- [x] `src/screens/onboarding/OnboardingLinkChildScreen.tsx`

### Navigation
- [x] `TabNavigator.tsx` — 6 nouveaux écrans enregistrés dans leurs stacks

## Pending — Sprint v3.1
- [ ] NotesScreen v3 redesign (sparkline Figtree, pills matières, cartes extensibles)
- [ ] AgendaScreen v3 (FAB cercle, event cards sans emoji)
- [ ] MessagerieScreen v3 (search toolbar, conversation rows avec tags)
- [ ] AriaScreen v3 (topbar spécifique, suggestions centré, input Aria)
- [ ] `npx expo run:android` — test visuel des nouveaux écrans
- [ ] EAS build quand tout est validé localhost
