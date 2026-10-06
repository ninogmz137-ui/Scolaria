# Plan — lot « photo par année scolaire » (M36) — SANS CODE, pour validation

*6 octobre 2026. Règle du lot : une photo par enfant ET par année scolaire ; remplaçable et supprimable à tout moment (même sur une
année archivée) ; jamais obligatoire ; aucun verrouillage ; aucune visibilité pour l'école dans ce lot. Rien n'est écrit : ce document
décrit ce que M36 changerait par rapport à M35 (appliquée à Paris le 6 oct, 2 photos de test : Laia, Evan).*

## 1. Modèle de données

| | M35 (aujourd'hui) | M36 (proposé) |
|---|---|---|
| Où est la référence | `children.photo_path` | `academic_years.photo_path` (une ligne par enfant et par année : déjà le bon grain) |
| Chemin de l'objet | `<enfant>/avatar.jpg` | `<enfant>/<année>.jpg` — `<année>` = **identifiant** de l'année (uuid), pas le millésime : stable si le libellé est corrigé, et l'unicité du millésime par enfant est déjà garantie par ailleurs |
| Contrainte | `photo_path = id \|\| '/avatar.jpg'` | `photo_path IS NULL OR photo_path = student_id \|\| '/' \|\| id \|\| '.jpg'` |
| Droit d'écriture de la colonne | policy `children_update` (responsable) | policy `academic_years_update` (responsable) ; les verrous M17 / M18 / M19 ne portent que sur le découpage, l'échelle, le rattachement et le statut : **ils ne bloquent pas `photo_path`, y compris sur une année archivée** (à prouver par un test M36) |
| Date de cache | `children.updated_at` | `academic_years.updated_at` (existe, déclencheur `upd_academic_years_updated_at`) |

## 2. Stockage (bucket `child-photos`, inchangé : privé, JPEG, 1 Mo)

- **Politiques** (4, remplacées) : le chemin doit valoir `^<uuid>/<uuid>\.jpg$`, l'année doit exister, appartenir à l'enfant du chemin
  (`academic_years.id = <année> AND student_id = <enfant>`) et l'appelant doit être responsable de l'enfant (`is_responsable`). Fonction
  d'aide `child_photo_chemin_autorise` réécrite (toujours SECURITY INVOKER : lecture de `academic_years` sous RLS, qui l'autorise aux
  responsables). Dépôt : `owner_id = (select auth.uid())::text`, comme aujourd'hui.
- **Transition (expand / contract)** : pendant M36 la fonction accepte AUSSI l'ancien chemin `<enfant>/avatar.jpg` ; M37 (plus tard)
  retire l'ancien chemin et `children.photo_path`. Aucun trou d'accès entre les deux.
- **`photos_a_effacer(demande)`** : inchangée (préfixe = enfant effacé ⇒ toutes ses photos d'années, anciennes comprises).
- **`photos_orphelines(âge)`** : `NOT EXISTS` sur `children.photo_path` **et** sur `academic_years.photo_path` (la règle de l'âge = dernière
  écriture, `GREATEST(created_at, updated_at)`, reste). Conséquence utile : une fois `children.photo_path` remis à NULL, les anciens
  `avatar.jpg` deviennent orphelins et sont **purgés automatiquement** par le nettoyage quotidien (plus d'un jour).

## 3. Les 2 photos de test de Paris et le sort de `children.photo_path`

- **Recommandé** : les deux photos de test sont ajoutées de nouveau par leurs responsables sur l'année active (2 gestes, rien à migrer).
  Ensuite M37 met `children.photo_path` à NULL puis supprime la colonne ; les `avatar.jpg` sont purgés par les orphelins.
- Alternative sans nouveau geste : script d'exploitation à usage unique (API Storage `move` vers `<enfant>/<année active>.jpg` + écriture de
  `academic_years.photo_path`), à lancer par l'utilisateur ; plus fragile, inutile pour 2 photos de test.
- Tant que M37 n'est pas passée, l'app lit `academic_years.photo_path` d'abord, `children.photo_path` en repli (jamais l'inverse).

## 4. Application

- **Lecture** : la requête des enfants joint l'année ACTIVE de chacun (`academic_years` `statut = 'active'`) ; `Child.photoPath` /
  `photoUpdatedAt` viennent de cette année. Top bar, sélecteur d'enfant, Famille & paramètres, en-tête de l'Accueil : la photo de
  l'année active (ou le repli A / B ci-dessous).
- **Écriture** : `setChildPhoto(childId, anneeId, chemin | null)` ; feuille de photo paramétrée par année ; envoi `upsert` sur
  `<enfant>/<année>.jpg` (remplacement direct, déjà éprouvé sur appareil) ; suppression = colonne NULL d'abord, objet ensuite (inchangé).
- **Cache** : clé = chemin + `updated_at` de l'année (le chemin contient déjà l'enfant et l'année : aucune fuite d'une année ou d'un enfant à l'autre).
- **Écrans touchés** : Accueil (en-tête + badge), top bar et sélecteur (avatar), Famille & paramètres (avatar), Profil enfant (ligne « Photo » :
  année active), **Mon parcours** (une photo par année, remplaçable et supprimable sur chaque année, archivées comprises), création d'un
  enfant (l'étape photo vise l'année créée par `create_child`), ajout d'une année (`AjouterAnneeScreen` : étape photo facultative).
- **Export .zip** : `fichiers/photos/<millésime>.jpg` pour chaque année, `photo_dans_archive` dans la ligne de chaque année de `donnees.json`
  (aujourd'hui : une seule photo dans la ligne de l'enfant).
- **Sauvegarde / vérification / restauration** : aucun changement de code (le bucket entier est copié, comptes par bucket, SHA-256) ; seul le
  nombre de fichiers augmente (jusqu'à une photo par enfant et par année, ~30 à 60 Ko chacune).
- **Effacement (enfant, compte)** : inchangé et déjà couvert ; test de bout en bout à étendre à plusieurs années.
- **Politique de confidentialité** : « une photo par année scolaire, toutes conservées tant que le carnet existe, supprimables une à une,
  supprimées avec l'enfant, incluses dans l'export et les sauvegardes ».

## 5. Année en cours sans photo — deux variantes

| | **A — photo la plus récente d'une année précédente + invitation discrète** | **B — initiale seule** |
|---|---|---|
| Ce que voit le responsable | la photo de l'année précédente la plus récente, en en-tête, avec un lien discret « Nouvelle photo pour 2027–2028 ? » **une fois par année** | l'initiale sur la couleur de l'enfant, comme un enfant sans photo |
| Qui la voit | **responsables seulement** (même public qu'aujourd'hui) ; aucun nouveau flux de données | idem |
| Effort | ~1,5 j : requête « dernière année avec photo » (+1 requête ou jointure), URL signée de l'ancienne photo, mémorisation « invitation déjà montrée » (par appareil, `AsyncStorage` `photo.invitation.<enfant>.<année>`, ou en base si on veut « une fois par responsable »), texte, 6 tests (aucune photo, ancienne photo, invitation montrée une seule fois, nouvelle année, changement d'enfant, réseau coupé) | ~0,25 j : rien à construire |
| Nouveaux états / risques | photo « périmée » affichée comme si elle était d'aujourd'hui (enfant qui grandit) ; il faut un signe discret (pas de date sur l'avatar, mais la ligne du profil dit « photo de 2026–2027 ») ; l'invitation peut agacer si elle revient (règle : une fois, jamais deux) ; plus de cas à tester | à chaque rentrée (passage d'année serveur, BLOQUANT avant la rentrée 2027) **toutes** les photos « disparaissent » en même temps : frottement répété pour tous, même si les anciennes restent dans Mon parcours |
| Cohérence avec « jamais obligatoire » | oui (invitation unique, ignorable) | oui |
| Recommandation | **A**, si le frottement de la rentrée compte ; la donnée ne sort pas du cercle des responsables | **B** pour livrer M36 vite ; A reste ajoutable ensuite sans migration |

## 6. Risques

1. **Verrous d'année** (M17 / M18 / M19) : à prouver qu'ils laissent passer `photo_path` sur une année archivée et sur une année rattachée à une classe.
2. **Politique de stockage plus riche** (jointure `academic_years`) : coût négligeable (clé primaire), mais à rejouer dans toute la batterie RLS (autre foyer, enseignant, anonyme, parti, enfant en cours d'effacement).
3. **Une seule migration par cycle** : M36 (ajout de la colonne, politiques en double chemin, orphelins) puis, plus tard, M37 (retrait de `children.photo_path` et de l'ancien chemin). Chaque cycle : sauvegarde vérifiée, essai à blanc, application seule, advisors par nom (aucun `WARN` attendu : fonctions du service seules).
4. **App et base** : l'app doit lire les deux colonnes pendant la transition ; déploiement app d'abord (repli), M36 ensuite, ou l'inverse sans risque grâce au double chemin.
5. **Passage d'année serveur** (todo BLOQUANT avant la rentrée 2027) : il crée l'année suivante SANS photo (`photo_path` NULL) — c'est ce qui rend la variante A utile.
6. **Années « importées »** (anciennes années recopiées) : elles peuvent aussi avoir une photo (même règle, pas de cas particulier).
7. **Volume** : un enfant peut avoir jusqu'à ~15 photos (maternelle à terminale) ; négligeable pour le stockage (1 Go du plan gratuit) mais la liste « Mon parcours » doit charger les URL signées à la demande, pas toutes d'un coup.

## 7. Pour le sprint enseignant (todo, hors de ce lot)

- Photo visible de l'école = **finalité distincte** : **consentement explicite PAR ANNÉE**, **désactivé par défaut**, lisible **seulement par
  l'enseignant validé de la classe** de l'année concernée (lien `academic_years.classe_id` → `classes.enseignant_id`), révocable à tout moment ;
  aucune lecture élargie dans le lot photo par année.

## 8. Ce qui est demandé pour avancer

Ton choix **A ou B**, ta validation du chemin `<enfant>/<année-id>.jpg`, et ton accord pour le plan en deux migrations (M36 puis M37).
