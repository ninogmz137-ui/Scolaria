> **BROUILLON À FAIRE RELIRE PAR UN JURISTE — SANS VALEUR.** Ne pas publier en l'état. Rédigé le 4 oct 2026 d'après le code, la base et
> `tasks/politique-confidentialite-regles.md`. Règle : seulement ce qui est vrai aujourd'hui ; tout ce qui n'est pas prouvé depuis le code ou la base
> est marqué **[À VÉRIFIER]**. Variables à remplacer à la publication : `{NOM_APP}`, `{EDITEUR}`, `{CONTACT}` (aucun nom en dur : le nom définitif n'est pas arrêté).

# Politique de confidentialité de {NOM_APP}

*Version du [date de publication] — {NOM_APP} est édité par {EDITEUR}. Contact pour toute question sur vos données : {CONTACT}.*

## 1. En bref
- {NOM_APP} est un carnet de scolarité numérique : il appartient à la famille, pas à l'établissement.
- Les données du carnet sont hébergées dans l'Union européenne, à Paris.
- Aucune publicité, aucune revente de données, aucun profilage publicitaire.
- Vous pouvez exporter le carnet d'un enfant et demander son effacement depuis l'application.

## 2. Qui est responsable de vos données
{EDITEUR} est responsable du traitement des données collectées par {NOM_APP}. **[À VÉRIFIER : statut juridique de l'éditeur, adresse, existence ou non d'un délégué à la protection des données.]**
Pour les carnets d'enfants, les responsables légaux qui les renseignent agissent pour le compte de l'enfant.

## 3. Quelles données sont collectées
Uniquement ce que vous ou l'établissement saisissez, ou ce qui est nécessaire pour faire fonctionner l'application.

**Votre compte** : adresse e-mail, mot de passe (stocké par le service d'authentification, jamais lisible par {EDITEUR}) **[À VÉRIFIER : méthode de hachage, propre à Supabase]**, prénom, nom, rôle (parent, enseignant, élève), langue, numéro de téléphone s'il est renseigné **[À VÉRIFIER : l'application demande-t-elle réellement le téléphone ?]**, photo de profil si elle est ajoutée **[À VÉRIFIER : fonction effectivement proposée]**.

**Le carnet de chaque enfant** : prénom, nom, date de naissance ou âge, classe, établissement, couleur et avatar choisis, années scolaires et niveau ; compétences et observations (avec leur source : enseignant ou famille) ; mots de liaison, signatures et réponses des responsables ; absences déclarées ou signalées ; événements d'agenda ; messages avec les enseignants ; éléments ajoutés par la famille (photos, documents PDF, jalons, souvenirs), avec leur visibilité (« foyer » ou « privé »).

**Aria, l'assistant** : vos messages à Aria et les réponses, conservés dans votre compte pour que vous retrouviez l'historique ; le prénom et le niveau scolaire de l'enfant sont joints à chaque demande (voir § 5).

**Alertes d'urgence** : si un message à Aria contient des mots signalant une détresse, l'application affiche des numéros d'aide et enregistre seulement la catégorie de l'alerte, l'enfant concerné et la date. **Le texte du message n'est ni conservé ni transmis.** Cette alerte n'est visible que de la personne qui l'a déclenchée.

**Invitations** : l'adresse e-mail de la personne invitée comme second responsable, le prénom de l'invitant et celui de l'enfant, pour envoyer l'invitation et en suivre l'état.

**Données techniques** : l'application interroge un service de mises à jour (voir § 5). **[À VÉRIFIER : données exactes reçues par ce service (adresse IP, version, modèle d'appareil).]** Les journaux des fonctions serveur ne contiennent ni adresse e-mail ni contenu de message **[À VÉRIFIER : à re-contrôler fonction par fonction avant publication ; vrai du code actuel des trois fonctions]**.

**Ce que {NOM_APP} ne fait pas** : pas de pistage publicitaire, pas de mesure d'audience par un tiers **[À VÉRIFIER : aucune bibliothèque d'analyse n'est déclarée dans package.json au 4 oct 2026 ; à re-contrôler au moment de publier]**, aucune connexion aux espaces numériques de travail des établissements (Pronote, EcoleDirecte, etc.) : seul l'import manuel de vos propres documents est possible.

## 4. Pourquoi (finalités) et sur quelle base
| Finalité | Base légale |
|---|---|
| Tenir le carnet, afficher mots, compétences, agenda, messages | Exécution du service demandé par l'utilisateur **[À VÉRIFIER : qualification par le juriste]** |
| Sécuriser les comptes, prévenir les abus (limite d'usage d'Aria) | Intérêt légitime **[À VÉRIFIER]** |
| Répondre aux demandes d'exercice de droits, effacement différé | Obligation légale **[À VÉRIFIER]** |
| Aria (traitement par un modèle d'IA) | Consentement : l'utilisateur choisit d'écrire à Aria **[À VÉRIFIER : recueil et information préalable dans l'application]** |
Les données de mineurs : le carnet d'un enfant est renseigné par ses responsables légaux. **[À VÉRIFIER : conditions d'accès des élèves de collège et lycée avec compte propre — fonction « Phase 2 », non disponible aujourd'hui ; âge minimal.]**

## 5. Qui reçoit vos données (sous-traitants)
| Prestataire | Rôle | Données concernées | Localisation |
|---|---|---|---|
| **Supabase** (base de données, authentification, stockage des fichiers, fonctions serveur) | Hébergement du carnet | Toutes les données du § 3 | Projet hébergé à Paris (région eu-west-3) **[À VÉRIFIER : hébergeur d'infrastructure sous-jacent (Amazon Web Services) et existence d'un accord de traitement signé]** |
| **Anthropic** (modèle d'IA d'Aria) | Réponses d'Aria | Uniquement vos messages à Aria, l'historique de la conversation, le prénom et le niveau scolaire de l'enfant | États-Unis / hors Union européenne |
| **Expo / EAS** | Fabrication de l'application et envoi de ses mises à jour | Le code de l'application ; pas le contenu des carnets. Le service de mises à jour reçoit la requête de l'application **[À VÉRIFIER : détail des données]** | **[À VÉRIFIER]** |
| **Brevo** (envoi d'e-mails d'invitation) | Envoi de l'e-mail d'invitation à un second responsable | Adresse de l'invité, prénom de l'invitant et de l'enfant, texte de l'invitation | **[À VÉRIFIER : service ACTIVÉ ou non — les clés d'envoi n'étaient pas configurées au 4 oct 2026 (« e-mail non configuré ») ; si non activé, retirer cette ligne]** |
| Apple et Google | Distribution de l'application ; routage des notifications système | **[À VÉRIFIER : les notifications actuelles sont programmées sur l'appareil (aucun envoi par serveur) ; à reconfirmer]** | **[À VÉRIFIER]** |

**Formulation validée (25 sept 2026), à reprendre telle quelle :**
> Les données du carnet de votre enfant sont hébergées dans l'Union européenne, à Paris. Aria s'appuie sur un modèle d'Anthropic, société américaine. Quand vous utilisez Aria, vos messages, l'historique de la conversation, le prénom et le niveau scolaire de l'enfant sont traités hors de l'Union européenne. Anthropic les efface sous 30 jours, sauf s'ils sont signalés pour non-respect de ses règles d'utilisation (conservation jusqu'à 2 ans). Ils ne servent jamais à entraîner le modèle. Aria ne reçoit rien d'autre du carnet. En cas de message de détresse, rien n'est envoyé à Aria.

Les données sont chiffrées au repos (AES-256) et en transit (TLS), selon la documentation publique de Supabase (supabase.com/security, consultée le 25 sept 2026). **[À VÉRIFIER : à re-lire à la date de publication ; c'est une garantie du prestataire, pas une mesure propre à {NOM_APP}.]**

## 6. Combien de temps vos données sont conservées
- **Tant que le compte existe** : les données du carnet restent disponibles.
- **Effacement** : voir § 7 (30 jours après la demande, annulable).
- **Invitations** : valables 7 jours ; au-delà, l'invitation expirée n'est plus affichée à l'invité après 30 jours.
- **Alertes d'urgence** : conservées jusqu'à l'effacement du carnet concerné ou du compte de leur auteur **[À VÉRIFIER : durée maximale à fixer ; aucune durée automatique n'est codée]**.
- **Journal d'effacement** : un registre technique garde la date de la demande et de l'exécution, sans nom ni adresse **[À VÉRIFIER : durée de conservation du registre non fixée]**.
- **Aria / Anthropic** : voir la formulation validée au § 5.

### 6 bis. Sauvegardes
Pour pouvoir restaurer le service en cas de panne ou d'erreur, {EDITEUR} réalise des **sauvegardes** de la base de {NOM_APP}.
- **Contenu** : une copie complète des données de l'application — comptes (adresses e-mail, mots de passe sous forme hachée, rôles), carnets des enfants, mots, signatures, messages, ajouts, conversations avec Aria, demandes d'effacement — **et** de tous les fichiers du carnet (photos, documents).
- **Fréquence et durée** : une sauvegarde **chaque semaine**, les **8 dernières** seulement (donc environ **8 semaines glissantes**) ; la plus ancienne est supprimée après chaque nouvelle sauvegarde réussie. S'y ajoutent des sauvegardes exceptionnelles réalisées juste **avant une modification de la base** : **[À VÉRIFIER : aucune règle de suppression automatique n'existe pour celles-ci au 4 oct 2026 ; {EDITEUR} doit fixer et appliquer une durée (par exemple 8 semaines) avant publication.]**
- **Effacement non immédiat** : l'effacement d'un carnet ou d'un compte (§ 7) supprime les données de l'application après 30 jours, mais **ne modifie pas les sauvegardes déjà faites** : une donnée effacée peut subsister dans une sauvegarde jusqu'à sa suppression, soit **environ 8 semaines** après l'exécution de l'effacement (davantage tant que les sauvegardes exceptionnelles ne sont pas purgées). **[À VÉRIFIER : décision de {EDITEUR} ; si une donnée effacée est restaurée, elle doit être effacée de nouveau sans délai — procédure à écrire.]**
- **Emplacement** : les sauvegardes sont conservées sur l'**ordinateur personnel de {EDITEUR}** (responsable du traitement), dans un dossier hors du code source, et nulle part ailleurs : **aucune copie sur un service en ligne ni sur un support externe à ce jour** **[À VÉRIFIER : à re-confirmer à la publication]**. Cet ordinateur est protégé par un mot de passe de session **[À VÉRIFIER]**.
- **Chiffrement** : le chiffrement du disque de cet ordinateur (BitLocker ou équivalent) **[À VÉRIFIER : non établi au 4 oct 2026 — voir la marche à suivre `tasks/verifier-chiffrement-disque.md` ; si le disque n'est pas chiffré, ne PAS écrire que les sauvegardes sont chiffrées]**. Les fichiers de sauvegarde eux-mêmes ne sont pas chiffrés séparément.
- **Accès** : seul {EDITEUR}. **[À VÉRIFIER : autres personnes ayant accès à l'ordinateur ; sauvegardes automatiques éventuelles du prestataire d'hébergement selon l'offre souscrite.]**

## 7. Vos droits et leur exercice
Vous pouvez à tout moment, depuis l'application ou en écrivant à {CONTACT} :
- **Accéder à vos données et les récupérer (portabilité)** : l'export d'un carnet fournit une archive (.zip) avec les données en JSON, les photos et documents, et une notice en français. L'export contient ce que le compte qui exporte peut voir ; **jamais ce qui est privé à l'autre responsable**.
- **Faire effacer vos données** : depuis Famille & paramètres › Effacer des données, pour un carnet ou pour le compte. L'effacement est exécuté **30 jours après la demande** ; la demande est **annulable** jusque-là. Dès la demande, les données concernées ne sont plus visibles dans l'application et le compte est désactivé (seules actions possibles : annuler la demande, se déconnecter).
- **Rectifier** vos informations (profil, carnet) dans l'application.
- **Vous opposer, limiter** un traitement, **retirer votre consentement** (Aria) : en écrivant à {CONTACT}. **[À VÉRIFIER : procédure interne et délai de réponse.]**
- **Introduire une réclamation** auprès de la CNIL (cnil.fr).

Effacer un **carnet** n'est possible que par son **unique** responsable ; dès qu'il y a deux responsables, chacun peut seulement se retirer du carnet.

## 8. Ce qui est supprimé et ce qui est conservé quand un responsable part
Règle : **est supprimé ce que personne d'autre ne détient** (ajouts privés, conversations avec Aria, profil) ; **est conservé ce qu'un tiers détient aussi** (le foyer, l'enseignant), sans le nom du responsable parti. Aucun nom ni adresse du responsable parti n'est conservé.

| Donnée du responsable qui part (suppression de compte) | Sort |
|---|---|
| Carnets dont il est le seul responsable | effacés en entier |
| Carnets gardés par un autre responsable | conservés, rattachés à cet autre responsable |
| Ajouts « foyer » (photos, documents, jalons) | conservés, auteur affiché « Ajouté par un ancien responsable » |
| Ajouts privés | supprimés, fichiers compris |
| Signatures de mots | conservées (« Signé par un responsable (compte supprimé) le [date] ») |
| Réponses aux mots (autorisation, participation) | conservées (« Répondu par un responsable (compte supprimé) ») |
| Messages du fil famille avec l'enseignant | conservés, auteur « Ancien responsable » |
| Conversations individuelles avec l'enseignant | conservées côté enseignant, nom « Ancien responsable », messages sans auteur ; le partant n'y a plus accès |
| Événements d'agenda | conservés, sans auteur |
| Conversations avec Aria, profil, alertes d'urgence | supprimés |
| Compte de connexion | supprimé |

Un responsable qui **se retire seulement d'un carnet** (sans supprimer son compte) : ses ajouts privés à ce carnet sont supprimés, ses ajouts « foyer » restent, il perd l'accès au carnet ; ses signatures et réponses restent (« un ancien responsable »), ses invitations en attente pour ce carnet sont annulées. Un responsable ne peut retirer que lui-même, jamais le dernier responsable.

## 9. Sécurité
- Cloisonnement : chaque responsable ne voit que les enfants auxquels il est rattaché ; un enseignant ne voit que ses classes ; les contenus privés ne sont lisibles que par leur auteur. Ces règles sont appliquées par la base de données et ont été testées automatiquement (parent d'un autre foyer, enseignant non rattaché, compte anonyme) **[À VÉRIFIER : n'afficher que la dernière date de test et ce qui est vrai à la publication ; tasks/audit-securite.md]**.
- Les fichiers du carnet sont dans un stockage privé ; ils s'affichent par des liens signés valables 1 heure, jamais par un lien public **[À VÉRIFIER : l'ouverture d'un document dans l'application peut encore laisser une copie dans les téléchargements du téléphone (point ouvert du 26 sept) ; ne pas affirmer l'absence de copie locale tant que ce n'est pas corrigé]**.
- Aucun journal d'accès n'est tenu aujourd'hui : **ne pas** en promettre un.
- Aucune clé de service n'est contenue dans l'application.
- Les sauvegardes sont conservées hors du dépôt de code ; leur chiffrement **[À VÉRIFIER : non chiffrées au 4 oct 2026 ?]**.

## 10. Enfants et mineurs
{NOM_APP} est destiné aux familles et aux enseignants. Les enfants de maternelle et de primaire n'ont pas de compte. **[À VÉRIFIER : règles pour les comptes d'élèves de collège et lycée (fonction à venir) — ne pas décrire tant que la fonction n'existe pas.]**

## 11. Modifications de cette politique
Toute modification substantielle sera signalée dans l'application avant son entrée en vigueur. **[À VÉRIFIER : mécanisme de notification réellement construit.]**

## 12. Contact
{CONTACT} — **[À VÉRIFIER : adresse postale de {EDITEUR} ; coordonnées du délégué à la protection des données, le cas échéant.]**

---
### Points que le code ne permet pas de prouver (récapitulatif pour le juriste)
1. Statut juridique de l'éditeur ; DPO ; adresse.
2. Accords de traitement (Supabase, Anthropic, Expo, Brevo) ; transferts hors UE et garanties (clauses types).
3. Activation réelle de Brevo ; données reçues par le service de mises à jour d'Expo ; Apple et Google.
4. Durées de conservation non codées : alertes d'urgence, registre d'effacement, sauvegardes (hebdomadaires, 8 conservées, sur le poste de l'éditeur, effacement non répercuté avant ~8 semaines).
5. Âge minimal, consentement parental, comptes d'élèves (non disponibles).
6. Copie locale des documents ouverts (point ouvert du 26 sept) ; chiffrement des sauvegardes ; journal d'accès inexistant.
7. Base légale de chaque traitement ; information et recueil du consentement pour Aria dans l'application.
