# TODO — Scolaria

## PHASE B · écrans branchés sur le modèle de la Phase A (plan du 23 sept 2026)

**Statut : PLAN VALIDÉ (24 sept). B1 et B1-bis validés sur le Redmi. B1-ter, B2, B2-bis et B2-ter FAITS (24 sept), À VÉRIFIER SUR LE REDMI. B3 : NE PAS lancer sans feu vert.**

### B3a (25 sept) — Suivi › Apprentissages
- M17 + M18 appliquées en prod (sauvegarde hors dépôt : C:\Users\admin\ScolariaBackups\2026-09-25_avant_M17_M18), 36/36 tests locaux, advisors 0 ERROR.
- B3a.2 référentiels (d84dd53) ; B3a.3 démo + Accueil branché, carnet.ts supprimé (2135ea7) ; B3a.4 UI (1a265cd) ; B3a.5 couleur (a801271).
- Vérifié sur le web (393 dp) : Emma 8/20 le 19, 17/20 le 16, 13/20 le 24 identiques Accueil / Suivi / Messages ; Lucas et Léa : mêmes éléments Accueil / Suivi.
- [ ] Redmi : Léa (6 domaines, aucun niveau), Lucas P1 (barres 3 segments, recopie « Atteint » en 4), Emma inchangée. PRÉVENIR avant de prendre la main.
- Primaire en trimestres (choix de l'école, jamais par défaut) : libellé « 1er trimestre » en toutes lettres, jamais « T1 » (décision du 25 sept ; pas d'interdiction serveur).
- [ ] Compte réel : découpage non résolu côté app (défaut « périodes ») → appeler decoupage_annee() quand le Suivi réel sera branché.

### B3b — à faire (décidé le 25 sept)
- [ ] Segmented control Apprentissages · Souvenirs · Livrets, avec le contenu de Souvenirs et Livrets.
- [ ] M19 : `academic_years.statut` modifiable uniquement par le serveur (le passage d'année est une opération serveur). Tests comme M18 (parent refusé ; postgres / service_role autorisés ; création d'enfant intacte).

### Plan payant Supabase (à faire au passage en Pro)
- [ ] Activer « Leaked password protection » (HaveIBeenPwned) : Pro et au-dessus seulement (doc « Password security »). Dashboard → Authentication → Providers → Email.

### INFRA-1 — migration Paris (validée le 25 sept, plan : tasks/infra-1-plan.md)
- [x] Étapes 0 à 4 FAITES (25 sept) : sauvegarde ; projet Paris nmizwmymhqleasnxcyvu (eu-west-3) ; 26 migrations (baseline corrigée) ; schéma identique à Londres hors pg_graphql (non activé, inutilisé) et un commentaire ; données transférées (2 comptes, 2 enfants ; compte du 21 mars resté à Londres) ; RLS vérifiée ; Storage vide. CLI liée à PARIS.
- [ ] Étape 10 : RAPPELER à l'utilisateur de révoquer l'ancienne clé Anthropic (projet Londres) après la bascule réussie ; la nouvelle clé est dédiée au projet Paris.
- [ ] Après migration réussie : remplacer « OVH France » et « aucun transit hors UE » dans CLAUDE.md, VISION.md et la charte par la formulation validée (texte exact dans tasks/infra-1-plan.md § « Formulation validée »).
- [ ] Mettre à jour cette formulation quand Aria lira le carnet (stade 2).
- [ ] Charte : mentionner que le texte des notifications (prénom de l'enfant) transite par Apple et Google.

### Compte sans profil
- [ ] Gérer dans l'app un compte auth sans ligne `profiles` (cas réel : compte du 21 mars 2026, resté à Londres, non transféré) : message clair ou fin d'inscription, **jamais d'écran blanc**. Avec un test.

### BLOQUANT avant toute famille réelle
- [ ] **Lot « Emails et liens Auth »** (un seul lot) :
  - Brevo + nom de domaine d'envoi (SPF, DKIM) configurés dans Supabase Auth (SMTP par défaut = équipe du projet seulement) ;
  - modèles d'email en français : confirmation, invitation, réinitialisation, changement d'email (aujourd'hui : textes Supabase par défaut, en anglais) ;
  - Site URL + Redirect URL vers l'app (`scolaria://`) (aujourd'hui : Site URL `http://localhost:3000`, aucune Redirect URL, Londres = Paris) ;
  - test de bout en bout : inscription → email → lien qui ouvre l'app → compte confirmé → invitation du second responsable acceptée.

### Aria
- [ ] Écran d'information Aria à la première utilisation (ce qui part chez Anthropic, où, combien de temps).
- [ ] Aria désactivable (Famille & paramètres) : désactivée = aucun appel au modèle.

### Avant le premier contrat école / mairie
- [ ] Aria via Amazon Bedrock en Irlande (eu-west-1), point de terminaison régional unique — PAS le profil « EU » (inclut Londres et Zurich). Changement de fournisseur isolé dans l'Edge Function `aria` (l'app ne change pas).

### B3-0 (24 sept) — corrections avant B3
- Agenda : maternelle et primaire sans créneaux de cours (journée type dans « Emploi du temps », primaire seulement) ; Léa = 3 événements de GS en semaine ; tri par heure tous types, devoirs en tête sans horaire (« Pour aujourd’hui / demain / date ») ; voile du bas toujours visible + élévations Android ; bouton Emploi du temps sur sa ligne (44 px).
- Docs : Agenda = « + » de la bottom bar, pas de FAB ; §17 échelle 3 niveaux (Non acquis · Partiellement acquis · Acquis) ou 4 LSU ; bouton année « 2026–2027 · CM2 ⌄ » ; VISION : 3114, 3018, 119, 112.
- [x] ~~**Aria, écart constaté** : UUID de l’enfant dans la consigne de l’action « signaler une absence »~~ → **corrigé en B3-0-bis** : balise sans identifiant ; l’app attache l’id de l’enfant affiché à l’exécution (un `student_id` écrit par le modèle est ignoré) ; historique d’AriaScreen nettoyé des balises. Seuls prénom + niveau partent au modèle.

### B2-ter (24 sept) — règles par niveau et réponses aux 3 questions
- **Règle corrigée** (l'ancienne « devoirs / emploi du temps réservés au collège » était fausse) : maternelle = ni devoirs ni filtre « Devoirs » ni emploi du temps ; CP à CM2 = filtre « Devoirs » + devoirs de primaire + emploi du temps en journée type ; collège / lycée inchangé. `utils/niveau.ts` : `aDesDevoirs`, `aUnEmploiDuTemps`.
- Lucas (CM2) : devoirs de démo remis et rendus crédibles (leçon d'histoire, tables de 7 et 8, lecture du Petit Prince, fractions, poésie de La Fontaine, dictée préparée ; « Évaluation de maths »), salles « Classe de CM2 B ». Onglet Devoirs primaire dédié. Échéances toujours sur un jour d'école.
- Emploi du temps : construit depuis l'agenda de démo de l'enfant actif (semaine en cours, semaines précédente / suivante) ; Lucas = Mme Dupont (EPS : M. Garcia) ; Emma = enseignants de l'univers démo.
- Q1 (espace enseignant) : tableau de bord et météo de classe sans chiffre, sans %, sans vert/rouge, sans alerte ni « analyse IA » ; tendance en mots ; liste en ordre alphabétique (aucun classement par Score de Joie).
- Q2 (agenda de démo) : dates recalées sur la semaine courante (`DemoContext`, même jour de la semaine) ; cours répétés la semaine suivante.
- Q3 (compétences sur 10) : section « Compétences clés » du profil, compétences de l'export PDF et « Points forts » du mémo supprimés → refonte en B3. Au passage : le bloc « Bien-être général » (joie /10) du mémo de transition, que B2-bis croyait retiré, l'est vraiment.

### B2-bis (24 sept) — conformité charte
- Score de Joie : plus aucun chiffre ni alerte côté parent (profil, curseur du ressenti, export PDF, mémo de transition, réponses de démo d’Aria). Profil : « Tendance sur 5 jours : stable / plutôt en hausse / plutôt en baisse » (écart > 10 % entre les 5 derniers relevés et les 5 précédents), rien sous 10 relevés. JoyAlerts / JoyHistory supprimés.
- Mon ressenti : détection d’urgence = `detectEmergency` partagé (celui d’Aria, 22 cas testés) au lieu d’une liste maison ; mention « chiffrées, partagées avec personne » (inexacte) remplacée par « Visible uniquement par les responsables de l’enfant ».
- Super-pouvoir : étiquettes sans emoji, mention « Observé par Aria » retirée (aussi dans le texte partagé). L’emoji principal du super-pouvoir (🔭) est gardé (contenu).
- Agenda : ~~devoirs de démo réservés au collège / lycée~~ (règle erronée, corrigée en B2-ter : devoirs dès le CP) ; filtre « Devoirs » masqué en maternelle (et remis sur « Tout » au changement d’enfant). Cause : le calcul des devoirs n’était fait qu’une fois (dépendances vides). Au passage : choisir un jour dans le calendrier du mois ne rechargeait pas la semaine (événements de la semaine en cours) → corrigé.
- Fond de l’Accueil : page profonde (‹ + titre, sans barres). Élision « de / d’ » : `utils/francais.ts` `de()` (profil, couleur, avatar, autorisations, ajout enfant / année, carte Aria, confirmation de signature).
- Aria : vouvoiement dans les écrans, suggestions, réponses de démo, cartes ; consigne serveur fixe ajoutée par l’Edge Function (déployée).
- État vide Agenda : icône lucide CalendarCheck.
- ~~3 questions (espace enseignant, dates de l'agenda de démo, compétences sur 10)~~ → répondues et faites en B2-ter.

### Choix à valider (pris en autonomie, le plus simple et conforme à CLAUDE.md)
- ~~Header Accueil, bas arrondi~~ → **remplacé le 24 sept par un fondu** (décision produit) : rgba(couleur, 1 → 0), 10 arrêts ease-out, ~300 px, cartes flottantes ; libellés sur le fondu en blanc (opacité ≥ 0,6) ou gris 55 %. Contrastes vérifiés sur les 6 couleurs (pire : sarcelle, « Bonjour » 5,1, « À FAIRE » 4,8). Photo : voile #F2F1EE d’opacité (1 − a), identique à une photo qui disparaît sur fond uni (MaskedView évité).
- **Top bar posée sur le header coloré (au repos)** : même forme qu’en §0, couleurs claires : pill active blanc 22 %, icône + libellé blancs, inactifs SANS fond en blanc 78 %, burger cercle blanc 22 %, barre d’état claire. Dès 8 px de défilement : couleurs §0. (La pill blanche opaque et les ronds gris refusés en B1-bis ne reviennent pas.)
- **Retour par glissement** : autorisé sur toute route qui n’est pas une racine d’onglet, départ du doigt à moins de 40 px du bord gauche, déclenché à 70 px (ou 30 px si rapide). Exclu : SignSuccess (revenir au formulaire déjà signé n’a pas de sens).
- **Couleurs d’enfant** : 6 couleurs (Indigo #4338CA, Océan #0369A1, Sarcelle #0F766E, Framboise #BE185D, Ardoise #334155, Pierre #57534E) ; exclus : ambre (Score de Joie), violet, vert, rouge ; toutes lisibles avec une initiale blanche.
- **Fond photo de l’Accueil** : voile sombre rgba(15,23,42,0.28) sur la photo pour garder « Bonjour + prénom » lisible en blanc.
- ~~**Emploi du temps, cahier de texte, bulletin de démo** : réservés au collège / lycée~~ → **corrigé en B2-ter** : emploi du temps et devoirs dès le CP (Lucas : journée type de CM2) ; bulletin et cahier de texte de démo restent ceux d'Emma (collège).
- **Compétences de démo de Lucas** : intitulés rédigés pour la démo, « dans l’esprit » du LSU ; les intitulés officiels (Éduscol) sont à reprendre en B3.
- **Compte réel avec enfant** : Accueil, Notes, Agenda, Messages affichent des états vides (« Rien de prévu aujourd’hui », « Aucune note pour l’instant »…) tant que ces données ne sont pas branchées sur la base — jamais de démo.
- **Aria, compte réel** : le modèle reçoit prénom + niveau seulement (aucune donnée du carnet encore). L’action « signaler une absence » est gardée ; l’action « envoyer un message » est retirée du prompt réel (aucune conversation réelle à cibler).
- **Profil de l’enfant (écran ancien)** : pour un enfant réel, super-pouvoir, compétences sur 10, Score de Joie et portfolio sont masqués tant qu’ils sont vides (règle « jamais de module vide visible ») ; refonte à prévoir.
- **Écrans RGPD** (journal, codes, effacement, export) : correctif minimal (démo uniquement, enfant actif, volumes fictifs masqués) ; la refonte RGPD complète reste un chantier à part.
- **Notifications « Conseil du matin »** : supprimées sans remplacement (le résumé de 18h viendra avec les vraies notifications push).

### Questions pour toi (rien de destructif n’a été nécessaire en B1-ter / B2)
- Aucune migration destructive requise. M13 (`children.fond`) et M2f sont des ajouts.
- [UNCLEAR] Détail d’un événement : le badge « Inscrite » (féminin, figé) s’affiche pour tout événement → à revoir avec B6 (Agenda).
- [UNCLEAR] L’onglet Notes (vue maternelle de démo) garde l’image de fond globale (WallpaperContext) → à retirer en B3 ?
- ~~Emploi du temps de démo d’Emma : semaine figée « Semaine 18 · 4–10 mai 2026 »~~ → semaine en cours (B2-ter).

Regroupe tout ce qui est noté « Phase B » plus bas (navigation, enfant actif, FAB Agenda, couleur de l’enfant, types de mots, invitations, import, Aria, droit à l’image).

**Règles communes à chaque lot**
- Un lot = un commit, testable seul. Arrêt et test sur le Redmi (`npm run dev:android`) avant le lot suivant : le web ne prouve rien pour Android.
- Avant chaque lot : grep des motifs touchés (leçons du 17 avril et du 23 sept) ; `Pressable` / `Text` / `TextInput` depuis `components/ui` ; pas de `gap` en ligne ; pas de `sed -i` sur src/.
- Après chaque lot : `tsc --noEmit`, contrôle web, checklist Redmi du lot, lessons.md, primer.md.
- Toute migration : `supabase db push` (dry-run d’abord), script inverse dans `migrations_down/`, tests SQL en transaction annulée, advisors 0 ERROR.
- Estimation en **sessions** (≈ une séance de travail Claude Code + un test Redmi). Total : **13 à 19 sessions**.

**Constats du code (23 sept) qui fixent les estimations**
- Enfant actif : `ActiveChildContext` existe mais 20 fichiers le lisent par des chemins différents ; 19 écrans / composants contiennent encore Emma / Léa en dur (Accueil, Timetable, Homework, Bulletin, GradeDetail, SignDoc, SignSuccess, MonParcours, Aria ×3, RGPD ×3…).
- Navigation : swipe `PanResponder` dans `TabNavigator.tsx:777-868` (retour + ouverture burger) ; `ChildSelectorSheet` contient encore Réglages et Déconnexion (`:126`, `:136`) ; `ReglagesScreen` (661 l.) et « Mon compte » (BurgerMenu) coexistent.
- Suivi : `NotesScreen` (2424 l.) ne distingue que maternelle / autre (`:1104`) ; pas de vue primaire LSU ni de segmented.
- Messages : filtres actuels Tout / Non lus / Messages / École / Absences (`MessagerieScreen.tsx:74`).
- Agenda : `agenda_events.mot_id` **n’existe pas en base** (prévu au plan M5, non fait) ; « À prévoir » d’EventDetail = état local non enregistré.
- Import : `expo-image-picker` et `expo-document-picker` déjà installés ; **aucun bucket Storage** en migration.
- Aria : suggestions en cartes (`AriaHomeScreen.tsx:542-550`), `makeSuggestions(childName, mode)`.

### B1 · Navigation — FAIT et VALIDÉ sur le Redmi (24 sept), corrections en B1-bis
Objectif : ☰ → « Famille & paramètres » ; avatar → sélecteur d’enfant seul ; plus de swipe d’ouverture ; top bar en voile (déjà fait, commit 4914e8d → contrôle seulement).
- [x] Nouvel écran `FamilleParametresScreen` (route `FamilleParametres`, chrome 'none', page profonde §8) : Mes enfants (row → profil de l’enfant, « Ajouter un enfant ») · Responsables légaux (vous seul pour l’instant → B4) · Mon profil · Apparence (Fond de l’Accueil) · Notifications (3 interrupteurs : mots et messages / résumé 18h / silence 20h–7h) · Aria (activée, personnalité, langue de saisie vocale) · Confidentialité & données (autorisations, journal, export, effacement) · Compte (à propos, déconnexion / quitter la démo, avec Alert).
- [x] ☰ ouvre DIRECTEMENT cet écran. Supprimés : `BurgerMenu.tsx` (tiroir sombre + animation + overlays), `ReglagesScreen`, `EditProfileScreen` (« Mon compte », fusionné), `NotificationsSettingsScreen` (matrice par module, interdite ; écrivait une colonne `profiles.notification_preferences` qui n’existe pas), `TextSizeScreen` (réglage lu nulle part). Supprimés aussi : Capacités, Connecteurs, Liens partagés, Thème Auto, « Résumé quotidien 8h00 », fonds dégradés abstraits (WallpaperPicker : photos nature uniquement).
- [x] Swipe : plus aucune ouverture de menu ; le retour arrière par swipe depuis le bord est conservé (pages avec flèche + ProfilEnfant, BienEtre, FamilleParametres). Fond racine #0F172A → #F2F1EE.
- [x] `ChildSelectorSheet` : Réglages et Déconnexion retirés ; « Ajouter un enfant » (indigo). Point de nouveauté par enfant → B2 (aucune donnée de nouveauté aujourd’hui).
- [x] Espaces enseignant et élève : leur onglet Réglages affiche le même écran (`espace` = enseignant / eleve, titre « Paramètres », sans sections famille, sans bouton retour).
- [x] Navigation imbriquée avec `initial: false` (☰, « Ajouter un enfant », recherche rapide) : sans ça l’écran devenait la racine de la pile Accueil et le retour n’avait nulle part où aller.
- [x] `chrome.ts`, SCREEN_TITLES, recherche rapide (« Famille & paramètres », « Fond de l’Accueil »), `DeepScreenHeader` (retour facultatif).
- [x] tsc OK ; web (375×812, mode démo) : ☰ → écran complet, retour → Accueil, Journal d’accès s’ouvre et se ferme, avatar → sélecteur sans réglages, « Ajouter un enfant » → formulaire. Déconnexion non testable en web (Alert inactif sur react-native-web).
- Non affiché volontairement (rien ne fonctionne derrière) : code de déverrouillage (aucun verrou dans l’app, « Face ID » était un libellé fixe), retour haptique (aucun appel haptique dans l’app), centre d’aide (aucun écran).
- [UNCLEAR] Préférences Notifications et Aria enregistrées sur l’appareil seulement (`@scolaria:prefs`) : rien ne les lit encore (pas de push, Aria ne lit pas le ton). À brancher avec les notifications push / l’Edge Function.
- [UNCLEAR] « Mon Ressenti » (Score de Joie) et « Mon parcours » n’étaient accessibles que par l’ancien tiroir : restent accessibles via la recherche rapide ; Mon parcours revient par le bouton année de Suivi (B3). Emplacement de Mon Ressenti à décider.
- Reste : `QuickActionsSheet` navigue encore sans `initial: false` (à corriger en B5, qui la refait) ; Fond de l’Accueil choisi mais pas encore affiché sur l’Accueil (B2, M13).

#### Checklist Redmi · B1 (`npm run dev:android`)
1. Accueil : tap ☰ → « Famille & paramètres » s’ouvre en plein écran, sans top bar ni bottom bar, flèche ‹ en haut à gauche.
2. ‹ → retour à l’Accueil. Recommencer, puis swipe depuis le bord gauche → retour à l’Accueil.
3. Sur l’Accueil : swipe depuis le bord gauche → AUCUN menu ne s’ouvre ; swipe horizontal au milieu → le pager change d’onglet (Accueil → Notes…).
4. Défilement de « Famille & paramètres » jusqu’en bas : groupes blancs, séparateurs gris, police Figtree partout, pas de ligne coupée, pas de contour gris (elevation).
5. Interrupteurs Notifications et Aria : ils basculent ; quitter et revenir → l’état est conservé. Pills de personnalité : sélection noire.
6. Chaque ligne : Léa / Lucas / Emma → profil de l’enfant ; Ajouter un enfant → formulaire ; Fond de l’Accueil → 5 photos nature, aucun dégradé ; Autorisations / Journal d’accès / Exporter / Effacement → feuille qui s’ouvre et se ferme ; À propos → écran.
7. « Quitter la démo » → confirmation native, Annuler ne fait rien, Quitter → écran d’ouverture.
8. Avatar (en haut à droite) → sélecteur : e-mail, 3 enfants, coche sur l’enfant actif, « Ajouter un enfant » ; plus de « Gérer les enfants » ni de « Se déconnecter ». Changer d’enfant → la feuille se ferme.
9. Voile : sur Notes et Agenda, faire défiler → fondu #F2F1EE sous la top bar et au-dessus de la bottom bar, jamais de bandeau opaque au repos.
10. Retour matériel Android depuis « Famille & paramètres » → Accueil (pas de sortie de l’app).

### B1-bis · Corrections après test Redmi — FAIT (24 sept), À VÉRIFIER SUR LE REDMI
- [x] 1. Top bar (COMPONENTS §0) : onglet actif = pill rgba(15,23,42,0.08), 30 px, icône + libellé ; inactifs = icône seule SANS fond, rgba(15,23,42,0.38). Plus de variante « sur header » (pills blanches) : cause = la barre était posée sur le header indigo plein écran de l’Accueil. **Header de l’Accueil passé en carte 130 px sous la barre** (radius 20, marge 12, indigo neutre ; couleur / fond de l’enfant en B2). Burger = cercle 34 px rgba(15,23,42,0.08) ; avatar bordure 2 px rgba(15,23,42,0.15) ; fontWeight retiré du libellé.
- [x] 2. Tagline : « Pour les familles françaises » (À propos) → « Le carnet de scolarité numérique ». « Passeport scolaire » → « carnet de scolarité » (fr.ts ×3, PDF ×3). Restent volontairement : phrases descriptives de CLAUDE.md / VISION.md / prompt d’Aria (« … des familles françaises », pas une tagline).
- [x] 3. À propos réécrit en page profonde (§8) : retirés « 100 % Données en Europe », « AES-256 », « RGPD Conforme », « Conforme RGPD · CNIL · Données hébergées en France », le bloc Technologies (Google Vision jamais utilisé, « chiffrement E2E », « hébergement UE »), les emoji-icônes. Gardés : aucune publicité, données jamais revendues (icônes lucide). Charte = 7 principes de VISION.md §8 (dépliables).
- [x] 4. Autorisations : rôles fictifs retirés (famille proche, accompagnant, accès minimal, grand-mère, assistante maternelle, médecin, 4 niveaux, modules). Affiche les vrais responsables légaux de l’enfant actif + invitations en attente + « Inviter un responsable » (insert invitations_responsable, acceptation par l’invité à l’email confirmé). Migration **M2f** `20260924130000_m2f_liste_responsables` : RPC `responsables_enfant(child_id)` (DEFINER, lecture seule, prénom / nom / lien / vous, jamais l’email) — nécessaire car profiles_select masque le nom de l’autre responsable. Tests SQL (transaction annulée, 0 donnée restante) : A et B voient 2 responsables (« vous » en premier), C (sans lien) 0, anon sans droit d’exécution. Advisors : 0 ERROR (WARN voulu : fonction exécutable par authenticated). 23/23 migrations alignées. Entrée masquée dans les espaces enseignant / élève. Fonctions `person_permissions` de rgpdService supprimées (table conservée, inutilisée).
- [x] 5. « Ajouter un enfant » et « À propos » : pages profondes (chrome 'none', en-tête ‹ + titre centré, swipe retour), plus de bottom bar sur le bouton. Espaces enseignant / élève : en-tête natif masqué sur À propos.
- [x] 6. Formulaire : avatars emoji → couleur de l’enfant (6 couleurs, `constants/childColors.ts`, sans ambre / violet / vert / rouge ; avatar = initiale sur la couleur, envoyée à create_child). « Classe » → **Niveau** obligatoire (PS → Terminale) + **école facultative** en texte libre, pas de liste de classes. Pied « conformes au RGPD » retiré.
- [x] Composant partagé `components/DeepList.tsx` (groupes / rows §8) : Famille & paramètres, À propos, Autorisations.
- [x] tsc OK ; web 375×812 démo : pills conformes, header en carte, Autorisations (2 responsables + formulaire d’invitation), À propos (7 principes dépliables, sans barres), Ajouter un enfant (couleur, niveau, bouton visible).
- [ ] **Idée future (VISION)** : accès partiels pour les proches (grands-parents, nounou) — lecture limitée à certains modules, révocable, journalisée. Table `person_permissions` existante mais non branchée. Ne pas afficher avant d’être réel.
- [UNCLEAR] VISION.md §8 principe 3 annonce « hébergement OVH France » : faux aujourd’hui (Supabase eu-west-2 = Londres ; Aria = Anthropic hors UE). À corriger dans VISION.md / CLAUDE.md (§ RGPD : « Hébergement OVH France », « AES-256 ») ou à rendre vrai.
- [UNCLEAR] wo.ts (wolof) contient encore « passeport scolaire » ×3 : je ne traduis pas en wolof sans relecture.
- [UNCLEAR] contact@scolaria.fr : adresse conservée dans À propos, non vérifiée (domaine détenu ?).
- Reste : saisie de la date de naissance serrée en rendu web (déjà le cas avant) → à vérifier sur le Redmi.

#### Checklist Redmi · B1-bis (`npm run dev:android`)
1. Top bar sur les 4 onglets : l’onglet actif est une pill grise (icône + libellé), les autres sont des icônes seules grises SANS rond derrière. Jamais de pill blanche, y compris sur l’Accueil en haut de page.
2. Accueil : le bandeau « Bonjour Léa » est une carte indigo arrondie de 130 px SOUS la top bar, avec 12 px de marge à gauche et à droite ; la barre du haut est sur le fond clair.
3. Faire défiler l’Accueil : le voile apparaît sous la barre, les pills restent identiques.
4. ☰ → Autorisations : seulement « Moreau (vous) » et « Marc Moreau », plus « Inviter un responsable ». Aucun grand-parent, nounou, médecin, niveau d’accès ni module.
5. « Inviter un responsable » → champ e-mail + bouton pill « Envoyer l’invitation » ; en démo, message « Aucune invitation n’est envoyée en mode démo ».
6. ☰ → À propos : en-tête ‹ + « À propos », AUCUNE barre en haut ni en bas ; tagline « Le carnet de scolarité numérique » ; engagements = « Aucune publicité » et « Vos données ne sont jamais revendues » ; charte = 7 principes qui se déplient ; aucune mention d’Europe, AES-256, RGPD conforme.
7. ☰ → Ajouter un enfant (et avatar → Ajouter un enfant) : en-tête ‹ + titre, AUCUNE bottom bar ; le bouton « Ajouter … » est entièrement visible et cliquable en bas de page, clavier ouvert compris.
8. Formulaire : 6 pastilles de couleur sur une ligne, l’aperçu rond montre l’initiale du prénom sur la couleur choisie ; « Niveau * » propose PS → Terminale ; « École (facultatif) » ; le bouton reste grisé tant que prénom, date et niveau manquent.
9. Saisie de la date de naissance (JJ / MM / AAAA) : chiffres lisibles, séparateurs non superposés.
10. Swipe depuis le bord gauche sur À propos et Ajouter un enfant → retour.

### B1-ter · Corrections du test Redmi B1-bis — FAIT (24 sept), À VÉRIFIER SUR LE REDMI
- [x] 1.1 Header de l’Accueil pleine largeur (remplace la carte 130 px, décision produit) : premier élément du défilement, passe derrière la barre d’état et la top bar, couleur de l’enfant (`children.color`, démo : Léa teal), haut sans arrondi, bas arrondi 28 px, « Bonjour » + prénom en blanc, barre d’état claire au repos ; au défilement il part avec le contenu, le voile apparaît et la top bar repasse en §0. CLAUDE.md (§ Headers d’écran) et COMPONENTS.md (§6) mis à jour.
- [x] 1.2 Retour par glissement : **cause** — le retour était envoyé à la navigation de l’écran racine (`MainPager`) ; ne sachant pas le traiter, elle le laissait au navigateur d’onglets, qui revenait à l’onglet précédent (s’il y en avait un) au lieu de dépiler la page ; s’y ajoutaient une liste de routes codée en dur et une vitesse minimale. **Correctif** : `navigationRef` unique (App.tsx) → `goBack()` sur le navigateur focalisé le plus profond ; geste capté avant les enfants (ScrollView, Pressable), seulement s’il part du bord ; règle générale `canSwipeBack()` (chrome.ts). En test web, `gestureState.x0` valait 0 avant l’attribution du geste (tout glissement au milieu revenait en arrière) → abscisse de départ mémorisée à part.
  - Pages profondes vérifiées une par une en web (glissement simulé depuis le bord → retour à la racine de l’onglet), 36/36 OK : **Accueil** SignalerAbsenceScreen, BienEtreScreen, ProfilEnfant, AjouterEnfant, AjouterAnne, MonParcours, FamilleParametres, RGPDScreen, PermissionsRGPD, JournalAcces, TransfertCode, Effacement, ExportDonnees, APropos, AriaHome, AriaConversation, WallpaperPicker, Homework, Timetable, SignDoc, ArchivedYearDetail · **Notes** BulletinScreen, GradeDetail, SubjectDetail · **Agenda** EventDetail · **Messages** SignalerAbsence, MessagesListScreen, AbsencesListScreen, EcoleListScreen, MessagerieAriaScreen, ConversationDetailScreen, MotDetailScreen. Glissement au milieu d’une page : aucun retour. Glissement sur une racine : rien.
  - Outil de test : `globalThis.__navRef` exposé en développement uniquement (`__DEV__`).
- [x] 1.3 À propos : ligne contact@scolaria.fr retirée.

### B2 · Enfant actif — FAIT (autonomie, 24 sept), À VÉRIFIER SUR LE REDMI
Commits : 4f96a2f (2.1) · 409dba0 (2.2 + 2.5) · b6d1524 (2.3) · 44bcb76 (2.4) · 2604eee (2.6) · 31fb012 (2.7). Advisors : 0 ERROR (WARN voulus uniquement). Migrations : 24/24 alignées.
- [x] 2.1 Source unique : `ActiveChildContext` réécrit — démo = enfants Moreau (depuis demo-children.json) UNIQUEMENT en mode démo ; compte réel = ses enfants en base ; `selectedChild: Child | null` ; dernier enfant consulté persisté par compte (`@scolaria:enfant_actif:<user>`) ; `niveau` + `cycle` (utils/niveau.ts) ; mode scolaire dérivé du cycle ; `reloadChildren(preferId)` après ajout (et `createChild` : l’erreur n’était pas vérifiée → « Enfant ajouté » affiché même en cas d’échec, corrigé). Supprimés : GlobalChildSwitcher (jamais ouvert), ChildThemeContext (passe-plat). Pages qui exigent un enfant (Profil, Signaler une absence, Mon parcours, Bien-être) : garde → état vide `AucunEnfantPage`. Messages : plus de conversations / mots / enseignants fictifs pour un compte réel. Web : bascule Léa → Emma, rechargement → Emma conservée.
- [x] 2.2 Démo ou compte réel : Accueil d’un compte sans enfant = « Bienvenue dans Scolaria » + « Ajoutez le carnet de votre premier enfant » + pill « Ajouter un enfant » (`AucunEnfant`) ; Notes, Agenda, Messages : même état vide sous la top bar (`AucunEnfantOnglet`). Données de secours fictives retirées : `MOCK_SUBJECTS` (Notes), `MOCK_EVENTS_BY_DAY` (Agenda), mocks de MessagesList → listes vides pour un compte réel. Contenu de l’Accueil par enfant : `data/demo/carnet.ts` (référence unique de l’univers démo). Devoirs de démo : collège, mode démo uniquement.
  - Non testé en web : compte réel sans enfant (je ne crée pas de compte) → checklist Redmi avec le compte de test.
- [x] 2.3 Données en dur : plus aucun prénom affiché hors de l’enfant actif (restent des données de démo indexées par id, visibles uniquement pour cet enfant en mode démo, et l’espace enseignant, hors périmètre).
  - **Aria (grave)** : pour un enfant RÉEL, `getChildContext` retombait sur la démo (par prénom : un « Emma » réel recevait les notes de l’Emma de démo ; sinon Léa) et ces données partaient à Anthropic. Corrigé : enfant réel = prénom + niveau seulement ; sans enfant = contexte neutre ; exemple « Léa » retiré du prompt ; plus de défaut `demo-lea`. `npm run test:emergency` : 22/22.
  - **Notifications (grave)** : `scheduleConseilDuMatin()` programmait pour TOUT compte 7 push hebdomadaires à 7h30 sur « Lucas » (données fictives). Supprimé ; au démarrage, les anciennes sont annulées. Composant ConseilDuMatin (mort) supprimé.
  - Profil de l’enfant : un enfant réel héritait des traits / compétences / portfolio / super-pouvoir de l’Emma de démo → profil neutre, blocs vides masqués. Mon parcours : plus d’années d’Emma par défaut.
  - Signature : document passé en paramètre (détails par enfant dans carnet.ts), enfant = enfant actif ; « Signature légale » → « Horodatage automatique » (eIDAS = Phase 2-3). Justifier une absence : prénom de l’enfant actif, plus de « Sophie Martin ». Détail de note : « Féliciter [prénom] ». Signaler une absence : plus de « Parent Moreau ».
  - Emploi du temps, cahier de texte, bulletin de démo : collège, mode démo uniquement (sinon page vide) ; bouton « Emploi du temps » de l’Agenda : collège / lycée seulement.
  - RGPD (journal, codes de transfert, effacement, export) : données fictives en démo seulement, sur l’enfant actif ; listes d’enfants = enfants du compte ; volumes fictifs (« 47 notes »…) masqués pour un compte réel ; entrée « Grand-mère » retirée du journal.
  - Changement d’enfant : sélection immédiate (elle attendait la fin d’un fondu).
- [x] 2.4 Données de démo par niveau : Léa (GS) domaines + observations ; **Lucas (CM2) : plus aucune note /20** (57 notes, 6 matières chiffrées, 6 bulletins archivés chiffrés retirés ; contexte Aria de démo sans moyenne) → compétences sur 4 niveaux (`getDemoCompetences`, 10 compétences, source « Saisi par Mme Dupont / M. Garcia ») ; Emma (3e) : notes v7 inchangées. Onglet Notes : cycle de l’enfant (plus la date de naissance) ; **primaire = nouvelle vue compétences** (`screens/suivi/ApprentissagesVue.tsx`, compte réel = table `competences` sous RLS) ; maternelle : domaines de démo pour Léa seulement (avant : **les domaines de Léa pour TOUT enfant de maternelle**, comptes réels compris) ; plus d’observation inventée (« X progresse régulièrement »). Messagerie de démo alignée (Lucas : Mme Dupont, CM2 B, École Voltaire ; Emma : Mme Lambert, M. Petit, Collège Hugo). Mots, messages, agenda, absences : déjà par enfant (JSON indexés par id).
- [x] 2.6 Couleur et fond : **avatar unique** `ChildAvatar` (initiale(s) sur children.color) dans la top bar, le sélecteur, Famille & paramètres et le profil ; plus aucun avatar emoji ni photo (AvatarPicker supprimé). Profil : tap sur l’avatar → choix de la couleur (`CouleurEnfantSheet`, 6 couleurs). **Migration M13** `20260924140000_m13_fond_accueil` (ajout non destructif : `children.fond` nullable, CHECK `^[a-z0-9-]{1,40}$`, inverse dans migrations_down) ; tests SQL (transaction annulée, 0 donnée restante) : défaut NULL, responsable pose / retire le fond, valeur invalide refusée, personne sans lien 0 ligne ; 24/24 migrations alignées. « Fond de l’Accueil » = par enfant : « Couleur de [prénom] » (défaut) ou photo nature ; header de l’Accueil = photo + voile sombre léger, sinon couleur. Démo : couleur et fond gardés sur l’appareil (`@scolaria:demo_enfant:<id>`). Web : fond « Forêt » pour Emma, Léa garde son teal, rechargement → conservé ; couleur changée depuis le profil → avatar mis à jour.
  - Reste : l’onglet Notes (vue maternelle de démo) affiche encore l’image de fond globale de WallpaperContext → à retirer en B3 (la couleur / le fond ne s’appliquent qu’à l’avatar et au header de l’Accueil).
- [x] 2.7 Vérification écran par écran (web 375×812, démo) : test automatique qui, pour chaque enfant, ouvre Accueil, Notes, Agenda, Emploi du temps, Messages, Aria et cherche les marqueurs des DEUX autres enfants (prénom, enseignants, école, classe) dans le texte visible. Résultat final : Léa 6/6, Lucas 6/6, Emma 6/6 sans fuite. Famille & paramètres : seule la liste « Mes enfants » et « Responsable de Léa, Lucas, Emma » citent les autres enfants (niveau famille, voulu). Recherche : liens génériques uniquement. Corrigé pendant la vérification :
  - Emploi du temps d’Emma : « Mme Dupont » (maîtresse de Lucas) et 4 autres enseignants inventés → enseignants d’Emma ; idem bulletin et détail de note (« M. Dupont », « M. Garcia » → M. Petit, Mme Ortiz…).
  - demo-teachers / demo-messages : Mme Lambert retirée de Lucas ; « Bulletins du 1er trimestre, moyenne 14,2/20 » de Lucas → livret sans note.
  - Détail d’un événement : affichait la sortie d’Orsay (date, description, liste, rappel « 8 € ») pour TOUT événement ouvert depuis l’Agenda → affiche désormais l’événement réellement ouvert, champs vides masqués.
  - Artefact de test (pas un bug) : dans ce panneau web masqué, les animations sont suspendues, donc la feuille du sélecteur reste affichée après un choix ; exclue du contrôle.
- [x] 2.5 Accueil selon le niveau : fait en 2.2 (notes : collège / lycée ; derniers apprentissages : maternelle / primaire ; À faire, Aujourd’hui, carte Aria : enfant actif).

Objectif : une seule source (`useActiveChild()` → `selectedChild`) pour toute l’app ; aucune donnée d’un autre enfant affichée.
- [ ] Contrat unique : `selectedChild` (id, prénom, niveau, couleur, année active) ; supprimer les chemins parallèles (`selectedChildId` lu seul, `GlobalChildSwitcher`, `ChildThemeContext` passe-plat) ; `SchoolModeContext` dérivé du niveau de l’enfant (pas de la date de naissance seule).
- [ ] Données de démo indexées par id d’enfant (Léa GS / Lucas / Emma 4ème) : Accueil, Messages, Agenda, Emploi du temps, Devoirs, Bulletin, GradeDetail, SignDoc/SignSuccess, MonParcours, Aria. Emploi du temps et Devoirs : rien pour un enfant de maternelle (empty state), pas les données d’Emma.
- [ ] Compte réel : lecture Supabase filtrée par `child_id` (RLS fait le périmètre, pas de refiltre sur parent_id) ; compte sans enfant → empty states, jamais la démo.
- [ ] Header Accueil : carte 130 px, radius 20, marge 12, couleur de l’enfant ou fond choisi PAR enfant ; texte et pills lisibles sur toutes les couleurs de démo.
- [ ] Fond de l’Accueil (décision Q2) : **en base, par enfant, commun aux responsables** — migration M13 `children.fond` (identifiant texte, NULL = couleur de l’enfant, CHECK sur la liste des fonds connus ou format simple), modifiable par un responsable (policy children_update existante). Images **intégrées à l’app** ; la base ne stocke que l’identifiant. `WallpaperContext` / `WallpaperPickerScreen` lisent et écrivent le fond de l’enfant actif.
- [ ] Avatars (top bar, sélecteur, Famille & paramètres, ChildAvatar) à `child.color` ; écran « modifier la couleur » dans le profil de l’enfant (update `children.color`, palette sans ambre ni vert/rouge).
- [ ] Indicateur de nouveauté par enfant dans le sélecteur (démo : calculé localement).
- Écrans touchés : `ActiveChildContext`, `SchoolModeContext`, `ChildThemeContext`, `WallpaperContext`, `GlobalChildSwitcher`, `TopBar`, `ChildSelectorSheet`, `ChildAvatar`, `AccueilScreen`, `MessagerieScreen`, `MessagesListScreen`, `AgendaScreen`, `TimetableScreen`, `HomeworkScreen`, `BulletinScreen`, `GradeDetailScreen`, `SignDocScreen`, `SignSuccessScreen`, `MonParcoursScreen`, `ProfilEnfantScreen`, `EditProfileScreen`, `WallpaperPickerScreen`, `data/demo/*`.
- Test Redmi : changer d’enfant 3 fois → chaque écran (Accueil, Messages, Agenda, EDT, Aria, avatar, header) suit ; Léa (GS) n’affiche jamais de note /20 ni l’EDT d’Emma.
- Risques : bug d’id silencieux déjà vécu (leçon 17 avril : `.find() ?? [0]`) → warn en dev sur tout repli ; contraste texte blanc sur couleur claire ; rendu en double au changement d’enfant (écrans montés dans le pager) ; migration M13 (colonne fond) ; les fonds actuels de WallpaperContext incluent des dégradés abstraits à retirer (B1) → liste de fonds à figer.

### B3 · Suivi (ex-Notes) — 3 à 4 sessions
Objectif : contenu selon le niveau de l’enfant actif, segmented Apprentissages · Souvenirs · Livrets, bouton année + Mon parcours.

**Retours terrain (réunion de rentrée, CP, Marseille — 24 sept) à intégrer :**
- [ ] Primaire : **pas de trimestres**. Découpage par **périodes P1 à P5 ou semestres** selon l’école (LSU remis en janvier et juin). Supprimer le sélecteur « T1 » en maternelle / primaire. [UNCLEAR] où stocker le choix (réglage de l’école / classe, colonne à ajouter) — à voir avec le modèle `ecoles` / `classes`.
- [ ] **Échelle d’évaluation paramétrable** : 3 niveaux (A / PA / NA, usage quotidien fréquent) OU 4 niveaux LSU (non atteint, partiellement atteint, atteint, dépassé). Affichage adapté (3 ou 4 segments). Impact BDD : `competences.niveau` 1-4 → prévoir l’échelle (ajout non destructif).
- [ ] **Disciplines officielles du CP (cycle 2)** pour la démo et les listes : Français (lecture, écriture, oral, vocabulaire, grammaire et orthographe) ; Mathématiques (nombres, calcul et résolution de problèmes, grandeurs et mesures, espace et géométrie, organisation et gestion de données) ; Questionner le monde ; EMC ; Langue vivante (anglais) ; Enseignements artistiques ; EPS. (Lucas est en CM2, cycle 3 : disciplines du cycle 3 à reprendre des textes officiels pour lui.)
- [ ] Suivi › Livrets : type de document **« Évaluations nationales »** (CP : septembre et janvier, français et maths).
- [ ] Profil de l’enfant : « Compétences clés » retirées en B2-ter → à réintroduire ici avec la même échelle (3 ou 4 niveaux).
- [ ] Renommer l’onglet Notes → Suivi (pill top bar, icône `trending-up`, routes).
- [ ] Découper `NotesScreen` (2424 l.) : conteneur Suivi + 3 vues Apprentissages — maternelle (domaines + observations), primaire (compétences LSU, 4 segments #0F172A / rgba 0.12, jamais vert/rouge), collège-lycée (vue notes v7 actuelle, déplacée sans refonte).
- [ ] Démo (décision Q3) : pas de 4e enfant. **Lucas reste en CM2 (primaire)** : ses données de démo passent des notes /20 à des compétences sur 4 niveaux (livret). **Emma garde les notes** (collège). Léa (GS) : domaines maternelle.
- [ ] Compétences lues depuis `competences` (compte réel) avec la source affichée (« Saisi par Mme Durand · 12 déc. » / « Ajouté par vous »).
- [ ] Souvenirs et Livrets : lecture de `carnet_items` (souvenir, jalon / livret) + `bulletins` ; empty states ; le remplissage vient de B5.
- [ ] Bouton « 2025–2026 · CE1 ⌄ » : année active + lien Mon parcours (archives lecture seule, pas d’alerte Score de Joie) ; `ArchivedYearDetailScreen` branché sur `academic_year_id`.
- [ ] Action ⊞ de la bottom bar sur Suivi → Ajouter au carnet (câblée en B5, ici simple entrée).
- Écrans touchés : `NotesScreen` (→ Suivi + sous-vues), `SubjectDetailScreen`, `GradeDetailScreen`, `BulletinScreen`, `MonParcoursScreen`, `ArchivedYearDetailScreen`, `TopBar`, `BottomBar`, `TabNavigator`, `chrome.ts`.
- Test Redmi : Léa (GS) → domaines ; Lucas (CM2) → 4 segments, aucune note /20 ; Emma (4ème) → notes v7 identiques à avant ; segmented et bouton année ; archive en lecture seule.
- Risques : régression de la vue notes v7 lors du découpage (le fichier mélange les 2 modes) ; les notes /20 de Lucas sont lues ailleurs (Accueil, GradeDetail, Bulletin, Aria) → grep avant de les retirer ; nomenclature maternelle / LSU à valider (domaines et intitulés officiels à reprendre des textes Éduscol, pas inventés).

### B4 · Mots et Messages — 3 à 4 sessions
Objectif : types de mots et signature par responsable, filtres Tout / À signer / École / Privés, invitations d’un responsable.
- [ ] Mots : 4 types (information / signature / autorisation / participation) ; statut par responsable (« Signé par vous · en attente de Marc ») via `mot_carnets_statut` ; réponses autorisation (oui/non) et participation (oui / peut-être / non) via `reponses_mot` ; signature en son nom (déjà côté service, `liaisonService`).
- [ ] Filtres Messages : Tout · À signer · École · Privés (remplacent Non lus / Messages / Absences). Privés = conversations privées de l’utilisateur, jamais celles de l’autre responsable.
- [ ] Absences (décision Q4) : restent dans Messages, en **fil dédié par enfant** (« Absences Léa »), visible sous le filtre **École** (et Tout). Déclaration via le ✏️ de Messages → choix « Nouveau message » ou « Déclarer une absence » (`SignalerAbsenceScreen`, enfant actif).
- [ ] Invitations : « Inviter un responsable » (email, par enfant) dans Famille & paramètres › Responsables légaux ; « Invitations reçues » (accepter / refuser via `respond_invitation`) ; « Me retirer » (jamais le dernier) ; annulation par l’invitant → **nouvelle RPC** (migration M14).
- Droit à l’image (décision Q5) : **reporté au sprint enseignant** (dépend des publications photo).
- Écrans touchés : `MessagerieScreen`, `messagerie/MessagesListScreen`, `messagerie/MotDetailScreen`, `messagerie/ConversationDetailScreen`, `SignDocScreen`, `SignSuccessScreen`, `SignalerAbsenceScreen`, `messagerie/AbsencesListScreen`, `BottomBar` (✏️), `AccueilScreen` (mots à signer), écran Responsables légaux (nouveau), écran Invitations reçues (nouveau), `liaisonService`, `database.ts`.
- Test Redmi + SQL : 2 comptes de test (A, B) sur le même enfant : A signe → A voit « en attente de B » ; B signe → « signé » ; B ne voit pas les conversations privées de A ; invitation acceptée seulement avec email confirmé.
- Risques : mode démo sans deuxième compte réel → statuts simulés à écrire ; email de confirmation Supabase (SMTP par défaut limité) pour tester l’invitation ; mapping types DB ↔ types écran déjà ambigu (info ↔ information, bon_de_sortie → autorisation) ; migration M14 (annulation d’invitation).

### B5 · Ajouter au carnet — 2 à 3 sessions
Objectif : les 4 actions d’import, rangées dans le carnet de l’enfant actif, fichiers dans un stockage privé.
- [ ] Migration M15 : bucket Storage **privé** `carnet` ; chemin `{child_id}/{item_id}` ; policies calquées sur `carnet_items` (foyer = responsables, privé = auteur seul) ; URLs signées 24 h ; tests SQL sous rôle authenticated.
- [ ] Sheet « Ajouter au carnet » (+ Accueil, ⊞ Suivi) : Photographier · Importer une capture · Ajouter un document (PDF) · Noter une première fois (jalon, sans fichier).
- [ ] Formulaire V1 : catégorie (Mot / Livret / Souvenir / Jalon), date, visibilité (Foyer par défaut / Privé), enfant = enfant actif affiché, source « Ajouté par vous ».
- [ ] Affichage dans Suivi (Souvenirs, Livrets) et Accueil (« Nouveau dans le carnet ») ; suppression par l’auteur avec Alert.
- [ ] Mode démo : stockage local, rien envoyé.
- Écrans touchés : `QuickActionsSheet` (ou nouvelle sheet), `BottomBar`, `TabNavigator` (refs d’action), écran Ajouter (nouveau), vues Suivi (B3), `AccueilScreen`, service carnet (nouveau).
- Test Redmi : photo → souvenir visible chez A et B ; même photo en Privé → invisible pour B ; PDF ouvert via URL signée ; permissions caméra / galerie refusées → message clair.
- Risques : permissions Android (caméra, médias) et taille des photos (compresser avant envoi) ; upload interrompu → ligne `carnet_items` sans fichier (écrire la ligne après l’upload) ; suppression de la ligne ≠ suppression du fichier (à faire ensemble) ; B3 doit être fait pour l’affichage.

### B6 · Agenda — 1 à 2 sessions
Objectif : événements issus des mots, « À prévoir » cochable, FAB conforme.
- [ ] Migration M16 : `agenda_events.mot_id` (NULL, FK mots_liaison) ; événement créé pour chaque carnet quand le mot a une `event_date` (trigger à la distribution `mot_carnets`) ; table des cases cochées « À prévoir » (décision Q6) : **commune au carnet de l’enfant** (une ligne par carnet + élément), avec l’auteur de la coche affiché (« coché par Julien ») ; lisible et modifiable par les responsables de l’enfant.
- [ ] Carte d’événement liée au mot source (lien « Voir le mot ») ; mots importés : date saisie à la main (B5).
- [ ] FAB rond 48 px (bottom 72, right 14) sur l’Agenda ; retirer le + de la bottom bar (`BottomBar.tsx:58`, `agendaActionRef` `TabNavigator.tsx:659`) avec ses constantes et imports.
- [ ] EventDetail : « À prévoir » enregistré (plus d’état local).
- Écrans touchés : `AgendaScreen`, `EventDetailScreen`, `BottomBar`, `TabNavigator`, `database.ts` / `liaisonService`.
- Test Redmi : un mot avec date (démo) crée l’événement dans l’Agenda de chaque enfant concerné ; cocher chez A → visible chez B avec « coché par A » ; FAB rond au-dessus de la bottom bar, plus de + à droite.
- Risques : sans interface enseignant, aucun vrai mot n’a de date → test surtout en SQL et en démo ; doublons d’événements si le mot est redistribué (UNIQUE mot_id + child_id).

### B7 · Aria — 1 à 2 sessions
Objectif : suggestions en pills horizontales, contexte = enfant actif uniquement.
- [ ] Suggestions : `ScrollView horizontal` de pills (leçon du 18 avril, jamais flexWrap + %) ; plus d’emoji ; générées depuis l’enfant actif (prénom, niveau) ; génériques si aucun enfant.
- [ ] Titres / hero : prénom de l’enfant actif, jamais « Léa » en dur ; compte réel sans enfant → contexte neutre (déjà côté API, à vérifier côté écran).
- [ ] Historique des conversations filtré par enfant ; changement d’enfant → nouvelle conversation.
- [ ] Ne pas renvoyer au modèle les réponses « indisponible » / « urgence » (reliquat S).
- Écrans touchés : `aria/AriaHomeScreen`, `aria/AriaConversationScreen`, `AriaScreen`, `services/childContext.ts`, `services/ariaApi.ts`.
- Test Redmi : suggestions différentes pour Léa et Emma ; aucune mention d’un autre enfant ; phrase d’urgence toujours interceptée (`npm run test:emergency`).
- Risques : le prompt système est encore construit côté app (temporaire, voir S2) → ne pas l’étendre, le passage côté serveur reste à planifier ; ne pas toucher au protocole d’urgence sans relancer les 22 cas.

### Dépendances et ordre
B1 → B2 (bloquant pour tous les autres) → B3 → B4 → B5 (affichage dans B3) → B6 (utilise les mots de B4) → B7 (peut passer juste après B2 si besoin).
Migrations prévues : M13 (fond d’Accueil par enfant, B2), M14 (annulation d’invitation, B4), M15 (bucket carnet, B5), M16 (agenda ↔ mots + À prévoir, B6).

### Décisions du 24 sept (6 questions)
1. ☰ reste et ouvre DIRECTEMENT « Famille & paramètres » ; ancien panneau burger et `ReglagesScreen` supprimés. (B1)
2. Fond de l’Accueil en base, par enfant, commun aux responsables ; images intégrées à l’app, la base ne stocke que l’identifiant. (B2, M13)
3. Pas de 4e enfant ; Lucas CM2 (primaire) passe aux compétences 4 niveaux, Emma garde les notes. (B3)
4. Absences : fil dédié par enfant dans Messages, sous le filtre École ; déclaration via ✏️ (« Nouveau message » / « Déclarer une absence »). (B4)
5. Droit à l’image reporté au sprint enseignant.
6. « À prévoir » commun au carnet de l’enfant, source affichée (« coché par Julien »). (B6, M16)

## Addendum v3.4 · PHASE A : BDD Supabase + sécurité Aria (23 sept 2026)

**Statut : plan M0–M12 VALIDÉ. Lots 1, 2, 2-bis, 3a (M5–M8) et 3b (M9–M12) FAITS (23–24 sept). Phase A (BDD) terminée : attendre la suite.**

### Étape 2 · état Supabase (constaté le 23 sept)
- Projet `eklpzspvfjfqgqgugmxl` (« Scolaria », eu-west-2) : **en pause (INACTIVE)**, schéma illisible. 0 branche, 0 Edge Function.
- Schéma local (`supabase/schema-complet.sql`, dernier commit 2 mai) : 14 tables (profiles, children, academic_years, subjects, grades, bulletins, mots_liaison, signatures, messages, read_receipts, agenda_events, absences, checkins, aria_conversations/messages), 49 policies — à comparer au schéma réel.
- Décision : l’utilisateur réactive le projet et fait `supabase db dump` (schéma + données) dans `supabase/backups/` (ignoré par Git).
- Règle validée : **garder les noms de tables existants** (children, profiles…) ; toute table présente est modifiée, jamais recréée ; c’est CLAUDE.md qui sera mis à jour.
- [x] Projet réactivé ; sauvegarde schéma + données (voir ci-dessous)
- [x] Schéma réel lu et comparé → écarts listés ci-dessous
- [x] Plan de migration écrit ci-dessous
- [x] Plan validé : 3 lots avec arrêt et test entre chaque lot.

#### Lot 1 · M0 + M1 — FAIT (23 sept)
- [x] M0 : `supabase/migrations/` = seule référence. `20260923140000_baseline.sql` (état réel, enregistrée « appliquée » sans exécution) + 3 fichiers-repères pour les migrations distantes de mars. Anciens `supabase/*.sql` → `docs/archives/sql/`. Scripts inverses dans `supabase/migrations_down/` (hors du dossier lu par la CLI). `supabase migration list` : local = distant (5/5).
- [x] M1 `20260923145605_m1_securite` appliquée : vues en security_invoker + REVOKE anon ; search_path fixé ; handle_new_user non exécutable via l’API ; **profiles.role immuable** hors service_role (trigger `protect_profile_role` + WITH CHECK de `profiles_update`, profil créé par l’utilisateur = parent) ; **enseignants : plus aucune lecture de donnée d’enfant** (3 policies supprimées, children/subjects/grades/checkins réécrites) ; **publications de classe** : responsables d’un enfant de la classe uniquement.
- [x] Tests SQL (transactions annulées) : changement de rôle refusé (42501) ; modification du prénom autorisée ; anon sans accès aux vues ni à handle_new_user ; 0 policy « enseignant » ; 0 publication lisible par tous ; 66 policies (69 − 3).
- [x] Advisors sécurité : **0 ERROR** (3 avant). Restent des WARN : visibilité des tables dans le schéma GraphQL (structure, pas les lignes : la RLS s’applique) ; protection des mots de passe divulgués (réglage du tableau de bord, à activer par l’utilisateur).
- [x] Code : colonne `emoji` retirée de `database.ts` (select des notes, createSubject, createAgendaEvent). tsc OK.
- [x] `nul/` supprimé (export web d’avril, jamais suivi par Git).
- ⚠️ Limite connue : publications de classe rattachées par le texte `classe` (« CE1 » de deux écoles) → vrai identifiant de classe avec le lien enseignant ↔ classe.
- [x] Trigger `on_auth_user_created` vérifié après M1 (compte de test créé le 23 sept à 15:02) : profil créé automatiquement (+4 ms), rôle « parent », email renseigné.
- [ ] Reliquat : 1 compte auth du 21 mars 2026 SANS profil (bug d’inscription de l’époque, corrigé par 5b84de3) → créer son profil ou supprimer le compte (décision utilisateur).

#### Lot 2 · M2 + M3 + M4 — FAIT (23 sept)
- [x] M2 `20260923183636_m2_foyers_responsables` : tables `foyers` + `responsables` (UNIQUE user/enfant), `is_responsable(child_id)` (SECURITY DEFINER, exécutable par authenticated uniquement — voulu, utilisée par les policies), trigger : le créateur d’un enfant devient responsable (foyer créé si besoin). Toutes les données de carnet passent par `is_responsable` ; conversations Aria / messages / conversations enseignant restent réservées à leurs participants. Signatures : statut visible par tous les responsables de l’enfant.
- [x] M3 `20260923183731_m3_couleur_enfant` : `children.color` NOT NULL DEFAULT `#4338CA`, CHECK format `#RRGGBB` ; modifiable par un responsable de l’enfant uniquement (policy children_update).
- [x] M4 `20260923183827_m4_rattachement_annee` : `academic_year_id` (NULL autorisé, ON DELETE SET NULL) sur grades, agenda_events, checkins, subjects, messages, signatures, teacher_conversations, appreciations ; FK `student_id → children` sur teacher_conversations et appreciations ; trigger `set_academic_year` : année ACTIVE de l’enfant par défaut, refus d’une année d’un autre enfant.
- [x] Tests SQL (utilisateurs fictifs, transactions annulées, 0 donnée restante) :
  - M2 : A (créateur) rattaché automatiquement ; **B (co-responsable) voit l’enfant, la matière, la note, mais 0 conversation Aria et 0 message privé de A** ; C (sans lien) : 0 enfant / 0 note / 0 foyer ; T (enseignant) : 0 enfant / 0 note, voit seulement le message qui lui est adressé.
  - M3 : défaut #4338CA ; B modifie la couleur (1 ligne) ; C ne modifie rien (0 ligne) ; « rouge » refusé.
  - M4 : année active posée automatiquement ; année archivée du même enfant acceptée ; année d’un autre enfant refusée ; enfant sans année → NULL accepté.
- [x] Advisors : **0 ERROR**. WARN : GraphQL (structure), mots de passe divulgués (tableau de bord), `is_responsable` exécutable par authenticated (voulu).
- [x] `supabase migration list` : local = distant (8/8).
- [x] Code : `getChildren()` et l’export RGPD s’appuient sur la RLS (tous les enfants dont on est responsable, plus seulement ceux créés) ; `Child.color` + `DEFAULT_CHILD_COLOR` ; couleurs des enfants de démo Moreau (Léa #0F766E, Lucas #4338CA, Emma #0369A1 (lot 2-bis)) dans `ActiveChildContext` et `demo-children.json`. tsc OK.
- [ ] **Phase B** : afficher `child.color` sur l’avatar (top bar, sélecteur) et le header de l’Accueil — encore en indigo neutre (aucun écran modifié en phase A) ; écran « modifier la couleur » dans le profil de l’enfant.
- [x] ~~Invitation d’un second responsable~~ : mécanisme en base fait au lot 2-bis (M2c) ; écrans en Phase B.
- [ ] Plus tard : tables « famille » (access_journal, deletion_requests, export_history, person_permissions, transfer_codes) encore rattachées à `family_id = auth.uid()` → passer à `foyer_id`.

#### Lot 2-bis · M2b + M2c + M2d — FAIT (24 sept)
- [x] M2b `20260924090000_m2b_creation_enfant` : lecture de children UNIQUEMENT via responsables (plus de parent_id = auth.uid()) ; insertion directe interdite (policy children_insert supprimée, trigger du créateur supprimé) → `create_child()` crée enfant + lien responsable + année scolaire en cours en une transaction ; `current_school_year()` (bascule en août, heure de Paris) ; contrainte différée : jamais d’enfant sans année (création ou suppression de la dernière année refusées au COMMIT).
- [x] M2c `20260924090100_m2c_invitations_responsables` : table `invitations_responsable` (7 jours, une seule en attente par enfant + email) ; créée par un responsable de l’enfant ; visible par ses responsables et par l’invité ; `respond_invitation(id, accepter)` : seul l’invité (email du compte CONFIRMÉ = email invité) accepte ou refuse ; acceptation → lien dans le foyer de l’invitant. Aucune policy INSERT/UPDATE sur responsables.
- [x] M2d `20260924090200_m2d_retrait_responsable` : un responsable ne retire que LUI-MÊME (policy DELETE user_id = auth.uid()) ; le DERNIER responsable ne peut pas se retirer (trigger) ; la suppression de l’enfant (cascade) n’est pas bloquée.
- [x] Appliquées par `supabase db push` (versions = noms de fichiers), inverses dans migrations_down/.
- [x] Tests SQL (transactions annulées, 0 donnée restante) :
  - M2b : create_child → enfant + responsable + année 2026-2027 (CE1, active) ; insert direct refusé ; enfant sans année refusé ; suppression de la dernière année refusée ; **A retiré des responsables → 0 enfant, 0 année visibles**.
  - M2c : **C ne peut ni s’auto-rattacher, ni rattacher D, ni s’inviter** ; C ne voit pas et ne peut pas accepter l’invitation de B ; B voit l’enfant seulement APRÈS acceptation (même foyer que A) ; invitation non réutilisable.
  - M2d : **B ne peut pas retirer A** (0 ligne) ; B se retire lui-même (1 ligne, ne voit plus l’enfant) ; A, dernier responsable, ne peut pas se retirer ; A peut supprimer l’enfant (liens et années supprimés en cascade).
- [x] Advisors : 0 ERROR. WARN voulus : create_child, respond_invitation, is_responsable exécutables par authenticated (points d’entrée contrôlés).
- [x] Code : `createChild` appelle `rpc('create_child')` (paramètres identiques, super_power non pris en charge à la création) ; démo : Emma en bleu océan `#0369A1` (l’ambre est réservé au Score de Joie).
- [ ] Phase B : écrans « inviter un responsable » (insert invitations_responsable) et « invitations reçues » (respond_invitation) ; annulation d’une invitation par l’invitant (RPC à ajouter) ; procédure vérifiée de retrait d’un autre responsable (garde partagée, côté serveur).

#### Lot 3a · M2e + M5a + M5 à M8 — FAIT (24 sept)
- [x] M2e `20260924100000_m2e_suppression_enfant` : un enfant n’est supprimé QUE par son unique responsable ; à 2 responsables ou plus, refus (chacun peut seulement se retirer).
- [x] M5a `20260924100100_m5a_classes` : tables `ecoles` et `classes` (école + année + nom, unique ; `enseignant_id` = titulaire) ; `classe_id` sur academic_years, mots_liaison, class_posts, class_events ; lecture parent des publications / événements **par id** ; colonnes texte `classe` conservées, facultatives, dépréciées (aucune policy ne les lit).
- [x] M5 `…100200_m5_mots_liaison` : types information | signature | autorisation | participation ; `signature_mode` none | one | both (`requires_signature` recalculé) ; `event_date`, `a_prevoir` (jsonb liste). Table `mot_carnets` (mot, enfant, année) : mot envoyé à une classe → une copie par enfant de la classe (seul le titulaire peut envoyer) ; `distribuer_mot(mot, enfants[])` → fratrie / enfants précis, une copie par enfant. Un parent ne lit un mot QUE via le carnet de son enfant (brouillons exclus).
- [x] M6 `…100300_m6_signatures` : une ligne par (mot, enfant, responsable), FK vers le carnet, signature seulement si mot envoyé et mode ≠ none, nom / date / année fixés par le serveur, immuables. Vue `mot_carnets_statut` : one → 1 signature ; both → les 2 responsables (**choix : si l’enfant n’a qu’un responsable, sa signature suffit**). L’enseignant auteur voit carnets, signatures et réponses de SES mots.
- [x] M7 `…100400_m7_absences` : `academic_year_id` uuid (FK, trigger) ; déclarée par un responsable en son nom, visible des autres responsables ; **modifiable par son auteur seul** (avant : tout responsable).
- [x] M8 `…100500_m8_reponses_mot` : `reponses_mot` (autorisation oui/non, participation oui/peut_etre/non), une réponse par responsable et par carnet, cohérente avec le type du mot, modifiable par son auteur, jamais supprimée.
- [x] Tests SQL (transaction annulée, 0 donnée restante) — 44 vérifications OK : A et B responsables → **ni A ni B ne peuvent supprimer l’enfant** ; A seul responsable de Zoé → suppression OK ; copies classe (2) / fratrie (2) / brouillon (0) ; C ne voit que le carnet de Max ; parent non titulaire ne peut pas envoyer à la classe ; **both : A seul → non signé, A + B → signé** ; one : A seul → signé ; signer au nom de B, double signature, mode none, C sur Léo → refusés ; absences : B voit celle de A, C ne voit rien, B ne modifie pas celle de A ; réponses : 2e réponse refusée, modification par l’auteur OK, B ne modifie pas celle de A, mauvais type / valeur / carnet refusés.
- [x] Advisors : 0 ERROR. WARN voulus : `distribuer_mot`, `is_mot_teacher`, `nb_responsables_carnet` (points d’entrée contrôlés).
- [x] Code (services seuls) : `liaisonService` → types DB ↔ types écran (info ↔ information, bon_de_sortie → autorisation ; signature → autorisation, participation → info à l’affichage), `signature_mode` à la création, compteurs enseignant via `mots_liaison_enriched`, non-signés via `mot_carnets_statut`, mots parent via `mot_carnets`, `is_signed` = signé par moi, signature sans nom client. `absenceService` : rien à changer. Démo Moreau : données locales, rien à changer.
- [ ] Sprint enseignant / Phase 2 · retours terrain (CP, Marseille, 24 sept) :
  - **« Demander un rendez-vous »** à l’enseignante depuis Messages.
  - Fiche **« Organisation de la semaine »** par enfant : jours de cantine, étude, garderie ; remplie par les parents, consultable par l’enseignante. Argument mairie (périscolaire).
  - **Comportement** (croix / point orange / point rouge) : **pas de module en V1** ; passe par un mot à signer. Règle : visible uniquement par les responsables de l’enfant, **jamais de tableau comparatif**.
- [ ] Sprint enseignant · mode « both » avec UN seul responsable inscrit : l’enseignant voit « signé · 1 responsable inscrit sur 2 attendus », pas simplement « signé » (données : `mot_carnets_statut.nb_responsables`).
- [ ] Sprint enseignant · direction : rôle directeur, portée école → écrire à toute l’école (mots, publications) ; à modéliser (rôle + `ecoles` ; distribution à toutes les classes de l’école).
- [ ] Sprint enseignant : choix de la classe **par id** dans le composer (sans `classe_id`, un mot n’est distribué dans aucun carnet) ; création des écoles / classes et rattachement des enfants (`academic_years.classe_id`) ; teacherService (posts / événements) encore filtré par nom côté enseignant ; noms des élèves non lisibles par l’enseignant (RLS children).
- [ ] Phase B : les 4 types et le mode both dans l’UI (« signé par vous · en attente de … »), réponses autorisation / participation, liste « À prévoir ».

#### Lot 3b · M9 à M12 — FAIT (24 sept)
- [x] M9 `20260924110000_m9_competences` (+ correctif M9b `…110400`) : `competences` (child_id + academic_year_id, niveau 1-4, observation). **source fixée par le serveur** : titulaire de la classe de l’année → 'ecole', responsable → 'parent' (la valeur envoyée est ignorée). Compétence école : modifiable / supprimable par le titulaire uniquement (ni parent, ni autre enseignant). Compétence parent : par le responsable qui l’a saisie. Lecture : responsables (tout), titulaire (école de sa classe). Enfant / année / source / auteur non modifiables.
- [x] M10 `…110100_m10_carnet_items` : `carnet_items` (mot | livret | souvenir | jalon, fichier = chemin Storage, visibilite foyer | prive). **Privé = auteur seul**, foyer = tous les responsables ; modification / suppression par l’auteur ; aucun accès enseignant.
- [x] M11 `…110200_m11_alertes_urgence` : **DÉCISION : alerte privée à son auteur**, jamais partagée automatiquement avec l’autre responsable (maltraitance signalée contre l’autre parent) ni avec l’enseignant. Colonnes : id, auteur_id, child_id, academic_year_id, categorie, created_at — **aucune colonne de texte**. Lecture / suppression : auteur ; pas de modification ; carnet supprimé → l’alerte reste à son auteur (child_id NULL). App : `ariaApi` enregistre l’alerte (catégorie + enfant) quand le protocole se déclenche sur un compte réel.
- [x] M12 `…110300_m12_publications_classe` : publications / événements **par classe_id uniquement** (obligatoire) ; écriture par le titulaire de la classe seulement (avant : toute personne connectée pouvait publier dans n’importe quelle classe) ; changement de classe refusé ; « vu » seulement sur une publication lisible.
- [x] Tests SQL (transaction annulée, 0 donnée restante) — 43 vérifications OK, dont : **ajout « privé » de A invisible pour B, ajout « foyer » de A visible pour B** ; **B (co-responsable) ne voit pas l’alerte de A** ; parent / autre enseignant ne modifient pas une compétence école ; source forcée dans les deux sens ; parent et non-titulaire ne publient pas.
- [x] Advisors : 0 ERROR. WARN voulus : `is_titulaire_annee`, `is_titulaire_classe` (fonctions d’aide des policies).
- [ ] Sprint enseignant : `teacherService` crée publications / événements sans `classe_id` → refusé en base pour un vrai compte (voulu) ; à passer à l’id avec le choix de classe.
- [ ] Écran d’import (Phase B) : bucket Storage **privé** pour `carnet_items.fichier`, policies calquées sur la table (privé = auteur seul), URLs signées 24 h.
- [ ] Filet serveur : l’Edge Function détecte aussi l’urgence mais n’enregistre pas d’alerte (elle ne connaît pas l’enfant — minimisation) ; l’app enregistre avant tout appel. À revoir si un client contourne l’app.
- [ ] **Phase B · droit à l’image** : une publication photo ne montre un enfant que si ses responsables ont autorisé le droit à l’image (lien avec les mots de type autorisation / `reponses_mot`).

#### Impact des migrations sur le code de l’app
| Migration | Impact | Action |
|---|---|---|
| M1 | `database.ts` : vues `subject_averages` (l. 215), `child_overview` (l. 527) → filtrées par la RLS (voulu). `teacherService` (météo de classe, élèves, ressentis) et `absenceService` côté enseignant → **listes vides** pour un vrai compte enseignant (voulu, démo inchangée). Aucune écriture de `profiles.role` dans l’app. | Colonne `emoji` retirée de `database.ts`. |
| M2 | Accès enfant par `is_responsable()`. `createChild` inchangé (trigger crée foyer + responsable). `getChildren` filtrait sur parent_id → un co-responsable n’aurait rien vu. | **Fait** : `getChildren()` et export RGPD sans filtre parent_id (RLS). |
| M3 | `children.color` : type `Child`, mapping Supabase, démo Moreau. | **Fait** (modèle + démo). Affichage : Phase B. |
| M4 | `academic_year_id` nullable, rempli par trigger : aucune casse, aucun changement d’insert nécessaire. | **Rien à changer** ; l’app pourra le passer explicitement (vue d’une année archivée). |
| M5–M8 | Types de mots, `mot_carnets`, signatures par responsable, absences uuid, réponses. | **Fait** : `liaisonService` adapté (voir lot 3a). |
| M9–M12 | competences, carnet_items, alertes_urgence, publications par classe_id. | **Fait** : `ariaApi` enregistre l’alerte ; écrans d’import / compétences : Phase B. |


### Étape 2 bis · schéma RÉEL vs fichiers locaux (lu le 23 sept, projet réactivé)
Sauvegarde faite le 23 sept (Docker arrêté → via les outils Supabase) : `supabase/backups/schema-2026-09-23.sql` (44 018 o) et `data-2026-09-23.sql` (1 156 o), ignorés par Git. Contrôle : 27 tables, 29 FK, 31 CHECK, 35 PK/UNIQUE, 30 index, 69 policies, 3 fonctions, 9 triggers, 3 vues = identique à la base. Données : 1 ligne (public.profiles), toutes les autres tables vides. Non sauvegardé : schéma auth (2 comptes — empreintes de mots de passe non lues), tables internes storage.

**Écarts avec `supabase/*.sql` (fichiers locaux périmés) :**
- 12 tables en base absentes des fichiers : access_journal, appreciations, class_events, class_post_reactions, class_post_seen, class_posts, deletion_requests, export_history, person_permissions, teacher_conversations, teacher_messages, transfer_codes.
- 0 table des fichiers absente de la base.
- Colonnes : `agenda_events.emoji` et `subjects.emoji` n’existent plus en base (encore dans les fichiers). ⚠️ `src/services/database.ts:129` sélectionne encore `subjects(name, emoji, color)` → la requête échouera sur un vrai compte.
- Policies : 69 en base contre 49 + 23 + 14 + 1 réparties dans 4 fichiers → les fichiers ne sont plus une source fiable. Désormais : `supabase/migrations/` = seule source (voir M0).

**Non conforme à « toute donnée de carnet → child_id + academic_year_id » :**
| Table | child_id | academic_year_id | Remarque |
|---|---|---|---|
| grades | ✓ | ✗ | |
| agenda_events | ✓ | ✗ | + pas de lien vers le mot source |
| messages | nullable | ✗ | |
| checkins | ✓ | ✗ | |
| subjects | ✓ | ✗ | matières propres à une année |
| absences | student_id ✓ | **text** `''` | type faux (pas de FK) |
| appreciations | student_id sans FK | `academic_year` text | |
| teacher_conversations | student_id sans FK | ✗ | |
| mots_liaison | ✗ (rattaché à `classe` texte) | ✗ | copie par carnet absente |
| signatures | ✓ | ✗ | UNIQUE(mot, élève) empêche la signature des 2 parents |
| bulletins, academic_years | ✓ | ✓ | conformes |

**Failles de sécurité constatées (advisors Supabase + lecture des policies) :**
1. 🔴 Les 3 vues (`child_overview`, `subject_averages`, `mots_liaison_enriched`) sont en SECURITY DEFINER : elles ignorent la RLS. `child_overview` renvoie prénom, classe, école et moyennes de TOUS les enfants à n’importe quel compte, et même à `anon`.
2. 🔴 Toute personne avec `profiles.role = 'enseignant'` lit TOUS les enfants, notes, matières, absences et ressentis (policies *_teacher_* / `children_select` / `grades_*` / `subjects_select` / `checkins_select`). Or le rôle est modifiable par l’utilisateur (`profiles_update` sans restriction de colonne) → n’importe quel parent peut se déclarer enseignant.
3. 🔴 `class_posts`, `class_events`, `class_post_reactions` : SELECT `USING (true)` → tout compte lit les publications de toutes les classes.
4. 🟠 `handle_new_user()` (SECURITY DEFINER) appelable via `/rest/v1/rpc` par anon et authenticated.
5. 🟠 `generate_scolaria_id`, `update_updated_at` : search_path non fixé.
6. 🟠 `checkins_select` : requête incohérente (UNION sans lien réel avec l’enfant).
7. 🟡 Protection contre les mots de passe divulgués (HaveIBeenPwned) désactivée — réglage Auth du tableau de bord.

### Plan de migration Phase A (À VALIDER — rien n’est exécuté)
Règles : noms existants conservés (children, profiles…) ; on modifie, on ne recrée pas ; une migration réversible par sujet dans `supabase/migrations/AAAAMMJJHHMM_sujet.sql`, chacune avec son script inverse `…_down.sql` ; après chaque migration : advisors sécurité + tsc. Les tables sont vides (sauf profiles) : aucune reprise de données lourde.

**Opérations destructives à approuver explicitement** (aucune ne supprime de table ni de colonne) : M1 `DROP VIEW`/re-create en security_invoker ; M2 `DROP POLICY` des policies enseignant trop larges ; M6 `DROP CONSTRAINT` (UNIQUE signatures, CHECK type de mots_liaison) ; M7 `ALTER COLUMN absences.academic_year_id TYPE uuid` (table vide).

- **M0 · Baseline** — `supabase/migrations/…_baseline.sql` = copie du schéma sauvegardé (référence, NON rejouée en base) ; les anciens `supabase/*.sql` déplacés dans `docs/archives/sql/` (déplacement, pas suppression).
- **M1 · Correctifs de sécurité immédiats** — vues en `security_invoker = true` ; `search_path` fixé sur les 2 fonctions ; `REVOKE EXECUTE` de `handle_new_user` pour anon/authenticated ; `REVOKE SELECT` des 3 vues pour anon. Down : état actuel.
- **M2 · Foyers et responsables** — nouvelles tables `foyers (id, nom, created_at)` et `responsables (foyer_id, user_id, child_id, lien, created_at, UNIQUE(user_id, child_id))` ; fonction `is_responsable(child_id)` SECURITY DEFINER STABLE (search_path fixé) ; reprise : un foyer + une ligne responsable par couple children.parent_id (0 enfant aujourd’hui) ; `children.parent_id` conservé (= créateur). Toutes les policies « `children.parent_id = auth.uid()` » réécrites en `is_responsable(child_id)`. Policies enseignant larges RETIRÉES (le lien enseignant ↔ classe viendra avec l’interface enseignant) ; `profiles_update` interdit de modifier `role`. Down : policies d’origine, tables supprimées.
- **M3 · Couleur de l’enfant** — `children.color text NOT NULL DEFAULT '#4338CA'` + CHECK format hex. Down : suppression de la colonne (ajoutée par nous).
- **M4 · Rattachement à l’année** — `academic_year_id uuid NULL REFERENCES academic_years` sur grades, agenda_events, messages, checkins, subjects, signatures, teacher_conversations ; FK `appreciations.student_id → children` + `academic_year_id` ; FK `teacher_conversations.student_id → children` ; index associés. NULL autorisé tant que l’app ne les renseigne pas (passage NOT NULL = migration ultérieure).
- **M5 · Mots de liaison** — `mots_liaison` : `signature_mode text (none|one|both) DEFAULT 'none'`, `event_date timestamptz NULL`, `a_prevoir jsonb NULL` ; nouveau CHECK `type` (information|signature|autorisation|participation) avec correspondance info→information, bon_de_sortie→autorisation ; `requires_signature` conservé (déprécié). Nouvelle table `mot_carnets (mot_id, child_id, academic_year_id, UNIQUE(mot_id, child_id))` = la copie du mot dans chaque carnet (fratrie = une copie par enfant) ; policy parent : via `is_responsable(child_id)` au lieu de `classe`. `agenda_events.mot_id NULL` (événement lié au mot source).
- **M6 · Signatures** — UNIQUE(mot_id, student_id) remplacé par UNIQUE(mot_id, student_id, parent_id) : une signature par responsable. Policy : chaque responsable voit les signatures des enfants dont il est responsable (statut visible par parent).
- **M7 · Absences** — `academic_year_id` text → uuid FK (table vide).
- **M8 · reponses_mot** — `(id, mot_id, child_id, responsable_id, autorisation boolean NULL, participation text NULL CHECK (oui|peut_etre|non), created_at, UNIQUE(mot_id, child_id, responsable_id))` + RLS responsable.
- **M9 · competences** — `(id, child_id, academic_year_id, domaine, competence, niveau smallint CHECK 1-4, source text CHECK (ecole|parent), saisi_par uuid, date, created_at)` + RLS responsable.
- **M10 · carnet_items** — `(id, child_id, academic_year_id, categorie CHECK (mot|livret|souvenir|jalon), fichier text, date, ajoute_par uuid, visibilite CHECK (foyer|prive) DEFAULT 'foyer', created_at)` ; RLS : `foyer` → responsables de l’enfant, `prive` → auteur seul. Bucket Storage privé (URLs signées 24 h) : migration séparée plus tard.
- **M11 · Alertes du protocole d’urgence** — `alertes (id, child_id NULL, auteur uuid, categorie CHECK (suicide|harcelement|maltraitance), created_at)` — jamais le texte du message ; ~~RLS : auteur + responsables de l’enfant~~ → **décision du 24 sept : privée à son auteur uniquement** (fait, lot 3b).
- **M12 · Publications de classe** — `class_posts` / `class_events` / `class_post_reactions` : SELECT réservé aux responsables d’un enfant de la classe (remplace `USING (true)`).
- **Code (hors migration, après M3/M4)** — `database.ts:129` : retirer `emoji` du select ; données de démo Moreau : ajouter `color` à chaque enfant (Léa, Lucas, Emma) dans `demo-children.json` / `ActiveChildContext` ; CLAUDE.md § Architecture BDD mis à jour avec les noms réels (children, profiles…).
- **Hors SQL (tableau de bord)** — activer la protection des mots de passe divulgués (Auth → Password security).

Ordre proposé : M0 → M1 (sécurité, tout de suite) → M2 → M3 → M4 → M5/M6 → M7 → M8–M11 → M12.


### S · Sécurité Aria
- [x] S1 : aucune clé `sk-ant-` dans l’historique Git (toutes branches) ; `eas.json` propre depuis `6f641b9`. La clé était dans `.env` (non suivi) → `extra` → APK, et dans les variables EAS (supprimées par l’utilisateur, clé révoquée).
- [x] S2 : Edge Function `supabase/functions/aria/index.ts` (SDK `npm:@anthropic-ai/sdk`) : session Supabase obligatoire (JWT + getUser), modèle / max_tokens / fallbacks fixés côté serveur, garde-fous de taille, réponse `{ text }` ou `{ error: "unavailable" }`. App : `supabase.functions.invoke("aria")` ; mode démo = réponses locales sans réseau (vérifié en web).
  - Modèle : `claude-sonnet-5` par défaut (décision : coût), surchargeable sans redéployer par le secret `ARIA_MODEL`. Repli automatique DÉSACTIVÉ : un refus du modèle → « Aria est momentanément indisponible. ». L’ancien code utilisait `claude-sonnet-4-20250514`.
  - Minimisation : le contexte envoyé à Aria ne contient que le PRÉNOM (plus de nom de famille, d’école ni d’identifiant Scolaria) — `childContext.ts`.
  - Protocole d’urgence : `supabase/functions/_shared/emergency.ts` (module partagé). Edge Function : contrôle AVANT tout appel au modèle → message fixe 3114 / 3018 / 119 + 112, aucun appel Anthropic, alerte journalisée (catégorie + user id, jamais le texte). App : même contrôle, y compris en mode démo (vérifié en web). 22 cas de test (`npm run test:emergency`), dont les pièges violon / violent / violette / « ces devoirs vont me tuer » / « en finir avec les devoirs ».
  - TEMPORAIRE : le prompt système est encore construit côté app (données de démo locales). Quand les données seront en base, la fonction construira elle-même le contexte depuis child_id sous RLS et n’acceptera plus de `system` du client.
- [x] S3 : clés retirées de `app.config.js` (extra), `getEnv.ts` (+ journaux qui affichaient 12 caractères de la clé), `scripts/write-env.js`, `eas-hooks/eas-build-pre-install.sh`, `.env.example`, `.env`. `.env` déjà ignoré ; `supabase/backups/` ajouté au .gitignore.
- [x] Google Vision : la clé était embarquée mais **jamais utilisée** (aucun appel OCR dans le code) → retirée sans Edge Function. Le futur OCR suivra le même modèle (fonction dédiée + secret).
- [x] S4 : toute panne d’Aria → « Aria est momentanément indisponible. » (plus de mention de clé, .env, eas.json).
- [x] S5 : secret ANTHROPIC_API_KEY posé par l’utilisateur (tableau de bord) ; fonction déployée le 23 sept (`functions deploy aria --use-api`, Docker arrêté) : ACTIVE, verify_jwt. Contrôles faits : sans en-tête → 401 passerelle ; clé anon sans session → 401 `unavailable` (y compris phrase d’urgence).
- [x] Test Redmi (compte de test, 23 sept) — question normale : « indisponible ». Journaux : 1 appel, HTTP 500 AVANT tout appel Anthropic ; cause = secret ANTHROPIC_API_KEY contenant un retour à la ligne (Deno refuse l’en-tête). La valeur ressemble à l’ANCIENNE clé de .env (même coupure). ⚠️ L’erreur Deno a recopié la clé dans les journaux de la fonction.
  - Corrigé et redéployé (v2) : secret contrôlé (absent / espace / retour à la ligne → 503 + journal SANS la valeur) ; journaux d’erreur limités à statut / type / nom (jamais le message brut) ; succès journalisé avec le modèle ; 404 → « vérifier ARIA_MODEL ».
  - Compte réel sans enfant : contexte neutre envoyé à Aria (plus les données de démo de Léa).
  - [x] Utilisateur : anciennes clés révoquées, nouvelle clé posée sur une ligne, aucune clé dans .env.
  - [x] Retest Redmi (23 sept, 18:30) : journaux de la fonction → 1 exécution, « réponse Anthropic OK », modèle **claude-sonnet-5**, stop_reason end_turn, 0 erreur ; phrase d’urgence → 0 alerte serveur et aucune autre exécution (interceptée dans l’app) → Anthropic non appelé. (Ligne HTTP de la passerelle pas encore ingérée au moment du contrôle ; le 200 se déduit du chemin de code après « OK ».)
- [x] Phrase d’urgence (Redmi) : message correct ; journaux : AUCUN appel à la fonction pour ce message (détection côté app) → Anthropic non appelé.
  - [x] Numéros cliquables dans les bulles d’Aria (tel:3114 / 3018 / 119 / 112, pas les décimaux) ; ordre selon la catégorie (numéro concerné en premier, 112 en dernier) — `buildEmergencyMessage(category)`, testé (22 cas + 3 messages).
- [x] Compte orphelin du 21 mars supprimé par l’utilisateur.
- [ ] Protocole d’urgence — suites :
  - [x] Liste de mots-clés validée ; « en finir » seul remplacé par « envie d’en finir » / « en finir avec la vie » ; « me tuer » limité à une intention en 1re personne (pas l’hyperbole).
  - [x] 3020 → 3018 partout (hors service depuis le 1er janvier 2024 ; 3018 = numéro unique harcèlement + cyberharcèlement, e-Enfance, 7j/7 9h-23h) : code, message d’urgence, JoyAlerts, MonRessenti, CLAUDE.md, VISION.md. 112 conservé.
  - [x] **Phase A** : table d’alertes (child_id + academic_year_id, catégorie, horodatage, jamais le texte du message) — faite au lot 3b. Pas de notification de l’autre responsable : alerte privée à son auteur (décision du 24 sept).
  - Ne pas ajouter la réponse « indisponible » / « urgence » à l’historique envoyé au modèle au tour suivant.

## Top bar · voile au défilement (23 sept 2026)

**Statut : FAIT. tsc OK, contrôlé en web. À REVÉRIFIER SUR LE REDMI.** Annule le fond opaque de la 0-ter (choix de design : jamais de bandeau opaque).
- [x] `components/navigation/ScrollVeil.tsx` : un seul voile haut/bas, dégradé vertical #F2F1EE (opaque du bord jusqu’au milieu de la barre, puis fondu 24 px), opacité 0 → 1 sur 16 px de scroll. Plus de BlurView pour les barres.
- [x] `TopbarScrollContext` : `scrollY` partagé (Reanimated) + `useTopbarScrollHandler()` (useAnimatedScrollHandler, republie le scroll de l’écran au focus)
- [x] Branché sur Accueil, Notes (2 vues : maternelle + collège), Agenda (jour + liste Devoirs), Messages
- [x] Top bar transparente ; pills claires sur le header indigo de l’Accueil au repos, sombres dès que le voile apparaît (inactives : icône à 60 % au lieu de 50 % pour le contraste sur #F2F1EE)
- Reste hors périmètre : BlurView encore utilisés dans AddToDiscussionSheet, JoyAlerts, JoyHistory, Portfolio, MonRessenti (à évaluer sur Android)

## Phase 0-ter · retours du test Android de la 0-bis (23 sept 2026)

**Statut : FAIT. tsc OK, contrôlé en web. À REVÉRIFIER SUR LE REDMI.**
- [x] Symbole : login et pill Aria rendaient DÉJÀ ScolariaSymbol. Les « tirets » venaient de la géométrie de référence à petite taille (ellipses de 1,4 × 2,8 px à 14 px). Ajout d’une géométrie compacte sous 32 px (mêmes 8 ellipses et angles, plus pleines). `CrownShapes` exporté et réutilisé par AriaOrb (qui avait sa propre copie avec les <G rotation> imbriqués). Icônes « sparkles » d’Aria remplacées par ScolariaSymbol : RGPD (Effacement, Export, Permissions), À propos, Météo classe, badge « Observé par Aria », onglet Aria de l’espace élève.
- [x] ~~Top bar opaque #F2F1EE~~ : annulé, remplacé par le voile au défilement (section du dessus)
- [x] « Mon compte » : lignes en ligne selon §8. Cause : `Pressable` natif + style en fonction `({ pressed }) => [...]`, ignoré sur Android (même cause que les cartes Agenda en 0-bis). Correctif global : le `Pressable` de `components/ui` résout lui-même la fonction de style, 43 fichiers redirigés. insets.bottom posé sur le conteneur de la feuille. La phase 0 n’avait remplacé aucun `gap` (seulement Pin et AjouterEnfant en 0-bis, réécrits en marges).
- [x] Initiales : `utils/childInitials.ts`, une lettre du prénom, deux si un autre enfant du foyer a la même initiale (Léa → Lé, Lucas → Lu). Appliqué : top bar, sélecteur, menu burger, Mon compte, ChildAvatar.

### Phase A/B · enfant actif incohérent (constaté sur le Redmi, NE PAS toucher avant)
- La top bar, « Mon compte », Messages et l’Emploi du temps n’utilisent pas le même enfant actif.
  - Top bar, Mon compte, Messages : `useActiveChild()` (ActiveChildContext) mais selon des chemins différents (`selectedChild` / `selectedChildId` / `getConversations(selectedChild.id)`) à réconcilier.
  - Emploi du temps : données démo codées en dur pour Emma 4ème (`TimetableScreen.tsx:70`), sans lien avec l’enfant sélectionné.
  - À traiter avec la source unique d’enfant actif (phase A/B).

## Phase 0-bis · retours du test Android (23 sept 2026)

**Statut : FAIT. tsc OK, contrôlé en web. À REVÉRIFIER SUR LE REDMI.**
- [x] ScolariaLogo : fontFamily Rufina_700Bold (au lieu de "Rufina-Bold"), fontWeight retiré
- [x] ScolariaSymbol : 8 ellipses en transform="rotate(22.5 + angle)", plus de <G rotation> imbriqués
- [x] Cartes Agenda §7 : TouchableOpacity, borderLeft 3px couleur, fond rgba(couleur, 0.08), radius 14, padding 10/12
- [x] Bas d’écran : getBottomChromeHeight() partagé par le voile flou et getBottomBarScrollPadding() (padding = voile + 12) ; conversation : « Aria peut résumer » au-dessus du champ
- [x] Messages : FAB supprimé (JSX, styles, import Plus) ; l’action reste le ✏️ de la bottom bar
- [x] Bouton « Tools » : FAB d’expo-dev-menu, dev client uniquement (absent des builds release), rien à changer dans le code
- [x] TextInput Figtree (wrapper ui) : 17 fichiers redirigés
- [x] PinScreen et AjouterEnfantScreen en clair : fond #F2F1EE, textes #0F172A, inputs §5, bouton primaire §2 (+ icônes lucide, gap → marges)
- Reste : Phase B (FAB Agenda vs + bottom bar, voir plus bas)

## Addendum v3.4 · PHASE 0 : nettoyage des anciennes décisions (22 sept 2026)

**Statut : FAIT (22 sept 2026). Liste validée, Q1-Q5 acceptées. tsc OK, vérifié en localhost (web). Commit 5116cca. Retours Android traités en phase 0-bis.**
Périmètre : aucun changement de BDD, aucun nouvel écran.

### Réalisé
- [x] Fonds → #F2F1EE : tokens `SCREEN_BACKGROUND`, `C.bg`, `PAGE_BG_OFF_WHITE`, `SchoolMode.bg`, `TabNavigator` (conteneur principal), 8 constantes locales, NotesScreen, EditProfile (fond sombre dégradé supprimé), thème React Navigation (`App.tsx`, fond des cartes de navigation `rgb(242,242,242)` → #F2F1EE), pdfExport
- [x] Emoji de matières : 121 clés JSON retirées (demo-agenda 100, demo-subjects 21), mocks + types (Agenda, Notes, DemoContext), `subjectEmoji` (SubjectDetail), cercle emoji des cartes Agenda + emoji des pills de type de la modale Agenda
- [x] Violets → #4338CA (104 remplacements + halo PIN) ; `Colors.violet*`, `tokens.accent/info`, `SchoolMode.accent` ; bloc « Child theme accents » retiré de tailwind.config.js
- [x] `constants/themes.ts` supprimé ; ChildThemeContext réduit à un passe-plat ; SchoolModeContext : thème unique (plus d'`ariaEmoji`, de « Aria Coach », de `headerGradientFull`)
- [x] Figtree par défaut : `Text` de `src/components/ui` (graisse → variante Figtree, fontWeight retiré) + `cssInterop` pour les className ; 66 fichiers redirigés de `react-native` vers `components/ui` ; DMSans → Figtree (9) ; tailwind `fontFamily` → Figtree. Contrôle web : 157 textes visibles en Figtree, 0 en police système.
- [x] `LogoScolaria.tsx` (Barlow/DM Sans) supprimé, remplacé par `ScolariaLogo` dans À propos
- [x] BurgerMenu : « Le carnet de scolarité numérique »
- [x] 25 dégradés décoratifs → fonds unis ; ~20 tuiles à bordures colorées → `rgba(15,23,42,0.06)`
- [x] Couleur enfant (Q1) : avatar top bar, sélecteur, profil et header Accueil en indigo neutre #4338CA (texte du header passé en blanc, dégradé vertical)

### Restes signalés (hors liste validée)
- ~~Écrans encore sombres (PinScreen, AjouterEnfant)~~ : faits en phase 0-bis.
- Emoji en état vide de l'Agenda (« Journée libre 🏖️ ») : ce n'est pas une carte, conservé.
- ~~TextInput en police système~~ : fait en phase 0-bis.
- `SuperPowerBadge.tsx` : jamais monté (seul son type est importé), à supprimer lors d'un nettoyage.
- Imports `LinearGradient` inutilisés déjà présents avant la phase 0 : AgendaScreen, MessagesListScreen, SignDocScreen.
- ~~ScolariaLogo Rufina-Bold~~ : corrigé en phase 0-bis.

### Phase B · écart à corriger (NE PAS toucher avant)
- **FAB Agenda** : CLAUDE.md prévoit un FAB circulaire sur l'Agenda et **aucune** action dans la bottom bar (« Agenda → rien, le FAB suffit »). Le code fait l'inverse : pas de FAB, et un `+` dans la bottom bar (`BottomBar.tsx:58`, `TabNavigator.tsx:659` `agendaActionRef`). À aligner en Phase B.

#### NAVIGATION (décision validée)
- Top bar : [☰ burger] [onglets] ... [avatar enfant]. On GARDE le burger (ne pas le supprimer même si CLAUDE.md dit autre chose : la doc sera mise à jour).
- ☰ burger → écran unique « Famille & paramètres ».
- Avatar → sélecteur d'enfant UNIQUEMENT (liste des enfants + indicateur de nouveauté + ajouter un enfant). Plus de réglages dans ce sélecteur.
- Supprimer l'ouverture du menu par swipe (conflit avec le pager).

#### FUSION RÉGLAGES → « Famille & paramètres » (base visuelle : écran Mon compte actuel)
- Structure : Mes enfants · Responsables légaux · Mon profil · Apparence (fond de l'Accueil PAR ENFANT : couleur de l'enfant ou photo nature, un seul système) · Notifications (3 réglages max : mots & messages / résumé 18h / silence 20h–7h) · Aria (activée, personnalité, langue saisie vocale) · Confidentialité & données (code, autorisations, export) · Système (haptique) · Compte (aide, à propos, quitter la démo / déconnexion).
- Supprimer l'ancien écran Réglages et ses entrées hors sujet : Capacités, Connecteurs, Liens partagés, Thème Auto, fonds dégradés abstraits.
- Supprimer le doublon « Résumé quotidien 8h00 » d'Aria.
- Ne pas déranger → 20h–7h.
- « Face ID » affiché sur Android → libellé selon la plateforme.


#### Phase 2 · protocole d’urgence en production
- La détection par mots-clés (`supabase/functions/_shared/emergency.ts`) est une solution de DÉMO. En production : détection plus robuste (contexte, formulations indirectes, fautes, langage enfant/ado), validée par le comité éthique avant mise en service.

#### AUTRES
- Écran Aria sur un compte SANS enfant : affiche « Comment va Léa aujourd’hui ? » et d’autres suggestions tirées des données de démo en dur → suggestions et titres liés à l’enfant actif (ou génériques s’il n’y a aucun enfant).
- Écran Aria : suggestions en cartes 2×2 avec emoji → pills horizontales (règle CLAUDE.md).
- Accueil : notes /20 et carte Aria sur Emma affichées pour Léa (GS) → toutes les données liées à l'enfant actif.
- Enfant actif incohérent entre top bar, sélecteur, Messages et Emploi du temps (codé en dur pour Emma) → une seule source (détail : section « Phase A/B · enfant actif incohérent »).
- Agenda : FAB prévu par CLAUDE.md, action + actuellement dans la bottom bar → à aligner (détail : « FAB Agenda » ci-dessus).
- Header de l'Accueil : carte 130px arrondie (CLAUDE.md), couleur de l'enfant.

### Contrôle préalable
- Un seul CLAUDE.md projet (`./CLAUDE.md` v3.1). Les autres CLAUDE.md sont dans `.claude-plugin/` (plugins tiers, gitignorés), donc hors sujet.
- Un seul addendum, `docs/archives/ADDENDUM_v3.4_Scolaria.md`, rangé au bon endroit.

### a) Fonds de page ≠ #F2F1EE
Cause racine : les tokens valent `#F7F7F5` (ancien fond). Corriger à la source suffit pour ~30 écrans.
- `src/constants/colors.ts:2` : `SCREEN_BACKGROUND = '#F7F7F5'` (utilisé par ~20 écrans et par `tokens/colors.ts`, `themes.ts`)
- `src/constants/design.ts:10` : `C.bg = '#F7F7F5'` (Accueil, Agenda, Messagerie, EventDetail, GradeDetail, Homework, SignDoc, SignSuccess, DeepScreenHeader)
- `src/constants/theme.ts:101` : `PAGE_BG_OFF_WHITE = '#F7F7F9'`
- **`src/navigation/TabNavigator.tsx:874` : conteneur principal `#F2F2F7`**, visible derrière toutes les stacks (contentStyle transparent l. 246-306)
- `src/contexts/SchoolModeContext.tsx:72,91` : `bg` / `backgroundColor` `#F2F2F7` (lus par AjouterAnneScreen:301, EleveTabNavigator:34,56,83,105,207)
- Constantes locales : `ConnexionScreen.tsx:18`, `EditProfileScreen.tsx:42`, `InscriptionScreen.tsx:11`, `LoginScreen.tsx:8` (`BG = '#F7F7F5'`) ; `MonRessentiScreen.tsx:30`, `ProfilEnfantScreen.tsx:64,660` (`'#F2F4F8'`)
- En dur : `NotesScreen.tsx:1996,2016` (`#F7F7F5`) ; `EditProfileScreen.tsx:451` (root `#1F1F2E`, sombre)
- Fonds de panneau `#F2F2F7` : `UniversalInputBar.tsx:244,257`, `chat/AddToDiscussionSheet.tsx:252`
- Hors appli : `services/pdfExport.ts:117,261,277,303` (`#F7F7F5` dans le HTML exporté)

### b) Emoji sur les matières
- Données de démo : `src/data/demo/demo-agenda.json` (100 lignes avec `"emoji"`), `src/data/demo/demo-subjects.json` (21 lignes, domaines maternelle + matières)
- `src/screens/NotesScreen.tsx:108` (type `emoji: string`), `:182,190` (mock matières), `:1164,1294` (repli `'📚'`). NB : pas affiché dans Notes (l. 399 retire déjà les pictogrammes).
- `src/screens/SubjectDetailScreen.tsx:5,40,155,187,256` : param `subjectEmoji` **affiché** en en-tête (aucun appelant ne le passe aujourd'hui)
- `src/screens/AgendaScreen.tsx:91` (type), `:123-125` (`NEW_EVENT_TYPE_EMOJI`), `:193-195` (`DEFAULT_EMOJI`), `:210-234` (mock), `:521,564`, **`:777-780` : cercle emoji affiché dans chaque carte Agenda** (interdit aussi par la règle « jamais d'emoji dans une card Agenda »)
- `src/services/database.ts:129` : `select('*, subjects(name, emoji, color)')`. Lecture seule, pas de changement de schéma. On ignore simplement le champ côté UI.
- Page « Personnaliser matières » : **n'existe pas dans src/**, rien à corriger.

### c) FAB non circulaires
- `src/screens/MessagerieScreen.tsx:1339-1368` : **déjà conforme** (48×48, radius 999, bottom 72, right 14)
- **Agenda : pas de FAB.** L'ajout passe par le `+` de la bottom bar (`BottomBar.tsx:58`, `TabNavigator.tsx:659`), ce qui contredit CLAUDE.md (« Agenda → rien, le FAB suffit »). → [UNCLEAR] voir Q2
- Commentaires obsolètes : `AgendaScreen.tsx:9-10` (« FAB: black square-rounded »), `messagerie/MessagesListScreen.tsx:8` (FAB inexistant)

### d) Thèmes par niveau / couleur enfant / #7C3AED
- `src/contexts/SchoolModeContext.tsx:1-9` : doc « maternelle chaude / primaire cosmique / lycée blanc » ; `:83-87` accent `#7C3AED` ; `:92` `headerGradientFull` bleu `#1E3A5F→#3B7DD8→#89B4E8` (non lu) ; `:104,111,118` `ariaEmoji` 🧸/✦/🎯 (non lu) ; `:112,119` `ariaLabel` « Aria ✦ » / « Aria Coach » (lu par `EleveTabNavigator.tsx:210`)
- `src/contexts/ChildThemeContext.tsx:49-53` : table thème par enfant (ambre/ocean/lavande), sans effet ; `:66` commentaire violet
- `src/constants/themes.ts` (103 l.) : `CHILD_THEMES` à 9 thèmes dont violet `#7C3AED`. **Aucun import : code mort.**
- `src/tokens/colors.ts:17,18,22,39,44` : `accent`/`info` `#7C3AED` / `#A78BFA`
- `src/constants/colors.ts:19-21` : `Colors.violet #6D28D9`, `violetLight #7C3AED`, `violetDark #5B21B6` (source de la majorité des violets ci-dessous)
- `src/constants/theme.ts:108` : commentaire « thème enfant Violet »
- `src/screens/EditProfileScreen.tsx:45` : `CHILD_COLORS` avec `#7C3AED`
- Couleur de l'enfant : **n'existe pas dans le modèle** (`ActiveChildContext.tsx:27-37`, pas de champ `color`). Avatar top bar = dégradé fixe `#818cf8→#6366f1` (`TopBar.tsx:146`) ; avatar du sélecteur = `#818cf8` (`ChildSelectorSheet.tsx:205`) ; header de l'Accueil = dégradé fixe multicolore mauve/rose/orange de 440 px (`AccueilScreen.tsx:123-135`). → [UNCLEAR] voir Q1
- Violets interdits (#7C3AED, #6D28D9, #8B5CF6, #A78BFA, #C4B5FD, #EDE9FE, rgba(124,58,237), Colors.violet*, C.violet, VIOLET), fichier : lignes
  - `components/ConseilDuMatin.tsx` : 51,233 · `GlobalChildSwitcher.tsx` : 26,36,148 · `chat/TypingIndicator.tsx` : 44 · `checkin/RessentiSlider.tsx` : 7,36
  - `profile/JoyAlerts.tsx` : 331,344 · `profile/JoyHistory.tsx` : 50 · `profile/Portfolio.tsx` : 7,40,114 · `profile/SuperPowerBadge.tsx` : 41
  - `contexts/WallpaperContext.tsx` : 95
  - `data/demo/demo-agenda.json` : 2,9,14,19,24,30,33,39,48,56,92 · `demo-dashboard.json` : 11,29,48 · `demo-subjects.json` : 8,14
  - `screens/AProposScreen.tsx` : 73,97,244,259,266,316,321,326,378,476
  - `screens/AgendaScreen.tsx` : 197,198,211,221,225,230,524,566
  - `screens/AjouterEnfantScreen.tsx` : 233,415,416,443,474
  - `screens/ArchivedYearDetailScreen.tsx` : 48,298 · `HomeworkScreen.tsx` : 87,88 · `MessagerieScreen.tsx` : 59
  - `screens/MonParcoursScreen.tsx` : 84,254,378 · `MonRessentiScreen.tsx` : 68 · `SignalerAbsenceScreen.tsx` : 78
  - `screens/NotesScreen.tsx` : 737,810-812,1033,1050,1069,1505,1513,1717,1725,2165,2177,2196,2261,2347,2377,2426,2433,2449
  - `screens/PinScreen.tsx` : 31,154,306
  - `screens/ProfilEnfantScreen.tsx` : 66,142,167,180,209,210,223,248,272,280,290,316,604,662,740,753,760,765,804,814,823,836
  - `screens/TextSizeScreen.tsx` : 83,116,122 · `WallpaperPickerScreen.tsx` : 187,201
  - `messagerie/EcoleListScreen.tsx` : 68 · `messagerie/MessagesListScreen.tsx` : 218,485 · `messagerie/MotDetailScreen.tsx` : 119
  - `rgpd/EffacementScreen.tsx` : 386
  - `teacher/AppreciationsScreen.tsx` : 278,279,312,313,344,345,430,459,461,473,481,514,519,521 · `teacher/MeteoClasseScreen.tsx` : 318,325 · `teacher/TeacherDashboardScreen.tsx` : 201 · `teacher/VieDeClasseScreen.tsx` : 190,375,392,395,422,504,505,520
  - `services/pdfExport.ts` : 68,82,104,114,125,268,292,299,379

### e) Polices (DM Sans, Barlow, système)
- `src/components/LogoScolaria.tsx` : **ancien logo** « SCOL » en BarlowCondensed + « aria » en DMSans avec dégradé (l. 26-27, 51-56, 74). Utilisé par `AProposScreen.tsx:36,167,277`. Viole aussi la règle « police uniforme, pas de traitement spécial sur ia ».
- `src/navigation/EleveTabNavigator.tsx:36,58,85` : `fontFamily: 'DMSans_700Bold'` (police non chargée, donc repli système)
- `tailwind.config.js:76-78` : `fontFamily.heading/body = ["System"]` (0 usage de `font-heading/font-body`)
- **Aucune police par défaut globale** : tout `<Text>` sans `fontFamily` s'affiche en police système. Fichiers sans aucune référence à Figtree :
  `ConseilDuMatin.tsx` (10 Text), `GlobalChildSwitcher.tsx` (6), `profile/SuperPowerBadge.tsx` (9), `AjouterAnneScreen.tsx` (28), `teacher/AbsencesEnseignantScreen.tsx` (15), `teacher/TeacherDashboardScreen.tsx` (40)
  + 193 `className="font-bold|semibold|…"` NativeWind (graisse système) dans : ChatBubble, ConseilDuMatin, GlobalChildSwitcher, JoyAlerts, SuperPowerBadge, AjouterAnne, AjouterEnfant et les 7 écrans teacher/
- `fontWeight` numérique combiné à une Figtree (sur Android, peut basculer en police système) : `RessentiSlider.tsx:57`, `TopBar.tsx:264`, `AccueilScreen.tsx:301,308`, `AriaConversationScreen.tsx:797`, `AriaHomeScreen.tsx:825`, `MonRessentiScreen.tsx:447`, `NotesScreen.tsx:2090,2117,2293`, `ProfilEnfantScreen.tsx:813,864,910`
- `services/pdfExport.ts:103,291` : `-apple-system, 'Segoe UI'` (PDF, hors appli)
- [UNCLEAR] `ScolariaLogo.tsx:54,65,76,87` : `fontFamily="Rufina-Bold"`, alors que la police est chargée sous le nom `Rufina_700Bold`. À vérifier sur appareil.

### f) Symbole ✧ et dégradé #8B5CF6 → #1B72E8
- **0 occurrence.** Déjà propre.
- Dégradés « faux Aria » violet→cyan hors contexte Aria : voir i).

### g) Graphie « ScolarIA »
- **0 occurrence** dans src/, app.config.js, package.json, eas.json. (`design.ts:2` « SCOLARIA » est un commentaire en capitales, pas un problème.)
- Traitement spécial de « aria » dans le wordmark : `LogoScolaria.tsx` (voir e).

### h) Tagline « copilote »
- **0 occurrence** de « copilot* ».
- Taglines non conformes (« passeport scolaire ») : `components/BurgerMenu.tsx:192` (« Passeport scolaire numérique ») ; `AjouterEnfantScreen.tsx:226` ; `i18n/locales/*.ts` `slide1Desc` (clés onboarding **non utilisées**, aucun `t('onboarding…')`).
- Conforme : `LoginScreen.tsx:26` « Le carnet de scolarité numérique ».

### i) Tuiles à bordures colorées / micro-dégradés (design de mars)
- Micro-dégradés décoratifs (hors Aria, hors wallpaper) :
  `NotesScreen.tsx:1032,1049,1068,1590,1632,1976` · `ProfilEnfantScreen.tsx:271,279,289` · `ArchivedYearDetailScreen.tsx:297` (`#7C3AED→#06B6D4`) · `EditProfileScreen.tsx:224,303` · `AjouterEnfantScreen.tsx:232,441,471` · `AjouterAnneScreen.tsx:359,375` · `PinScreen.tsx:80,153` · `profile/SuperPowerBadge.tsx:136,235` · `EventDetailScreen.tsx:138` · `TopBar.tsx:146` (avatar) · `teacher/*` : Absences:181, Appreciations:262,429, MeteoClasse:208,317, TeacherDashboard:151, VieDeClasse:357,421
- Dégradés conformes (Aria ou carte Aria) : AriaActionCard:135, AriaInlineCard:23, ChatBubble:112, ConseilDuMatin:220, JustifierAbsenceSheet:160, GradientButton:56, UniversalInputBar:153, Accueil:242, Bulletin:191, ConversationDetail:77
- Bordures colorées sur des tuiles : `teacher/CahierLiaisonScreen.tsx` (7 : 181,229,247,486…) · `teacher/AppreciationsScreen.tsx` (3) · `profile/SuperPowerBadge.tsx` (3, dont 232) · `AjouterEnfantScreen.tsx` (2) · `AjouterAnneScreen.tsx:240` · `AProposScreen.tsx` · `TeacherDashboardScreen.tsx:213` (orange) · `MessagerieParentsScreen.tsx` · `rgpd/PermissionsScreen.tsx` · `aria/AriaActionCard.tsx:160,172,177,219,247` · `MonRessentiScreen.tsx:464` · `teacher/MeteoClasseScreen.tsx:315` · `TextSizeScreen.tsx:83,116` + `WallpaperPickerScreen.tsx:187` (sélection violette)

### Questions à trancher avant correction
- **Q1 [UNCLEAR] Couleur de l'enfant** : le champ n'existe pas. Proposition phase 0 : ne pas le créer (ce serait de la donnée, donc hors phase 0). Supprimer tout le reste (themes.ts mort, table ChildThemeContext, accent violet), et passer l'avatar et le header de l'Accueil sur un neutre indigo `#4338CA` en attendant la phase qui ajoutera `students.color`.
- **Q2 [UNCLEAR] FAB Agenda** : il n'existe pas (c'est le `+` de la bottom bar). Proposition : ne rien ajouter en phase 0 (ce serait un nouvel élément d'UI) et le noter pour la phase Agenda.
- **Q3 Espaces enseignant / élève / sandbox** : les inclure dans le balayage ? Proposition : oui pour fond, violet et polices ; non pour le bandeau orange enseignant (thème de rôle, pas de niveau).
- **Q4 pdfExport.ts** (HTML exporté) : proposition : fond et violet oui, police non (Figtree n'est pas embarquée dans le PDF).
- **Q5 Emoji non-matière** (activités extrascolaires de ProfilEnfant, compétences d'Appreciations, ConseilDuMatin, Score de Joie) : proposition : on les garde (contenu autorisé), on ne retire que les emoji matière et Agenda.

### Plan de correction (après validation)
1. Tokens à la source : `SCREEN_BACKGROUND`, `C.bg`, `PAGE_BG_OFF_WHITE` → `#F2F1EE` ; `Colors.violet*`, `tokens.accent/info`, `SchoolMode.accent*` → `#4338CA` ; `TabNavigator:874` + `SchoolMode.bg` → `#F2F1EE`
2. Constantes locales et valeurs en dur (a, d)
3. Emoji matière : retrait des clés JSON, des types, des mocks et du cercle emoji dans les cartes Agenda ; retrait de `subjectEmoji`
4. Thèmes : suppression de `constants/themes.ts`, de la table ChildThemeContext, des `ariaEmoji` / `ariaLabel` par niveau, de `headerGradientFull` ; doc SchoolModeContext
5. Polices : police Figtree par défaut sur `Text` (un seul point d'entrée) + DMSans → Figtree + `LogoScolaria` → `ScolariaLogo` + suppression de `LogoScolaria.tsx`
6. Micro-dégradés hors Aria → aplat ; bordures colorées de tuiles → `rgba(15,23,42,0.06)`
7. Taglines « passeport » → « Le carnet de scolarité numérique » / « carnet »
8. `tsc --noEmit`, vérification localhost, pas de build EAS ; mise à jour de lessons.md

---

# Historique · UI Sprint v3.0

## Sprint v3.0 — COMPLÉTÉ (5 mai 2026)

### Fondations
- [x] `src/constants/design.ts` — tokens C, RADIUS, SHADOW, BOTTOM_BAR_HEIGHT
- [x] `src/components/WhiteCard.tsx` — carte blanche Android-safe (2 Views)
- [x] `src/components/DeepScreenHeader.tsx` — header écrans profonds
- [x] `src/components/AriaInlineCard.tsx` — card Aria gradient EEF2FF→F0FDFA

### Écrans mis à jour
- [x] `AccueilScreen.tsx` — fix gap Android, pattern 2-Views todayListWrap/recentCard, tokens C

### Nouveaux écrans deep
- [x] `HomeworkScreen.tsx` — cahier de texte Emma 4ᵉB
- [x] `TimetableScreen.tsx` — emploi du temps
- [x] `EventDetailScreen.tsx` — détail événement agenda
- [x] `GradeDetailScreen.tsx` — détail note + sparkline SVG
- [x] `SignDocScreen.tsx` — signature autorisation
- [x] `SignSuccessScreen.tsx` — confirmation signature

### Onboarding
- [x] `src/screens/onboarding/OnboardingSplashScreen.tsx`
- [x] `src/screens/onboarding/OnboardingSignupScreen.tsx`
- [x] `src/screens/onboarding/OnboardingSchoolCodeScreen.tsx`
- [x] `src/screens/onboarding/OnboardingLinkChildScreen.tsx`

### Navigation
- [x] `TabNavigator.tsx` — 6 nouveaux écrans enregistrés dans leurs stacks

## Pending — Sprint v3.1
- [ ] NotesScreen v3 redesign (sparkline Figtree, pills matières, cartes extensibles)
- [ ] AgendaScreen v3 (FAB cercle, event cards sans emoji)
- [ ] MessagerieScreen v3 (search toolbar, conversation rows avec tags)
- [ ] AriaScreen v3 (topbar spécifique, suggestions centré, input Aria)
- [ ] `npx expo run:android` — test visuel des nouveaux écrans
- [ ] EAS build quand tout est validé localhost
