/**
 * Accueil de démo : UNE seule source de vérité (B3a-bis).
 *
 * « À faire », « Aujourd'hui » et la carte Aria ne contiennent AUCUNE donnée propre : ils sont
 * construits à partir des mêmes données que les autres écrans, pour l'enfant sélectionné :
 *  - Agenda (DemoContext.getAgenda, mêmes filtres par niveau que l'écran Agenda) ;
 *  - mots (DemoContext.getMots, comme la liste des mots) ;
 *  - Messages (messagerieStore.getConversations, comme l'onglet Messages).
 * Aria ne cite que ce qui existe dans ces données.
 */

import type { DemoAgendaEvent, DemoMot } from '../../contexts/DemoContext';
import type { Conversation } from '../messagerieData';
import type { Cycle } from '../../utils/niveau';

export type TodoKind = 'signer' | 'lire' | 'justifier';

/** Document à signer (démo) : ce que SignDoc affiche. */
export interface DemoDoc {
  title: string;
  date?: string;
  lieu?: string;
  montant?: string;
  deadline?: string;
  aria?: string;
}

export interface DemoTodo {
  kind: TodoKind;
  title: string;
  deadline: string;
  doc?: DemoDoc;
}

export interface DemoAujourdhui {
  id: string;
  kind: 'event' | 'message';
  title: string;
  meta: string;
  time: string;
}

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function isoJour(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** « 09:30 » → « 9h30 », « 14:00 » → « 14h ». */
function heure(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return `${Number(h)}h${m === '00' ? '' : m}`;
}

/** « 2026-10-01 » → « jeu. 1 oct. » */
function jourCourt(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number);
  const d = new Date(a, m - 1, j);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

/** Types d'événement de l'Agenda repris dans « Aujourd'hui » (ni cours, ni devoirs). */
const TYPES_AUJOURDHUI = new Set(['evenement', 'sortie', 'examen', 'reunion', 'activite']);

export interface AccueilDemo {
  todo: DemoTodo[];
  aujourdhui: DemoAujourdhui[];
  aria: string;
}

export function construireAccueilDemo(params: {
  prenom: string;
  cycle: Cycle | null | undefined;
  aujourdHui: Date;
  /** Événements de l'Agenda du jour (getAgenda(enfant, date du jour)). */
  evenementsDuJour: DemoAgendaEvent[];
  /** Événements de l'Agenda de demain (pour les devoirs cités par Aria). */
  evenementsDeDemain: DemoAgendaEvent[];
  mots: DemoMot[];
  conversations: Conversation[];
}): AccueilDemo {
  const { prenom, cycle, aujourdHui, evenementsDuJour, evenementsDeDemain, mots, conversations } = params;
  const jour = isoJour(aujourdHui);
  const premierDegre = cycle === 'maternelle' || cycle === 'primaire';

  // À faire : mots non signés de l'enfant (même source que la liste des mots).
  const todo: DemoTodo[] = mots
    .filter((m) => !m.isSigned)
    .map((m) => ({
      kind: 'signer' as const,
      title: m.title,
      deadline: m.deadline ? `Avant le ${jourCourt(m.deadline)}` : 'À signer',
      doc: { title: m.title, deadline: m.deadline ? jourCourt(m.deadline) : undefined },
    }));

  // Aujourd'hui : événements du jour de l'Agenda (hors cours et devoirs) + messages reçus aujourd'hui.
  const evenements: DemoAujourdhui[] = evenementsDuJour
    .filter((e) => TYPES_AUJOURDHUI.has(e.type))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((e) => ({
      id: e.id,
      kind: 'event' as const,
      title: e.type === 'examen' && premierDegre ? e.title.replace(/^Contrôle/, 'Évaluation') : e.title,
      meta: e.room || e.subject,
      time: heure(e.startTime),
    }));
  const messages: DemoAujourdhui[] = conversations
    .filter((c) => c.lastDate === jour && c.messages[c.messages.length - 1]?.sender === 'other')
    .map((c) => ({
      id: c.id,
      kind: 'message' as const,
      title: c.name,
      meta: c.lastMessage,
      time: heure(c.lastTime),
    }));
  const aujourdhui = [...evenements, ...messages];

  // Aria : ne cite que ce qui existe ci-dessus (ou dans l'Agenda de demain), sinon rien de précis.
  let aria = '';
  const premier = evenementsDuJour
    .filter((e) => TYPES_AUJOURDHUI.has(e.type))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  const devoirsDemain = evenementsDeDemain.filter((e) => e.type === 'devoir' && !e.is_completed);
  if (premier) {
    const titre = evenements.find((e) => e.id === premier.id)?.title ?? premier.title;
    aria = `Aujourd’hui pour ${prenom} : ${titre.toLowerCase()} à ${heure(premier.startTime)}.`;
    if (/prévoir/i.test(premier.description)) aria += ' Voulez-vous la liste des choses à prévoir ?';
  } else if (todo.length > 0) {
    aria = `Un mot est à signer pour ${prenom} : « ${todo[0].title} » (${todo[0].deadline.toLowerCase()}).`;
  } else if (devoirsDemain.length > 0) {
    const n = devoirsDemain.length;
    aria = `${prenom} a ${n} devoir${n > 1 ? 's' : ''} pour demain : ${devoirsDemain.map((d) => d.title.toLowerCase()).join(', ')}.`;
  }

  return { todo, aujourdhui, aria };
}
