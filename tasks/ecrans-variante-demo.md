# Écrans de la variante démo (APK de démonstration, `APP_VARIANT=demo`) — 4 oct 2026

Source : `App.tsx` (pile racine) et `src/navigation/TabNavigator.tsx` (piles de chaque onglet). Captures (version web, 390 × 852, hors dépôt) : `C:\Users\admin\ScolariaBackups\captures-demo-web-2026-10-04\` — 01 ouverture, 02 Accueil, 03 Accueil (bas), 04 Suivi, 05 Agenda, 06 Messages, 07 Famille & paramètres, 08 À propos. Données : famille fictive (Léa GS, Lucas CM2, Emma 3e).

## Pile racine
| Écran | En variante démo |
|---|---|
| **Login** (ouverture) | OUI : symbole, « Carnet Démo », « Essayer en mode démo » (seul bouton), « Une famille fictive, aucune donnée réelle. » |
| **MainPager** (l'application : 4 onglets) | OUI (atteint par « Essayer en mode démo ») |
| Pin, Sandbox (espace enfant par code) | présents dans la navigation ; atteints seulement depuis le mode enfant de l'application [à vérifier : non ouvert pendant le test] |
| Connexion · Mot de passe oublié · Nouveau mot de passe · Inscription | **ABSENTS** (routes retirées) |
| Espace enseignant (`EnseignantDashboard`) · Espace élève (`EleveSpace`) | **ABSENTS** (routes retirées) |

## Onglet Accueil (pile `AccueilStack`)
Accueil · Signaler une absence · Bien-être (« Mon ressenti ») · Profil de l'enfant · Ajouter un enfant · Ajouter une année · Visionneuse d'image · Ajouter au carnet · Mon parcours · Famille & paramètres · Confidentialité & données (RGPD) · Autorisations (responsables) · Code de transfert · Effacement · Export des données · À propos · Aria (accueil, conversation) · Choix du fond d'écran · Détail d'une année archivée · Devoirs · Emploi du temps · Détail d'un mot · Signer un mot · Signature enregistrée.

## Onglet Suivi (pile `NotesStack`)
Suivi (Apprentissages · Souvenirs · Livrets) · Détail d'une matière · Détail d'une note · Bulletin · Mon parcours · Détail d'une année archivée · Ajouter une année · Visionneuse d'image · Ajouter au carnet.

## Onglet Agenda (pile `AgendaStack`)
Agenda · Détail d'un événement · Emploi du temps.

## Onglet Messages (pile `MessagerieStack`)
Messages · Signaler une absence · Liste des mots · Liste des absences · Liste « École » · Aria (messages, conversation) · Détail d'une conversation · Visionneuse d'image · Ajouter au carnet · Détail d'un mot · Signer un mot · Signature enregistrée.

## Superpositions
Sélecteur d'enfant (avatar), Recherche rapide, Ajouter au carnet (feuille d'actions), Aria (pill du bas).

## À savoir
- **Aucune interface enseignant** dans cet APK (routes absentes) ; pas de connexion ni de création de compte.
- Les écrans **Effacement**, **Export**, **Code de transfert**, **Autorisations** sont atteignables via Famille & paramètres ; il n'existe aucun compte réel ni serveur à modifier ; leur comportement exact en démonstration n'a PAS été vérifié écran par écran [à vérifier avant de les montrer] — à passer sous silence dans un parcours de 10 minutes (voir `tasks/demo-plan.md`).
- Aucun accès à un serveur : l'URL est factice (`.invalid`), tout vient des données de démonstration embarquées.
