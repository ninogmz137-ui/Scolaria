# COMPONENTS.md — Référentiel UI Scolaria
*Version 2.2 · Septembre 2026 (décisions validées après CLAUDE.md v3.1) · À lire avant toute ligne de code*

> Ce document complète CLAUDE.md. En cas de conflit, COMPONENTS.md a priorité.
> Tout changement validé doit être mis à jour ici avant le prochain sprint.

---

## 0. ARCHITECTURE DE NAVIGATION (validée définitivement)

### Pattern : Notion-style (top nav + bottom bar)

```
TOP BAR (toujours visible, toutes les pages)
  [☰] [⌂ Accueil] [↗ Suivi] [📅] [✉●] ... [Avatar enfant]
  - ☰ burger (gauche) : 34×34px · tap = écran unique « Famille & paramètres »
  - Avatar (droite) : 34×34px, cercle, border 2px rgba(15,23,42,0.15), photo de l'enfant si elle existe,
    sinon initiale sur la couleur de l'enfant
    tap = sélecteur d'enfant UNIQUEMENT (§13)
  - Aucune ouverture de menu par swipe (conflit avec le pager)
  - Fond : JAMAIS opaque, jamais BlurView. Transparente au repos ;
    fondu #F2F1EE dont l'opacité suit le défilement (ScrollVeil, même composant
    que le voile de la bottom bar — src/components/navigation/ScrollVeil.tsx)
  - Icônes des onglets : papicons (Home, Grades pour Suivi, Calendar, TextBubble).
    Règle : icônes de navigation (top bar) = papicons ; lucide partout ailleurs.
  - Onglet actif : pill grise background rgba(15,23,42,0.08), icône + label
  - Onglet inactif : icône seule, color rgba(15,23,42,0.38)
  - Pill height : 30px, borderRadius 999px, padding 0 10px
  - Badge non-lu : point rouge 6px, position absolute top-5px

BOTTOM BAR (toujours visible, toutes les pages)
  [🔍] [◉ Demander à Aria…] [action contextuelle]
  - Height barre : padding 8px 12px 18px
  - Background : #F2F1EE, border-top 1px rgba(15,23,42,0.07). Fond porté par le voile ScrollVeil du
    bas, TOUJOURS visible (pas lié au défilement : le contenu passe sous la barre dès le repos).
    Android : voile en élévation 12, barre en élévation 13 (Android trie par élévation avant zIndex).
  - Icônes gauche/droite : 34×34px cercle, background rgba(15,23,42,0.08)
  - Pill Aria centrale : flex:1, height 34px, borderRadius 999px
    background rgba(15,23,42,0.08), symbole Scolaria 14px + texte placeholder
  - Action droite selon contexte :
    Accueil → + (Ajouter au carnet)
    Suivi → ⊞ (scanner / Ajouter au carnet)
    Agenda → + (ajouter un événement) — PAS de FAB sur l'Agenda
    Messages → ✏️ (nouveau message)
    Aria → rien
```

### Règle titre — NON redondance
Le titre de l'onglet actif est dans la pill top bar.
**Ne jamais répéter le titre dans le body de la page.**
Seul le contenu va dans le body, jamais un H1 répété.

---

### Composants de base (src/components/ui)
```
Text, TextInput, Pressable : TOUJOURS importés depuis src/components/ui, jamais depuis react-native
Pressable (ui) résout style={({ pressed }) => …} en style simple :
  sur Android (NativeWind), un style fonction sur le Pressable natif est ignoré
```

### Symbole Scolaria
```
<ScolariaSymbol size color="#4338CA" />
size < 32px → version compacte automatique (COMPACT_BELOW = 32) :
  mêmes 8 ellipses, mêmes angles, ellipses plus pleines, couronne resserrée
Jamais d'autre dessin pour les petites tailles (bottom bar 14px, avatars Aria…)
```

---

## 1. TOKENS DE BASE

```
COULEURS
  Background page     #F2F1EE
  Texte principal     #0F172A
  Texte secondaire    rgba(15,23,42,0.55)
  Texte muted         rgba(15,23,42,0.35)
  Borders légers      rgba(15,23,42,0.05)
  Borders medium      rgba(15,23,42,0.08)
  Accent indigo       #4338CA
  Aria gradient       linear-gradient(135deg, #6366F1, #22D3EE)

RAYONS
  Card / Modal        borderRadius: 18-20
  Pill / Bouton       borderRadius: 999px (toujours)
  Input               borderRadius: 14-16
  Bottom sheet        borderRadius: 22px 22px 0 0
  Dropdown            borderRadius: 14px
  Event card Agenda   borderRadius: 14px

OMBRES
  Card légère         shadowColor:#0F172A, opacity:0.06, radius:20, elevation:4
  Card forte          shadowColor:#0F172A, opacity:0.10, radius:32, elevation:8
  FAB                 shadowColor:#0F172A, opacity:0.22, radius:20, elevation:10

ESPACEMENT
  Padding page H      14-16px
  Gap entre cards     8px
  Bottom bar          paddingBottom: 80px sur tous les ScrollView
```

---

## 2. BOUTONS

### Primaire (pill large)
```
height: 52px · borderRadius: 999px · width: 100% max-width: 240px
background: #0F172A · color: #FFFFFF · fontSize: 15px · fontWeight: 600
alignSelf: center
État pressed: opacity 0.78, scale 0.97
RÈGLE : jamais full-width sans max-width · jamais borderRadius < 999px
```

### Secondaire (pill outline)
```
Mêmes dimensions · background: transparent
borderWidth: 2px · borderColor: rgba(15,23,42,0.18) · color: #0F172A · fontWeight: 500
```

### Ghost
```
height: auto · padding: 4px 0 · background: transparent
color: rgba(15,23,42,0.55) · fontSize: 13px · fontWeight: 500
Variante accent: color #4338CA (liens navigation uniquement)
```

### Destructif
```
Même que Primaire · background: #EF4444
RÈGLE: toujours précédé d'une confirmation Alert natif
```

### Pilule compacte (actions dans une carte ou sous un texte)
```
height: 40px · paddingH: 20px · borderRadius: 999px · fontSize 13px · fontWeight 600
Alignée sur le texte (retrait 50 sous un titre à pastille 38), JAMAIS pleine largeur ; retour à la ligne autorisé
Pleine : background #0F172A · color #FFFFFF   (« J'autorise », « Je participe », « Signer »)
Outline : transparent · borderWidth 2px · borderColor rgba(15,23,42,0.18) · color #0F172A   (« Non », « Peut-être »)
Variante liste (Signer dans « À faire ») : height 30px · paddingH 14px · fontSize 12px · fontWeight 600
  (zone tactile étendue à 44px par hitSlop)
```

### Aria inline
```
height: 40px · borderRadius: 999px · paddingH: 16px
background: LinearGradient 135° #6366F1 → #22D3EE · color: #FFFFFF
fontSize: 13px · fontWeight: 600 · icône symbole 14px blanc · gap: 7px
```

---

## 3. PILLS

### Filtre active
```
height: 28-30px · borderRadius: 999px · paddingH: 12px
background: #0F172A · color: #FFFFFF · fontSize: 11px · fontWeight: 600
```

### Filtre inactive
```
background: rgba(15,23,42,0.08) · color: rgba(15,23,42,0.45) · fontWeight: 500
```

### Scrollable (conteneur)
```
ScrollView horizontal · showsHorizontalScrollIndicator: false
paddingH: 14px · gap: 6px · paddingVertical: 2px
```

### Tag statut (non pressable)
```
height: 22px · borderRadius: 999px · paddingH: 10px
fontSize: 11px · fontWeight: 600
Couleurs: fond 10% opacity, texte 100% (indigo/vert/amber/rouge)
```

### Suggestions Aria (remplacent les cartes 2×2 — INTERDIT)
```
height: 32-34px · borderRadius: 999px · paddingH: 14px
background: rgba(255,255,255,0.88) · border: 1px solid rgba(15,23,42,0.08)
fontSize: 11-12px · fontWeight: 500
shadow: 0 1px 6px rgba(15,23,42,0.05)
```

---

## 4. BADGES

```
Point non-lu    6×6px · borderRadius: 999px · background: #EF4444
                position absolute · top: -5px · right: -1px (sur icône nav)

Compteur        minWidth: 18px · height: 18px · borderRadius: 999px
                background: #EF4444 · color: #fff · fontSize: 11px · fontWeight: 700

Trend           height: 22px · borderRadius: 999px · paddingH: 8px
                background: rgba(15,23,42,0.06) · color: rgba(15,23,42,0.55)
                fontSize: 11px
                RÈGLE: jamais de couleur verte/rouge sur les trends — noir/gris uniquement

Alertes Aria    8×8px cercle
                Urgence #EF4444 · Attention #F59E0B · Notes #22D3EE · Conseil #4338CA
```

---

## 5. INPUTS

### Standard (login, formulaires)
```
height: 52px · borderRadius: 14px · paddingH: 16px
background: rgba(255,255,255,0.80) · border: 1px solid rgba(15,23,42,0.08)
fontSize: 15px · shadow: 0 2px 12px rgba(15,23,42,0.04)
focus: borderColor #4338CA · borderWidth 1.5px
placeholder: rgba(15,23,42,0.30)
```

### Barre Aria (écran Aria uniquement)
```
Container: background rgba(255,255,255,0.88) · borderRadius 16px
           border 1px solid rgba(15,23,42,0.08) · padding 9px 12px 7px
Placeholder: fontSize 12px · color rgba(15,23,42,0.35)
Bouton + : 26×26px cercle · background rgba(15,23,42,0.08)
Bouton mic: 26×26px cercle · background rgba(15,23,42,0.08)
Bouton send: 26×26px cercle · LinearGradient #6366F1→#22D3EE
```

### Recherche (toolbar)
```
height: 32-34px · borderRadius: 999px · paddingH: 12px
background: rgba(15,23,42,0.08)
fontSize: 11-12px · placeholder: rgba(15,23,42,0.35)
```

---

## 6. HEADERS D'ÉCRAN

### Accueil (fondu pleine largeur — décision du 24 sept 2026 ; remplace carte 130px et bloc arrondi)
```
Composant : HeaderFondu (src/components/HeaderFondu.tsx), couche absolue en tête du contenu défilant
Pleine largeur, derrière la barre d'état, la top bar et les premières cartes (« À faire » flotte dessus)
Hauteur : insets.top + 340px · aucun arrondi · aucune coupure
Couleur de l'enfant : rgba(c, a) avec le MÊME RGB à chaque arrêt (withAlpha, src/utils/couleur.ts)
  arrêts [position, opacité] : [0,1] [.40,1] [.50,.94] [.58,.84] [.66,.68] [.74,.50]
                               [.82,.32] [.89,.17] [.95,.06] [1,0]   (ease-out, pas de bande)
  JAMAIS couleur → #F2F1EE, JAMAIS 'transparent' (= noir transparent : gris sur Android)
Photo choisie : photo + voile rgba(15,23,42,0.28), puis voile #F2F1EE d'opacité (1 − a) aux
  mêmes arrêts (sur une page unie, identique à une photo d'opacité a ; pas de MaskedView)
Compte sans enfant : même fondu, indigo #4338CA ; l'état vide est dans une carte blanche
En-tête du carnet (§18.3) : ligne d'identité posée sur la partie pleine du fondu — plus de « Bonjour », aucun emoji
Libellés / textes vides posés sur le fondu (SurFondu, mesure onLayout) :
  opacité du fondu ≥ 0,6 → #FFFFFF ; 0,05–0,6 → rgba(15,23,42,0.55) ; au-delà → style normal
Au repos : top bar claire (pill active rgba(255,255,255,0.22), icônes blanches) + barre d'état claire
Au défilement (> 8px) : le fondu part avec le contenu, ScrollVeil apparaît, top bar en couleurs §0
```

### Suivi / Agenda
```
Pas de header coloré — contenu directement sous top bar
padding: 8px 14px 10-12px · border-bottom: 1px solid rgba(15,23,42,0.05)
Suivi: bouton année (§17) + segmented Apprentissages · Souvenirs · Livrets
       collège/lycée : moyenne + graph SVG + sélecteur trimestre (Notes v7)
Agenda: mois + année + strip 7 jours
```

### Messages (décisions B4 du 26 sept 2026 — tasks/b4-decisions.md)
```
PAS de titre — déjà dans la pill active de la top bar ; onglet nommé « Messages »
Segmented (§17) : « Général · [prénom] » — Général par défaut, puis dernier segment consulté
Barre : recherche en pill pleine largeur (height 36, radius 999, rgba(15,23,42,0.06))
        + menu « Tout ⌄ » (§12) : Tout · Non lus · À signer · Tout marquer comme lu
Général : carte blanche « mot à traiter » en tête (SEULE carte de l'écran) :
          pastille indigo (pencil) + titre 600 14 + sous-titre (expéditeur · date de l'événement · échéance)
          + « À prévoir » en puces (height 26, paddingH 10, fond #E2E8F0, texte #334155, 12px)
          + statuts par responsable « Sophie ✓ · Vous » (§17 Statut de signature)
          + pilules COMPACTES (§2) : autorisation « J'autorise » + « Non » · participation « Je participe »
            · « Peut-être » · « Non » · signature « Signer » seule (confirmation obligatoire)
          puis la liste à plat (§7 Ligne de message, §18.4)
[Prénom] : fils de l'enfant (fil famille par foyer ; fil individuel si l'enseignant a choisi
          « un seul parent ») et absences ; mention « Envoyé aussi à [prénom] » si l'autre foyer l'a reçu
Interdits : bandeau « N mots à signer », rouge, résumé Aria, rôle de l'expéditeur, tags de catégorie
```

### Pages profondes
```
Gauche: ‹ [Section parent] · fontSize 13px · fontWeight 500 · color rgba(15,23,42,0.55)
Centre: Titre absolu centré · fontSize 14px · fontWeight 700
Droite: Action optionnelle · fontSize 13px · color #4338CA
border-bottom: 1px solid rgba(15,23,42,0.08)
```

---

## 7. CARTES

### Glass card (widgets, stats)
```
background: rgba(255,255,255,0.75-0.88) · border: 1px solid rgba(255,255,255,0.92)
borderRadius: 18px · padding: 12-16px
shadow: 0 4px 20px rgba(15,23,42,0.06)
Animation press: scale 0.97 · spring damping 15
```

### Card événement Agenda
```
borderRadius: 14px · padding: 10px 12px
borderLeft: 3px solid [couleur catégorie]
background: rgba(couleur, 0.08)
RÈGLE: jamais d'emoji — barre + texte seul
Devoir cochable: checkbox cercle 18px · border 1.5px · alignSelf flex-end
```

### Card Aria
```
background: linear-gradient(135deg, #EEF2FF, #F0FDFA)
border: 1px solid rgba(15,23,42,0.06) · borderRadius: 16px · padding: 12px 14px
Symbole Scolaria: 18px · color #4338CA · alignSelf flex-start · marginTop: 2px
```

### Card message (liste) — remplacée par la Ligne de message (§18.4)
Liste à plat, PAS une carte. **Séparateur de 1 px entre les lignes : décision du 6 oct 2026** (choisi sur captures web avec / sans ;
la variante sans séparateur, retenue le 27 sept, est supprimée). Spécification complète : §18.4.

---

## 8. LIST ITEMS (pages profondes — style Notion pur)

### Row standard
```
display: flex · alignItems: center · gap: 12px
padding: 12px 16px · minHeight: 48px
border-bottom: 1px solid rgba(15,23,42,0.05)
background: #FFFFFF (dans groupes settings)
Icône: 22×22px · fontSize 15px · color rgba(15,23,42,0.55)
Titre: fontSize 13px · fontWeight 500 · color #0F172A
Description: fontSize 11px · color rgba(15,23,42,0.55) · marginTop 1px
Chevron: fontSize 12px · color rgba(15,23,42,0.35)
Valeur: fontSize 12px · color rgba(15,23,42,0.55)
```

### Groupe settings
```
background: #FFFFFF
border-top + border-bottom: 1px solid rgba(15,23,42,0.05)
Séparateur entre groupes: 8px · background rgba(15,23,42,0.04)
Label groupe: fontSize 11px · fontWeight 600 · color rgba(15,23,42,0.55)
              padding 16px 16px 6px
```

### Toggle
```
width: 40px · height: 24px · borderRadius: 999px
ON: background #4338CA / OFF: background rgba(15,23,42,0.18)
Thumb: 18×18px · borderRadius 999px · background #fff · top: 3px
       shadow 0 1px 4px rgba(0,0,0,0.20)
ON: left 19px / OFF: left 3px
```

---

## 9. FAB

```
width/height:   48px
borderRadius:   999px  ← TOUJOURS cercle — jamais carré ni arrondi
background:     #0F172A · color: #fff · fontSize: 22px
shadow:         0 6px 20px rgba(15,23,42,0.22) · elevation: 10
position:       absolute · bottom: 72px · right: 14px · z-index: 15
```
Agenda : **pas de FAB**. L'ajout passe par le « + » de la bottom bar (§0, action droite).

---

## 10. SECTION LABELS

```
Accueil, Suivi, Messages (décision du sprint « Carnet vivant ») :
  Figtree 600 · 13px · casse normale · color rgba(15,23,42,0.55) · padding 18px 6px 8px
  Une marge « entre sections » ne s'applique pas à la première section affichée (leçon du 25 sept)

Autres écrans (provisoire, jusqu'à validation) :
  fontSize: 7.5px · fontWeight: 600 · letterSpacing: 1.1px
  textTransform: uppercase · color: #0F172A · opacity: 0.28
  padding: 14px 14px 6px
  Première section: paddingTop: 10px
```

---

## 11. BOTTOM SHEETS

```
borderRadius: 22px 22px 0 0 · background: #FFFFFF
padding: 12px 0 28-32px
shadow: 0 -4px 32px rgba(0,0,0,0.10)
Backdrop: rgba(0,0,0,0.16)

Handle: 34×4px · borderRadius 999px · background rgba(15,23,42,0.14) · centré

Titre: fontSize 13px · fontWeight 700 · padding 4px 16px 10px
       border-bottom 1px solid rgba(15,23,42,0.05)

Row action: flex · alignItems center · gap 12px · padding 13px 16px
            fontSize 13px · fontWeight 500
            border-bottom 1px solid rgba(15,23,42,0.05)
            Icône 16px gauche · check #4338CA droite si sélectionné
```

---

## 12. DROPDOWN (bouton année, menus contextuels — l'avatar n'ouvre plus de menu)

```
position: absolute · top: 44px · left: 10px (depuis avatar)
background: #FFFFFF · borderRadius: 14px
shadow: 0 8px 32px rgba(0,0,0,0.12)
padding: 4px 0

Row: flex · alignItems center · gap 10px · padding 10px 14px
     fontSize 13px · fontWeight 500 · hover background rgba(15,23,42,0.04)
Icône: fontSize 15px · color rgba(15,23,42,0.55) · width 18px
Séparateur: 1px · rgba(15,23,42,0.08) · margin 3px 0
Destructif: color #EF4444
Entête: fontSize 12px · fontWeight 600 · color rgba(15,23,42,0.55) · pointer-events none
```

---

## 13. SÉLECTEUR ENFANT (bottom sheet)

```
Suit le pattern Bottom Sheet (§11)
Email compte: fontSize 11px · color rgba(15,23,42,0.55) · padding 4px 16px 10px

Child row: flex · alignItems center · gap 12px · padding 12px 16px
Avatar: 36×36px cercle · photo de l'enfant si elle existe, sinon initiale sur sa couleur
Prénom: fontSize 13px · fontWeight 600
Niveau: fontSize 11px · color rgba(15,23,42,0.55)
Check: fontSize 14px · color #4338CA · marginLeft auto

Indicateur nouveauté: point 8px #EF4444 + meta "1 nouveau message" sous le niveau

"Ajouter un enfant": color #4338CA
Rien d'autre : ni réglages, ni « Famille et paramètres », ni déconnexion
(ces entrées sont dans l'écran « Famille & paramètres », ouvert par ☰)
```

---

## 14. ÉCRAN ARIA

```
TOP BAR (propre, remplace la top nav habituelle):
  Gauche: icône historique · 32×32px cercle · bg rgba(15,23,42,0.08)
  Centre: symbole Scolaria 22px dans cercle 38px bg #F0F0F8
          + "Aria" fontSize 11px · fontWeight 700
          + mode fontSize 9px · color rgba(15,23,42,0.55)
  Droite: icône nouveau · 32×32px cercle

BODY centré verticalement:
  Question: fontSize 19px · fontWeight 800 · letterSpacing -0.6px · textAlign center
  Pills: flex wrap · gap 7px · justify center (voir §3 Pills suggestions Aria)

INPUT bas (remplace la bottom bar):
  Voir §5.2 Barre Aria
```

---

## 15. TYPOGRAPHIE

```
Figtree uniquement — JAMAIS de font système
Exception Rufina Bold: ScolariaLogo uniquement

data-large    Figtree 900  40px  letterSpacing -2px     grands chiffres, moyennes
data-medium   Figtree 900  20px  letterSpacing -1px
display       Figtree 800  19-22px letterSpacing -0.8px  questions Aria, titres forts
title         Figtree 700  14-16px letterSpacing -0.3px
subtitle      Figtree 700  13px   letterSpacing -0.1px   noms, headers cartes
label         Figtree 600  12-13px letterSpacing -0.1px  labels UI
body          Figtree 400  12-13px lineHeight 1.5
meta          Figtree 400  10-11px color rgba(n,0.35-55)  dates, sources
section-label Figtree 600  7.5px  letterSpacing 1.1px    uppercase
```

---

## 16. RÈGLES ABSOLUES

```
✗ Jamais bouton avec borderRadius < 999px (toujours pill)
✗ Jamais FAB carré ou arrondi — cercle 999px uniquement
✗ Jamais carte-bouton (widget cliquable en card) → pills d'action à la place
✗ Jamais violet #7C3AED en couleur solide → #4338CA uniquement
✗ Jamais emoji dans les cards Agenda → barre couleur + texte seul
✗ Jamais titre répété dans body si déjà dans la pill de la top nav
✗ Jamais fond blanc pur #FFFFFF comme background de page → #F2F1EE
✗ Jamais font système → Figtree partout
✗ Jamais height:'100%' → flex:1
✗ Jamais box-shadow CSS → shadow* + elevation Android
✗ Jamais overflow:'visible' pour les ombres sur Android
✗ Jamais card glass dans les pages profondes (paramètres, aide, etc.)
✗ Jamais de vue mélangeant plusieurs enfants
✗ Jamais de module grisé visible
✗ Jamais d'emoji sur une matière (texte + pastille teintée + icône lucide sobre)
✗ Jamais de teinte de catégorie sur un niveau de compétence ni une tendance
✗ Jamais de teinte de discipline sur un type de contenu, ni sur une personne
✗ Jamais de vert/rouge sur les données (compétences, trends)
✗ Jamais de top bar opaque ni BlurView dans les barres → voile ScrollVeil
✗ Jamais de Pressable / Text / TextInput importés de react-native → src/components/ui
✗ Jamais d'ouverture de menu par swipe

✓ Toujours zone tactile minimum 44×44px
✓ Toujours paddingBottom: 80px sur tous les ScrollView principaux
✓ Toujours flex:1 sur les View parents hauteur complète
✓ Toujours insets.bottom pour éléments positionnés en bas
✓ Toujours empty state si liste vide
✓ Toujours confirmation Alert natif avant action destructive
```

---

## 17. SUIVI — COMPOSANTS

### Bouton année
```
height: 34px · borderRadius: 999px · paddingH: 14px
background: rgba(15,23,42,0.08) · fontSize 13px · fontWeight 600
Texte: "2026–2027 · CM2 ⌄"
Tap → Dropdown (§12): année en cours (check #4338CA) · séparateur ·
      entête "Archives · lecture seule" · années précédentes + nom de l'école
      → ouvre Mon parcours
```

### Segmented control
```
Container: padding 4px · borderRadius 999px · background rgba(15,23,42,0.06)
Segment: flex 1 · height 32px · borderRadius 999px · fontSize 12px
Actif: background #FFFFFF · fontWeight 700 · shadow 0 1px 4px rgba(15,23,42,0.08)
Inactif: transparent · fontWeight 500 · color rgba(15,23,42,0.62)
```

### Niveau de compétence (3 ou 4 segments selon l'échelle)
```
3 ou 4 barres 22×6px · borderRadius 999px · gap 3px (échelle choisie par l'école / la classe)
Rempli: #0F172A · Vide: rgba(15,23,42,0.12)
Libellé sous la compétence :
  3 niveaux : Non acquis · Partiellement acquis · Acquis
  4 niveaux LSU : Non atteint · Partiellement atteint · Atteint · Dépassé
RÈGLE: jamais de vert/rouge
```

### Ligne source
```
fontSize 11px · color rgba(15,23,42,0.6)
"Saisi par Mme Durand · 12 déc." / "Scanné par vous" / "Ajouté par Julien"
Obligatoire sous toute donnée de carnet
```

### Statut de signature par parent
```
Pill 24px · paddingH 10px · fontSize 11px · fontWeight 600
Signé: background rgba(67,56,202,0.10) · color #4338CA · "Julien ✓"
En attente: background rgba(15,23,42,0.06) · color rgba(15,23,42,0.62) · "Vous"
```

---

## 17 bis. NOTIFICATIONS — NON IMPLÉMENTÉ (6 oct 2026)
```
Aucun réglage de notifications dans Famille & paramètres (groupe retiré, jamais grisé) : aucune notification n'existe aujourd'hui.
À la mise en place du push distant (APNs, FCM) : trois réglages au plus (mots et messages · résumé à 18 h · silence 20 h – 7 h),
chacun branché sur un effet réel et testé ; jamais de matrice module × canal ; le texte commence par le prénom de l'enfant.
```

---

## 18. CARNET VIVANT — COMPOSANTS (sprint d'octobre 2026)

Source unique des teintes : `src/theme/categories.ts` (identifiants stables, jamais les libellés).
Icônes lucide size 20, strokeWidth 2. Pastille et icône décoratives : masquées aux lecteurs d'écran.

### 18.1 Pastille de catégorie
```
Carré arrondi : 38×38 (borderRadius 12) — 34×34 en ligne d'horaire — fond = teinte, icône lucide = couleur d'icône
Teintes (fond / icône, AA) :
  ambre   #FEF3C7 / #92400E      ciel    #E0F2FE / #075985      rose   #FCE7F3 / #9D174D
  orange  #FFEDD5 / #9A3412      ardoise #E2E8F0 / #334155      action rgba(67,56,202,0.10) / #4338CA
Disciplines et domaines (identifiant stable → teinte, icône) :
  Langage oral et écrit / Français ............ ambre   · message-circle
  Premiers outils mathématiques / Mathématiques orange   · shapes
  Se repérer dans le temps et l'espace / Questionner le monde  ardoise · compass
  EMC ......................................... ardoise · scale
  Langue vivante .............................. ambre   · languages
  Activités artistiques / Enseignements artistiques  rose · palette
  Activités physiques / EPS ................... ciel    · activity
  Inconnu ..................................... ardoise · book-open  (jamais d'erreur)
Types de contenu (jamais une teinte de discipline) :
  mot à signer · autorisation · à répondre .... action  · pencil
  photo · souvenir · livret · document · « À prévoir »  ardoise · image · file-text · backpack
Personne : initiales Figtree 700 13px sur #E2E8F0 / #334155 (aucune teinte propre)
École · direction · mairie : fond #E2E8F0 + building-2 #334155
```

### 18.2 Carte de domaine (Suivi › Apprentissages)
```
UNE carte par domaine / discipline (remplace « étiquette grise en majuscules + carte anonyme par observation »)
Carte glass d'écran principal (§7) : borderRadius 18 · padding 14 · gap 8 · rien de pressable
En-tête : pastille 38×38 (§18.1) + titre en casse normale (Figtree 700 · 14px · letterSpacing -0.3 · #0F172A)
          + sous-titre « N observation(s) » (Figtree 400 · 12px · rgba(15,23,42,0.55))
Corps : observations séparées par un filet 1px rgba(15,23,42,0.08), la plus récente en premier
        texte Figtree 400 · 14px · lineHeight 1.45 + ligne source obligatoire (§17), 11px rgba(15,23,42,0.6)
Primaire : niveaux (3 segments A/PA/NA ou 4 LSU) sous chaque compétence, inchangés et SANS teinte
Domaine sans observation : non affiché · ordre du programme officiel
Accessibilité : l'en-tête porte le label « [domaine], N observations »
```

### 18.3 En-tête de carnet (Accueil)
```
Sur le HeaderFondu (§6) : hauteur insets.top + 340, même logique (même RGB à chaque arrêt, jamais 'transparent')
Ligne d'identité : paddingTop insets.top + 64 · paddingHorizontal 20 · row · alignItems center · gap 14
Cercle photo : 78 · borderRadius 999 · bordure 3px #FFFFFF · fond rgba(255,255,255,0.30)
  sans photo : initiale Figtree 800 · 30px · blanc + badge appareil photo 26px (fond #0F172A, icône camera 14 blanche,
  hitSlop pour 44px) qui ouvre la feuille de photo (§11, 3 lignes)
À droite :
  prénom ..... Figtree 900 · 30px · letterSpacing -1.1 · #FFFFFF
  classe ..... Figtree 500 · 14px · rgba(255,255,255,0.95)   (« Grande section », « CE1 »…)
  pilule année : height 26 · paddingH 10 · borderRadius 999 · fond rgba(255,255,255,0.22)
                 Figtree 500 · 12px · blanc · « [École] · 2026–2027 » + chevron-down 13px ; sans école : année seule
                 tap = dropdown du bouton année (§12 / §17) : année en cours cochée · « Archives · lecture seule »
                 · années précédentes → Mon parcours
Contraste AA sur les 6 couleurs d'enfant ; fond photo : voile existant conservé
Avatar de la top bar = photo sinon initiale ; il reste le sélecteur d'enfant. Aucun bouton « Changer »,
aucune pastille d'enfants sur l'Accueil.

Corps, dans l'ordre :
 1. « À faire » : carte blanche ; lignes = pastille 38 (type, §18.1) + titre 600 14 + sous-titre 12.
    Mot à signer : pilule « Signer » à droite (§2 variante liste). Devoirs et « À prévoir » : case ronde 22px,
    bordure 1.5px rgba(15,23,42,0.25), cochable. Devoirs teintés par DISCIPLINE (primaire seulement).
 2. « Cette semaine » : prochain événement d'Agenda, carte §7 (borderLeft 3px indigo, fond rgba(67,56,202,0.08),
    borderRadius 14, sans emoji).
 3. « Nouveau dans le carnet » : carte blanche ; observation + pastille de son domaine ; photo + miniature 48×48 à droite.
 4. Primaire seulement : « Aujourd'hui », journée type fixe : heure (13px, largeur 40) + pastille 34 + nom.
 5. Carte Aria existante en bas, alimentée par les seules données de l'enfant sélectionné, sources citées.
Niveaux : maternelle = ni devoirs ni journée type ; primaire = tout ; collège / lycée = contenu inchangé.
Sans enfant : état vide inchangé.
```

### 18.4 Ligne de message (liste à plat)
```
Pas de carte. Ligne minHeight 64 · avatar 42 rond · séparateur 1px rgba(15,23,42,0.06)
École · direction · mairie : fond #E2E8F0 + building-2 #334155 · personne : initiales 700 13px sur #E2E8F0 / #334155
Non lu : titre Figtree 700 · date indigo 500 · point 8px #4338CA à droite de l'aperçu
Lu : titre 500 · date rgba(15,23,42,0.5)
Aperçu : 12px · rgba(15,23,42,0.65) · 1 ligne · ellipsis
Message avec photo : icône image 14px devant l'aperçu + miniature 44×44 (borderRadius 10) à droite,
  URL signée, placeholder ardoise si échec
Jamais : rôle de l'expéditeur, tag de catégorie, résumé Aria, rouge, vue mêlant plusieurs enfants
```

### 18.5 Photo de l'enfant — feuille de photo
```
Bottom sheet (§11), 3 lignes : « Prendre une photo » · « Choisir dans la galerie » · « Supprimer la photo »
(la dernière seulement si la photo existe, Alert natif avant)
Consentement en pied : « Sert à reconnaître votre enfant dans son carnet. Visible de ses responsables. »
(rien sur l'école : la photo n'est visible d'aucune équipe d'école aujourd'hui)
Jamais obligatoire ni bloquante, pas de relance répétée : le badge de l'en-tête suffit
Mode démo : aucune photo, initiales seulement
```

---

*COMPONENTS.md · Scolaria · v2.2 · Septembre 2026*
*Claude Code lit CLAUDE.md + COMPONENTS.md avant chaque sprint — sans exception*
