# Audit Fable — 11 novembre 2026

> **Lecture seule.** Aucune ligne de code applicatif modifiée, aucune migration, aucun déploiement, aucune écriture en production. Seul ce fichier a été créé.
> **Sources** : base de production `Scolaria-Paris` (`nmizwmymhqleasnxcyvu`, région **eu-west-3 Paris**) lue par MCP (policies, fonctions, vues, déclencheurs, buckets, advisors, Edge Function déployée) ; dépôt `C:\Users\admin\Scolaria`, branche `main`, commit `b8fd947` (arbre propre).
> **Non fait, et pourquoi** : (1) branche git `audit-fable` non créée : depuis cette session, git pose des verrous qu'il ne peut pas retirer (suppression de fichiers désactivée) ; le fichier est donc non suivi sur `main`. (2) Aucun test dynamique de RLS : pas de Docker / Supabase local accessible ici ; les conclusions RLS viennent de la **lecture** des policies et fonctions réelles, pas d'une exécution. La suite existante `npm run audit:securite-local` (670 tests, 2 oct.) n'a pas été rejouée. (3) `tsc` et lint non lancés. (4) Rien n'a été vu sur un appareil.
> **Contexte** : le projet est bien plus avancé que ne le supposait la consigne. Un audit de sécurité (2 oct., `tasks/audit-securite.md`) et un audit Android (18 sept., `tasks/android-audit.md`) existent déjà ; M30 à M36 sont en production. Cet audit est donc **différentiel** : il vérifie l'état réel et cherche ce qui reste.

---

## CRITIQUE

### C1 — Aria : le texte d'un message de détresse est stocké sur le téléphone et renvoyé au modèle au message suivant
- **Où** : `src/screens/aria/AriaConversationScreen.tsx:236-267` ; `supabase/functions/aria/index.ts` étape 4 (identique en production, version 2).
- **Preuve** : l'app ajoute le message du parent à `historyRef` (`{ role: 'user', content: trimmed }`, l.258-262) et le persiste dans AsyncStorage (`@scolaria_aria_messages`, `@scolaria_aria_history`), **quelle que soit la réponse**, donc aussi quand `sendToAria` a renvoyé le message fixe d'urgence. Le titre de la conversation reprend les 40 premiers caractères du premier message (l.237). Au message suivant, tout l'historique part dans `messages` ; le serveur ne teste que `messages[messages.length - 1]`.
- **Risque** : deux règles absolues tombent : « jamais le texte d'un message de détresse stocké » et « protocole d'urgence = aucun appel au modèle ». Le texte reste en clair sur l'appareil et atteint Anthropic dès que le parent écrit autre chose.
- **Correctif** : (app) sur urgence, ne rien ajouter à l'historique ni au stockage, afficher une bulle « message non conservé », ne pas en faire un titre ; (serveur) tester **tous** les messages `user` reçus et répondre par le message fixe si l'un déclenche. Test à ajouter à `test:emergency`.
- **Effort** : 2 à 3 h, plus redéploiement de `aria`.

### C2 — « Bien-être » : un message de détresse est enregistré en base et lisible par l'autre responsable
- **Où** : `src/screens/MonRessentiScreen.tsx:98-150` et `:169`, `:254` ; `src/services/database.ts:291-311` ; policy `checkins_select` ; écran atteint par la recherche (`QuickSearchScreen.tsx:20` → `BienEtreScreen`).
- **Preuve** : `detectEmergency(message)` sert seulement à afficher les numéros ; l'envoi appelle quand même `createCheckin({ message })`, qui insère dans `checkins.message`. La policy de lecture est `is_responsable(child_id)` : tout responsable de l'enfant lit la ligne. La colonne `is_confidential` n'est utilisée par **aucune** policy, alors que l'écran affiche « 🔒 Confidentiel ».
- **Risque** : texte de détresse stocké en base (règle absolue) ; promesse de confidentialité fausse ; en garde partagée, le parent B lit ce que le parent A (ou l'enfant, téléphone tendu) a écrit.
- **Correctif** : si urgence → ne pas enregistrer le texte (enregistrer le ressenti sans `message`, plus une ligne `alertes_urgence`) ; retirer le badge « Confidentiel » ou rendre le champ réellement privé à son auteur (colonne auteur + policy). Table vide aujourd'hui : aucun rattrapage de données.
- **Effort** : 2 h (app) + 1 petite migration si l'on garde le champ.

---

## IMPORTANT

### I1 — Aria : le serveur ne garantit pas « prénom seulement » et sert de relais libre vers le modèle
- **Où** : `supabase/functions/aria/index.ts` (`system` accepté du client, `MAX_SYSTEM_CHARS = 40000`, `MAX_MESSAGES = 40`, `MAX_TOKENS = 16000`, 40 appels / jour / compte).
- **Preuve** : le prompt système est écrit par l'app (`src/services/ariaApi.ts`) ; l'app n'y met que prénom + niveau, mais n'importe quel compte peut appeler la fonction avec son propre prompt. Le commentaire « TEMPORAIRE (phase A) » le reconnaît.
- **Risque** : la minimisation repose sur l'app, pas sur le serveur ; coût : un compte gratuit peut consommer chaque jour 40 appels à 16 000 jetons de sortie avec un gros contexte.
- **Correctif** : prompt système construit côté serveur à partir de `child_id` (prénom lu sous RLS) ; `max_tokens` ≈ 1 500 ; refuser tout `system` client.
- **Effort** : 0,5 jour.

### I2 — Un seul des deux responsables peut supprimer une année scolaire du carnet partagé
- **Où** : policy `academic_years_delete` (`is_responsable(student_id)`) ; clés étrangères `bulletins_academic_year_id_fkey` (CASCADE), les autres en SET NULL.
- **Preuve** : la suppression n'est bloquée que pour la dernière année (`ensure_child_has_year`). Supprimer une année efface ses bulletins ; supprimer l'année active détache l'enfant de sa classe (`classe_id`), donc des mots de l'enseignant.
- **Risque** : contraire à l'esprit « un enfant ne peut être supprimé que par son unique responsable » : destruction unilatérale de données communes. Non exécuté (lecture seule).
- **Correctif** : suppression d'année réservée au responsable unique, ou seulement pour une année « importée » créée par soi ; jamais l'année active.
- **Effort** : 2 h + tests SQL.

### I3 — Garde partagée : impossible d'avoir deux foyers pour le même enfant
- **Où** : `respond_invitation` (l'invité reçoit toujours le `foyer_id` de l'invitant) ; `est_du_foyer`, `fils_select`.
- **Preuve** : aucune fonction ni policy ne permet de créer un second foyer pour un enfant ; `responsables` n'a aucune policy d'UPDATE. Deux parents séparés sont donc dans le même foyer et partagent les fils « foyer » avec l'enseignant. Les fils « individuel » restent bien privés.
- **Risque** : ta décision de septembre (« parents séparés : chacun son fil ») n'est pas réalisable aujourd'hui. Ce n'est pas une fuite au sens de CLAUDE.md, c'est un écart avec la décision produit.
- **Correctif** : choix à l'invitation (« même foyer » / « autre foyer »), ou action « je ne vis pas dans ce foyer ». **Décision à prendre avant de coder.**
- **Effort** : 1 jour (SQL + écran + tests).

### I4 — « Lu » d'un mot : rattaché au parent seul, et illisible par l'enseignant
- **Où** : table `read_receipts` (colonnes `mot_id`, `parent_id`, unique sur ces deux colonnes ; pas de `child_id`) ; unique policy `rr_owner`.
- **Preuve** : un mot envoyé à une fratrie est « lu » pour tous les carnets à la première lecture (règle « donnée rattachée à l'enfant » non tenue ; indicateur de nouveauté par enfant faussé). Aucune policy ne laisse l'enseignant lire les accusés : `liaisonService.ts:476` reçoit toujours zéro ligne.
- **Risque** : « 22/24 familles ont lu » est impossible en données réelles.
- **Correctif** : ajouter `child_id` (+ année), unicité (mot, enfant, parent), lecture par l'expéditeur du mot (`is_mot_teacher`), ou une vue de comptage comme `mot_carnets_statut`.
- **Effort** : 0,5 jour.

### I5 — Interface enseignant : aucune lecture réelle possible, et promesses non tenues
- **Preuve (base)** : aucune policy ne donne à un enseignant la lecture de `children`, `academic_years`, `absences`, `checkins`. Liste de classe, absences déclarées par les parents, météo de classe : rien ne peut s'afficher hors données factices.
- **Preuve (code)** : `sendRelanceNotification`, `sendNewMotNotification` (`liaisonService.ts:552-560`) et `absenceService.ts:353` sont des coquilles ; les écrans annoncent « Les parents ont été notifiés » (déjà noté dans `todo.md`).
- **Risque** : ne pas mettre un enseignant réel devant ces écrans.
- **Effort** : c'est le sprint « Interface enseignant MVP » entier (plusieurs jours), pas une correction.

### I6 — Notifications : absentes
- **Preuve** : aucun jeton push enregistré, aucun envoi serveur ; réglages retirés le 6 oct. (`lessons.md`). Les règles « prénom dans chaque push », « résumé 18 h », « silence 20 h – 7 h » n'ont donc rien à vérifier.
- **Effort** : 2 à 3 jours (jetons, Edge Function d'envoi, 3 réglages, tests iOS et Android).

### I7 — Vert / rouge et pourcentages sur des données
- `src/screens/SubjectDetailScreen.tsx:55-59` (`performanceColor` vert / orange / rouge) et `:92-93` (tendance « En hausse » en vert).
- `src/screens/teacher/MeteoClasseScreen.tsx:71-74` et `src/services/teacherService.ts:276-277` : Score de Joie en **pourcentages** et en couleurs côté enseignant.
- Règles : « jamais de vert/rouge sur les données », « tendance en mots, jamais de %, y compris côté enseignant ». **Effort** : 2 h.

### I8 — Comparaison à la classe
- 30 occurrences de `class_avg` / `classAvg` (colonne `grades.class_avg`, vue `subject_averages`, `childContext.ts`, libellés i18n « moyenne de classe »). Règle « pas de comparaison entre enfants » : une moyenne de classe en est une. **À trancher** (collège / lycée seulement ?) ; non vérifié écran par écran.

### I9 — Modèle de données : tables héritées rattachées au parent seul
- `access_journal`, `deletion_requests`, `export_history`, `person_permissions`, `transfer_codes` : clé `family_id = auth.uid()`, aucun `child_id` fiable ni année. `messages` : `child_id` nullable, destinataire libre. `rgpdService.ts` utilise encore `transfer_codes`.
- `person_permissions.modules` est une matrice de modules par personne, contraire à l'esprit « jamais de matrice ».
- **Correctif** : supprimer ce qui est inutilisé (après sauvegarde), ou le rattacher à l'enfant. **Effort** : 0,5 jour.

### I10 — Promesses RGPD à vérifier avant toute famille réelle
- « Journal d'accès consultable par le parent » : `access_journal` est vide et rien ne l'alimente (aucune écriture trouvée dans `src/`). **Non tenu.**
- « URLs signées 24 h » : durée non vérifiée dans cet audit.
- « Chiffrement AES-256 at-rest » : dépend de Supabase ; `tasks/verifier-chiffrement-disque.md` existe, résultat non relu.

---

## MINEUR

- **M1** — `academic_year_id` nullable sur 14 tables de carnet ; rempli par le déclencheur `set_academic_year` seulement s'il existe une année active.
- **M2** — `bulletins.period` n'accepte que « Trimestre 1/2/3 » et « Annuel » ; `appreciations.trimestre` (1 à 3) : incompatibles avec périodes / semestres du primaire.
- **M3** — Colonnes en double : `children.classe`, `school`, `age`, `parent_id` (créateur) à côté de `academic_years` et `responsables` ; noms recopiés (`student_name`, `parent_name`) dans `absences`, `signatures`, `teacher_conversations`.
- **M4** — Valeurs par défaut `#22D3EE` (cyan du dégradé de l'assistant) pour `subjects.color` et `agenda_events.color` ; `AgendaScreen.tsx:223-224` s'en sert comme couleur de catégorie.
- **M5** — Dégradé indigo → cyan sur l'export PDF (`src/services/pdfExport.ts:107`, `:257`) ; `TopBar.tsx:300` (`shadowColor '#6366F1'`).
- **M6** — `BlurView` encore présent : `AddToDiscussionSheet.tsx:130`, `Portfolio.tsx:31`, `MonRessentiScreen.tsx:229`, `ProfilEnfantScreen.tsx` (pas dans les barres ; instable sur Android selon `ScrollVeil.tsx`).
- **M7** — `SandboxNavigator` (accès enfant par PIN) et `EleveTabNavigator` existent et sont routés (`App.tsx:110-114`) alors que CLAUDE.md dit « aucune interface enfant » en primaire et « Phase 2 » pour l'élève. `SandboxNavigator.tsx:22` importe `Pressable as RNPressable` depuis `react-native` (règle absolue).
- **M8** — Journal serveur : `console.warn('[aria] ALERTE…', { category, user })` écrit l'identifiant du compte avec la catégorie dans les journaux Supabase. Pas de texte, mais c'est une trace hors de la table privée.
- **M9** — Advisors Supabase : protection « mots de passe compromis » désactivée ; `pg_net` dans `public` (connu) ; 48 policies `auth_rls_initplan`, 21 `multiple_permissive_policies`, 10 clés étrangères sans index (connus, `warns-attendus.md`).
- **M10** — `handle_new_user` : `search_path = public` sans `pg_temp`, et erreurs avalées (`EXCEPTION WHEN OTHERS`).
- **M11** — `carnet_fichiers_suppression` : le déposant peut supprimer un fichier encore référencé par un ajout « foyer » (ligne sans fichier).
- **M12** — `aria_conversations` : aucune policy de suppression ; tables Aria en base inutilisées par l'app (l'historique vit dans AsyncStorage).
- **M13** — `.mcp.json` (non versionné) contient une clé d'un service tiers en clair. Elle est passée dans ma lecture : à renouveler si tu veux être strict.
- **M14** — Edge Function `aria` déployée = version du 4 oct. ; le dépôt a une version du 11 oct. (nom de l'assistant paramétré). Même comportement de sécurité.

---

## A. Sécurité — ce qui a été vérifié et qui tient

| Point | Résultat |
|---|---|
| RLS activée | **Toutes** les tables `public` (41). Aucun privilège de table pour `anon`. |
| Un responsable ne lit que ses enfants | Oui : `is_responsable()` partout (teste aussi compte / enfant en cours d'effacement). |
| `visibilite = prive` | Étanche en table (`carnet_items_select`) **et** en fichier (`carnet_fichiers_lecture`). |
| Fils privés parent ↔ enseignant | Oui : `peut_lire_fil`, `fils_select` ; participants verrouillés (`fils_verrou`). |
| `profiles.role` / `plan` / `email` | Non modifiables par l'utilisateur (`protect_profile_role`) ; inscription toujours « parent ». |
| S'ajouter comme responsable | Impossible : aucune policy d'INSERT ; `respond_invitation` exige un email confirmé et identique. |
| Retirer un autre responsable | Impossible (`responsables_delete_self`) ; dernier responsable protégé. |
| Supprimer un enfant à 2 responsables | Impossible : aucune policy DELETE ; `demander_effacement_enfant` exige exactement 1 responsable. |
| SECURITY DEFINER | 56 fonctions, toutes avec `search_path` fixé ; les 32 appelables vérifient l'appelant ; fonctions de service révoquées aux comptes. |
| Vues | 4 vues, toutes `security_invoker = true` (dont `mot_carnets_statut`). |
| Buckets | `carnet` et `child-photos` **privés**, types et tailles limités, chemins `<enfant>/<année>/…` contrôlés. |
| Clé Anthropic | Secret Supabase uniquement ; `.env` = URL + clé publique Supabase ; `.env` ignoré par git. |
| Numéros d'urgence | 3114 / 3018 / 119, 112 en dernier ; **aucun 3020** dans le code ni dans les docs du dépôt. Cliquables : non revérifié à l'écran. |
| Effacement différé | Tâche quotidienne : 43 succès, 1 échec (401 le 2 oct., avant la clé), dernier passage le 11 nov. 03:30. |
| M30 | **Appliquée** à Paris (constaté : verrous et contrôles présents), alors que `todo.md` la dit encore « en attente » à un endroit. |

## B. Conformité aux règles absolues (recherche dans `src/`, 254 fichiers)

| Règle | Résultat |
|---|---|
| Pressable / Text / TextInput depuis `react-native` | 0 import sur une ligne ; 1 exception : `SandboxNavigator.tsx:22` importe `Pressable as RNPressable` depuis `react-native`. |
| `#7C3AED`, `#8B5CF6`, `#1B72E8` | 0 (un commentaire). |
| Police hors Figtree / Rufina | 0. |
| `box-shadow` | 0. |
| `height: '100%'` | 4 : `Portfolio.tsx:165`, `SubjectDetailScreen.tsx:320`, `NotesScreen.tsx:882` et `:896`. |
| `overflow: 'visible'` | `constants/theme.ts:149` ; `AriaHomeScreen.tsx:761,775` ; `AriaConversationScreen.tsx:741,755`. |
| Vert / rouge sur données | Voir I7 (22 occurrences de verts, dont une partie décorative). |
| Dégradé de l'assistant hors assistant | Voir M4, M5. |
| BlurView dans les barres | 0 ; 4 usages ailleurs (M6). |
| Trimestres en primaire | Code du Suivi correct (`utils/competences.ts`, jamais « T1 ») ; restes : textes de démo enseignant, tables (M2). |
| Push sans prénom | Sans objet (I6). |
| Titre répété, boutons non-pill, FAB, vue multi-enfants | **Non vérifié** (demande une lecture écran par écran ; 111 `borderRadius` de 8 à 16 à trier). |

## C. Écarts CLAUDE.md ↔ base réelle

- Tables réelles absentes de CLAUDE.md : `teacher_conversations`, `teacher_messages`, `class_posts`, `class_events`, `class_post_reactions`, `class_post_seen`, `read_receipts`, `checkins`, `subjects`, `appreciations`, `agenda_events`, `aria_*`, `departs_foyer`, `demandes_effacement`, `journal_executions_effacement`, `aria_usage_quotidien`, et les 5 tables héritées (I9).
- `messages` est décrite comme « messagerie hub » : la messagerie réelle passe par `teacher_conversations` / `teacher_messages`.
- `signatures` : conforme (unique mot + enfant + parent ; statut par la vue).
- Index : corrects sur les clés de carnet ; 10 clés étrangères sans index (advisors).

## D. Android (Yoga) — liste statique, rien vu sur appareil

1. `height: '100%'` : 4 lignes (section B).
2. `overflow: 'visible'` : 5 lignes (section B) ; les deux écrans de l'assistant ont déjà une branche Android.
3. Ombres sans `elevation` (plus de `shadowOpacity` que d'`elevation`) : `AddToDiscussionSheet`, `UniversalInputBar`, `constants/design.ts`, `constants/theme.ts`, `AriaHomeScreen`, `AriaConversationScreen`, et 7 écrans `screens/teacher/*`.
4. Style fonction sur Pressable : 38 usages, sans risque tant que l'import vient de `components/ui` (vrai partout sauf `SandboxNavigator`).
5. Écrans avec liste défilante sans `getBottomBarScrollPadding` : 19 (pages profondes pour la plupart, où la barre basse est peut-être masquée — **à confirmer** avant de corriger) : `rgpd/*` (3), `AjouterEnfant`, `Homework`, `GradeDetail`, `messagerie/MotDetail`, `QuickSearch`, `SignSuccess`, `AjouterAuCarnet`, `FamilleParametres`, `Timetable`, `EventDetail`, `Inscription`, `WallpaperPicker`, `SignDoc`, `Bulletin`, `Pin`, `APropos`.
6. `flex: 1` manquants, champs de saisie écrasés : **non vérifié** (demande l'appareil ou une lecture écran par écran).

**Bloc de correctifs proposé** : remplacer les 4 `height: '100%'` par `flex: 1` (ou `StyleSheet.absoluteFill` pour les deux calques de `NotesScreen`) ; ajouter `elevation` aux 13 fichiers du point 3 ; trancher le point 5 écran par écran sur le Redmi.

## E. Addendum v3.4 — état réel

| # | Point | État | Reste |
|---|---|---|---|
| 1 | Nettoyage des anciennes décisions | **Fait** pour l'essentiel | I7, I8, M4 à M7 : 1 jour |
| 2 | Foyer multi-responsables + signature par parent | **Fait** en base et en production (invitation, retrait, effacement, signature par parent, vue de statut) | I2, I3 ; emails d'invitation (Brevo, liens) non configurés : 1 à 2 jours |
| 3 | Notes → Suivi | **Fait** (B3a / B3b) | — |
| 4 | Ajouter au carnet | **Fait** (2 ajouts réels en base, fichiers privés) | ouverture des fichiers hors dossier public (todo) |
| 5 | Types de mots, lu / signé, agenda par les mots | **Partiel** : côté parent fait ; « lu » faux par fratrie et invisible de l'enseignant (I4) ; relances factices ; cases « À prévoir » locales au téléphone ; agenda alimenté par les mots **non vérifié** | 2 à 3 jours hors interface enseignant |
| 6 | Notifications | **Absent** (I6) | 2 à 3 jours |

## F. Incohérences documentaires (signalées, non corrigées)

- **Les fichiers du Projet claude.ai sont périmés** : la version de VISION.md jointe à la conversation contient encore « 3020 » et « OVH France », celle de CLAUDE.md est la 3.2. Dans le dépôt (CLAUDE.md du 7 oct., VISION.md du 5 oct.) : **aucune** occurrence de « OVH » ni de « 3020 » hors la phrase qui l'interdit. → Remplacer les 3 fichiers du Projet par ceux du dépôt.
- Hébergement réel : Supabase, région Paris (eu-west-3). Charte PDF `ScolarIA_Charte_Ethique_v1.pdf` : nom avec « IA » en majuscules et, d'après `todo.md`, formulation d'hébergement à refaire. Non relue ici.
- VISION.md §5 : « accès via PIN 4 chiffres, bac à sable » en primaire ↔ CLAUDE.md : « pas d'accès autonome, aucune interface enfant » (et le code contient les deux, M7).
- VISION.md : tarif établissements privés « à revoir » ; projections « à recalculer ».
- CLAUDE.md « contexte envoyé : prénom seulement » ↔ code : prénom **et niveau** (`ariaApi.ts`).
- `todo.md` : M30 marquée « non appliquée » à un endroit alors qu'elle est en production.

---

## TOP 10 (impact × effort)

| # | Action | Gravité | Effort |
|---|---|---|---|
| 1 | C1 — détresse : ne plus stocker ni renvoyer le texte (app + serveur) | Critique | 2-3 h |
| 2 | C2 — Bien-être : ne pas enregistrer le texte de détresse ; « Confidentiel » vrai ou retiré | Critique | 2 h |
| 3 | I1 — prompt système côté serveur, `max_tokens` réduit | Important | 0,5 j |
| 4 | I2 — suppression d'année : plus possible seul à deux responsables | Important | 2 h |
| 5 | I7 — retirer vert / rouge et pourcentages des données | Important | 2 h |
| 6 | I4 — « lu » par enfant, lisible par l'expéditeur | Important | 0,5 j |
| 7 | I3 — décider puis coder le second foyer (parents séparés) | Important | 1 j |
| 8 | F — remplacer les fichiers du Projet claude.ai par ceux du dépôt | Mineur, immédiat | 5 min |
| 9 | I9 + M7 — supprimer tables et écrans hérités (PIN, élève, RGPD factice) | Important | 0,5-1 j |
| 10 | I6 — notifications réelles (bloquant avant tout enseignant) | Important | 2-3 j |

*Arrêt ici. Aucun chantier commencé.*
