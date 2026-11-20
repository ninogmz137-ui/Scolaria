/**
 * sessionExpiree — distingue une déconnexion VOLONTAIRE (bouton « Se déconnecter ») d'une session
 * qui s'est terminée sans que la personne l'ait demandé (jeton de rafraîchissement refusé, compte
 * révoqué…). Dans le second cas, l'écran de connexion affiche « Votre session a expiré ».
 * Alimenté par les événements d'authentification Supabase (AuthContext) ; aucune donnée personnelle.
 */

import { useSyncExternalStore } from 'react';

let compteActif = false;
let volontaire = false;
let expiree = false;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

/** À appeler juste avant supabase.auth.signOut déclenché par la personne. */
export function deconnexionVolontaire() {
  volontaire = true;
}

/** Reçoit chaque événement d'authentification (event Supabase, session présente ou non). */
export function marquerEvenementAuth(event: string, avecSession: boolean) {
  if (avecSession) {
    compteActif = true;
    if (expiree) {
      expiree = false;
      prevenir();
    }
    return;
  }
  if (event === 'SIGNED_OUT') {
    if (compteActif && !volontaire) {
      expiree = true;
      prevenir();
    }
    compteActif = false;
    volontaire = false;
  }
}

export function effacerSessionExpiree() {
  if (!expiree) return;
  expiree = false;
  prevenir();
}

/** Pour les tests. */
export function _etat() {
  return { compteActif, volontaire, expiree };
}

export function useSessionExpiree(): boolean {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => expiree,
    () => false,
  );
}
