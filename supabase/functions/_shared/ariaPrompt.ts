/**
 * Consignes (prompt système) de l'assistant — construites par le SERVEUR, jamais par le client (audit du 11 nov. 2026, I1).
 *
 * Minimisation (CLAUDE.md) : le modèle reçoit le PRÉNOM et le NIVEAU de l'enfant, rien d'autre (jamais le nom,
 * l'école, l'identifiant). L'Edge Function lit la ligne de l'enfant SOUS RLS avec le jeton de l'appelant ; un enfant
 * illisible (autre foyer, effacement en cours, identifiant inconnu) est traité comme « aucun enfant ».
 *
 * Module sans réseau ni Deno : testé avec node (`npm run test:aria-prompt`).
 */
import { NOM_APP, ASSISTANT } from './marque.ts';
import { normaliserNiveau } from './niveaux.ts';

/** Règle de ton imposée par le serveur (fait foi) : l'assistant vouvoie toujours le parent. */
export const REGLE_VOUVOIEMENT =
  "Règle absolue : tu vouvoies TOUJOURS le parent (vous, votre, vos), jamais de tutoiement.";

/** Jetons de sortie au plus par réponse (2 à 4 paragraphes demandés par les consignes). */
export const MAX_TOKENS = 2000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRENOM_MAX = 40;

/** `child_id` de la requête : un uuid, sinon null (aucune erreur : « aucun enfant »). */
export function lireChildId(valeur: unknown): string | null {
  return typeof valeur === 'string' && UUID_RE.test(valeur) ? valeur.toLowerCase() : null;
}

export interface ContexteEnfant {
  prenom: string;
  /** Niveau de la liste fermée (« CM2 », « 3ème »…), ou null. */
  niveau: string | null;
}

/**
 * Ce qui part au modèle à partir de la ligne `children` lue sous RLS : le premier prénom (un seul mot, 40 caractères
 * au plus) et le niveau normalisé. Tout le reste de la ligne est ignoré. Ligne absente ou sans prénom → null.
 */
export function contexteEnfant(ligne: { first_name?: unknown; classe?: unknown } | null | undefined): ContexteEnfant | null {
  if (!ligne || typeof ligne.first_name !== 'string') return null;
  const prenom = (ligne.first_name.trim().split(/\s+/)[0] ?? '').slice(0, PRENOM_MAX);
  if (!prenom) return null;
  return { prenom, niveau: normaliserNiveau(typeof ligne.classe === 'string' ? ligne.classe : null) };
}

/** Date du jour en toutes lettres, à l'heure de Paris (le serveur tourne en UTC). */
export function dateDuJourParis(maintenant: Date): string {
  return maintenant.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Paris',
  });
}

/**
 * Présentation de l'assistant dans les consignes : « Aria, l'assistante IA » avec le nom propre, « l'assistant IA »
 * en mode générique. Mêmes formes que l'affichage (marque.json) : aucun nom écrit en dur.
 */
const IDENTITE_MODELE = ASSISTANT.generique ? 'l’assistant IA' : `${ASSISTANT.nomPropre}, l’assistante IA`;

/** Enfant lisible par l'appelant : prénom + niveau. Aucune donnée du carnet n'existe encore côté modèle. */
function promptEnfant({ prenom, niveau }: ContexteEnfant, date: string): string {
  const niveauStr = niveau ? ` (${niveau})` : '';
  return `Tu es ${IDENTITE_MODELE} de ${NOM_APP}, le carnet de scolarité numérique.

═══ TON RÔLE ═══
- Tu accompagnes un parent dans le suivi scolaire de ${prenom}${niveauStr}, et de cet enfant seulement.
- Tu es bienveillant${ASSISTANT.e}, encourageant${ASSISTANT.e} et constructif${ASSISTANT.generique ? '' : 've'}, jamais alarmiste.
- Tu parles en français, de manière claire et chaleureuse, et tu VOUVOIES toujours le parent.

═══ TES RÈGLES ═══
- Ne donne JAMAIS de diagnostic médical ou psychologique ; oriente vers un professionnel si besoin.
- Tu n'as encore AUCUNE donnée du carnet de ${prenom} (notes, compétences, événements, messages) :
  n'en invente jamais. Réponds de façon générale et adaptée au niveau, et propose de consulter le carnet.
- Ne parle jamais d'un autre enfant.
- Sois concise : 2 à 4 paragraphes maximum sauf si on te demande plus de détail.

═══ ACTION DISPONIBLE ═══
Si le parent demande de signaler une absence et que tu as toutes les informations, termine ta réponse
par ce tag, seul, sur une nouvelle ligne :
[ACTION:ABSENCE|date=YYYY-MM-DD|motif=MOTIF|demi_journee=PERIODE]
  - motif : maladie | maladie_avec_certificat | raison_familiale | autre
  - demi_journee : journee | matin | apres_midi
Si une information manque, pose d'abord la question. Pas de tag si l'intention n'est pas claire.

═══ DATE DU JOUR ═══
${date}
`;
}

/** Aucun enfant (compte sans enfant, ou enfant illisible par l'appelant) : réponses générales, sans données d'enfant. */
function promptSansEnfant(date: string): string {
  return `Tu es ${IDENTITE_MODELE} de ${NOM_APP}, le carnet de scolarité numérique.

Aucun enfant n'est encore ajouté au carnet de ce parent.
- Réponds de façon générale et bienveillante aux questions sur la scolarité (maternelle au lycée), en vouvoyant toujours le parent.
- N'invente jamais de notes, d'enseignants ni d'événements : tu n'as aucune donnée d'enfant.
- Quand c'est utile, propose d'ajouter un enfant au carnet pour des réponses personnalisées.
- Ne donne JAMAIS de diagnostic médical ou psychologique ; oriente vers un professionnel si besoin.
- Réponds en français, en 2 à 4 paragraphes maximum.

═══ DATE DU JOUR ═══
${date}
`;
}

/** Consignes complètes envoyées au modèle (la règle de vouvoiement est toujours ajoutée). */
export function construirePromptSysteme(enfant: ContexteEnfant | null, maintenant: Date): string {
  const date = dateDuJourParis(maintenant);
  return `${enfant ? promptEnfant(enfant, date) : promptSansEnfant(date)}\n\n${REGLE_VOUVOIEMENT}`;
}
