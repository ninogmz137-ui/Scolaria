/**
 * `npm run test:aria-prompt` — consignes du modèle construites par le serveur (module pur, sans réseau).
 * Le test de bout en bout (RLS réelle, faux modèle) est `npm run test:aria-prompt-local`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_TOKENS, REGLE_VOUVOIEMENT, construirePromptSysteme, contexteEnfant, dateDuJourParis, lireChildId } from './ariaPrompt.ts';
import { NOM_APP, ASSISTANT } from './marque.ts';

let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${nom}${cond ? '' : ` → ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}

const MIDI = new Date('2026-11-11T11:00:00Z');

// ── Contexte : prénom + niveau, rien d'autre ──
const ligne = { first_name: '  Lucas Émile ', classe: 'CM2 — École Voltaire', last_name: 'Moreau', school: 'École Voltaire', scolaria_id: 'SCA-2026-FR-0001', id: 'abc' };
const ctx = contexteEnfant(ligne);
verifier('C1 premier prénom seulement, niveau normalisé', ctx?.prenom === 'Lucas' && ctx?.niveau === 'CM2', JSON.stringify(ctx));
verifier('C2 le contexte n’a que deux champs', !!ctx && Object.keys(ctx).sort().join() === 'niveau,prenom');
verifier('C3 classe en texte libre non reconnue → niveau null (rien du texte ne part)', contexteEnfant({ first_name: 'Léa', classe: 'Classe de Mme Durand, école Jules Ferry' })?.niveau === null);
verifier('C4 alias de niveau', contexteEnfant({ first_name: 'Léa', classe: 'Grande section' })?.niveau === 'GS' && contexteEnfant({ first_name: 'Emma', classe: '3e' })?.niveau === '3ème');
verifier('C5 ligne absente (enfant illisible sous RLS), prénom vide ou non texte → null', contexteEnfant(null) === null && contexteEnfant(undefined) === null && contexteEnfant({ first_name: '   ' }) === null && contexteEnfant({ first_name: 42 }) === null);
verifier('C6 prénom plafonné à 40 caractères', contexteEnfant({ first_name: 'x'.repeat(200) })?.prenom.length === 40);

// ── Prompt « enfant » ──
const p = construirePromptSysteme(ctx, MIDI);
verifier('P1 prénom et niveau présents', p.includes('le suivi scolaire de Lucas (CM2), et de cet enfant seulement.') && p.includes('du carnet de Lucas (notes'));
verifier('P2 ni nom, ni école, ni identifiant', !/Moreau|Voltaire|SCA-|Émile|abc/.test(p));
verifier('P3 action d’absence conservée', p.includes('[ACTION:ABSENCE|date=YYYY-MM-DD|motif=MOTIF|demi_journee=PERIODE]') && p.includes('motif : maladie | maladie_avec_certificat | raison_familiale | autre') && p.includes('demi_journee : journee | matin | apres_midi'));
verifier('P4 identité et nom de l’application depuis marque.json', p.startsWith(`Tu es ${ASSISTANT.generique ? 'l’assistant IA' : `${ASSISTANT.nomPropre}, l’assistante IA`} de ${NOM_APP}, le carnet de scolarité numérique.`));
verifier('P5 règles : pas de diagnostic, aucune donnée inventée, un seul enfant', p.includes('Ne donne JAMAIS de diagnostic médical ou psychologique') && p.includes("n'en invente jamais") && p.includes("Ne parle jamais d'un autre enfant."));
verifier('P6 règle de vouvoiement ajoutée en fin', p.endsWith(`\n\n${REGLE_VOUVOIEMENT}`));
verifier('P7 sans niveau : prénom seul, pas de parenthèses vides', construirePromptSysteme({ prenom: 'Léa', niveau: null }, MIDI).includes('le suivi scolaire de Léa, et de cet enfant seulement.'));

// ── Prompt « aucun enfant » ──
const s = construirePromptSysteme(null, MIDI);
verifier('S1 prompt « aucun enfant »', s.includes("Aucun enfant n'est encore ajouté au carnet de ce parent.") && s.includes("propose d'ajouter un enfant au carnet") && !s.includes('ACTION:ABSENCE'));
verifier('S2 aucun prénom', !/Lucas|Léa/.test(s) && s.endsWith(`\n\n${REGLE_VOUVOIEMENT}`));

// ── Date à l'heure de Paris ──
verifier('D1 date en toutes lettres', dateDuJourParis(MIDI) === 'mercredi 11 novembre 2026', dateDuJourParis(MIDI));
verifier('D2 23 h 30 UTC = déjà le lendemain à Paris', dateDuJourParis(new Date('2026-11-11T23:30:00Z')) === 'jeudi 12 novembre 2026', dateDuJourParis(new Date('2026-11-11T23:30:00Z')));
verifier('D3 heure d’été : 22 h 30 UTC le 30 juin = 1er juillet à Paris', dateDuJourParis(new Date('2026-06-30T22:30:00Z')) === 'mercredi 1 juillet 2026', dateDuJourParis(new Date('2026-06-30T22:30:00Z')));
verifier('D4 la date est dans les deux prompts', p.includes('═══ DATE DU JOUR ═══\nmercredi 11 novembre 2026\n') && s.includes('═══ DATE DU JOUR ═══\nmercredi 11 novembre 2026\n'));

// ── child_id ──
verifier('I1 uuid accepté', lireChildId('11111111-1111-4111-8111-111111111111') === '11111111-1111-4111-8111-111111111111');
verifier('I2 tout le reste → null, sans erreur', [null, undefined, '', 'demo-lea', 'sans-enfant', 42, {}, ['x'], "1' or '1'='1"].every((v) => lireChildId(v) === null));

// ── La fonction : plus de `system` du client, 2 000 jetons, lecture sous RLS ──
const source = readFileSync(join(import.meta.dirname, '..', 'aria', 'index.ts'), 'utf8');
const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
verifier('F1 MAX_TOKENS = 2000', MAX_TOKENS === 2000 && code.includes('max_tokens: MAX_TOKENS'));
verifier('F2 la fonction ne lit plus `system` dans la requête', !/\bsystem\s*[,}]|body\.system|MAX_SYSTEM_CHARS/.test(code) && code.includes('system: construirePromptSysteme(enfant, new Date())'));
verifier('F3 l’enfant est lu par le client de l’appelant (RLS), jamais par la clé service',
  /await supabase\.from\('children'\)\.select\('first_name, classe'\)\.eq\('id', childId\)\.maybeSingle\(\)/.test(code) && !/admin\.from\(/.test(code));
verifier('F4 modèle : secret ARIA_MODEL, un seul appel au modèle (aucun repli)', code.includes("Deno.env.get('ARIA_MODEL')") && (code.match(/messages\.create\(/g) ?? []).length === 1);

// ── L'app n'envoie plus que child_id et messages ──
const app = readFileSync(join(import.meta.dirname, '..', '..', '..', 'src', 'services', 'ariaApi.ts'), 'utf8');
verifier('A1 corps de la requête = { child_id, messages }', app.includes('body: { child_id, messages },') && !/system:/.test(app));
verifier('A2 plus de constructeur de prompt côté app', !/SystemPrompt|TON RÔLE|ACTION:ABSENCE/.test(app));

console.log(`\n${ok} réussis, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
