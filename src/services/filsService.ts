/**
 * filsService — fils de conversation du COMPTE RÉEL côté parent (lot 3c, CLAUDE.md § Messages).
 * Aucune migration : tout existe depuis M12 / M22 / M29 (lu en base locale le 18 nov.).
 *
 * - Fil avec l'enseignant = `teacher_conversations` portée « foyer » : partagé par les responsables DU foyer
 *   (`est_du_foyer`) ; un parent séparé (autre foyer) a son propre fil et ne voit rien de celui-ci.
 *   Portée « individuel » = « Seulement moi » (invisible pour l'autre responsable).
 * - Fil de classe = `class_posts` de la classe de l'enfant : ANNONCE SEULE (les parents lisent, seul le
 *   titulaire écrit) ; on y répond à l'enseignant dans le fil foyer.
 * - Les fils sont rangés dans le magasin de messagerie (même forme que la démo), marqués `reel`.
 * L'enseignant ne lit pas `children` : à la création du fil, le parent écrit le prénom de l'enfant
 * (`student_code`) et « Famille [nom] » (`parent_name`), seuls libellés affichés côté enseignant.
 */

import { supabase } from './supabase';
import type { Conversation, Message } from '../data/messagerieData';
import { getConversations, remplacerFilsReels } from '../stores/messagerieStore';

const deuxChiffres = (n: number) => String(n).padStart(2, '0');
function dateEtHeure(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}`,
    time: `${deuxChiffres(d.getHours())}:${deuxChiffres(d.getMinutes())}`,
  };
}

async function moi(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Session expirée : reconnectez-vous.');
  return data.user.id;
}

type LigneFil = { id: string; teacher_id: string; portee: 'foyer' | 'individuel'; created_at: string };
type LigneMessage = { id: string; conversation_id: string; sender_role: 'teacher' | 'parent'; sender_id: string | null; text: string; read: boolean; created_at: string; mot_id: string | null };

/** La classe de l'année active de l'enfant (lisible par ses responsables), ou null. */
async function classeActive(childId: string): Promise<{ id: string; nom: string; enseignant_id: string | null } | null> {
  const { data: annee } = await supabase
    .from('academic_years')
    .select('classe_id')
    .eq('student_id', childId)
    .eq('statut', 'active')
    .maybeSingle();
  if (!annee?.classe_id) return null;
  const { data: classe } = await supabase.from('classes').select('id, nom, enseignant_id').eq('id', annee.classe_id).maybeSingle();
  return classe ?? null;
}

/**
 * Nom du titulaire de la classe de l'enfant, pour l'en-tête de l'Accueil (lot 6) : lu par le fil existant avec lui
 * (`fil_enseignant`, sous RLS), sans créer de fil ni de fonction nouvelle en base. Null si l'enfant n'a pas de classe
 * avec titulaire, ou si aucun fil n'existe encore avec lui : l'en-tête omet alors l'enseignant (jamais un nom deviné).
 */
export async function nomEnseignantReel(childId: string): Promise<string | null> {
  const classe = await classeActive(childId);
  if (!classe?.enseignant_id) return null;
  const { data: fil } = await supabase
    .from('teacher_conversations')
    .select('id')
    .eq('student_id', childId)
    .eq('teacher_id', classe.enseignant_id)
    .limit(1)
    .maybeSingle();
  if (!fil?.id) return null;
  const { data: nom } = await supabase.rpc('fil_enseignant', { p_conversation_id: fil.id });
  const texte = typeof nom === 'string' ? nom.trim() : '';
  return texte && texte !== 'Enseignant' ? texte : null;
}

/** Tous les fils réels de l'enfant (enseignant + classe), dans la forme du magasin. Lève en cas d'échec. */
export async function chargerFilsReels(childId: string): Promise<Conversation[]> {
  const uid = await moi();
  const [fils, resp, foyers, classe] = await Promise.all([
    supabase.from('teacher_conversations').select('id, teacher_id, portee, created_at').eq('student_id', childId),
    supabase.rpc('responsables_enfant', { p_child_id: childId }),
    supabase.from('responsables').select('user_id, foyer_id').eq('child_id', childId),
    classeActive(childId),
  ]);
  if (fils.error) throw new Error(fils.error.message);
  const lignes = (fils.data ?? []) as LigneFil[];
  const prenoms = new Map<string, string>(
    ((resp.data ?? []) as { user_id: string; prenom: string }[]).map((r) => [r.user_id, r.prenom || 'l’autre responsable']),
  );
  const lignesFoyer = (foyers.data ?? []) as { user_id: string; foyer_id: string }[];
  const monFoyerId = lignesFoyer.find((r) => r.user_id === uid)?.foyer_id;
  const autre = lignesFoyer.find((r) => r.user_id !== uid && r.foyer_id === monFoyerId);
  const autreDuFoyer = autre ? prenoms.get(autre.user_id) ?? 'l’autre responsable' : null;
  const ids = lignes.map((f) => f.id);
  const [msgs, noms] = await Promise.all([
    ids.length
      ? supabase.from('teacher_messages').select('id, conversation_id, sender_role, sender_id, text, read, created_at, mot_id').in('conversation_id', ids).order('created_at')
      : Promise.resolve({ data: [], error: null }),
    Promise.all(lignes.map((f) => supabase.rpc('fil_enseignant', { p_conversation_id: f.id }))),
  ]);
  if (msgs.error) throw new Error(msgs.error.message);
  const messages = (msgs.data ?? []) as LigneMessage[];
  const motIds = [...new Set(messages.map((m) => m.mot_id).filter((x): x is string => !!x))];
  const titres = new Map<string, string>();
  if (motIds.length) {
    const { data } = await supabase.from('mots_liaison').select('id, titre').in('id', motIds);
    for (const m of (data ?? []) as { id: string; titre: string }[]) titres.set(m.id, m.titre);
  }

  const conversations: Conversation[] = lignes.map((f, i) => {
    const nom = (noms[i].data as string | null) ?? 'Enseignant';
    const duFil: Message[] = messages
      .filter((m) => m.conversation_id === f.id)
      .map((m) => {
        const { date, time } = dateEtHeure(m.created_at);
        const deMoi = m.sender_role === 'parent' && m.sender_id === uid;
        return {
          id: m.id,
          sender: m.sender_role === 'teacher' ? 'other' : 'parent',
          text: m.text,
          date,
          time,
          ...(m.sender_role === 'parent' && !deMoi
            ? { auteur: 'autre' as const, auteurNom: (m.sender_id && prenoms.get(m.sender_id)) || 'l’autre responsable' }
            : {}),
          ...(m.mot_id && titres.get(m.mot_id) ? { motCite: titres.get(m.mot_id) } : {}),
        };
      });
    const dernier = duFil[duFil.length - 1];
    const debut = dateEtHeure(f.created_at);
    return {
      id: f.id,
      childId,
      name: nom,
      role: classe?.enseignant_id === f.teacher_id ? `Enseignant · ${classe.nom}` : 'Enseignant',
      avatarType: 'initials',
      lastMessage: dernier?.text ?? '',
      lastDate: dernier?.date ?? debut.date,
      lastTime: dernier?.time ?? debut.time,
      unread: messages.some((m) => m.conversation_id === f.id && m.sender_role === 'teacher' && !m.read),
      messages: duFil,
      portee: f.portee,
      reel: true,
      teacherId: f.teacher_id,
      autreDuFoyer,
    };
  });

  // Fil de classe : annonces du titulaire, s'il y en a (jamais de fil vide).
  if (classe) {
    const { data: posts } = await supabase
      .from('class_posts')
      .select('id, title, content, created_at')
      .eq('classe_id', classe.id)
      .order('created_at');
    const annonces: Message[] = ((posts ?? []) as { id: string; title: string | null; content: string | null; created_at: string }[]).map((p) => ({
      id: p.id,
      sender: 'other',
      text: [p.title, p.content].filter(Boolean).join('\n'),
      ...dateEtHeure(p.created_at),
    }));
    const derniere = annonces[annonces.length - 1];
    if (derniere) {
      conversations.push({
        id: `classe-${classe.id}`,
        childId,
        name: `Classe ${classe.nom}`,
        role: 'Annonces de l’enseignant',
        avatarType: 'school',
        lastMessage: derniere.text,
        lastDate: derniere.date,
        lastTime: derniere.time,
        unread: false,
        messages: annonces,
        annonce: true,
        reel: true,
      });
    }
  }
  return conversations;
}

/** Recharge les fils réels de l'enfant dans le magasin. */
export async function rafraichirFils(childId: string): Promise<void> {
  remplacerFilsReels(childId, await chargerFilsReels(childId));
}

/**
 * Libellés lisibles par l'enseignant (il ne lit pas `children`) : prénom de l'enfant ; fil foyer → « Famille [nom] »,
 * fil individuel → prénom et nom du responsable.
 */
export async function libellesFil(childId: string, portee: 'foyer' | 'individuel'): Promise<{ student_code: string; parent_name: string }> {
  const [{ data: enfant }, { data: resp }] = await Promise.all([
    supabase.from('children').select('first_name, last_name').eq('id', childId).maybeSingle(),
    supabase.rpc('responsables_enfant', { p_child_id: childId }),
  ]);
  const moiResp = ((resp ?? []) as { prenom: string; nom: string; est_moi: boolean }[]).find((r) => r.est_moi);
  const parent_name =
    portee === 'foyer'
      ? enfant?.last_name ? `Famille ${enfant.last_name}` : 'Famille'
      : [moiResp?.prenom, moiResp?.nom].filter(Boolean).join(' ') || 'Responsable';
  return { student_code: enfant?.first_name ?? '', parent_name };
}

/** Mon foyer pour cet enfant (responsables : ma ligne). */
async function monFoyer(childId: string, uid: string): Promise<string> {
  const { data, error } = await supabase.from('responsables').select('foyer_id').eq('child_id', childId).eq('user_id', uid).maybeSingle();
  if (error || !data?.foyer_id) throw new Error('Vous n’êtes pas responsable de cet enfant.');
  return data.foyer_id;
}

/**
 * Le fil FOYER avec l'enseignant titulaire de l'enfant, créé s'il n'existe pas. Renvoie son id (le magasin
 * est rechargé). Lève si l'enfant n'a pas d'enseignant rattaché.
 */
export async function filEnseignantReel(childId: string): Promise<string> {
  const uid = await moi();
  const classe = await classeActive(childId);
  if (!classe?.enseignant_id) throw new Error('L’école de votre enfant n’a pas encore d’enseignant sur l’application.');
  const foyer = await monFoyer(childId, uid);
  const chercher = () =>
    supabase
      .from('teacher_conversations')
      .select('id')
      .eq('teacher_id', classe.enseignant_id!)
      .eq('student_id', childId)
      .eq('portee', 'foyer')
      .eq('foyer_id', foyer)
      .maybeSingle();
  let { data: fil } = await chercher();
  if (!fil) {
    const { error } = await supabase.from('teacher_conversations').insert({
      teacher_id: classe.enseignant_id,
      student_id: childId,
      portee: 'foyer',
      foyer_id: foyer,
      ...(await libellesFil(childId, 'foyer')),
    });
    // 23505 : l'autre responsable du foyer vient de le créer ; on le relit.
    if (error && error.code !== '23505') throw new Error(error.message);
    ({ data: fil } = await chercher());
    if (!fil) throw new Error('Le fil n’a pas pu être ouvert. Réessayez.');
  }
  await rafraichirFils(childId);
  return fil.id;
}

/** Envoie un message libre dans un fil réel (foyer ou individuel). */
export async function envoyerMessageReel(conversationId: string, childId: string, texte: string): Promise<void> {
  const uid = await moi();
  const { error } = await supabase
    .from('teacher_messages')
    .insert({ conversation_id: conversationId, sender_role: 'parent', sender_id: uid, text: texte });
  if (error) throw new Error(error.message);
  await rafraichirFils(childId);
}

/**
 * « Seulement moi » depuis le fil foyer : le message part dans MON fil individuel avec le même enseignant
 * (créé au besoin), invisible pour l'autre responsable. Renvoie l'id de ce fil.
 */
export async function envoyerSeulementMoiReel(conv: Conversation, texte: string): Promise<string> {
  const uid = await moi();
  if (!conv.teacherId) throw new Error('Fil inconnu.');
  const chercher = () =>
    supabase
      .from('teacher_conversations')
      .select('id')
      .eq('teacher_id', conv.teacherId!)
      .eq('student_id', conv.childId)
      .eq('portee', 'individuel')
      .eq('parent_id', uid)
      .maybeSingle();
  let { data: fil } = await chercher();
  if (!fil) {
    const { error } = await supabase
      .from('teacher_conversations')
      .insert({ teacher_id: conv.teacherId, student_id: conv.childId, portee: 'individuel', parent_id: uid, ...(await libellesFil(conv.childId, 'individuel')) });
    if (error && error.code !== '23505') throw new Error(error.message);
    ({ data: fil } = await chercher());
    if (!fil) throw new Error('Le fil n’a pas pu être ouvert. Réessayez.');
  }
  await envoyerMessageReel(fil.id, conv.childId, texte);
  return fil.id;
}

/** Ouvrir un fil : les messages de l'enseignant passent « lus » (partagé par le foyer). */
export async function marquerFilLu(conversationId: string): Promise<void> {
  await supabase
    .from('teacher_messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .eq('sender_role', 'teacher')
    .eq('read', false);
}

/** Démo : le fil avec l'enseignant principal = le premier fil « foyer » de l'enfant. */
export function filEnseignantDemo(childId: string): string | undefined {
  return getConversations(childId).find((c) => c.portee === 'foyer')?.id;
}
