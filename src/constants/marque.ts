/**
 * Nom de l'application — UNIQUE source des textes affichés (27 sept 2026).
 *
 * Le nom « Scolaria » n'est pas disponible (marque INPI en classe 41, logiciel scolaire homonyme, nom pris
 * sur l'App Store) : un nouveau nom sera choisi. Pour les TEXTES, le renommage se fait à UN seul endroit :
 * supabase/functions/_shared/marque.ts (partagé avec les emails des Edge Functions).
 * Ne touche PAS aux identifiants techniques (bundle id com.scolaria.app, schéma scolaria://, clés de
 * stockage @scolaria:…) : ils changent dans un lot dédié (voir tasks/renommage.md).
 *
 * VARIANTE DÉMO (APK de démonstration, APP_VARIANT=demo) : le nom AFFICHÉ par l'application devient le libellé de la variante
 * (APP_LIBELLE_DEMO de eas.json, recopié dans `extra.APP_LIBELLE` par app.config.js ; « Carnet Démo »). Les Edge Functions et les
 * e-mails gardent le nom du fichier partagé : cette valeur ne vaut que dans l'application. Sans variante : strictement inchangé.
 */

import { NOM_APP as NOM_APP_BASE } from '../../supabase/functions/_shared/marque';
import { estVarianteDemo } from '../utils/varianteDemo';

declare const require: ((id: string) => any) | undefined;

function libelleVariante(): string | undefined {
  try {
    // `require` n'existe pas dans les tests Node (modules ES) : le nom de base s'applique. Dans l'application (Metro), la valeur
    // vient de la configuration embarquée (extra), jamais d'une variable d'environnement.
    if (typeof require !== 'function') return undefined;
    const extra = require('expo-constants')?.default?.expoConfig?.extra;
    return estVarianteDemo(extra) ? String(extra.APP_LIBELLE || 'Carnet Démo') : undefined;
  } catch {
    return undefined;
  }
}

export const NOM_APP: string = libelleVariante() ?? NOM_APP_BASE;
