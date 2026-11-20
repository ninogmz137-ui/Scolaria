/**
 * Ouverture de la feuille « Ajouter au carnet » depuis un écran (ex. Messages › « Ajouter un mot reçu
 * ailleurs », catégorie Mot pré-remplie). La feuille appartient à TabNavigator, qui s'abonne ici.
 */

import type { CategorieCarnet } from './carnetService';

export type OngletAjout = 'Accueil' | 'Notes' | 'MessagerieTab';
export type DemandeAjout = { onglet: OngletAjout; categorie?: CategorieCarnet };

let ecouteur: ((d: DemandeAjout) => void) | null = null;

export function surDemandeAjout(f: (d: DemandeAjout) => void): () => void {
  ecouteur = f;
  return () => {
    if (ecouteur === f) ecouteur = null;
  };
}

export function demanderAjoutCarnet(d: DemandeAjout): void {
  ecouteur?.(d);
}
