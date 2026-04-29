# CLAUDE.md — Design System & Règles Scolaria
*Version 2.1 · Avril 2026*

---

## Nom de l'application
**Scolaria** — jamais "ScolarIA" avec majuscules, jamais "Scholaris".
Police uniforme sur tout le mot — pas de traitement spécial sur "ia".
Tagline : "Le copilote éducatif des familles"

---

## Vision stratégique (résumé)
Scolaria est le **carnet de scolarité numérique** qui manque aux familles françaises.
Comme le carnet de santé, il appartient à la famille — pas à l'institution.
Il suit l'enfant de la maternelle au bac, indépendamment des établissements.
**Scolaria remplace les ENTs (Pronote, EcoleDirecte) — il ne s'y connecte jamais.**
→ Document complet : VISION.md

---

## Stack technique
- React Native / Expo + EAS (Starter plan)
- Supabase (BDD + Auth + Storage + RLS)
- TypeScript
- NativeWind (Tailwind CSS pour React Native)
- Gluestack UI v3

### Librairies clés
- `lucide-react-native` — icônes utilitaires (size 28, strokeWidth 1.5)
- `@getpapillon/papicons` — icônes navigation filled/solid (MIT license)
- `expo-linear-gradient` — dégradés natifs (obligatoire, backgroundColor ne supporte pas les dégradés sur native)
- `react-native-reanimated` — animations
- `expo-speech` — voice input Aria (à venir)

---

## Icône Application

**Identité visuelle** — le pictogramme officiel est le **symbole couronne** (8 ellipses, **#4338CA** sur fond blanc pour l'icône système). Le mot-symbole texte reste `<ScolariaLogo>` (Rufina + ✦) ; ne pas confondre avec le pictogramme seul.

### Système identitaire — règle absolue
| Élément | Valeur |
|---------|--------|
| Wordmark | Rufina Bold 700, noir |
| ✦ sparkle | Indigo `#4338CA` solide |
| Symbole (8 ellipses) | Indigo `#4338CA` |
| Icône app | Fond blanc `#FFFFFF` + symbole indigo |
| Règle couleur | Blanc/noir dominent, indigo = unique touche accent |

**Une seule couleur accent. Partout. Toujours.**
Le dégradé violet→cyan est réservé exclusivement à Aria — jamais sur l'identité de marque.

- `assets/icon.png` — 1024×1024 : symbole centré, fond `#FFFFFF` ; iOS + notifications
- Android adaptive : `foregroundImage` + `backgroundColor: "#FFFFFF"`
- **In-app :** `<ScolariaAppIcon>` (`src/components/ScolariaAppIcon.tsx`)
- **Marque texte in-app :** `<ScolariaLogo>` (`src/components/ScolariaLogo.tsx`) — font **Rufina** (wordmark uniquement, exception à Figtree), props `fontSize`, `primaryColor`, `sparkleColor` (défaut `#4338CA`), **pas** de dégradé sur le ✦
- **Symbole seul (ellipses) :** `<ScolariaSymbol>` (`src/components/ScolariaSymbol.tsx`) — couleur **#4338CA** par défaut
- **Dégradé violet / cyan (tokens Aria #6366F1 → #22D3EE) :** réservé aux halos / interactions Aria — **pas** sur le symbole ellipses ni sur le ✦
- Ne jamais régénérer l'icône via le composant — utiliser le PNG officiel

---

## DESIGN LANGUAGE v2.0 — Direction "Premium Modern"

### Philosophie
Scolaria doit avoir le niveau visuel de Papillon ou supérieur.
Mots-clés : glass morphism, profondeur, typographie forte, animations fluides, premium.
JAMAIS plat, JAMAIS générique.

### Headers
- Occupent 30-35% de l'écran sur chaque onglet principal
- Fond : dégradé depuis couleur accent thème → transparent
- Border-radius en bas : 28px
- Le contenu scrolle SOUS le header (overlap)
- Composant : `<ScreenHeader>` (src/components/ScreenHeader.tsx)

### Cartes (Glass Cards)
- TOUJOURS en glass morphism, jamais de View blanc simple
- Sur fond sombre : rgba(255,255,255,0.08), border rgba(255,255,255,0.12)
- Sur fond clair : rgba(255,255,255,0.75), border rgba(255,255,255,0.9), shadow forte (shadowOpacity 0.06, shadowRadius 24)
- borderRadius : 20 partout
- Composant : `<GlassCard>` (src/components/GlassCard.tsx)

### Tab bar
- Pill flottante détachée du bas (bottom: 20, left: 20, right: 20)
- borderRadius: 28
- Fond semi-transparent + blur si possible
- L'onglet actif a un fond pill avec couleur accent (opacité 15%)
- Label visible uniquement sur l'onglet actif
- Tous les ScrollView ont paddingBottom: 100
- Composant : `<FloatingTabBar>` (src/components/FloatingTabBar.tsx)

### Typographie — Figtree (unique font family)
- `Figtree_900Black` — data large (moyennes, grands chiffres)
- `Figtree_800ExtraBold` — display, titres principaux
- `Figtree_700Bold` — subtitles, labels importants
- `Figtree_600SemiBold` — body medium, section labels
- `Figtree_500Medium` — UI secondaire
- `Figtree_400Regular` — body courant
- `Figtree_300Light` — meta, mentions légères

**Tokens typographiques :**
- `display` : ExtraBold 26px, letterSpacing -0.9, lineHeight 26
- `dataLarge` : Black 40px, letterSpacing -1.8, lineHeight 40
- `dataInline` : ExtraBold 18px, letterSpacing -0.6, lineHeight 22
- `subtitle` : Bold 13px, letterSpacing -0.13, lineHeight 16
- `body` : Regular 14px, letterSpacing 0, lineHeight 21
- `bodyMedium` : SemiBold 13px, letterSpacing -0.13, lineHeight 18
- `sectionLabel` : SemiBold 8.5px, letterSpacing 1.2, uppercase, color #0F172A opacity 0.28
- `meta` : Light 8px, letterSpacing 0.08, color rgba(15,23,42,0.30)

**Line-height règle :**
- Display / grands chiffres : lineHeight = fontSize × 1.0
- Subtitles : lineHeight = fontSize × 1.2
- Body : lineHeight = fontSize × 1.5
- Meta : lineHeight = fontSize × 1.4

JAMAIS de font système. JAMAIS Barlow, JAMAIS DM Sans.
**Exception unique : Rufina** — exclusivement pour le wordmark dans `<ScolariaLogo>`. Nulle part ailleurs.

### Icônes
- lucide-react-native pour toute la navigation et l'UI
- Taille : 20px listes, 24px tab bar
- strokeWidth: 2
- Emoji autorisés dans le contenu (messages, badges) — jamais sur les noms de matières

### Noms de matières — texte brut uniquement
Les noms de matières (Mathématiques, Français, Anglais, etc.) ne doivent **jamais** comporter d'emoji ni de préfixe/suffixe d'icône, nulle part dans l'app. Texte seul, toujours.

### Wallpaper system (Accueil uniquement)
Bibliothèque curatée (dégradés, nature/espace, Apple-style) au choix de la famille.
Le wallpaper apparaît **uniquement** dans la zone header Accueil.
Tous les autres écrans = fond uni selon le mode.

### Fond global
- Background unique pour tous les niveaux : **#F8F7F5** (off-white warm)
- Pas de distinction visuelle par niveau scolaire sur le fond
- La personnalisation se fait via le wallpaper header uniquement

### Animations (react-native-reanimated)
- FadeInUp staggered (60ms delay) sur les listes de cartes
- Spring animation sur tab bar indicator
- Scale 0.97 sur press des cartes

---

### Palette de couleurs

### Palette de couleurs

#### Couleurs principales
- Fond global : **#F8F7F5** (off-white warm)
- Texte principal : **#0F172A**
- Texte secondaire : rgba(15,23,42,0.55)
- Texte muted / meta : rgba(15,23,42,0.30)
- Séparateurs / borders : rgba(15,23,42,0.06)

#### Accent Scolaria
- Indigo principal : **#4338CA**
- Dégradé Aria : linear-gradient(135deg, #6366F1, #22D3EE)
- Réservé Aria uniquement — jamais sur données ou UI générale

#### Règles couleur données
- Grades, moyennes, compteurs : **toujours #0F172A** — jamais de couleur
- Pills actives : backgroundColor #0F172A, color #FFFFFF
- Pills inactives : backgroundColor rgba(15,23,42,0.04), color rgba(15,23,42,0.35)
- Section labels : color #0F172A, opacity 0.28 — pas de violet
- Trend badges : backgroundColor rgba(15,23,42,0.06), color rgba(15,23,42,0.55)
- uppercase : section labels et badges de statut uniquement — jamais sur noms ou titres

#### Texte
- Sur fond clair : #0F172A (principal), #64748B (secondaire), #94A3B8 (muted)
- Sur fond sombre : #FFFFFF (principal), rgba(255,255,255,0.7) (secondaire)
- Sur header coloré : TOUJOURS blanc

---

### Règles absolues design
- ZERO texte blanc sur fond clair
- ZERO emoji comme icône de navigation
- ZERO emoji sur les noms de matières
- ZERO carte plate sans glass effect
- ZERO font système
- ZERO fond blanc pur (#FFFFFF) comme background de page
- ZERO bouton full-width
- Violet #7C3AED réservé au gradient — jamais en couleur solide isolée

---

## Structure de navigation (interface parent)

### Topbar
- Accueil : [Avatar ☰] — "Bonjour, Prénom 👋" — [✦ Aria] (scroll-to-hide)
- Autres tabs : avatar/burger gauche + titre section centre + bouton Aria droite

### Bottom bar (4 onglets permanents)
1. Accueil (Papicons filled)
2. Notes (Papicons filled)
3. Agenda (Papicons filled)
4. Messages (Papicons filled + badge rouge si non lu)
+ Aria (cercle gradient violet→cyan, icône = symbole couronne 8 ellipses Scolaria) — détaché à droite, hors pill

---

## Écrans validés (MVP Avril 2026)

- **Agenda v5** : titre mois large + calendrier mensuel pull-down, strip mois scrollable horizontal, sélecteur jour = lettre grise + cercle noir sur chiffre, cartes événements colorées (fond teinté + barre accent gauche) extensibles au tap, swipe pour changer de jour, FAB carré arrondi noir
- **Notes v7** : épuré blanc/noir/gris, couleur sur data uniquement, courbe progression lissée en haut, dernière note + forces/faiblesses en cartes blanches, pills matières scrollables (noir=actif, blanc=inactif), cartes notes extensibles, sélecteur trimestre + bouton scanner top-right
- **Messagerie** : hub unifié remplaçant notifications + cahier de liaison
- **Aria chat + sidebar discussions**

---

## Écran d'ouverture app (Splash / Login)
- Fond clair, logo Scolaria centré (symbole + wordmark)
- Bouton primaire : "Se connecter" (fond noir, texte blanc)
- Bouton secondaire : "Créer un compte" (contour noir, fond transparent)
- Lien discret : "Essayer en mode démo"
- Mention légale bas de page : conditions + politique de confidentialité
- Pas de sélecteur de profil, pas de PIN, pas d'avatars enfants

### Flux après connexion
Email + mot de passe → Supabase Auth identifie le rôle →
- Rôle "parent" → interface parent (sélecteur d'enfants)
- Rôle "enseignant" → dashboard enseignant
- Rôle "élève" (collège/lycée) → espace élève
Aucune saisie de rôle à la connexion — tout est géré par le compte.

---

## Système d'authentification & 3 profils

### À la connexion : redirection selon l'email de l'utilisateur
- Email professionnel reconnu → dashboard enseignant
- Email parent → sélecteur d'enfants
- Email élève collège/lycée → espace élève

### ENSEIGNANT
- Email professionnel + mot de passe
- Compte totalement séparé du compte famille
- Accès direct au dashboard enseignant après connexion
- Un parent qui est aussi enseignant = deux comptes séparés

### PARENT
- Email + mot de passe → sélecteur d'enfant style Netflix
- Gère tous les profils de ses enfants
- Seul à pouvoir signer les mots du cahier de liaison

### ENFANT MATERNELLE / PRIMAIRE (3-10 ans)
- Pas de compte, pas d'accès autonome — aucun PIN
- Le Score de Joie est rempli directement dans l'interface parent
- Le parent tend le téléphone, l'enfant tape sur son emoji, c'est tout
- Aucune interface enfant à développer pour ce niveau

### ENFANT COLLÈGE / LYCÉE (11-18 ans)
- Compte autonome : email + mot de passe
- App installée sur son propre téléphone
- Invité par le parent depuis le compte famille
- Voit uniquement ses propres données

### À 18 ans
- Le profil est transféré à l'enfant qui devient propriétaire de ses données
- Toute la scolarité de la maternelle au bac reste accessible

---

## Interface Enseignant — Specs

### Philosophie
- Enseignant pense en **classe**, pas en élève individuel
- Interface aussi simple qu'envoyer un SMS
- Zéro double saisie — Scolaria remplace Pronote, ne coexiste pas avec lui

### Personas enseignant
- **Enseignant** : ses élèves uniquement, ses matières uniquement
- **Enseignant principal** : toutes les matières de sa classe
- **Directeur** : toutes les classes, gestion accès (Phase 2)

### MVP V1 (prochain sprint)
- Connexion rôle enseignant
- Vue liste de classe
- Envoi message collectif (toute la classe) ou individuel (un parent)
- Saisie note ou observation par élève
- Signalement absence

### Phase 2
- Saisie notes en masse — grille de classe (tableau, pas élève par élève)
- Cahier de liaison numérique complet
- Photos / activités de classe
- Générateur d'appréciations Aria :
  → Enseignant coche 3 compétences observées
  → Aria propose 2 formulations en 2 secondes
  → Enseignant modifie librement et valide
  → Aucune appréciation envoyée sans validation explicite
- Vue profil élève (forces, ressenti Score de Joie si autorisé par parent)
- Indicateur professeur absent

### Phase 3
- Interface directeur (gestion classes, enseignants, accès, remplaçants)
- Dashboard bien-être anonymisé par classe

### Testeurs identifiés
- Prof d'histoire, collège (ami)
- Prof d'EPS
→ Stratégie : session découverte informelle d'abord (côté parent), puis sprint basé sur leurs retours
→ Guide d'entretien prêt : scolaria-guide-entretien-enseignants.pdf

---

## Aria — Règles d'affichage

- Représentée par le **symbole couronne Scolaria (8 ellipses)** — plus de ✦ ni Sparkles icon
- Fond carte Aria : dégradé très léger #EEF2FF → #F0FDFA
- Border : 1px solid rgba(15,23,42,0.06)
- Aria ne diagnostique JAMAIS — elle suggère et informe
- En mode archive : lecture seule, pas d'alertes Score de Joie
- Toujours citer ses sources pour chaque alerte
- Protocole urgence : mots-clés critiques → numéros d'aide (3020, 3114, 119) + alerte parent + aucune réponse IA seule

---

## Score de Joie

- Fenêtre glissante 5 jours
- 3 niveaux : Attention (baisse 15-30%) / Vigilance (baisse >30%) / Urgence (mots-clés critiques)
- Présenté comme tendance ("énergie en baisse") — jamais chiffre brut
- Révisable par le parent (contexte : maladie, événement familial)
- Couleur : #F59E0B · Emoji : 💛
- Ne jamais afficher de diagnostic médical

---

## Architecture BDD (Supabase)

### Tables principales
- users (parents, enseignants, élèves — rôle défini à l'inscription)
- students (profil enfant + theme_id)
- academic_years (millésimes — lien student)
- grades (notes saisies par enseignant)
- bulletins (lié à academic_year_id)
- mots_liaison (cahier de liaison)
- signatures (signature des mots — parent uniquement)
- absences (signalement absence)
- messages (messagerie hub)
- classe (liste élèves par enseignant)

### Règles RGPD
- Chiffrement AES-256 at-rest
- Hébergement OVH France — aucun transit hors UE
- Export JSON complet disponible
- Droit à l'effacement en cascade sous 30 jours
- Journal d'accès consultable par le parent
- URLs signées 24h pour les pièces jointes
- Zéro revente de données — zéro profilage publicitaire

---

## Règles de développement

### À toujours faire
- Utiliser les variables CSS/thème définies ci-dessus
- Appliquer le thème de l'enfant sélectionné globalement via ThemeContext
- Toutes les données liées à un academic_year_id
- Vérifier (grep -r) avant de modifier des fichiers
- Appliquer tous les changements en un seul bloc compilé

### À ne jamais faire
- Écrire "ScolarIA" avec IA en majuscules
- Utiliser fond blanc pur (#FFFFFF) comme background de page
- Mettre le Score de Joie en mode alerte sur des données archivées
- Afficher les données d'un parent à un autre (garde partagée)
- Comparer automatiquement des données inter-années (Phase 3)
- Créer des boutons full-width
- Utiliser violet #7C3AED comme couleur solide isolée

---

## Ce qui est en Phase 2-3 (ne pas implémenter maintenant)
- Comparaisons automatiques inter-années
- Memories de fin d'année
- Timeline longitudinale graphique
- Prédictions de performance Aria
- Mode sombre
- Signature électronique légale eIDAS
- ÉduConnect (optionnel V2, jamais obligatoire)
- Internationalisation (après France-first)
- Aria voice responses (V2 — V1 = input seulement)

---

## WORKFLOW Claude Code

### Démarrage de session
1. Lire tasks/lessons.md — appliquer toutes les leçons avant de toucher quoi que ce soit
2. Lire tasks/todo.md — comprendre l'état actuel
3. Si aucun des deux n'existe, les créer avant de commencer

### Règles de développement
- Diagnostic d'abord : grep -r avant toute modification
- Vérifier TypeScript errors avant commit
- Grouper tous les changements en un seul bloc compilé — une modification = un build
- Jamais de build pendant que des phases restent à chaîner
- Vérification localhost obligatoire avant tout build EAS
- Mode plan pour toute tâche non triviale (3+ étapes) → tasks/todo.md
- Après correction : mettre à jour tasks/lessons.md

### Principes fondamentaux
- Simplicité d'abord — toucher un minimum de code
- Causes racines uniquement — pas de fixes temporaires
- Ne jamais supposer — vérifier chemins, APIs, variables avant utilisation
- Une question en amont si nécessaire, ne jamais interrompre en cours de tâche

---

## APPRENTISSAGES
(Claude Code remplit cette section au fil du temps)
