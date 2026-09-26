/**
 * carnetService — éléments du carnet affichés dans Suivi › Souvenirs et Suivi › Livrets.
 *
 * Compte réel : table `carnet_items` (M10), lue sous RLS (foyer = responsables de l'enfant,
 * « prive » = son auteur seul). Aucun ajout depuis l'app tant que le lot B5 « Ajouter au carnet »
 * n'est pas fait. Démo : src/data/demo/livrets.ts et src/data/demo/souvenirs.ts.
 */

import { supabase } from './supabase';
import { isSupabaseConfigured } from './database';

/** Type de document affiché (libellé et icône). */
export type TypeCarnet =
  | 'livret'               // livret scolaire (LSU), carnet de suivi (maternelle)
  | 'bulletin'             // bulletin (collège / lycée)
  | 'evaluation_nationale' // Repères (évaluations nationales)
  | 'album'                // album photos de la classe
  | 'dessin'               // dessin, travail ajouté par la famille
  | 'jalon';               // « première fois »

export interface ElementCarnet {
  id: string;
  categorie: 'livret' | 'souvenir';
  type: TypeCarnet;
  titre: string;
  note?: string;
  /** Date ISO (YYYY-MM-DD). */
  date: string;
  /** Qui l'a mis dans le carnet : l'école (saisi) ou la famille (ajouté / scanné). */
  source: 'ecole' | 'parent';
  /** « Mme Dupont », « Julien »… ; absent = le parent connecté. */
  auteur?: string;
  /** Document papier numérisé par la famille (« Scanné par vous »). */
  scanne?: boolean;
  visibilite: 'foyer' | 'prive';
  /** Illustration de démo (dessinée pour l'app, jamais de photo d'enfant). */
  illustration?: 'maison' | 'arbre' | 'soleil' | 'fusee' | 'classe' | 'medaille';
}

type CarnetItemRow = {
  id: string;
  categorie: string;
  titre: string;
  note: string | null;
  date: string;
  ajoute_par: string;
  visibilite: 'foyer' | 'prive';
};

/** Souvenirs, jalons et livrets de l'enfant (compte réel), les plus récents d'abord. */
export async function getCarnetItems(childId: string): Promise<ElementCarnet[]> {
  if (!isSupabaseConfigured()) return [];
  const [{ data: auth }, { data, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('carnet_items')
      .select('id, categorie, titre, note, date, ajoute_par, visibilite')
      .eq('child_id', childId)
      .in('categorie', ['livret', 'souvenir', 'jalon'])
      .order('date', { ascending: false }),
  ]);
  if (error || !data) return [];
  const moi = auth.user?.id;
  return (data as CarnetItemRow[]).map((r) => ({
    id: r.id,
    categorie: r.categorie === 'livret' ? 'livret' : 'souvenir',
    type: r.categorie === 'livret' ? 'livret' : r.categorie === 'jalon' ? 'jalon' : 'dessin',
    titre: r.titre,
    note: r.note ?? undefined,
    date: r.date,
    source: 'parent',
    // Un livret ajouté par la famille est un document papier numérisé : « Scanné par vous ».
    scanne: r.categorie === 'livret',
    auteur: r.ajoute_par === moi ? undefined : 'un autre responsable',
    visibilite: r.visibilite,
  }));
}
