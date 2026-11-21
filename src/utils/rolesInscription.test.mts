// Test des rôles proposés à l'inscription. npm run test:roles-inscription
import assert from 'node:assert/strict';
import { roleEffectif, rolesProposes, roleEnseignantVisible } from './rolesInscription.ts';

const ids = (dev: boolean, demo: boolean) => rolesProposes(dev, demo).map((r) => r.id).join(',');

// Version réelle (ni développement, ni démo) : « Enseignant » ABSENT, jamais grisé.
assert.equal(ids(false, false), 'parent');
assert.equal(roleEnseignantVisible(false, false), false);
assert.equal(roleEffectif('enseignant', false, false), 'parent', 'rôle forcé à parent hors dev / démo');
assert.equal(rolesProposes(false, false).some((r) => /enseignant/i.test(r.label + r.desc)), false);

// Développement et démo : les deux rôles.
assert.equal(ids(true, false), 'parent,enseignant');
assert.equal(ids(false, true), 'parent,enseignant');
assert.equal(ids(true, true), 'parent,enseignant');
assert.equal(roleEffectif('enseignant', true, false), 'enseignant');
assert.equal(roleEffectif('enseignant', false, true), 'enseignant');
assert.equal(roleEffectif('parent', false, false), 'parent');

console.log('rôles à l’inscription : 11 contrôles OK');
