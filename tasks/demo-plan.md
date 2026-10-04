# Plan de démonstration — 10 minutes, mode démo, Redmi (4 oct 2026)

> **Nom provisoire.** Le nom de l'application n'est pas arrêté : dire « le carnet » ou « l'application » ; si on te demande le nom, répondre « provisoire, pas encore choisi ». Ne présenter aucun nom, logo ou domaine comme définitif.
> Tagline à utiliser : « le carnet de scolarité numérique » (jamais « copilote » pour la tagline : réservé à Aria).

## 0. Avant de commencer (2 min, hors présence de la personne)
- Téléphone chargé, mode avion NON nécessaire, luminosité haute, **notifications désactivées** (rien ne doit s'afficher en cours de démo), mode « Ne pas déranger ».
- **Ne jamais te déconnecter de ton compte réel.** Deux voies : (a) sur l'APK de démonstration (`tasks/build-demo-android.md`, quand il existera) : « Essayer en mode démo » depuis l'écran d'ouverture ; (b) sur le client de développement : bouton de bascule « Passer en démo » (outil de développement, absent des versions de production), puis « Revenir à mon compte » à la fin.
- Choisir l'enfant au départ : **Lucas (CM2)** pour une enseignante de primaire ; **Léa (grande section)** pour une enseignante de maternelle.
- Vérifier que le téléphone est sur l'accueil du carnet de l'enfant choisi.
- Si une question sort du cadre de la démo, répondre « je ne sais pas encore, je note » (la feuille de notes, § 5).

## 1. Parcours avec une enseignante (10 min) — quoi montrer, dans quel ordre
Idée directrice : « ce que reçoivent les familles de ta classe ». **La démo montre le côté famille ; l'interface enseignant n'est pas montrée en démo** [UNCLEAR : à confirmer sur l'appareil]. L'enseignante voit ce que verrait chaque famille, et ce que tu lui demandes est de dire si c'est juste.
1. **(1 min) Le principe** — « Un enfant = un carnet, qui suit l'enfant d'une école à l'autre ; il appartient à la famille. L'école qui participe accélère le remplissage, mais n'est pas obligatoire. » Accueil du carnet de **Lucas**.
2. **(2 min) Un mot à signer** — Accueil › carte « À traiter » : ouvrir un mot, montrer les types (information, signature, autorisation, participation) et la signature par responsable. Demander : « C'est ainsi que tu fais circuler les mots aujourd'hui ? »
3. **(2 min) Le Suivi** — onglet Suivi › **Apprentissages** : compétences par discipline, échelle (3 niveaux), source affichée (« Saisi par Mme Dupont »). Puis **Livrets** et **Souvenirs**. Pour **Léa** (maternelle) : observations par domaine, **aucun niveau**.
4. **(1 min) L'Agenda** — événement venu d'un mot, liste « À prévoir » (pique-nique, casquette…). « Que mets-tu dans le cahier de liaison que les familles oublient ? »
5. **(1 min) Les messages** — Messages : fil famille et conversations individuelles ; « Un enfant = un fil, rien ne se mélange entre frères et sœurs. »
6. **(1 min) Ajouter au carnet** — bouton « + » : la famille peut ajouter une photo, une capture, un PDF, un jalon (« premier exposé »), même si l'école n'utilise pas l'application.
7. **(1 min) Aria** — pill du bas : assistant du carnet ; **ne pas promettre d'analyse du carnet** (aujourd'hui l'assistant ne lit pas le carnet). **Ne pas tester de message de détresse devant elle.**
8. **(1 min) Conclusion** — retour à l'accueil ; poser les questions du § 4.

## 2. Parcours avec un parent (10 min)
Idée directrice : « tout ton suivi scolaire au même endroit, pour chaque enfant ». Enfant de départ : celui qui ressemble le plus à la famille (Lucas CM2, Léa GS ou Emma 3e).
1. **(1 min) Le problème** — « Les mots, les photos, les bulletins sont éparpillés (papier, plusieurs applis, messageries). » Accueil.
2. **(2 min) Les enfants** — **avatar › sélecteur d'enfant** : un carnet par enfant, pastille de nouveauté par enfant, couleur de chaque enfant. Passer de Lucas à Léa : « tout change, rien ne se mélange ».
3. **(2 min) À traiter** — mots à signer, qui a signé (les deux parents, chacun en son nom).
4. **(2 min) Suivi** — Apprentissages / Souvenirs / Livrets ; **Mon parcours** (années précédentes, lecture seule : bouton année).
5. **(1 min) Ajouter au carnet** — photographier un bulletin papier, importer une capture, ajouter un document.
6. **(1 min) Famille & paramètres** (☰) — Mes enfants, Responsables légaux (invitation d'un second responsable : **ne pas la déclencher en démo**, aucun e-mail n'est envoyé aujourd'hui), Confidentialité & données (effacement différé de 30 jours, annulable). **Ne pas ouvrir l'export ni le code de transfert** (à ne montrer que si la fonction est vérifiée).
7. **(1 min) Hébergement** — ne dire QUE la formulation validée : « Les données sont hébergées dans l'Union européenne, à Paris. Aria s'appuie sur un modèle d'Anthropic, société américaine ; ce que tu lui écris est traité hors de l'Union européenne. » Rien de plus.

## 3. Ce qu'il ne faut PAS promettre
- **Dates** : aucune date de sortie, de bêta, de disponibilité sur les magasins (aucun magasin à ce jour), de rentrée 2027, d'interface enseignant complète, d'iPhone (version iOS non testée).
- **Prix** : aucun prix, aucune formule gratuite « pour toujours », aucun tarif école ; « on n'a pas décidé ».
- **Nom définitif** : « nom provisoire ».
- **Fonctions non construites** : connexion à Pronote / EcoleDirecte / Beneylu (interdite par principe : pas de connexion aux ENT, seulement l'import manuel de ses propres documents), reconnaissance automatique des documents, alertes bien-être (Score de Joie : seul le protocole d'urgence existe), détection automatique des dates, traduction des mots, lecture à voix haute, registre d'appel, mode sombre, comptes d'élèves collège/lycée.
- **Sécurité / conformité** : ne pas dire « conforme RGPD », « certifié », « 100 % européen », « aucune donnée ne quitte l'Europe » (Aria passe par Anthropic), « sauvegardé chiffré ». Politique de confidentialité : en brouillon, pas encore publiée.
- **Chiffres et personnes réels** : toutes les données de la démo sont **fictives** (famille Moreau, Mme Dupont, M. Garcia…) ; le dire.

## 4. Cinq questions à poser
1. (enseignante) **Quel outil utilises-tu aujourd'hui pour faire signer un mot** (papier, application de l'école, SMS) et qu'est-ce qui te prend le plus de temps ?
2. (les deux) **Qu'est-ce qui te manquerait pour utiliser cette application demain, dès cette semaine** ?
3. (enseignante) **Combien de familles de ta classe seraient prêtes à installer une application de plus** (ou répondent déjà à ton application actuelle) ?
4. (parent) **Quelle information scolaire de ton enfant as-tu déjà perdue ou cherchée longtemps** (mot, bulletin, photo) ?
5. (les deux) **Y a-t-il une chose que tu ne voudrais PAS voir dans une application comme celle-ci** (par exemple : notes, photos, assistant) ?

## 5. Feuille de notes (à imprimer ou recopier)
```
Date : ______  Lieu : ______  Durée : ____ min
Personne : ☐ enseignante (niveau : ______)  ☐ parent (nb d'enfants : __, niveaux : ______)
Enfant montré : ☐ Léa (GS)  ☐ Lucas (CM2)  ☐ Emma (3e)    Version : ☐ client de développement  ☐ APK de démonstration

Outil actuel (nom) : _____________________  Ce qui lui plaît : ______________  Ce qui l'agace : ______________
Réaction au carnet (1 phrase, ses mots) : _______________________________________________
Moment où elle/il a souri / hoché la tête : ____________   Moment de confusion : ____________
Fonction qu'elle/il redemande : _______________   Fonction jugée inutile : _______________
Peur ou frein cité (vie privée, temps, école, autre) : _______________________________
Réponses aux 5 questions : 1 ______  2 ______  3 ______  4 ______  5 ______
Seriez-vous prêt(e) à essayer 2 semaines ? ☐ oui ☐ peut-être ☐ non — pourquoi : _______________
Engagement pris par moi (aucun prix / date / nom) : ☐ aucun    Autre : ______________
Bogue vu : _________________ (écran, enfant, heure)
Contact à recontacter (accord explicite, pas noté ici : à demander à l'oral) : ☐ oui ☐ non
```
Règle : ne noter AUCUN nom d'élève, d'enseignant ni d'école réels sur la feuille sans accord ; garder la feuille hors du dépôt de code.

## 6. Après la démo
- Recopier les notes (sans nom) dans `tasks/` si utile ; les promesses éventuelles sont à vérifier par rapport au § 3.
- Si tu étais sur le client de développement : **« Revenir à mon compte »**, puis vérifier que ton compte réel est bien affiché.
