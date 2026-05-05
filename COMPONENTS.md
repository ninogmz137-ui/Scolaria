# COMPONENTS.md — Référentiel UI Scolaria
*Version 2.0 · Validé Avril 2026 · À lire avant toute ligne de code*

> Ce document complète CLAUDE.md. En cas de conflit, COMPONENTS.md a priorité.
> Tout changement validé doit être mis à jour ici avant le prochain sprint.

---

## 0. ARCHITECTURE DE NAVIGATION (validée définitivement)

### Pattern : Notion-style (top nav + bottom bar)

```
TOP BAR (toujours visible, toutes les pages)
  [Avatar enfant] [⌂ Accueil] [✎] [📅] [✉●]
  - Avatar : 34×34px, cercle, border 2px rgba(15,23,42,0.15)
  - Onglet actif : pill grise background rgba(15,23,42,0.08), icône + label
  - Onglet inactif : icône seule, color rgba(15,23,42,0.38)
  - Pill height : 30px, borderRadius 999px, padding 0 10px
  - Badge non-lu : point rouge 6px, position absolute top-5px

BOTTOM BAR (toujours visible, toutes les pages)
  [🔍] [◉ Demander à Aria…] [action contextuelle]
  - Height barre : padding 8px 12px 18px
  - Background : #F7F7F5, border-top 1px rgba(15,23,42,0.07)
  - Icônes gauche/droite : 34×34px cercle, background rgba(15,23,42,0.08)
  - Pill Aria centrale : flex:1, height 34px, borderRadius 999px
    background rgba(15,23,42,0.08), symbole Scolaria 14px + texte placeholder
  - Action droite selon contexte :
    Accueil → ✏️ (nouveau)
    Notes → ⊞ (scanner)
    Agenda → rien (FAB suffit)
    Messages → ✏️ (nouveau message)
    Aria → rien
```

### Règle titre — NON redondance
Le titre de l'onglet actif est dans la pill top bar.
**Ne jamais répéter le titre dans le body de la page.**
Seul le contenu va dans le body, jamais un H1 répété.

---

## 1. TOKENS DE BASE

```
COULEURS
  Background page     #F7F7F5
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

### Accueil (wallpaper)
```
Sous top bar · margin horizontal 12px
height: 130px · borderRadius: 20px · overflow: hidden
background: wallpaper famille (gradient ou image)
Bonjour [Prénom] 👋 : fontSize 16px · fontWeight 700 · color #fff
Sous-titre : fontSize 11px · color rgba(255,255,255,0.65)
```

### Notes / Agenda
```
Pas de header coloré — contenu directement sous top bar
padding: 8px 14px 10-12px · border-bottom: 1px solid rgba(15,23,42,0.05)
Notes: moyenne + graph SVG + sélecteur trimestre
Agenda: mois + année + strip 7 jours
```

### Messages
```
Toolbar uniquement (recherche + filtre "Tout ⌄")
PAS de titre — déjà dans la pill active de la top bar
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

### Card message (liste)
```
display: flex · alignItems: flex-start · gap: 10px · padding: 11px 14px
border-bottom: 1px solid rgba(15,23,42,0.05)
Non lu: border-left: 2.5px solid #4338CA · paddingLeft: 11.5px
Avatar: 38×38px cercle · initiales fontWeight 700
Preview: fontSize 11px · 1 ligne · ellipsis
```

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

---

## 10. SECTION LABELS

```
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

## 12. DROPDOWN (menu avatar)

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
Avatar: 36×36px cercle
Prénom: fontSize 13px · fontWeight 600
Niveau: fontSize 11px · color rgba(15,23,42,0.55)
Check: fontSize 14px · color #4338CA · marginLeft auto

"Ajouter enfant": color #4338CA
"Déconnexion": color #EF4444
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
✗ Jamais fond blanc pur #FFFFFF comme background de page → #F7F7F5
✗ Jamais font système → Figtree partout
✗ Jamais height:'100%' → flex:1
✗ Jamais box-shadow CSS → shadow* + elevation Android
✗ Jamais overflow:'visible' pour les ombres sur Android
✗ Jamais card glass dans les pages profondes (paramètres, aide, etc.)

✓ Toujours zone tactile minimum 44×44px
✓ Toujours paddingBottom: 80px sur tous les ScrollView principaux
✓ Toujours flex:1 sur les View parents hauteur complète
✓ Toujours insets.bottom pour éléments positionnés en bas
✓ Toujours empty state si liste vide
✓ Toujours confirmation Alert natif avant action destructive
```

---

*COMPONENTS.md · Scolaria · v2.0 · Avril 2026*
*Claude Code lit CLAUDE.md + COMPONENTS.md avant chaque sprint — sans exception*
