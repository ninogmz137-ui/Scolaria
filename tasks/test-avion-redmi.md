# Test en mode avion sur le Redmi — 4 oct 2026

Appareil : Redmi a3a0cfea (Android 11, 1080×2400, densité 2,75), compte réel (2 enfants : Laia CP, Evan CM2), build de développement, Metro de l'utilisateur joint par `adb reverse` (le réseau Wi-Fi coupé, le JavaScript restait atteignable par USB).
Captures : `C:\Users\admin\ScolariaBackups\captures-avion-2026-10-04\` (hors dépôt : elles montrent l'adresse du compte).
Garde-fou : aucun appui sur déconnexion, suppression, signature, envoi, enregistrement ; jamais de déconnexion ; session expirée non testée sur le compte réel.

## Méthode
- Mode avion : `adb shell cmd connectivity airplane-mode enable | disable` (fonctionne sur ce Redmi ; `settings get global airplane_mode_on` = 1 / 0 ; `ping 8.8.8.8` : « Network is unreachable » puis réponses).
- Rechargement du JavaScript : `curl http://localhost:8081/reload` (la touche menu du Redmi ouvre le gestionnaire d'applications MIUI, pas le menu développeur) ou arrêt forcé + serveur « localhost:8081 » du lanceur.
- Déclencheurs des échecs : changement d'enfant (Laia ↔ Evan), première visite d'un onglet, démarrage à froid hors ligne, bouton « Réessayer ».
- Avant tout démarrage à froid hors ligne : jeton rafraîchi par le lien de développement `rafraichir-session` (un jeton expiré hors ligne simulerait une session expirée).

## Résultats
| # | Écran | Réseau coupé | « Réessayer » réseau rétabli |
|---|---|---|---|
| 1 | Accueil (changement d'enfant) | « Pas de connexion » + « Réessayer » (180×52 dp) ; plus aucun faux vide (« Rien de prévu », « Aucune note / apprentissage » masqués) | recharge, message disparu |
| 2 | Suivi (vue Apprentissages) | erreur + « Réessayer » ; plus de « Aucune compétence » ; plus d'année d'un autre enfant | recharge |
| 3 | Agenda | erreur + « Réessayer » ; plus de « Libre » | recharge (« Journée libre » réelle) |
| 4 | Messages | erreur + « Réessayer » ; plus de « Les mots de l'école… arriveront ici » | recharge (aussi au simple retour sur l'onglet) |
| 5 | Ajouter au carnet (formulaire) | erreur + « Réessayer », saisie conservée, aucun enregistrement tenté | — |
| 6 | Famille & paramètres (démarrage à froid) | erreur + « Réessayer » ; aucun « aucun enfant » | « Réessayer » recharge les 2 enfants et les responsables |
| 7 | Démarrage à froid hors ligne (racine) | session conservée (pas d'écran de connexion), tous les onglets : erreur + « Réessayer » | « Réessayer » recharge enfants puis tous les onglets |

Fin du test : mode avion désactivé (`airplane_mode_on` = 0, ping OK), app rechargée, Accueil de Laia sans erreur.

## Défauts trouvés PAR le test et corrigés (invisibles aux tests automatiques)
1. **Données d'un autre enfant** : au changement d'enfant hors ligne, Suivi gardait l'année « 2026–2027 · CP » de Laia sous Evan (CM2). Corrigé : tout ce qui vient d'un enfant est vidé à son changement, avant le chargement ; un nouvel essai pour le même enfant garde l'affichage (hooks `useCarnetReel`, `useMotsEnfant`, Suivi, Agenda).
2. **Faux vides sous le message d'erreur** : « Aucune compétence… » (Suivi, 3 vues), « Libre » (Agenda), « Rien de prévu aujourd'hui », « Aucune note / aucun apprentissage » (Accueil). Masqués tant que le chargement est en échec.
3. **Avatar de la barre du haut** : « + » et libellé « Aucun enfant » quand la liste n'a pas pu être chargée → « … » et « Enfants non chargés ».

## Constats restants (non corrigés)
- **Zones tactiles < 44 dp** (mesurées par uiautomator ; une marge de toucher invisible n'y figure pas — **non vérifié**, mon essai de détection était ambigu) :
  - barre du haut : burger 34×34, onglets 34×30 (actif 79–110×30), avatar 34×34 ;
  - barre du bas : « Rechercher » 40×11, « Demander à Aria » 273×11, bouton d'action 40×11 (hauteur mesurée 11 dp : à confirmer, la spec dit 34×34) ;
  - Suivi : bouton année 144×34, P1–P5 44×32 ; Agenda : jours 36×61, filtres 30 de haut ; Messages : segments 32, filtre 36, champ de recherche 17 ; Accueil : « Voir le suivi → » 27 ; Famille : 2 lignes de notifications 12–27.
  - Respectent 44 dp : « Réessayer » (180×52), retour (40×40 ≈ proche), lignes de listes (≥ 48), formulaire d'ajout (flèches 44×44).
  CLAUDE.md exige « zone tactile minimum 44×44 » : un lot dédié (hitSlop) est nécessaire.
- **Accueil, compte réel** : « Rien de prévu aujourd'hui » et « Aucun apprentissage noté pour l'instant » s'affichent TOUJOURS pour un compte réel, même en ligne (Agenda et Suivi ne sont pas branchés sur l'Accueil réel) : ce n'est pas une erreur réseau mais l'affirmation est discutable (« rien de vrai qui ne le soit pas aujourd'hui »).
- **Accueil et carnet** : l'erreur de chargement du carnet ne se relance qu'avec « Réessayer » (les mots, eux, se relancent au retour sur l'onglet).
- **Famille & paramètres hors ligne** : « Mes enfants » ne montre que « Ajouter un enfant » sous le message d'erreur (aucune phrase fausse, mais la liste est vide).
- **Suivi : les 4 vues** : seule « Apprentissages » existe pour ces deux enfants (la barre Souvenirs · Livrets n'apparaît que si le carnet contient des éléments) ; les vues Souvenirs et Livrets, et Notes (collège), n'ont donc pas été vues sur l'appareil — leur masquage du faux vide repose sur le code et sur tsc.
- **Données « conservées »** : les deux enfants n'ont aucune donnée de carnet : « données déjà chargées conservées » vérifié pour la liste des enfants (le sélecteur garde Laia et Evan après l'échec), pas pour des mots ou des événements réels.
- **Bandeau rouge « TypeError: Network request failed »** : fenêtre d'erreurs du build de développement (LogBox), absente d'un build de production.
- Incident du test : mon boucle de contrôle des zones tactiles a envoyé des appuis hors de l'app (touche retour trop nombreuses) et l'un a ouvert l'application **Messages du téléphone** sur une conversation. Rien n'a été envoyé ni modifié ; la capture a été supprimée, l'application fermée. Leçon ajoutée.
