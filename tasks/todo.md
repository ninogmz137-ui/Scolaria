# TODO — Scolaria

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
