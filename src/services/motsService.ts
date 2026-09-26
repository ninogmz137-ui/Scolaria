/**
 * motsService — les mots du carnet d'un enfant (cahier de liaison), UNE seule source pour
 * l'Accueil (« À faire ») et Messages (« À traiter », liste Général) — B4a, 26 sept 2026.
 *
 * Compte réel : mot_carnets (une copie par enfant, M5) + mots_liaison, signatures (une par
 * responsable et par carnet, M6), reponses_mot (M8), read_receipts. Démo : demo-mots.json + état
 * en mémoire (signature, réponse, lu), deux responsables (vous, Marc).
 * Une signature faite n'importe où prévient tous les écrans (surChangementMots).
 */

import { supabase } from './supabase';
import demoMotsJson from '../data/demo/demo-mots.json';
import { evenementDemoParId } from '../contexts/DemoContext';

export type TypeMot = 'information' | 'signature' | 'autorisation' | 'participation';
export type SignatureMode = 'none' | 'one' | 'both';
export type Participation = 'oui' | 'peut_etre' | 'non';
export type Reponse = boolean | Participation;

export interface ResponsableMot {
  id: string;
  prenom: string;
  estMoi: boolean;
  aSigne: boolean;
}

export interface MotCarnet {
  id: string;
  childId: string;
  titre: string;
  contenu: string;
  /** Lisible : « Mme Laurent », « Direction ». Jamais de code administratif. */
  expediteur: string;
  /** Date d'envoi (YYYY-MM-DD). */
  date: string;
  /** Date limite (YYYY-MM-DD) ou null. */
  echeance: string | null;
  type: TypeMot;
  signatureMode: SignatureMode;
  aPrevoir: string[];
  responsables: ResponsableMot[];
  maSignature: boolean;
  maReponse: Reponse | null;
  lu: boolean;
  /** Événement de l'Agenda lié au mot (date YYYY-MM-DD). */
  evenement?: { id: string; titre: string; date: string; heure?: string };
}

/** Le mot attend encore une action de MOI (signature, réponse). */
export function aTraiter(m: MotCarnet): boolean {
  const signature = m.signatureMode !== 'none' && !m.maSignature;
  const reponse = (m.type === 'autorisation' || m.type === 'participation') && m.maReponse === null;
  return signature || reponse;
}

// ─── Événements ─────────────────────────────────────────────────────────────

const abonnes = new Set<() => void>();
export function surChangementMots(f: () => void): () => void {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}
function prevenir() {
  abonnes.forEach((f) => f());
}

// ─── Démo ───────────────────────────────────────────────────────────────────

/** Les deux responsables de la famille Moreau (démo). */
export const MOI_DEMO = { prenom: 'Claire', nom: 'Moreau' };
export const AUTRE_DEMO = { prenom: 'Marc', nom: 'Moreau' };

type MotDemoJson = {
  id: string;
  childId: string;
  titre: string;
  contenu: string;
  expediteur: string;
  envoyeIlYa: number;
  echeanceDans: number | null;
  type: TypeMot;
  signatureMode: SignatureMode;
  aPrevoir: string[];
  evenementId?: string;
  autreSigne: boolean;
  maSignature: boolean;
  lu: boolean;
};

const etatDemo = new Map<string, { signe?: boolean; reponse?: Reponse; lu?: boolean }>();

function isoDans(jours: number): string {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + jours);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function motsDemo(childId: string): MotCarnet[] {
  return (demoMotsJson as MotDemoJson[])
    .filter((m) => m.childId === childId)
    .map((m) => {
      const etat = etatDemo.get(m.id) ?? {};
      const ev = m.evenementId ? evenementDemoParId(m.evenementId) : undefined;
      const maSignature = etat.signe ?? m.maSignature;
      return {
        id: m.id,
        childId: m.childId,
        titre: m.titre,
        contenu: m.contenu,
        expediteur: m.expediteur,
        date: isoDans(-m.envoyeIlYa),
        echeance: m.echeanceDans === null ? null : isoDans(m.echeanceDans),
        type: m.type,
        signatureMode: m.signatureMode,
        aPrevoir: m.aPrevoir,
        responsables: [
          { id: 'demo-moi', prenom: MOI_DEMO.prenom, estMoi: true, aSigne: maSignature },
          { id: 'demo-marc', prenom: AUTRE_DEMO.prenom, estMoi: false, aSigne: m.autreSigne },
        ],
        maSignature,
        maReponse: etat.reponse ?? null,
        lu: etat.lu ?? m.lu,
        evenement: ev ? { id: ev.id, titre: ev.title, date: ev.date, heure: ev.startTime } : undefined,
      };
    });
}

// ─── Compte réel ────────────────────────────────────────────────────────────

type MotRow = {
  id: string;
  titre: string;
  contenu: string;
  date_envoi: string | null;
  date_limite: string | null;
  statut: string;
  type: TypeMot;
  signature_mode: SignatureMode;
  a_prevoir: unknown;
  created_at: string;
};

async function motsReels(childId: string): Promise<MotCarnet[]> {
  const { data: auth } = await supabase.auth.getUser();
  const moi = auth.user?.id ?? '';
  const [carnet, resp, sigs, reps, lus, exp] = await Promise.all([
    supabase
      .from('mot_carnets')
      .select('mots_liaison(id, titre, contenu, date_envoi, date_limite, statut, type, signature_mode, a_prevoir, created_at)')
      .eq('child_id', childId),
    supabase.rpc('responsables_enfant', { p_child_id: childId }),
    supabase.from('signatures').select('mot_id, parent_id').eq('student_id', childId),
    supabase.from('reponses_mot').select('mot_id, responsable_id, autorisation, participation').eq('child_id', childId),
    supabase.from('read_receipts').select('mot_id').eq('parent_id', moi),
    // M21 : nom lisible de l'expéditeur (le parent ne peut pas lire le profil de l'enseignant).
    supabase.rpc('mots_carnet_expediteurs', { p_child_id: childId }),
  ]);
  if (carnet.error) return [];
  const responsables = ((resp.data ?? []) as { user_id: string; prenom: string; nom: string; est_moi: boolean }[]);
  const signes = new Set(((sigs.data ?? []) as { mot_id: string; parent_id: string }[]).map((s) => `${s.mot_id}|${s.parent_id}`));
  const mesReponses = new Map<string, Reponse>();
  for (const r of (reps.data ?? []) as { mot_id: string; responsable_id: string; autorisation: boolean | null; participation: Participation | null }[]) {
    if (r.responsable_id === moi) mesReponses.set(r.mot_id, r.autorisation ?? (r.participation as Participation));
  }
  const motsLus = new Set(((lus.data ?? []) as { mot_id: string }[]).map((r) => r.mot_id));
  const expediteurs = new Map(((exp.data ?? []) as { mot_id: string; expediteur: string }[]).map((e) => [e.mot_id, e.expediteur]));

  return ((carnet.data ?? []) as unknown as { mots_liaison: MotRow | null }[])
    .map((c) => c.mots_liaison)
    .filter((m): m is MotRow => !!m && (m.statut === 'envoyé' || m.statut === 'clos'))
    .map((m) => ({
      id: m.id,
      childId,
      titre: m.titre,
      contenu: m.contenu,
      expediteur: expediteurs.get(m.id) || 'Enseignant',
      date: (m.date_envoi ?? m.created_at).slice(0, 10),
      echeance: m.date_limite ? m.date_limite.slice(0, 10) : null,
      type: m.type,
      signatureMode: m.signature_mode,
      aPrevoir: Array.isArray(m.a_prevoir) ? (m.a_prevoir as unknown[]).map(String) : [],
      responsables: responsables.map((r) => ({
        id: r.user_id,
        prenom: r.prenom || r.nom || 'Responsable',
        estMoi: r.est_moi,
        aSigne: signes.has(`${m.id}|${r.user_id}`),
      })),
      maSignature: signes.has(`${m.id}|${moi}`),
      maReponse: mesReponses.get(m.id) ?? null,
      lu: motsLus.has(m.id),
    }));
}

// ─── API ────────────────────────────────────────────────────────────────────

/** Les mots du carnet de l'enfant, du plus récent au plus ancien. */
export async function chargerMots(childId: string, demo: boolean): Promise<MotCarnet[]> {
  const liste = demo ? motsDemo(childId) : await motsReels(childId);
  return liste.sort((a, b) => b.date.localeCompare(a.date));
}

/** Mon nom complet, pour la confirmation « Signer au nom de … ? ». */
export async function monNomComplet(childId: string, demo: boolean): Promise<string> {
  if (demo) return `${MOI_DEMO.prenom} ${MOI_DEMO.nom}`;
  const { data } = await supabase.rpc('responsables_enfant', { p_child_id: childId });
  const moi = ((data ?? []) as { prenom: string; nom: string; est_moi: boolean }[]).find((r) => r.est_moi);
  return [moi?.prenom, moi?.nom].filter(Boolean).join(' ') || 'vous';
}

/** Signe le mot en MON nom, pour le carnet de cet enfant (une signature par responsable et par carnet). */
export async function signerMot(m: MotCarnet, demo: boolean): Promise<string | null> {
  if (demo) {
    etatDemo.set(m.id, { ...etatDemo.get(m.id), signe: true, lu: true });
    prevenir();
    return null;
  }
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('signatures')
    .insert({ mot_id: m.id, parent_id: auth.user?.id, student_id: m.childId });
  if (!error) await marquerMotLu(m, false);
  prevenir();
  return error ? 'La signature n’a pas pu être enregistrée. Réessayez.' : null;
}

/**
 * Réponse à un mot d'autorisation (oui / non) ou de participation (oui / peut-être / non), en MON nom.
 * Si le mot demande aussi une signature, elle est enregistrée avec la réponse.
 */
export async function repondreMot(m: MotCarnet, reponse: Reponse, demo: boolean): Promise<string | null> {
  if (demo) {
    const signe = m.signatureMode !== 'none' ? true : etatDemo.get(m.id)?.signe;
    etatDemo.set(m.id, { ...etatDemo.get(m.id), reponse, signe, lu: true });
    prevenir();
    return null;
  }
  const valeur = m.type === 'autorisation' ? { autorisation: reponse as boolean } : { participation: reponse as Participation };
  const { error } = await supabase
    .from('reponses_mot')
    .upsert({ mot_id: m.id, child_id: m.childId, ...valeur }, { onConflict: 'mot_id,child_id,responsable_id' });
  if (error) {
    prevenir();
    return 'La réponse n’a pas pu être enregistrée. Réessayez.';
  }
  if (m.signatureMode !== 'none' && !m.maSignature) return signerMot(m, false);
  await marquerMotLu(m, false);
  prevenir();
  return null;
}

export async function marquerMotLu(m: MotCarnet, demo: boolean): Promise<void> {
  if (m.lu) return;
  if (demo) {
    etatDemo.set(m.id, { ...etatDemo.get(m.id), lu: true });
    prevenir();
    return;
  }
  const { data: auth } = await supabase.auth.getUser();
  await supabase
    .from('read_receipts')
    .upsert({ mot_id: m.id, parent_id: auth.user?.id, read_at: new Date().toISOString() }, { onConflict: 'mot_id,parent_id' });
  prevenir();
}

export async function marquerTousMotsLus(mots: MotCarnet[], demo: boolean): Promise<void> {
  for (const m of mots) if (!m.lu) await marquerMotLu(m, demo);
}
