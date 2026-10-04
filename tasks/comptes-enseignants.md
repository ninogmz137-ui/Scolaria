# Comptes enseignants — spécification (sans code) · 4 oct 2026

Statut : **proposition à valider**. Aucun code, aucune migration, aucune table créée. Prépare le sprint enseignant ; ne change rien pour les familles.
Principe directeur (leçon du 4 oct) : **l'interface n'est jamais une frontière de sécurité, seule la base l'est.** Tout ce qui suit est une règle de base de données ; l'écran ne fait que la refléter.

## 1. Constat de départ
- `profiles.role` ∈ parent | enseignant | eleve. `handle_new_user` ignore le rôle demandé (toujours « parent ») ; `protect_profile_role` interdit à tout compte de le changer ; M33 (locale) exige `role = 'enseignant'` pour écrire un mot. **Aucun chemin légitime ne produit un compte enseignant aujourd'hui** (les comptes de test sont posés par SQL).
- L'inscription « Enseignant » est masquée en version réelle (visible en développement et démo, `rolesInscription.ts`). Elle le reste.
- Les accès enseignant aux données d'un enfant passent déjà par un LIEN : classe dont il est titulaire (`classes.enseignant_id`) → `academic_years.classe_id` → enfant (`est_titulaire_enfant`, `is_titulaire_classe`). Sans classe, un enseignant ne voit aucun enfant (testé : audit, T0 « enseignant non rattaché » = 0 accès).

## 2. Parcours cible (validation manuelle par le responsable du projet)
| Étape | Qui | Quoi | Où |
|---|---|---|---|
| 1 | Enseignant | Crée un compte **ordinaire** (parent) avec son adresse **professionnelle** et confirme l'email. Rien d'« enseignant » dans l'inscription. | app, parcours normal |
| 2 | Enseignant | Fait une **demande d'accès enseignant** : formulaire hors app (page web, plus tard) ou email à l'adresse du projet ; v1 = email, saisi par le responsable dans la table de demandes. Données : nom, prénom, email du compte, école (nom, commune, code UAI si connu), niveau / classe, message. | hors app (v1) |
| 3 | Responsable | **Vérifie** : l'école existe (annuaire de l'Éducation nationale), l'email est professionnel (académique), la personne est joignable (appel ou réponse à un email depuis l'adresse de l'école), pas d'homonyme. Note la vérification. | humain |
| 4 | Responsable | Exécute **lui-même** la fonction `valider_enseignant` (section 4) dans l'éditeur SQL de Paris : statut « validé », rôle « enseignant ». | serveur |
| 5 | Enseignant | Se connecte : écran « Compte validé — rattachez votre classe ». **Aucun enfant visible.** | app |
| 6 | Enseignant | Se rattache à une classe par un **code de classe** (section 5). Alors seulement, les enfants de cette classe deviennent accessibles (par les liens existants). | app + base |

Statuts d'un compte enseignant (`enseignants.statut`) : **en_attente** (demande reçue, rôle encore « parent ») → **valide** (rôle « enseignant ») → **suspendu** (rôle repassé « parent », accès coupé aussitôt) ; **refuse** (demande close, motif noté). En « en_attente » le compte voit un écran « Demande en cours de vérification » (lecture de SA ligne seulement) et rien d'autre de plus qu'un parent sans enfant.

## 3. Aucun accès avant validation ET rattachement
Règle : **accès aux données d'un enfant = rôle `enseignant` + statut `valide` + titulaire d'une classe + enfant dans cette classe.** Quatre verrous cumulatifs, tous en base :
1. `est_enseignant()` (M33) = `profiles.role = 'enseignant'` ; ne devient vrai que par `valider_enseignant`.
2. Nouveau `est_enseignant_valide()` = rôle ET `enseignants.statut = 'valide'` : à ajouter aux politiques d'écriture et de lecture enseignant (mots, signatures lues, fils, compétences « école », appréciations, publications de classe) pour qu'une suspension coupe tout, y compris sur une session ouverte.
3. Lien classe ↔ enseignant (`classes.enseignant_id`) : posé uniquement par le rattachement par code, jamais par le client.
4. Lien enfant ↔ classe (`academic_years.classe_id`) : déjà verrouillé (M18).
Tests de non-accès (à écrire, sur le modèle de `audit-securite-local.mts`) : compte en_attente, valide sans classe, suspendu, refusé, parent d'un autre foyer → 0 ligne, 0 écriture, sur toutes les tables d'enfants et le stockage.

## 4. Fonction réservée au serveur
- `valider_enseignant(p_user_id uuid, p_ecole text, p_note text)` : `SECURITY DEFINER`, `EXECUTE` accordé **au seul service** (révoqué de PUBLIC, anon, authenticated). L'app ne peut pas l'appeler, même avec un jeton valide ; elle n'existe pas côté client. Exécutée **par le responsable** dans l'éditeur SQL (rôle postgres) — pas d'Edge Function, pas de bouton, pas de clé à poser.
- Effets, en une transaction : `enseignants.statut = 'valide'`, date et note de vérification ; `profiles.role = 'enseignant'` (le déclencheur `protect_profile_role` laisse passer le serveur) ; journal d'audit (qui a validé quand, jamais de donnée d'enfant).
- Refuse si : compte inexistant, email non confirmé, déjà validé, demande absente. Fonction sœur `suspendre_enseignant(p_user_id, p_motif)` : rôle → « parent », statut « suspendu », codes de classe actifs de la personne révoqués.
- Pas d'auto-validation : aucune politique n'autorise un compte à modifier `enseignants.statut` (aucune politique UPDATE ; INSERT de sa propre demande en `en_attente` seulement, une demande ouverte à la fois).

## 5. Rattachement par code de classe (à valider)
Deux codes distincts, pour ne pas mélanger les droits :
- **Code de classe — enseignant** : le responsable crée la classe (école, année, niveau, nom) ET son code, à usage unique, valable 14 jours, remis à l'enseignant validé. L'enseignant le saisit (fonction `rattacher_classe(code)`, réservée aux comptes `est_enseignant_valide()`) : la classe prend `enseignant_id = lui` ; le code est consommé. Limite : 5 essais ratés par compte et par heure, puis blocage (anti-devinette). Un code est stocké **haché** (jamais en clair en base) ; il est affiché une seule fois au responsable.
- **Code de classe — familles** : l'enseignant rattaché obtient (fonction `code_famille(classe)`) un code révocable pour SA classe, qu'il donne aux familles ; un parent responsable de l'enfant le saisit (`rattacher_enfant_a_classe(enfant, code)`) : `academic_years.classe_id` de l'année active de l'enfant, jamais d'une année archivée. Révocable, renouvelable ; même limite d'essais. Remplace la pose serveur actuelle sans changer le verrou M18 (la fonction DEFINER est le seul chemin).
- Un enseignant peut avoir plusieurs classes (même école) ; un enfant n'a qu'une classe active par année.
Question ouverte : le code « famille » est-il nécessaire pour la phase pilote (le responsable peut continuer à rattacher à la main) ?

## 6. Tables, droits (esquisse)
| Table | Contenu | Lecture | Écriture |
|---|---|---|---|
| `enseignants` | user_id (clé, → profiles), statut, ecole, ecole_uai, message, verifie_le, verifie_note, created_at | le compte pour SA ligne | INSERT de sa propre demande en_attente ; **aucun UPDATE / DELETE** par l'app ; le serveur gère le statut |
| `codes_classe` | classe_id, type (enseignant / famille), code_hash, expire_le, utilise_le, revoque_le, essais | **personne côté app** (RLS sans politique) | fonctions DEFINER seulement |
| `journal_enseignants` | qui / quand / action (validé, suspendu, code consommé), sans donnée d'enfant | personne côté app | serveur |
Droits : aucun droit de table pour `anon` ; `authenticated` limité à ce qui précède (M32 : aucun TRUNCATE / TRIGGER / REFERENCES). Toutes les fonctions : `search_path` fixé, `EXECUTE` explicite.
RGPD : la demande contient l'identité professionnelle de l'enseignant (donnée personnelle de l'enseignant) : minimisation, durée de conservation (suppression 12 mois après refus ; effacement du compte enseignant à prévoir, point ouvert du todo), mention dans la politique de confidentialité (D5).

## 7. Tests à écrire (au sprint enseignant)
SQL (modèle des suites existantes, base locale) : un compte ordinaire ne peut ni se donner le rôle, ni écrire `enseignants.statut`, ni appeler `valider_enseignant` / `suspendre_enseignant` / `rattacher_classe` (non validé) ; validation → rôle + statut ; suspension → accès coupé immédiatement (même jeton) ; code erroné ×5 → blocage ; code expiré / déjà consommé / révoqué refusés ; code hâché illisible ; enseignant valide sans classe = 0 enfant ; enseignant d'une AUTRE classe = 0 ; rattachement famille limité à l'année active ; journal sans donnée d'enfant. Audit de sécurité refait avec ces nouveaux acteurs ; parcours complet étendu (demande → validation manuelle → rattachement → mot → signature).
Interface : l'inscription enseignant reste absente en version réelle (test existant `test:roles-inscription`) ; écran « demande en cours » ; le rôle affiché vient de `profiles.role` (`test:role-profil`).

## 8. Reporté
- **Invitation d'un enseignant par un directeur d'école** et interface directeur (Phase 3 : « Interface directeur d'école »).
- Création de classe par l'enseignant lui-même, import de listes d'élèves, ÉduConnect (V2, jamais obligatoire), validation automatique par domaine académique, double authentification obligatoire pour les comptes enseignants.
- Effacement d'un compte enseignant dans l'app (point ouvert).

## 9. Questions pour toi
1. Où l'enseignant dépose-t-il sa demande en v1 : email au projet (simple) ou page web de demande (plus de travail, plus propre) ?
2. Les deux codes (enseignant puis familles) dès le pilote, ou seulement le code enseignant (les familles rattachées à la main) ?
3. Durée de vie du code enseignant (14 jours proposés) et nombre d'essais (5 par heure proposés).
4. Un enseignant suspendu garde-t-il ses mots déjà envoyés dans les carnets des familles ? (proposition : oui, ils font partie du carnet ; seul l'accès futur est coupé.)
