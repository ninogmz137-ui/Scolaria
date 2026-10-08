# Audit — tout ce que l'utilisateur voit et qui change le jour où le nom change (RAPPORT SANS CODE)

*8 octobre 2026. Méthode : balayage du code (`src`, `supabase/functions`, `App.tsx`, `app.config.js`, `eas.json`, `package.json`), hors tests, hors
commentaires, hors données de démo (aucune ne contient le nom) ; lecture des fichiers de configuration, des assets et des traductions. Ce rapport
complète `tasks/renommage.md` (27 sept., inventaire par type) : il le recoupe PAR ÉCRAN et mesure l'écart avec la règle « tout passe par `NOM_APP` ou
`NOM_ASSISTANT` ». Aucun fichier de code n'est modifié.*

## 0. Réponse courte

**Non, tout ne passe pas par `NOM_APP` / `NOM_ASSISTANT`.**

| | Source unique en place | Couverture réelle |
|---|---|---|
| **Nom de l'application** (`NOM_APP`) | `supabase/functions/_shared/marque.ts`, ré-exportée par `src/constants/marque.ts` (variante démo : libellé de la variante) | **17 fichiers, 44 occurrences** ; `%{app}` injecté par `t()` dans les traductions. **5 sites visibles restent en dur** (§ 3) + le **wordmark** dessiné et les **assets** nommés (§ 4) + le **préfixe d'identifiant « SCA »** (§ 5) |
| **Nom de l'assistant** (`NOM_ASSISTANT`) | `src/constants/marque.ts` (« Aria ») | **2 fichiers, 5 occurrences** (la carte de l'Accueil seulement). **Environ 135 chaînes visibles écrivent « Aria » en dur** (§ 2) : ~55 dans les écrans, services et le serveur, + 81 valeurs de traduction ; `t()` n'injecte pas `%{assistant}` : « Aria » est écrit tel quel dans les 10 langues (et translittéré en arabe) |

Chiffres du balayage : le nom de l'application apparaît **56 fois hors tests et commentaires, dans 28 fichiers** : **5 lignes l'écrivent dans un texte
visible** (§ 3), les 51 autres sont des identifiants, clés de stockage, schéma d'URL, noms de variables ou la source unique (`marque.ts`) ; « Aria » apparaît **224 fois dans 45
fichiers** (dont beaucoup de noms de composants, de routes et de journaux de fonction, invisibles).

## 1. Ce qui est déjà correct (passe par `NOM_APP`)

Accueil (carte « dans … »), Ajouter un enfant (« Identifiant … »), Profil enfant, À propos (principe, ©), pied de Famille & paramètres, Messages (état
vide), Permissions (écran d'autorisations), Recherche (texte d'invitation), partage du « super-pouvoir » (`SuperPowerBadge`), PDF (logo texte),
export du carnet (`application` dans `donnees.json`, `LISEZMOI.txt` : paramètre `nomApp`), message d'erreur réseau (par un remplacement : voir § 3),
e-mails des Edge Functions (invitation : `_shared/marque.ts`), prompts de l'assistant (« l'assistante IA de … »), intro de démo, traductions
`%{app}` dans les 10 langues (sauf l'arabe : § 3), variante démo (libellé de l'icône, écran d'ouverture, écrans : `test:nom-affiche-demo` 119/119).

## 2. « Aria » écrit en dur, par écran (À CORRIGER : passer par `NOM_ASSISTANT`)

| Écran / zone | Ce que l'utilisateur voit | Où |
|---|---|---|
| **Bottom bar (tous les écrans)** | libellé d'accessibilité « Demander à Aria » ; texte « Demander à Aria… » | `BottomBar.tsx` (130, 134) |
| **Accueil** | carte de l'assistant : **déjà** `NOM_ASSISTANT` ✓ | `AccueilScreen.tsx` |
| **Écran de l'assistant (accueil et conversation)** | titre « Aria », « Demandez à Aria… », « Impossible de contacter Aria… », tiroir « Aria », bulles « Aria ✦ » / « Aria réfléchit », bonjour « Je suis Aria », message d'aide | `AriaHomeScreen` (12), `AriaConversationScreen` (13), `AriaScreen` (7), `ChatBubble` (4), `ariaApi.ts` (indisponible, limite du jour, désactivée, intro démo : 10) |
| **Garde de l'assistant (première fois / désactivée)** | « Avant d'utiliser Aria », « Aria est désactivée », 3 phrases, bouton « Activer Aria » | `AriaGarde.tsx` (5) |
| **Famille & paramètres** | groupe « Aria », « Aria activée », « Le ton qu'Aria utilise avec vous » | `FamilleParametresScreen.tsx` (3) |
| **À propos** | 4 engagements : « Aria ne remplace jamais un professionnel… », « Aria explique toujours… », « Aria observe une tendance… », « Aria sort de son rôle… » | `AProposScreen.tsx` (4) |
| **Mention légale d'hébergement** (texte validé) | « Aria s'appuie sur un modèle d'Anthropic… » (4 lignes) | `constants/textesLegaux.ts` |
| **Détails (note, devoir, bulletin, événement, document à signer, succès de signature)** | carte « ARIA », « Demander à Aria », bouton, étiquette « Aria », « Aria a pré-rédigé pour vous » | `BulletinScreen`, `EventDetailScreen` (6), `GradeDetailScreen`, `HomeworkScreen`, `SignDocScreen`, `SignSuccessScreen`, `JustifierAbsenceSheet`, `AriaInlineCard` (étiquette par défaut), `AriaActionCard` (« Aria · Action ») |
| **Profil enfant** | « Observé par Aria » (super-pouvoir) | `SuperPowerBadge.tsx` |
| **Effacement** | « … vos conversations Aria » | `EffacementScreen.tsx` |
| **Espace enseignant** | « Aria rédige… », « Cochez les compétences, Aria rédige… », étiquette « Aria » | `AppreciationsScreen.tsx` (3) |
| **Export du carnet (fichier lu hors de l'app)** | `LISEZMOI.txt` : « conversations Aria… » (2 lignes) | `archiveCarnet.ts` |
| **Traductions (10 langues)** | `aria`, `ariaCard`, `notifAria`, `teacherAppreciationsSub`, `slide2Highlight`, `talkAria`, `subtitle`, `generating`, titre « Aria ✦ » : **9 valeurs par langue** (81 valeurs en 9 langues), « Aria » littéral ; **en arabe le nom est translittéré** (« آريا ») | `src/i18n/locales/*.ts` |
| **Message d'urgence (serveur)** | « Aria ne peut pas répondre seule à cette situation » (texte affiché à l'utilisateur) | `supabase/functions/_shared/emergency.ts` (84) |
| **Prompts du modèle** | « Tu es Aria, l'assistante IA de … » (2 prompts) : **gardent leur nom, par décision** (commentaire de `marque.ts`) ; à garder cohérent avec `NOM_ASSISTANT` quand même | `ariaApi.ts` (56, 85) |
| À vérifier | `SchoolModeContext.tsx` : `ariaLabel: 'Aria'` (libellé de mode) : affiché ou non ? | 1 ligne |

**Écart de mécanisme** : `t()` n'injecte que `app` (`i18n/index.ts` 124). Il faudrait aussi `assistant: NOM_ASSISTANT`, puis écrire `%{assistant}` dans
les 81 valeurs ci-dessus ; les chaînes en dur hors i18n (écrans, composants) importeraient `NOM_ASSISTANT`. Le nom de l'assistant est une **décision de
produit distincte** de celle du nom de l'application : s'il ne change pas, rien n'est urgent ; mais la règle « aucun nom en dur » est violée à environ 135 endroits.

## 3. Nom de l'application en dur dans le code, VISIBLE (À CORRIGER)

| Où | Texte | Remarque |
|---|---|---|
| `app.config.js` 26 | `name: 'Scolaria'` | nom sous l'icône (Android et iOS) ; la variante démo le remplace par `APP_LIBELLE_DEMO` |
| `app.config.js` 49 et 51 | permissions iOS : « Scolaria utilise la caméra pour scanner les bulletins scolaires. » / « Scolaria accède à vos photos pour importer des bulletins scolaires. » | texte IMPOSÉ par l'App Store, visible dans la boîte système. `app.config.js` ne lit pas `src/` : valeur littérale. **Texte aussi PÉRIMÉ** : il ne dit pas que l'appareil photo sert aussi à la photo de l'enfant (point de conformité App Store, indépendant du nom) |
| `src/services/erreurs.ts` 46 | « Impossible de joindre Scolaria. Vérifiez votre connexion… » | corrigé à l'affichage par `EtatErreur` (`brut.replace(/Scolaria/g, NOM_APP)`) : fragile, fonctionne tant que ce texte passe par `EtatErreur` ; à remplacer par `%{app}` |
| `src/i18n/locales/ar.ts` 206 | `scolariaId: 'معرّف سكولاريا'` | seule langue sans `%{app}` : le nom est translittéré en arabe |
| `src/i18n/locales/ar.ts` 6 | `aria: 'آريا'` | idem pour l'assistant |
| Variante démo | `demo@scolaria.fr`, `prof@scolaria.fr` (`AuthContext`) | **non affichés** (aucun écran ne les montre) ; la variante démo utilise `demo@exemple.invalid` ; domaine qui ne nous appartient pas |

## 4. Identité visuelle (À REFAIRE, pas une constante)

- **Wordmark `ScolariaLogo`** : le dessin écrit littéralement « Scolar » + « ı » (sans point) + « a » en SVG (Rufina 700) avec l'étincelle posée sur le i ;
  constantes de largeur propres aux lettres (`SCOLAR_RATIO` 2,88). Affiché par `LogoMarque` (écran d'ouverture, connexion). Un autre nom exige un autre dessin.
- **Assets nommés d'après le nom** : `assets/icon-scolaria.svg`, `assets/logo-scolaria{,-light,-transparent}{,@2x,@3x}.{png,svg}` (10 fichiers),
  `assets/logos/scolaria-{icon,wordmark-dark,wordmark-light}.svg` (3) : le contenu des logos-textes est à refaire.
- **Icône d'application et écran de démarrage** : `assets/icon.png` (symbole seul sur blanc, aucun texte : **indépendant du nom** ✓) ; l'écran de démarrage
  réutilise la même image ✓ ; icône adaptative Android (symbole) ✓ ; `favicon.png` (web) à vérifier.
- **Composants** `ScolariaSymbol` (64 usages), `ScolariaAppIcon` : noms de fichiers seulement (symbole sans texte) : renommage mécanique, invisible.

## 5. Identifiants VISIBLES dérivés du nom

| Élément | Où il est vu | Source |
|---|---|---|
| **Identifiant de l'enfant « SCA-AAAA-FR-XXXXXX »** | écran Ajouter un enfant (« Identifiant … »), Profil enfant, export PDF (étiquette), export JSON | `AjouterEnfantScreen.tsx` 68 (génération), trigger SQL du baseline (`SCA-`), colonne `children.scolaria_id` |
| **Code de transfert « SCA-TRANSFER-AAAA-XXXXXX »** | écran de code de transfert (RGPD) | `rgpdService.ts` 61, `TransfertCodeScreen.tsx` (4 lignes de maquette) |
| Données de maquette `SCA-2026-FR-0487xx` | Profil enfant et services de contexte (cas sans base) | `ProfilEnfantScreen`, `childContext.ts` |

## 6. Hors écrans : e-mails, notifications, permissions, mentions légales

| Sujet | État | À faire au changement de nom |
|---|---|---|
| **E-mails des Edge Functions** (invitation d'un second responsable) | nom par `NOM_APP` ✓ (`_shared/marque.ts`) ; liens `<schéma>://…` lus dans la config | changer `NOM_APP` ; le schéma suit `scheme` |
| **E-mails d'authentification** (confirmation, mot de passe oublié) | modèles Supabase PAR DÉFAUT (anglais, « Supabase Auth », aucun nom de produit), expéditeur non configuré (SMTP Brevo en attente) ; `config.toml` : `project_id = "Scolaria"` (nom du conteneur local, invisible) | au moment du SMTP : nom d'expéditeur, objets et modèles au nouveau nom, en français ; modèles à versionner dans `supabase/templates/` |
| **Notifications** | **aucune n'existe** (NON IMPLÉMENTÉ) ; le plugin `expo-notifications` n'a qu'une icône et une couleur ; le titre d'une notification système est le nom de l'app (libellé de l'icône) | quand le push sera construit : texte « Prénom · … » (jamais le nom de l'app dans le corps) ; le nom vient de `name` |
| **Permissions** | Android : aucune chaîne affichée (liste de permissions seulement) ; iOS : 2 chaînes en dur (§ 3) | réécrire avec le nouveau nom ET le vrai usage (photo de l'enfant, bulletins) |
| **Mentions légales / politique de confidentialité** | **retirées de l'app** (`LoginScreen` : « RETIRÉES tant que la page … n'existe pas ») ; brouillon `tasks/politique-confidentialite-brouillon.md` avec `{EDITEUR}` et `{NOM_APP}` | publier avec le nouveau nom et l'éditeur ; `textesLegaux.ts` (hébergement) reste vrai tel quel |
| **Export du carnet** | `LISEZMOI.txt` et `donnees.json` : `NOM_APP` ✓ ; clé technique `scolaria_export` (format du fichier RGPD) et nom de l'archive `carnet-<prénom>-<date>.zip` (sans nom) | décider de renommer la clé de format (change le format lu par un outil tiers) |
| **Fichiers de sauvegarde, dossiers locaux** | `ScolariaBackups`, conteneur `supabase_db_Scolaria` | invisibles pour les familles |

## 7. Identifiants TECHNIQUES (invisibles ; lot dédié après le choix du nom, voir `tasks/renommage.md` § 1 et 2)

`slug`, `scheme`, `ios.bundleIdentifier`, `android.package` (DÉFINITIFS sur les stores : à fixer AVANT le premier build iOS) ; clés de stockage `@scolaria:*` /
`@scolaria_*` (9 lignes : préférences, enfant actif, démo, langue, conversations de l'assistant, invitations vues : changer = préférences perdues sans
migration de clés) ; URL de redirection d'authentification `scolaria://` et `exp+scolaria://` (`config.toml`) ; `package.json` `name` ; `useSolariaFonts`
(faute historique) ; colonne SQL `children.scolaria_id` et fonction `generate_scolaria_id` ; clé d'export `scolaria_export`.

## 8. Ce qui reste en dur à corriger (liste priorisée, SANS CODE ICI)

| Priorité | Lot | Estimation | Remarque |
|---|---|---|---|
| 1 | **Sites visibles du NOM en dur** (§ 3) : `erreurs.ts` en `%{app}`, `ar.ts` (2 lignes), textes de permissions iOS (source partagée lue par `app.config.js`) | 0,5 j | indépendant du choix du nom ; inclure la correction du texte périmé des permissions |
| 2 | **Source partagée lue par `app.config.js`** (un petit module commun JS/JSON pour `NOM_APP`, `NOM_ASSISTANT` : `app.config.js` ne peut pas importer du TypeScript) | 0,5 j | supprime la valeur littérale de `name` et des permissions ; variante démo inchangée |
| 3 | **Assistant** : injecter `%{assistant}` dans `t()`, importer `NOM_ASSISTANT` dans les chaînes en dur, réécrire 81 valeurs i18n et ~55 chaînes d'écran, de service ou de serveur, serveur (`emergency.ts` : partager la constante avec Deno) ; test « aucun nom en dur » | 1,5 j | seulement si le NOM de l'assistant doit pouvoir changer ; sinon, garder la règle documentée « Aria est le nom, pas une variable » [À DÉCIDER] |
| 4 | **Test de garde « aucun nom en dur »** (échoue si `Scolaria` apparaît dans une chaîne visible hors liste d'exceptions techniques) | 0,5 j | empêche toute régression ; comparable à `test:nom-affiche-demo` mais statique |
| 5 | **Identifiants visibles « SCA- »** (§ 5) : préfixe constant partagé app, SQL, export ; migration SQL ou conservation du préfixe interne | 1 j + cycle Paris | décision produit : un identifiant d'enfant sans lien avec le nom ? |
| 6 | **Wordmark et assets** (§ 4) | selon le design | indépendant du code |
| 7 | **Identifiants techniques** (§ 7) | voir `renommage.md` | lot dédié, après le choix du nom |
