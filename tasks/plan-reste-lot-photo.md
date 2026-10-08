# Plan — ce qui reste du lot photo (SANS CODE, pour validation)

*8 octobre 2026. État : M36 appliquée à Paris le 8 oct. ; application « variante A » (repli N−1 seulement, signe d'année sur l'avatar de
l'en-tête, feuille et profil adaptés, export zip par année) ; témoins de transition validés sur appareil. Ce document ne code rien. Les
estimations sont en jours de travail, tests et vérification sur appareil compris ; elles ne comptent PAS les attentes (build, validation).*

## 0. Ordre proposé et dépendances

| # | Lot | Estimation | Risque | Dépend de |
|---|---|---|---|---|
| 1 | Mon parcours : une photo par année, remplaçable et supprimable | 2 j | moyen | feuille de photo paramétrée par année (fait dans ce lot) |
| 2 | Étape photo à l'ajout d'une année + vérification de l'étape photo à la création d'un enfant | 1 j | faible | 1 (même feuille par année) |
| 3 | Invitation de rentrée (« Nouvelle photo pour 20XX–20YY ? », une fois par année) | 1 j | moyen (agacement, géométrie de l'en-tête) | passage d'année serveur (todo BLOQUANT avant la rentrée 2027) pour exister en vrai ; testable avec une année simulée |
| 4 | Signe d'année passée sur les petits avatars de 34 px | 0,5 j | faible (lisibilité) | aucune ; mieux après 1 (le même libellé « photo de 2025–2026 ») |
| 5 | M37 : retrait de `children.photo_path` et de l'ancien `avatar.jpg` | 0,5 j de code + 0,5 j de tests + un cycle Paris | ÉLEVÉ (irréversible côté données si des photos sont encore à l'ancien chemin) | 1 à 4 stables, plus aucune photo à l'ancien chemin, ancienne app disparue |

Total hors M37 : environ 4,5 jours. M37 en dernier, seul, après au moins une semaine de stabilité.

## 1. Mon parcours : une photo par année, remplaçable et supprimable (2 j, risque moyen)

- **Ce que ça fait** : sur chaque ligne d'année (en cours, archivées, importées) de Mon parcours, une vignette (carrée, 40 dp) de la photo de CETTE
  année, ou l'initiale ; un tap ouvre la feuille de photo de cette année : « Prendre une photo », « Choisir dans la galerie », « Supprimer la photo »
  (Alert natif avant). Remplacer ou supprimer reste possible sur une année archivée (M36 le permet : verrous M17 à M19 sans effet sur `photo_path`,
  testé).
- **Travail** : paramétrer `useActionsPhoto` et `FeuillePhotoEnfant` par année (aujourd'hui : l'année en cours, via `cibleEcriture`) ; une
  fonction pure de plus (`cibleEcriture` avec un identifiant d'année explicite, refus d'une année qui n'est pas celle de l'enfant) ; chargement
  des URL signées à la demande (jusqu'à ~15 années par enfant : pas toutes d'un coup) ; export et sauvegarde inchangés.
- **Règle à AMENDER (point d'attention)** : CLAUDE.md décrit « Mon parcours » comme des archives en LECTURE SEULE (Addendum v3.2). La photo d'une
  année précédente devient modifiable : exception explicite et limitée à la photo (jamais aux notes, compétences, livrets), à écrire dans
  CLAUDE.md et COMPONENTS.md avant le code. [À VALIDER par l'utilisateur.]
- **Risques** : (a) confusion avec la photo de repli (N−1 affichée à l'Accueil) : la vignette de l'année N−1 doit être la même photo, avec son
  libellé d'année ; (b) supprimer la photo de N−1 fait disparaître le repli à l'Accueil (voulu, à dire dans l'Alert) ; (c) jamais d'écran enseignant
  ni de lecture école (test structurel déjà en place : aucune politique du bucket ne mentionne classes) ; (d) démo : aucune photo (garde `isDemo`).
- **Tests** : règles pures (cible d'écriture par année, refus d'une année étrangère), e2e local (API Storage : remplacement / suppression d'une année
  archivée, autre foyer, enseignants, anonyme, responsable parti : refus), garde de démo, passage sur le Redmi (STAB-2 : zones tactiles des vignettes ≥ 44 dp).

## 2. Étape photo à l'ajout d'une année et à la création d'un enfant (1 j, risque faible)

- **Création d'un enfant** : l'étape photo existe déjà (« Plus tard » ≥ 44 dp). **À vérifier d'abord (0,25 j)** : après `create_child`, la photo doit
  s'écrire sur l'année créée (`academic_years.photo_path`, chemin `<enfant>/<année>.jpg`) et non sur l'ancien modèle ; l'écran doit attendre que la
  liste des enfants (avec l'année) soit rechargée avant d'ouvrir la feuille. Test e2e local « création puis photo » + vérification sur appareil.
- **Ajout d'une année** (`AjouterAnneeScreen`, années « importées » plus anciennes que l'année en cours) : étape facultative « Photo de cette année »,
  jamais obligatoire, jamais bloquante. Écrit sur l'année créée (la politique de stockage l'accepte pour toute année de l'enfant). Si l'année
  ajoutée est N−1 de l'année en cours, sa photo devient le repli de l'Accueil (comportement voulu de la variante A, à dire dans le texte de l'étape).
- **Risques** : allonger un parcours déjà long (une seule ligne, pas d'écran de plus) ; année « importée » sans photo = rien à faire.
- **Tests** : e2e local (création puis photo ; ajout d'année puis photo ; autre foyer refusé), garde de démo.

## 3. Invitation de rentrée (1 j, risque moyen)

- **Quand** : l'année en cours n'a pas de photo ET l'année N−1 en a une (le seul cas où la variante A affiche une photo « périmée »). Une seule fois
  par année et par enfant, par appareil (clé locale `photo.invitation.<enfant>.<année>`) ; jamais deux fois ; ignorable ; jamais bloquante.
  Choix « une fois par responsable » en base : écarté (il faudrait une table et une migration pour une préférence d'affichage).
- **Où** : PAS dans l'en-tête (la géométrie du fondu est testée au pixel par `test:entete` : une ligne de plus décalerait la pilule, +86 dp). Proposition :
  une ligne discrète en tête de « Nouveau dans le carnet » : « Nouvelle photo pour 2026–2027 ? » avec une pilule « Ajouter » (≥ 44 dp) et une croix
  « Plus tard » qui vaut « une fois montrée ». [À VALIDER : l'emplacement.]
- **Dépendance** : le passage d'année serveur (todo BLOQUANT avant la rentrée 2027) crée l'année suivante SANS photo ; sans lui, la situation ne se
  présente qu'à l'ajout manuel d'une année. Testable avec une année simulée (même technique que `test:nom-affiche-demo` : date simulée).
- **Risques** : agacement (règle « une fois »), faux positif si l'enfant n'a aucune photo (alors pas d'invitation : l'étape photo existe déjà ailleurs),
  clé locale perdue à la réinstallation (l'invitation peut revenir une fois : acceptable).
- **Tests** : fonction pure (conditions d'affichage, une seule fois, changement d'enfant, nouvelle année), garde de démo, essai sur appareil avec année simulée.

## 4. Signe d'année passée sur les petits avatars de 34 px (0,5 j, risque faible)

- **Aujourd'hui** : le signe n'est que sur l'avatar de l'en-tête (78 dp) ; sur la top bar et le sélecteur (34 dp), la photo de repli N−1 s'affiche
  SANS signe (risque accepté et écrit dans le plan du 7 oct.).
- **Proposition** : un filet pointillé fin (1,5 dp, `rgba(255,255,255,0.9)`) autour du cercle quand la photo est un repli ; pas de texte (illisible à 34 dp) ;
  `accessibilityLabel` « Photo de 2025–2026 ». Alternative : rien (statu quo). [À VALIDER : le design.]
- **Risques** : lisibilité sur les couleurs d'enfant ; cohérence avec la règle « aucune couleur pour évaluer » (le filet est neutre) ; ne pas confondre avec
  l'indicateur de nouveauté du sélecteur (point) — à vérifier sur appareil.
- **Tests** : rendu pur (le filet n'apparaît que pour un repli), STAB-2 (zone ≥ 44 dp inchangée), capture sur le Redmi.

## 5. M37 : retrait de `children.photo_path` et de l'ancien chemin `avatar.jpg` (risque ÉLEVÉ)

- **Ce que ça fait** (SQL, lot séparé, un cycle Paris dédié) : supprimer `children_photo_path_check` puis la colonne `children.photo_path` ; retirer
  de `child_photo_chemin_autorise` le chemin `<enfant>/avatar.jpg` ; retirer la clause `children` de `photos_orphelines` ; inverse prêt (recrée la
  colonne vide : les références perdues ne se retrouvent qu'avec la sauvegarde d'avant le cycle). Le nettoyage quotidien purge ensuite tout
  `*/avatar.jpg` resté (testé : T6e). Côté app : retirer le repli sur l'ancien modèle (`choisirPhoto`, `cibleEcriture`, `usePhotoUrl`).
- **CONDITIONS PRÉALABLES (toutes, vérifiées en lecture seule avant d'écrire M37)** :
  1. **Plus aucune photo à l'ancien chemin** : `select count(*) from children where photo_path is not null` = 0 ET aucun objet `*/avatar.jpg` dans
     `child-photos` (compté par l'API). Aujourd'hui (8 oct.) : Laia a encore son `avatar.jpg` ; Evan non (il est passé au modèle par année). Laia doit
     avoir sa photo par année (ou la supprimer) AVANT. **Aucune migration automatique** : une photo ne se déplace que par un geste de l'utilisateur.
  2. **Parcours complet** vert en local avec M37 (`test:parcours-complet-local`, e2e photo par année, effacement multi-années, restauration SHA-256,
     audit de sécurité 670/0, suites SQL) + « base sans M37, nouvelle app » et « base avec M37, ancienne app » (ce qui échoue : voir ci-dessous).
  3. **Ancienne app à jour** : aucun appareil ne tourne avec du JavaScript d'avant le 8 oct. (commit `4c57e7a`) contre Paris avec un compte réel.
     Aujourd'hui : un seul client réel (le client de développement de l'utilisateur, JavaScript servi à chaud par Metro) ; les APK « démo » n'ont
     aucun lien avec Paris. **Avant de passer à des utilisateurs réels (TestFlight)** : un numéro de version minimal accepté par l'app, ou M37 seulement
     quand plus aucun build ancien n'existe. [À DÉCIDER avant le premier build pour de vrais utilisateurs.]
  4. Sauvegarde vérifiée juste avant (SHA-256), advisors par nom (0 ERROR, aucun WARN hors liste), stabilité d'au moins une semaine après le lot 1 à 4.
- **Risque d'une ancienne app APRÈS M37** (testé en local par `test:ancienne-app-base-m36-local`, section « ce qui échouerait ») : (a) le dépôt de
  `avatar.jpg` est REFUSÉ par la politique → message « La photo n'a pas pu être enregistrée » (pas de plantage) ; (b) `select *` sur `children` ne
  renvoie plus `photo_path` → l'initiale à la place de la photo (pas de plantage) ; (c) l'écriture `children.photo_path` → colonne inconnue (`PGRST204`) :
  l'ancienne app l'avale en silence (repli prévu en M35) mais le dépôt a déjà échoué en (a), donc aucune fausse confirmation ; (d) les années ne sont
  jamais lues par l'ancienne app : elle n'affiche plus de photo du tout. Conséquence : **plus de photo visible sur un appareil non mis à jour**,
  sans perte de données (les photos par année restent en base).
- **Estimation** : 0,5 j de SQL et de tests + 0,5 j de retrait du repli côté app + un cycle (sauvegarde, essai à blanc, application seule, advisors,
  appel de contrôle) ; à prévoir une session entière.

## 6. Ce qui n'est PAS dans ce plan

Lecture de la photo par l'école (finalité distincte : consentement explicite par année, désactivé par défaut, lisible du seul enseignant validé de la
classe — sprint enseignant, voir todo) ; reconnaissance de visage ; partage de la photo hors du carnet ; envoi à l'assistant (jamais).
