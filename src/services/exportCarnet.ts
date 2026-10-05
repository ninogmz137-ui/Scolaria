/**
 * Export RÉEL du carnet d'un enfant (L7b, droit à la portabilité) — remplace l'écran factice (fausse
 * progression, aucun fichier).
 *
 * - Données : tout ce que le compte connecté peut lire sur cet enfant, SOUS RLS (jamais la clé service) :
 *   ce qui appartient à l'autre responsable seul (privé) n'est donc pas exporté.
 * - Fichiers du carnet : téléchargés depuis des URL signées dans le cache PRIVÉ de l'app.
 * - Archive .zip (fflate, JavaScript pur) écrite dans le cache privé, puis feuille de partage du système :
 *   l'utilisateur choisit où l'enregistrer. Le dossier de travail est effacé avant chaque export et au
 *   démarrage de l'app.
 */

import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';
import { getResponsablesEnfant } from './database';
import { construireArchive, nomArchive, nomFichierArchive, texteLisezmoi, type FichierArchive } from './archiveCarnet';
import { NOM_APP } from '../constants/marque';

const NOM_DOSSIER = 'carnet-export';
const PAGE = 1000;

// [clé dans donnees.json, table, colonne de l'enfant]
const SECTIONS: [string, string, string][] = [
  ['annees', 'academic_years', 'student_id'],
  ['apprentissages', 'competences', 'child_id'],
  ['ajouts_au_carnet', 'carnet_items', 'child_id'],
  ['mots', 'mot_carnets', 'child_id'],
  ['signatures', 'signatures', 'student_id'],
  ['reponses_aux_mots', 'reponses_mot', 'child_id'],
  ['notes', 'grades', 'child_id'],
  ['matieres', 'subjects', 'child_id'],
  ['bulletins', 'bulletins', 'child_id'],
  ['agenda', 'agenda_events', 'child_id'],
  ['absences', 'absences', 'student_id'],
  ['ressenti', 'checkins', 'child_id'],
  ['alertes_urgence', 'alertes_urgence', 'child_id'],
  ['fils_avec_l_ecole', 'teacher_conversations', 'student_id'],
  ['conversations_aria', 'aria_conversations', 'child_id'],
];

/** Efface le dossier de travail de l'export (cache privé). */
export function viderExport(): void {
  try {
    const d = new Directory(Paths.cache, NOM_DOSSIER);
    if (d.exists) d.delete();
  } catch {
    // Archive encore ouverte par la feuille de partage : effacée au prochain export ou au démarrage.
  }
}

async function lireTout(table: string, colonne: string, valeurs: string | string[]): Promise<any[] | null> {
  const lignes: any[] = [];
  for (let debut = 0; ; debut += PAGE) {
    let q = supabase.from(table).select('*');
    q = Array.isArray(valeurs) ? q.in(colonne, valeurs) : q.eq(colonne, valeurs);
    const { data, error } = await q.range(debut, debut + PAGE - 1);
    if (error) return null;
    lignes.push(...(data ?? []));
    if (!data || data.length < PAGE) return lignes;
  }
}

export type ResultatExport =
  | { ok: true; nbFichiers: number; incomplet: boolean }
  | { ok: false; message: string };

export async function exporterCarnet(
  childId: string,
  prenom: string,
  progression: (etape: string) => void,
): Promise<ResultatExport> {
  if (Platform.OS === 'web') return { ok: false, message: 'L’export se fait depuis l’app, sur le téléphone.' };
  if (!(await Sharing.isAvailableAsync())) return { ok: false, message: 'Le partage de fichiers n’est pas disponible sur cet appareil.' };

  progression('Lecture du carnet…');
  const { data: enfant, error: errEnfant } = await supabase.from('children').select('*').eq('id', childId).maybeSingle();
  if (errEnfant || !enfant) return { ok: false, message: 'Le carnet n’a pas pu être lu. Réessayez.' };

  const donnees: Record<string, unknown> = {};
  const sectionsManquantes: string[] = [];
  for (const [cle, table, colonne] of SECTIONS) {
    const lignes = await lireTout(table, colonne, childId);
    if (lignes === null) sectionsManquantes.push(cle);
    donnees[cle] = lignes ?? [];
  }

  // Détails : texte des mots, messages des fils, messages Aria.
  const idsMots = (donnees.mots as any[]).map((m) => m.mot_id);
  if (idsMots.length) {
    const mots = await lireTout('mots_liaison', 'id', idsMots);
    if (mots === null) sectionsManquantes.push('texte_des_mots');
    const parId = new Map((mots ?? []).map((m) => [m.id, m]));
    donnees.mots = (donnees.mots as any[]).map((m) => ({ ...m, mot: parId.get(m.mot_id) ?? null }));
  }
  const idsFils = (donnees.fils_avec_l_ecole as any[]).map((f) => f.id);
  if (idsFils.length) {
    const msgs = await lireTout('teacher_messages', 'conversation_id', idsFils);
    if (msgs === null) sectionsManquantes.push('messages_des_fils');
    donnees.fils_avec_l_ecole = (donnees.fils_avec_l_ecole as any[]).map((f) => ({
      ...f,
      messages: (msgs ?? []).filter((m) => m.conversation_id === f.id),
    }));
  }
  const idsAria = (donnees.conversations_aria as any[]).map((c) => c.id);
  if (idsAria.length) {
    const msgs = await lireTout('aria_messages', 'conversation_id', idsAria);
    if (msgs === null) sectionsManquantes.push('messages_aria');
    donnees.conversations_aria = (donnees.conversations_aria as any[]).map((c) => ({
      ...c,
      messages: (msgs ?? []).filter((m) => m.conversation_id === c.id),
    }));
  }
  const { data: responsables } = await getResponsablesEnfant(childId);

  // Fichiers du carnet
  viderExport();
  const dossier = new Directory(Paths.cache, NOM_DOSSIER);
  dossier.create({ intermediates: true, idempotent: true });
  const avecFichier = (donnees.ajouts_au_carnet as any[]).filter((e) => e.fichier);
  const fichiers: FichierArchive[] = [];
  const fichiersManquants: string[] = [];
  const cheminParElement = new Map<string, string>();
  for (let i = 0; i < avecFichier.length; i++) {
    const e = avecFichier[i];
    progression(`Fichiers : ${i + 1} sur ${avecFichier.length}…`);
    const ext = /\.([a-z0-9]+)$/i.exec(e.fichier)?.[1] ?? 'bin';
    const chemin = nomFichierArchive(e.titre, e.date ?? e.created_at, e.id, ext);
    try {
      const { data: signe, error } = await supabase.storage.from('carnet').createSignedUrl(e.fichier, 10 * 60);
      if (error || !signe?.signedUrl) throw new Error('lien');
      const local = await File.downloadFileAsync(signe.signedUrl, new File(dossier, `${i}.${ext}`));
      fichiers.push({ chemin, octets: await local.bytes() });
      local.delete();
      cheminParElement.set(e.id, `fichiers/${chemin}`);
    } catch {
      fichiersManquants.push(e.id);
    }
  }
  donnees.ajouts_au_carnet = (donnees.ajouts_au_carnet as any[]).map((e) => ({
    ...e,
    fichier_dans_archive: cheminParElement.get(e.id) ?? null,
  }));

  // Photo de l'enfant (donnée personnelle d'un mineur, incluse dans l'export du carnet) : fichiers/photo-de-l-enfant.jpg
  // (bucket privé « child-photos », URL signée de 10 min). `photo_path` est déjà dans la ligne de l'enfant.
  let photoDansArchive: string | null = null;
  if (enfant.photo_path) {
    progression('Photo de l’enfant…');
    try {
      const { data: signe, error } = await supabase.storage.from('child-photos').createSignedUrl(String(enfant.photo_path), 10 * 60);
      if (error || !signe?.signedUrl) throw new Error('lien');
      const local = await File.downloadFileAsync(signe.signedUrl, new File(dossier, 'photo-enfant.jpg'));
      fichiers.push({ chemin: 'photo-de-l-enfant.jpg', octets: await local.bytes() });
      local.delete();
      photoDansArchive = 'fichiers/photo-de-l-enfant.jpg';
    } catch {
      fichiersManquants.push('photo-de-l-enfant');
    }
  }

  progression('Création de l’archive…');
  const genereLe = new Date();
  const archive = construireArchive(
    {
      export: {
        application: NOM_APP,
        genere_le: genereLe.toISOString(),
        format: 'Carnet complet d’un enfant, tel que le voit le compte qui exporte',
        sections_non_lues: sectionsManquantes,
        fichiers_non_telecharges: fichiersManquants.length,
      },
      enfant: { ...enfant, photo_dans_archive: photoDansArchive },
      responsables,
      ...donnees,
    },
    texteLisezmoi({ nomApp: NOM_APP, prenom, genereLe, nbFichiers: fichiers.length, fichiersManquants, sectionsManquantes }),
    fichiers,
  );
  const fichierZip = new File(dossier, nomArchive(prenom, genereLe));
  fichierZip.write(archive);

  progression('Partage…');
  await Sharing.shareAsync(fichierZip.uri, {
    mimeType: 'application/zip',
    UTI: 'public.zip-archive',
    dialogTitle: `Carnet de ${prenom}`,
  });
  return { ok: true, nbFichiers: fichiers.length, incomplet: sectionsManquantes.length > 0 || fichiersManquants.length > 0 };
}
