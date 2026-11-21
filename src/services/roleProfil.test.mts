// Le rôle de l'interface vient de profiles.role, jamais des métadonnées modifiables. npm run test:role-profil
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { roleAffiche, roleValide } from './roleProfil.ts';

// 1. La fonction de choix.
assert.equal(roleAffiche('enseignant'), 'enseignant');
assert.equal(roleAffiche('eleve'), 'eleve');
assert.equal(roleAffiche('parent'), 'parent');
assert.equal(roleAffiche(null), 'parent', 'profil illisible (hors ligne) : parent');
assert.equal(roleAffiche(undefined), 'parent');
assert.equal(roleAffiche('admin'), 'parent', 'valeur inconnue : parent');
assert.equal(roleAffiche({ role: 'enseignant' }), 'parent');
assert.equal(roleValide('enseignant'), 'enseignant');
assert.equal(roleValide('ENSEIGNANT'), null);

// 2. Non-régression : AUCUN fichier de l'app ne déduit le rôle des métadonnées du compte (user_metadata.role / metaRole).
//    Seule exception : profilService (décider de créer un profil « parent » pour un compte sans profil ; le serveur impose
//    de toute façon « parent » à la création, M9 / M30).
const interdits: string[] = [];
const marche = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) marche(p);
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\./.test(f)) {
      const s = readFileSync(p, 'utf8');
      if (/user_metadata\??\.role|metaRole/.test(s) && !p.endsWith('profilService.ts')) interdits.push(p);
    }
  }
};
marche('src');
assert.deepEqual(interdits, [], `rôle lu dans les métadonnées : ${interdits.join(', ')}`);
// 3. Et aucun fichier ne lit une table « users » (inexistante : c'est profiles).
const users: string[] = [];
const marche2 = (d: string) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) marche2(p);
    else if (/\.(ts|tsx)$/.test(f) && /\.from\('users'\)/.test(readFileSync(p, 'utf8'))) users.push(p);
  }
};
marche2('src');
assert.deepEqual(users, [], `table users appelée : ${users.join(', ')}`);

console.log('rôle du profil : 12 contrôles OK');
