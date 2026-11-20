/**
 * motsService — les mots du carnet d'un enfant (cahier de liaison), UNE seule source pour
 * l'Accueil (« À faire ») et Messages (« À traiter », liste Général) — B4a, 26 sept 2026.
 *
 * Compte réel : mot_carnets (une copie par enfant, M5) + mots_liaison, signatures (une par
 * responsable et par carnet, M6), reponses_mot (M8), read_receipts. Démo : demo-mots.json + état
 * en mémoire (signature, réponse, lu), deux responsables (data/demo/responsables.ts).
 * Une signature faite n'importe où prévient tous les écrans (surChangementMots).
 */

import { supabase } from './supabase';
import { leverSiErreur } from './erreurs';
import demoMotsJson from '../data/demo/demo-mots.json';
import { evenementDemoParId } from '../contexts/DemoContext';
import { MOI_DEMO, autreResponsableDemo } from '../data/demo/responsables';
import { aTraiter, attendParticipation, attendReponse, premierSignataire } from './motsRegles';
import { repondreAuMotDemo } from '../stores/messagerieStore';
import { libellesFil } from './filsService';

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

/**
 * Mot en mode « une signature suffit » (signature_mode « one ») : dès qu'UN responsable a signé (ou répondu,
 * la réponse valant signature), le mot est traité pour TOUT le foyer. Seul « both » attend chaque responsable.
 */
export interface TraitementMot {
  /** Prénom du signataire ; « un responsable (compte supprimé) » ou « un ancien responsable » (a quitté le carnet) sinon. */
  prenom: string;
  estMoi: boolean;
  /** Compte du signataire supprimé (M25) : la signature est conservée sans nom. */
  ancien: boolean;
  /** Date de la signature (ISO), si connue. */
  le: string | null;
  /** Sa réponse (autorisation / participation), si le mot en attend une et qu'elle est lisible. */
  reponse: Reponse | null;
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
  /** Mode « one » : qui a traité le mot pour le foyer (null tant que personne). */
  traitePar: TraitementMot | null;
  /** Signatures d'un responsable dont le compte a été supprimé (M25) : dates ISO. Conservées. */
  signaturesAnciens: string[];
  /** Réponses d'un responsable dont le compte a été supprimé (M27) : conservées, sans nom. */
  reponsesAnciennes: { reponse: Reponse; le: string | null }[];
  /** Le mot est signé (règle serveur) GRÂCE à une signature conservée : il ne repasse jamais « à signer ». */
  signeParAncien: boolean;
  maReponse: Reponse | null;
  lu: boolean;
  /** Événement de l'Agenda lié au mot (date YYYY-MM-DD). */
  evenement?: { id: string; titre: string; date: string; heure?: string };
  /** Mot complet (M39) : le mot pose une question oui / peut-être / non, cumulable avec une signature. */
  question: boolean;
  /** Libellé de la question (« Votre enfant viendra-t-il ? ») ou null : libellé par défaut. */
  questionLibelle: string | null;
  /**
   * « Répondre à [expéditeur] » possible : l'expéditeur est l'enseignant titulaire de l'enfant (le fil individuel
   * parent ↔ enseignant n'existe qu'avec lui). Faux pour la direction, la mairie, l'école.
   */
  peutRepondre: boolean;
  /** Mes réponses privées à ce mot (messages de MON fil individuel qui citent le mot), plus ancienne d'abord. */
  mesReponsesPrivees: ReponsePrivee[];
  /** Compte réel : auteur du mot (destinataire de la réponse privée). */
  teacherId?: string | null;
}

export interface ReponsePrivee {
  texte: string;
  /** Date ISO d'envoi. */
  le: string;
}

export { aTraiter, attendParticipation, attendReponse };

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

export { MOI_DEMO } from '../data/demo/responsables';

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
  question?: boolean;
  questionLibelle?: string;
};

/** Démo : l'expéditeur est une personne (« Mme Laurent », « M. Petit ») = l'enseignant de l'enfant. */
const estPersonne = (nom: string) => /^(Mme|M\.|Mlle)\s/.test(nom);
/** Démo : réponses privées envoyées, par carnet (clé mot + enfant). */
const reponsesPriveesDemo = new Map<string, ReponsePrivee[]>();

// État de la démo, mêmes règles que la base : signature et réponse PAR CARNET (clé mot + enfant) ;
// « lu » PAR MOT pour le responsable (décision du 18 nov. 2026) : lu dans un carnet = lu dans tous.
const etatDemo = new Map<string, { signe?: boolean; reponse?: Reponse }>();
const luDemo = new Set<string>();
const cleCarnet = (motId: string, childId: string) => `${motId}|${childId}`;

function isoDans(jours: number): string {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + jours);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function motsDemo(childId: string): MotCarnet[] {
  return (demoMotsJson as MotDemoJson[])
    .filter((m) => m.childId === childId)
    .map((m) => {
      const etat = etatDemo.get(cleCarnet(m.id, m.childId)) ?? {};
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
          { id: autreResponsableDemo(m.childId).id, prenom: autreResponsableDemo(m.childId).prenom, estMoi: false, aSigne: m.autreSigne },
        ],
        maSignature,
        traitePar:
          m.signatureMode === 'one' && (maSignature || m.autreSigne)
            ? maSignature
              ? { prenom: MOI_DEMO.prenom, estMoi: true, ancien: false, le: null, reponse: etat.reponse ?? null }
              : { prenom: autreResponsableDemo(m.childId).prenom, estMoi: false, ancien: false, le: null, reponse: null }
            : null,
        signaturesAnciens: [],
        reponsesAnciennes: [],
        signeParAncien: false,
        maReponse: etat.reponse ?? null,
        lu: luDemo.has(m.id) || m.lu,
        evenement: ev ? { id: ev.id, titre: ev.title, date: ev.date, heure: ev.startTime } : undefined,
        question: m.question === true || m.type === 'participation',
        questionLibelle: m.questionLibelle ?? null,
        peutRepondre: estPersonne(m.expediteur),
        mesReponsesPrivees: reponsesPriveesDemo.get(cleCarnet(m.id, m.childId)) ?? [],
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
  teacher_id?: string | null;
  question?: boolean;
  question_libelle?: string | null;
};

const COLONNES_MOT = 'id, titre, contenu, date_envoi, date_limite, statut, type, signature_mode, a_prevoir, created_at, teacher_id';
/** Code PostgreSQL « colonne inconnue » : base sans M39 (question, question_libelle, teacher_messages.mot_id). */
const COLONNE_INCONNUE = '42703';

/**
 * Mots du carnet, question comprise (M39). Base encore sans M39 : relecture sans la question, jamais d'écran
 * en erreur pour autant (le mot s'affiche comme avant).
 */
async function lireCarnet(childId: string) {
  const avec = await supabase
    .from('mot_carnets')
    .select(`mots_liaison(${COLONNES_MOT}, question, question_libelle)`)
    .eq('child_id', childId);
  if (avec.error?.code !== COLONNE_INCONNUE) return avec;
  return supabase.from('mot_carnets').select(`mots_liaison(${COLONNES_MOT})`).eq('child_id', childId);
}

/** Mes réponses privées (messages de mes fils qui citent un mot) ; base sans M39 : aucune. */
async function mesReponsesPrivees(moi: string): Promise<Map<string, ReponsePrivee[]>> {
  const res = new Map<string, ReponsePrivee[]>();
  const { data, error } = await supabase
    .from('teacher_messages')
    .select('mot_id, text, created_at')
    .eq('sender_id', moi)
    .not('mot_id', 'is', null)
    .order('created_at', { ascending: true });
  if (error) return res;
  for (const r of (data ?? []) as { mot_id: string; text: string; created_at: string }[]) {
    res.set(r.mot_id, [...(res.get(r.mot_id) ?? []), { texte: r.text, le: r.created_at }]);
  }
  return res;
}

async function motsReels(childId: string): Promise<MotCarnet[]> {
  const { data: auth, error: erreurAuth } = await supabase.auth.getUser();
  leverSiErreur(erreurAuth);
  const moi = auth.user?.id ?? '';
  const [carnet, resp, sigs, reps, lus, privees] = await Promise.all([
    lireCarnet(childId),
    supabase.rpc('responsables_enfant', { p_child_id: childId }),
    supabase.from('signatures').select('mot_id, parent_id, signed_at').eq('student_id', childId),
    supabase.from('reponses_mot').select('mot_id, responsable_id, autorisation, participation, updated_at').eq('child_id', childId),
    supabase.from('read_receipts').select('mot_id').eq('parent_id', moi),
    mesReponsesPrivees(moi),
  ]);
  leverSiErreur(carnet.error); // échec de chargement ≠ « aucun mot » : l'écran propose « Réessayer »
  const responsables = ((resp.data ?? []) as { user_id: string; prenom: string; nom: string; est_moi: boolean }[]);
  const lignesSig = (sigs.data ?? []) as { mot_id: string; parent_id: string | null; signed_at: string }[];
  const signes = new Set(lignesSig.filter((s) => s.parent_id).map((s) => `${s.mot_id}|${s.parent_id}`));
  const anciens = (motId: string) => lignesSig.filter((s) => s.mot_id === motId && !s.parent_id).map((s) => s.signed_at);
  const nbSignatures = (motId: string) => lignesSig.filter((s) => s.mot_id === motId).length;
  const mesReponses = new Map<string, Reponse>();
  const reponseDe = new Map<string, Reponse>(); // `${mot}|${responsable}`
  const anciennes = new Map<string, { reponse: Reponse; le: string | null }[]>();
  for (const r of (reps.data ?? []) as { mot_id: string; responsable_id: string | null; autorisation: boolean | null; participation: Participation | null; updated_at: string | null }[]) {
    const valeur = (r.autorisation ?? r.participation) as Reponse;
    if (r.responsable_id === moi) mesReponses.set(r.mot_id, valeur);
    if (r.responsable_id) reponseDe.set(`${r.mot_id}|${r.responsable_id}`, valeur);
    else anciennes.set(r.mot_id, [...(anciennes.get(r.mot_id) ?? []), { reponse: valeur, le: r.updated_at }]);
  }
  const traiteur = (motId: string) =>
    premierSignataire(motId, lignesSig, responsables, moi, reponseDe, anciennes.get(motId)?.[0]?.reponse ?? null);
  const motsLus = new Set(((lus.data ?? []) as { mot_id: string }[]).map((r) => r.mot_id));
  const lignes = ((carnet.data ?? []) as unknown as { mots_liaison: MotRow | null }[])
    .map((c) => c.mots_liaison)
    .filter((m): m is MotRow => !!m && (m.statut === 'envoyé' || m.statut === 'clos'));
  // M21 : nom lisible de l'expéditeur, mot par mot (le parent ne peut pas lire le profil de l'enseignant ;
  // la fonction ne renvoie QUE le nom affichable).
  const noms = await Promise.all(lignes.map((m) => supabase.rpc('mot_expediteur', { p_mot_id: m.id })));
  const expediteurs = new Map(lignes.map((m, i) => [m.id, (noms[i].data as string | null) ?? '']));
  // « Répondre à … » : seulement à l'enseignant titulaire de l'enfant (le seul avec qui un fil individuel peut
  // exister, règle fils_insert), et seulement sur une base qui connaît la réponse citant un mot (M39).
  const avecM39 = lignes.some((m) => m.question !== undefined);
  const enseignants = avecM39 ? [...new Set(lignes.map((m) => m.teacher_id).filter((t): t is string => !!t))] : [];
  const titulaires = await Promise.all(
    enseignants.map((t) => supabase.rpc('est_titulaire_enfant', { p_child_id: childId, p_teacher_id: t })),
  );
  const estTitulaire = new Set(enseignants.filter((_, i) => titulaires[i].data === true));

  return lignes.map((m) => ({
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
      traitePar: m.signature_mode === 'one' ? traiteur(m.id) : null,
      signaturesAnciens: anciens(m.id),
      reponsesAnciennes: anciennes.get(m.id) ?? [],
      // Même règle que la vue mot_carnets_statut : une (one) ou min(2, responsables) (both).
      signeParAncien:
        anciens(m.id).length > 0 &&
        (m.signature_mode === 'one'
          ? nbSignatures(m.id) >= 1
          : m.signature_mode === 'both' && nbSignatures(m.id) >= Math.min(2, Math.max(1, responsables.length))),
      maReponse: mesReponses.get(m.id) ?? null,
      lu: motsLus.has(m.id),
      question: m.question === true || m.type === 'participation',
      questionLibelle: m.question_libelle ?? null,
      peutRepondre: !!m.teacher_id && estTitulaire.has(m.teacher_id),
      mesReponsesPrivees: privees.get(m.id) ?? [],
      teacherId: m.teacher_id ?? null,
    }));
}

// ─── API ────────────────────────────────────────────────────────────────────

/** Les mots du carnet de l'enfant, du plus récent au plus ancien. */
export async function chargerMots(childId: string, demo: boolean): Promise<MotCarnet[]> {
  const liste = demo ? motsDemo(childId) : await motsReels(childId);
  return liste.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * « Signer aussi pour [prénom] » (décision 7 du 16 nov. 2026) : copies du MÊME mot dans le carnet des autres
 * enfants du foyer qui attendent encore MA signature. Une signature reste PAR carnet (aucune signature
 * groupée côté base) : chaque copie se signe par signerMot. Mots « à signer » seulement : une autorisation ou
 * une participation se décide enfant par enfant.
 */
export async function copiesASignerAilleurs(
  m: MotCarnet,
  autres: { id: string; prenom: string }[],
  demo: boolean,
): Promise<{ copie: MotCarnet; prenom: string }[]> {
  if (m.type !== 'signature' && m.type !== 'information') return [];
  if (m.signatureMode === 'none' || m.question) return [];
  const trouvees: { copie: MotCarnet; prenom: string }[] = [];
  for (const enfant of autres) {
    if (enfant.id === m.childId) continue;
    const mots = await chargerMots(enfant.id, demo);
    const copie = mots.find((x) => x.id === m.id && aTraiter(x));
    if (copie) trouvees.push({ copie, prenom: enfant.prenom });
  }
  return trouvees;
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
    const cle = cleCarnet(m.id, m.childId);
    etatDemo.set(cle, { ...etatDemo.get(cle), signe: true });
    luDemo.add(m.id);
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
    const cle = cleCarnet(m.id, m.childId);
    const signe = m.signatureMode !== 'none' ? true : etatDemo.get(cle)?.signe;
    etatDemo.set(cle, { ...etatDemo.get(cle), reponse, signe });
    luDemo.add(m.id);
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

/**
 * « Répondre à [expéditeur] » (mot complet, M39) : message privé à l'enseignant, dans MON fil individuel avec lui
 * pour cet enfant (créé s'il n'existe pas), qui CITE le mot. Jamais dans le fil partagé du foyer : l'autre
 * responsable ne le voit pas (garde partagée). Démo : même chose dans les fils de démo.
 */
export async function repondreEnPrive(m: MotCarnet, texte: string, demo: boolean): Promise<string | null> {
  const propre = texte.trim();
  if (!propre) return 'Écrivez votre réponse.';
  if (!m.peutRepondre) return 'Ce mot ne peut pas recevoir de réponse privée.';
  if (demo) {
    const cle = cleCarnet(m.id, m.childId);
    reponsesPriveesDemo.set(cle, [...(reponsesPriveesDemo.get(cle) ?? []), { texte: propre, le: new Date().toISOString() }]);
    repondreAuMotDemo(m.childId, m.expediteur, propre, m.titre);
    prevenir();
    return null;
  }
  const echec = 'Votre réponse n’a pas pu être envoyée. Réessayez.';
  const { data: auth } = await supabase.auth.getUser();
  const moi = auth.user?.id;
  if (!moi || !m.teacherId) return echec;
  const existant = await supabase
    .from('teacher_conversations')
    .select('id')
    .eq('teacher_id', m.teacherId)
    .eq('student_id', m.childId)
    .eq('portee', 'individuel')
    .eq('parent_id', moi)
    .maybeSingle();
  if (existant.error) return echec;
  let filId = (existant.data as { id: string } | null)?.id;
  if (!filId) {
    const cree = await supabase
      .from('teacher_conversations')
      .insert({ teacher_id: m.teacherId, parent_id: moi, student_id: m.childId, portee: 'individuel', ...(await libellesFil(m.childId, 'individuel')) })
      .select('id')
      .single();
    if (cree.error) return echec;
    filId = (cree.data as { id: string }).id;
  }
  const { error } = await supabase
    .from('teacher_messages')
    .insert({ conversation_id: filId, sender_role: 'parent', sender_id: moi, text: propre, mot_id: m.id });
  prevenir();
  return error ? echec : null;
}

export async function marquerMotLu(m: MotCarnet, demo: boolean): Promise<void> {
  if (m.lu) return;
  if (demo) {
    luDemo.add(m.id);
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
