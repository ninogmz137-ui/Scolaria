/**
 * Échange avec l'assistant : ce qui est GARDÉ après un message (écran, historique envoyé au modèle, stockage de l'appareil).
 *
 * Règle absolue (CLAUDE.md) : le texte d'un message de détresse n'est JAMAIS stocké (messages persistés, historique,
 * titre, aperçu) et ne repart JAMAIS vers le modèle, y compris au message suivant.
 *
 * Module PUR, sans import : le détecteur (detectEmergency du module partagé) est fourni par l'appelant, ce qui permet de
 * tester ce fichier avec node (`npm run test:aria-echange`).
 */

/** Renvoie la catégorie d'urgence d'un texte, ou null. */
export type Detecteur = (texte: string) => string | null;

export interface MessageEcran {
  id: string;
  text: string;
  sender: 'aria' | 'parent';
  timestamp: string;
}

export interface MessageModele {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationListee {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

/** Bulle neutre affichée (et gardée) à la place d'un message de détresse. */
export const MESSAGE_NON_CONSERVE = 'Message non conservé';

/** Nombre de messages gardés dans l'historique envoyé au modèle. */
const HISTORIQUE_MAX = 20;

/** Texte de la bulle du parent : jamais le texte saisi s'il déclenche le protocole d'urgence. */
export function texteBulleParent(texte: string, detecter: Detecteur): string {
  return detecter(texte) ? MESSAGE_NON_CONSERVE : texte;
}

/**
 * Retire de l'historique tout message `user` qui déclenche le protocole, avec la réponse qui le suit.
 * `retires` (facultatif) reçoit les textes retirés, pour retrouver les titres et aperçus qui en dérivent.
 */
export function purgerHistorique(history: MessageModele[], detecter: Detecteur, retires?: string[]): MessageModele[] {
  const garde: MessageModele[] = [];
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (m?.role === 'user' && typeof m.content === 'string' && detecter(m.content)) {
      retires?.push(m.content);
      if (history[i + 1]?.role === 'assistant') i++;
      continue;
    }
    garde.push(m);
  }
  return garde;
}

/** Remplace par la bulle neutre tout message du parent qui déclenche le protocole. */
export function purgerMessages(messages: MessageEcran[], detecter: Detecteur, retires?: string[]): MessageEcran[] {
  return messages.map((m) => {
    if (m?.sender === 'parent' && typeof m.text === 'string' && detecter(m.text)) {
      retires?.push(m.text);
      return { ...m, text: MESSAGE_NON_CONSERVE };
    }
    return m;
  });
}

export interface EchangeConclu {
  /** Messages à afficher ET à persister. */
  messages: MessageEcran[];
  /** Historique à garder pour le prochain appel au modèle. */
  history: MessageModele[];
  /** Titre à donner à la conversation, ou null (rien à changer). Jamais tiré d'un message de détresse. */
  titre: string | null;
  /** Aperçu (lastMessage) de la conversation. */
  apercu: string;
  urgence: boolean;
}

/**
 * Conclut un échange : `messages` et `history` sont l'état AVANT le message (sans bulle provisoire).
 * Sur urgence (signalée par sendToAria OU détectée ici) : bulle neutre, historique inchangé, ni titre ni aperçu tirés du texte.
 */
export function conclureEchange(p: {
  messages: MessageEcran[];
  history: MessageModele[];
  /** Texte saisi par le parent. */
  texte: string;
  /** Texte affiché de l'assistant (sans balise d'action). */
  reponse: string;
  /** Catégorie renvoyée par sendToAria, ou null. */
  urgence: string | null;
  /** false : la réponse est un message d'erreur local, qui ne repart pas au modèle. */
  dansHistorique?: boolean;
  detecter: Detecteur;
  /** Date.now() et heure affichée, fournis par l'appelant. */
  maintenant: number;
  heure: string;
}): EchangeConclu {
  const urgence = !!(p.urgence || p.detecter(p.texte));
  const dejaUnMessage = p.messages.some((m) => m.sender === 'parent' && m.text !== MESSAGE_NON_CONSERVE);

  const messages: MessageEcran[] = [
    ...purgerMessages(p.messages, p.detecter),
    { id: `u_${p.maintenant}`, text: urgence ? MESSAGE_NON_CONSERVE : p.texte, sender: 'parent', timestamp: p.heure },
    { id: `a_${p.maintenant + 1}`, text: p.reponse, sender: 'aria', timestamp: p.heure },
  ];

  const base = purgerHistorique(p.history, p.detecter);
  const history =
    urgence || p.dansHistorique === false
      ? base
      : [...base, { role: 'user' as const, content: p.texte }, { role: 'assistant' as const, content: p.reponse }].slice(-HISTORIQUE_MAX);

  return {
    messages,
    history,
    titre: !urgence && !dejaUnMessage ? p.texte.slice(0, 40) : null,
    apercu: urgence ? MESSAGE_NON_CONSERVE : p.reponse,
    urgence,
  };
}

// ─── Nettoyage du stockage existant (une fois, au démarrage) ───────────────

/** Partie de AsyncStorage utilisée ici (permet un faux stockage dans les tests). */
export interface StockageCles {
  getAllKeys(): Promise<readonly string[]>;
  getItem(cle: string): Promise<string | null>;
  setItem(cle: string, valeur: string): Promise<void>;
}

const PREFIXE_CLES = '@scolaria_aria_';
const CLES_MESSAGES = PREFIXE_CLES + 'messages:';
const CLES_HISTORIQUE = PREFIXE_CLES + 'history:';
const CLES_CONVERSATIONS = PREFIXE_CLES + 'conversations:';
/** Témoin : le nettoyage a déjà été fait sur cet appareil. */
export const CLE_NETTOYAGE_FAIT = '@carnet_assistant_nettoyage_urgence_v1';

function lireTableau<T>(brut: string | null): T[] | null {
  if (!brut) return null;
  try {
    const v = JSON.parse(brut);
    return Array.isArray(v) ? (v as T[]) : null;
  } catch {
    return null;
  }
}

export interface BilanNettoyage {
  dejaFait: boolean;
  /** Nombre de clés réécrites, par famille. */
  messages: number;
  historiques: number;
  conversations: number;
}

/**
 * Parcourt les conversations déjà stockées sur l'appareil et retire tout message du parent qui déclenche le protocole,
 * ainsi que les titres et aperçus qui en dérivent. Idempotent ; ne s'exécute qu'une fois (témoin CLE_NETTOYAGE_FAIT).
 */
export async function nettoyerStockageAssistant(
  stockage: StockageCles,
  detecter: Detecteur,
  titreParDefaut: () => string,
): Promise<BilanNettoyage> {
  const bilan: BilanNettoyage = { dejaFait: false, messages: 0, historiques: 0, conversations: 0 };
  if ((await stockage.getItem(CLE_NETTOYAGE_FAIT)) === '1') return { ...bilan, dejaFait: true };

  const cles = await stockage.getAllKeys();
  const retires: string[] = [];

  for (const cle of cles) {
    if (cle.startsWith(CLES_MESSAGES)) {
      const liste = lireTableau<MessageEcran>(await stockage.getItem(cle));
      if (!liste) continue;
      const avant = retires.length;
      const suivant = purgerMessages(liste, detecter, retires);
      if (retires.length > avant) {
        await stockage.setItem(cle, JSON.stringify(suivant));
        bilan.messages++;
      }
    } else if (cle.startsWith(CLES_HISTORIQUE)) {
      const liste = lireTableau<MessageModele>(await stockage.getItem(cle));
      if (!liste) continue;
      const avant = retires.length;
      const suivant = purgerHistorique(liste, detecter, retires);
      if (retires.length > avant) {
        await stockage.setItem(cle, JSON.stringify(suivant));
        bilan.historiques++;
      }
    }
  }

  // Titres (40 premiers caractères) et aperçus (120) tirés d'un message retiré, ou qui déclenchent eux-mêmes.
  const debuts40 = new Set(retires.map((t) => t.trim().slice(0, 40)));
  const debuts120 = new Set(retires.map((t) => t.trim().slice(0, 120)));
  for (const cle of cles) {
    if (!cle.startsWith(CLES_CONVERSATIONS)) continue;
    const liste = lireTableau<ConversationListee>(await stockage.getItem(cle));
    if (!liste) continue;
    let change = false;
    const suivant = liste.map((c) => {
      if (!c || typeof c !== 'object') return c;
      const titre = typeof c.title === 'string' ? c.title : '';
      const apercu = typeof c.lastMessage === 'string' ? c.lastMessage : '';
      const titreARetirer = !!titre && (debuts40.has(titre) || !!detecter(titre));
      const apercuARetirer = !!apercu && (debuts120.has(apercu) || !!detecter(apercu));
      if (!titreARetirer && !apercuARetirer) return c;
      change = true;
      return {
        ...c,
        title: titreARetirer ? titreParDefaut() : c.title,
        lastMessage: apercuARetirer ? MESSAGE_NON_CONSERVE : c.lastMessage,
      };
    });
    if (change) {
      await stockage.setItem(cle, JSON.stringify(suivant));
      bilan.conversations++;
    }
  }

  await stockage.setItem(CLE_NETTOYAGE_FAIT, '1');
  return bilan;
}
