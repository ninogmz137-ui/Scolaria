/**
 * `npm run test:aria-echange` — le texte d'un message de détresse n'est gardé NULLE PART côté app
 * (messages persistés, historique envoyé au modèle, titre, aperçu), y compris au message suivant,
 * et un stockage existant est nettoyé une fois.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectEmergency } from '../../supabase/functions/_shared/emergency.ts';
import {
  CLE_NETTOYAGE_FAIT,
  MESSAGE_NON_CONSERVE,
  conclureEchange,
  nettoyerStockageAssistant,
  purgerHistorique,
  texteBulleParent,
  type MessageEcran,
  type MessageModele,
  type StockageCles,
} from './ariaEchange.ts';

let ok = 0;
let echecs = 0;
function verifier(nom: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${nom}${cond ? '' : ` → ${detail}`}`);
  if (cond) ok++;
  else echecs++;
}

const DETRESSE = 'Je pense au suicide depuis des semaines, je ne sais plus quoi faire';
const FIXE = 'MESSAGE FIXE avec les numéros';
const NORMAL = 'Comment aider mon enfant à apprendre sa poésie ?';
const base = { detecter: detectEmergency, maintenant: 1000, heure: '10:00' };
const contient = (v: unknown, texte: string) => JSON.stringify(v).includes(texte.slice(0, 25));

// ── (a) urgence au message N ──
{
  const avant: MessageEcran[] = [
    { id: 'u_1', text: NORMAL, sender: 'parent', timestamp: '09:00' },
    { id: 'a_2', text: 'Réponse 1', sender: 'aria', timestamp: '09:00' },
  ];
  const hist: MessageModele[] = [{ role: 'user', content: NORMAL }, { role: 'assistant', content: 'Réponse 1' }];
  const fin = conclureEchange({ ...base, messages: avant, history: hist, texte: DETRESSE, reponse: FIXE, urgence: 'suicide' });
  verifier('a1 urgence reconnue', fin.urgence === true);
  verifier('a2 le message fixe est affiché', fin.messages.at(-1)?.text === FIXE && fin.messages.at(-1)?.sender === 'aria');
  verifier('a3 bulle neutre à la place du texte saisi', fin.messages.at(-2)?.text === MESSAGE_NON_CONSERVE && fin.messages.at(-2)?.sender === 'parent');
  verifier('a4 messages à persister : texte absent', !contient(fin.messages, DETRESSE));
  verifier('a5 historique inchangé (ni le texte, ni le message fixe)', fin.history.length === 2 && !contient(fin.history, DETRESSE) && !contient(fin.history, FIXE));
  verifier('a6 aucun titre, aperçu neutre', fin.titre === null && fin.apercu === MESSAGE_NON_CONSERVE);

  // ── (b) message N+1 : ni l'historique envoyé, ni le stockage ne contiennent le texte ──
  const suite = conclureEchange({ ...base, maintenant: 2000, messages: fin.messages, history: fin.history, texte: 'Et pour les tables ?', reponse: 'Réponse 2', urgence: null });
  verifier('b1 historique du message N+1 sans le texte de détresse', !contient(suite.history, DETRESSE) && suite.history.length === 4);
  verifier('b2 messages persistés au message N+1 sans le texte', !contient(suite.messages, DETRESSE) && suite.messages.length === 6);
  verifier('b3 aperçu = réponse normale, pas de nouveau titre', suite.apercu === 'Réponse 2' && suite.titre === null);
}

// ── urgence au PREMIER message : pas de titre ; le titre vient du premier message normal ──
{
  const fin = conclureEchange({ ...base, messages: [], history: [], texte: DETRESSE, reponse: FIXE, urgence: 'suicide' });
  verifier('a7 premier message de détresse : titre null', fin.titre === null && fin.apercu === MESSAGE_NON_CONSERVE);
  const suite = conclureEchange({ ...base, maintenant: 2000, messages: fin.messages, history: fin.history, texte: NORMAL, reponse: 'Réponse', urgence: null });
  verifier('a8 le titre vient du premier message normal (40 caractères)', suite.titre === NORMAL.slice(0, 40));
  verifier('a9 historique = le seul échange normal', suite.history.length === 2 && suite.history[0].content === NORMAL);
}

// ── urgence NON signalée par l'appelant mais détectable : même protection (ceinture et bretelles) ──
{
  const fin = conclureEchange({ ...base, messages: [], history: [], texte: DETRESSE, reponse: 'x', urgence: null });
  verifier('a10 détection locale même si urgence = null', fin.urgence && !contient(fin, DETRESSE));
}

// ── urgence signalée par le SERVEUR (message ancien dans l'historique) : l'historique est purgé ──
{
  const hist: MessageModele[] = [
    { role: 'user', content: DETRESSE }, { role: 'assistant', content: 'vieille réponse' },
    { role: 'user', content: NORMAL }, { role: 'assistant', content: 'Réponse 1' },
  ];
  const avant: MessageEcran[] = [{ id: 'u_0', text: DETRESSE, sender: 'parent', timestamp: '08:00' }];
  const fin = conclureEchange({ ...base, messages: avant, history: hist, texte: 'Bonjour', reponse: FIXE, urgence: 'suicide' });
  verifier('a11 historique purgé du message ancien et de sa réponse', fin.history.length === 2 && !contient(fin.history, DETRESSE) && !contient(fin.history, 'vieille réponse'));
  verifier('a12 anciens messages affichés purgés aussi', !contient(fin.messages, DETRESSE));
}

// ── message d'erreur local : affiché, pas dans l'historique ; message normal : tout est gardé ──
{
  const err = conclureEchange({ ...base, messages: [], history: [], texte: NORMAL, reponse: 'Impossible de contacter', urgence: null, dansHistorique: false });
  verifier('n1 erreur locale : texte gardé à l’écran, historique vide', err.messages[0].text === NORMAL && err.history.length === 0);
  const fin = conclureEchange({ ...base, messages: [], history: [], texte: NORMAL, reponse: 'Réponse', urgence: null });
  verifier('n2 message normal : bulle, historique, titre, aperçu', fin.messages[0].text === NORMAL && fin.history.length === 2 && fin.titre === NORMAL.slice(0, 40) && fin.apercu === 'Réponse' && !fin.urgence);
  let h: MessageModele[] = [];
  for (let i = 0; i < 15; i++) h = conclureEchange({ ...base, messages: [], history: h, texte: `q${i}`, reponse: `r${i}`, urgence: null }).history;
  verifier('n3 historique plafonné à 20, commence par un message user', h.length === 20 && h[0].role === 'user' && h[0].content === 'q5');
  verifier('n4 bulle provisoire : neutre si détresse, texte sinon', texteBulleParent(DETRESSE, detectEmergency) === MESSAGE_NON_CONSERVE && texteBulleParent(NORMAL, detectEmergency) === NORMAL);
  verifier('n5 la bulle neutre ne déclenche pas elle-même', detectEmergency(MESSAGE_NON_CONSERVE) === null);
  verifier('n6 purgerHistorique sans détresse : inchangé', purgerHistorique([{ role: 'user', content: NORMAL }], detectEmergency).length === 1);
}

// ── (d) nettoyage d'un stockage existant ──
class FauxStockage implements StockageCles {
  donnees = new Map<string, string>();
  ecritures = 0;
  async getAllKeys() { return [...this.donnees.keys()]; }
  async getItem(cle: string) { return this.donnees.get(cle) ?? null; }
  async setItem(cle: string, valeur: string) { this.ecritures++; this.donnees.set(cle, valeur); }
}
{
  const s = new FauxStockage();
  const enfant = '11111111-1111-4111-8111-111111111111';
  s.donnees.set(`@scolaria_aria_conversations:${enfant}`, JSON.stringify([
    { id: 'c_1', title: DETRESSE.slice(0, 40), lastMessage: 'Ce que vous décrivez est important', updatedAt: '2026-10-01T10:00:00Z' },
    { id: 'c_2', title: NORMAL.slice(0, 40), lastMessage: 'Réponse', updatedAt: '2026-10-02T10:00:00Z' },
    { id: 'c_3', title: 'Conseils · 3 oct.', lastMessage: 'Elle se fait harceler à la récré', updatedAt: '2026-10-03T10:00:00Z' },
  ]));
  s.donnees.set(`@scolaria_aria_messages:${enfant}:c_1`, JSON.stringify([
    { id: 'u_1', text: DETRESSE, sender: 'parent', timestamp: '10:00' },
    { id: 'a_2', text: FIXE, sender: 'aria', timestamp: '10:00' },
    { id: 'u_3', text: NORMAL, sender: 'parent', timestamp: '10:01' },
  ]));
  s.donnees.set(`@scolaria_aria_history:${enfant}:c_1`, JSON.stringify([
    { role: 'user', content: DETRESSE }, { role: 'assistant', content: FIXE },
    { role: 'user', content: NORMAL }, { role: 'assistant', content: 'Réponse' },
  ]));
  const intactMessages = JSON.stringify([{ id: 'u_1', text: NORMAL, sender: 'parent', timestamp: '10:00' }]);
  s.donnees.set(`@scolaria_aria_messages:${enfant}:c_2`, intactMessages);
  s.donnees.set('@scolaria_aria_messages:demo-lea:c_9', 'pas du JSON');
  s.donnees.set('@scolaria:prefs', JSON.stringify({ note: DETRESSE }));

  const bilan = await nettoyerStockageAssistant(s, detectEmergency, () => 'Conseils · titre neutre');
  const tout = () => [...s.donnees.entries()].filter(([k]) => k.startsWith('@scolaria_aria_')).map(([, v]) => v).join('\n');
  verifier('d1 plus aucune trace du texte dans les clés de l’assistant', !tout().includes(DETRESSE.slice(0, 25)) && !tout().includes('harceler'), tout());
  verifier('d2 bilan : 1 clé de messages, 1 historique, 1 liste', bilan.messages === 1 && bilan.historiques === 1 && bilan.conversations === 1 && !bilan.dejaFait, JSON.stringify(bilan));
  const msgs = JSON.parse(s.donnees.get(`@scolaria_aria_messages:${enfant}:c_1`)!);
  verifier('d3 message remplacé par la bulle neutre, les autres gardés', msgs.length === 3 && msgs[0].text === MESSAGE_NON_CONSERVE && msgs[1].text === FIXE && msgs[2].text === NORMAL);
  const hist = JSON.parse(s.donnees.get(`@scolaria_aria_history:${enfant}:c_1`)!);
  verifier('d4 historique : le message et sa réponse retirés', hist.length === 2 && hist[0].content === NORMAL);
  const convs = JSON.parse(s.donnees.get(`@scolaria_aria_conversations:${enfant}`)!);
  verifier('d5 titre dérivé remplacé, aperçu dérivé remplacé, le reste intact',
    convs[0].title === 'Conseils · titre neutre' && convs[0].lastMessage === 'Ce que vous décrivez est important' &&
    convs[1].title === NORMAL.slice(0, 40) && convs[1].lastMessage === 'Réponse' &&
    convs[2].title === 'Conseils · 3 oct.' && convs[2].lastMessage === MESSAGE_NON_CONSERVE, JSON.stringify(convs));
  verifier('d6 conversation sans détresse et clés étrangères non touchées',
    s.donnees.get(`@scolaria_aria_messages:${enfant}:c_2`) === intactMessages && s.donnees.get('@scolaria:prefs')!.includes(DETRESSE) && s.donnees.get('@scolaria_aria_messages:demo-lea:c_9') === 'pas du JSON');
  verifier('d7 témoin posé', s.donnees.get(CLE_NETTOYAGE_FAIT) === '1');

  // Une seule fois, et idempotent même sans le témoin.
  const ecrituresAvant = s.ecritures;
  const bis = await nettoyerStockageAssistant(s, detectEmergency, () => 'x');
  verifier('d8 deuxième passage : rien (témoin)', bis.dejaFait && s.ecritures === ecrituresAvant);
  s.donnees.delete(CLE_NETTOYAGE_FAIT);
  const photo = tout();
  const ter = await nettoyerStockageAssistant(s, detectEmergency, () => 'x');
  verifier('d9 idempotent sans témoin : aucune clé de l’assistant réécrite', ter.messages + ter.historiques + ter.conversations === 0 && tout() === photo);
}

// ── Les écrans passent tous par ce module (aucune écriture directe du texte saisi) ──
{
  const racine = join(import.meta.dirname, '..');
  for (const f of ['screens/aria/AriaConversationScreen.tsx', 'screens/aria/AriaHomeScreen.tsx', 'screens/AriaScreen.tsx']) {
    const src = readFileSync(join(racine, f), 'utf8');
    verifier(`e1 ${f} : conclureEchange + bulle provisoire neutre`, src.includes('conclureEchange(') && src.includes('texteBulleParent(trimmed, detectEmergency)'));
    verifier(`e2 ${f} : le texte saisi n'est écrit ni en titre, ni en aperçu, ni en historique par l'écran`,
      !/title:\s*trimmed|lastMessage:\s*trimmed|content:\s*trimmed|persistConversationTitle\(trimmed|text:\s*trimmed,/.test(src));
  }
  const app = readFileSync(join(racine, '..', 'App.tsx'), 'utf8');
  verifier('e3 App.tsx lance le nettoyage au démarrage', app.includes('nettoyerStockageAssistant(AsyncStorage, detectEmergency'));
}

console.log(`\n${ok} réussis, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
