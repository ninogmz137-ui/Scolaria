# Plan — lot « photo par année scolaire » (M36) — SANS CODE, VARIANTE A VALIDÉE (7 oct. 2026)

*6 oct. 2026, mis à jour le 7 oct. Règle du lot : une photo par enfant ET par année scolaire ; remplaçable et supprimable à tout moment
(même sur une année archivée) ; jamais obligatoire ; aucun verrouillage ; aucune visibilité pour l'école. Rien n'est écrit : ce document
décrit ce que M36 changerait par rapport à M35 (appliquée à Paris le 6 oct, 2 photos de test : Laia, Evan). **Variante A validée, aux
trois conditions du § 5 ; M36 n'est PAS écrite : elle attend le « go » de l'utilisateur.***

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
- **`photos_a_effacer(demande)`** : fonction inchangée (préfixe = enfant effacé ⇒ toutes ses photos d'années, anciennes comprises), **mais
  cela reste une affirmation tant qu'un test ne l'a pas prouvé** : voir § 4 bis (effacement et restauration, tests obligatoires).
- **`photos_orphelines(âge)`** : `NOT EXISTS` sur `children.photo_path` **et** sur `academic_years.photo_path` (la règle de l'âge = dernière
  écriture, `GREATEST(created_at, updated_at)`, reste). Conséquence utile : une fois `children.photo_path` remis à NULL, les anciens
  `avatar.jpg` deviennent orphelins et sont **purgés automatiquement** par le nettoyage quotidien (plus d'un jour).

## 3. Les 2 photos de test de Paris et le sort de `children.photo_path`

- **Décidé** : les deux photos de test (Laia, Evan) sont **supprimées par l'utilisateur depuis l'app AVANT M36** (le geste « Supprimer la
  photo » existe et est éprouvé sur appareil : colonne à NULL d'abord, objet ensuite). Avant tout cycle M36, contrôle en lecture seule
  que `children.photo_path` est NULL pour tous les enfants et que `child-photos` ne contient plus d'objet : sinon, on ne passe pas à M36.
  Rien à migrer, aucun script de déplacement.
- **M37 est un lot SÉPARÉ** (retrait de `children.photo_path`, de sa contrainte et de l'ancien chemin `<enfant>/avatar.jpg` dans la fonction
  d'aide des politiques) : **seulement après** que M36 est appliquée à Paris ET que le parcours complet de M36 passe ET que les anciens
  `avatar.jpg` sont nettoyés (contrôle : aucun objet `*/avatar.jpg` dans `child-photos`, mesuré par l'API Storage ; le nettoyage des orphelins
  les purge dès que `children.photo_path` est NULL). Même cycle qu'une migration ordinaire (sauvegarde vérifiée, essai à blanc, application
  seule, advisors par nom, inverse prêt).
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
- **Sauvegarde / vérification / restauration** : le code copie le bucket entier (comptes par bucket, SHA-256) et n'a a priori pas à changer ;
  le nombre de fichiers augmente (jusqu'à une photo par enfant et par année, ~30 à 60 Ko chacune). **À prouver, pas à affirmer** : § 4 bis.
- **Effacement (enfant, compte)** : **à prouver par un test sur plusieurs années** : § 4 bis.
- **Politique de confidentialité** : « une photo par année scolaire, toutes conservées tant que le carnet existe, supprimables une à une,
  supprimées avec l'enfant, incluses dans l'export et les sauvegardes ».

## 4 bis. Tests obligatoires de M36 (aucune phrase « ne change pas » sans l'un d'eux)

- **a. Effacement multi-années** (bout en bout, local, comme `test-effacement-local.mts`) : un enfant avec 3 années, une photo par année
  (chemins `<enfant>/<année>.jpg`, objets réels via l'API Storage) ; demande d'effacement puis exécution de `executer-effacements` ⇒ **les
  3 objets sont supprimés** (comptés avant / après par l'API Storage, pas par SQL), `academic_years` et l'enfant effacés ; la photo d'un
  autre enfant du même foyer et celle d'un autre foyer restent. Cas ajouté : un enfant avec une ancienne photo `avatar.jpg` (transition) ET
  des photos d'années ⇒ tout part.
- **a'. Sauvegarde puis restauration** (`sauvegarde-semaine` + `verifier-sauvegarde` + `restaurer-sauvegarde`, local, puis `db reset --local`) :
  l'enfant à 3 photos est sauvegardé ; le nombre d'objets de `child-photos` dans la sauvegarde = celui du bucket (comptes + SHA-256) ;
  après suppression locale puis restauration, **les 3 photos sont retrouvées** aux mêmes chemins, avec le même SHA-256, et
  `academic_years.photo_path` pointe vers elles.
- **b. Verrous d'année** : `photo_path` modifiable sur une année archivée et sur une année rattachée à une classe (M17 / M18 / M19 ne le
  bloquent pas) ; contrainte de chemin refuse tout autre chemin (autre enfant, autre année, millésime au lieu de l'uuid).
- **c. RLS** (toute la batterie de M35 rejouée) : autre foyer, anonyme, responsable parti, enfant en cours d'effacement ; l'année doit
  appartenir à l'enfant du chemin (chemin `<enfant A>/<année de B>.jpg` refusé même pour un responsable de A).
- **d. L'enseignant ne lit JAMAIS une photo d'année précédente, même sans partage** : (1) test fonctionnel : un enseignant dont la classe est
  rattachée à l'année ACTIVE de l'élève et un enseignant dont la classe l'était pour une année ARCHIVÉE reçoivent un refus (API Storage :
  `createSignedUrl` et `download` sur l'objet de l'année archivée, de l'année active et de l'ancien `avatar.jpg`) ; (2) test structurel : aucune
  politique de `storage.objects` pour `child-photos` ne mentionne `classes`, `enseignant_id` ni `classe_id` (ce test casse dès que quelqu'un
  élargit la lecture à l'école, ce qui force à relire cette règle) ; (3) l'URL signée de l'ancienne photo n'est demandée par l'app que pour un
  responsable (jamais depuis un écran enseignant).
- **c bis. Non-fuite : responsable détaché, enfant en cours d'effacement** (ajouté le 7 oct., plan « accepté tel quel ») : pour un enfant ayant
  3 années et une photo par année, (1) un responsable DÉTACHÉ du carnet (`quitter_carnet`, ou jamais rattaché) : aucune photo d'AUCUNE année n'est
  lisible, ni par `createSignedUrl` ni par `download` (API Storage), ni la colonne `academic_years.photo_path` par la requête de l'app ; (2) un
  enfant EN COURS D'EFFACEMENT (demande enregistrée, non exécutée) : idem pour tous ses responsables ; (3) **le repli de la variante A compris** :
  la requête « année précédente » de l'app, exécutée par ce responsable détaché, ne renvoie ni chemin ni URL signée (l'ancienne photo ne se
  lit jamais par le seul fait d'avoir déjà été rattaché) ; (4) le second responsable, resté rattaché, continue de tout lire (témoin positif).
- **e. Variante A** : voir § 5 (6 cas + 2 : repli limité à l'année précédente, signe discret).

## 5. Année en cours sans photo — VARIANTE A VALIDÉE

**Conditions de la validation (7 oct.)**

1. **Repli d'UNE année précédente seulement** : si l'année active n'a pas de photo, l'app regarde l'année **immédiatement précédente**
   (celle qui la précède dans le temps pour cet enfant) et, si elle a une photo, l'affiche ; sinon, initiale. **Jamais de remontée plus
   loin** : pas de « dernière photo trouvée sur 5 ans ». [UNCLEAR] « une année précédente » pris au sens strict (N−1) ; si l'utilisateur
   préfère « la plus récente année précédente qui a une photo », c'est une requête de plus et un choix différent, à dire avant le code.
2. **Signe discret** : dès que l'image affichée vient d'une année passée, une pastille d'année (« 2026–27 », texte 11 px, `rgba(15,23,42,0.55)`
   sur fond neutre) est posée sur l'avatar de l'en-tête de l'Accueil, et la ligne « Photo » du profil dit « Photo de 2026–2027 · Ajouter la
   photo de cette année ». Le signe disparaît dès qu'une photo existe pour l'année active. Aucun signe sur les avatars de 34 px (top bar,
   sélecteur) : trop petits ; la photo de repli y est la même que dans l'en-tête, sans signe, risque accepté et dit ici.
3. **Aucune lecture par l'école d'une photo d'année précédente, jamais** : la politique de lecture de `child-photos` reste réservée aux
   responsables ; l'URL signée de l'ancienne photo n'est demandée que depuis un écran parent ; test d (§ 4 bis). Quand le sprint enseignant
   ouvrira la lecture (consentement par année, § 7), l'ancienne année restera hors champ : le consentement vaut pour UNE année et la
   politique ne lira que la photo de l'année active de la classe.

**Comparatif d'origine (conservé)**

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

Reçu : variante A et ses trois conditions. **Reste** : le « go M36 » (rien n'est écrit), la validation du chemin `<enfant>/<année-id>.jpg`
et de l'ordre M36 puis M37 (lot séparé), et la suppression des deux photos de test par toi depuis l'app (§ 3).

## 9. Liste de tâches de M36 (NON démarrée — attend le « go »)

1. Prérequis lecture seule sur Paris : `children.photo_path` NULL partout et `child-photos` vide (les 2 photos de test supprimées par l'utilisateur).
2. Écrire `supabase/migrations/<ts>_m36_photo_par_annee.sql` : colonne `academic_years.photo_path` + contrainte de chemin `student_id/id.jpg`.
3. Réécrire `child_photo_chemin_autorise` (double chemin : année de l'enfant + `avatar.jpg` de transition) et les 4 politiques de `storage.objects`.
4. Réécrire `photos_orphelines` (NOT EXISTS sur `children.photo_path` ET `academic_years.photo_path`, âge = dernière écriture) ; `photos_a_effacer` inchangée.
5. Écrire l'inverse `migrations_down/<ts>_m36_photo_par_annee_down.sql` (ordre inverse, aucune photo perdue sans avertissement).
6. Écrire `supabase/tests/m36_photo_par_annee.sql` : verrous M17 / M18 / M19, contrainte de chemin, politiques, batterie RLS de M35 rejouée, test structurel d (2).
7. Écrire le test de bout en bout `scripts/test-photo-annee-local.mts` : API Storage, enseignant jamais (d), effacement multi-années (a), photo d'une autre année refusée.
8. Étendre le test de sauvegarde / restauration à 3 photos par enfant (a') puis `db reset --local`.
9. Application : requête enfant + année active, repli N−1 (variante A), signe d'année, invitation unique par année, feuille de photo paramétrée par année.
10. Application : Mon parcours (une photo par année), création d'enfant, ajout d'année, export zip `fichiers/photos/<millésime>.jpg`, cache.
11. Documents : CLAUDE.md (§ RGPD photo), COMPONENTS.md, politique de confidentialité, todo, lessons.
12. Cycle Paris (un seul, sur « go Paris ») : sauvegarde vérifiée, essai à blanc ne listant que M36, application seule, advisors par nom, contrôle ; M37 ensuite, lot séparé.
