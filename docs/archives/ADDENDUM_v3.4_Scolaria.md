# ADDENDUM v3.4 — Un enfant, un carnet
*Scolaria · 21 septembre 2026 · Statut : §11 acté — reste des sections à valider*

**Base :** CLAUDE.md v3.0 · COMPONENTS.md v2.0 · Addendum v3.2 (Mon parcours / archives) · Addendum v3.3 (Cahier de liaison)
**Principe de cet addendum :** on modifie l'existant, on ne reconstruit rien. Chaque section indique ce qui change et ce qui reste.

---

## 0. CE QUI NE CHANGE PAS

- Navigation Notion-style : top bar `[Avatar enfant] [Accueil] [·] [Agenda] [Messages]` + bottom bar `[Recherche] [Aria] [Action]`
- Design language v3.0, tokens COMPONENTS.md, Figtree, indigo #4338CA, fond #F2F1EE
- Changement d'enfant via l'avatar → toutes les pages se mettent à jour (règle actée en mars)
- **Mon parcours** (v3.2) : accès aux années précédentes, en lecture seule
- Cahier de liaison (v3.3), messagerie enseignant collective/individuelle, signature des mots
- Profil & Badges, Score de Joie, Aria et ses 4 stades, charte éthique
- Interface enseignant MVP telle que définie dans CLAUDE.md
- Collège / lycée : Notes v7 conservé intégralement

---

## 1. PRINCIPE FONDATEUR — UN ENFANT = UN CARNET

**À ajouter dans CLAUDE.md, juste après « Vision stratégique » :**

```
## Principe fondateur — Un enfant = un carnet
- Chaque enfant a son propre carnet. Aucune vue ne mélange plusieurs enfants.
- Le parent choisit le carnet via l'avatar (sélecteur d'enfant).
- Toute donnée (mot, message, signature, photo, livret, événement)
  est rattachée à un student_id + academic_year_id — jamais au parent seul.
- Un mot envoyé à une fratrie = une copie dans chaque carnet,
  une signature par enfant.
- Le sélecteur affiche un indicateur de nouveauté par enfant.
- Chaque notification push nomme l'enfant et ouvre son carnet.
```

**Pourquoi :** c'est la traduction directe du carnet de santé (une école ne donne pas un carnet pour une fratrie), et cela rend la transmission à 18 ans triviale : l'enfant récupère son carnet entier, sans tri.

---

## 2. RESPONSABLES LÉGAUX MULTIPLES & SIGNATURE PAR PARENT

**Constat terrain (Beneylu) :** impossible d'avoir deux enfants sur un compte, mais « signature des deux parents » gérée par parent. Scolaria doit faire les deux.

### Ce qui change
- Un **foyer** regroupe N responsables légaux et N enfants.
- Chaque responsable a **son propre compte** et voit tous les enfants du foyer.
- Chaque responsable **signe en son nom**. Le statut est visible par parent : « Julien ✓ · Vous : à signer ».
- L'enseignant choisit à l'envoi : **aucune signature / 1 parent / les 2 parents**.
- Invitation d'un second responsable depuis Famille & paramètres.

### Garde partagée — règle précisée
La règle « ne jamais afficher les données d'un parent à un autre » devient :
- **Partagé entre responsables :** tout ce qui vient de l'école (mots, messages de classe, photos, livrets, statuts de signature).
- **Privé à chaque responsable :** ses conversations privées avec l'enseignant, ses notes personnelles, ses ajouts marqués privés.
- Un responsable peut être rattaché à un seul enfant du foyer (familles recomposées).

### Types de mots (champ `type` sur `mots_liaison`)
| Type | Réponse attendue du parent |
|------|----------------------------|
| `information` | Accusé de lecture uniquement |
| `signature` | Signer (1 ou 2 parents) |
| `autorisation` | Oui / Non + signature |
| `participation` | Oui / Peut-être / Non (sortie, kermesse, stand) |

---

## 3. NOTES → SUIVI

### Ce qui change
- L'onglet **Notes** de la top bar est renommé **Suivi** (icône lucide `trending-up`).
- Le contenu **s'adapte au niveau de l'enfant sélectionné** — aucun choix à faire par le parent :

| Niveau | Contenu de Suivi › Apprentissages |
|--------|-----------------------------------|
| Maternelle | Carnet de suivi des apprentissages : domaines + observations de l'enseignant |
| Primaire | Compétences du livret (LSU) sur 4 niveaux : Non atteint · Partiellement · Atteint · Dépassé |
| Collège / Lycée | **Notes v7 inchangé** (courbe, pills matières, cartes extensibles) |

### Structure de l'écran Suivi
- Sous l'en-tête : un bouton `2025–2026 · CE1 ⌄`
  - Menu : année en cours, puis lien **« Mon parcours »** (v3.2) pour les années précédentes. Pas de frise.
- Segmented control : **Apprentissages · Souvenirs · Livrets**
  - **Souvenirs :** albums photos de classe + dessins/travaux ajoutés par la famille + jalons (« premier exposé »)
  - **Livrets :** livrets et bulletins de l'année (saisis par l'enseignant ou scannés par le parent)
- Action bottom bar : ⊞ scanner → « Ajouter au carnet » (§4)

### Règles d'affichage (COMPONENTS.md)
- Niveaux de compétence : 4 segments de 22×6 px, remplis en #0F172A, vides en rgba(15,23,42,0.12). **Jamais de vert/rouge.**
- Toujours afficher la source : « Saisi par Mme Durand · 12 déc. » ou « Scanné par vous ».

---

## 4. AJOUTER AU CARNET (import par le parent)

**Pourquoi c'est central :** le carnet doit se remplir **même si l'école n'utilise pas encore Scolaria**. C'est ce qui donne à un parent une raison d'installer l'app dès le premier jour, et ce qui distingue Scolaria d'un ENT.

### Points d'entrée
- Accueil : action bottom bar `+`
- Suivi : action bottom bar ⊞

### Actions (bottom sheet ou écran plein)
1. **Photographier** — dessin, cahier, livret papier
2. **Importer une capture** — mot ou photo reçu dans une autre application
3. **Ajouter un document** — PDF de livret, bulletin, certificat
4. **Noter une première fois** — jalon texte + photo optionnelle

### V1 vs Phase 2
- **V1 :** le parent choisit la catégorie (Mot / Livret / Souvenir / Jalon) et la date. Rangement dans le carnet de l'enfant sélectionné.
- **Phase 2 (Aria stade 2) :** Aria reconnaît le document, propose la catégorie et extrait les compétences d'un livret. Le parent valide toujours (« Aria propose, l'humain décide »).

### Principe « ne jamais se connecter aux ENTs » — précision
> Scolaria ne se connecte à aucun ENT (pas d'API, pas de scraping, pas d'identifiants tiers). **L'import manuel par le parent de ses propres documents n'est pas une connexion** et est autorisé.

---

## 5. AGENDA ALIMENTÉ PAR LES MOTS

- Dans le composer enseignant : option **« Ajouter à l'agenda des familles »** avec date/heure saisies par l'enseignant.
- À la publication, l'événement apparaît dans l'Agenda de chaque enfant concerné, avec le lien vers le mot source.
- Option **« À prévoir »** : liste d'affaires (pique-nique, casquette…) affichée en cases à cocher dans la carte événement (reprend la feature « devoirs cochables » de la queue produit).
- **V1 :** date saisie par l'enseignant. **Phase 2 :** détection automatique de la date par Aria.
- Mots importés par le parent : le parent ajoute la date à la main.

---

## 6. NOTIFICATIONS

**Constat terrain (Beneylu) :** les push étaient activés sur le téléphone mais désactivés module par module dans l'app → aucune notification reçue. À ne jamais reproduire.

### Règles
- **Activées par défaut** pour : mots à signer, messages de l'enseignant, messages de la direction.
- **Résumé unique à 18h** pour : photos, annonces, informations.
- **Silence 20h – 7h** (principe éthique n°6), sauf urgence école.
- Chaque push commence par le prénom : `Lucas · Mme Durand a publié un mot à signer`. Le tap ouvre directement le carnet de cet enfant.
- Sélecteur d'enfant : point rouge + « 1 nouveau message » sur chaque enfant concerné.
- **Interdit :** une matrice module × canal × sous-type. Trois réglages maximum dans Famille & paramètres.

---

## 7. MESSAGES — COMPLÉMENTS

- Filtres en pills : **Tout · À signer (n) · École · Privés**
- Expéditeurs typés (avatar + étiquette) : Enseignant · Direction · APE · Mairie (via la direction) · **Importé**
- Contenu affiché uniquement pour l'enfant sélectionné (§1)

---

## 8. INTERFACE ENSEIGNANT — COMPLÉMENTS AU MVP

**Ajouts au MVP V1 :**
- Suivi par mot : **« 22/24 familles ont lu · 18/24 ont signé »** + bouton **« Relancer les 6 »** (relance automatique optionnelle à J+2)
- Choix du type de mot (§2) et du mode de signature
- Absences **déclarées par les parents**, visibles le matin (le signalement par l'enseignant existant reste)

**Phase 2 :**
- Registre d'appel exportable (obligation légale en primaire — sans lui, l'enseignant garde un second outil)
- Publication programmée avec choix de l'heure
- Traduction des mots pour les familles (voir §9)

---

## 9. IDÉES REPRISES DE BENEYLU (vérifiées sur leur site, sept. 2026)

| Idée | Priorité | Note |
|------|----------|------|
| Appel à participation (oui / peut-être / non) | V1 | Type de mot §2 |
| Demande d'autorisation | V1 | Type de mot §2 |
| Traduction des mots pour les familles | Phase 2 | Fournisseur à choisir compatible hébergement UE (principe de souveraineté) |
| Lecture à voix haute des mots | Phase 2 | Accessibilité parents peu à l'aise avec l'écrit |
| Publication programmée | Phase 2 | — |
| Registre d'appel exportable | Phase 2 | §8 |

**À ne pas reprendre :** modules grisés visibles, décors saisonniers, matrice de notifications, notifications sans prénom ni aperçu.

---

## 10. CORRECTIONS À APPORTER À VISION.md

### 10.1 Tableau concurrentiel — ajouter Beneylu
| Acteur | Modèle | Limite |
|--------|--------|--------|
| Beneylu School | ENT primaire, outil de la classe | Centré élèves/enseignant, parents en dernier ; 1 compte = 1 enfant ; s'arrête au CM2 ; données enfermées dans la classe et l'année |

**Positionnement confirmé :** Beneylu est l'outil de la classe. Scolaria est le carnet de l'enfant. Même terrain d'entrée, pas la même catégorie.

### 10.2 Tarification — à revoir
- Référence marché : Beneylu **79 €/an par classe · 299 €/an pour toute l'école** (599 € avec ressources). Mécénat : 500 écoles offertes par an.
- L'hypothèse VISION.md de **~1 500 €/an par établissement privé n'est pas tenable** face à cette référence.
- Les projections An 1–5 sont à recalculer. Piste à arbitrer : gratuit pour une classe, offre école sous 299 €, revenus principaux côté collectivités et modules avancés.

### 10.3 Stratégie d'entrée — précision
> **Le carnet d'abord, le lien école ensuite.** Le parent a une raison d'utiliser Scolaria seul (carnet, import, souvenirs, deux parents, plusieurs enfants). L'enseignant qui rejoint Scolaria accélère le remplissage du carnet — il n'en est pas le prérequis.

### 10.4 Règle « pas de comparaison inter-années » — reformulation
Remplacer :
> ✗ Jamais comparaison automatique de données inter-années

par :
> ✗ Jamais de comparaison entre enfants.
> ✓ Comparaison des progrès d'un enfant avec lui-même, sur plusieurs années : autorisée à partir d'Aria stade 2, présentée comme une tendance, sources citées, jamais sur un signal isolé.

Sans cette reformulation, la vision longitudinale du carnet est bloquée par ses propres règles.

---

## 11. NETTOYAGE DES ANCIENNES DÉCISIONS — ACTÉ (21/09/2026)

**Règle : CLAUDE.md v3.0 + COMPONENTS.md v2.0 font foi. Toute décision antérieure qui les contredit est caduque.**

| # | Sujet | Ancienne décision (caduque) | Décision actée |
|---|-------|-----------------------------|----------------|
| 1 | Fond de page | #F8F7F5 (CLAUDE.md v2.1) | **#F2F1EE partout.** CLAUDE.md v2.1 supprimé du projet et du repo. |
| 2 | Matières | Page « Personnaliser matières → emoji + couleur » | **Couleur uniquement.** Aucun emoji sur les matières, nulle part. La page devient « Personnaliser matières → couleur ». |
| 3 | FAB | « Carré arrondi noir » (Agenda v5) | **Cercle 48 px, borderRadius 999**, partout, Agenda compris. |
| 4 | Couleurs par niveau | Thème orange / bleu / anthracite appliqué à toute l'app (mars 2026) | **Fond unique #F2F1EE et indigo seul accent.** La couleur de l'enfant ne subsiste que sur **son avatar** et le **header wallpaper de l'Accueil**. Plus de thème appliqué aux tuiles, pages ou bandeaux. Le violet #7C3AED du thème lycée est supprimé. |
| 5 | Tagline | « Le copilote éducatif des familles » | **« Le carnet de scolarité numérique »** partout (VISION.md, site, stores). « Copilote » reste réservé pour décrire Aria. |

**Autres reliquats à supprimer du code s'ils existent :** tuiles avec bordures colorées et micro-dégradés (mars), police DM Sans, symbole ✧ ou gradient #8B5CF6→#1B72E8 pour Aria, graphie « ScolarIA » dans le code et les textes.

---

## 12. PROMPT CLAUDE CODE

```
Addendum v3.4 — Un enfant, un carnet. Modifications de l'existant uniquement.

AVANT TOUTE CHOSE
1. Lire CLAUDE.md, COMPONENTS.md, tasks/lessons.md, tasks/todo.md
2. Lire ADDENDUM_v3.4_Scolaria.md en entier
3. grep -r pour localiser : l'écran Notes, la top bar, les tables
   mots_liaison / signatures / messages, le sélecteur d'enfant,
   l'écran Mon parcours
4. Écrire le plan dans tasks/todo.md. Ne rien supprimer d'existant
   sans me le signaler.

PHASE 0 — NETTOYAGE (§11, avant tout le reste)
- Supprimer l'ancien CLAUDE.md v2.1 : un seul CLAUDE.md, la v3.0.
- grep -r et corriger dans tout src/ :
  · #F8F7F5 → #F2F1EE
  · emoji associés aux matières (données de démo, composants, page
    Personnaliser matières) → supprimés, couleur uniquement
  · FAB non circulaires → cercle 48px borderRadius 999
  · thèmes par niveau (ThemeContext orange/bleu/anthracite, #7C3AED)
    → conservés uniquement pour l'avatar enfant et le header Accueil
  · DM Sans, ✧, gradient #8B5CF6→#1B72E8, "ScolarIA" → supprimés
  · tagline → "Le carnet de scolarité numérique"
- Lister chaque fichier modifié dans tasks/todo.md.

PHASE A — BDD (Supabase, migrations)
- Vérifier que messages, mots_liaison, signatures, grades et événements
  sont rattachés à student_id + academic_year_id (§1). Sinon, migrer.
- Ajouter foyers + responsables (N parents ↔ N enfants) (§2).
- signatures : une ligne par (mot_id, student_id, guardian_id, signed_at).
- mots_liaison : ajouter type (information|signature|autorisation|participation),
  signature_mode (none|one|both), event_date nullable, a_prevoir jsonb nullable.
- Nouvelle table competences (student_id, academic_year_id, domaine,
  competence, niveau 1-4, source ecole|parent, saisi_par, date).
- Nouvelle table carnet_items pour l'import parent (§4) :
  student_id, academic_year_id, categorie (mot|livret|souvenir|jalon),
  fichier, date, ajoute_par, visibilite (foyer|prive).
- RLS : un responsable ne lit que les enfants de son foyer ;
  les éléments visibilite=prive ne sont lus que par leur auteur.

PHASE B — UI (après validation de la phase A)
1. Renommer l'onglet Notes → Suivi (icône trending-up). Contenu selon
   le niveau de l'enfant (§3). Collège/lycée : Notes v7 inchangé.
2. Suivi : bouton année ⌄ (année en cours + lien Mon parcours),
   segmented Apprentissages / Souvenirs / Livrets.
3. Écran « Ajouter au carnet » (§4) : 4 actions, catégorie choisie
   par le parent en V1.
4. Mot du cahier de liaison : statut de signature par parent,
   types autorisation et participation (§2).
5. Sélecteur d'enfant : indicateur de nouveauté par enfant (§6).
6. Messages : filtres Tout / À signer / École / Privés,
   étiquettes d'expéditeur (§7).
7. Agenda : événements créés depuis event_date des mots,
   cases à cocher « À prévoir » (§5).

RÈGLES
- Respect strict de COMPONENTS.md (pills, FAB cercle, pas de glass
  card dans les pages profondes, pas de couleur sur les données).
- Un seul bloc compilé par phase (0, A, B). Vérification localhost avant tout
  build EAS. Mettre à jour tasks/lessons.md à la fin.
```

---

## 13. HORS SCOPE DE CET ADDENDUM

- Reconnaissance automatique des documents par Aria (Phase 2)
- Traduction, lecture à voix haute, publication programmée (Phase 2)
- Registre d'appel (Phase 2)
- Nouvelle grille tarifaire chiffrée (session business dédiée)
- Espace élève collège/lycée, interface directeur (inchangé : Phase 2)

---

*ADDENDUM v3.4 · Scolaria · Septembre 2026 · À fusionner dans CLAUDE.md et VISION.md après validation*
