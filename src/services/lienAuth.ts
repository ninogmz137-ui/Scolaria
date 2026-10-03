/**
 * Liens d'authentification reçus par email (L3) — analyse PURE (aucune dépendance native : testée sous Node,
 * `npm run test:liens-auth`).
 *
 * Flux PKCE : Supabase renvoie vers l'app `<schéma>://auth/callback?code=…` (confirmation d'inscription,
 * changement d'email) ou `<schéma>://auth/recuperation?code=…` (réinitialisation du mot de passe → écran
 * « Nouveau mot de passe »). Deux CHEMINS distincts, sans paramètre : la liste des redirections autorisées
 * de Supabase compare l'URL exacte (un `?type=…` ajouté renvoyait vers le site_url, constaté en test).
 * Lien expiré ou déjà utilisé : Supabase renvoie `error`, `error_code`, `error_description` (requête ou fragment).
 */

export const CHEMIN_RETOUR_AUTH = 'auth/callback';
export const CHEMIN_RECUPERATION = 'auth/recuperation';

export type LienAuth =
  | { type: 'code'; code: string; recuperation: boolean }
  | { type: 'erreur'; expire: boolean; message: string };

function parametres(url: string): Map<string, string> {
  const res = new Map<string, string>();
  const [avantDiese, fragment = ''] = url.split('#');
  const requete = avantDiese.includes('?') ? avantDiese.slice(avantDiese.indexOf('?') + 1) : '';
  for (const partie of [requete, fragment]) {
    for (const couple of partie.split('&')) {
      if (!couple) continue;
      const i = couple.indexOf('=');
      const cle = decodeURIComponent((i < 0 ? couple : couple.slice(0, i)).replace(/\+/g, ' '));
      const val = i < 0 ? '' : decodeURIComponent(couple.slice(i + 1).replace(/\+/g, ' '));
      if (!res.has(cle)) res.set(cle, val);
    }
  }
  return res;
}

/** null si l'URL n'est pas un lien d'authentification de l'app. */
export function analyserLienAuth(url: string | null | undefined): LienAuth | null {
  if (!url) return null;
  const sansParam = url.split(/[?#]/)[0].replace(/\/$/, '');
  const recuperation = /:\/\/+auth\/recuperation$/i.test(sansParam);
  if (!recuperation && !/:\/\/+auth\/callback$/i.test(sansParam)) return null;
  const p = parametres(url);
  const erreur = p.get('error') || p.get('error_code');
  if (erreur) {
    const code = p.get('error_code') ?? '';
    const expire = /expired|otp_expired|invalid/i.test(`${code} ${p.get('error_description') ?? ''}`);
    return {
      type: 'erreur',
      expire,
      message: expire
        ? 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau depuis l’app.'
        : 'Ce lien ne peut pas être utilisé. Demandez-en un nouveau depuis l’app.',
    };
  }
  const code = p.get('code');
  if (!code) return null;
  return { type: 'code', code, recuperation: recuperation || p.get('type') === 'recovery' };
}
