// Test du classement des erreurs de chargement. npm run test:erreurs
import assert from 'node:assert/strict';
import { classerErreur, ErreurChargement, leverSiErreur } from './erreurs.ts';

const cas: [string, unknown, string][] = [
  ['réseau React Native', { message: 'TypeError: Network request failed' }, 'reseau'],
  ['réseau web', new TypeError('Failed to fetch'), 'reseau'],
  ['délai dépassé', { name: 'AbortError', message: 'Aborted' }, 'reseau'],
  ['session : JWT expiré', { message: 'JWT expired', code: 'PGRST301' }, 'session'],
  ['session : 401', { status: 401, message: 'x' }, 'session'],
  ['session : refresh token', { message: 'Invalid Refresh Token: Refresh Token Not Found' }, 'session'],
  ['serveur : 500', { status: 500, message: 'Internal' }, 'serveur'],
  ['serveur : message quelconque', { message: 'boom' }, 'serveur'],
  ['déjà classée', new ErreurChargement('reseau'), 'reseau'],
  ['null', null, 'serveur'],
];
for (const [nom, e, attendu] of cas) assert.equal(classerErreur(e), attendu, nom);

assert.doesNotThrow(() => leverSiErreur(null));
assert.throws(() => leverSiErreur({ message: 'Network request failed' }), (e: unknown) => e instanceof ErreurChargement && e.type === 'reseau');
console.log(`erreurs : ${cas.length + 2} contrôles OK`);
