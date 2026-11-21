/**
 * Accueil (lot 6, prompt du 16 nov. et CLAUDE.md § Accueil) — contenu des sections, pour l'enfant sélectionné seulement :
 *  1. « À faire · N » : une ligne par action (Signer, Autoriser, Répondre, Justifier, Lire), étiquette, titre,
 *     « échéance · [prénom] a signé » ; ouvre le mot ou la page d'absence.
 *  2. « Aujourd'hui et demain » : événements, rendez-vous fixes, « À prévoir » cochables, devoirs cochables.
 *     Un mot n'y figure JAMAIS comme un événement (ses « À prévoir » oui, rattachés à son événement de l'Agenda).
 *  4. Suggestion de l'assistant : une seule ligne, vouvoiement, avec sa source ; null si rien d'utile.
 * (3. « Nouveau dans le carnet » reste dans le composant : il trie des éléments déjà formés.)
 *
 * Module pur, testé par node (`npm run test:accueil`) : aucun import ; règles des mots passées en paramètre.
 */

export type EtiquetteAFaire = 'Signer' | 'Autoriser' | 'Répondre' | 'Justifier' | 'Lire';

/** Champs des mots utiles ici (sous-ensemble de MotCarnet). */
export interface MotAccueil {
  id: string;
  titre: string;
  expediteur: string;
  echeance: string | null;
  type: string;
  maReponse: unknown;
  lu: boolean;
  responsables: { prenom: string; estMoi: boolean; aSigne: boolean }[];
  aPrevoir: string[];
  evenement?: { id: string; titre: string; date: string; heure?: string };
}

export interface LigneAFaire {
  cle: string;
  etiquette: EtiquetteAFaire;
  titre: string;
  sousTitre: string;
  motId?: string;
  absenceId?: string;
}

/** « À faire » : absences à justifier, mots à traiter (par échéance), puis mots à lire. */
export function lignesAFaire<M extends MotAccueil>(p: {
  mots: M[];
  absencesAJustifier: { id: string; periode: string }[];
  aTraiter: (m: M) => boolean;
  attendReponse: (m: M) => boolean;
  /** « 2026-11-24 » → « mar. 24 nov. » */
  jourCourt: (iso: string) => string;
}): LigneAFaire[] {
  const res: LigneAFaire[] = p.absencesAJustifier.map((a) => ({
    cle: `absence-${a.id}`,
    etiquette: 'Justifier',
    titre: 'Absence à justifier',
    sousTitre: a.periode,
    absenceId: a.id,
  }));
  const aFaire = p.mots
    .filter(p.aTraiter)
    .sort((a, b) => (a.echeance ?? '9999').localeCompare(b.echeance ?? '9999'));
  for (const m of aFaire) {
    const sansReponse = m.maReponse === null || m.maReponse === undefined;
    const etiquette: EtiquetteAFaire =
      m.type === 'autorisation' && sansReponse ? 'Autoriser' : p.attendReponse(m) && sansReponse ? 'Répondre' : 'Signer';
    const parties = [
      m.echeance ? `avant le ${p.jourCourt(m.echeance)}` : null,
      ...m.responsables.filter((r) => !r.estMoi && r.aSigne).map((r) => `${r.prenom} a signé`),
    ].filter((x): x is string => !!x);
    res.push({ cle: `mot-${m.id}`, etiquette, titre: m.titre, sousTitre: parties.length ? parties.join(' · ') : m.expediteur, motId: m.id });
  }
  for (const m of p.mots.filter((x) => !x.lu && !p.aTraiter(x))) {
    res.push({ cle: `lire-${m.id}`, etiquette: 'Lire', titre: m.titre, sousTitre: m.expediteur, motId: m.id });
  }
  return res;
}

// ─── Aujourd'hui et demain ──────────────────────────────────────────────────────────────────────────────────────────

export interface EvtJour {
  id: string;
  titre: string;
  /** cours · devoir · examen · activite · reunion · sortie · evenement */
  type: string;
  date: string;
  debut: string;
  fin?: string;
  matiere?: string;
  lieu?: string;
  fait: boolean;
  coche?: string | null;
}

export interface OccurrenceRdv {
  id: string;
  titre: string;
  jour: string;
  heure?: string | null;
  /** Clé de semaine (lundi) pour cocher. */
  semaine: string;
  aPrevoir: { item: string; coche: boolean; source: string | null }[];
}

export type ElementJour =
  | { cle: string; sorte: 'evenement'; date: string; tri: string; titre: string; sousTitre: string; evtId: string; typeEvt: string }
  | { cle: string; sorte: 'devoir'; date: string; tri: string; titre: string; sousTitre: string; matiere?: string; fait: boolean; source: string | null; evtId: string }
  | { cle: string; sorte: 'prevoir'; date: string; tri: string; titre: string; sousTitre: string; fait: boolean; source: string | null; prevoir: { motId: string; item: string } | { rdvId: string; semaine: string; item: string } }
  | { cle: string; sorte: 'rendezvous'; date: string; tri: string; titre: string; sousTitre: string };

const TYPES_EVENEMENT = new Set(['evenement', 'sortie', 'examen', 'reunion', 'activite']);

/**
 * Éléments du jour et du lendemain, dans l'ordre : aujourd'hui puis demain, chacun par heure (sans heure en tête).
 * `quand(date)` : « Aujourd’hui » / « Demain » ; `heure(hh:mm)` : « 14h » ; `coches` : ids « motId|item » cochés.
 */
export function aujourdhuiEtDemain<M extends MotAccueil>(p: {
  evenements: EvtJour[];
  mots: M[];
  rendezVous: OccurrenceRdv[];
  coches: string[];
  aujourdhui: string;
  demain: string;
  quand: (date: string) => string;
  heure: (hhmm: string) => string;
}): ElementJour[] {
  const jours = new Set([p.aujourdhui, p.demain]);
  const res: ElementJour[] = [];
  const horaire = (debut?: string | null, fin?: string) =>
    debut ? `${p.heure(debut)}${fin ? `–${p.heure(fin)}` : ''}` : '';
  for (const e of p.evenements.filter((x) => jours.has(x.date))) {
    if (e.type === 'devoir') {
      res.push({
        cle: `devoir-${e.id}`, sorte: 'devoir', date: e.date, tri: '', titre: e.titre,
        sousTitre: [e.matiere, e.date === p.demain ? 'pour demain' : 'pour aujourd’hui'].filter(Boolean).join(' · '),
        matiere: e.matiere, fait: e.fait, source: e.coche ?? null, evtId: e.id,
      });
    } else if (TYPES_EVENEMENT.has(e.type)) {
      res.push({
        cle: `evt-${e.id}`, sorte: 'evenement', date: e.date, tri: e.debut ?? '', titre: e.titre,
        sousTitre: [p.quand(e.date), horaire(e.debut, e.fin), e.lieu].filter(Boolean).join(' · '), evtId: e.id, typeEvt: e.type,
      });
    }
  }
  for (const o of p.rendezVous.filter((x) => jours.has(x.jour))) {
    const tri = o.heure ? String(o.heure).slice(0, 5) : '';
    res.push({ cle: `rdv-${o.id}-${o.jour}`, sorte: 'rendezvous', date: o.jour, tri, titre: o.titre, sousTitre: [p.quand(o.jour), tri ? p.heure(tri) : ''].filter(Boolean).join(' · ') });
    for (const a of o.aPrevoir) {
      res.push({
        cle: `rdvp-${o.id}-${o.jour}-${a.item}`, sorte: 'prevoir', date: o.jour, tri: `${tri}~`, titre: a.item,
        sousTitre: `À prévoir · ${o.titre}, ${p.quand(o.jour).toLowerCase()}`, fait: a.coche, source: a.source,
        prevoir: { rdvId: o.id, semaine: o.semaine, item: a.item },
      });
    }
  }
  for (const m of p.mots) {
    if (!m.evenement || !jours.has(m.evenement.date)) continue;
    for (const item of m.aPrevoir) {
      const id = `${m.id}|${item}`;
      res.push({
        cle: `prevoir-${id}`, sorte: 'prevoir', date: m.evenement.date, tri: `${m.evenement.heure ?? ''}~`, titre: item,
        sousTitre: `À prévoir · ${m.evenement.titre}, ${p.quand(m.evenement.date).toLowerCase()}`,
        fait: p.coches.includes(id), source: null, prevoir: { motId: m.id, item },
      });
    }
  }
  return res.sort((a, b) => a.date.localeCompare(b.date) || a.tri.localeCompare(b.tri));
}

// ─── Suggestion de l'assistant ──────────────────────────────────────────────────────────────────────────────────────

export interface Suggestion {
  texte: string;
  source: string;
}

/**
 * Une seule ligne, vouvoiement, source citée ; ne parle que des données de l'enfant affiché. Null s'il n'y a rien d'utile :
 * prochain événement du jour, sinon mot à traiter, sinon devoirs pour demain.
 */
export function suggestionAccueil(p: {
  prenom: string;
  elements: ElementJour[];
  aFaire: LigneAFaire[];
  aujourdhui: string;
  demain: string;
  heureActuelle: string;
}): Suggestion | null {
  const evt = p.elements.find(
    (e) => (e.sorte === 'evenement' || e.sorte === 'rendezvous') && e.date === p.aujourdhui && (!e.tri || e.tri >= p.heureActuelle),
  );
  if (evt) {
    const prevoir = p.elements.filter((e) => e.sorte === 'prevoir' && e.date === p.aujourdhui && !e.fait).length;
    return {
      texte: `Aujourd’hui pour ${p.prenom} : ${evt.titre.toLowerCase()}${prevoir ? `, ${prevoir} chose${prevoir > 1 ? 's' : ''} à prévoir` : ''}.`,
      source: 'D’après l’agenda',
    };
  }
  const mot = p.aFaire.find((l) => l.motId && l.etiquette !== 'Lire');
  if (mot) {
    const attente = mot.etiquette === 'Signer' ? 'votre signature' : 'votre réponse';
    return { texte: `« ${mot.titre} » attend ${attente}.`, source: 'D’après les mots du carnet' };
  }
  const devoirs = p.elements.filter((e) => e.sorte === 'devoir' && e.date === p.demain && !e.fait);
  if (devoirs.length) {
    const n = devoirs.length;
    return { texte: `${p.prenom} a ${n} devoir${n > 1 ? 's' : ''} pour demain : ${devoirs.map((d) => d.titre.toLowerCase()).join(', ')}.`, source: 'D’après les devoirs de l’agenda' };
  }
  return null;
}
