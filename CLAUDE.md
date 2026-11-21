# CLAUDE.md — Design System & Règles Scolaria
*Version 3.3 · 16 novembre 2026 · v3.2 + architecture du 16 nov. : onglet Scolarité sur deux niveaux, Messages en fils, mot complet, Agenda (devoirs, absence, rendez-vous fixes), bouton « + » unique, champ « Rechercher ou demander », fond Brume et cartes opaques, vouvoiement, espace enseignant en miroir*

> Ce fichier est l'unique CLAUDE.md du projet. Toute version antérieure (v2.x, v3.0 à v3.2) est caduque.
> L'identité (nom, logo, wordmark, symbole) est en cours de changement : elle est traitée à part et n'a pas été modifiée en v3.3. La ligne « Copilote » de la section Nom sera revue avec elle (décision du 17 nov.) ; d'ici là, l'interface n'affiche aucun nom de personnage (§ Vocabulaire).
> En cas de conflit sur un composant UI, COMPONENTS.md a priorité.

---

## Nom de l'application
**Scolaria** — jamais "ScolarIA" avec majuscules, jamais "Scholaris".
Police uniforme sur tout le mot — pas de traitement spécial sur "ia".
Tagline : "Le carnet de scolarité numérique" (partout : app, site, stores, VISION.md)
"Copilote" est réservé pour décrire Aria, jamais comme tagline.

---

## Vision stratégique (résumé)
Scolaria est le **carnet de scolarité numérique** qui manque aux familles françaises.
Comme le carnet de santé, il appartient à la famille — pas à l'institution.
Il suit l'enfant de la maternelle au bac, indépendamment des établissements.
**Scolaria remplace les ENTs (Pronote, EcoleDirecte, Beneylu) — il ne s'y connecte jamais.**
→ Document complet : VISION.md

### Stratégie produit : le carnet d'abord, le lien école ensuite
- Le parent a une raison d'utiliser Scolaria seul, dès le premier jour (carnet, import, souvenirs, deux parents, plusieurs enfants).
- L'enseignant qui rejoint Scolaria accélère le remplissage du carnet — il n'en est pas le prérequis.
- Entrée : maternelle / primaire. Extension collège / lycée par continuité du même carnet.

### Précision « ne jamais se connecter aux ENTs »
Scolaria ne se connecte à aucun ENT : pas d'API, pas de scraping, pas d'identifiants tiers.
**L'import manuel par le parent de ses propres documents (photo, capture, PDF) n'est pas une connexion** et est autorisé.

---

## Vocabulaire
- **Le carnet** = tout ce qui concerne un enfant, c'est-à-dire les quatre onglets (Accueil, Scolarité, Agenda, Messages).
- **Scolarité** = l'onglet anciennement nommé « Suivi » (le mot « Suivi » ne s'affiche plus nulle part).
- **L'assistant** = le seul libellé affiché pour l'IA. Aucun nom de personnage dans l'interface. Les noms internes du code (`aria`, Edge Function « aria », `ariaApi.ts`…) ne changent pas.
- **Vouvoiement partout** pour ce qui s'adresse aux parents, y compris dans les textes générés par l'assistant.
  **Exception (décision du 17 nov. 2026)** : les écrans qui parlent à l'ENFANT (le parent lui tend le téléphone : `MaternelleMode`, `MonRessentiScreen`) gardent le tutoiement.

---

## Principe fondateur — Un enfant = un carnet
- Chaque enfant a son propre carnet, **sans exception, devoirs compris**. **Aucune vue ne mélange plusieurs enfants** (messages compris).
- Le parent choisit le carnet via l'avatar (sélecteur d'enfant).
- Toute donnée (mot, message, signature, photo, document, événement, devoir) est rattachée à l'enfant (`child_id`, ou `student_id` selon la table) + `academic_year_id` — jamais au parent seul.
- Mot reçu pour deux enfants d'un même foyer : **une copie par carnet**, une signature par enfant ; un mot à signer propose « Signer aussi pour [prénom] ».
- **« Lu » d'un mot (décision du 18 nov. 2026, remplace le point I4 de l'audit)** : enregistré **par responsable et par mot**, jamais par carnet (`read_receipts`, clé unique mot + responsable). Un mot lu dans le carnet d'un enfant est lu dans tous les carnets de ce responsable qui ont reçu le même mot. La signature, la réponse et le oui / peut-être / non restent **par carnet**. Côté enseignant, le compteur « ont lu » compte un élève comme lu dès qu'**un** de ses responsables a lu (fonction `lectures_mot`, migration en attente : `supabase/migrations_en_attente/m38_lectures_mot.sql`, nombres agrégés seulement, jamais qui a lu).
- **Nouveauté chez un autre enfant** : pastille rouge sur l'avatar de la top bar. Dans le sélecteur, chaque enfant affiche un décompte en clair (« 1 mot à signer · 2 nouveautés ») ou « À jour ».
  La pastille s'allume pour : mot à traiter, message non lu, devoir pour demain non coché. Une photo ou une compétence ajoutée ne l'allume pas.
- Chaque notification push nomme l'enfant et ouvre son carnet.
- À 18 ans, l'enfant récupère son carnet complet, sans tri.

---

## Stack technique
- React Native / Expo + EAS (plan Free, vérifié le 4 oct 2026 par `eas account:usage` : 15 builds Android et 15 iOS par mois, file basse priorité)
- Supabase (BDD + Auth + Storage + RLS)
- TypeScript
- NativeWind (Tailwind CSS pour React Native)

### Librairies clés
- `@getpapillon/papicons` — icônes de navigation de la top bar (Accueil, Scolarité, Agenda, Messages)
- `lucide-react-native` — toutes les autres icônes (size 20-24, strokeWidth 2)
- `expo-linear-gradient` — dégradés natifs (obligatoire — backgroundColor ne supporte pas les dégradés sur native)
- `react-native-reanimated` — animations
- `expo-speech` — saisie vocale de l'assistant (à venir)

### Composants de base (`src/components/ui`)
- `Text`, `TextInput`, `Pressable` s'importent **toujours** depuis `src/components/ui`, jamais depuis `react-native`.
- `Pressable` de `components/ui` résout les styles en fonction (`style={({ pressed }) => …}`) : sur Android (NativeWind), un style fonction passé au Pressable natif est **ignoré**.

---

## Identité visuelle

### Système identitaire — règle absolue
| Élément | Valeur |
|---------|--------|
| Wordmark | Rufina Bold 700, #0F172A |
| ✦ sparkle wordmark | Indigo `#4338CA` solide |
| Symbole (8 ellipses) | Indigo `#4338CA` |
| Icône app | Fond blanc `#FFFFFF` + symbole indigo |
| Règle couleur | Blanc/noir dominent — indigo = seule couleur d'ACTION |

**Indigo `#4338CA` = la seule couleur d'ACTION** (boutons, liens, sélection, états actifs). Partout. Toujours.
Les teintes de catégorie (ci-dessous) servent à CLASSER, jamais à agir ni à évaluer.
Le dégradé `#6366F1 → #22D3EE` est réservé exclusivement à l'assistant — jamais sur l'identité de marque.
Le violet `#7C3AED` et l'ancien gradient Aria `#8B5CF6 → #1B72E8` sont supprimés.

- `assets/icon.png` — 1024×1024 : symbole centré, fond `#FFFFFF`
- Android adaptive : `foregroundImage` + `backgroundColor: "#FFFFFF"`
- **Wordmark in-app :** `<ScolariaLogo>` — font Rufina (exception unique à Figtree)
- **Symbole seul :** `<ScolariaSymbol>` — couleur #4338CA par défaut
- **Sous 32px :** version compacte automatique (`COMPACT_BELOW = 32`) — mêmes 8 ellipses, mêmes angles, ellipses plus pleines et couronne resserrée pour rester lisibles. Ne jamais dessiner un autre symbole pour les petites tailles.
- Ne jamais régénérer l'icône via le composant — utiliser le PNG officiel

### Couleur de l'enfant
Chaque enfant a une couleur personnelle (choisie à la création du profil).
Elle s'applique **uniquement** à :
- son avatar (top bar, sélecteur d'enfant)
- le fond en fondu de l'en-tête de l'Accueil de son carnet

Elle ne s'applique jamais aux tuiles, cartes, pages ou bandeaux. Les anciens thèmes par niveau (orange maternelle / bleu primaire / anthracite lycée appliqués à toute l'app) sont supprimés.
**Fonds d'écran supprimés** (forêt, océan, coucher de soleil…) : la couleur de l'enfant ou sa photo les remplace. La photo de l'enfant, si elle existe, remplace l'initiale partout où l'enfant apparaît.

### Teintes de catégorie
Teintes douces (pastille + icône lucide) servant **uniquement à CLASSER** : disciplines et domaines, types de contenu.
- **Jamais pour évaluer** : aucune teinte sur un niveau de compétence ni sur une tendance ; jamais de vert ni de rouge ; les barres de niveau restent inchangées (§ Scolarité).
- Une discipline a **la même teinte partout** (Scolarité, Accueil, devoirs, agenda). Source unique : `src/theme/categories.ts`, indexée par identifiant stable (jamais par libellé).
- Teintes (fond de pastille / couleur d'icône, AA) : ambre `#FEF3C7` / `#92400E` · ciel `#E0F2FE` / `#075985` · rose `#FCE7F3` / `#9D174D` · orange `#FFEDD5` / `#9A3412` · ardoise `#E2E8F0` / `#334155` · action (indigo) `rgba(67,56,202,0.10)` / `#4338CA`.
- Types de contenu : mot à traiter (signature, question, réponse) = action (indigo, `pencil`) ; photo, souvenir, document, « À prévoir » = ardoise. Jamais une teinte de discipline pour un type.
- Une personne n'a aucune teinte propre : initiales sur ardoise ; école, direction, mairie = ardoise + `building-2`.
- Discipline inconnue : ardoise + `book-open`, jamais d'erreur.

---

## DESIGN LANGUAGE v3 — "Notion Premium"

### Philosophie
Référence principale : **Notion mobile** — navigation épurée, hiérarchie claire.
Fond Brume `#F3F4FA`, cartes blanches opaques sur les écrans principaux. **Le glass morphism est supprimé** (16 nov. 2026). Pages profondes = Notion ultra-épuré.

### Navigation — pattern Notion (validé définitivement)

**Quatre onglets, dans cet ordre :**
Accueil (maintenant) · Scolarité (ce qui reste) · Agenda (ce qui arrive) · Messages (ce qu'on se dit).

**Top bar (toujours visible)**
```
[☰] [⌂ Accueil] [↗ Scolarité] [📅 Agenda] [✉ Messages●] ... [Avatar enfant●]
- ☰ burger (gauche) : tap = écran unique « Famille et paramètres »
- Avatar (droite) : 34×34px cercle, couleur de l'enfant, initiale (ou photo)
  tap = sélecteur d'enfant UNIQUEMENT (bottom sheet), décompte en clair par enfant
  pastille rouge sur l'avatar quand un AUTRE enfant du foyer a du nouveau (règle : § Principe fondateur)
- Aucune ouverture de menu par swipe (conflit avec le pager des onglets)
- Fond : JAMAIS opaque. Transparente au repos ; fondu #F3F4FA lié au défilement
  (composant ScrollVeil, le même que le voile de la bottom bar). Pas de BlurView.
- Onglet actif : pill rgba(15,23,42,0.08), icône + label, height 30px, borderRadius 999px
- Onglet inactif : icône seule, color rgba(15,23,42,0.38)
- Badge non-lu : point rouge 6px, position absolute
- Icônes des onglets : papicons (Home, Grades pour Scolarité, Calendar, TextBubble)
```

**Bottom bar (toujours visible, identique sur tous les onglets)**
```
[◉ Rechercher ou demander…                ] [+]
- Fond : #F3F4FA, border-top 1px rgba(15,23,42,0.07)
- Champ unique « Rechercher ou demander » (recherche et assistant fusionnés) :
  flex:1, height 34px, borderRadius 999px, background rgba(15,23,42,0.08)
  L'icône loupe séparée est supprimée.
- « + » à droite : 34×34px cercle, background rgba(15,23,42,0.08)
  SEUL bouton d'ajout de toute l'application, présent sur tous les onglets.
  Ouvre la feuille « Ajouter » (six actions, § Ajouter au carnet).
- Supprimés : FAB de l'Agenda et des Messages, icône crayon (✏️), icône scanner (⊞),
  actions contextuelles différentes par onglet.
```

**Règle titre — non redondance absolue**
Le titre de l'onglet actif est dans la pill top bar.
**Ne jamais répéter le titre dans le body. Jamais.**

### Fond global
```
Background : #F3F4FA (« Brume ») — partout, tous les écrans
  y compris le voile ScrollVeil (haut et bas), la barre du bas et le voile du header de l'Accueil
Jamais #FFFFFF comme fond de page ; l'ancien #F2F1EE est supprimé
```

### Typographie — Figtree (unique font family)
```
Figtree_900Black  — data large (40px, letterSpacing -2px) — moyennes, grands chiffres
Figtree_800ExtraBold — display (19-22px, letterSpacing -0.8px) — questions de l'assistant, titres
Figtree_700Bold   — title (14-16px, letterSpacing -0.3px)
Figtree_600SemiBold — label (12-13px, letterSpacing -0.1px) — labels UI
Figtree_500Medium — body medium (13px)
Figtree_400Regular — body (12-14px, lineHeight 1.5)
Figtree_300Light  — meta (10-11px, color rgba(15,23,42,0.35-55))

Label de section (Accueil, Scolarité, Agenda, Messages) : Figtree 600, 13px, casse normale, rgba(15,23,42,0.55), padding 18px 6px 8px
Section labels des autres écrans (provisoire, jusqu'à validation) : 600, 7.5px, letterSpacing 1.1px, uppercase, opacity 0.28
```

**JAMAIS de font système. JAMAIS Barlow. JAMAIS DM Sans.**
**Exception unique : Rufina Bold** — exclusivement dans `<ScolariaLogo>`. Nulle part ailleurs.

### Palette de couleurs
```
Fond page           #F3F4FA (« Brume »)
Carte               #FFFFFF opaque, bordure 1px rgba(15,23,42,0.07)
Texte principal     #0F172A
Texte secondaire    rgba(15,23,42,0.55)
Texte muted         rgba(15,23,42,0.35)
Séparateurs         rgba(15,23,42,0.05-0.08)
Accent indigo       #4338CA
Dégradé assistant   linear-gradient(135deg, #6366F1, #22D3EE) — réservé à l'assistant uniquement
Rouge               #EF4444
Amber (Score Joie)  #F59E0B
```

### Headers d'écran
```
Accueil :   header PLEINE LARGEUR en FONDU (décision du 24 sept 2026 ; ni carte 130px, ni bloc arrondi)
            passe DERRIÈRE la barre d'état, la top bar et les premières cartes, qui flottent sur sa fin
            couleur de l'enfant en dégradé vertical vers la TRANSPARENCE : rgba(c,1) → rgba(c,0),
            même RGB à chaque arrêt (jamais couleur → #F3F4FA, jamais 'transparent')
            ~340px sous la barre d'état, 10 arrêts en courbe ease-out ; aucun arrondi, aucune coupure
            fond = couleur de l'enfant, ou sa photo (photo + voile sombre, même courbe de disparition) ;
            les fonds d'écran (forêt, océan, coucher de soleil) sont supprimés
            compte sans enfant : même fondu, indigo
            EN-TÊTE DU CARNET : photo de l'enfant en cercle (initiale + badge appareil photo sans photo),
            prénom, puis « classe · enseignant · école » ; blanc sur la partie pleine ;
            barre d'état claire au repos (détail : COMPONENTS §6, §18.3)
            libellés posés sur le fondu : blanc si opacité ≥ 0,6, sinon #0F172A 55 %
            au défilement : le fondu part avec le contenu, ScrollVeil apparaît, top bar en §0.
Scolarité : pas de header coloré. Niveau 1 = sommaire : bouton année "2025–2026 · CE1 ⌄" en tête,
            puis les quatre rubriques (§ Scolarité). Aucun segmented control.
Agenda :    pas de header coloré, mois + strip semaine directement
Messages :  PAS de titre (déjà dans pill) ; bloc « À traiter » puis bloc « Conversations » (§ Messages)
Pages profondes : fond #F3F4FA, header simple ‹ Retour + titre centré + action droite
```

### Cartes — règles

**Écrans principaux (Accueil, Scolarité, Agenda, Messages)**
- Blanc opaque `#FFFFFF`, border 1px `rgba(15,23,42,0.07)`, borderRadius 16
- Ombre (décision du 17 nov. 2026) : **iOS** `shadowColor:#0F172A, shadowOpacity:0.04, shadowRadius:8` ; **Android `elevation: 0`**, la bordure 1px `rgba(15,23,42,0.07)` suffit (leçons du 2 avr. et du 26 sept. : une élévation dessine un cadre gris sur une carte).
- **Une seule source** : le jeton `SHADOW.card` de `src/constants/design.ts`, écrit avec `Platform.select`. Aucune carte ne déclare sa propre ombre ni sa propre `elevation` : elle étale le jeton.
- Éléments flottants (feuilles, menus, barres, boutons ronds) : 2e jeton `SHADOW.flottant` (même fichier, `Platform.select`) ; sur Android ils gardent une élévation, sinon ils passent sous le contenu (décision du 17 nov.).
- Animation press : `scale 0.97`, spring damping 15
- Le glass morphism (blanc à 75 %) est supprimé partout.

**Pages profondes (Paramètres, Aide, Profil, rubriques de Scolarité, etc.)**
- Rows simples sur fond blanc, séparés par 1px rgba(15,23,42,0.05)
- Groupes fond `#FFFFFF` séparés par 8px `rgba(15,23,42,0.04)`

**Cards Agenda**
- `borderLeft: 3px solid [couleur catégorie]`, background `rgba(couleur, 0.08)`
- **Libellé de catégorie** écrit dans la carte en plus de la couleur (la couleur seule ne suffit jamais)
- JAMAIS d'emoji dans une card Agenda — barre couleur + libellé + texte

**Cartes de l'assistant** (écran de l'assistant)
- `background: linear-gradient(135deg, #EEF2FF, #F0FDFA)`
- `border: 1px solid rgba(15,23,42,0.06)`, borderRadius 16px
- Sur l'Accueil, la suggestion de l'assistant est UNE ligne avec sa source, pas une carte.

### Boutons
```
Tous les boutons d'action sont des pills (borderRadius: 999px) — sans exception.
Primaire : height 52px, background #0F172A, color #fff, max-width 240px, alignSelf center
Secondaire : même dims, background transparent, border 2px rgba(15,23,42,0.18)
Destructif : même dims, background #EF4444 — toujours précédé d'une confirmation Alert
Ghost : background transparent, color rgba(15,23,42,0.55), fontSize 13px
JAMAIS de carte-bouton (widget cliquable en card) → pills d'action uniquement
```

### FAB
```
Aucun FAB dans l'application (16 nov. 2026) : tout ajout passe par le « + » de la barre du bas.
```

### Icônes
```
Icônes de navigation (top bar) = papicons ; lucide-react-native partout ailleurs
Taille : 20px listes, 22-24px navigation
strokeWidth: 2
Emoji : autorisés dans le contenu (messages, Score de Joie) — jamais comme icône UI
Matières : texte + pastille teintée + icône lucide sobre (teintes de catégorie). JAMAIS d'emoji sur une matière, nulle part.
```

### Animations
```
FadeInUp staggered (60ms delay) sur les listes
Spring animation (damping 15, stiffness 300) sur les press de cartes
Scale 0.97 sur press
```

---

## Structure de navigation — arborescence complète

### Écrans principaux (top bar) — toujours pour l'enfant sélectionné
1. **Accueil** (maintenant), dans cet ordre :
   en-tête (photo ou initiale, prénom, « classe · enseignant · école ») ; **À faire** ;
   **Aujourd'hui et demain** (événements, à prévoir, devoirs) ; **Nouveau dans le carnet** ;
   **suggestion de l'assistant** sur une ligne, avec sa source.
2. **Scolarité** (ce qui reste) — sommaire sur deux niveaux (voir section Scolarité)
3. **Agenda** (ce qui arrive) — strip semaine + événements, devoirs, absences, rendez-vous fixes (voir section Agenda)
4. **Messages** (ce qu'on se dit) — « À traiter » + fils de conversation (voir section Messages)

### Bottom bar (persistant, identique sur tous les onglets)
- **Champ « Rechercher ou demander »** — recherche et assistant fusionnés ; ouvre la recherche / l'écran de l'assistant (topbar historique/nouveau, suggestions pills, input)
- **« + »** — seul bouton d'ajout de l'application (feuille de six actions)

### Overlays transversaux
- **Sélecteur d'enfant** — bottom sheet via l'avatar : liste des enfants, décompte en clair par enfant (« 1 mot à signer · 2 nouveautés » ou « À jour »), ajouter un enfant. Rien d'autre (pas de réglages, pas de déconnexion).
- **Famille et paramètres** — écran unique via ☰ (voir Pages profondes)
- **Ajouter** — feuille du « + », six actions (voir section dédiée)

### Pages profondes
- **Rubriques de Scolarité** (Apprentissages, Souvenirs, Documents, Parcours) — plein écran, une seule ligne de filtres
- **Parcours** — les années passées, archivées en lecture seule, **fils de messages de l'année compris**. Accès : rubrique Parcours de Scolarité, bouton année, sélecteur d'enfant
- **Famille et paramètres** (écran unique, ouvert par ☰), **sept entrées** :
  Mes enfants · Responsables · Mon profil · Notifications (trois réglages) · Assistant · Confidentialité et données · Aide, à propos, se déconnecter.
  La rubrique « Apparence » est supprimée. **Toute option affichée mais non branchée est retirée** (donc « Notifications » n'apparaît qu'une fois le push réel en place, § Notifications).
- Profil enfant → avatar & couleur / niveau / école / matières / suppression
- Personnaliser matières → **couleur** par matière (pas d'emoji)

→ Référence : `scolaria-arborescence.html`
→ Mockups : `scolaria-main-screens.html` + `scolaria-deep-screens.html`
→ Maquette carnet v3.4 : https://claude.ai/artifact/EZeZ5Za9LUhASEwmRCFatW

---

## Scolarité (ex-Suivi, ex-Notes)

### Deux niveaux
- **Niveau 1 — sommaire** qui défile : le bouton d'année en tête, puis **quatre rubriques titrées** : **Apprentissages · Souvenirs · Documents · Parcours**. Chacune montre un aperçu du plus récent et un lien « Tout voir ».
- **Rubrique vide** : jamais masquée ; son titre, puis une carte d'invitation (une phrase + un bouton pill), sans « Tout voir ». Apprentissages : « Les compétences saisies par l'enseignant apparaîtront ici. » + « Photographier un livret » · Souvenirs : « Ajoutez un premier souvenir. » + « Ajouter » · Documents : « Ajoutez un premier document. » + « Ajouter ». Parcours n'est jamais vide (l'année en cours y figure toujours).
- **Niveau 2 — chaque rubrique en page profonde plein écran**, avec **UNE seule ligne de filtres**.
- Le segmented control Apprentissages · Souvenirs · Livrets est **supprimé**.

### Rubriques
- **Apprentissages** : contenu selon le niveau (tableau ci-dessous).
- **Souvenirs** : albums photos de classe, dessins/travaux ajoutés par la famille, jalons (« premier exposé »).
- **Documents** (ex-« Livrets ») : livrets et bulletins (saisis par l'enseignant ou scannés par le parent) ; **résultats des évaluations nationales** (CP : septembre et janvier, français et maths) ; **mots signés et autorisations** (un mot traité s'archive ici) ; certificats et attestations ; documents de l'école (règlement, fournitures, menus).
- **Parcours** : les années passées en lecture seule, fils de messages de l'année compris.

Apprentissages s'adapte **automatiquement au niveau de l'enfant sélectionné** :

| Niveau | Scolarité › Apprentissages |
|--------|------------------------|
| Maternelle | Carnet de suivi des apprentissages : domaines + observations de l'enseignant |
| Primaire | Compétences par discipline, échelle choisie par l'école : 3 niveaux (A · PA · NA) ou 4 niveaux LSU (Non atteint · Partiellement atteint · Atteint · Dépassé) |
| Collège / Lycée | **Notes v7 inchangé** (courbe, pills matières, cartes extensibles) |

- Bouton année `2025–2026 · CE1 ⌄` : année en cours + lien vers **Parcours**. Pas de frise.
- **Découpage de l'année** : maternelle / primaire = **périodes P1 à P5** ou **semestres** selon l'école (LSU remis en janvier et juin). **Jamais de trimestres par défaut** en maternelle / primaire ; si l'école a choisi les trimestres (certaines rendent le LSU par trimestre), libellé **en toutes lettres** (« 1er trimestre »), **jamais l'abréviation « T1 »**. Collège / lycée : trimestres (ou semestres) de l'établissement.
- **Échelle d'évaluation paramétrable** (par école / classe) : 3 niveaux A / PA / NA (usage quotidien fréquent) ou 4 niveaux LSU ; l'affichage s'adapte (3 ou 4 segments).
- **Disciplines officielles du CP (cycle 2)**, pour la démo et les listes : Français (lecture, écriture, oral, vocabulaire, grammaire et orthographe) · Mathématiques (nombres, calcul et résolution de problèmes, grandeurs et mesures, espace et géométrie, organisation et gestion de données) · Questionner le monde · EMC · Langue vivante (anglais) · Enseignements artistiques · EPS.
- Niveaux de compétence : 3 ou 4 segments selon l'échelle, remplis #0F172A, vides rgba(15,23,42,0.12). **Jamais de vert/rouge.**
- Toujours afficher la source : « Saisi par Mme Durand · 12 déc. » ou « Scanné par vous ». **La ligne source est toujours sur sa propre ligne, sous la donnée** — jamais à la suite du niveau de compétence.

---

## Ajouter (le bouton « + » unique)

Le carnet doit se remplir **même si l'école n'utilise pas encore Scolaria**.

- **Un seul point d'entrée dans toute l'application** : le « + » à droite de la barre du bas, sur tous les onglets.
- Il ouvre une feuille de **six actions** : **Photographier** (dessin, cahier, livret papier) · **Importer une capture** (mot d'une autre appli) · **Ajouter un document** (PDF) · **Noter une première fois** (jalon) · **Signaler une absence** · **Écrire à l'enseignant** (ces deux dernières masquées si l'enfant n'a pas de classe sur l'app, § Agenda › Absence).
- L'ordre s'adapte à l'onglet (décision du 17 nov.) : Accueil et Scolarité = l'ordre ci-dessus ; Agenda = « Signaler une absence » en premier ; Messages = « Écrire à l'enseignant » en premier.
- Icônes (lucide) : camera · image · file-text · star · calendar-x · pencil.
- **V1 :** pour un import, le parent choisit la catégorie (Mot / Document / Souvenir / Jalon) et la date. Rangé dans le carnet de l'enfant sélectionné. (En base, `carnet_items.categorie` garde ses valeurs `mot|livret|souvenir|jalon`.)
- **Phase 2 (assistant stade 2) :** l'assistant reconnaît le document et propose la catégorie ; le parent valide toujours.
- Visibilité : foyer (défaut) ou privé.

---

## Agenda

### Événements alimentés par les mots
- Composer enseignant : option « Ajouter à l'agenda des familles » avec date/heure saisies par l'enseignant.
- L'événement apparaît dans l'Agenda de chaque enfant concerné, lié au mot source. Le **mot lui-même** n'apparaît jamais dans « Aujourd'hui » comme un événement horaire (il est dans « À faire » tant qu'il attend une action).
- Liste « À prévoir » (pique-nique, casquette…) en cases à cocher dans la carte événement.
- Les cartes d'événement portent un **libellé de catégorie** en plus de la couleur.
- V1 : date saisie par l'enseignant. Phase 2 : détection automatique par l'assistant.
- Mots importés : le parent ajoute la date à la main.

### Rendez-vous fixes hebdomadaires (V1)
- Piscine le jeudi, bibliothèque le mardi… dès la V1, chacun avec sa liste « À prévoir ».

### Devoirs
- Rangés **par jour d'échéance**, « **Pour demain** » en premier.
- Coche « fait » **partagée entre les responsables du foyer**, avec « Coché par [prénom] · [heure] ».
- Un devoir appartient au carnet d'un seul enfant (aucune liste de devoirs mêlant plusieurs enfants).

### Absence signalée par le parent
- **Quand** : aujourd'hui / demain / autre date.
- **Durée** : matin / après-midi / journée / plusieurs jours.
- **Motif** : maladie / rendez-vous / raison familiale / autre.
- Justificatif facultatif, mot facultatif.
- Visible de l'enseignant **avant l'appel**.
- Pas de statut « Vu par l'enseignant » en V1 (aucune lecture n'est enregistrée ; décision du 17 nov.).
- **Seulement pour un enfant dont l'école est sur l'app (règle confirmée le 21 nov. 2026, décision d'origine du 26 sept.)** : « Signaler une absence » n'est proposé que si l'année active de l'enfant a une classe (`academic_years.classe_id`) ; sinon il est **masqué, jamais grisé** : on ne propose pas de prévenir une école qui n'est pas sur l'app. Même règle pour « Écrire à l'enseignant ». Source unique : `useEnseignantRattache`. La règle vaut pour **tout** accès, assistant compris.

### Devoirs et emploi du temps selon le niveau
- **Maternelle** : pas de devoirs, pas de filtre « Devoirs », pas d'emploi du temps.
- **CP à CM2** : filtre « Devoirs » présent ; devoirs de primaire (leçon à apprendre, lecture, poésie, tables, dictée préparée), jamais de contenu de collège.
- **Collège / lycée** : devoirs par matière et par enseignant.
- **L'emploi du temps complet reste en Phase 2.** La journée type fixe du primaire est retirée de la V1 (décision du 17 nov.).
- Démo : dates **relatives à aujourd'hui** (la semaine courante n'est jamais vide, pour chaque enfant).

---

## Messages

### Liste de fils
- **Bloc « À traiter »** en haut : les mots qui attendent une action, avec le bouton d'action dans la ligne. Visible **seulement s'il y a quelque chose**.
- Pas de barre de recherche ni de menu de filtre propres à Messages (décision du 17 nov.) : la recherche passe par le champ « Rechercher ou demander », et « À traiter » remplace le filtre « À signer ».
- **Bloc « Conversations »** : **un fil par interlocuteur** — enseignant de l'enfant, classe, école/direction. Périscolaire et intervenants : Phase 2. Mairie : Phase 3.
- La bascule « Général / [Prénom] » est **supprimée**.
- **Fil de classe = ANNONCE SEULE** : l'enseignant écrit à toutes les familles ; chaque parent répond **en privé** à l'enseignant. **Aucune discussion entre familles.**
- Les règles de visibilité du foyer et de la garde partagée ne changent pas.

### Le mot complet
- Un mot peut **cumuler** : une **signature** (aucune / un parent / les deux), une **question** (oui / peut-être / non) et une **réponse privée** à l'expéditeur. Les types ne sont plus exclusifs.
- La réponse privée rejoint le fil avec l'expéditeur en **citant le mot**.
- Un mot traité s'archive dans **Scolarité › Documents**.
- Un mot n'apparaît jamais dans « Aujourd'hui » comme un événement horaire.
- Mot reçu pour deux enfants du foyer : § Principe fondateur (copie par carnet, lu partagé pour l'information, « Signer aussi pour [prénom] »).

---

## Notifications — NON IMPLÉMENTÉ (6 oct 2026)
> Rien de ce qui suit n'existe encore : aucune notification n'est envoyée, aucun réglage n'est affiché. L'entrée « Notifications » de Famille et paramètres (une des sept, décision du 16 nov.) n'apparaît que lorsque ses trois réglages sont branchés sur un push réel ; d'ici là elle reste retirée, jamais grisée. Le push distant (APNs, FCM) est BLOQUANT avant tout enseignant réel ; le prénom de l'enfant transitera alors par Apple et Google (à dire dans la politique de confidentialité). Spécification cible :
- **Activées par défaut** : mots à signer, messages enseignant, messages direction.
- **Résumé unique à 18h** : photos, annonces, informations.
- **Silence 20h – 7h**, sauf urgence école.
- Chaque push commence par le prénom : `Lucas · Mme Durand a publié un mot à signer`. Le tap ouvre le carnet de cet enfant.
- Trois réglages maximum dans Famille et paramètres. **Jamais de matrice module × canal.**
- Jamais de double activation (système + in-app) : si le système autorise, les push essentiels arrivent.

---

## Écran d'ouverture (Login)
- Fond #F3F4FA, symbole Scolaria + wordmark centrés
- Pill primaire "Se connecter" (noir)
- Pill secondaire "Créer un compte" (outline)
- Ghost "Essayer en mode démo"
- Mentions légales bas de page

### Flux après connexion
Email + mot de passe → Supabase Auth identifie le rôle →
- Rôle "parent" → carnet du dernier enfant consulté (sélecteur via avatar)
- Rôle "enseignant" → dashboard enseignant
- Rôle "élève" collège/lycée → espace élève (Phase 2)

---

## Profils utilisateurs

### PARENT / RESPONSABLE LÉGAL
- Email + mot de passe — chaque responsable a **son propre compte**
- Un **foyer** regroupe N responsables et N enfants ; chaque responsable voit tous les enfants auxquels il est rattaché
- Consulte **un carnet à la fois** via le sélecteur d'enfant
- Seuls les responsables peuvent signer les mots — **chacun signe en son nom**, statut visible par parent
- Peut inviter un second responsable depuis Famille et paramètres
- Un responsable peut être rattaché à un seul enfant du foyer (familles recomposées)
- **Ajout d'un responsable : uniquement par invitation**, acceptée par l'invité dont l'email de compte est **confirmé**. Personne ne s'ajoute seul.
- **Un responsable ne peut retirer que lui-même** (jamais un autre ; le dernier responsable ne peut pas se retirer).
- **Un enfant ne peut être supprimé que par son unique responsable.** Dès 2 responsables, chacun peut seulement se retirer.

### Garde partagée
- **Partagé entre responsables** : tout ce qui vient de l'école (mots, annonces du fil de classe, photos, documents, statuts de signature), la coche « fait » des devoirs
- **Coche « fait » d'un devoir (règle des parents séparés, 20 nov. 2026)** : la coche est partagée entre **TOUS** les responsables de l'enfant, y compris d'un autre foyer. **L'auteur et l'heure** (« Coché par [prénom] · [heure] ») ne sont visibles **qu'à l'intérieur du foyer de celui qui a coché** ; un responsable d'un autre foyer voit seulement « Fait ». Le masquage est fait **par la base** (M41 : `agenda_coches`, lue par `coches_devoirs`, qui rend l'auteur et l'heure à null hors du foyer de l'auteur).
- **Justificatif d'absence (20 nov. 2026)** : joint et lu par tout responsable du **foyer de l'auteur** de l'absence (et lu par le titulaire de la classe) ; un responsable d'un autre foyer voit l'absence, mais ni le justificatif ni « À justifier » (M42 : `absences_justificatifs`).
- **Rendez-vous fixe (21 nov. 2026)** : vu, créé et sa liste « À prévoir » cochée par tout responsable de l'enfant ; **modifié et supprimé seulement par le foyer de son auteur** (par tous si l'auteur n'est plus responsable) ; « Ajouté par [prénom] » visible dans le foyer de l'auteur seulement, rien hors foyer ; coches « À prévoir » : même règle que les devoirs (M43, masquage par la base).
- **Privé à chaque responsable** : ses conversations privées avec l'enseignant (dont ses réponses privées à un mot ou à une annonce de classe), ses notes personnelles, ses ajouts marqués privés

### ENFANT MATERNELLE / PRIMAIRE (3-10 ans)
- Pas de compte, pas d'accès autonome
- Score de Joie saisi dans l'interface parent (parent tend le téléphone)
- Aucune interface enfant à développer pour ce niveau

### ENFANT COLLÈGE / LYCÉE (11-18 ans)
- Compte autonome : email + mot de passe, app sur son propre téléphone
- Invité par le parent depuis le compte famille
- À 18 ans : devient propriétaire de son carnet et de ses données

### ENSEIGNANT
- Email professionnel + mot de passe — compte séparé du compte famille
- Dashboard enseignant dédié
- Un parent qui est aussi enseignant = deux comptes séparés

---

## Interface Enseignant — specs MVP

### Philosophie
Interface aussi simple qu'un SMS. Enseignant pense en classe, pas en élève individuel.
Zéro double saisie — Scolaria remplace l'ENT, ne coexiste pas.
Le mot envoyé à la classe arrive dans le carnet de chaque élève.

### Navigation en miroir de l'espace parent
- **Quatre onglets : Classe · Mots · Élèves · Messages.**
- **Bouton « + »** (même place que chez le parent, seul bouton d'ajout) : Nouveau mot · Donner des devoirs · Faire l'appel · Observation.

### MVP V1
- Connexion rôle enseignant → onglet « Classe »
- Vue liste de classe + présences
- Fil de classe en **annonce seule** (toutes les familles) ; messages individuels aux parents ; les réponses des parents arrivent en privé
- Mots **cumulables** : signature (aucune / 1 parent / les 2 parents) + question (oui / peut-être / non) + réponse privée, au choix, dans le même mot
- **Suivi par mot** : « 22/24 familles ont lu · 18/24 ont signé » + bouton « Relancer les N » (relance auto optionnelle J+2)
- Option « Ajouter à l'agenda des familles » + liste « À prévoir »
- Saisie note / observation / compétence par élève
- Signalement absence + **absences déclarées par les parents** visibles avant l'appel (quand, durée, motif, justificatif et mot facultatifs)
- Devoirs donnés à la classe (rangés par jour d'échéance chez chaque enfant)

### Phase 2
- Saisie en masse (grille classe)
- Cahier de liaison numérique complet
- Photos activités de classe (albums)
- Registre d'appel exportable (obligation légale en primaire)
- Publication programmée
- Traduction des mots pour les familles (fournisseur compatible hébergement UE)
- Lecture à voix haute des mots
- Générateur d'appréciations par l'assistant (enseignant coche 3 compétences → l'assistant propose 2 formulations → validation obligatoire)
- Dashboard bien-être anonymisé

### Testeurs identifiés
- **Priorité : enseignant(e)s de maternelle / primaire** (segment d'entrée)
- Prof d'histoire, collège (ami de Nino)
- Prof d'EPS
→ Session découverte informelle d'abord, sprint dédié ensuite

---

## L'assistant — règles d'affichage et comportement (nom interne du code : `aria`)

- **Aucun nom de personnage dans l'interface** : le libellé affiché est « Assistant » là où un libellé est nécessaire. Les noms internes (`aria`, Edge Function « aria », `ARIA_MODEL`, `ariaApi.ts`…) ne changent pas.
- Représenté par le **symbole couronne Scolaria (8 ellipses)** — jamais d'autre icône (l'identité visuelle est traitée à part)
- Accessible depuis le champ « Rechercher ou demander » de la barre du bas, sur tous les écrans
- Carte de l'assistant : `linear-gradient(135deg, #EEF2FF, #F0FDFA)`, border `rgba(15,23,42,0.06)` ; sur l'Accueil, une seule ligne de suggestion avec sa source
- **Vouvoiement** dans tous les textes générés
- L'assistant ne diagnostique JAMAIS — il suggère et informe
- Toujours citer ses sources pour chaque alerte ou résumé
- Travaille toujours sur le carnet de l'enfant sélectionné — jamais sur plusieurs enfants à la fois
- En mode archive : lecture seule, pas d'alertes Score de Joie
- Protocole urgence : mots-clés critiques → message fixe avec numéros d'aide, **aucune réponse IA, aucun appel au modèle**
  - 3114 (prévention du suicide, 24h/24) · 3018 (harcèlement et cyberharcèlement, 7j/7 9h-23h) · 119 (enfance en danger, 24h/24) · 112 (danger immédiat). **Le 3020 n'existe plus → 3018 partout.**
  - Ordre : le numéro de la catégorie détectée d'abord, les autres ensuite, **le 112 toujours en dernier**
  - Numéros **cliquables** (tel:)
  - Alerte enregistrée (catégorie, enfant, date — **jamais le texte**), **privée à son auteur** : jamais partagée automatiquement avec l'autre responsable ni l'enseignant
- **Appels au modèle : uniquement via l'Edge Function Supabase « aria »**. La clé Anthropic est un secret Supabase — jamais dans l'app, jamais dans un `.env`, jamais journalisée.
- Modèle : `claude-sonnet-5`, écrit dans l'Edge Function `aria`. Le secret facultatif `ARIA_MODEL` le remplace sans redéployer (il n'existe pas aujourd'hui). Pas de modèle de repli : un refus ou une erreur = « L'assistant est momentanément indisponible. », jamais un autre modèle.
- Contexte envoyé : **prénom + niveau scolaire** de l'enfant (ex. « Lucas (CM2) »), lus **sous RLS par l'Edge Function** (niveau filtré par la liste fermée `_shared/niveaux.ts`) ; l'app n'envoie que `child_id` + messages (lot A du 11 nov., branche `fix-audit-fable`, fonction pas encore déployée) ; jamais le nom, l'école ni l'identifiant. Les consignes, dont la règle fixe de vouvoiement, sont construites par l'Edge Function (`_shared/ariaPrompt.ts`).
- Suggestions = pills horizontales (jamais de cartes 2×2)

---

## Score de Joie

- Fenêtre glissante 5 jours
- 3 niveaux : Attention (baisse 15-30%) / Vigilance (baisse >30%) / Urgence (mots-clés)
- Présenté comme tendance en mots (« stable », « plutôt en hausse », « plutôt en baisse ») — jamais de chiffre, de %, ni de vert/rouge, **y compris côté enseignant** (tableau de bord, météo de classe)
- **V1 : aucune alerte** (Attention / Vigilance arrivent avec l'assistant stade 3, Phase 3). Seul le protocole d'urgence (mots-clés) s'applique.
- Révisable par le parent (contexte maladie, événement familial)
- Couleur : #F59E0B · Emoji : 💛

---

## Architecture BDD (Supabase)

**Règle : toute donnée de carnet est rattachée à l'enfant (`child_id` ou `student_id` selon la table) + `academic_year_id`.**

> Noms de tables = noms **réels** en base (`children`, `profiles`…). On modifie les tables existantes, on ne les recrée pas sous un autre nom.

### Tables principales
- `profiles` — un par compte (`auth.users`) : parents, enseignants, élèves ; `role` fixé à l'inscription, non modifiable par l'utilisateur
- `foyers` — regroupement famille
- `responsables` — lien N responsables ↔ N enfants (user_id, child_id, foyer_id) ; ajout par invitation (`invitations_responsable`) uniquement
- `children` — profil enfant (dont `color`, couleur personnelle) ; créé par `create_child()` (enfant + responsable + année en une transaction)
- `academic_years` — millésimes liés à l'enfant (student_id, école, niveau, classe_id) ; un enfant a toujours au moins une année
- `grades` — notes (collège/lycée), child_id
- `competences` — child_id, academic_year_id, domaine, competence, niveau 1-4, source (ecole|parent) fixée par le serveur, saisi_par, date ; « ecole » modifiable par le titulaire seul
- `bulletins` — liés à academic_year_id
- `mots_liaison` — cahier de liaison : type (information|signature|autorisation|participation), signature_mode (none|one|both), event_date nullable, a_prevoir jsonb nullable, classe_id (destinataire par id). **Schéma actuel à types exclusifs** ; la décision du 16 nov. (signature + question + réponse privée cumulables) demande une évolution, à concevoir au lot 3.
- `mot_carnets` — une copie du mot par enfant (mot_id, child_id, academic_year_id) : classe → chaque enfant de la classe ; fratrie → `distribuer_mot()`
- `signatures` — une ligne par (mot_id, student_id, parent_id = responsable, signed_at) ; statut par carnet : vue `mot_carnets_statut` (both = les 2 responsables, ou l'unique)
- `reponses_mot` — autorisation (oui/non) et participation (oui/peut_etre/non), une par responsable et par carnet (la « question » oui / peut-être / non du mot complet s'y rattachera, lot 3)
- `carnet_items` — import parent : child_id, academic_year_id, categorie (mot|livret|souvenir|jalon), fichier, date, ajoute_par, visibilite (foyer|prive = auteur seul)
- `alertes_urgence` — protocole d'urgence : auteur, child_id, academic_year_id, catégorie, date — JAMAIS le texte ; privée à son auteur
- `absences` — signalement enseignant + déclaration parent (quand, durée, motif, justificatif, mot : colonnes à vérifier au lot 4)
- `messages` — messagerie hub, rattachée à child_id ; un fil par interlocuteur, fil de classe en annonce seule (lot 3)
- Devoirs (coche « fait » partagée par foyer, « Coché par ») et rendez-vous fixes hebdomadaires : tables à identifier ou concevoir au lot 4 (lire le schéma réel d'abord)
- `ecoles` / `classes` — classe = école + année + nom, identifiée par son **id** (jamais par son nom) ; `enseignant_id` = titulaire ; élève rattaché via `academic_years.classe_id`

### RLS
- Un responsable ne lit que les enfants auxquels il est rattaché
- `visibilite = prive` : lisible uniquement par son auteur
- Conversations privées parent ↔ enseignant : lisibles uniquement par leurs participants
- Fil de classe : écriture par l'enseignant seul ; aucune réponse d'un parent n'est lisible par une autre famille

### Règles RGPD
- Chiffrement AES-256 au repos et TLS en transit (source : https://supabase.com/security — « All customer data is encrypted at rest with AES-256 and in transit via TLS », lu le 25 sept 2026)
- Hébergement : Supabase, région eu-west-3 (Paris), depuis la migration INFRA-1 du 25 sept 2026. Formulation publique, exacte (validée le 25 sept 2026) :
  > « Les données du carnet de votre enfant sont hébergées dans l'Union européenne, à Paris. L'assistant s'appuie sur un modèle d'Anthropic, société américaine. Quand vous utilisez l'assistant, vos messages, l'historique de la conversation, le prénom et le niveau scolaire de l'enfant sont traités hors de l'Union européenne. Anthropic les efface sous 30 jours, sauf s'ils sont signalés pour non-respect de ses règles d'utilisation (conservation jusqu'à 2 ans). Ils ne servent jamais à entraîner le modèle. L'assistant ne reçoit rien d'autre du carnet. En cas de message de détresse, rien n'est envoyé à l'assistant. »
  (16 nov. 2026 : seul « Aria » a été remplacé par « l'assistant », décision n° 10 ; le reste du texte validé est inchangé.)
- L'Edge Function `aria` est appelée avec la région `eu-west-3` imposée (sinon : région la plus proche, parfois hors UE)
- Export JSON complet disponible (par carnet d'enfant)
- **Photo de l'enfant** : donnée personnelle d'un mineur. Stockage PRIVÉ (bucket « child-photos »), **une photo par enfant ET par année scolaire** : objet `{child_id}/{academic_year_id}.jpg`, référencé par `academic_years.photo_path` (M36, locale ; l'ancien chemin `{child_id}/avatar.jpg` et `children.photo_path` ne subsistent que jusqu'à M37) ; **variante A** : année en cours sans photo → repli sur l'année **N−1 seulement** (jamais plus loin), affichée avec un signe discret d'année passée, lue des seuls responsables rattachés ; **aucune lecture par l'école d'une photo d'année précédente, jamais** (aucune politique du bucket ne mentionne classes, enseignant_id ni classe_id : test structurel) ; lecture par URL signée courte (1 h), jamais de lien public ; ré-encodée sur l'appareil (512×512, JPEG) avant envoi, ce qui retire les métadonnées EXIF / GPS ; incluse dans l'export JSON du carnet ; supprimée en cascade avec l'enfant, objet de stockage compris (il ne suit pas la cascade SQL : même mécanisme que les fichiers de `carnet_items`) ; **jamais envoyée à l'Edge Function `aria` ni au modèle, jamais dans un journal ni une notification** ; suit le carnet à 18 ans. Tout responsable rattaché peut l'ajouter, la remplacer ou la supprimer ; jamais obligatoire. Aucune lecture enseignant / direction : la photo n'est visible que des responsables (consentement affiché : « Sert à reconnaître votre enfant dans son carnet. Visible de ses responsables. »). Une visibilité par l'école serait une finalité distincte : nouveau consentement à demander avant toute politique de lecture. Comptée dans les sauvegardes du poste (politique de confidentialité). Fonctionnalité derrière `PHOTO_ENFANT_ACTIVE` (src/constants/photoEnfant.ts), vraie depuis l'application de M35 à Paris (6 oct 2026) ; jamais de photo en démo (gardes `isDemo`, testés).
- Droit à l'effacement en cascade sous 30 jours
- Journal d'accès : **pas construit** → aucune mention dans l'app tant qu'il n'existe pas (retiré le 26 sept 2026)
- URL signées d’1 h pour l’affichage des fichiers dans l’app (bucket privé « carnet », M20) ; jamais de lien public
- Zéro revente — zéro profilage publicitaire

---

## Ce qui est en Phase 2-3 (ne pas implémenter maintenant)

- Reconnaissance automatique des documents importés (assistant stade 2)
- Détection automatique des dates dans les mots
- Progrès d'un enfant comparés à lui-même sur plusieurs années (assistant stade 2+)
- Mémoires de fin d'année
- Prédictions de performance par l'assistant
- Emploi du temps complet (Phase 2)
- Fils périscolaire et intervenants (Phase 2) ; fil mairie (Phase 3)
- Mode sombre
- Signature électronique légale eIDAS
- ÉduConnect (optionnel V2, jamais obligatoire)
- Internationalisation (après France-first)
- Réponses vocales de l'assistant (V2 — V1 = input texte + micro)
- Interface directeur d'école
- Espace élève collège/lycée
- Traduction, lecture à voix haute, publication programmée, registre d'appel

---

## WORKFLOW Claude Code

### Démarrage de session (obligatoire dans cet ordre)
1. Lire **CLAUDE.md** (ce fichier)
2. Lire **COMPONENTS.md** — specs exactes de chaque composant
3. Lire `tasks/lessons.md` — appliquer toutes les leçons passées
4. Lire `tasks/todo.md` — état actuel du projet
5. Si lessons.md ou todo.md n'existent pas, les créer avant de commencer

### Règles de développement
- **Diagnostic d'abord** : `grep -r` avant toute modification de fichier
- Vérifier TypeScript errors avant commit
- Grouper tous les changements en un seul bloc compilé
- Jamais de build pendant que des phases restent à chaîner
- Vérification localhost obligatoire avant tout build EAS
- Mode plan pour toute tâche non triviale (3+ étapes) → `tasks/todo.md`
- Après correction : mettre à jour `tasks/lessons.md`
- Migrations Supabase : toujours sur une branche ou après sauvegarde

### Principes fondamentaux
- Simplicité d'abord — toucher un minimum de code
- Causes racines uniquement — pas de fixes temporaires
- Ne jamais supposer — vérifier chemins, APIs, variables avant utilisation
- Une question en amont si nécessaire, ne jamais interrompre en cours de tâche
- Améliorer l'existant, ne jamais reconstruire sans validation explicite

---

## Règles absolues — rappel rapide

```
✗ Jamais "ScolarIA" avec IA en majuscules
✗ Jamais de vue mélangeant plusieurs enfants
✗ Jamais de donnée de carnet rattachée au parent seul (toujours child_id / student_id)
✗ Jamais de top bar opaque → voile #F3F4FA lié au défilement
✓ Retour par glissement depuis le bord gauche sur TOUTE page profonde (géré par l'app, navigation 3 boutons)
✗ Jamais de Pressable importé de react-native → `src/components/ui`
✗ Jamais de clé API dans l'app ou un .env → secret Supabase + Edge Function
✗ Aucune affirmation dans l'app qui ne soit vraie aujourd'hui (sécurité, RGPD, hébergement, fonctionnalités)
✗ Jamais le texte d'un message de détresse stocké ou journalisé
✗ Jamais fond blanc pur #FFFFFF comme background de page → #F3F4FA (Brume)
✗ Jamais font système → Figtree partout (Rufina = wordmark uniquement)
✗ Jamais bouton non-pill → borderRadius 999px toujours
✗ Jamais de FAB ni de second bouton d'ajout → le « + » de la barre du bas, seul
✗ Jamais de loupe séparée → un seul champ « Rechercher ou demander »
✗ Jamais de nom de personnage dans l'interface → « Assistant »
✗ Jamais de tutoiement envers un parent, y compris dans les textes de l'assistant (seuls les écrans qui parlent à l'enfant tutoient)
✗ Jamais carte-bouton → pills d'action uniquement
✗ Jamais violet #7C3AED → #4338CA uniquement
✗ Jamais dégradé de l'assistant (#6366F1→#22D3EE) hors contexte de l'assistant
✗ Jamais d'emoji sur une matière
✗ Jamais emoji dans les cards Agenda → barre couleur + libellé de catégorie + texte
✗ Jamais de vert/rouge sur les données (compétences, trends)
✗ Jamais titre répété dans le body si déjà dans la pill top bar
✗ Jamais de glass morphism → cartes blanches opaques (écrans principaux), rows (pages profondes)
✗ Jamais de segmented control dans Scolarité ni de bascule « Général / [Prénom] » dans Messages
✗ Jamais de discussion entre familles → fil de classe en annonce seule, réponses privées
✗ Jamais un mot affiché dans « Aujourd'hui » comme un événement horaire
✗ Jamais la ligne source à la suite d'une donnée → toujours sur sa propre ligne, dessous
✗ Jamais de module grisé visible — ce qui n'est pas activé n'existe pas à l'écran
✗ Jamais de push sans le prénom de l'enfant
✗ Jamais de matrice de réglages de notifications
✗ Jamais height:'100%' → flex:1
✗ Jamais box-shadow CSS → shadow* + elevation (Android)
✗ Jamais Score de Joie en alerte sur données archivées
✗ Jamais de comparaison entre enfants
✗ Jamais de conversation privée d'un responsable visible par l'autre

✓ Comparaison d'un enfant avec lui-même : autorisée à partir de l'assistant stade 2,
  en tendance, sources citées, jamais sur signal isolé
✓ Toujours paddingBottom: 80px sur les ScrollView (bottom bar)
✓ Toujours zone tactile minimum 44×44px
✓ Toujours flex:1 sur les View parents pleine hauteur
✓ Toujours insets.bottom pour les éléments positionnés en bas
✓ Toujours empty state si liste vide
✓ Toujours Alert natif avant action destructive
✓ Toujours afficher la source d'une donnée (enseignant, parent, import)
```

---

## APPRENTISSAGES
*(Claude Code remplit cette section au fil des sprints)*

### 11 nov. 2026 — audit Fable, lot A (C1, C2, I1)
- **Message de détresse** : `sendToAria` renvoie `{ text, urgence }` ; tout écran passe par `src/services/ariaEchange.ts` (`conclureEchange`) : bulle « Message non conservé », rien dans l'historique, le stockage, le titre ni l'aperçu ; nettoyage unique du stockage au démarrage. Côté serveur, le protocole s'applique à TOUS les messages `user` reçus ; le journal ne porte que la catégorie.
- **Bien-être** : le garde est dans `createCheckin` (ligne sans `message` + `alertes_urgence` par `src/services/alerteUrgence.ts`), pas dans l'écran. Plus de mention « Confidentiel » (`checkins.is_confidential` n'est lue par aucune policy).
- **Consignes de l'assistant** : construites par l'Edge Function (`_shared/ariaPrompt.ts`) ; l'app n'envoie que `child_id` et `messages` ; prénom + niveau lus sous RLS, niveau filtré par `_shared/niveaux.ts` (liste fermée, source aussi de `src/utils/niveau.ts`) ; 2 000 jetons de sortie. Ordre de mise en production : fonction d'abord, app ensuite.
- **Modules purs testés par node** : aucun import ; les dépendances sont passées en paramètre.
