# CLAUDE.md — Design System & Règles Scolaria
*Version 3.2 · Septembre 2026 · v3.1 + décisions validées : navigation burger, top bar jamais opaque, protocole d'urgence, Aria via Edge Function, tables réelles, symbole compact, Pressable, garde partagée*

> Ce fichier est l'unique CLAUDE.md du projet. Toute version antérieure (v2.x) est caduque.
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

## Principe fondateur — Un enfant = un carnet
- Chaque enfant a son propre carnet. **Aucune vue ne mélange plusieurs enfants** (messages compris).
- Le parent choisit le carnet via l'avatar (sélecteur d'enfant).
- Toute donnée (mot, message, signature, photo, livret, événement) est rattachée à l'enfant (`child_id`, ou `student_id` selon la table) + `academic_year_id` — jamais au parent seul.
- Un mot envoyé à une fratrie = une copie dans chaque carnet, une signature par enfant.
- Le sélecteur d'enfant affiche un indicateur de nouveauté par enfant.
- Chaque notification push nomme l'enfant et ouvre son carnet.
- À 18 ans, l'enfant récupère son carnet complet, sans tri.

---

## Stack technique
- React Native / Expo + EAS (Starter plan)
- Supabase (BDD + Auth + Storage + RLS)
- TypeScript
- NativeWind (Tailwind CSS pour React Native)

### Librairies clés
- `lucide-react-native` — toutes les icônes (size 20-24, strokeWidth 2)
- `expo-linear-gradient` — dégradés natifs (obligatoire — backgroundColor ne supporte pas les dégradés sur native)
- `react-native-reanimated` — animations
- `expo-speech` — voice input Aria (à venir)

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
| Règle couleur | Blanc/noir dominent — indigo = unique touche accent |

**Une seule couleur accent. Partout. Toujours.**
Le dégradé `#6366F1 → #22D3EE` est réservé exclusivement à Aria — jamais sur l'identité de marque.
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
- le header wallpaper de l'Accueil de son carnet

Elle ne s'applique jamais aux tuiles, cartes, pages ou bandeaux. Les anciens thèmes par niveau (orange maternelle / bleu primaire / anthracite lycée appliqués à toute l'app) sont supprimés.

---

## DESIGN LANGUAGE v3 — "Notion Premium"

### Philosophie
Référence principale : **Notion mobile** — navigation épurée, hiérarchie claire, Aria au centre.
Référence secondaire : Papillon — niveau de finition glass morphism sur les écrans riches.
Pages de navigation principale = glass morphism. Pages profondes = Notion ultra-épuré.

### Navigation — pattern Notion (validé définitivement)

**Top bar (toujours visible)**
```
[☰] [⌂ Accueil] [↗ Suivi] [📅 Agenda] [✉ Messages●] ... [Avatar enfant]
- ☰ burger (gauche) : tap = écran unique « Famille & paramètres »
- Avatar (droite) : 34×34px cercle, couleur de l'enfant, initiale
  tap = sélecteur d'enfant UNIQUEMENT (bottom sheet) avec indicateur de nouveauté par enfant
- Aucune ouverture de menu par swipe (conflit avec le pager des onglets)
- Fond : JAMAIS opaque. Transparente au repos ; fondu #F2F1EE lié au défilement
  (composant ScrollVeil, le même que le voile de la bottom bar). Pas de BlurView.
- Onglet actif : pill rgba(15,23,42,0.08), icône + label, height 30px, borderRadius 999px
- Onglet inactif : icône seule, color rgba(15,23,42,0.38)
- Badge non-lu : point rouge 6px, position absolute
- Icône Suivi : lucide `trending-up`
```

**Bottom bar (toujours visible)**
```
[🔍 Recherche] [◉ Demander à Aria…] [Action contextuelle]
- Fond : #F2F1EE, border-top 1px rgba(15,23,42,0.07)
- Icônes gauche/droite : 34×34px cercle, background rgba(15,23,42,0.08)
- Pill Aria centrale : flex:1, height 34px, borderRadius 999px
  background rgba(15,23,42,0.08), symbole Scolaria 14px + placeholder
- Action droite :
  Accueil  → + (Ajouter au carnet)
  Suivi    → ⊞ (scanner / Ajouter au carnet)
  Messages → ✏️ (nouveau message)
  Agenda   → rien (FAB suffit)
  Aria     → rien
```

**Règle titre — non redondance absolue**
Le titre de l'onglet actif est dans la pill top bar.
**Ne jamais répéter le titre dans le body. Jamais.**

### Fond global
```
Background : #F2F1EE (off-white warm) — partout, tous les écrans
Jamais #FFFFFF comme fond de page
```

### Typographie — Figtree (unique font family)
```
Figtree_900Black  — data large (40px, letterSpacing -2px) — moyennes, grands chiffres
Figtree_800ExtraBold — display (19-22px, letterSpacing -0.8px) — questions Aria, titres
Figtree_700Bold   — title (14-16px, letterSpacing -0.3px)
Figtree_600SemiBold — label (12-13px, letterSpacing -0.1px) — labels UI
Figtree_500Medium — body medium (13px)
Figtree_400Regular — body (12-14px, lineHeight 1.5)
Figtree_300Light  — meta (10-11px, color rgba(15,23,42,0.35-55))

Section labels : 600, 7.5px, letterSpacing 1.1px, uppercase, opacity 0.28
```

**JAMAIS de font système. JAMAIS Barlow. JAMAIS DM Sans.**
**Exception unique : Rufina Bold** — exclusivement dans `<ScolariaLogo>`. Nulle part ailleurs.

### Palette de couleurs
```
Fond page           #F2F1EE
Texte principal     #0F172A
Texte secondaire    rgba(15,23,42,0.55)
Texte muted         rgba(15,23,42,0.35)
Séparateurs         rgba(15,23,42,0.05-0.08)
Accent indigo       #4338CA
Dégradé Aria        linear-gradient(135deg, #6366F1, #22D3EE) — réservé Aria uniquement
Rouge               #EF4444
Amber (Score Joie)  #F59E0B
```

### Headers d'écran
```
Accueil :   header PLEINE LARGEUR (décision du 24 sept 2026, remplace la « carte 130px »)
            passe DERRIÈRE la barre d'état et la top bar (transparente, posée dessus au repos)
            couleur de l'enfant, ou fond choisi pour cet enfant (images intégrées à l'app)
            haut sans arrondi ; bas arrondi 28px posé sur #F2F1EE
            « Bonjour » + prénom en blanc ; barre d'état claire au repos
            au défilement : le header part avec le contenu, le voile ScrollVeil apparaît,
            la top bar repasse en couleurs sombres (§0). Aucun voile au repos.
Suivi :     pas de header coloré. Bouton année "2025–2026 · CE1 ⌄"
            puis segmented control Apprentissages · Souvenirs · Livrets
Agenda :    pas de header coloré, mois + strip semaine directement
Messages :  toolbar recherche + filtres uniquement — PAS de titre (déjà dans pill)
Pages profondes : fond #F2F1EE, header simple ‹ Retour + titre centré + action droite
```

### Cartes — règles

**Écrans principaux (Accueil, Suivi, Agenda, Messages)**
- Glass morphism : `rgba(255,255,255,0.75)`, border `rgba(255,255,255,0.92)`, borderRadius 18px
- Shadow : `shadowColor:#0F172A, shadowOpacity:0.06, shadowRadius:20, elevation:4`
- Animation press : `scale 0.97`, spring damping 15

**Pages profondes (Paramètres, Aide, Profil, etc.)**
- Aucune glass card — rows simples sur fond blanc, séparés par 1px rgba(15,23,42,0.05)
- Groupes fond `#FFFFFF` séparés par 8px `rgba(15,23,42,0.04)`

**Cards Agenda**
- `borderLeft: 3px solid [couleur catégorie]`, background `rgba(couleur, 0.08)`
- JAMAIS d'emoji dans une card Agenda — barre couleur + texte seul

**Cards Aria**
- `background: linear-gradient(135deg, #EEF2FF, #F0FDFA)`
- `border: 1px solid rgba(15,23,42,0.06)`, borderRadius 16px

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
Cercle uniquement — borderRadius: 999px — JAMAIS carré ni rectangle arrondi (Agenda compris)
width/height: 48px, background #0F172A
position: absolute, bottom: 72px (au-dessus bottom bar), right: 14px
```

### Icônes
```
lucide-react-native — partout dans l'UI
Taille : 20px listes, 22-24px navigation
strokeWidth: 2
Emoji : autorisés dans le contenu (messages, Score de Joie) — jamais comme icône UI
Matières : texte + couleur uniquement. JAMAIS d'emoji sur une matière, nulle part.
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
1. **Accueil** — header wallpaper, mots à signer, carte Aria « Votre semaine », « Nouveau dans le carnet »
2. **Suivi** (ex-Notes) — contenu selon le niveau (voir section Suivi)
3. **Agenda** — strip semaine + événements du jour (dont ceux créés depuis les mots) + FAB
4. **Messages** — filtres + liste conversations/mots + FAB

### Bottom bar (persistant)
- **Recherche** — modal plein écran, focus auto
- **Aria** — écran propre (topbar historique/nouveau, suggestions pills, input)

### Overlays transversaux
- **Sélecteur d'enfant** — bottom sheet via l'avatar : liste des enfants + indicateur de nouveauté + ajouter un enfant. Rien d'autre (pas de réglages, pas de déconnexion).
- **Famille & paramètres** — écran unique via ☰ (voir Pages profondes)
- **Ajouter au carnet** — 4 actions d'import (voir section dédiée)

### Pages profondes
- **Mon parcours** — archives des années précédentes, lecture seule (Addendum v3.2). Accès : bouton année de Suivi + sélecteur d'enfant
- **Famille & paramètres** (écran unique, ouvert par ☰) → Mes enfants / Responsables légaux / Mon profil / Apparence / Notifications / Aria / Confidentialité & données / Système / Compte (aide, à propos, déconnexion)
- Profil enfant → avatar & couleur / niveau / école / matières / suppression
- Personnaliser matières → **couleur** par matière (pas d'emoji)

→ Référence : `scolaria-arborescence.html`
→ Mockups : `scolaria-main-screens.html` + `scolaria-deep-screens.html`
→ Maquette carnet v3.4 : https://claude.ai/artifact/EZeZ5Za9LUhASEwmRCFatW

---

## Suivi (ex-Notes)

Le contenu s'adapte **automatiquement au niveau de l'enfant sélectionné** :

| Niveau | Suivi › Apprentissages |
|--------|------------------------|
| Maternelle | Carnet de suivi des apprentissages : domaines + observations de l'enseignant |
| Primaire | Compétences du livret (LSU) sur 4 niveaux : Non atteint · Partiellement · Atteint · Dépassé |
| Collège / Lycée | **Notes v7 inchangé** (courbe, pills matières, cartes extensibles) |

- Bouton année `2025–2026 · CE1 ⌄` : année en cours + lien vers **Mon parcours**. Pas de frise.
- Segmented control : **Apprentissages · Souvenirs · Livrets**
  - Souvenirs : albums photos de classe, dessins/travaux ajoutés par la famille, jalons (« premier exposé »)
  - Livrets : livrets et bulletins (saisis par l'enseignant ou scannés par le parent)
- Niveaux de compétence : 4 segments, remplis #0F172A, vides rgba(15,23,42,0.12). **Jamais de vert/rouge.**
- Toujours afficher la source : « Saisi par Mme Durand · 12 déc. » ou « Scanné par vous ».

---

## Ajouter au carnet (import par le parent)

Le carnet doit se remplir **même si l'école n'utilise pas encore Scolaria**.

- Points d'entrée : `+` (Accueil) et `⊞` (Suivi)
- 4 actions : **Photographier** (dessin, cahier, livret papier) · **Importer une capture** (mot d'une autre appli) · **Ajouter un document** (PDF) · **Noter une première fois** (jalon)
- **V1 :** le parent choisit la catégorie (Mot / Livret / Souvenir / Jalon) et la date. Rangé dans le carnet de l'enfant sélectionné.
- **Phase 2 (Aria stade 2) :** Aria reconnaît le document et propose la catégorie ; le parent valide toujours.
- Visibilité : foyer (défaut) ou privé.

---

## Agenda alimenté par les mots
- Composer enseignant : option « Ajouter à l'agenda des familles » avec date/heure saisies par l'enseignant.
- L'événement apparaît dans l'Agenda de chaque enfant concerné, lié au mot source.
- Liste « À prévoir » (pique-nique, casquette…) en cases à cocher dans la carte événement.
- V1 : date saisie par l'enseignant. Phase 2 : détection automatique par Aria.
- Mots importés : le parent ajoute la date à la main.

---

## Notifications
- **Activées par défaut** : mots à signer, messages enseignant, messages direction.
- **Résumé unique à 18h** : photos, annonces, informations.
- **Silence 20h – 7h**, sauf urgence école.
- Chaque push commence par le prénom : `Lucas · Mme Durand a publié un mot à signer`. Le tap ouvre le carnet de cet enfant.
- Trois réglages maximum dans Famille & paramètres. **Jamais de matrice module × canal.**
- Jamais de double activation (système + in-app) : si le système autorise, les push essentiels arrivent.

---

## Écran d'ouverture (Login)
- Fond #F2F1EE, symbole Scolaria + wordmark centrés
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
- Peut inviter un second responsable depuis Famille & paramètres
- Un responsable peut être rattaché à un seul enfant du foyer (familles recomposées)
- **Ajout d'un responsable : uniquement par invitation**, acceptée par l'invité dont l'email de compte est **confirmé**. Personne ne s'ajoute seul.
- **Un responsable ne peut retirer que lui-même** (jamais un autre ; le dernier responsable ne peut pas se retirer).
- **Un enfant ne peut être supprimé que par son unique responsable.** Dès 2 responsables, chacun peut seulement se retirer.

### Garde partagée
- **Partagé entre responsables** : tout ce qui vient de l'école (mots, messages de classe, photos, livrets, statuts de signature)
- **Privé à chaque responsable** : ses conversations privées avec l'enseignant, ses notes personnelles, ses ajouts marqués privés

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

### MVP V1
- Connexion rôle enseignant → dashboard « Ma classe »
- Vue liste de classe + présences
- Envoi message collectif ou individuel aux parents
- Mots avec **type** (information / signature / autorisation / participation) et **mode de signature** (aucune / 1 parent / les 2 parents)
- **Suivi par mot** : « 22/24 familles ont lu · 18/24 ont signé » + bouton « Relancer les N » (relance auto optionnelle J+2)
- Option « Ajouter à l'agenda des familles » + liste « À prévoir »
- Saisie note / observation / compétence par élève
- Signalement absence + **absences déclarées par les parents** visibles le matin

### Phase 2
- Saisie en masse (grille classe)
- Cahier de liaison numérique complet
- Photos activités de classe (albums)
- Registre d'appel exportable (obligation légale en primaire)
- Publication programmée
- Traduction des mots pour les familles (fournisseur compatible hébergement UE)
- Lecture à voix haute des mots
- Générateur d'appréciations Aria (enseignant coche 3 compétences → Aria propose 2 formulations → validation obligatoire)
- Dashboard bien-être anonymisé

### Testeurs identifiés
- **Priorité : enseignant(e)s de maternelle / primaire** (segment d'entrée)
- Prof d'histoire, collège (ami de Nino)
- Prof d'EPS
→ Session découverte informelle d'abord, sprint dédié ensuite

---

## Aria — règles d'affichage et comportement

- Représentée par le **symbole couronne Scolaria (8 ellipses)** — jamais d'autre icône
- Accessible depuis la pill bottom bar sur tous les écrans
- Carte Aria : `linear-gradient(135deg, #EEF2FF, #F0FDFA)`, border `rgba(15,23,42,0.06)`
- Aria ne diagnostique JAMAIS — elle suggère et informe
- Toujours citer ses sources pour chaque alerte ou résumé
- Travaille toujours sur le carnet de l'enfant sélectionné — jamais sur plusieurs enfants à la fois
- En mode archive : lecture seule, pas d'alertes Score de Joie
- Protocole urgence : mots-clés critiques → message fixe avec numéros d'aide, **aucune réponse IA, aucun appel au modèle**
  - 3114 (prévention du suicide, 24h/24) · 3018 (harcèlement et cyberharcèlement, 7j/7 9h-23h) · 119 (enfance en danger, 24h/24) · 112 (danger immédiat). **Le 3020 n'existe plus → 3018 partout.**
  - Ordre : le numéro de la catégorie détectée d'abord, les autres ensuite, **le 112 toujours en dernier**
  - Numéros **cliquables** (tel:)
  - Alerte enregistrée (catégorie, enfant, date — **jamais le texte**), **privée à son auteur** : jamais partagée automatiquement avec l'autre responsable ni l'enseignant
- **Appels au modèle : uniquement via l'Edge Function Supabase « aria »**. La clé Anthropic est un secret Supabase — jamais dans l'app, jamais dans un `.env`, jamais journalisée.
- Modèle : `claude-sonnet-5` par défaut, via le secret `ARIA_MODEL`. Pas de modèle de repli.
- Contexte envoyé : **prénom de l'enfant seulement** (jamais le nom, l'école ni l'identifiant)
- Suggestions = pills horizontales (jamais de cartes 2×2)

---

## Score de Joie

- Fenêtre glissante 5 jours
- 3 niveaux : Attention (baisse 15-30%) / Vigilance (baisse >30%) / Urgence (mots-clés)
- Présenté comme tendance — jamais chiffre brut
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
- `mots_liaison` — cahier de liaison : type (information|signature|autorisation|participation), signature_mode (none|one|both), event_date nullable, a_prevoir jsonb nullable, classe_id (destinataire par id)
- `mot_carnets` — une copie du mot par enfant (mot_id, child_id, academic_year_id) : classe → chaque enfant de la classe ; fratrie → `distribuer_mot()`
- `signatures` — une ligne par (mot_id, student_id, parent_id = responsable, signed_at) ; statut par carnet : vue `mot_carnets_statut` (both = les 2 responsables, ou l'unique)
- `reponses_mot` — autorisation (oui/non) et participation (oui/peut_etre/non), une par responsable et par carnet
- `carnet_items` — import parent : child_id, academic_year_id, categorie (mot|livret|souvenir|jalon), fichier, date, ajoute_par, visibilite (foyer|prive = auteur seul)
- `alertes_urgence` — protocole d'urgence : auteur, child_id, academic_year_id, catégorie, date — JAMAIS le texte ; privée à son auteur
- `absences` — signalement enseignant + déclaration parent
- `messages` — messagerie hub, rattachée à child_id
- `ecoles` / `classes` — classe = école + année + nom, identifiée par son **id** (jamais par son nom) ; `enseignant_id` = titulaire ; élève rattaché via `academic_years.classe_id`

### RLS
- Un responsable ne lit que les enfants auxquels il est rattaché
- `visibilite = prive` : lisible uniquement par son auteur
- Conversations privées parent ↔ enseignant : lisibles uniquement par leurs participants

### Règles RGPD
- Chiffrement AES-256 at-rest
- Hébergement OVH France — aucun transit hors UE
- Export JSON complet disponible (par carnet d'enfant)
- Droit à l'effacement en cascade sous 30 jours
- Journal d'accès consultable par le parent
- URLs signées 24h pour pièces jointes
- Zéro revente — zéro profilage publicitaire

---

## Ce qui est en Phase 2-3 (ne pas implémenter maintenant)

- Reconnaissance automatique des documents importés (Aria stade 2)
- Détection automatique des dates dans les mots
- Progrès d'un enfant comparés à lui-même sur plusieurs années (Aria stade 2+)
- Mémoires de fin d'année
- Prédictions de performance Aria
- Mode sombre
- Signature électronique légale eIDAS
- ÉduConnect (optionnel V2, jamais obligatoire)
- Internationalisation (après France-first)
- Aria voice responses (V2 — V1 = input texte + micro)
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
✗ Jamais de top bar opaque → voile #F2F1EE lié au défilement
✓ Retour par glissement depuis le bord gauche sur TOUTE page profonde (géré par l'app, navigation 3 boutons)
✗ Jamais de Pressable importé de react-native → `src/components/ui`
✗ Jamais de clé API dans l'app ou un .env → secret Supabase + Edge Function
✗ Jamais le texte d'un message de détresse stocké ou journalisé
✗ Jamais fond blanc pur #FFFFFF comme background de page → #F2F1EE
✗ Jamais font système → Figtree partout (Rufina = wordmark uniquement)
✗ Jamais bouton non-pill → borderRadius 999px toujours
✗ Jamais FAB carré → cercle 999px uniquement
✗ Jamais carte-bouton → pills d'action uniquement
✗ Jamais violet #7C3AED → #4338CA uniquement
✗ Jamais dégradé Aria (#6366F1→#22D3EE) hors contexte Aria
✗ Jamais d'emoji sur une matière
✗ Jamais emoji dans les cards Agenda → barre couleur + texte seul
✗ Jamais de vert/rouge sur les données (compétences, trends)
✗ Jamais titre répété dans le body si déjà dans la pill top bar
✗ Jamais glass card dans les pages profondes (paramètres, aide…)
✗ Jamais de module grisé visible — ce qui n'est pas activé n'existe pas à l'écran
✗ Jamais de push sans le prénom de l'enfant
✗ Jamais de matrice de réglages de notifications
✗ Jamais height:'100%' → flex:1
✗ Jamais box-shadow CSS → shadow* + elevation (Android)
✗ Jamais Score de Joie en alerte sur données archivées
✗ Jamais de comparaison entre enfants
✗ Jamais de conversation privée d'un responsable visible par l'autre

✓ Comparaison d'un enfant avec lui-même : autorisée à partir d'Aria stade 2,
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
