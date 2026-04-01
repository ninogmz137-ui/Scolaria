# CLAUDE.md — Design System & Règles Scolaria

## Nom de l'application
**Scolaria** — jamais "ScolarIA" avec majuscules.
Le "ia" est discret, en couleur ou police légèrement différente.
Tagline : "Le copilote éducatif des familles"

---

## Stack technique
- React Native / Expo
- Supabase (BDD + Auth + Storage)
- NativeWind (Tailwind CSS pour React Native)
- Gluestack UI v3

---

## DESIGN LANGUAGE v2.0 — Direction "Premium Modern"

### Philosophie
Scolaria doit avoir le niveau visuel de Papillon ou supérieur.
Mots-clés : glass morphism, profondeur, typographie forte,
animations fluides, premium. JAMAIS plat, JAMAIS générique.

---

### Headers
- Occupent 30-35% de l'écran sur chaque onglet principal
- Fond : dégradé depuis couleur accent thème -> transparent
- Border-radius en bas : 28px
- Le contenu scrolle SOUS le header (overlap)
- Composant : `<ScreenHeader>` (src/components/ScreenHeader.tsx)

### Cartes (Glass Cards)
- TOUJOURS en glass morphism, jamais de View blanc simple
- Sur fond sombre : rgba(255,255,255,0.08), border rgba(255,255,255,0.12)
- Sur fond clair : rgba(255,255,255,0.75), border rgba(255,255,255,0.9),
  shadow forte (shadowOpacity 0.06, shadowRadius 24)
- borderRadius : 20 partout
- Composant : `<GlassCard>` (src/components/GlassCard.tsx)

### Tab bar
- Pill flottante detachee du bas (bottom: 20, left: 20, right: 20)
- borderRadius: 28
- Fond semi-transparent + blur si possible
- L'onglet actif a un fond pill avec couleur accent (opacite 15%)
- Label visible uniquement sur l'onglet actif
- Tous les ScrollView ont paddingBottom: 100
- Composant : `<FloatingTabBar>` (src/components/FloatingTabBar.tsx)

### Typographie
- Chiffres et titres display : BarlowCondensed_700Bold / 800ExtraBold
- Corps et UI : DMSans_400Regular / 500Medium / 600SemiBold
- Titres de section : BarlowCondensed_700Bold, 13px, uppercase, letterSpacing 2
- JAMAIS de font systeme (Arial, Inter, Roboto, System)

### Icones
- lucide-react-native pour toute la navigation et l'UI
- Emoji uniquement dans le contenu (matieres, messages, badges)
- Taille : 20px listes, 24px tab bar
- strokeWidth: 2

### Fonds par mode scolaire
- Maternelle : #FFF8F0 + header orange/ambre (#FF9F43 -> #FFECD2) + motif SVG subtil 3-5%
- Primaire : #0F1923 + header cyan profond (#0B1628 -> #164E63) + micro-etoiles 5%
- College-Lycee : #F8F7FF + header violet raffine (#4C1D95 -> #7C3AED) + fond clean
- Proprietes theme : backgroundColor, headerGradientFull[], isDarkBg, textOnBg, textOnBgSecondary

### Animations (react-native-reanimated)
- FadeInUp staggered (60ms delay) sur les listes de cartes
- Spring animation sur tab bar indicator
- Scale 0.97 sur press des cartes
- Fade transition au switch d'enfant

---

### Palette de couleurs

#### Accent global Scolaria
- Violet primaire : #6366F1
- Cyan secondaire : #22D3EE
- Degrade Aria : linear-gradient(135deg, #6366F1, #22D3EE)

#### Themes par enfant (personnalisables)
- Ocean (defaut) : accent #4A90D9, light #93C5FD
- Glacier : accent #0EA5E9, light #BAE6FD
- Ambre : accent #FBBF24, light #FCD34D
- Corail : accent #EF4444, light #FCA5A5
- Rose : accent #EC4899, light #F9A8D4
- Teal : accent #14B8A6, light #5EEAD4
- Lavande : accent #A78BFA, light #C4B5FD
- Foret : accent #4CAF50, light #A5D6A7
- Violet : accent #7C3AED, light #A78BFA

Couleurs enfant = accents UNIQUEMENT (header, tab bar, badges), jamais sur le texte general.

#### Couleurs semantiques
- Succes / positif : #10B981
- Alerte / urgent : #EF4444
- Attention : #F59E0B
- Score de Joie : #F59E0B

#### Texte
- Sur fond clair : #0F172A (principal), #64748B (secondaire), #94A3B8 (muted)
- Sur fond sombre : #FFFFFF (principal), rgba(255,255,255,0.7) (secondaire)
- Sur header colore : TOUJOURS blanc
- JAMAIS de texte blanc sur fond clair

---

### Regles absolues design
- ZERO texte blanc sur fond clair
- ZERO emoji comme icone de navigation
- ZERO carte plate sans glass effect
- ZERO font systeme
- ZERO fond blanc pur (#FFFFFF) comme background de page

---

## Structure de navigation

### Topbar (fixe, tous les ecrans)
- Gauche : avatar enfant (ouvre burger menu)
- Centre : greeting (accueil) / titre (stacked)
- Droite : boutons glass contextuels
- Composant : `<AppTopbar>` (src/components/AppTopbar.tsx)

### Bottom bar (4 onglets permanents)
1. Accueil (icone lucide: Home)
2. Notes (icone lucide: GraduationCap)
3. Aria (icone: Sparkles)
4. Agenda (icone lucide: Calendar)

### Menu burger (tiroir gauche)
Sections : MON ENFANT -> FAMILLE -> PARAMETRES
Items : Notes & Resultats, Cahier de liaison (badge), Bien-etre,
Profil & Badges, Archives, Changer d'enfant, Permissions d'acces,
Notifications, RGPD, A propos / Charte Ethique

---

## Ecran d'accueil

### Structure
1. ScreenHeader gradient (30-35% ecran, couleur theme enfant)
2. Topbar par-dessus le header
3. Section "Aujourd'hui" — grille 2x2 de GlassCard tuiles
4. Cours du jour (GlassCard noPadding)
5. Carte Aria synthese (GlassCard)
6. Bandeau Score de Joie
7. FloatingTabBar

### Tuiles dynamiques
- Cahier de liaison : nb mots + badge rouge si non signe
- Devoirs : nb a rendre + date prochain
- Notes : moyenne generale + tendance
- Agenda : nb evenements + prochain

---

## Ecran selecteur de profil (ouverture app)
- Fond sombre #0A0A14 avec halos de lumiere violet/cyan (LuminousOrbs)
- Logo "Scolar" + "ia" en degrade violet->cyan
- Avatars carres arrondis (border-radius 14px) par enfant
- Bouton "Continuer avec [Prenom] ->" en bas
- Badge Famille + PREMIUM

---

## Badges / Pills
- Border-radius : 20px
- Padding : 4px 12px
- Font : DMSans_600SemiBold, 11px

## Boutons primaires
- Background : degrade #6366F1 -> #22D3EE
- Couleur texte : #FFFFFF
- Border-radius : 14px
- Font : DMSans_700Bold, 13px

---

## Aria — règles d'affichage
- Toujours identifier avec l'icône ✦ et le label "Aria · [contexte]"
- Fond carte Aria : dégradé très léger #EEF2FF → #F0FDFA
- Border : 1px solid #E0E7FF
- Aria ne diagnostique JAMAIS — elle suggère et informe
- En mode archive : lecture seule, pas d'alertes Score de Joie

---

## Score de Joie
- Fenêtre glissante 5 jours
- Seuil d'alerte : -30% déclenche 3 niveaux (Attention / Vigilance / Urgence)
- Couleur : #F59E0B
- Emoji : 💛
- Ne jamais afficher de diagnostic médical

---

## Règles de développement

### À toujours faire
- Utiliser les variables CSS/thème définies ci-dessus
- Appliquer le thème de l'enfant sélectionné globalement via ThemeContext
- Changer d'enfant dans la topbar met à jour toute l'app instantanément
- Toutes les données sont liées à un academic_year_id (millésime)

### À ne jamais faire
- Ne jamais écrire "ScolarIA" avec IA en majuscules
- Ne jamais utiliser de fond blanc pur (#FFFFFF) comme background de page
- Ne jamais mettre le Score de Joie en mode alerte sur des données archivées
- Ne jamais afficher les données d'un parent à un autre (garde partagée)
- Ne jamais comparer automatiquement des données inter-années (Phase 3)

---

## Architecture BDD (Supabase)

### Tables principales
- users (parents, enseignants, élèves)
- students (profil enfant + theme_id)
- academic_years (millésimes — lien student)
- bulletins (lié à academic_year_id)
- mots_liaison (cahier de liaison)
- signatures (signature des mots)
- absences (signalement absence)

### Règles RGPD
- Chiffrement AES-256 at-rest
- Export JSON complet disponible
- Droit à l'effacement en cascade
- Journal d'accès consultable par le parent
- URLs signées 24h pour les pièces jointes

---

## Personas utilisateurs
- **Parent principal** : accès complet
- **Parent secondaire** : accès configurable par le parent principal
- **Enseignant** : ses élèves uniquement, ses matières uniquement
- **Enseignant principal** : toutes les matières de sa classe
- **Accompagnant** (nounou, grands-parents) : accès minimal défini par le parent

---

## Système d'authentification

### Comptes et rôles

ENSEIGNANT
- Email professionnel + mot de passe
- Compte totalement séparé du compte famille
- Accès direct au dashboard enseignant après connexion

PARENT
- Email + mot de passe → compte famille principal
- Après connexion : sélecteur d'enfant style Netflix
- Gère les profils de tous ses enfants
- Seul le parent peut signer les mots du cahier de liaison

ENFANT MATERNELLE / PRIMAIRE (3-10 ans)
- Pas de compte autonome
- Accès via PIN 4 chiffres défini par le parent
- Uniquement sur le téléphone du parent
- Bac à sable complet : espace élève uniquement
- Ne peut PAS accéder à l'espace parent
- Ne peut PAS signer les mots du cahier de liaison
- Retour à l'espace parent = ressaisie du MDP parent obligatoire

ENFANT COLLÈGE / LYCÉE (11-18 ans)
- Compte autonome : email + mot de passe
- App installée sur son propre téléphone
- Invité par le parent depuis le compte famille
- Espace élève indépendant sur son téléphone
- Voit ses propres données (notes, agenda, bien-être)
- Ne peut PAS signer les mots du cahier de liaison
- Ne voit PAS les données des autres enfants de la famille

### Flux de connexion

Écran d'ouverture de l'app :
1. Email + mot de passe → Parent ou Enseignant
2. Bouton "Accès enfant" → Saisie PIN → Espace élève primaire

### Règles de sécurité
- Un enfant avec PIN ne peut jamais accéder à l'espace parent
- Un enfant collégien/lycéen ne voit que ses propres données
- La signature des mots du cahier de liaison est réservée au parent
- Un parent qui est aussi enseignant a deux comptes séparés
  (email perso pour parent, email pro pour enseignant)

---

## Ce qui est en Phase 2-3 (ne pas implémenter maintenant)
- Comparaisons automatiques inter-années
- Memories de fin d'année
- Messagerie bidirectionnelle parent → enseignant
- Timeline longitudinale graphique
- Prédictions de performance Aria
- Mode sombre
- Signature électronique légale eIDAS

---

## DÉMARRAGE DE SESSION
1. Lire tasks/lessons.md — appliquer toutes les leçons avant de toucher quoi que ce soit
2. Lire tasks/todo.md — comprendre l'état actuel
3. Si aucun des deux n'existe, les créer avant de commencer

## WORKFLOW

### 1. Planifier d'abord
- Passer en mode plan pour toute tâche non triviale (3+ étapes)
- Écrire le plan dans tasks/todo.md avant d'implémenter
- Si quelque chose ne va pas, STOP et re-planifier — ne jamais forcer

### 2. Stratégie sous-agents
- Utiliser des sous-agents pour garder le contexte principal propre
- Une tâche par sous-agent
- Investir plus de compute sur les problèmes difficiles

### 3. Boucle d'auto-amélioration
- Après toute correction : mettre à jour tasks/lessons.md
- Format : [date] | ce qui a mal tourné | règle pour l'éviter
- Relire les leçons à chaque démarrage de session

### 4. Standard de vérification
- Ne jamais marquer comme terminé sans preuve que ça fonctionne
- Lancer les tests, vérifier les logs, comparer le comportement
- Se demander : « Est-ce qu'un staff engineer validerait ça ? »

### 5. Exiger l'élégance
- Pour les changements non triviaux : existe-t-il une solution plus élégante ?
- Si un fix semble bricolé : le reconstruire proprement
- Ne pas sur-ingénieriser les choses simples

### 6. Correction de bugs autonome
- Quand on reçoit un bug : le corriger directement
- Aller dans les logs, trouver la cause racine, résoudre
- Pas besoin d'être guidé étape par étape

## PRINCIPES FONDAMENTAUX
- Simplicité d'abord — toucher un minimum de code
- Pas de paresse — causes racines uniquement, pas de fixes temporaires
- Ne jamais supposer — vérifier chemins, APIs, variables avant utilisation
- Demander une seule fois — une question en amont si nécessaire, ne jamais interrompre en cours de tâche

## GESTION DES TÂCHES
1. Planifier → tasks/todo.md
2. Vérifier → confirmer avant d'implémenter
3. Suivre → marquer comme terminé au fur et à mesure
4. Expliquer → résumé de haut niveau à chaque étape
5. Apprendre → tasks/lessons.md après corrections

## APPRENTISSAGES
(Claude remplit cette section au fil du temps)
