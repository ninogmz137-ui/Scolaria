# Audit Android — Scolaria (dev client, Redmi Note 9S · Android 11 · MIUI 12.5)

*Généré le 2026-09-18 · lecture seule de `src/` + `App.tsx` · aucun fichier de code modifié.*
*Périmètre : `src/`, `App.tsx`, `app.config.js`, `eas.json`. Ignorés : `node_modules`, `.expo`, `dist`, `build`, `android`, `ios`.*

> **Mise à jour 2026-09-19 (session 0)** : les 39 fichiers morts du §5 et `FloatingTabBar` sont supprimés ; les 55 usages de ses constantes utilisent maintenant `getBottomBarScrollPadding(insets.bottom)`. Les numéros de ligne ci-dessous datent d'avant ce nettoyage ; les passages sur les fichiers morts ou la barre flottante sont historiques.

## Comment lire ce document

- **Gravité** — `bloquant` : flux inutilisable ou donnée fausse montrée à un testeur · `visible` : défaut d'affichage ou de cohérence qu'un testeur remarque · `mineur` : dette, non visible seul.
- **[mort]** : le fichier n'est importé par aucun fichier vivant (voir §5). Un défaut dans un fichier mort n'est pas visible à l'écran ; il est listé à part et compté à part.
- **[UNCLEAR]** : cause non prouvée par la lecture du code. Je n'ai pas vu l'écran : tout ce qui est marqué comme cause probable est une hypothèse à vérifier sur l'appareil.
- Méthode : lecture des fichiers concernés + recherches automatiques (regex et petits scripts Node qui analysent les blocs `StyleSheet.create`). Les scripts ne sont pas conservés dans le dépôt (seul ce fichier devait être créé). Les commandes de recoupement sont en annexe D.
- Limite : analyse statique. Les hauteurs, insets et positions réels (Redmi Note 9S, navigation 3 boutons ou gestes) n'ont pas été mesurés.

## Synthèse chiffrée

| Mesure | Valeur |
|---|---|
| Fichiers `.ts/.tsx` dans `src/` | 179 (≈ 54 000 lignes) |
| Fichiers morts (aucun importeur vivant) | **39** (≈ 7 500 lignes) — dont `SettingsScreen.tsx`, `NotificationsScreen.tsx`, `AuthScreen.tsx`, les 4 écrans `onboarding/*` |
| `gap` dans un style `flexDirection: 'row'` | **159** clés `StyleSheet` + 35 `gap` hors row + 140 `className="…gap-…"` NativeWind + `style={{ gap }}` inline · 68 fichiers |
| `#7C3AED` (violet solide interdit) dans le code vivant | **36** occurrences (+9 dans des fichiers morts) |
| Constantes de `FloatingTabBar` (jamais monté) utilisées comme marge basse | **55** lignes ; seulement 14 tiennent compte de `insets.bottom` ; `getBottomBarScrollPadding()` (le bon helper) : **0** utilisateur |
| `fontSize < 11` | 52 occurrences (dont beaucoup sont les tokens `sectionLabel`/`meta` de CLAUDE.md, voir §I) |
| Imports / variables inutilisés (`tsc --noUnusedLocals`) | 101 |
| Clés `EXPO_PUBLIC_*` sensibles embarquées dans le bundle | 2 (Anthropic, Google Vision) |

---

# 1. Bugs constatés à l'écran — diagnostic

## Bug 1 — AccueilScreen affiche les mêmes données pour tous les enfants · **bloquant**

**Cause racine : ce n'est pas un problème d'ID, c'est que l'écran ne lit aucune donnée par enfant.**

| Fichier:ligne | Extrait | Constat |
|---|---|---|
| `src/screens/AccueilScreen.tsx:29-32` | `const demoTodo = [{ kind:'signer', title:'Sortie Orsay' … }, { kind:'justifier', title:'Absence lundi' … }]` | constante de module, identique pour tous |
| `AccueilScreen.tsx:34-37` | `const demoAujourdhui = [{ id:'controle', title:'Contrôle Maths' … }, …]` | idem |
| `AccueilScreen.tsx:39-43` | `const demoGrades = [{ subject:'Mathématiques', grade:'16' … }, … '15', '13']` | idem (notes /20 aussi pour Léa, maternelle) |
| `AccueilScreen.tsx:45` | `const demoAriaMessage = 'Emma a un contrôle maths demain — …'` | prénom d'Emma en dur, rendu ligne 252 |
| `AccueilScreen.tsx:112,117` | `const { selectedChild } = useActiveChild(); const prenom = selectedChild?.name?.split(' ')[0] ?? 'Camille'` | **seul usage de l'enfant actif** : le prénom (l'avatar vient de `TopBar`) |
| `AccueilScreen.tsx:154-222` | `demoTodo.map`, `demoAujourdhui.map`, `demoGrades.map` | rendu direct des constantes |

**Comparaison avec les écrans qui fonctionnent**

| Écran | Source de données | Clé utilisée |
|---|---|---|
| `NotesScreen.tsx:1093-1096, 1124, 1133-1134` | `useDemoData().getSubjects(selectedChild.id)` / `getGrades(...)` + `DEMO_PROFILES[selectedChild.id]` (`:211-260`) | `selectedChild.id` (`demo-emma`, `demo-lucas`) |
| `MessagerieScreen.tsx:309, 476` | `getConversations(selectedChild.id)` → `stores/messagerieStore.ts:27` → `CONVERSATIONS_BY_CHILD` (`data/messagerieData.ts:281-283`) | `selectedChild.id` (`demo-lea` / `demo-lucas` / `demo-emma`) |

Les données par enfant **existent déjà** et ne sont pas utilisées par Accueil : `DemoContext.tsx:198-229` expose `getAgenda`, `getGrades`, `getMots`, `getDashboard` (fichiers `demo-agenda.json`, `demo-grades.json`, `demo-mots.json`, `demo-dashboard.json`, tous indexés par `childId`). `demo-dashboard.json` contient même déjà `courseDuJour`, `prochainEvent`, `competencesAcquis` pour Léa (maternelle, sans notes). Aucun écran n'appelle `getDashboard` ; `getMots` n'est utilisé que par `MessagesListScreen.tsx:185`, pas par Accueil.

**Cohérence des IDs enfants (leçon 2026-04-17)**

- Schéma canonique **`demo-lea` / `demo-lucas` / `demo-emma`** : identique dans `contexts/ActiveChildContext.tsx:42-44`, `data/demo/demo-children.json`, `contexts/ChildThemeContext.tsx:50-52`, `data/messagerieData.ts`, `services/childContext.ts:56,85,176`, `screens/NotesScreen.tsx:212,258`. **Le chemin démo est cohérent.**
- Restes de l'ancien schéma `'1'/'2'/'3'` — voir §A.3.
- Le chemin **Supabase** (vrais UUID, `ActiveChildContext.tsx:103-130`) ne trouve aucune donnée démo : `messagerieStore.ts:28 → store[childId] ?? []`, `NotesScreen` `DEMO_PROFILES[uuid] → undefined`, `ProfilEnfantScreen.tsx:194-195 default → Emma`, `MonParcoursScreen.tsx:56 default → années d'Emma`. À traiter au moment du branchement Supabase (session 7).

## Bug 2 — Écran Autorisation affiche « Emma · 4eB » pour Léa · **bloquant**

Même symptôme, cause plus simple : **l'écran n'utilise pas `useActiveChild` du tout.**

| Fichier:ligne | Extrait |
|---|---|
| `src/screens/SignDocScreen.tsx:26-33` | `const DOC = { title:"Sortie Musée d'Orsay", child:'Emma · 4ᵉB', date:'Vendredi 9 mai 2026', … }` puis `:99 <RecapRow label="Enfant" value={DOC.child} />` |
| `src/screens/SignSuccessScreen.tsx:68,69,77,85` | `Emma est inscrite à la sortie d'Orsay.` · `La classe de 4ᵉB, vendredi 9 mai 2026.` · `value="Emma · 4ᵉB"` · `…à l'agenda d'Emma` |
| `src/screens/GradeDetailScreen.tsx:251` | `Féliciter Emma` |
| `src/screens/HomeworkScreen.tsx:3, 244` | en-tête « devoirs d'Emma » · `subtitle="Emma · 4ᵉB"` |
| `src/screens/TimetableScreen.tsx:70` | données « Mardi 5 mai, Emma 4ème » |
| `src/screens/BulletinScreen.tsx:32` | `childName: 'Emma'` (défaut) |
| `src/components/JustifierAbsenceSheet.tsx:33-39` | 4 modèles de message « Emma a été absente… » (ouverte depuis Accueil pour n'importe quel enfant) |

En plus : la classe d'Emma n'est jamais la même selon la source (voir §3, données démo).

## Bug 3 — En-tête de page profonde superposé à la top bar · **bloquant** (≈ 20 écrans)

**Qui rend la top bar :** `src/navigation/TabNavigator.tsx:889-898` — un unique `<TopBar>` **frère** du contenu des onglets (`<TabContentWithNav />` :901), en `position: 'absolute'`, `zIndex: 20`, `paddingTop: insets.top + 10` (`components/navigation/TopBar.tsx:85, 186-190`). Le voile de flou (`:867-888`) et la `<BottomBar>` (`:932-947`) sont rendus de la même façon. Ils ne font **pas** partie des écrans.

**Qui rend l'en-tête de page :** chaque écran profond, lui-même. Soit `DeepScreenHeader` (utilisé par `SignDocScreen`, `GradeDetailScreen`, `HomeworkScreen`), soit un en-tête écrit à la main (`EventDetailScreen`, `BulletinScreen`, `SignSuccessScreen`, `TimetableScreen`, `EditProfileScreen`, `MonRessentiScreen`, `SignalerAbsenceScreen`, `AjouterEnfantScreen`, `AjouterAnneScreen`…). Ces écrans se placent dans un `SafeAreaView` de `react-native-safe-area-context` (ex. `SignDocScreen.tsx:67`) : ils descendent donc juste sous la barre d'état, exactement où la top bar absolue est dessinée.

**Pourquoi les deux coexistent :** le seul mécanisme de masquage est

```
TabNavigator.tsx:713-720
const ROUTES_HIDE_NAV = new Set(['AriaHome','AriaConversation','AriaScreen','ProfilEnfant','BienEtreScreen',
  'ReglagesScreen','PermissionsRGPD','JournalAcces','TransfertCode','Effacement','ExportDonnees']);
const hideNavChrome = activeTab === 'Accueil' && ROUTES_HIDE_NAV.has(currentAccueilRoute);
```

Deux limites cumulées :
1. la liste est **fermée** (11 noms) ; toute nouvelle page profonde avec son propre en-tête n'y est pas ;
2. `currentAccueilRoute` n'est alimenté que par l'écouteur de la **pile Accueil** (`TabNavigator.tsx:150-198`) et le test exige `activeTab === 'Accueil'`. Les piles **Notes** (`:369-419`), **Agenda** (`:422-443`) et **Messagerie** (`:446-527`) n'ont aucun mécanisme : `SignDoc`, `SignSuccess`, `GradeDetail`, `BulletinScreen`, `EventDetail`, `SubjectDetail`, `ConversationDetailScreen`, `MotDetailScreen` ne masquent jamais la top bar ni la bottom bar.

Cas particulier de l'écran Autorisation : `SignDoc`/`SignSuccess` sont enregistrés dans la **pile Messagerie** (`TabNavigator.tsx:516, 521`) alors qu'ils sont lancés depuis Accueil (`AccueilScreen.tsx:169 nav.navigate('SignDoc')`). La navigation change donc d'onglet vers Messagerie avant d'ouvrir l'écran ; `activeTab` vaut alors `'MessagerieTab'` et `hideNavChrome` est faux. `Timetable` est enregistré deux fois (`:361` pile Accueil, `:438` pile Agenda).

Conflit de doc : `COMPONENTS.md §0` (top bar « sur toutes les pages ») contredit `§6 Pages profondes` (en-tête `‹ Section · Titre · Action`) et la leçon 2026-04-18 (opt-out de la barre par route). Il faut trancher : **une seule** des deux barres par écran.

## Bug 4 — Dropdown de filtre de MessagerieScreen cassé · **visible**

Structure (`src/screens/MessagerieScreen.tsx`) : ouverture `:418-432` (mesure de la pill) · `Modal` `:758-779` (avec `statusBarTranslucent` ✅) · carte `:516-551` · styles `:1074-1147`.

Ce que dit le code :

| Piste du brief | Constat |
|---|---|
| « lineHeight trop serré » | **Aucun `lineHeight` n'est défini** dans les styles du menu (`filterModalTitle :1106`, `filterModalCheck :1129`, `filterModalRowText :1141`). Ce n'est pas trop serré : c'est absent. |
| « conteneur à hauteur fixe » | **Réfuté** : ni `height` ni `maxHeight` sur `filterDropdownCard` (`:1074`) ni sur `filterModalRow` (`:1119`). Hauteur intrinsèque (`paddingVertical: 14`). |

Causes probables, dans l'ordre (chacune correspond à une leçon déjà écrite) **[UNCLEAR — à confirmer sur l'appareil]** :

1. **`gap: 8` sur une ligne `flexDirection: 'row'`** — `MessagerieScreen.tsx:1119-1123` (`filterModalRow`). Violation de 3 leçons (2026-04-10, 04-18, 05-17) dont le symptôme exact décrit : « `gap` … rendait les enfants sur des lignes séparées ». La coche `✓` (largeur 22, `:1129`) et le libellé (`flex: 1`, `:1141`) seraient empilés → « la coche flotte au-dessus de Tout ».
2. **`Pressable` avec un enfant texte `flex: 1`** — `:524-530`. Leçon 2026-05-16 : sur les lignes de sélection, toujours `TouchableOpacity`, jamais `Pressable`.
3. **La coche `'✓'` (U+2713) n'existe pas dans Figtree** → police de repli avec d'autres métriques de ligne, dans une case `width: 22`, sans `lineHeight` (`:1129-1133`, rendu `:534-541`). Peut décaler la ligne.
4. **`elevation: 10` + `overflow: 'hidden'` sur la même vue** — `:1074-1082` (`filterDropdownCard`). Leçon 2026-05-13 : l'ombre disparaît ; clip et ombre doivent être sur deux vues.
5. Pas de `includeFontPadding: false` sur les textes Figtree du menu (présent seulement sur la pill, `:635, :665`).

Même structure (mêmes risques) dans le sélecteur de trimestre de `NotesScreen.tsx:1483-1521` et `:1701+` : `Pressable`, `trimesterOptionRow { gap: 12 }`, `trimesterOptionLabelWrap { gap: 8 }`.

## Bug 5 — Contenu masqué sous la bottom bar · **visible** (cause mesurée : partielle)

Faits :

- `<FloatingTabBar>` n'est **monté nulle part** (0 occurrence dans `src/` et `App.tsx`). La vraie barre est `components/navigation/BottomBar.tsx` (`BOTTOM_BAR_HEIGHT = 70`, `bottom: insets.bottom + 8`, `:94`).
- Pourtant **55 lignes** dimensionnent leur marge basse avec les constantes de l'ancienne barre (`FLOATING_TAB_BAR_HEIGHT = 112`, `TAB_BAR_SCROLL_PADDING = 120`, `components/FloatingTabBar.tsx:50, 86`), 14 seulement avec `insets.bottom`. Le bon helper `getBottomBarScrollPadding(insets.bottom)` (`BottomBar.tsx:39-41`) n'est utilisé par personne.
- **Sous-marge** (calcul, insets non mesurés) : `AccueilScreen.tsx:139` (`paddingBottom: 100`), `EventDetailScreen.tsx:306` (100), `HomeworkScreen.tsx:319` (100), `GradeDetailScreen.tsx:140` (`BOTTOM_BAR_HEIGHT + 24 = 94`), `SignDocScreen.tsx:80` et `SignSuccessScreen.tsx:52` (`BOTTOM_BAR_HEIGHT + 80 = 150`). La barre occupe ≈ `70 + insets.bottom + 8` ; avec navigation 3 boutons MIUI (`insets.bottom` ≈ 48 [UNCLEAR, non mesuré]) il faut ≈ 126.
- **Sur-marge** : NotesScreen `:1459, :1673` = `112 + 120 + insets.bottom + 16` (≈ 248 + insets), MessagerieScreen `:702`, MonParcours `:151`, MonRessenti `:176`, ProfilEnfant `:480`, Subject/Archived… avec plusieurs cumuls.

**Pour NotesScreen la marge est déjà énorme** : l'« Observation enseignant » et le second graphe ne devraient pas être masqués par un manque de `paddingBottom`. **La cause du masquage dans Notes n'est donc pas établie [UNCLEAR].** Pistes à vérifier par mesure (`onLayout` sur le `ScrollView` et son contenu, log de `insets.bottom`, hauteur de la page du pager `material-top-tabs` `TabNavigator.tsx:531-587`) : `ScrollView` plus haut que la zone visible ; voile `BlurView` du bas (`TabNavigator.tsx:912-930`, ≈ 130 px, actif dès `scrollY > 12` d'après `:759-764`).

## Bug 6 — Dégradé Aria hors contexte Aria · **visible** (règle CLAUDE.md)

| Fichier:ligne | Extrait | Contexte |
|---|---|---|
| `src/screens/NotesScreen.tsx:1020-1035` | `GradientTrack : colors={[C.violet, C.cyan]}` (`#4338CA → #06B6D4`) | barre de progression des compétences ; utilisée `:1540, :1620, :1880` |
| `NotesScreen.tsx:934-939` | `Stop #4338CA → #06B6D4` | trait de la courbe de progression |
| `src/screens/ArchivedYearDetailScreen.tsx:298` | `colors={['#7C3AED', '#06B6D4']}` | violet → cyan |
| `src/components/LogoScolaria.tsx:52-58` | `stopColor="#6366F1" → "#22D3EE"` | **identité de marque** (CLAUDE.md : le dégradé est réservé à Aria, jamais à l'identité). Utilisé par `AProposScreen.tsx:36` |
| `src/components/shared/GradientButton.tsx:57` | `colors={[...ARIA_GRADIENT]}` | utilisé par `EffacementScreen` (RGPD) |
| `src/screens/EditProfileScreen.tsx:304` | `['#4338CA', '#6366F1']` | dégradé indigo (pas cyan) sur l'avatar/parent |
| `src/screens/SettingsScreen.tsx:162-169` **[mort]** | `#7C3AED → #06B6D4` | avatar parent |
| `src/components/dashboard/PrimaireDashboard.tsx:126` **[mort]** | `['#22D3EE', '#818CF8']` | barre de progression |
| `src/services/pdfExport.ts:68,104,292` | `linear-gradient(… #6D28D9, #22D3EE)` | PDF exporté |

Contextes Aria légitimes (à ne **pas** toucher) : `AriaActionCard.tsx:136`, `UniversalInputBar.tsx:154`, `ChatBubble.tsx:113`, `ConseilDuMatin.tsx:221`, `AriaSparkleIcon.tsx`, pill Aria de `BottomBar.tsx`/`TopBar.tsx`.

---

# 2. Audit par catégorie (A → O)

## A. Données par enfant

### A.1 Écrans qui ignorent l'enfant actif

Voir Bug 1 et Bug 2. Liste complète des écrans/composants avec un nom d'enfant en dur **et** sans `useActiveChild` :

| Fichier | Occurrences | Gravité |
|---|---|---|
| `src/screens/AccueilScreen.tsx:29-45` | données + message Aria d'Emma | bloquant |
| `src/screens/SignDocScreen.tsx:26-33` | Emma · 4ᵉB | bloquant |
| `src/screens/SignSuccessScreen.tsx:68,69,77,85` | Emma, 4ᵉB | bloquant |
| `src/screens/HomeworkScreen.tsx:3,244` | Emma · 4ᵉB | visible |
| `src/screens/GradeDetailScreen.tsx:251` | « Féliciter Emma » | visible |
| `src/screens/TimetableScreen.tsx:70` | Emma 4ème | visible |
| `src/screens/BulletinScreen.tsx:32` | `childName: 'Emma'` (défaut) | visible |
| `src/screens/EventDetailScreen.tsx` | sortie/QuickInfo « Inscrite » en dur, sans enfant | visible |
| `src/components/JustifierAbsenceSheet.tsx:33-39` | Emma dans les 4 modèles | visible |
| `src/components/ConseilDuMatin.tsx:28-63, 241` | « Lucas » partout | mineur (non importé par un fichier vivant que j'aie trouvé) |

### A.2 Écrans qui utilisent bien l'enfant

`NotesScreen` (`:1124-1134`), `MessagerieScreen` (`:476`), `MessagesListScreen` (`:176-195`), `AgendaScreen` (9 usages), `SignalerAbsenceScreen` (12), `ProfilEnfantScreen`, `MonParcoursScreen`, `AriaHome/AriaConversation/AriaScreen` (avec repli `?? 'demo-lea'`, `AriaHomeScreen.tsx:153`, `AriaConversationScreen.tsx:134`, `AriaScreen.tsx:95`, `services/ariaApi.ts:107`).

### A.3 Restes de l'ancien schéma d'ID (leçon 2026-04-17)

| Fichier:ligne | Extrait | Gravité |
|---|---|---|
| `src/services/absenceService.ts:82, 97, 112, 127` | `student_id: '2', // Lucas` · `'2'` · `'3', // Emma` · `'1', // Léa` | visible (absences d'un enfant attribuées via des IDs qui ne correspondent à aucun `demo-*`) |
| `src/screens/rgpd/EffacementScreen.tsx:79-80` | `{ id:'1', name:'Lucas Moreau', classe:'CM2 — École Voltaire' }, { id:'2', name:'Emma Moreau', classe:'6ème — Collège Hugo' }` | visible (Léa absente ; Emma en 6ème) |
| `src/screens/rgpd/TransfertCodeScreen.tsx:85-86` | idem | visible |
| `src/screens/ProfilEnfantScreen.tsx:113-116` | `case '1': case 'demo-lea':` (double schéma) et `:194-195 case 'demo-emma': default:` | visible (tout ID inconnu → Emma) |
| `src/screens/MonParcoursScreen.tsx:36-38` | `case 'demo-lea': case '1':` · `:56 default → années d'Emma` | visible |
| `src/services/childContext.ts:335-336` | `// 3) Last-resort default … return MOCK_CHILDREN[0]` | mineur — **sans `console.warn`**, contrairement à ce que dit la leçon 2026-04-17 |
| `src/stores/messagerieStore.ts:28` | `return store[childId] ?? []` | mineur (masque un ID inconnu par une liste vide) |

### A.4 Incohérences liées à l'âge / au niveau

- `contexts/SchoolModeContext.tsx:124-128` : `age <= 6 → 'maternelle'`. Léa (née 2020-03-15) a 6 ans le 2026-09-18 → encore « maternelle » **par une marge d'un jour d'anniversaire** ; la démo dérive avec l'horloge du téléphone.
- `services/childContext.ts:59` : Léa `age: 4` alors que `birthDate` (`ActiveChildContext.tsx:42`) donne 6.
- `screens/NotesScreen.tsx:149-154, 1464-1521` : la vue **maternelle** propose quand même `T1/T2/T3/Année` (`TRIMESTER_OPTIONS`) ; `LE_DOMAINS` (`:307`) est le contenu de Léa pour **tout** enfant en maternelle.

## B. Superposition des en-têtes

Voir Bug 3. Liste des routes concernées (déclarées sans être dans `ROUTES_HIDE_NAV`, `TabNavigator.tsx:713-718`) :

| Pile | Routes avec en-tête propre, top bar non masquée |
|---|---|
| Accueil | `SignalerAbsenceScreen :206`, `AjouterEnfant :221`, `AjouterAnne :226`, `MonParcours :231`, `APropos :309`, `EditProfile :314`, `WallpaperPicker :335`, `TextSize :340`, `NotificationsSettings :345`, `ArchivedYearDetail :350`, `Homework :356`, `Timetable :361`, `RGPDScreen :249` |
| Notes | `SubjectDetail :403`, `GradeDetail :409`, `BulletinScreen :414` |
| Agenda | `EventDetail :433`, `Timetable :438` (doublon) |
| Messagerie | `SignalerAbsence :475`, `MessagesListScreen :480`, `AbsencesListScreen :485`, `EcoleListScreen :490`, `ConversationDetailScreen :505`, `MotDetailScreen :510`, `SignDoc :516`, `SignSuccess :521` |

Gravité : `bloquant` (bouton retour ou action masqué par l'autre barre). Dans ces écrans la `BottomBar` recouvre aussi le bas : voir §E.

## C. Dropdown Messagerie

Voir Bug 4. Extraits utiles :

| Fichier:ligne | Extrait | Catégorie | Gravité |
|---|---|---|---|
| `MessagerieScreen.tsx:1119-1128` | `filterModalRow: { flexDirection:'row', alignItems:'center', paddingVertical:14, gap:8, … }` | gap en row (L. 04-10, 04-18, 05-17) | visible |
| `:524-530` | `<Pressable … style={({ pressed }) => [styles.filterModalRow, …]}` | Pressable sur ligne de sélection (L. 05-16) | visible |
| `:1074-1082` | `filterDropdownCard: { … overflow:'hidden', … elevation:10 }` | elevation + overflow (L. 05-13) | visible |
| `:1129-1133` | `filterModalCheck: { width:22, fontSize:16, textAlign:'center' }` sans `lineHeight` | glyphe `✓` hors Figtree | visible |
| `:1141-1146` | `filterModalRowText: { flex:1, fontFamily, fontSize:16 }` sans `lineHeight` | métriques Figtree | visible |
| `:423` | `const dropW = Math.min(220, x + w - 16)` | largeur calculée depuis la pill | mineur |

## D. `paddingBottom` en dur au lieu d'un calcul avec `useSafeAreaInsets`

Constat d'ensemble : la constante correcte n'existe qu'en un helper inutilisé (`getBottomBarScrollPadding`). Deux catégories.

**D.1 Valeurs numériques**

| Fichier:ligne | Extrait | Gravité |
|---|---|---|
| `src/screens/AccueilScreen.tsx:139` | `contentContainerStyle={{ paddingBottom: 100 }}` | visible |
| `src/screens/EventDetailScreen.tsx:306` | `paddingBottom: 100` | visible |
| `src/screens/HomeworkScreen.tsx:319` | `paddingBottom: 100` | visible |
| `src/screens/GradeDetailScreen.tsx:140` | `paddingBottom: BOTTOM_BAR_HEIGHT + 24` (sans insets) | visible |
| `src/screens/SignDocScreen.tsx:80` · `SignSuccessScreen.tsx:52` | `BOTTOM_BAR_HEIGHT + 80` (sans insets) | visible |
| `src/components/dashboard/MaternelleDashboard.tsx:476` · `PrimaireDashboard.tsx:424` **[mort]** | `minHeight:'100%', paddingBottom: 20` | mineur |

**D.2 Constantes de la barre flottante fantôme, 41 lignes sans `insets.bottom`** (les 14 avec `insets.bottom` ne sont pas listées) — fichiers concernés : `AvatarPicker:156`, `ErrorBoundary:34`, `LyceeDashboard:319`/`MaternelleDashboard:472`/`PrimaireDashboard:420` **[mort]**, `AgendaScreen:727,838` (avec `FLOATING_TAB_BAR_HEIGHT`, sans insets), `AjouterAnneScreen:318`, `AjouterEnfantScreen:204`, `AProposScreen:157`, `ArchivedYearDetailScreen:263`, `AriaConversationScreen:511`, `AriaHomeScreen:540,571,682`, `AriaScreen:241`, `AuthScreen:82` **[mort]**, `messagerie/AbsencesListScreen:122`, `ConversationDetailScreen:404`, `EcoleListScreen:93`, `MessagesListScreen:213`, `MessagerieScreen:1168`, `NotificationsScreen:282` **[mort]**, `PinScreen:199`, `SignalerAbsenceScreen:251`, `SettingsScreen:152` **[mort]**, `rgpd/*` (6 écrans), `RGPDScreen:63`, `WallpaperPickerScreen:169`, `teacher/*` (8 écrans). Gravité globale : `visible` (sous- ou sur-marge selon l'écran) — voir Bug 5.

## E. Éléments positionnés en bas sans `insets.bottom` correct

| Fichier:ligne | Extrait | Problème | Gravité |
|---|---|---|---|
| `src/screens/SignDocScreen.tsx:135-139` | `<View style={[styles.ctaContainer, { bottom: insets.bottom + 12 }]}>` dans un `SafeAreaView` (`:67`) | **double** prise en compte du bas (le `SafeAreaView` pose déjà l'inset bas) **et** CTA « Signer et envoyer » dessiné sous la `BottomBar` globale (rendue après, `TabNavigator.tsx:932`) | **bloquant** (flux de signature) |
| `src/screens/SignSuccessScreen.tsx:115` | `style={[styles.mainCTA, { bottom: insets.bottom + 12 }]}` | idem | bloquant |
| `src/screens/EventDetailScreen.tsx:238` | `styles.eventBottomBar, { bottom: insets.bottom + 12 }` | idem (bouton « Participer ») | bloquant |
| `src/screens/GradeDetailScreen.tsx:249` | `styles.bottomBar, { bottom: insets.bottom + 12 }` | idem (2 boutons) | visible |
| `src/screens/messagerie/ConversationDetailScreen.tsx:538` | `stickyCTA` | à vérifier (aucun `insets` à la définition) [UNCLEAR] | visible |
| `src/screens/PinScreen.tsx:191` | `bottom: 120` sans `insets` (fichier vivant : route `Pin`, `App.tsx:105`) | | visible |
| `src/screens/MessagerieScreen.tsx:1345` | `fabWrap … bottom: 72` | FAB positionné sans `insets.bottom` | visible |
| `src/screens/EditProfileScreen.tsx:752` | `bottom: 5` | | mineur |
| `src/screens/LoginScreen.tsx:66` | `{ bottom: insets.bottom + 16 }` | correct (avec insets) — pas d'action | — |

Les 4 premiers sont la conséquence directe du Bug 3 : ces écrans se pensent plein écran mais la `BottomBar` reste affichée.

## F. Écrans et conteneurs pleine hauteur sans `flex: 1` ; `height: '100%'`

**Écrans racines sans `flex: 1` :** aucun trouvé. Toutes les racines `root`/`container`/`screen` des écrans ont `flex: 1` (le seul résultat, `components/AriaInlineCard.tsx:44`, est une carte, pas un écran).

**`height: '100%'` / `minHeight: '100%'` :**

| Fichier:ligne | Extrait | Gravité |
|---|---|---|
| `src/components/dashboard/MaternelleDashboard.tsx:476` · `PrimaireDashboard.tsx:424` **[mort]** | `style={{ minHeight:'100%', paddingBottom: 20 }}` | mineur |
| `src/screens/ArchivedYearDetailScreen.tsx:567` · `SubjectDetailScreen.tsx:326` · `ProfilEnfantScreen.tsx:875` · `rgpd/ExportDonneesScreen.tsx:384` · `components/profile/Portfolio.tsx:164` · `components/dashboard/LyceeDashboard.tsx:198` **[mort]** | `height: '100%'` sur le remplissage d'une barre de progression (parent à hauteur fixe) | mineur — acceptable, à remplacer par `StyleSheet.absoluteFill` |
| `src/screens/NotesScreen.tsx:1053, 1072` | `<Image style={{ width:'100%', height:'100%' }}>` dans un parent dimensionné | mineur |

**Commentaires « No height:'100%' → flex:1 »** dans `EventDetailScreen.tsx:7`, `HomeworkScreen.tsx:7`, `TimetableScreen.tsx:11` : règle respectée.

## G. `Dimensions.get(...)` appelé hors composant (valeur figée au chargement du module)

17 fichiers vivants ou morts figent la taille au moment de l'import (rotation, mode multi-fenêtre, barre de navigation MIUI ne sont pas pris en compte ; `window` exclut de plus la barre de navigation) :

| Fichier:ligne | Extrait | Gravité |
|---|---|---|
| `src/navigation/TabNavigator.tsx:104` | `const { width: SCREEN_WIDTH } = Dimensions.get('window')` (translation du burger `:733`) | visible |
| `src/screens/NotesScreen.tsx:166` | `NOTES_WALLPAPER_HEADER_HEIGHT = Math.min(Dimensions.get('window').height * 0.42, 380)` | visible |
| `src/screens/MessagerieScreen.tsx:89` | `SEARCH_PILL_MAX_W = Math.round(Dimensions.get('window').width * 0.4)` | visible |
| `src/screens/AgendaScreen.tsx:59` | `const SCREEN_WIDTH = Dimensions.get('window').width` | visible |
| `src/screens/aria/AriaConversationScreen.tsx:52` · `AriaHomeScreen.tsx:64` | `SCREEN_WIDTH` | visible |
| `src/components/BurgerMenu.tsx:29` | `SCREEN_WIDTH` | visible |
| `src/components/GlobalChildSwitcher.tsx:20` | `SCREEN_HEIGHT` | mineur |
| `src/screens/WallpaperPickerScreen.tsx:20` | `SCREEN_W` | mineur |
| `src/screens/teacher/MeteoClasseScreen.tsx:23` · `TeacherDashboardScreen.tsx:15` · `VieDeClasseScreen.tsx:27` | `width` | mineur |
| `src/components/ConseilDuMatin.tsx:15` · `dashboard/MaternelleDashboard.tsx:17` · `LuminousOrbs.tsx:11` · `ScreenHeader.tsx:17` · `RoleSelectionScreen.tsx:9` | figés **[mort ou quasi]** | mineur |

Appels **dans** un composant (corrects) : `NotesScreen.tsx:1114`, `ReglagesScreen.tsx:217-218`. Remplacement : `useWindowDimensions()`.

## H. `ScrollView` / `FlatList` dont le parent n'a pas `flex: 1`

Analyse : 7 candidats, 3 confirmés.

| Fichier:ligne | Constat | Gravité |
|---|---|---|
| `src/screens/rgpd/EffacementScreen.tsx:155-156` · `JournalAccesScreen.tsx:198-199` · `PermissionsScreen.tsx:260-261` | `<RgpdBottomSheet><Animated.View style={{ opacity: fadeAnim }}><ScrollView>` — la feuille a `maxHeight: '92%'` (`components/rgpd/RgpdBottomSheet.tsx:62`) mais le `Animated.View` intermédiaire n'a ni `flex: 1` ni `flexShrink` : le `ScrollView` ne se contraint pas, le contenu long est coupé au lieu de défiler | **visible** (bas des feuilles RGPD inaccessible) — à vérifier sur appareil [UNCLEAR] |
| `src/screens/AjouterEnfantScreen.tsx:199-203` · `AuthScreen.tsx:77-81` **[mort]** | parent `KeyboardAvoidingView className="flex-1 bg-blue-night"` : `flex: 1` **présent** via NativeWind (faux positif du script) ; mais fond `bg-blue-night` (sombre) — contraire à `#F7F7F5` | mineur (design) |
| `src/components/AvatarPicker.tsx:117-156` | feuille `maxHeight: '80%'` (`:244`), `ScrollView style={s.content}` | mineur |
| `src/screens/aria/AriaHomeScreen.tsx:565` | faux positif (parent trouvé par indentation) | — |

Vérifiés OK : les ≈ 35 autres écrans (`root` a `flex: 1` et le `ScrollView` en est l'enfant direct).

## I. Typographie

**I.1 `fontWeight` avec un `fontFamily` Figtree** (Android applique alors un gras synthétique ou choisit un mauvais fichier ; la famille porte déjà la graisse) — 13 blocs :

| Fichier:ligne | Extrait |
|---|---|
| `src/screens/AccueilScreen.tsx:299` | `fontFamily:'Figtree_500Medium' … fontWeight 500` |
| `AccueilScreen.tsx:306` | `fontFamily:'Figtree_900Black' … fontWeight 900` (+ `lineHeight 36` pour `fontSize 32`) |
| `src/components/navigation/TopBar.tsx:263` | `sansBold` + `fontWeight 700` |
| `src/components/checkin/RessentiSlider.tsx:56` | `sansSemiBold` + `600` |
| `src/screens/aria/AriaConversationScreen.tsx:799` · `AriaHomeScreen.tsx:828` | `sansMedium` + `500` |
| `src/screens/MonRessentiScreen.tsx:446` | `sansSemiBold` + `600` |
| `src/screens/NotesScreen.tsx:2089, 2116` | `sansSemiBold` + `600` |
| `src/screens/ProfilEnfantScreen.tsx:812, 863, 909` | `sansMedium 500` ×2, `sansSemiBold 600` |
| `src/screens/SettingsScreen.tsx:359` **[mort]** | `sansSemiBold` + `700` |

Gravité : `mineur` (visible sur certains téléphones). Aussi : `NotesScreen.tsx` contient un bloc avec `fontWeight` sans `fontFamily` (police système) — règle « jamais de police système ».

**I.2 `lineHeight < fontSize × 1.2`** (ratio) — 6 :

| Fichier:ligne | fontSize / lineHeight |
|---|---|
| `src/screens/GradeDetailScreen.tsx:299` | 64 / 68 (1.06) |
| `src/screens/BulletinScreen.tsx:353` | 52 / 56 (1.08) |
| `src/screens/SubjectDetailScreen.tsx:293` | 48 / 52 (1.08) |
| `src/screens/AccueilScreen.tsx:306` · `ArchivedYearDetailScreen.tsx:437` | 32 / 36 (1.13) |
| `src/screens/EventDetailScreen.tsx:290` | 22 / 26 (1.18) |

Attention : CLAUDE.md prescrit `lineHeight = fontSize × 1.0` pour les grands chiffres (`dataLarge`, `display`). Ces 6 cas sont donc **conformes à CLAUDE.md** et **hors règle du brief** ; à trancher (voir « conflits entre règles » ci-dessous). Le vrai risque : les styles `fontSize` **sans aucun `lineHeight`** (dont tout le menu du Bug 4).

**I.3 `fontSize < 11`** — 52 occurrences (liste complète annexe C). Réparties surtout : `NotesScreen` ×4, `HomeworkScreen` ×4, `AgendaScreen` ×4 (dont `8`, `8.5`), `EditProfileScreen` ×3, `BulletinScreen` ×3 (`7.5`, `8.5`), `Portfolio` ×3, `BurgerMenu` ×3, `constants/typography.ts:43,48` (tokens), `JustifierAbsenceSheet.tsx:292` (`7.5`), `components/SectionLabel.tsx:15` (`9`), `AccueilScreen.tsx:370` (`9`).

**Conflits entre règles (à trancher avant de corriger)** :
- CLAUDE.md définit `sectionLabel` à **8.5 px** et `meta` à **8 px** ; COMPONENTS.md `§10` à **7.5 px**. La règle du brief (`fontSize < 11`) les interdit. Une valeur plancher doit être décidée (recommandation : 11 px partout, sauf `sectionLabel` à 10 px).
- CLAUDE.md `dataLarge` : `lineHeight = fontSize × 1.0` ; le brief : `< 1.2` interdit. Un des deux doit changer.

## J. `elevation` avec `backgroundColor` rgba ou transparent

43 clés de style ont `elevation > 0` (liste annexe C). Croisement avec un fond `rgba`/`transparent` :

| Fichier:ligne | Style | Extrait | Gravité |
|---|---|---|---|
| `src/components/shared/RoundGlassIconButton.tsx:93` | `shadowWrap` | `elevation: 6` + `backgroundColor: 'transparent'` | mineur (vue d'ombre sans fond : Android ne dessine pas l'ombre d'un fond transparent) |
| `src/screens/MessagerieScreen.tsx:1001` | `searchDismissLayer` | `elevation: 32` + `backgroundColor: 'transparent'` | mineur (couche de fermeture, pas d'ombre voulue) |
| `src/screens/ReglagesScreen.tsx:550` | `wallpaperGridTile` | `elevation: 2` + `backgroundColor: 'rgba(255…` **et** `overflow:'hidden'` | visible |

Croisement `elevation` + `overflow: 'hidden'` (ombre supprimée, leçon 2026-05-13) : `MessagerieScreen.tsx:1074` (`filterDropdownCard`), `ReglagesScreen.tsx:451` (`sheet`, elevation 12), `ReglagesScreen.tsx:550`.

Non-conformité générale à la leçon 2026-04-02 (« `elevation: 0` sur les cartes, l'élévation seulement pour l'UI flottante ») : styles nommés `card`/`header`/`*Outer` avec `elevation > 0` — `components/aria/AriaActionCard.tsx:153` (`card`, 3), `screens/aria/AriaHomeScreen.tsx:810` (`suggestionCardOuter`, 3), `MessagerieScreen.tsx:926, 970, 1193` (pills/rows, 2-3), `MonRessentiScreen.tsx:308` (`header`, 3), `ProfilEnfantScreen.tsx:617` (`whiteHeader`, 4), `PinScreen.tsx:300`. Gravité : `visible` (cadre gris sur Android) — à vérifier au cas par cas.

## K. `gap` sur `flexDirection: 'row'` (leçons 2026-04-10, 04-18, 05-17)

**159 clés `StyleSheet` en row + 35 hors row + 140 `className` `gap-*` + `style={{ gap }}` inline** (≈ 290 lignes, 68 fichiers). Liste complète en annexe A. Top par fichier (clés de style en row) :

| n | Fichier |
|---|---|
| 9 | `NotesScreen.tsx` · `rgpd/JournalAccesScreen.tsx` · `rgpd/TransfertCodeScreen.tsx` |
| 8 | `ProfilEnfantScreen.tsx` · `rgpd/PermissionsScreen.tsx` |
| 7 | `rgpd/EffacementScreen.tsx` · `SignalerAbsenceScreen.tsx` |
| 6 | `components/JustifierAbsenceSheet.tsx` · `MonParcoursScreen.tsx` |
| 5 | `components/AvatarPicker.tsx` · `AgendaScreen.tsx` · `ArchivedYearDetailScreen.tsx` · `EditProfileScreen.tsx` · `rgpd/ExportDonneesScreen.tsx` |
| 4 | `components/aria/AriaActionCard.tsx` · `AProposScreen.tsx` · `messagerie/MessagesListScreen.tsx` · `MessagerieScreen.tsx` · `MonRessentiScreen.tsx` · `PinScreen.tsx` |
| 3 | `profile/JoyHistory.tsx` · `aria/AriaHomeScreen.tsx` · `messagerie/AbsencesListScreen.tsx` · `messagerie/EcoleListScreen.tsx` |

Les seuls fichiers qui respectent explicitement la règle (`marginRight`/`marginLeft` explicites) : `BottomBar.tsx` (commentaire `:19`) et `DeepScreenHeader.tsx`. Le `gap-*` NativeWind sur les composants gluestack (`HStack`) des dashboards est **[mort]** ; le reste est vivant.

Gravité : `visible` (l'effet dépend du chemin de rendu Yoga ; les leçons rapportent des lignes empilées/chevauchées). C'est le lot le plus volumineux du chantier.

## L. `KeyboardAvoidingView` sans `behavior='height'` sur Android

| Fichier:ligne | Extrait | Gravité |
|---|---|---|
| `src/screens/aria/AriaConversationScreen.tsx:454-455` | `behavior={Platform.OS === 'ios' ? 'padding' : undefined} enabled={Platform.OS === 'ios'}` | **visible** — KAV désactivé sur Android (leçon 2026-04-10 : « ne jamais laisser `behavior=undefined` ») |
| `src/screens/aria/AriaHomeScreen.tsx:486-487` | idem | visible |

Les deux s'appuient sur `useKeyboardInputPadding` (leçon 2026-04-17), qui lui-même dérive de `getInputBarPaddingBottom()` (`FloatingTabBar.tsx:67-72`), donc de la **barre flottante fantôme**. Avec `edge-to-edge` actif (SDK 55), `adjustResize` peut ne plus redimensionner la fenêtre : le clavier peut recouvrir la barre de saisie. **[UNCLEAR — à tester avec le clavier ouvert sur l'appareil.]**

**Écrans avec `TextInput` et sans aucun `KeyboardAvoidingView`** (16) : `components/UniversalInputBar.tsx`, `navigation/SandboxNavigator.tsx`, `AjouterAnneScreen`, `ConnexionScreen`, `InscriptionScreen`, `MessagerieScreen` (recherche), `MonRessentiScreen`, `onboarding/*` ×3 **[morts]**, `QuickSearchScreen`, `rgpd/EffacementScreen`, `SignalerAbsenceScreen`, `teacher/AppreciationsScreen`, `teacher/CahierLiaisonScreen`, `teacher/VieDeClasseScreen`. Gravité : `visible` (formulaires de connexion, inscription et signalement d'absence : champ possiblement caché par le clavier).

## M. Dégradé Aria (`#6366F1 → #22D3EE`) hors contexte Aria

Voir Bug 6 (liste des dégradés). Complément — **violet solide `#7C3AED`** (« jamais en couleur solide isolée ») : **36 occurrences vivantes**. Les plus lourdes :

| n | Fichier |
|---|---|
| 3 | `contexts/SchoolModeContext.tsx:83,86,87` (accent des modes) · `screens/MonParcoursScreen.tsx:84,254,378` · `screens/TextSizeScreen.tsx:81,114,120` |
| 2 | `components/GlobalChildSwitcher.tsx` · `components/profile/Portfolio.tsx` · `screens/ArchivedYearDetailScreen.tsx` · `screens/messagerie/MessagesListScreen.tsx:218,485` · `screens/ProfilEnfantScreen.tsx:66,248` · `screens/WallpaperPickerScreen.tsx:186,200` · `tokens/colors.ts:17,22` |
| 1 | `RessentiSlider`, `FloatingTabBar`, `JoyHistory`, `constants/colors.ts:20`, `constants/theme.ts:108`, `constants/themes.ts:30`, `ChildThemeContext`, `EditProfileScreen`, `HomeworkScreen:87`, `EcoleListScreen:68`, `MotDetailScreen:119`, `MonRessentiScreen:68`, `SignalerAbsenceScreen:77` |

Aussi `#6366F1` hors Aria (indigo Aria comme couleur d'UI générale) : `NotificationsSettingsScreen.tsx:53`, `ReglagesScreen.tsx:168, 569, 638` (interrupteur, bordure), `EcoleListScreen.tsx:38`. La couleur d'accent unique est `#4338CA`.

`NotesScreen.tsx:74` définit `cyan: '#06B6D4'` dans sa palette locale (utilisé en gradient, Bug 6) ; le cyan `#22D3EE`/`#06B6D4` hors Aria apparaît aussi dans `JoyHistory.tsx:126`, `NotesScreen.tsx:500`, `services/teacherService.ts:277`.

## N. Clés / variables `EXPO_PUBLIC_*` sensibles

| Fichier:ligne | Extrait | Problème | Gravité |
|---|---|---|---|
| `app.config.js:15-16, 93-94` | `ANTHROPIC_API_KEY … extra.EXPO_PUBLIC_ANTHROPIC_API_KEY` · `GOOGLE_VISION_KEY … extra.EXPO_PUBLIC_GOOGLE_VISION_KEY` | recopiées dans `extra` → **dans le bundle et le manifeste de l'APK**, lisibles par n'importe qui | **bloquant (sécurité)** |
| `src/services/ariaApi.ts:27, 110, 130-131` | `API_URL = 'https://api.anthropic.com/v1/messages'` puis l'en-tête d'authentification reçoit la clé | appel direct à Anthropic depuis le téléphone avec la clé | bloquant (sécurité) |
| `src/services/ariaApi.ts:31` · `getEnv.ts:35` | `ENV.ANTHROPIC_API_KEY.substring(0, 12)` dans `console.log` | fuite d'un préfixe de clé dans les logs | visible |
| `src/services/ocrService.ts:127` **[mort]** | `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}` | clé dans l'URL ; fichier non importé (API « désactivée ») | mineur tant que mort |
| `src/services/ocrService.ts:474-487` **[mort]** | second appel `api.anthropic.com` avec la clé en en-tête | idem | mineur tant que mort |
| `src/services/ariaApi.ts:179` | message utilisateur « configure ta clé API Anthropic dans le fichier .env (EXPO_PUBLIC_ANTHROPIC_API_KEY) » | affiche le nom de la variable dans l'UI | visible |
| `eas.json` | aucun bloc `env` ; environnements EAS sans variable | les builds `preview`/`production` n'ont **aucune** clé (contredit la leçon 2026-03-29 « toute variable EXPO_PUBLIC_ dans .env ET eas.json ») ; seul `.env` conservé dans l'archive (`.easignore`) les fournit | visible |

`EXPO_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` : publiques par conception (protégées par RLS) — non sensibles.

Aucune clé écrite en dur dans `src/` (recherche des préfixes de clés Anthropic et Google, et de `service_role`). Le correctif de fond est la session 7 (Edge Function Supabase) ; il supprime aussi le besoin de `.env` dans l'archive EAS.

## O. Réglages fantômes (option d'UI sans effet réel)

| Fichier:ligne | Réglage | Constat | Gravité |
|---|---|---|---|
| `src/screens/ReglagesScreen.tsx:241-278` | « Retour haptique » (`hapticsEnabled`) | valeur persistée dans AsyncStorage (`@scolaria:haptics`), **aucun lecteur** ; `expo-haptics` n'est pas installé | visible |
| `src/screens/TextSizeScreen.tsx:19-26` | « Taille du texte » | écrit `textSizePreference`, **jamais lu** ailleurs ; aucun `allowFontScaling`/`fontScale` dans `src/` | visible |
| `ReglagesScreen.tsx:264` | « Langue de la saisie vocale » (valeur `FR`) | `onPress: () => {}` ; la saisie vocale est marquée V2 dans CLAUDE.md | visible |
| `ReglagesScreen.tsx:111` | « Capacités » | ouvre `TextSize` (libellé sans rapport) | mineur |
| `ReglagesScreen.tsx:112` | « Connecteurs » | ouvre `ExportDonnees` (libellé sans rapport) | mineur |
| `src/screens/EditProfileScreen.tsx:200-201, 336-337, 364-365` | interrupteurs « Aria » (`ariaEnabled`) et « Rappels » (`remindersEnabled`) | `useState` local, jamais lu ailleurs ; ton d'Aria (`active`, `:168-180`) idem | visible |
| `src/screens/MessagerieScreen.tsx:743-748` | FAB « nouveau message » | `onPress={() => {}}` (leçons 2026-05-11 et 05-13 : le nouveau message passe par la BottomBar) | visible |
| `src/screens/ConnexionScreen.tsx:189` | « Mot de passe oublié » | `onPress={() => {}}` | visible |
| `src/screens/NotificationsSettingsScreen.tsx:63-96` | 4 interrupteurs | écrivent dans Supabase (`notification_preferences`) ; sans utilisateur connecté (mode démo) l'écriture échoue sans effet [UNCLEAR] | visible |
| `src/screens/WallpaperPickerScreen.tsx` | choix du fond d'écran | n'agit plus que sur Notes ; l'Accueil utilise un dégradé fixe (leçon 2026-05-16) | mineur |
| `src/screens/SettingsScreen.tsx:154-165` (ancien toggle mode sombre) | — | **le toggle a été supprimé d'un écran mort** : `SettingsScreen.tsx` n'est importé nulle part ; le vrai écran est `ReglagesScreen`, qui n'a pas de toggle mode sombre. Rien à corriger côté UI, mais la modification précédente n'avait aucun effet visible | info |
| `src/screens/rgpd/PermissionsScreen.tsx:207-235, 436-447` | interrupteurs de modules par personne | passent par `updatePermission(...)` du service ; démo : état local [UNCLEAR] | mineur |

---

# 3. Incohérences de données démo (à lister, pas à corriger)

| # | Incohérence | Où |
|---|---|---|
| 1 | Léa est « Maîtresse **MS/GS** » dans Messagerie mais a des notes **/20** (Accueil) et un sélecteur **T1/T2/T3/Année** (Notes maternelle). La maternelle n'a ni notes ni trimestres (5 périodes). | `data/messagerieData.ts:66` · `AccueilScreen.tsx:39-43` · `NotesScreen.tsx:149-154, 1464-1521` |
| 2 | Aperçu de la liste Messagerie « **Note 8/20.** Fiche de révisions… » sans ouvrir le message (principe de bienveillance de la charte). Rendu par `MessagerieScreen.tsx:228-231` (`ariaSummary`). Autre : « **Note 13/20.** Chapitre écosystèmes… » (`messagerieData.ts:228`). Le corps du message répète « décevants … 8/20 » (`:212`). | `data/messagerieData.ts:206, 212, 228` |
| 3 | « **Signature légale** · horodatage automatique » : aucune signature électronique n'a de valeur légale (eIDAS = Phase 2-3). | `SignDocScreen.tsx:129` |
| 4 | Écran **À propos** : « Chiffrées de bout en bout (AES-256) », « **Chiffrement E2E** — AES-256 bout en bout » (faux : chiffrement au repos par Supabase), « **100 %** Données en Europe », « **Google Vision** — OCR bulletins » (API désactivée, service non importé). | `AProposScreen.tsx:67, 122, 124, 133, 135` |
| 5 | Mêmes affirmations ailleurs : « chiffrées (AES-256) et hébergées en France », « codes de transfert chiffrés de bout en bout », « messages chiffrés », « Tes réponses sont chiffrées et ne sont partagées avec personne », libellé « OCR Google Vision ». | `RGPDScreen.tsx:94` · `rgpd/TransfertCodeScreen.tsx:411` · `teacher/MessagerieParentsScreen.tsx:395` · `MonRessentiScreen.tsx:272` · `AjouterAnneScreen.tsx:255` |
| 6 | **Emma** a quatre classes : `3ème — Collège Hugo` (`ActiveChildContext.tsx:44`) · `4ᵉB` (`SignDocScreen.tsx:28`, `SignSuccessScreen.tsx:69,77`, `HomeworkScreen.tsx:244`) · `4ème — Collège Jean Moulin` (`messagerieData.ts:8`) · `6ème — Collège Hugo` (`EffacementScreen.tsx:80`, `TransfertCodeScreen.tsx:86`). | idem |
| 7 | **Lucas** est `CM2 — École Voltaire` (`ActiveChildContext.tsx:43`, `demo-children.json`) mais `CE2 — Jules Ferry` dans Messagerie (`messagerieData.ts:7, 115, 126, 152`) et `CM2 B — Mme Dupont` ailleurs (`demo-teachers.json:13-15`, `MessagesListScreen.tsx:64`). | idem |
| 8 | **Léa** : `age: 4` (`childContext.ts:59`) vs naissance 2020-03-15 (6 ans en septembre 2026). | idem |
| 9 | Dates figées en avril-mai 2026 (« hier », « 22 avril », « vendredi 9 mai 2026 », `lastDate: '2026-04-09'`) alors que l'horloge du téléphone est en septembre 2026. `SchoolModeContext` calcule le mode avec la vraie date, les données non. | `AccueilScreen.tsx:40-42` · `messagerieData.ts` · `SignDocScreen.tsx:29,32` |
| 10 | `ConseilDuMatin.tsx` ne parle que de Lucas ; `demo-parcours.json:133-138` cite Emma dans une entrée de CM2. | `components/ConseilDuMatin.tsx`, `data/demo/demo-parcours.json:133-138` |

---

# 4. Doublons et conflits d'architecture relevés au passage

| Sujet | Constat |
|---|---|
| Deux barres inférieures | `FloatingTabBar` (jamais monté, mais 55 lignes de ses constantes) vs `BottomBar` (réelle) — voir Bug 5. |
| Deux « top bars » | `TopBar` (`components/navigation/TopBar.tsx`, vivante) et `AppTopbar.tsx`, `ScreenHeader.tsx`, `FusedChildHeader.tsx`, `MainLayout.tsx` **[morts]**. |
| Deux écrans de réglages | `ReglagesScreen` (vivant, route `ReglagesScreen`) et `SettingsScreen` **[mort]**. |
| Deux constantes `BOTTOM_BAR_HEIGHT` | `components/navigation/BottomBar.tsx:36` et `constants/design.ts:96` (toutes deux 70). |
| Deux `MOCK_CHILDREN` | `contexts/ActiveChildContext.tsx:41` (Child) et `services/childContext.ts:52` (ChildContext, profil différent, `age` faux). |
| Pile `Timetable` enregistrée 2 fois | `TabNavigator.tsx:361` et `:438`. |
| `Aria` : trois écrans de conversation | `AriaScreen` (`:320`), `AriaHomeScreen` (`:325`), `AriaConversationScreen` (`:330`) ; `AriaConversation` aussi dans la pile Messagerie (`:500`). |
| Badge « non lus » de la top bar | codé en dur : `hasUnreadMessages={false}` (`TabNavigator.tsx:896`) ; `NotificationsScreen` qui aurait pu l'alimenter est mort. |

---

# 5. Fichiers morts (aucun importeur vivant)

39 fichiers, ≈ 7 500 lignes. Tout défaut listé dans ces fichiers est sans effet à l'écran ; à supprimer ou à réintégrer (décision produit), pas à corriger.

`components/AppTopbar.tsx` · `AriaCard.tsx` · `AriaSparkleIcon.tsx` · `ChildSwitcher.tsx` · `DecorativeBlobs.tsx` · `FusedChildHeader.tsx` · `JoyScore.tsx` · `LuminousOrbs.tsx` · `RecentGrades.tsx` · `ScreenHeader.tsx` · `WeekAgenda.tsx` · `chat/AriaAvatar.tsx` · `dashboard/{AriaCard,DashboardTile,JoyScoreBanner,LyceeDashboard,MaternelleDashboard,PrimaireDashboard}.tsx` · `navigation/MainLayout.tsx` · `profile/{ArchiveBanner,CahierLiaisonParent,CompetenceRadar,ThemeSelector,YearSelector}.tsx` · `shared/{PeriodPicker,SortDropdown}.tsx` · `constants/{typography,wallpapers}.ts` · `lib/gluestack-theme.ts` · `screens/{AuthScreen,NotificationsScreen,RoleSelectionScreen,SettingsScreen}.tsx` · `screens/onboarding/*` (4) · `services/{auth,ocrService}.ts`.

(Analyse par import statique ; les imports par dossier `../ui` sont pris en compte. Un composant chargé dynamiquement par chaîne serait faussement compté comme mort.)

---

# 6. TOP 10 — corrections par impact visuel

| # | Correction | Pourquoi (impact) | Fichiers principaux | Effort |
|---|---|---|---|---|
| 1 | **Masquer la top/bottom bar sur toutes les pages profondes** (mécanisme par route, valable pour les 4 piles) | Le titre et « Participer » recouvrent la barre ; les CTA du bas sont sous la `BottomBar` : ~20 écrans | `navigation/TabNavigator.tsx:713-720, 889-947` + enregistrement de `SignDoc`/`SignSuccess` | M |
| 2 | **Brancher AccueilScreen sur l'enfant actif** (via `DemoContext`) | Bug 1 : la démo montre les mêmes notes/agenda/Aria pour les 3 enfants ; Léa a des notes | `AccueilScreen.tsx`, `DemoContext.tsx` | M |
| 3 | **Retirer Emma « en dur »** de SignDoc, SignSuccess, Homework, GradeDetail, Timetable, Bulletin, JustifierAbsenceSheet | Bug 2 : « Emma · 4eB » pour Léa | 7 fichiers §A.1 | S |
| 4 | **Un seul calcul de marge basse** : `getBottomBarScrollPadding(insets.bottom)` partout ; supprimer l'usage de `FloatingTabBar` | Bug 5 + contenu coupé (Accueil/Devoirs/Événement) + composeur mal espacé | 55 lignes §D | M |
| 5 | **Réparer le dropdown Messagerie** (`gap` → `marginRight`, `TouchableOpacity`, deux vues ombre/clip, `lineHeight`, coche dessinée sans glyphe hors police) et le sélecteur de trimestre de Notes | Bug 4 : filtre illisible | `MessagerieScreen.tsx:516-551, 1074-1147`, `NotesScreen.tsx:1483-1521` | S |
| 6 | **Purge des `gap` en row** (159 clés + inline/className) | Lignes empilées/chevauchées sur Android ; volume le plus important | 68 fichiers §K | L (mécanique) |
| 7 | **Léa maternelle cohérente** : pas de `T1/T2/T3`, pas de `/20`, 5 périodes ; corriger l'âge/la date de naissance dérivés | Le testeur voit des notes chez une enfant de maternelle | `NotesScreen.tsx`, `SchoolModeContext.tsx`, `AccueilScreen.tsx`, `childContext.ts` | M |
| 8 | **Supprimer le dégradé Aria hors Aria** (barres de progression, logo, RGPD) et le `#7C3AED` solide | Bug 6 + charte : 36 occurrences | `NotesScreen.tsx:1020-1035`, `LogoScolaria.tsx`, etc. | M |
| 9 | **Clavier sur Android** : `KeyboardAvoidingView behavior='height'` sur les 2 écrans Aria ; couvrir les 16 formulaires sans KAV | Champs cachés par le clavier (connexion, signalement d'absence, recherche) | §L | M |
| 10 | **Retirer les mentions fausses/juridiques** (signature légale, E2E, 100 % Europe, Google Vision) + « Note 8/20 » dans les aperçus | Contraire à la charte et trompeur pour un testeur | `AProposScreen.tsx`, `SignDocScreen.tsx:129`, `messagerieData.ts`, `RGPDScreen.tsx:94`… | S |

Hors top 10 mais bloquant côté sécurité : **N** (clés Anthropic/Google dans le bundle) → session dédiée, aucune correction visuelle ne la remplace.

---

# 7. Leçons de `tasks/lessons.md` violées dans `src/`

*C'est le point le plus important : les leçons sont bonnes mais appliquées par fichier, pas par motif. Vérification faite motif par motif sur tout `src/`.*

| Leçon (date) | Règle | Violée ? | Où (fichiers) |
|---|---|---|---|
| **2026-04-10 / 04-18 / 05-17 — `gap` sur `flexDirection:'row'`** | remplacer par `marginRight` explicite | **OUI — 159 clés + inline + 140 `gap-*` + 35 hors row** | 68 fichiers, dont : `NotesScreen` (9), `rgpd/JournalAccesScreen` (9), `rgpd/TransfertCodeScreen` (9), `ProfilEnfantScreen` (8), `rgpd/PermissionsScreen` (8), `rgpd/EffacementScreen` (7), `SignalerAbsenceScreen` (7), `JustifierAbsenceSheet` (6), `MonParcoursScreen` (6), `MessagerieScreen:1123` (le dropdown), `AgendaScreen`, `EditProfileScreen`, `AvatarPicker`… |
| **2026-04-10 — `KeyboardAvoidingView` `behavior` jamais `undefined` sur Android** | `'height'` sur Android | **OUI** | `aria/AriaHomeScreen.tsx:486-487` · `aria/AriaConversationScreen.tsx:454-455` (KAV même désactivé sur Android) ; 16 écrans à `TextInput` sans KAV (§L) |
| **2026-04-02 / 04-17 — `elevation: 0` sur les cartes ; balayer tout le code** | pas de `elevation>0` sur les surfaces « carte » | **OUI (à trier)** | 43 clés avec `elevation>0` ; cartes/en-têtes : `AriaActionCard:153`, `AriaHomeScreen:810`, `MessagerieScreen:926,970,1193`, `MonRessentiScreen:308`, `ProfilEnfantScreen:617`, `PinScreen:300`, `ReglagesScreen:550` |
| **2026-05-13 — `overflow:'hidden'` + `elevation` : deux vues** | clip et ombre sur des vues séparées | **OUI** | `MessagerieScreen.tsx:1074` (dropdown) · `ReglagesScreen.tsx:451` (sheet), `:550` (tuile) |
| **2026-05-16 — `Pressable` → `TouchableOpacity` dans les feuilles de sélection** | jamais `Pressable` sur ces lignes | **OUI** | `MessagerieScreen.tsx:524-530` (filtre) · `NotesScreen.tsx:1491, ~1701` (trimestre) · `components/chat/AddToDiscussionSheet.tsx:158-178` |
| **2026-04-17 — hauteurs en `%` dans une feuille/modal** | `flex:1`, pas de `%` | **OUI (risque)** | `maxHeight:'92%'` `rgpd/RgpdBottomSheet.tsx:62` · `'80%'` `AvatarPicker.tsx:244`, `JustifierAbsenceSheet.tsx:218` · `'85%'` `profile/CahierLiaisonParent.tsx:118` · `'75%'` `QuickSearchScreen.tsx:118` · `PermissionsScreen.tsx:532` · `teacher/CahierLiaisonScreen.tsx:294` |
| **2026-04-18 — `TAB_BAR_SCROLL_PADDING` réservé au `ScrollView` derrière la barre ; 16-24 px dans modals/drawers/sheets** | marge intrinsèque hors barre | **OUI** | drawer d'Aria `AriaHomeScreen.tsx:682` · `BurgerMenu.tsx:125` · `AvatarPicker.tsx:156` · `ErrorBoundary.tsx:34` · feuilles RGPD : `EffacementScreen:160`, `ExportDonneesScreen:170`, `JournalAccesScreen:203`, `PermissionsScreen:265,387`, `TransfertCodeScreen:242` |
| **2026-04-18 — `flexWrap:'wrap'` + largeur en `%` = chips écrasés sur Android** | `ScrollView horizontal` + `minWidth`/`marginRight` | **OUI** | `aria/AriaHomeScreen.tsx:803-812` (`suggestionWrap` + `suggestionCardOuter { width:'47%' }` — le cas exact de la leçon) · `components/profile/Portfolio.tsx:120-125` · `components/checkin/MaternelleMode.tsx:74-79` · `dashboard/*` **[morts]** |
| **2026-04-17 — IDs enfants identiques dans tous les fichiers ; `.find(…) ?? fallback[0]` + `console.warn`** | un seul schéma ; alerter en dev | **OUI (partiel)** | `services/absenceService.ts:82,97,112,127` · `rgpd/EffacementScreen.tsx:79-80` · `rgpd/TransfertCodeScreen.tsx:85-86` · `ProfilEnfantScreen.tsx:113,195` · `MonParcoursScreen.tsx:36-38,56` · `childContext.ts:336` (pas de `console.warn`) · `stores/messagerieStore.ts:28` |
| **2026-04-18 — `FloatingTabBar` : opt-out par route pour les écrans plein écran** | `ROUTES_HIDE_TAB_BAR` couvre tous les écrans concernés | **OUI (application partielle)** | `TabNavigator.tsx:713-720` ne couvre que 11 routes et seulement la pile Accueil (Bug 3) |
| **2026-04-10 — safe area posée au conteneur racine, pas dans `contentContainerStyle`** | `paddingTop: insets.top` sur le `View` racine | **OUI (contraint par la top bar absolue)** | `paddingTop: insets.top + 60/64…` dans `contentContainerStyle` : `NotesScreen:1459,1673` · `messagerie/AbsencesListScreen:122`, `EcoleListScreen:93`, `MessagesListScreen:213` · `SettingsScreen:152` **[mort]** · `AccueilScreen.tsx:145` (espaceur) — à réconcilier avec la top bar |
| **2026-05-16 — purger `#7C3AED`, y compris les `rgba(124,58,237,…)`** | `#4338CA` uniquement | **OUI** | 36 occurrences vivantes (§M) |
| **2026-05-11 / 05-17 — supprimer les constantes, styles et imports d'un élément retiré** | pas de code mort | **OUI** | 101 variables/imports inutilisés (`tsc --noUnusedLocals`) : `AgendaScreen` (7), `SignalerAbsenceScreen` (5), `NotificationsScreen` (4) **[mort]**, `AppTopbar` (4) **[mort]**, `EleveTabNavigator` (3), `ui/index` (3), `rgpd/*`, `SignDocScreen` (2), `NotesScreen` (2)… + 39 fichiers morts |
| **2026-03-29 — toute `EXPO_PUBLIC_*` dans `.env` ET `eas.json env`** | double source | **OUI** | `eas.json` sans bloc `env` ; variables absentes des environnements EAS (voir §N) |
| **2026-03-30 — ne pas dépendre de `.env` pour EAS ; utiliser `app.config.js` `extra` + `getEnv.ts`** | | Respectée… | …mais c'est ce motif qui embarque les clés secrètes dans l'APK (§N) : la leçon est à réviser (secrets → Edge Function) |
| 2026-04-17 — padding dynamique du composeur avec `useKeyboardInputPadding` | | Appliquée, **mais bâtie sur la barre fantôme** | `hooks/useKeyboardInputPadding.ts` + `FloatingTabBar.getInputBarPaddingBottom` |
| 2026-03-29 — ordre des providers | | **NON violée** | `App.tsx:126-148` : `SafeArea > I18n > Auth > SchoolMode > ActiveChild > ChildTheme > Wallpaper > Demo` — chaque provider n'utilise que des contextes situés au-dessus |
| 2026-03-29 — `useSafeAreaInsets` plutôt que hauteurs par plateforme | | **NON violée** | aucun `StatusBar.currentHeight` ni `paddingTop: Platform…` |
| 2026-04-18 — style `styles.x` non défini (`LinearGradient` à taille nulle) | | **NON violée** | vérifié sur tous les `StyleSheet` |
| 2026-04-18 — `sharedValue.value =` dans le corps du composant | | **NON violée** (heuristique : indentation de corps) | aucun cas trouvé |
| 2026-04-17 — fond du splash = fond de l'image | | **NON violée** | `app.config.js:34-42` : `#FFFFFF` |
| 2026-04-09 — plusieurs serveurs Metro ; balayage des sites de rendu | | Hors code | processus |
| 2026-05-16 — `WallpaperContext` intact | | Respectée | — |

**Le motif commun** : chaque leçon a été corrigée dans le fichier où elle est apparue, jamais par recherche du motif sur `src/`. La lecture du tableau montre que la grande majorité des leçons de mise en page Android est encore violée ailleurs.

---

# 8. Découpage en sessions

Ordre choisi pour qu'un lot ne soit pas défait par le suivant : d'abord la structure (barres), ensuite les données, ensuite les motifs mécaniques, la sécurité en dernier car indépendante. Chaque session se termine par un contrôle sur le dev client (`npm run dev:android`), pas sur le web (leçon 2026-09-18) ; un seul build EAS `preview` en fin de sprint.

| Session | Lot | Contenu | Livrable de contrôle |
|---|---|---|---|
| **1** | **Chrome de navigation** | Décider top bar **ou** en-tête de page (trancher COMPONENTS §0/§6) ; mécanisme de masquage par route valable pour les 4 piles ; enregistrer `SignDoc`/`SignSuccess` dans la bonne pile ; un seul helper de marge basse (`getBottomBarScrollPadding`) et suppression de `FloatingTabBar` ; corriger les 4 CTA du bas (E) | Ouvrir Autorisation, Devoirs, Détail note, Détail événement, Bulletin, Conversation : un seul en-tête, CTA visibles au-dessus de la zone de gestes |
| **2** | **Données par enfant** | Accueil branché sur `DemoContext` (todo, aujourd'hui, notes, message Aria, cas maternelle sans notes) ; retirer Emma en dur (A.1) ; unifier IDs (A.3) ; unifier classes/établissements et `age` ; fixer les dates de démo | Basculer Léa / Lucas / Emma : Accueil, Autorisation, Devoirs, Bulletin, Emploi du temps changent ; Léa n'a ni `/20` ni T1 |
| **3** | **Maternelle et charte de contenu** | Notes maternelle : 5 périodes, pas de trimestres ni de notes ; retirer « Note 8/20 » des aperçus ; retirer les mentions fausses (signature légale, E2E, 100 % Europe, Google Vision) ; supprimer les réglages fantômes (O) | Liste Messagerie sans note chiffrée ; À propos sans affirmation fausse ; aucun réglage sans effet |
| **4** | **Lot « Android layout »** (leçons appliquées par motif) | `gap` → `marginRight` (159 + inline + className) ; `Pressable` → `TouchableOpacity` sur les lignes de sélection ; dropdown Messagerie + trimestre Notes ; `elevation`+`overflow` en deux vues ; `%` dans les sheets → `flex`/`flexShrink` ; ScrollView RGPD ; `TAB_BAR_SCROLL_PADDING` hors sheets/drawers ; `Dimensions` → `useWindowDimensions` ; KAV Android | Une passe de grep par motif en fin de session : **0 occurrence** (règle de la leçon 2026-04-17) |
| **5** | **Typographie et charte couleur** | `fontWeight` avec Figtree ; `lineHeight` (après arbitrage §I) ; tailles < 11 selon le plancher décidé ; dégradé Aria hors Aria (`GradientTrack`, logo, RGPD) ; `#7C3AED` solide → `#4338CA` ; `#6366F1` hors Aria | grep `7C3AED`, `6366F1`, `fontWeight` avec `fontFamily` : 0 hors zones Aria |
| **6** | **Nettoyage** | supprimer les 39 fichiers morts (ou les réintégrer) et les 101 imports/variables inutilisés ; retirer les doublons (`MOCK_CHILDREN` ×2, `BOTTOM_BAR_HEIGHT` ×2, `Timetable` ×2) | `tsc --noEmit --noUnusedLocals` propre |
| **7** | **Sécurité et EAS** *(indépendante, à planifier avant toute distribution à des testeurs)* | retirer les deux clés `EXPO_PUBLIC_*` sensibles de `app.config.js` et `getEnv.ts` ; Aria via Edge Function Supabase (le client n'envoie que le message + le jeton de session) ; supprimer les `console.log` de préfixe de clé ; `eas.json`/variables EAS pour l'URL et l'anon key ; réviser la leçon 2026-03-30 ; branchement Supabase des enfants réels (UUID) | l'APK ne contient plus de clé secrète (recherche de chaînes dans le bundle) |
| **8** | **Diagnostic sur appareil** *(à faire avec l'appareil en main)* | Bug 5 dans Notes (mesures `onLayout`, insets réels), Bug 4 (rendu du dropdown après session 4), clavier sur Aria (edge-to-edge) | captures avant/après sur le Redmi Note 9S |

Le Bug 5 (Notes) est le seul point dont la cause n'est pas établie ; il est volontairement isolé en session 8 plutôt que « corrigé à l'aveugle ».

---

# Annexes

## Annexe A — `gap` dans un style `flexDirection: 'row'` (159)

*Format : `fichier:ligne clé propriété`. Les 35 `gap` hors row sont en annexe B.*

```
src/components/aria/AriaActionCard.tsx:182 header columnGap: 10
src/components/aria/AriaActionCard.tsx:236 buttonRow columnGap: 10
src/components/aria/AriaActionCard.tsx:273 loadingRow columnGap: 10
src/components/aria/AriaActionCard.tsx:287 resultRow columnGap: 10
src/components/AvatarPicker.tsx:265 tabRow gap: 8
src/components/AvatarPicker.tsx:268 tab gap: 6
src/components/AvatarPicker.tsx:280 emojiGrid gap: 8
src/components/AvatarPicker.tsx:291 photoBtn gap: 10
src/components/AvatarPicker.tsx:309 actions gap: 12
src/components/BurgerMenu.tsx:285 menuItem gap: 16
src/components/BurgerMenu.tsx:308 footerBrandRow gap: 8
src/components/checkin/MaternelleMode.tsx:72 grid gap: 10
src/components/checkin/RessentiSlider.tsx:53 labelLeft columnGap: 8
src/components/FloatingTabBar.tsx:532 popoverItem gap: 10
src/components/JustifierAbsenceSheet.tsx:271 absenceCardTop gap: 7
src/components/JustifierAbsenceSheet.tsx:309 infoRow gap: 10
src/components/JustifierAbsenceSheet.tsx:342 pillsRow gap: 8
src/components/JustifierAbsenceSheet.tsx:383 ariaLabel gap: 6
src/components/JustifierAbsenceSheet.tsx:408 attachRow gap: 10
src/components/JustifierAbsenceSheet.tsx:432 footer gap: 10
src/components/profile/JoyHistory.tsx:148 dotsRow gap: 6
src/components/profile/JoyHistory.tsx:164 legend gap: 16
src/components/profile/JoyHistory.tsx:171 legendItem gap: 6
src/components/profile/Portfolio.tsx:118 grid gap: 8
src/components/profile/Portfolio.tsx:149 progressRow gap: 4
src/components/QuickActionsSheet.tsx:131 row gap: 14
src/components/rgpd/RgpdHero.tsx:49 row gap: 12
src/components/shared/GradientButton.tsx:109 content gap: 10
src/components/shared/PeriodPicker.tsx:69 trigger gap: 6
src/components/shared/PeriodPicker.tsx:111 option gap: 12
src/components/shared/SortDropdown.tsx:70 trigger gap: 6
src/components/shared/SortDropdown.tsx:103 option gap: 10
src/components/UniversalInputBar.tsx:248 rightActions columnGap: 8
src/screens/AgendaScreen.tsx:1228 monthTitleRow gap: 8
src/screens/AgendaScreen.tsx:1425 eventInner gap: 12
src/screens/AgendaScreen.tsx:1545 modalDateRow gap: 8
src/screens/AgendaScreen.tsx:1571 modalTypeRow gap: 8
src/screens/AgendaScreen.tsx:1714 hwPillRow gap: 5
src/screens/AProposScreen.tsx:340 statsRow gap: 8
src/screens/AProposScreen.tsx:368 sectionHeader gap: 10
src/screens/AProposScreen.tsx:395 articleRow gap: 12
src/screens/AProposScreen.tsx:451 contactRow gap: 10
src/screens/ArchivedYearDetailScreen.tsx:400 sectionRow gap: 8
src/screens/ArchivedYearDetailScreen.tsx:489 bulletinHeaderLeft gap: 10
src/screens/ArchivedYearDetailScreen.tsx:506 bulletinHeaderRight gap: 8
src/screens/ArchivedYearDetailScreen.tsx:545 subjectRow gap: 10
src/screens/ArchivedYearDetailScreen.tsx:616 appreciationInner gap: 12
src/screens/aria/AriaConversationScreen.tsx:734 topbar columnGap: 10
src/screens/aria/AriaConversationScreen.tsx:950 liquidGlassInner columnGap: 8
src/screens/aria/AriaHomeScreen.tsx:755 topbar columnGap: 10
src/screens/aria/AriaHomeScreen.tsx:803 suggestionWrap columnGap: 8
src/screens/aria/AriaHomeScreen.tsx:960 liquidGlassInner columnGap: 8
src/screens/BulletinScreen.tsx:299 triPillsRow gap: 4
src/screens/EditProfileScreen.tsx:477 header gap: 10
src/screens/EditProfileScreen.tsx:619 parentRow gap: 12
src/screens/EditProfileScreen.tsx:690 settingsRow gap: 12
src/screens/EditProfileScreen.tsx:775 ariaTuningHeader gap: 8
src/screens/EditProfileScreen.tsx:797 ariaTones gap: 6
src/screens/InscriptionScreen.tsx:233 stepRow gap: 8
src/screens/InscriptionScreen.tsx:251 roleCard gap: 14
src/screens/messagerie/AbsencesListScreen.tsx:217 sectionHeaderRow gap: 8
src/screens/messagerie/AbsencesListScreen.tsx:237 card gap: 12
src/screens/messagerie/AbsencesListScreen.tsx:269 absenceTitleRow gap: 8
src/screens/messagerie/EcoleListScreen.tsx:171 sectionHeaderRow gap: 8
src/screens/messagerie/EcoleListScreen.tsx:191 card gap: 12
src/screens/messagerie/EcoleListScreen.tsx:223 annTitleRow gap: 8
src/screens/messagerie/MessagesListScreen.tsx:430 sectionHeaderRow gap: 8
src/screens/messagerie/MessagesListScreen.tsx:453 card gap: 12
src/screens/messagerie/MessagesListScreen.tsx:501 convTitleRow gap: 8
src/screens/messagerie/MessagesListScreen.tsx:608 teacherRow gap: 12
src/screens/messagerie/MotDetailScreen.tsx:130 signedBadge gap: 4
src/screens/MessagerieScreen.tsx:1119 filterModalRow gap: 8
src/screens/MessagerieScreen.tsx:1248 rowTop gap: 4
src/screens/MessagerieScreen.tsx:1278 tagsRow gap: 5
src/screens/MessagerieScreen.tsx:1299 rowBottom gap: 8
src/screens/MonParcoursScreen.tsx:277 timelineRow gap: 6
src/screens/MonParcoursScreen.tsx:287 sectionRow gap: 8
src/screens/MonParcoursScreen.tsx:319 niveauRow gap: 6
src/screens/MonParcoursScreen.tsx:339 statutBadge gap: 5
src/screens/MonParcoursScreen.tsx:353 bulletinRow gap: 8
src/screens/MonParcoursScreen.tsx:367 addButton gap: 8
src/screens/MonRessentiScreen.tsx:344 titleBlock gap: 12
src/screens/MonRessentiScreen.tsx:396 msgLabelRow gap: 8
src/screens/MonRessentiScreen.tsx:433 submitSolid gap: 8
src/screens/MonRessentiScreen.tsx:477 urgencyLine gap: 10
src/screens/NotesScreen.tsx:2026 titleActions gap: 10
src/screens/NotesScreen.tsx:2151 trimesterOptionRow gap: 12
src/screens/NotesScreen.tsx:2157 trimesterOptionLabelWrap gap: 8
src/screens/NotesScreen.tsx:2198 avgNumRow gap: 4
src/screens/NotesScreen.tsx:2248 statsRow gap: 10
src/screens/NotesScreen.tsx:2266 inlineScore gap: 2
src/screens/NotesScreen.tsx:2354 noteRight gap: 6
src/screens/NotesScreen.tsx:2437 legendRow gap: 16
src/screens/NotesScreen.tsx:2438 legendItem gap: 6
src/screens/NotificationsScreen.tsx:397 sectionRow gap: 8
src/screens/NotificationsScreen.tsx:417 cardInner gap: 12
src/screens/PinScreen.tsx:208 backBtn gap: 10
src/screens/PinScreen.tsx:250 pinRow gap: 14
src/screens/PinScreen.tsx:262 dotsRow gap: 12
src/screens/PinScreen.tsx:284 errorRow gap: 8
src/screens/ProfilEnfantScreen.tsx:705 scaPill gap: 6
src/screens/ProfilEnfantScreen.tsx:792 spTraits gap: 8
src/screens/ProfilEnfantScreen.tsx:798 traitPill gap: 4
src/screens/ProfilEnfantScreen.tsx:825 spFooterLeft gap: 6
src/screens/ProfilEnfantScreen.tsx:832 spShareBtn gap: 4
src/screens/ProfilEnfantScreen.tsx:847 compRow gap: 8
src/screens/ProfilEnfantScreen.tsx:883 actionsRow gap: 8
src/screens/ProfilEnfantScreen.tsx:892 actionPill gap: 4
src/screens/QuickSearchScreen.tsx:141 row gap: 12
src/screens/ReglagesScreen.tsx:602 rowInner gap: 12
src/screens/rgpd/EffacementScreen.tsx:443 childRow gap: 12
src/screens/rgpd/EffacementScreen.tsx:450 navRow gap: 12
src/screens/rgpd/EffacementScreen.tsx:451 backBtn gap: 6
src/screens/rgpd/EffacementScreen.tsx:453 catRow gap: 12
src/screens/rgpd/EffacementScreen.tsx:472 timelineRow gap: 12
src/screens/rgpd/EffacementScreen.tsx:475 cancelBtn gap: 8
src/screens/rgpd/EffacementScreen.tsx:477 darkBtn gap: 10
src/screens/rgpd/ExportDonneesScreen.tsx:361 formatRow gap: 10
src/screens/rgpd/ExportDonneesScreen.tsx:376 moduleRow gap: 12
src/screens/rgpd/ExportDonneesScreen.tsx:385 historyRow gap: 12
src/screens/rgpd/ExportDonneesScreen.tsx:403 noticeRow gap: 10
src/screens/rgpd/ExportDonneesScreen.tsx:405 darkBtn gap: 10
src/screens/rgpd/JournalAccesScreen.tsx:358 infoRow gap: 12
src/screens/rgpd/JournalAccesScreen.tsx:370 statsRow gap: 10
src/screens/rgpd/JournalAccesScreen.tsx:374 filterRow gap: 8
src/screens/rgpd/JournalAccesScreen.tsx:385 entryTopRow gap: 12
src/screens/rgpd/JournalAccesScreen.tsx:392 badgeRow gap: 8
src/screens/rgpd/JournalAccesScreen.tsx:393 actionBadge gap: 5
src/screens/rgpd/JournalAccesScreen.tsx:395 metaRow gap: 16
src/screens/rgpd/JournalAccesScreen.tsx:398 expandedRow gap: 8
src/screens/rgpd/JournalAccesScreen.tsx:403 noticeRow gap: 10
src/screens/rgpd/PermissionsScreen.tsx:483 infoRow gap: 12
src/screens/rgpd/PermissionsScreen.tsx:496 levelRow gap: 12
src/screens/rgpd/PermissionsScreen.tsx:497 levelSelectRow gap: 12
src/screens/rgpd/PermissionsScreen.tsx:501 pillRow gap: 4
src/screens/rgpd/PermissionsScreen.tsx:505 personRow gap: 12
src/screens/rgpd/PermissionsScreen.tsx:512 invitePressable gap: 10
src/screens/rgpd/PermissionsScreen.tsx:524 statsRow gap: 10
src/screens/rgpd/PermissionsScreen.tsx:541 actionBtn gap: 8
src/screens/rgpd/TransfertCodeScreen.tsx:429 howRow gap: 12
src/screens/rgpd/TransfertCodeScreen.tsx:433 childRow gap: 12
src/screens/rgpd/TransfertCodeScreen.tsx:438 genBtn gap: 6
src/screens/rgpd/TransfertCodeScreen.tsx:453 newCodeActions gap: 12
src/screens/rgpd/TransfertCodeScreen.tsx:466 outlineBtn gap: 10
src/screens/rgpd/TransfertCodeScreen.tsx:483 statusBadge gap: 4
src/screens/rgpd/TransfertCodeScreen.tsx:489 codeActions gap: 10
src/screens/rgpd/TransfertCodeScreen.tsx:490 codeActionBtn gap: 6
src/screens/rgpd/TransfertCodeScreen.tsx:492 noticeRow gap: 10
src/screens/RGPDScreen.tsx:114 noticeRow gap: 10
src/screens/SignalerAbsenceScreen.tsx:585 pillRow gap: 10
src/screens/SignalerAbsenceScreen.tsx:631 checkRow gap: 10
src/screens/SignalerAbsenceScreen.tsx:646 motifRow gap: 12
src/screens/SignalerAbsenceScreen.tsx:673 recapChildRow gap: 12
src/screens/SignalerAbsenceScreen.tsx:691 recapRow gap: 10
src/screens/SignalerAbsenceScreen.tsx:709 warningBox gap: 8
src/screens/SignalerAbsenceScreen.tsx:727 primaryBtn gap: 8
src/screens/SubjectDetailScreen.tsx:267 trendBadge gap: 4
src/screens/TextSizeScreen.tsx:66 card gap: 14
src/screens/WallpaperPickerScreen.tsx:140 pillsRow gap: 8
```

## Annexe B — `gap` hors `flexDirection: 'row'` (35, colonne ou conteneur `wrap`)

```
src/components/AvatarPicker.tsx:288 photoSection gap: 12
src/components/AvatarPicker.tsx:303 initialsSection gap: 12
src/components/JustifierAbsenceSheet.tsx:255 scrollContent gap: 10
src/components/JustifierAbsenceSheet.tsx:263 absenceCard gap: 4
src/components/JustifierAbsenceSheet.tsx:370 ariaCardWrap gap: 6
src/components/profile/JoyHistory.tsx:153 dotCol gap: 4
src/screens/AgendaScreen.tsx:1263 monthScrollContent gap: 6
src/screens/AgendaScreen.tsx:1349 weekStripDay gap: 4
src/screens/AgendaScreen.tsx:1625 filterPillsContent gap: 6
src/screens/AProposScreen.tsx:462 footer gap: 8
src/screens/ArchivedYearDetailScreen.tsx:32 ArchivedYearDetail gap: 4
src/screens/ArchivedYearDetailScreen.tsx:363 scrollContent gap: 12
src/screens/ArchivedYearDetailScreen.tsx:476 bulletinsContainer gap: 10
src/screens/ArchivedYearDetailScreen.tsx:595 emptyState gap: 8
src/screens/AriaScreen.tsx:322 suggestionsContainer gap: 8
src/screens/EditProfileScreen.tsx:583 addCard gap: 8
src/screens/messagerie/AbsencesListScreen.tsx:262 absenceBody gap: 3
src/screens/messagerie/AbsencesListScreen.tsx:310 emptyState gap: 12
src/screens/messagerie/EcoleListScreen.tsx:216 annBody gap: 3
src/screens/messagerie/MessagesListScreen.tsx:494 convBody gap: 2
src/screens/messagerie/MessagesListScreen.tsx:546 motBody gap: 2
src/screens/messagerie/MessagesListScreen.tsx:631 teacherTextCol gap: 2
src/screens/messagerie/MotDetailScreen.tsx:77 content gap: 12
src/screens/NotesScreen.tsx:2281 pillRow gap: 10
src/screens/NotificationsScreen.tsx:430 cardContent gap: 2
src/screens/rgpd/ExportDonneesScreen.tsx:362 formatCard gap: 6
src/screens/rgpd/JournalAccesScreen.tsx:397 expandedSection gap: 6
src/screens/rgpd/JournalAccesScreen.tsx:400 emptyState gap: 10
src/screens/rgpd/TransfertCodeScreen.tsx:487 codeMeta gap: 4
src/screens/SignalerAbsenceScreen.tsx:565 scrollContent gap: 14
src/screens/SignalerAbsenceScreen.tsx:643 motifList gap: 10
src/screens/SignalerAbsenceScreen.tsx:670 recapCard gap: 14
src/screens/SignalerAbsenceScreen.tsx:741 successContainer gap: 16
src/screens/SignalerAbsenceScreen.tsx:748 successCard gap: 12
src/screens/TextSizeScreen.tsx:59 root gap: 12
```

## Annexe C — Détails typographiques et élévations

### C.1 `fontSize < 11` (52)

```
src/components/BurgerMenu.tsx:277 fontSize=10
src/components/BurgerMenu.tsx:317 fontSize=10
src/components/BurgerMenu.tsx:322 fontSize=10
src/components/dashboard/DashboardTile.tsx:118 fontSize=10
src/components/dashboard/DashboardTile.tsx:150 fontSize=10
src/components/FloatingTabBar.tsx:568 fontSize=10
src/components/FusedChildHeader.tsx:108 fontSize=9
src/components/JustifierAbsenceSheet.tsx:292 fontSize=7.5
src/components/profile/JoyHistory.tsx:161 fontSize=10
src/components/profile/Portfolio.tsx:145 fontSize=9
src/components/profile/Portfolio.tsx:170 fontSize=9
src/components/profile/Portfolio.tsx:182 fontSize=9
src/components/profile/ThemeSelector.tsx:84 fontSize=10
src/components/SectionLabel.tsx:15 fontSize=9
src/constants/typography.ts:43 fontSize=10
src/constants/typography.ts:48 fontSize=10
src/screens/AccueilScreen.tsx:370 fontSize=9
src/screens/AgendaScreen.tsx:1683 fontSize=8.5
src/screens/AgendaScreen.tsx:1689 fontSize=8
src/screens/AgendaScreen.tsx:1729 fontSize=9
src/screens/AgendaScreen.tsx:1741 fontSize=9
src/screens/AProposScreen.tsx:364 fontSize=10
src/screens/AProposScreen.tsx:412 fontSize=10
src/screens/BulletinScreen.tsx:341 fontSize=8.5
src/screens/BulletinScreen.tsx:448 fontSize=7.5
src/screens/BulletinScreen.tsx:507 fontSize=10
src/screens/EditProfileScreen.tsx:150 fontSize=9
src/screens/EditProfileScreen.tsx:579 fontSize=10
src/screens/EditProfileScreen.tsx:611 fontSize=10
src/screens/EventDetailScreen.tsx:283 fontSize=10
src/screens/EventDetailScreen.tsx:413 fontSize=8.5
src/screens/GradeDetailScreen.tsx:343 fontSize=10
src/screens/HomeworkScreen.tsx:345 fontSize=10
src/screens/HomeworkScreen.tsx:421 fontSize=10.5
src/screens/HomeworkScreen.tsx:508 fontSize=10.5
src/screens/HomeworkScreen.tsx:521 fontSize=10.5
src/screens/LoginScreen.tsx:157 fontSize=10
src/screens/MessagerieScreen.tsx:1178 fontSize=8.5
src/screens/MonParcoursScreen.tsx:349 fontSize=10
src/screens/MonRessentiScreen.tsx:452 fontSize=10
src/screens/NotesScreen.tsx:2252 fontSize=10
src/screens/NotesScreen.tsx:2260 fontSize=10
src/screens/NotesScreen.tsx:2369 fontSize=10
src/screens/NotesScreen.tsx:2376 fontSize=10
src/screens/ProfilEnfantScreen.tsx:764 fontSize=10
src/screens/ReglagesScreen.tsx:505 fontSize=10
src/screens/rgpd/EffacementScreen.tsx:438 fontSize=10
src/screens/rgpd/ExportDonneesScreen.tsx:374 fontSize=10
src/screens/rgpd/JournalAccesScreen.tsx:373 fontSize=10
src/screens/rgpd/PermissionsScreen.tsx:503 fontSize=10
src/screens/TimetableScreen.tsx:443 fontSize=10
src/screens/TimetableScreen.tsx:495 fontSize=9
```

### C.2 Styles avec `elevation > 0` (43)

```
src/components/aria/AriaActionCard.tsx:153 card elevation=3 r=16
src/components/AvatarPicker.tsx:237 sheet elevation=20
src/components/chat/AddToDiscussionSheet.tsx:201 sheet elevation=16
src/components/checkin/RessentiSlider.tsx:76 sliderAndroid elevation=3
src/components/ChildSelectorSheet.tsx:157 sheet elevation=16
src/components/FloatingTabBar.tsx:509 popover elevation=12 r=16
src/components/JustifierAbsenceSheet.tsx:214 sheet elevation=20
src/components/navigation/TopBar.tsx:286 childAvatarOuter elevation=4 r=17
src/components/QuickActionsSheet.tsx:110 sheet elevation=20
src/components/shared/RoundGlassIconButton.tsx:93 shadowWrap elevation=6
src/components/UniversalInputBar.tsx:29 android elevation=4
src/components/UniversalInputBar.tsx:262 sendAriaGradient elevation=4 r=16
src/constants/theme.ts:39 android elevation=4
src/constants/theme.ts:62 android elevation=2
src/constants/theme.ts:85 android elevation=2
src/constants/theme.ts:204 android elevation=6
src/screens/AgendaScreen.tsx:1518 modalContent elevation=20
src/screens/aria/AriaConversationScreen.tsx:808 drawer elevation=8
src/screens/aria/AriaHomeScreen.tsx:810 suggestionCardOuter elevation=3 r=14
src/screens/aria/AriaHomeScreen.tsx:840 drawer elevation=8
src/screens/MessagerieScreen.tsx:835 headerActionsCluster elevation=4
src/screens/MessagerieScreen.tsx:926 filterToutOuterWrap elevation=3 r=18
src/screens/MessagerieScreen.tsx:970 filterPillShadowWrap elevation=3 r=18
src/screens/MessagerieScreen.tsx:1001 searchDismissLayer elevation=32
src/screens/MessagerieScreen.tsx:1074 filterDropdownCard elevation=10 r=12
src/screens/MessagerieScreen.tsx:1193 rowShadowWrap elevation=2 r=16
src/screens/MessagerieScreen.tsx:1349 fabShadowOuter elevation=10 r=999
src/screens/MonRessentiScreen.tsx:53 maternelle elevation=8
src/screens/MonRessentiScreen.tsx:60 primaire elevation=8
src/screens/MonRessentiScreen.tsx:67 lycee elevation=8
src/screens/MonRessentiScreen.tsx:308 header elevation=3
src/screens/PinScreen.tsx:300 submitBtn elevation=6 r=16
src/screens/ProfilEnfantScreen.tsx:617 whiteHeader elevation=4
src/screens/QuickSearchScreen.tsx:112 sheet elevation=20
src/screens/ReglagesScreen.tsx:451 sheet elevation=12
src/screens/ReglagesScreen.tsx:550 wallpaperGridTile elevation=2 r=10
src/screens/teacher/AbsencesEnseignantScreen.tsx:26 android elevation=8
src/screens/teacher/AppreciationsScreen.tsx:27 android elevation=8
src/screens/teacher/CahierLiaisonScreen.tsx:33 android elevation=8
src/screens/teacher/MessagerieParentsScreen.tsx:23 android elevation=8
src/screens/teacher/MeteoClasseScreen.tsx:29 android elevation=8
src/screens/teacher/TeacherDashboardScreen.tsx:31 android elevation=8
src/screens/teacher/VieDeClasseScreen.tsx:36 android elevation=8
```

## Annexe D — Commandes de recoupement

```bash
# K — gap
grep -rnE "\b(gap|columnGap|rowGap): ?[0-9]" src --include=*.tsx --include=*.ts
grep -rnE 'className="[^"]*gap-[0-9]' src --include=*.tsx
# L — KeyboardAvoidingView
grep -rn "KeyboardAvoidingView" -A4 src --include=*.tsx | grep -E "behavior|enabled"
# M — violet / cyan / Aria
grep -rniE "7c3aed|6366f1|22d3ee|06b6d4" src --include=*.tsx --include=*.ts
# G — Dimensions au niveau du module
grep -rnE "^(const|let|var) .*Dimensions\.get" src --include=*.tsx --include=*.ts
# D/E — marges basses
grep -rnE "TAB_BAR_SCROLL_PADDING|FLOATING_TAB_BAR_HEIGHT|BOTTOM_BAR_HEIGHT|getBottomBarScrollPadding" src --include=*.tsx
# Code inutilisé
npx tsc --noEmit --noUnusedLocals
# Fichiers morts : un fichier est mort si aucun autre fichier vivant ne l'importe
```

*Fin de l'audit.*
