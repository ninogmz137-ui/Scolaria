# Renommage de l'application — inventaire (27 sept 2026)

> Le nom « Scolaria » n'est pas disponible (marque INPI « scolaria » en classe 41 active jusqu'en 2034 ; logiciel de
> gestion scolaire primaire homonyme ; nom déjà pris sur l'App Store). **Un nouveau nom sera choisi.**
> En attendant : aucun achat, compte ou configuration lié au nom ; bundle id et nom NON changés.

## Déjà fait (27 sept)
- **Textes affichés : une seule constante** `NOM_APP`, définie dans `supabase/functions/_shared/marque.ts`
  (source unique pour l'app ET les emails des Edge Functions) ; `src/constants/marque.ts` la ré-exporte. Tous les textes visibles
  l'utilisent : Accueil (« dans … »), Ajouter un enfant (« Identifiant … »), À propos (principe, ©), pied de
  Famille & paramètres, Messages (état vide), Autorisations, Recherche (placeholder), textes de partage du
  super-pouvoir, PDF (logo texte), prompts d'Aria (« l'assistante IA de … ») et intro démo.
- **Traductions** : le nom est `%{app}` dans les 10 langues ; `t()` l'injecte depuis `NOM_APP`.
- Règle : **le nouveau code n'écrit jamais le nom en dur** (utiliser `NOM_APP`).

- Depuis le 28 sept, le nouveau code (L3, L4, L7, L10) n'écrit pas le nom : liens `<schéma>://…` lus dans la config,
  emails et export par `NOM_APP`, archive nommée « carnet-<prénom>-<date>.zip ». Seuls les tests locaux citent le
  conteneur Docker `supabase_db_Scolaria` (nom dérivé de `project_id` dans `supabase/config.toml`, à renommer avec lui).

→ Renommer les TEXTES = changer `NOM_APP`. Le reste ci-dessous est un lot dédié, après le choix du nom.

## À changer dans le lot « renommage » (après choix du nom)

### 1. Identité de l'app (définitive sur les stores)
| Où | Valeur actuelle | Remarque |
|---|---|---|
| `app.config.js` `name` | `Scolaria` | nom sous l'icône |
| `app.config.js` `slug` | `Scolaria` | projet EAS (expo.dev) : changer = nouveau projet EAS ou renommage côté Expo |
| `app.config.js` `ios.bundleIdentifier` | `com.scolaria.app` | **à fixer AVANT le premier build iOS (définitif)** |
| `app.config.js` `android.package` | `com.scolaria.app` | changer = nouvelle app Android (réinstallation du build de dev) |
| `app.config.js` `scheme` | `scolaria` | liens `scolaria://` : emails (L3), liens de dev, notifications |
| `app.config.js` textes de permissions iOS | « Scolaria utilise la caméra… » | à réécrire de toute façon (L8, D4) avec `NOM_APP`… (valeur littérale : app.config ne lit pas src/) |
| `package.json` `name` | `scolaria` | sans effet visible |

### 2. Identifiants techniques dans le code (invisibles, mais à aligner)
| Élément | Occurrences | Remarque |
|---|---|---|
| Schéma `scolaria://` | `src/services/supabase.ts`, `src/contexts/AuthContext.tsx`, `src/components/NotificationsRouteur.tsx`, `scripts/test-bundle-prod.mjs` | suit `scheme` |
| Clés de stockage `@scolaria:*`, `@scolaria_*` | prefs, enfant actif, démo, langue, conversations Aria | changer = préférences perdues sur les appareils : prévoir une migration de clés ou garder les anciennes |
| Composants `ScolariaLogo`, `ScolariaSymbol` (64 usages), `ScolariaAppIcon` | noms de fichiers + imports | renommage mécanique |
| `useSolariaFonts` | hook (faute de frappe historique) | à profiter du lot |
| Emails de démo `demo@scolaria.fr`, `prof@scolaria.fr` | `AuthContext` | domaine qui ne nous appartient pas : passer au nouveau domaine |
| Identifiant enfant `scolaria_id` (« SCA-AAAA-FR-… ») | base (`children.scolaria_id`, `generate_scolaria_id`, `create_child(p_scolaria_id)`), services, écrans, export | migration SQL (renommer colonne + fonction + préfixe « SCA ») — ou garder le nom de colonne interne |
| Export JSON `scolaria_export` | `rgpdService`, écran Export | format de fichier |
| `scolaria-event` | une clé technique | |

### 3. Identité visuelle
- **Wordmark `ScolariaLogo`** : dessin propre au nom (« Scolar » + ı sans point + « a », étincelle posée à la place du
  point du i) → **à redessiner** pour le nouveau nom ; une constante ne suffit pas.
- Symbole (8 ellipses) : indépendant du nom, gardé sauf décision contraire.
- Fichiers d'assets nommés d'après le nom : `assets/icon-scolaria.svg`, `assets/logo-scolaria*.{png,svg}` (7),
  `assets/logos/scolaria-*.svg` (3) — le contenu des logos-textes est à refaire.

### 4. Documentation et références
- `CLAUDE.md` (20), `COMPONENTS.md` (8), `VISION.md` (28), `tasks/*` (62), `.planning/*`, `docs/archives/*`,
  `references/scolaria-*.jsx` (7 fichiers de référence), `scolaria_website.html` et maquettes HTML à la racine.
- Commentaires du code (dont l'Edge Function `aria`) : sans effet, à nettoyer au passage.

### 5. Hors dépôt (comptes existants)
- Projet Expo/EAS « Scolaria », dépôt GitHub `Scolaria`, projet Supabase (nom affiché seulement), dossier
  `ScolariaBackups`, nom du dossier de travail. Aucun n'est visible par les familles ; à renommer à ta convenance.

## Ordre conseillé du lot « renommage »
1. Choix du nom (INPI, stores, domaine) → 2. `NOM_APP` + app.config (name, textes permissions) → 3. bundle id /
package / scheme (avant tout build iOS) → 4. wordmark redessiné → 5. clés de stockage (avec reprise des anciennes)
→ 6. identifiants SQL (migration locale, validation) → 7. docs.
