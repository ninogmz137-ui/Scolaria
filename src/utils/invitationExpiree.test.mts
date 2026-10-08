// Test des textes d'invitation expirée. npm run test:invitation-expiree
import assert from 'node:assert/strict';
import { libelleInvitationInvitant, messageInvitationExpiree } from './invitationExpiree.ts';

assert.equal(messageInvitationExpiree('Claire'), 'Invitation expirée. Demandez à Claire de vous réinviter.');
assert.equal(messageInvitationExpiree('Un responsable'), 'Invitation expirée. Demandez à un responsable du carnet de vous réinviter.');
assert.equal(messageInvitationExpiree(''), 'Invitation expirée. Demandez à un responsable du carnet de vous réinviter.');

const maintenant = new Date('2026-10-12T10:00:00Z');
assert.deepEqual(libelleInvitationInvitant('2026-10-11T10:00:00Z', maintenant), { expiree: true, texte: 'Invitation expirée' });
assert.deepEqual(libelleInvitationInvitant('2026-10-12T10:00:00Z', maintenant), { expiree: true, texte: 'Invitation expirée' }); // pile à l'échéance : expirée (comme la base : expires_at <= now())
assert.deepEqual(libelleInvitationInvitant('2026-10-13T10:00:00Z', maintenant), { expiree: false, texte: 'Invitation en attente' });

console.log('invitation expirée : 6 contrôles OK');
