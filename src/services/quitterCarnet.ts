/**
 * « Me retirer de ce carnet » (M28) : un responsable ne peut retirer que LUI-MÊME, jamais le dernier.
 * Conséquences (appliquées par le serveur) : ses ajouts PRIVÉS à ce carnet sont supprimés avec leurs fichiers ;
 * ses ajouts partagés restent (« Ajouté par un ancien responsable ») ; ses signatures et réponses aux mots restent ;
 * ses fils individuels avec l'enseignant sont conservés côté enseignant (« Ancien responsable ») ;
 * ses invitations en attente pour ce carnet sont annulées ; il perd tout accès à ce carnet.
 */

import { supabase } from './supabase';

export type ApercuDepart = { nb_prives: number; nb_partages: number; nb_responsables: number };

export async function apercuDepartCarnet(childId: string): Promise<ApercuDepart | null> {
  const { data, error } = await supabase.rpc('apercu_depart_carnet', { p_child_id: childId });
  if (error) return null;
  const ligne = (Array.isArray(data) ? data[0] : data) as ApercuDepart | undefined;
  return ligne ?? null;
}

export type ErreurDepart = 'dernier_responsable' | 'non_responsable' | 'indisponible';

export async function quitterCarnet(childId: string): Promise<ErreurDepart | null> {
  const { error } = await supabase.rpc('quitter_carnet', { p_child_id: childId });
  if (!error) return null;
  if (/dernier_responsable/.test(error.message)) return 'dernier_responsable';
  if (/non_responsable/.test(error.message)) return 'non_responsable';
  return 'indisponible';
}

export function pluriel(n: number, un: string, plusieurs: string): string {
  return `${n} ${n > 1 ? plusieurs : un}`;
}

/** Texte de la confirmation : conséquences claires, dites avant d'agir. */
export function texteConfirmationDepart(prenom: string, a: ApercuDepart | null): string {
  const lignes = ['Vous n’aurez plus accès à ce carnet. Les autres responsables le gardent.'];
  if (a) {
    lignes.push(
      a.nb_prives > 0
        ? `${pluriel(a.nb_prives, 'ajout privé sera supprimé', 'ajouts privés seront supprimés')}, avec leurs fichiers.`
        : 'Vous n’avez aucun ajout privé à ce carnet.',
    );
    if (a.nb_partages > 0) {
      lignes.push(
        `${pluriel(a.nb_partages, 'ajout partagé reste', 'ajouts partagés restent')} dans le carnet, affiché « Ajouté par un ancien responsable ».`,
      );
    }
  } else {
    lignes.push('Vos ajouts privés seront supprimés ; vos ajouts partagés restent, « Ajoutés par un ancien responsable ».');
  }
  lignes.push('Vos signatures et vos réponses aux mots restent aussi dans le carnet. Vos conversations avec l’enseignant sont gardées par l’enseignant, sous le nom « Ancien responsable » : vous n’y avez plus accès.');
  lignes.push('Vos invitations en attente pour ce carnet sont annulées.');
  lignes.push(`Pour revenir, un responsable de ${prenom} devra vous inviter de nouveau.`);
  return lignes.join('\n\n');
}
