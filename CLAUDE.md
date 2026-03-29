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

## Typographie
- **Titres / Display** : DM Serif Display ou Barlow Condensed 700-900
- **Corps / UI** : DM Sans 400-600
- **Labels uppercase** : DM Sans 600, letter-spacing 1px, text-transform uppercase
- Ne jamais utiliser Arial, Inter, Roboto ou System fonts par défaut

---

## Palette de couleurs

### Base (fond clair — direction principale)
- Background : #F7F8FC
- Surface / Card : #FFFFFF
- Border : #EEF0F5
- Text Primary : #0F172A
- Text Secondary : #64748B
- Text Muted : #94A3B8

### Accent global Scolaria
- Violet primaire : #6366F1
- Cyan secondaire : #22D3EE
- Dégradé Aria : linear-gradient(135deg, #6366F1, #22D3EE)

### Thèmes par enfant (personnalisables)
- Océan (défaut) : fond #0D1B3E, accent #4A90D9, light #93C5FD
- Glacier : fond #08141E, accent #0EA5E9, light #BAE6FD
- Ambre : fond #1F1208, accent #FBBF24, light #FCD34D
- Corail : fond #1C0E0C, accent #EF4444, light #FCA5A5
- Rose : fond #1C0C14, accent #EC4899, light #F9A8D4
- Teal : fond #071A1A, accent #14B8A6, light #5EEAD4
- Lavande : fond #110C1F, accent #A78BFA, light #C4B5FD
- Forêt : fond #1A2A1A, accent #4CAF50, light #A5D6A7
- Violet : fond #1A1A2E, accent #7C3AED, light #A78BFA

### Couleurs sémantiques
- Succès / positif : #10B981
- Alerte / urgent : #EF4444
- Attention : #F59E0B
- Score de Joie : #F59E0B

---

## Structure de navigation

### Topbar (fixe, tous les écrans)
- Gauche : burger menu (☰)
- Centre : pill enfant sélectionné [Avatar] [Prénom] [▾]
- Droite : cloche notifications + badge rouge si non lus

### Bottom bar (4 onglets permanents)
1. 🏠 Accueil
2. 📊 Notes
3. ✦ Aria
4. 📅 Agenda

### Menu burger (tiroir gauche)
Sections : MON ENFANT → FAMILLE → PARAMÈTRES
Items : Notes & Résultats, Cahier de liaison (badge), Bien-être,
Profil & Badges, Archives, Changer d'enfant, Permissions d'accès,
Notifications, RGPD, À propos / Charte Éthique

---

## Écran d'accueil

### Structure
1. Header sombre (couleur thème enfant) avec :
   - Topbar
   - Bandeau fin (4px) dégradé en tout haut
   - Carte Synthèse Aria (fond semi-transparent)
2. Section "Aujourd'hui" — grille 2x2 de tuiles blanches
3. Bandeau Score de Joie
4. Bottom bar

### Tuiles dynamiques
- Cahier de liaison : nb mots + badge rouge si non signé
- Devoirs : nb à rendre + date prochain
- Notes : moyenne générale + tendance
- Agenda : nb événements + prochain

---

## Écran sélecteur de profil (ouverture app)
- Fond sombre #0A0A14 avec halos de lumière violet/cyan
- Logo "Scolar" + "ia" en dégradé violet→cyan
- Avatars carrés arrondis (border-radius 14px) par enfant
- Bouton "Continuer avec [Prénom] →" en bas
- Badge Famille + PREMIUM

---

## Composants — règles générales

### Cards / Tuiles
- Background : #FFFFFF
- Border : 1px solid #EEF0F5
- Border-radius : 16px
- Shadow : 0 1px 4px rgba(0,0,0,0.04)
- Padding : 13px 12px

### Badges / Pills
- Border-radius : 20px
- Padding : 4px 12px
- Font : DM Sans 600, 11px

### Icônes de tuile
- Taille : 32x32px
- Border-radius : 9px
- Fond coloré très léger (10% opacité de l'accent)

### Chiffres dans les tuiles
- Font : DM Sans 600
- Taille : 22px
- Couleur : #0F172A

### Boutons primaires
- Background : dégradé #6366F1 → #22D3EE
- Couleur texte : #FFFFFF
- Border-radius : 14px
- Font : DM Sans 700, 13px

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
