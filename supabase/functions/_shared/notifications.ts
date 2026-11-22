/**
 * Textes et forme des notifications (lot 7a) — module pur, SANS import, partagé par l'Edge Function
 * « envoyer-notifications » et testé par node (`npm run test:notifications`).
 *
 * Règles (plan validé le 22 nov. 2026, CLAUDE.md § Notifications) :
 * - le prénom de l'enfant en tête : « Laia · Nouveau mot de Mme Martin » ;
 * - écran verrouillé : JAMAIS le texte d'un message, un motif d'absence, un justificatif — seulement l'enfant, le type et
 *   l'expéditeur. Ce module ne REÇOIT d'ailleurs aucun contenu : ses entrées sont le prénom, le type, l'expéditeur et des
 *   identifiants (la file M47 n'a pas de colonne de contenu) ;
 * - plusieurs éléments en attente (silence de la nuit, envois rapprochés) : UNE notification par enfant, regroupée ;
 * - résumé de 18 h : une notification par enfant qui a quelque chose ; rien si tout est à jour.
 * Toute évolution d'un texte passe par le test qui les fige (règle R4).
 */

export type TypeNotification = 'mot' | 'message' | 'absence_a_justifier' | 'relance';

export interface ElementFile {
  type: TypeNotification;
  /** Nom lisible de l'expéditeur (« Claire Martin ») ; jamais de contenu. */
  expediteur: string | null;
  /** Mot (mot, relance), fil (message), absence (absence_a_justifier). */
  ref_id: string | null;
}

/** Où l'appui sur la notification mène, dans le carnet de CET enfant (NotificationsRouteur). */
export interface DonneesNotification {
  cible: 'mot' | 'fil' | 'agenda' | 'accueil';
  childId: string;
  motId?: string;
  conversationId?: string;
}

export interface Notification {
  corps: string;
  donnees: DonneesNotification;
}

/** Message envoyé à Expo : seulement ces champs (le test le vérifie). */
export interface MessageExpo {
  to: string;
  body: string;
  data: DonneesNotification;
  sound: 'default';
  priority: 'high';
  channelId: 'essentielles';
}

const CONTROLES = /[\u0000-\u001f\u007f]/g;

function propre(texte: string | null | undefined, max: number): string {
  const t = (texte ?? '').replace(CONTROLES, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Prénom affiché : le premier mot du prénom, 30 caractères au plus ; « Votre enfant » s'il manque. */
export function prenomNotification(prenom: string | null | undefined): string {
  return propre((prenom ?? '').split(' ')[0], 30) || 'Votre enfant';
}

/** Expéditeur affiché : 40 caractères au plus ; « l’enseignant » s'il manque. */
export function expediteurNotification(expediteur: string | null | undefined): string {
  return propre(expediteur, 40) || 'l’enseignant';
}

/** Texte d'un élément seul (après le prénom). */
export function texteElement(e: ElementFile): string {
  const qui = expediteurNotification(e.expediteur);
  switch (e.type) {
    case 'mot':
      return `Nouveau mot de ${qui}`;
    case 'message':
      return `Message de ${qui}`;
    case 'absence_a_justifier':
      return 'Absence à justifier';
    case 'relance':
      return `Rappel : mot de ${qui}`;
  }
}

const NOMS: Record<TypeNotification, [string, string]> = {
  mot: ['mot', 'mots'],
  message: ['message', 'messages'],
  absence_a_justifier: ['absence à justifier', 'absences à justifier'],
  relance: ['rappel', 'rappels'],
};

/** Une notification pour un enfant : un élément → son texte ; plusieurs → « 3 nouveautés : 2 mots, 1 message ». */
export function composerNotification(prenom: string | null | undefined, childId: string, elements: ElementFile[]): Notification {
  const p = prenomNotification(prenom);
  if (elements.length === 1) {
    const e = elements[0];
    const donnees: DonneesNotification =
      e.type === 'mot' || e.type === 'relance'
        ? { cible: 'mot', childId, ...(e.ref_id ? { motId: e.ref_id } : {}) }
        : e.type === 'message'
          ? { cible: 'fil', childId, ...(e.ref_id ? { conversationId: e.ref_id } : {}) }
          : { cible: 'agenda', childId };
    return { corps: `${p} · ${texteElement(e)}`, donnees };
  }
  const ordre: TypeNotification[] = ['mot', 'relance', 'message', 'absence_a_justifier'];
  const parties = ordre
    .map((t) => [t, elements.filter((e) => e.type === t).length] as const)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n} ${NOMS[t][n > 1 ? 1 : 0]}`);
  return { corps: `${p} · ${elements.length} nouveautés : ${parties.join(', ')}`, donnees: { cible: 'accueil', childId } };
}

/** Résumé de 18 h pour un enfant ; null si tout est à jour (rien n'est envoyé). */
export function composerResume(
  prenom: string | null | undefined,
  childId: string,
  c: { mots: number; absences: number; devoirs: number },
): Notification | null {
  const parties = [
    c.mots > 0 ? `${c.mots} mot${c.mots > 1 ? 's' : ''} à traiter` : null,
    c.absences > 0 ? `${c.absences} absence${c.absences > 1 ? 's' : ''} à justifier` : null,
    c.devoirs > 0 ? `${c.devoirs} devoir${c.devoirs > 1 ? 's' : ''} pour demain` : null,
  ].filter((x): x is string => !!x);
  if (parties.length === 0) return null;
  return { corps: `${prenomNotification(prenom)} · ${parties.join(' · ')}`, donnees: { cible: 'accueil', childId } };
}

/** Message Expo d'une notification, pour un téléphone. Aucun titre : le système affiche le nom de l'application. */
export function versExpo(jeton: string, n: Notification): MessageExpo {
  return { to: jeton, body: n.corps, data: n.donnees, sound: 'default', priority: 'high', channelId: 'essentielles' };
}

/** Heure de Paris (0 à 23) d'un instant : le résumé ne part qu'à 18 h, en hiver comme en été. */
export function heureDeParis(instant: Date): number {
  const h = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(instant);
  return Number(h.replace(/\D/g, ''));
}
