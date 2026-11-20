/**
 * `npm run test:aria-requete` — requête reçue par l'Edge Function « aria » (module pur, sans réseau).
 * Le test de bout en bout (fonction servie en local, faux modèle) est `npm run test:limite-aria-local`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isValidMessages, urgenceDansMessages, MAX_MESSAGES, MAX_MESSAGE_CHARS, type ChatMessage } from './ariaRequete.ts';

let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${nom}${cond ? '' : ` → ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}

const u = (content: string): ChatMessage => ({ role: 'user', content });
const a = (content: string): ChatMessage => ({ role: 'assistant', content });

// ── Protocole d'urgence sur TOUS les messages user ──
verifier('U1 dernier message de détresse', urgenceDansMessages([u('Je pense au suicide')]) === 'suicide');
verifier('U2 (c) message de détresse ANCIEN dans l’historique, dernier message anodin',
  urgenceDansMessages([u('Elle se fait harceler au collège'), a('…'), u('Et pour les devoirs ?')]) === 'harcelement');
verifier('U3 plusieurs catégories : la plus récente', urgenceDansMessages([u('Il est maltraité'), a('…'), u('Je pense au suicide'), a('…'), u('merci')]) === 'suicide');
verifier('U4 un texte de détresse dans un message ASSISTANT ne déclenche pas (seuls les messages du parent comptent)',
  urgenceDansMessages([u('Bonjour'), a('Le harcèlement est un sujet important'), u('merci')]) === null);
verifier('U5 conversation ordinaire : rien', urgenceDansMessages([u('Comment réviser les tables ?'), a('…'), u('Et le violon ?')]) === null);

// ── Validation inchangée ──
verifier('V1 valide', isValidMessages([u('a'), a('b'), u('c')]));
verifier('V2 vide, non tableau, rôle inconnu, contenu vide : refusés',
  !isValidMessages([]) && !isValidMessages('x') && !isValidMessages([{ role: 'system', content: 'x' }]) && !isValidMessages([u('')]));
verifier('V3 premier et dernier message = user', !isValidMessages([a('x'), u('y')]) && !isValidMessages([u('x'), a('y')]));
verifier(`V4 ${MAX_MESSAGES} messages au plus`, MAX_MESSAGES === 40 && isValidMessages(Array.from({ length: 39 }, (_, i) => (i % 2 ? a('x') : u('x')))) && !isValidMessages(Array.from({ length: 41 }, (_, i) => (i % 2 ? a('x') : u('x')))));
verifier(`V5 ${MAX_MESSAGE_CHARS} caractères au plus`, MAX_MESSAGE_CHARS === 8000 && isValidMessages([u('x'.repeat(8000))]) && !isValidMessages([u('x'.repeat(8001))]));

// ── La fonction applique bien ces règles, dans le bon ordre ──
const source = readFileSync(join(import.meta.dirname, '..', 'aria', 'index.ts'), 'utf8');
const iUrgence = source.indexOf('urgenceDansMessages(messages)');
const iQuota = source.indexOf("admin.rpc('aria_reserver'");
const iModele = source.indexOf('client.messages.create(');
verifier('S1 urgence testée AVANT le décompte et AVANT l’appel au modèle', iUrgence > 0 && iUrgence < iQuota && iQuota < iModele, `${iUrgence} ${iQuota} ${iModele}`);
verifier('S2 la fonction ne teste plus le seul dernier message', !source.includes('lastUserMessage') && !/detectEmergency\(/.test(source));
const journalUrgence = source.split('\n').find((l) => l.includes('ALERTE protocole')) ?? '';
verifier('S3 journal de l’urgence : catégorie seule, aucun identifiant de compte', /\{ category: emergency \}/.test(journalUrgence) && !/user/.test(journalUrgence), journalUrgence.trim());
verifier('S4 quota côté serveur : réservé par la clé service avant le modèle, rendu en cas d’échec',
  /admin\.rpc\('aria_reserver', \{\s*p_user: userData\.user\.id/.test(source) && (source.match(/await rendreAppel\(\)/g) ?? []).length >= 3);

console.log(`\n${ok} réussis, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
