# Où le nom du produit est affiché — inventaire du 4 oct 2026 (« Scolaria » / « Theka »)

> Le nom « Scolaria » n'est pas disponible ; le nom définitif n'est pas arrêté. **« Theka » : 0 occurrence** dans le code de l'application, de la configuration et des Edge Functions au 4 oct (recherche insensible à la casse).
> Inventaire = chaînes **visibles par une personne** (texte, logo, libellé d'accessibilité, titre de fenêtre, notification, e-mail). Les **identifiants de code** (`com.scolaria.app`, `scolaria://`, clés `@scolaria:…`, `scolaria_id`, fonctions `ScolariaLogo` / `ScolariaSymbol`, `SCA-2026-…`) ne sont PAS des textes affichés et ne sont pas touchés.

## 1. Source unique du nom affiché
| Où | Rôle |
|---|---|
| `supabase/functions/_shared/marque.ts` → `NOM_APP = 'Scolaria'` | nom des **e-mails** (Edge Functions) et de l'application ; **non modifié** |
| `src/constants/marque.ts` → `NOM_APP` | nom de l'application. **Variante démo : valeur propre** (`extra.APP_LIBELLE` = `APP_LIBELLE_DEMO` de `eas.json`, « Carnet Démo ») ; sans variante : la valeur du fichier partagé, inchangée |

## 2. Chaînes affichées par `NOM_APP` (suivent donc la variante)
| Fichier | Texte affiché (forme) |
|---|---|
| `AccueilScreen.tsx:282` | « dans {NOM_APP} » (compte réel sans enfant) |
| `AProposScreen.tsx:115, :139` | « …si l'école n'utilise pas {NOM_APP}. » ; « © 2026 {NOM_APP} » |
| `FamilleParametresScreen.tsx:350` | pied de page « {NOM_APP} · Le carnet de scolarité numérique · Version … » |
| `AjouterEnfantScreen.tsx:246, :496` | « Identifiant {NOM_APP} » ; « L'identifiant {NOM_APP} est unique… » |
| `MessagerieScreen.tsx:320` | texte d'état vide des Messages |
| `QuickSearchScreen.tsx:70` | placeholder « Rechercher dans {NOM_APP}… » |
| `PermissionsScreen.tsx:142, :202, :263` | invitation d'un responsable (e-mail non envoyé, compte {NOM_APP}) |
| `ProfilEnfantScreen.tsx:442`, `SuperPowerBadge.tsx:104` | texte de partage du « super-pouvoir » |
| `exportCarnet.ts`, `pdfExport.ts` | notice et PDF d'export |
| `i18n` (`scolariaId` : « Identifiant %{app} », dix langues) | via le paramètre `app` de `t()` |
| `ariaApi.ts:56, :85, :190` | consigne envoyée à Aria et message de démo (jamais en variante démo : aucun appel réel) |

## 3. Chaînes qui ne passaient PAS par `NOM_APP` (traitées pour la variante démo)
| Où | Avant | Variante démo |
|---|---|---|
| `LoginScreen.tsx` (écran d'ouverture) : logo-mot SVG « Scolaria✦ » (`ScolariaLogo`) | nom en lettres de marque | **`LogoMarque`** : le symbole (couronne) reste, le mot devient **« Carnet Démo »** |
| `AProposScreen.tsx` : même logo-mot | idem | idem (`LogoMarque`) |
| `ScolariaAppIcon.tsx` : `accessibilityLabel="Scolaria"` (À propos) | « Scolaria » | `NOM_APP` (« Carnet Démo ») ; sans variante : « Scolaria », identique |
| `services/erreurs.ts` : « Impossible de joindre Scolaria. … » (réseau) | texte figé | **remplacé à l'affichage** par `NOM_APP` dans `EtatErreur.tsx` (sans variante : identique) |
| `AuthContext.tsx` : e-mail du compte de démonstration `demo@scolaria.fr` (Mon profil) | adresse au nom du produit | `demo@exemple.invalid` en variante démo seulement |
| `app.config.js` : `name` (libellé de l'icône, titre de la page web) | « Scolaria » | `APP_LIBELLE_DEMO` = « Carnet Démo » |
| `app.config.js` : textes iOS `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` | « Scolaria utilise… » | « {libellé} utilise… » (variante démo) |

## 4. Reste, non traité (hors variante démo ou hors application)
- **Arabe** : `ar.ts` `scolariaId: 'معرّف سكولاريا'` (« Scolaria » en lettres arabes, figé, ne passe pas par `%{app}`) : visible seulement si la langue du téléphone est l'arabe. À corriger au renommage (traduction à faire valider).
- **Contact** : aucune adresse `@scolaria.fr` visible dans l'application hors le compte de démonstration ci-dessus (l'adresse de contact de À propos n'est plus affichée).
- **E-mails d'invitation** (Edge Function `invitation-responsable`) : nom du fichier partagé ; non touchés (consigne). Brevo non configuré : aucun e-mail n'est envoyé aujourd'hui.
- **Notifications** : aucun titre de notification ne contient le nom (prénom de l'enfant seulement).
- **Identifiants visibles de l'enfant** : `SCA-2026-FR-0487xx` (abréviation, données de démonstration du profil) : à revoir au renommage.
- **Système Android** : le nom de paquet `com.scolaria.app.demo` apparaît dans « Infos sur l'appli » du téléphone (identifiant, pas un texte de l'application).
- **Documents** : CLAUDE.md, VISION.md, brouillons D5 (variables `{NOM_APP}`), `README` : hors application.

## 5. Preuve (variante démo)
`npm run test:nom-affiche-demo` (serveur web local lancé avec `APP_VARIANT=demo`) : parcours Ouverture, Accueil (haut et bas), Suivi, Agenda, Messages, Famille & paramètres, À propos ; à chaque écran, TOUTES les chaînes affichées (texte, libellés d'accessibilité, titre, champs, texte des logos SVG) sont contrôlées : **aucun « Scolaria » ni « Theka »**. Contre-épreuve : contre un serveur SANS variante, le test détecte le nom (« Scolarıa✦ » dans le logo de l'ouverture). Captures : `C:\Users\admin\ScolariaBackups\captures-demo-web-2026-10-04\` (hors dépôt).
