/**
 * Nom de l'application — UNIQUE source des textes affichés (27 sept 2026).
 *
 * Le nom « Scolaria » n'est pas disponible (marque INPI en classe 41, logiciel scolaire homonyme, nom pris
 * sur l'App Store) : un nouveau nom sera choisi. Pour les TEXTES, le renommage se fait à UN seul endroit :
 * supabase/functions/_shared/marque.ts (partagé avec les emails des Edge Functions).
 * Ne touche PAS aux identifiants techniques (bundle id com.scolaria.app, schéma scolaria://, clés de
 * stockage @scolaria:…) : ils changent dans un lot dédié (voir tasks/renommage.md).
 */

export { NOM_APP } from '../../supabase/functions/_shared/marque';
