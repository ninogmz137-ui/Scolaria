/**
 * Préférences Aria (L10, décision D8 du 27 sept 2026) — enregistrées sur l'appareil, dans les mêmes
 * préférences que Famille & paramètres (@scolaria:prefs).
 *
 * - ariaActive : désactivée = AUCUN appel au modèle (appliqué dans ariaApi.sendToAria, pas seulement à l'écran).
 * - ariaInfoVue : l'écran d'information (ce qui part chez Anthropic, où, combien de temps) a été lu et
 *   accepté ; tant qu'il ne l'est pas, Aria ne s'ouvre pas.
 * Limite connue : réglage PAR APPAREIL (un même compte sur deux téléphones = deux réglages).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE = '@scolaria:prefs';

export interface PreferencesAria {
  ariaActive: boolean;
  ariaInfoVue: boolean;
}

const DEFAUT: PreferencesAria = { ariaActive: true, ariaInfoVue: false };

const abonnes = new Set<(p: PreferencesAria) => void>();

export async function lirePreferencesAria(): Promise<PreferencesAria> {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    const p = brut ? JSON.parse(brut) : {};
    return {
      ariaActive: typeof p.ariaActive === 'boolean' ? p.ariaActive : DEFAUT.ariaActive,
      ariaInfoVue: p.ariaInfoVue === true,
    };
  } catch {
    return DEFAUT;
  }
}

/** Aria peut-elle appeler le modèle ? (activée ET information lue). En cas de doute : non. */
export async function ariaAutorisee(): Promise<boolean> {
  const p = await lirePreferencesAria();
  return p.ariaActive && p.ariaInfoVue;
}

export async function enregistrerPreferencesAria(changement: Partial<PreferencesAria>): Promise<PreferencesAria> {
  let tout: Record<string, unknown> = {};
  try {
    const brut = await AsyncStorage.getItem(CLE);
    tout = brut ? JSON.parse(brut) : {};
  } catch {
    tout = {};
  }
  const suivant = { ...tout, ...changement };
  try {
    await AsyncStorage.setItem(CLE, JSON.stringify(suivant));
  } catch {
    // Stockage indisponible : le réglage vaut pour la session.
  }
  const p = await lirePreferencesAria();
  const effectif = { ...p, ...changement } as PreferencesAria;
  abonnes.forEach((f) => f(effectif));
  return effectif;
}

export function surChangementAria(f: (p: PreferencesAria) => void): () => void {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}
