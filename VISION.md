# VISION.md — Vision Stratégique Scolaria
*Document de référence stratégique · Mis à jour Septembre 2026 (fusion Addendum v3.4)*
*À lire par Claude au démarrage de chaque session stratégique*

---

## 1. Identité fondamentale

**Scolaria est le carnet de scolarité numérique qui manque aux familles françaises.**

Comme le carnet de santé accompagne l'enfant de la naissance à l'âge adulte, Scolaria accompagne l'enfant de la maternelle au baccalauréat — indépendamment des établissements, des déménagements, des changements d'école.

- Tagline : "Le carnet de scolarité numérique" (« copilote » est réservé pour décrire Aria)
- Nom : toujours **Scolaria** — jamais ScolarIA, jamais Scholaris
- Positionnement : **successeur des ENTs**, pas connecteur. "Là où Papillon est un parasite élégant de Pronote, Scolaria en est le successeur."

---

## 2. La vision carnet de scolarité numérique

### Ce que le carnet de santé fait — et que Scolaria reproduit

- **Il appartient à la famille, pas à l'institution.** Pronote appartient à l'établissement. Scolaria appartient à l'enfant.
- **Il suit l'enfant même quand la famille déménage.** Changement d'école, changement de ville : zéro perte d'historique.
- **Il traverse les transitions.** CM2→6ème, 3ème→lycée : Scolaria est le seul outil qui maintient la continuité sans perdre un octet.
- **Il a une valeur quasi-officielle.** Chaque note saisie par l'enseignant est horodatée, chaque message archivé, chaque bulletin signé numériquement.
- **À la majorité, il est transmis à l'enfant.** À 18 ans, l'enfant devient propriétaire de son compte et de toute sa scolarité archivée.

### Un enfant = un carnet
Une école ne donne pas un carnet pour une fratrie : Scolaria non plus. Chaque enfant a son propre carnet, le parent choisit celui qu'il consulte. Aucune vue ne mélange plusieurs enfants. À 18 ans, l'enfant récupère son carnet complet, sans tri.

### Le carnet se remplit même sans l'école
Le parent peut ajouter lui-même au carnet : photo d'un dessin ou d'un cahier, capture d'un mot reçu sur une autre application, livret scanné, « première fois ». Le carnet a de la valeur dès le premier jour, même si l'école utilise encore un autre outil. L'enseignant qui rejoint Scolaria accélère le remplissage — il n'en est pas le prérequis.

### Ce que Scolaria fait de plus que le carnet de santé

- Aria traverse des années d'historique pour des insights longitudinaux impossibles aujourd'hui
- Le bilan annuel généré par Aria (feature à développer) : équivalent des bilans médicaux obligatoires
- Les jalons non-académiques : premiers exposés, premières prises de parole, progressions qualitatives
- Le pont avec le suivi médical : contexte médical (dys, TDAH) saisi par les parents, pris en compte par Aria

### L'ambition finale

Scolaria peut créer le standard national du carnet de scolarité numérique avant que l'État ne tente de le faire. Une fois adopté, c'est une infrastructure de mémoire scolaire — pas un logiciel qu'on remplace.

---

## 3. Stratégie de marché

### Positionnement concurrentiel

| Acteur | Modèle | Limite |
|--------|--------|--------|
| Pronote / EcoleDirecte | Outil d'établissement | Appartient à l'école, pas à la famille |
| Papillon | Connecteur Pronote | Limité collège/lycée, dépendant des ENTs |
| Klassly | Communication école-famille | Pas de suivi longitudinal, pas d'IA |
| Beneylu School | ENT primaire, outil de la classe (79 €/classe/an, 299 €/école/an ; 17 académies ; mécénat 500 écoles/an) | Centré élèves/enseignant, parents en dernier ; 1 compte = 1 enfant ; s'arrête au CM2 ; données enfermées dans la classe et l'année ; interface surchargée (retour terrain : seuls les messages enseignants/direction et les photos servent) |
| **Scolaria** | **Carnet de scolarité numérique** | **Aucun équivalent** |

**Positionnement : les ENTs sont l'outil de la classe. Scolaria est le carnet de l'enfant.** Même terrain d'entrée, pas la même catégorie.

### Stratégie d'entrée — Le carnet d'abord, le lien école ensuite

Le parent a une raison d'utiliser Scolaria seul (carnet, import, souvenirs, deux parents, plusieurs enfants). C'est ce qui rend le Trojan Horse crédible : sans valeur pour le parent seul, un fil vide ne fait installer l'app à personne.

### Le Trojan Horse

**Étape 1 — Adoption organique (mois 1-6)**
Les parents s'inscrivent gratuitement. Un enseignant commence à utiliser Scolaria pour sa classe. Bouche à oreille, groupes WhatsApp de parents → viralité naturelle.

**Étape 2 — Point de bascule (mois 6-12)**
Quand une école atteint 30-40% de parents actifs : contact du directeur. "Vos familles utilisent déjà Scolaria, voulez-vous officialiser ?"

**Étape 3 — Approche mairie/collectivité**
On arrive avec des données. On ne vend pas un outil inconnu — on propose d'officialiser un usage existant.

**Étape 4 — Effet domino territorial**
Une mairie signe → les mairies voisines voient → déploiement territorial.

### Porte d'entrée prioritaire : maternelle / primaire

- Pronote quasi-absent de ce segment — mais occupé par des ENT primaires (Beneylu, ONE, Klassly), qui sont des outils de classe, pas de famille
- Enseignants communiquent encore par cahier de liaison papier, SMS, WhatsApp
- Décision = directeur d'école + mairie (cycle de vente court)
- Argument continuité : "l'app suit l'enfant du CP au bac"

### Expansion collège / lycée

- Levier : continuité. Les familles déjà sur Scolaria depuis le primaire ne veulent pas changer.
- Décideur : département (collège), région (lycée)
- Concurrence directe avec Pronote → attaquer en dernier

### Réseaux prioritaires

- Établissements privés (9 000 en France) — décision rapide, directeur seul
- AEFE (580 établissements français à l'étranger) — contrat réseau potentiel
- Enseignement catholique (~8 000 établissements) — convention nationale
- Mairies — pack commune (5-8 écoles)

---

## 4. Modèle économique

### Principe fondateur — non négociable

**Scolaria est et restera gratuit pour toutes les familles, sans exception, sans feature essentielle derrière un paywall.**

### 4 sources de revenus

| Source | Tarif | Phase |
|--------|-------|-------|
| Établissements privés | **À revoir** (ex-hypothèse ~1 500 €/an, intenable face à Beneylu 299 €/école) | Phase 1 (An 1) |
| Modules premium B2B (analytics directeur) | ~50 €/étab/an | Phase 2 |
| Collectivités & EN | ~25 €/élève/an | Phase 2-3 |
| Partenariats éducatifs (Aria recommande, transparent) | 20-50k €/an | Phase 2 |
| Premium famille optionnel (orientation avancée) | 7-10 €/mois | Phase 3 |

> ⚠️ Tarification et projections à recalculer (session business dédiée). Piste : gratuit pour une classe, offre école sous 299 €, revenus principaux côté collectivités et modules avancés.

### Projections (modèle optimisé — à recalculer)

| An | CA |
|----|-----|
| 1 | 80 000 € |
| 2 | 420 000 € |
| 3 | 1 350 000 € |
| 5 | 6 700 000 € |

Cumul 5 ans : ~11,65M€ · Break-even estimé : An 6-7
Levée recommandée : 500 000 – 800 000 €

---

## 5. Les 3 profils utilisateurs

### Parent / responsable légal
- Email + mot de passe — chaque responsable a son propre compte
- Un foyer regroupe N responsables et N enfants ; consultation d'un carnet à la fois via le sélecteur d'enfant
- Seuls les responsables signent les mots — chacun en son nom (« signature des deux parents » gérée par parent)
- Garde partagée : tout ce qui vient de l'école est partagé ; les échanges privés de chaque responsable restent privés
- Interface mobile (prioritaire) + web (Phase 2)

### Élève
- **Maternelle / Primaire (3-10 ans)** : pas de compte autonome. Accès via PIN 4 chiffres sur le téléphone du parent. Espace bac à sable complet.
- **Collège / Lycée (11-18 ans)** : compte autonome, email + mot de passe, app installée sur son propre téléphone, invité par le parent.
- À 18 ans : devient propriétaire de son compte et de toutes ses données.

### Enseignant
- Email professionnel + mot de passe
- Compte totalement séparé du compte famille
- Redirigé vers le dashboard enseignant à la connexion
- Un parent qui est aussi enseignant = deux comptes séparés

---

## 6. L'espace enseignant — Vision et specs

### Philosophie
L'enseignant ne fait pas de double saisie. Scolaria doit devenir son outil principal — pas un outil en plus de Pronote. L'objectif est de remplacer les ENTs, pas de s'y connecter.

L'interface enseignant doit être **aussi simple qu'envoyer un SMS.** Le moindre frottement = perte de l'enseignant.

### L'enseignant pense en classe, pas en élève individuel
- Message → toute la classe en un clic
- Note → grille de classe (tableau, pas élève par élève)
- Photo → toute la classe

### Fonctionnalités validées (MVP enseignant)

**Indispensable dès V1 :**
- Connexion avec rôle enseignant
- Vue liste de classe
- Envoi message aux parents (collectif ou individuel)
- Types de mots : information, signature (1 ou 2 parents), autorisation, appel à participation
- Suivi lu / signé par mot + relance en un clic
- Ajout d'un mot à l'agenda des familles (date + liste « à prévoir »)
- Absences déclarées par les parents
- Saisie note / observation par élève
- Signalement absence

**Phase 2 :**
- Saisie notes en masse (grille classe)
- Cahier de liaison numérique complet
- Photos / activités de classe postées
- Générateur d'appréciations Aria (enseignant coche 3 compétences → Aria propose 2 formulations → enseignant valide et signe)
- Vue profil élève (forces, ressenti Score de Joie si autorisé)
- Suivi comportement
- Registre d'appel exportable, publication programmée
- Traduction des mots et lecture à voix haute pour les familles

**Phase 3 :**
- Interface directeur (gestion classes, enseignants, accès)
- Dashboard bien-être anonymisé par classe
- Suivi remplaçants

### Ton de l'interface enseignant
Simple et rapide. Gain de temps avant tout. Pas de features superflues.

### Testeurs identifiés
- **Priorité : enseignant(e)s de maternelle / primaire** (segment d'entrée)
- Ami prof d'histoire, collège
- Prof d'EPS

**Stratégie de test :**
1. Session découverte informelle — montrer l'app côté parent, recueillir leurs besoins réels
2. Sprint dédié espace enseignant basé sur leurs retours
3. Build testable par eux
→ Guide d'entretien enseignant produit (avril 2026) — prêt à utiliser

---

## 7. Aria — Vision et déploiement

### Ce qu'Aria est
L'unique point d'entrée intelligent de Scolaria. Elle n'est pas un onglet parmi d'autres — elle traverse toutes les données (notes, agenda, messagerie, Mon Parcours, archives) pour des insights que aucun ENT ne peut produire.

Vision long terme : *"Retrouve la photo de la sortie au zoo en CE1."*

### Les 4 stades de déploiement

| Stade | Phase | Ce qu'Aria fait |
|-------|-------|-----------------|
| 1 — Visuelle Passive | Phase 1 | Présente visuellement, crée l'habitude |
| 2 — Analytique | Phase 2 | Profil d'apprentissage, rapport mensuel, style visuel/auditif |
| 3 — Préventive | Phase 3 | Alertes décrochage, suggestions activités, détection bien-être |
| 4 — Agentique | Phase 4 | Actions sur instruction — messages, justifications, RDV, orientation |

### Règles éthiques Aria (non négociables)
- Jamais de diagnostic — elle suggère et observe
- Toujours citer ses sources pour chaque alerte
- Gradation des alertes (Attention / Vigilance / Urgence) — jamais d'alerte rouge sur signal isolé
- Protocole urgence : mots-clés critiques → numéros d'aide (3020, 3114, 119) + alerte parent + aucune réponse IA seule
- En mode archive : lecture seule, pas d'alertes Score de Joie

---

## 8. Charte éthique — Principes clés

Document public complet : ScolarIA_Charte_Ethique_v1.pdf

**7 principes fondateurs :**
1. **Non-Substitution** — Aria ne remplace jamais un professionnel
2. **Transparence Algorithmique** — Aria explique toujours pourquoi
3. **Souveraineté des données** — hébergement OVH France, zéro revente, zéro pub
4. **Gradation & Anti-Panique** — cinétique sur 5 jours, jamais sur signal isolé
5. **Neutralité & Anti-Biais** — aucune comparaison entre enfants, filières pro = filières générales. La comparaison d'un enfant avec lui-même sur plusieurs années est autorisée (Aria stade 2+), en tendance, sources citées
6. **Protection Hyper-Connexion** — mode sommeil 20h-7h, max 1 alerte non urgente / 48h
7. **Protocole d'urgence** — Aria sort de son rôle, connecte l'humain à l'humain

**Score de Joie :**
- Fenêtre glissante 5 jours
- Présenté comme tendance (pas chiffre brut)
- Révisable par le parent (contexte : maladie, événement familial)

**Badge Super-Pouvoir :**
- Formulation toujours positive, basée sur les forces
- Mis à jour tous les 3 mois — jamais figé
- Partageable uniquement sur initiative du parent

**Comité Éthique :**
- Psychologue scolaire, chercheur sciences de l'éducation, juriste RGPD, représentant parents
- Valide chaque stade Aria avant mise en production
- Rapport public annuel

---

## 9. Roadmap produit

### MVP terminé (Avril 2026)
Interface parent complète : Accueil, Notes, Agenda, Messagerie, Aria chat, design system v2.0, demo mode (Famille Moreau : Léa/maternelle, Lucas/primaire, Emma/collège), APK Android prêt.

### Addendum v3.4 (septembre 2026) — priorité avant la queue
1. Nettoyage des anciennes décisions (fond, emoji matières, FAB, thèmes par niveau)
2. Foyer multi-responsables + signature par parent
3. Notes → Suivi (compétences maternelle/primaire, Notes v7 conservé collège/lycée)
4. Ajouter au carnet (import parent)
5. Types de mots, suivi lu/signé, agenda alimenté par les mots
6. Notifications : défaut activé, prénom de l'enfant, résumé 18h

### Queue immédiate (priorité décroissante)
1. Aria voice input V1 (micro déjà dans l'UI, expo-speech)
2. Graphe progression notes (courbe lissée, Suivi collège/lycée)
3. Personnalisation matières (couleur uniquement)
4. Devoirs et « à prévoir » cochables dans l'agenda
5. Push notifications (iOS + Android)
6. Indicateur professeur absent sur l'agenda
7. **Interface enseignant MVP** (prochain sprint majeur)
8. Photos / fichiers joints dans les messages

### Horizon Phase 2
- iOS App Store (compte Apple Developer ~99$/an)
- Interface directeur d'école
- Bilan annuel généré par Aria
- Archives années passées avec navigation longitudinale
- Aria voice responses

### Horizon Phase 3+
- ÉduConnect optionnel (jamais obligatoire)
- Internationalisation (Europe francophone, Maghreb)
- Expansion collège/lycée via continuité
- Mémoires de fin d'année
- Simulateur d'orientation

---

## 10. Principes non négociables

- Scolaria est **gratuit pour les familles** — à jamais
- Scolaria **remplace les ENTs** — ne s'y connecte pas (l'import manuel par le parent de ses propres documents n'est pas une connexion)
- **Un enfant = un carnet** — jamais de vue mélangeant plusieurs enfants
- **Pas d'ads, jamais**
- **Pas de comparaison entre enfants**
- **Données hébergées en France** (OVH), jamais hors UE
- **Aria propose, l'humain décide** — pour tout acte irréversible
- **"Scolaria"** — jamais ScolarIA, jamais avec IA en majuscules
- **Pas de full-width buttons** dans le design system
- **Indigo #4338CA seul accent** — dégradé #6366F1→#22D3EE réservé à Aria ; violet #7C3AED supprimé

---

*VISION.md · Scolaria · Septembre 2026 · Document confidentiel*
