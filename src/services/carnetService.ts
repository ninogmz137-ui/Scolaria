/**
 * carnetService — éléments du carnet ajoutés par la famille (lot B5 « Ajouter au carnet ») et
 * affichage dans Suivi › Souvenirs / Livrets et l'Accueil (« Nouveau dans le carnet »).
 *
 * Compte réel : table `carnet_items` (M10) lue sous RLS (foyer = responsables de l'enfant ;
 * « prive » = son auteur seul) ; fichiers dans le bucket PRIVÉ « carnet » (M20), lus uniquement par
 * URL signée d’1 h. ⚠ M20 n'est pas encore appliquée à Paris : l'envoi d'un fichier échoue avec un
 * message clair tant que le bucket n'existe pas (les jalons, sans fichier, fonctionnent).
 * Démo : ajouts gardés EN MÉMOIRE pour la session, rien en base ; données de démo fixes dans
 * src/data/demo/livrets.ts et souvenirs.ts.
 */

import { supabase } from './supabase';
import { isSupabaseConfigured } from './database';

/** Catégorie choisie par le parent (CLAUDE.md, « Ajouter au carnet »). */
export type CategorieCarnet = 'mot' | 'livret' | 'souvenir' | 'jalon';

/** Type de document affiché (libellé et icône). */
export type TypeCarnet =
  | 'livret'               // livret scolaire (LSU), carnet de suivi (maternelle)
  | 'bulletin'             // bulletin (collège / lycée)
  | 'evaluation_nationale' // Repères (évaluations nationales)
  | 'album'                // album photos de la classe
  | 'dessin'               // dessin, travail ajouté par la famille
  | 'jalon'                // « première fois »
  | 'mot';                 // mot recopié (capture d'une autre appli, photo du cahier)

export interface ElementCarnet {
  id: string;
  /** Onglet : Livrets (livret), Souvenirs (souvenir, jalon), Accueil (mot). */
  categorie: 'livret' | 'souvenir' | 'mot';
  type: TypeCarnet;
  titre: string;
  note?: string;
  /** Date ISO (YYYY-MM-DD). */
  date: string;
  /** Qui l'a mis dans le carnet : l'école (saisi) ou la famille (ajouté / scanné). */
  source: 'ecole' | 'parent';
  /** « Mme Dupont », « Sophie »… ; absent = le parent connecté (« vous »). */
  auteur?: string;
  /** Document papier numérisé par la famille (« Scanné par vous »). */
  scanne?: boolean;
  visibilite: 'foyer' | 'prive';
  /** Illustration de démo (dessinée pour l'app, jamais de photo d'enfant). */
  illustration?: 'maison' | 'arbre' | 'soleil' | 'fusee' | 'classe' | 'medaille';
  // ── Ajouts de la famille (B5) ──
  /** Catégorie d'origine, modifiable par l'auteur. */
  categorieCarnet?: CategorieCarnet;
  /** Chemin du fichier dans le bucket « carnet » (compte réel) ou URI locale (démo). */
  fichier?: string;
  mime?: string;
  /** Ajouté par le parent connecté : il peut le modifier et le supprimer. */
  deMoi?: boolean;
  anneeId?: string;
}

export function versAffichage(c: CategorieCarnet): Pick<ElementCarnet, 'categorie' | 'type'> {
  if (c === 'livret') return { categorie: 'livret', type: 'livret' };
  if (c === 'mot') return { categorie: 'mot', type: 'mot' };
  if (c === 'jalon') return { categorie: 'souvenir', type: 'jalon' };
  return { categorie: 'souvenir', type: 'dessin' };
}

// ─── Mise à jour des écrans (Suivi, Accueil) après un ajout / une modification ─
const abonnes = new Set<() => void>();
export function surChangementCarnet(f: () => void): () => void {
  abonnes.add(f);
  return () => abonnes.delete(f);
}
function prevenir() {
  abonnes.forEach((f) => f());
}

// ─── Démo : en mémoire pour la session ──────────────────────────────────────
const demo = new Map<string, ElementCarnet[]>();
export function carnetDemo(childId: string | undefined): ElementCarnet[] {
  return childId ? demo.get(childId) ?? [] : [];
}

// ─── Lecture (compte réel) ──────────────────────────────────────────────────
type CarnetItemRow = {
  id: string;
  categorie: CategorieCarnet;
  titre: string;
  note: string | null;
  fichier: string | null;
  date: string;
  ajoute_par: string;
  visibilite: 'foyer' | 'prive';
  academic_year_id: string | null;
};

function extensionMime(chemin: string | null): string | undefined {
  if (!chemin) return undefined;
  const ext = chemin.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

/** Ajouts de la famille pour l'enfant (compte réel), les plus récents d'abord. */
export async function getCarnetItems(childId: string): Promise<ElementCarnet[]> {
  if (!isSupabaseConfigured()) return [];
  const [{ data: auth }, { data, error }, { data: resp }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('carnet_items')
      .select('id, categorie, titre, note, fichier, date, ajoute_par, visibilite, academic_year_id')
      .eq('child_id', childId)
      .order('date', { ascending: false }),
    supabase.rpc('responsables_enfant', { p_child_id: childId }),
  ]);
  if (error || !data) return [];
  const moi = auth.user?.id;
  const prenoms = new Map<string, string>(
    ((resp ?? []) as { user_id: string; prenom: string }[]).map((r) => [r.user_id, r.prenom]),
  );
  return (data as CarnetItemRow[]).map((r) => {
    const deMoi = r.ajoute_par === moi;
    return {
      id: r.id,
      ...versAffichage(r.categorie),
      titre: r.titre,
      note: r.note ?? undefined,
      date: r.date,
      source: 'parent' as const,
      // Un livret ajouté par la famille est un document papier numérisé : « Scanné par vous ».
      scanne: r.categorie === 'livret',
      auteur: deMoi ? undefined : prenoms.get(r.ajoute_par) || 'un autre responsable',
      visibilite: r.visibilite,
      categorieCarnet: r.categorie,
      fichier: r.fichier ?? undefined,
      mime: extensionMime(r.fichier),
      deMoi,
      anneeId: r.academic_year_id ?? undefined,
    };
  });
}

// ─── Écriture ───────────────────────────────────────────────────────────────
export interface NouvelAjout {
  childId: string;
  /** Année du carnet ; absente = année en cours (trigger set_academic_year). */
  anneeId?: string;
  categorie: CategorieCarnet;
  titre: string;
  note?: string;
  date: string;
  visibilite: 'foyer' | 'prive';
  /** Fichier déjà NETTOYÉ (métadonnées retirées) et contrôlé (type, taille). */
  fichier?: { octets: Uint8Array; mime: string; extension: string; uriLocale: string };
}

export const TAILLE_MAX_OCTETS = 10 * 1024 * 1024; // 10 Mo (valeur proposée, M20)

function uuid(): string {
  const h = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) s += '-';
    else if (i === 14) s += '4';
    else if (i === 19) s += h[(Math.random() * 4) | 8];
    else s += h[(Math.random() * 16) | 0];
  }
  return s;
}

/** Message clair pour l'écran (jamais de détail technique). */
export class ErreurCarnet extends Error {}

export async function ajouterAuCarnet(a: NouvelAjout, modeDemo: boolean): Promise<void> {
  if (modeDemo) {
    const liste = demo.get(a.childId) ?? [];
    liste.unshift({
      id: `demo-ajout-${uuid()}`,
      ...versAffichage(a.categorie),
      titre: a.titre,
      note: a.note,
      date: a.date,
      source: 'parent',
      scanne: a.categorie === 'livret' && !!a.fichier,
      visibilite: a.visibilite,
      categorieCarnet: a.categorie,
      fichier: a.fichier?.uriLocale,
      mime: a.fichier?.mime,
      deMoi: true,
      anneeId: a.anneeId,
    });
    demo.set(a.childId, liste);
    prevenir();
    return;
  }

  const { data: auth } = await supabase.auth.getUser();
  const moi = auth.user?.id;
  if (!moi) throw new ErreurCarnet('Session expirée : reconnectez-vous.');

  let chemin: string | null = null;
  if (a.fichier) {
    if (!a.anneeId) throw new ErreurCarnet('Année du carnet introuvable.');
    if (a.fichier.octets.length > TAILLE_MAX_OCTETS) throw new ErreurCarnet('Fichier trop lourd (10 Mo au plus).');
    chemin = `${a.childId}/${a.anneeId}/${uuid()}.${a.fichier.extension}`;
    const { error } = await supabase.storage.from('carnet').upload(chemin, a.fichier.octets, {
      contentType: a.fichier.mime,
      upsert: false,
    });
    if (error) {
      throw new ErreurCarnet(
        /bucket/i.test(error.message)
          ? 'L’envoi de fichiers n’est pas encore ouvert sur votre compte.'
          : 'Envoi du fichier impossible. Réessayez.',
      );
    }
  }

  const { error } = await supabase.from('carnet_items').insert({
    child_id: a.childId,
    academic_year_id: a.anneeId ?? null,
    categorie: a.categorie,
    titre: a.titre,
    note: a.note ?? null,
    fichier: chemin,
    date: a.date,
    ajoute_par: moi,
    visibilite: a.visibilite,
  });
  if (error) {
    // La ligne n'a pas pu être créée : on ne laisse pas de fichier orphelin.
    if (chemin) await supabase.storage.from('carnet').remove([chemin]);
    throw new ErreurCarnet('Ajout impossible. Réessayez.');
  }
  prevenir();
}

export async function modifierAjout(
  e: ElementCarnet,
  changements: { categorie: CategorieCarnet; date: string; titre: string; visibilite: 'foyer' | 'prive' },
  modeDemo: boolean,
  childId: string,
): Promise<void> {
  if (modeDemo) {
    const liste = demo.get(childId) ?? [];
    demo.set(childId, liste.map((x) => (x.id === e.id
      ? { ...x, ...versAffichage(changements.categorie), categorieCarnet: changements.categorie, date: changements.date, titre: changements.titre, visibilite: changements.visibilite, scanne: changements.categorie === 'livret' && !!x.fichier }
      : x)));
    prevenir();
    return;
  }
  const { error } = await supabase
    .from('carnet_items')
    .update({ categorie: changements.categorie, date: changements.date, titre: changements.titre, visibilite: changements.visibilite })
    .eq('id', e.id);
  if (error) throw new ErreurCarnet('Modification impossible. Réessayez.');
  prevenir();
}

/** Supprime la ligne ET son fichier (le fichier d'abord : sinon il deviendrait orphelin). */
export async function supprimerAjout(e: ElementCarnet, modeDemo: boolean, childId: string): Promise<void> {
  if (modeDemo) {
    demo.set(childId, (demo.get(childId) ?? []).filter((x) => x.id !== e.id));
    prevenir();
    return;
  }
  if (e.fichier) {
    const { error } = await supabase.storage.from('carnet').remove([e.fichier]);
    if (error) throw new ErreurCarnet('Suppression du fichier impossible. Réessayez.');
  }
  const { error } = await supabase.from('carnet_items').delete().eq('id', e.id);
  if (error) throw new ErreurCarnet('Suppression impossible. Réessayez.');
  prevenir();
}

/** Lien de lecture d'un fichier pour l'affichage : URL signée d'1 h (CLAUDE.md, règles RGPD). Démo : URI locale. */
export async function lienFichier(e: ElementCarnet, modeDemo: boolean): Promise<string | null> {
  if (!e.fichier) return null;
  if (modeDemo) return e.fichier;
  const { data, error } = await supabase.storage.from('carnet').createSignedUrl(e.fichier, 60 * 60);
  return error ? null : data.signedUrl;
}
