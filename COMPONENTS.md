# COMPONENTS.md — Référentiel UI Scolaria
*Version 2.3 · 16 novembre 2026 (aligné sur CLAUDE.md v3.3) · À lire avant toute ligne de code*
*Identité (nom, logo, wordmark, symbole) : en cours de changement, traitée à part, non modifiée ici.*

> Ce document complète CLAUDE.md. En cas de conflit, COMPONENTS.md a priorité.
> Tout changement validé doit être mis à jour ici avant le prochain sprint.

---

## 0. ARCHITECTURE DE NAVIGATION (validée définitivement)

### Pattern : Notion-style (top nav + bottom bar)

```
TOP BAR (toujours visible, toutes les pages)
  [☰] [⌂ Accueil] [↗ Scolarité] [📅 Agenda] [✉ Messages●] ... [Avatar enfant●]
  Ordre des onglets : Accueil · Scolarité · Agenda · Messages
  - ☰ burger (gauche) : 34×34px · tap = écran unique « Famille et paramètres »
  - Avatar (droite) : 34×34px, cercle, border 2px rgba(15,23,42,0.15), photo de l'enfant si elle existe,
    sinon initiale sur la couleur de l'enfant
    tap = sélecteur d'enfant UNIQUEMENT (§13)
    Pastille rouge (§4, point non-lu) sur l'avatar quand un AUTRE enfant du foyer a du nouveau :
      mot à traiter, message non lu, devoir pour demain non coché.
      Une photo ou une compétence ajoutée ne l'allume pas.
  - Aucune ouverture de menu par swipe (conflit avec le pager)
  - Fond : JAMAIS opaque, jamais BlurView. Transparente au repos ;
    fondu #F3F4FA dont l'opacité suit le défilement (ScrollVeil, même composant
    que le voile de la bottom bar — src/components/navigation/ScrollVeil.tsx)
  - Icônes des onglets : papicons (Home, Grades pour Scolarité, Calendar, TextBubble).
    Règle : icônes de navigation (top bar) = papicons ; lucide partout ailleurs.
  - Onglet actif : pill grise background rgba(15,23,42,0.08), icône + label
  - Onglet inactif : icône seule, color rgba(15,23,42,0.38)
  - Pill height : 30px, borderRadius 999px, padding 0 10px
  - Badge non-lu : point rouge 6px, position absolute top-5px

BOTTOM BAR (toujours visible, toutes les pages, identique sur tous les onglets)
  [◉ Rechercher ou demander…] [+]
  - Height barre : padding 8px 12px 18px
  - Background : #F3F4FA, border-top 1px rgba(15,23,42,0.07). Fond porté par le voile ScrollVeil du
    bas, TOUJOURS visible (pas lié au défilement : le contenu passe sous la barre dès le repos).
    Android : voile en élévation 12, barre en élévation 13 (Android trie par élévation avant zIndex).
  - Champ unique « Rechercher ou demander » (recherche + assistant fusionnés) :
    flex:1, height 34px, borderRadius 999px, background rgba(15,23,42,0.08),
    symbole Scolaria 14px + placeholder « Rechercher ou demander »
    L'icône loupe séparée est SUPPRIMÉE.
  - « + » à droite : 34×34px cercle, background rgba(15,23,42,0.08), sur TOUS les onglets
    SEUL bouton d'ajout de l'application → feuille « Ajouter » (§11 bis)
  - SUPPRIMÉS : ⊞ scanner, ✏️ crayon, action contextuelle par onglet, FAB Agenda et Messages
  - Écran de l'assistant : la barre est remplacée par son propre champ (§5)
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
Jamais d'autre dessin pour les petites tailles (bottom bar 14px, avatars de l'assistant…)
```

---

## 1. TOKENS DE BASE

```
COULEURS
  Background page     #F3F4FA (« Brume ») — aussi ScrollVeil, barre du bas, voile du header de l'Accueil
  Carte               #FFFFFF opaque · border 1px rgba(15,23,42,0.07)
  Texte principal     #0F172A
  Texte secondaire    rgba(15,23,42,0.55)
  Texte muted         rgba(15,23,42,0.35)
  Borders légers      rgba(15,23,42,0.05)
  Borders medium      rgba(15,23,42,0.08)
  Accent indigo       #4338CA
  Dégradé assistant   linear-gradient(135deg, #6366F1, #22D3EE)

RAYONS
  Card                borderRadius: 16
  Modal               borderRadius: 18-20
  Pill / Bouton       borderRadius: 999px (toujours)
  Input               borderRadius: 14-16
  Bottom sheet        borderRadius: 22px 22px 0 0
  Dropdown            borderRadius: 14px
  Event card Agenda   borderRadius: 14px

OMBRES
  Card                iOS : shadowColor:#0F172A, opacity:0.04, radius:8 · Android : elevation 0, la bordure 1px
                      rgba(15,23,42,0.07) suffit (décision du 17 nov.)
                      SOURCE UNIQUE : SHADOW.card (src/constants/design.ts, Platform.select) ; jamais d'ombre
                      ni d'elevation déclarée carte par carte
  Flottant            feuilles, menus, barres, boutons ronds : jeton SHADOW.flottant (design.ts, Platform.select),
                      décision du 17 nov. ; Android garde une élévation (sinon l'élément passe sous le contenu) ;
                      valeurs fixées au lot 1
  (« Card forte » et « FAB » supprimés : plus de FAB, une seule ombre de carte)

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

### Assistant inline
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

### Suggestions de l'assistant (remplacent les cartes 2×2 — INTERDIT)
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
                position absolute · top: -5px · right: -1px (sur icône nav ; sur l'avatar : §0)

Compteur        minWidth: 18px · height: 18px · borderRadius: 999px
                background: #EF4444 · color: #fff · fontSize: 11px · fontWeight: 700

Trend           height: 22px · borderRadius: 999px · paddingH: 8px
                background: rgba(15,23,42,0.06) · color: rgba(15,23,42,0.55)
                fontSize: 11px
                RÈGLE: jamais de couleur verte/rouge sur les trends — noir/gris uniquement

Alertes de l'assistant  8×8px cercle
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

### Barre de l'assistant (écran de l'assistant uniquement)
```
Container: background rgba(255,255,255,0.88) · borderRadius 16px
           border 1px solid rgba(15,23,42,0.08) · padding 9px 12px 7px
Placeholder: fontSize 12px · color rgba(15,23,42,0.35)
Bouton + : 26×26px cercle · background rgba(15,23,42,0.08)
Bouton mic: 26×26px cercle · background rgba(15,23,42,0.08)
Bouton send: 26×26px cercle · LinearGradient #6366F1→#22D3EE
```

### Champ « Rechercher ou demander » (barre du bas, §0)
```
height: 34px · borderRadius: 999px · paddingH: 12px
background: rgba(15,23,42,0.08)
fontSize: 12px · placeholder « Rechercher ou demander » rgba(15,23,42,0.35)
Seul champ de recherche des onglets principaux : plus de loupe séparée.
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
  JAMAIS couleur → #F3F4FA, JAMAIS 'transparent' (= noir transparent : gris sur Android)
Fond = couleur de l'enfant, OU sa photo : photo + voile rgba(15,23,42,0.28), puis voile #F3F4FA d'opacité (1 − a)
  aux mêmes arrêts (sur une page unie, identique à une photo d'opacité a ; pas de MaskedView)
Fonds d'écran (forêt, océan, coucher de soleil…) : SUPPRIMÉS
Compte sans enfant : même fondu, indigo #4338CA ; l'état vide est dans une carte blanche
En-tête du carnet (§18.3) : ligne d'identité posée sur la partie pleine du fondu — plus de « Bonjour », aucun emoji
Libellés / textes vides posés sur le fondu (SurFondu, mesure onLayout) :
  opacité du fondu ≥ 0,6 → #FFFFFF ; 0,05–0,6 → rgba(15,23,42,0.55) ; au-delà → style normal
Au repos : top bar claire (pill active rgba(255,255,255,0.22), icônes blanches) + barre d'état claire
Au défilement (> 8px) : le fondu part avec le contenu, ScrollVeil apparaît, top bar en couleurs §0
```

### Scolarité / Agenda
```
Pas de header coloré — contenu directement sous top bar
padding: 8px 14px 10-12px · border-bottom: 1px solid rgba(15,23,42,0.05)
Scolarité (niveau 1, sommaire) : bouton année (§17) puis les quatre rubriques (§17 bis-A)
       collège/lycée : la rubrique Apprentissages garde Notes v7 (moyenne + graph SVG + sélecteur trimestre)
       Segmented Apprentissages · Souvenirs · Livrets : SUPPRIMÉ
Agenda: mois + année + strip 7 jours (§18.6)
```

### Messages (décisions du 16 nov. 2026 ; remplacent B4 du 26 sept, tasks/b4-decisions.md caduc sur ces points)
```
PAS de titre — déjà dans la pill active de la top bar ; onglet nommé « Messages »
Bascule « Général · [prénom] » : SUPPRIMÉE
Barre propre (recherche pill + menu « Tout ⌄ ») : SUPPRIMÉE (décision du 17 nov.) — la recherche passe par le
          champ unique de la barre du bas, et le bloc « À traiter » remplace le filtre « À signer ».
1. Bloc « À traiter » (visible SEULEMENT s'il y a quelque chose) : un mot qui attend une action par ligne,
   bouton d'action DANS la ligne (pilule compacte, §2 variante liste) : « Signer », « Répondre »…
   pastille indigo (pencil) + titre 600 14 + sous-titre (expéditeur · échéance)
   statuts par responsable « Sophie ✓ · Vous » (§17 Statut de signature)
2. Bloc « Conversations » : UN FIL PAR INTERLOCUTEUR (§18.4 Ligne de fil)
   enseignant de l'enfant · classe · école/direction
   (périscolaire et intervenants : Phase 2 ; mairie : Phase 3)
   Fil de classe = ANNONCE SEULE : l'enseignant écrit à toutes les familles ; « Répondre » ouvre
   le fil PRIVÉ avec l'enseignant ; aucune discussion entre familles
Interdits : bandeau « N mots à signer », rouge, résumé de l'assistant, rôle de l'expéditeur, tags de catégorie
```

### Mot complet (page du mot)
```
Un mot peut CUMULER, dans cet ordre :
  signature (aucune / un parent / les deux) → « Signer » (confirmation obligatoire)
  question (oui / peut-être / non) → pilules compactes (§2) « Oui » · « Peut-être » · « Non »
  réponse privée à l'expéditeur → champ ; envoyée dans le fil avec l'expéditeur, EN CITANT LE MOT
« À prévoir » en puces (height 26, paddingH 10, fond #E2E8F0, texte #334155, 12px)
Deux enfants du foyer : « Signer aussi pour [prénom] » ; un mot d'information lu ici est lu dans l'autre carnet
Mot traité → archivé dans Scolarité › Documents ; jamais affiché dans « Aujourd'hui » comme un événement horaire
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

### Carte d'écran principal (Accueil, Scolarité, Agenda, Messages)
```
background: #FFFFFF OPAQUE · border: 1px solid rgba(15,23,42,0.07)
borderRadius: 16 · padding: 12-16px
shadow : ...SHADOW.card (src/constants/design.ts) — iOS 0.04 / 8, Android elevation 0 (Platform.select)
  (une élévation Android dessine un cadre gris sur une carte : leçons du 2 avr. et du 26 sept.)
Animation press: scale 0.97 · spring damping 15
Glass card (blanc 75-88 %, bordure blanche) : SUPPRIMÉE partout
```

### Card événement Agenda
```
borderRadius: 14px · padding: 10px 12px
borderLeft: 3px solid [couleur catégorie]
background: rgba(couleur, 0.08)
Libellé de catégorie OBLIGATOIRE dans la carte (Figtree 600 · 11px · rgba(15,23,42,0.55)), en plus de la couleur
RÈGLE: jamais d'emoji — barre + libellé + texte
Devoir cochable: checkbox cercle 18px · border 1.5px · alignSelf flex-end (détail §18.6)
```

### Card de l'assistant (écran de l'assistant ; sur l'Accueil : une ligne, §18.3)
```
background: linear-gradient(135deg, #EEF2FF, #F0FDFA)
border: 1px solid rgba(15,23,42,0.06) · borderRadius: 16px · padding: 12px 14px
Symbole Scolaria: 18px · color #4338CA · alignSelf flex-start · marginTop: 2px
```

### Card message (liste) — remplacée par la Ligne de fil (§18.4)
Liste à plat, PAS une carte. **Séparateur de 1 px entre les lignes : décision du 6 oct 2026**. Spécification complète : §18.4.

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

**Aucun FAB dans l'application** (16 nov. 2026). Tout ajout passe par le « + » de la barre du bas (§0, §11 bis).

---

## 10. SECTION LABELS

```
Accueil, Scolarité, Agenda, Messages (décision du sprint « Carnet vivant », étendue le 16 nov.) :
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

## 11 bis. FEUILLE « AJOUTER » (bouton « + » de la barre du bas)

```
Bottom sheet (§11). Sept actions (21 nov. : « Ajouter à l'agenda » ajoutée), icône lucide + libellé :
  Photographier (camera) · Importer une capture (image) · Ajouter un document (file-text)
  · Noter une première fois (star) · Ajouter à l'agenda (calendar-plus) · Signaler une absence (calendar-x)
  · Écrire à l'enseignant (pencil)
  (icônes validées le 17 nov. ; calendar-plus le 21 nov.)
  Absence et Écrire : masquées si l'enfant n'a pas de classe sur l'app (useEnseignantRattache)
Ordre selon l'onglet d'où on l'ouvre (décision du 17 nov.) — source : src/utils/actionsAjout.ts :
  Accueil, Scolarité : l'ordre ci-dessus
  Agenda : « Signaler une absence » puis « Ajouter à l'agenda » en premier, puis l'ordre ci-dessus
  Messages : « Écrire à l'enseignant » en premier, puis l'ordre ci-dessus
Toujours pour l'enfant sélectionné (titre de la feuille : « Ajouter au carnet de [prénom] »)

Signaler une absence (formulaire, page profonde) :
  Quand : Aujourd'hui · Demain · Autre date
  Durée : Matin · Après-midi · Journée · Plusieurs jours
  Motif : Maladie · Rendez-vous · Raison familiale · Autre
  Justificatif (facultatif) · Mot à l'enseignant (facultatif)
  Visible de l'enseignant avant l'appel
```

### Espace enseignant (miroir)
```
Top bar : quatre onglets Classe · Mots · Élèves · Messages
« + » : Nouveau mot · Donner des devoirs · Faire l'appel · Observation
Mêmes composants que l'espace parent (§0, §7, §11).
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

Décompte en clair sous le niveau (fontSize 11px · rgba(15,23,42,0.55)) :
  « 1 mot à signer · 2 nouveautés » … ou « À jour »
  + point 8px #EF4444 si mot à traiter, message non lu ou devoir pour demain non coché
  (photo ou compétence ajoutée : comptée en nouveauté, n'allume pas le point)

"Ajouter un enfant": color #4338CA
Rien d'autre : ni réglages, ni « Famille et paramètres », ni déconnexion
(ces entrées sont dans l'écran « Famille et paramètres », ouvert par ☰)
```

---

## 14. ÉCRAN DE L'ASSISTANT (nom interne : Aria)

```
Aucun nom de personnage affiché : libellé « Assistant » ; vouvoiement dans tous les textes générés
TOP BAR (propre, remplace la top nav habituelle):
  Gauche: icône historique · 32×32px cercle · bg rgba(15,23,42,0.08)
  Centre: symbole Scolaria 22px dans cercle 38px bg #F0F0F8
          + "Assistant" fontSize 11px · fontWeight 700
          + mode fontSize 9px · color rgba(15,23,42,0.55)
  Droite: icône nouveau · 32×32px cercle

BODY centré verticalement:
  Question: fontSize 19px · fontWeight 800 · letterSpacing -0.6px · textAlign center
  Pills: flex wrap · gap 7px · justify center (voir §3 Suggestions de l'assistant)

INPUT bas (remplace la bottom bar):
  Voir §5 Barre de l'assistant
```

---

## 15. TYPOGRAPHIE

```
Figtree uniquement — JAMAIS de font système
Exception Rufina Bold: ScolariaLogo uniquement

data-large    Figtree 900  40px  letterSpacing -2px     grands chiffres, moyennes
data-medium   Figtree 900  20px  letterSpacing -1px
display       Figtree 800  19-22px letterSpacing -0.8px  questions de l'assistant, titres forts
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
✗ Jamais de FAB ni de second bouton d'ajout → le « + » de la barre du bas, seul
✗ Jamais de loupe séparée → un seul champ « Rechercher ou demander »
✗ Jamais de nom de personnage dans l'interface → « Assistant » ; jamais de tutoiement
✗ Jamais carte-bouton (widget cliquable en card) → pills d'action à la place
✗ Jamais violet #7C3AED en couleur solide → #4338CA uniquement
✗ Jamais emoji dans les cards Agenda → barre couleur + libellé de catégorie + texte
✗ Jamais titre répété dans body si déjà dans la pill de la top nav
✗ Jamais fond blanc pur #FFFFFF comme background de page → #F3F4FA (Brume)
✗ Jamais de glass morphism → carte blanche opaque (§7)
✗ Jamais de segmented control dans Scolarité, jamais de bascule « Général / [prénom] » dans Messages
✗ Jamais de ligne source à la suite d'une donnée → sur sa propre ligne, dessous (§17)
✗ Jamais font système → Figtree partout
✗ Jamais height:'100%' → flex:1
✗ Jamais box-shadow CSS → shadow* + elevation Android
✗ Jamais overflow:'visible' pour les ombres sur Android
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

## 17. SCOLARITÉ — COMPOSANTS

### Bouton année
```
height: 34px · borderRadius: 999px · paddingH: 14px
background: rgba(15,23,42,0.08) · fontSize 13px · fontWeight 600
Texte: "2026–2027 · CM2 ⌄" — en tête du sommaire (niveau 1)
Tap → Dropdown (§12): année en cours (check #4338CA) · séparateur ·
      entête "Archives · lecture seule" · années précédentes + nom de l'école
      → ouvre Parcours
```

### 17 bis-A. Sommaire (niveau 1) et rubriques (niveau 2)
```
Niveau 1 (ScrollView, onglet Scolarité) :
  bouton année, puis quatre rubriques titrées, dans cet ordre :
  Apprentissages · Souvenirs · Documents · Parcours
  Chaque rubrique : label de section (§10) + carte (§7) montrant l'aperçu du PLUS RÉCENT
                    + lien ghost accent « Tout voir » (§2) → niveau 2
  Rubrique vide (décision du 17 nov.) : JAMAIS masquée. Titre de la rubrique, puis une carte d'invitation
    (§7) : une phrase (Figtree 400 · 13px · rgba(15,23,42,0.55)) + une pilule compacte (§2) ; PAS de « Tout voir »
    Apprentissages : « Les compétences saisies par l'enseignant apparaîtront ici. » + « Photographier un livret »
    Souvenirs : « Ajoutez un premier souvenir. » + « Ajouter »
    Documents : « Ajoutez un premier document. » + « Ajouter »
    Parcours : jamais vide (l'année en cours y figure toujours)
Niveau 2 (page profonde plein écran, header §6 Pages profondes) :
  UNE seule ligne de filtres (§3 Pills, ScrollView horizontal), puis la liste
  Apprentissages : domaines / disciplines (§18.2) ; collège-lycée : Notes v7
  Souvenirs : albums de classe, dessins/travaux de la famille, jalons
  Documents (ex-Livrets) : livrets et bulletins · évaluations nationales · mots signés et autorisations
                           (mots traités archivés ici) · certificats et attestations
                           · documents de l'école (règlement, fournitures, menus)
  Parcours : années passées en lecture seule, fils de messages de l'année compris
Segmented control Apprentissages · Souvenirs · Livrets : SUPPRIMÉ
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
TOUJOURS sur sa propre ligne, SOUS la donnée — jamais à la suite du niveau de compétence ni sur la même ligne
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
Aucun réglage de notifications dans Famille et paramètres (entrée retirée, jamais grisée) : aucune notification n'existe aujourd'hui.
À la mise en place du push distant (APNs, FCM) : l'entrée « Notifications » apparaît (une des sept, §19) avec trois réglages
(mots et messages · résumé à 18 h · silence 20 h – 7 h), chacun branché sur un effet réel et testé ;
jamais de matrice module × canal ; le texte commence par le prénom de l'enfant.
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

### 18.2 Carte de domaine (Scolarité › Apprentissages)
```
UNE carte par domaine / discipline (remplace « étiquette grise en majuscules + carte anonyme par observation »)
Carte d'écran principal (§7, blanche opaque) : borderRadius 16 · padding 14 · gap 8 · rien de pressable
En-tête : pastille 38×38 (§18.1) + titre en casse normale (Figtree 700 · 14px · letterSpacing -0.3 · #0F172A)
          + sous-titre « N observation(s) » (Figtree 400 · 12px · rgba(15,23,42,0.55))
Corps : observations séparées par un filet 1px rgba(15,23,42,0.08), la plus récente en premier
        texte Figtree 400 · 14px · lineHeight 1.45 + ligne source obligatoire (§17), 11px rgba(15,23,42,0.6),
        sur sa propre ligne
Primaire : niveaux (3 segments A/PA/NA ou 4 LSU) sous chaque compétence, inchangés et SANS teinte ;
           la ligne source vient SOUS le niveau, jamais à sa suite
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
  ligne ...... Figtree 500 · 14px · rgba(255,255,255,0.95) · « classe · enseignant · école »
               (« CE1 · Mme Durand · École Jules Ferry » ; un élément absent est omis avec son séparateur)
  (la pilule « [École] · année » est supprimée de l'en-tête : l'année vit dans Scolarité, §17)
Contraste AA sur les 6 couleurs d'enfant ; fond photo : voile existant conservé
Avatar de la top bar = photo sinon initiale ; il reste le sélecteur d'enfant. Aucun bouton « Changer »,
aucune pastille d'enfants sur l'Accueil.

Corps, dans l'ordre (décision du 16 nov.) :
 1. « À faire » : carte blanche ; lignes = pastille 38 (type, §18.1) + titre 600 14 + sous-titre 12.
    Mot à traiter : pilule d'action à droite (§2 variante liste). « À prévoir » : case ronde 22px,
    bordure 1.5px rgba(15,23,42,0.25), cochable.
 2. « Aujourd'hui et demain » : événements (carte §7 Agenda, avec libellé de catégorie), « À prévoir », devoirs
    (case ronde cochable, teinte de DISCIPLINE, « Coché par [prénom] · [heure] »).
    Un mot n'y figure JAMAIS comme un événement horaire.
 3. « Nouveau dans le carnet » : carte blanche ; observation + pastille de son domaine ; photo + miniature 48×48 à droite.
 4. Suggestion de l'assistant : UNE ligne (Figtree 500 · 13px), symbole 14px, puis sa source sur sa propre ligne
    (§17 Ligne source) ; données de l'enfant sélectionné seulement. Plus de carte.
SUPPRIMÉS : « Cette semaine » (remplacé par « Aujourd'hui et demain »), « Aujourd'hui » journée type fixe,
            carte de l'assistant, fonds d'écran.
Niveaux : maternelle = pas de devoirs ; primaire = tout ; collège / lycée = mêmes blocs.
Sans enfant : état vide inchangé.
```

### 18.4 Ligne de fil (bloc « Conversations », liste à plat)
```
UNE ligne par interlocuteur (enseignant de l'enfant · classe · école/direction) ; tap = TOUJOURS la page du fil,
même s'il ne contient qu'un élément (décision du 18 nov.)
Titre = l'interlocuteur ; aperçu = dernier message ; la classe porte la mention « Annonces »
Pas de carte. Ligne minHeight 64 · avatar 42 rond · séparateur 1px rgba(15,23,42,0.06)
École · direction · mairie : fond #E2E8F0 + building-2 #334155 · personne : initiales 700 13px sur #E2E8F0 / #334155
Non lu : titre Figtree 700 · date indigo 500 · point 8px #4338CA à droite de l'aperçu
Lu : titre 500 · date rgba(15,23,42,0.5)
Aperçu : 12px · rgba(15,23,42,0.65) · 1 ligne · ellipsis
Message avec photo : icône image 14px devant l'aperçu + miniature 44×44 (borderRadius 10) à droite,
  URL signée, placeholder ardoise si échec
Jamais : rôle de l'expéditeur, tag de catégorie, résumé de l'assistant, rouge, vue mêlant plusieurs enfants
Dans un fil : la réponse privée à un mot cite le mot (titre + date) au-dessus du texte
Fil de classe : aucun champ de réponse collectif ; « Répondre en privé » ouvre le fil de l'enseignant
```

### 18.5 Photo de l'enfant — feuille de photo
```
Bottom sheet (§11), 3 lignes : « Prendre une photo » · « Choisir dans la galerie » · « Supprimer la photo »
(la dernière seulement si la photo existe, Alert natif avant)
Consentement en pied : « Sert à reconnaître votre enfant dans son carnet. Visible de ses responsables. »
(rien sur l'école : la photo n'est visible d'aucune équipe d'école aujourd'hui)
Jamais obligatoire ni bloquante, pas de relance répétée : le badge de l'en-tête suffit
Photo par année (M36, variante A) : « Prendre / Choisir » écrit TOUJOURS sur l'année en cours ; année en cours sans photo →
la photo de l'année N−1 (seulement) s'affiche, avec une pastille d'année (« 2025–26 », 11 px, blanc 94 %, texte sombre) en bas du cercle
de l'en-tête ; la feuille ajoute « La photo affichée date de 2025–2026. Ajoutez celle de cette année… » et ne propose PAS « Supprimer »
(rien à supprimer pour cette année) ; ligne « Photo » du profil : « Photo de 2025–2026 · Ajouter celle de cette année »
Mode démo : aucune photo, initiales seulement
```

### 18.6 Agenda — devoirs, absences, rendez-vous fixes (16 nov. 2026)
```
Devoirs : groupés par JOUR D'ÉCHÉANCE, « Pour demain » en premier, puis les jours suivants
  ligne = case ronde 22px (bordure 1.5px rgba(15,23,42,0.25)) + pastille de discipline 34 + intitulé
  coche « fait » PARTAGÉE entre TOUS les responsables de l'enfant, y compris d'un autre foyer (parents séparés,
  règle du 20 nov. 2026, CLAUDE.md § Garde partagée) ; sous la ligne, ligne source (§17) :
  « Coché par [prénom] · [heure] » (« Coché par vous » pour soi) DANS le foyer de l'auteur seulement ;
  hors de ce foyer : « Fait » (auteur et heure masqués par la base, M41) ;
  même ligne sur l'Accueil et dans l'Agenda (même donnée, même logique : utils/devoirs) ;
  un devoir non coché pour demain allume la pastille de l'avatar (§0)
Absence signalée : carte §7 Agenda, catégorie « Absence », période + motif ; PAS de statut « Vu par l'enseignant » en V1
  (aucune lecture par l'enseignant n'est enregistrée : rien qui ne soit vrai ; décision du 17 nov.)
Journée type fixe du primaire : RETIRÉE de la V1 (décision du 17 nov.), comme l'emploi du temps complet (Phase 2)
Rendez-vous fixes hebdomadaires (V1) : « Piscine · tous les jeudis », « Bibliothèque · tous les mardis »
  carte §7 Agenda avec libellé de catégorie + liste « À prévoir » cochable SEMAINE PAR SEMAINE ; jamais pendant les vacances
  scolaires (zone de l’école, B par défaut) ; « Ajouté par [prénom] » et action « Modifier » dans le foyer de l’auteur
  seulement (un parent séparé voit la carte et coche, sans « Ajouté par » ni « Modifier » ; règle du 21 nov. 2026)
Emploi du temps complet : Phase 2 (aucune grille horaire en V1)
```

---

## 19. FAMILLE ET PARAMÈTRES (écran unique, ouvert par ☰)

```
Page profonde (§6, §8). SEPT entrées, dans cet ordre :
  Mes enfants · Responsables · Mon profil · Notifications (trois réglages) · Assistant
  · Confidentialité et données · Aide, à propos, se déconnecter
« Apparence » : SUPPRIMÉE
Toute option affichée mais non branchée est RETIRÉE (jamais grisée) ;
  « Notifications » n'apparaît qu'avec le push réel (§17 bis)
```

---

*COMPONENTS.md · Scolaria · v2.3 · 16 novembre 2026*
*Claude Code lit CLAUDE.md + COMPONENTS.md avant chaque sprint — sans exception*
