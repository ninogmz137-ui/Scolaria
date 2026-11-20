/**
 * Teintes de catégorie — SOURCE UNIQUE (CLAUDE.md « Teintes de catégorie », COMPONENTS §18.1).
 *
 * Elles servent uniquement à CLASSER (disciplines, domaines, types de contenu), jamais à évaluer :
 * aucune teinte sur un niveau de compétence ni sur une tendance, jamais de vert ni de rouge.
 * Une discipline a la même teinte partout (Suivi, Accueil, devoirs, agenda).
 *
 * Fichier sans dépendance (testé hors Metro : src/theme/categories.test.mts). L'icône est un NOM lucide ;
 * le composant PastilleCategorie le traduit en icône.
 *
 * Le rattachement se fait par IDENTIFIANT STABLE (`DisciplineId`) : les libellés des référentiels officiels
 * ne sont lus qu'une fois, par `idDiscipline`, à la frontière des données. Un libellé inconnu donne
 * `inconnu` (ardoise + book-open), jamais une erreur.
 */

export type TeinteId = 'ambre' | 'ciel' | 'rose' | 'orange' | 'ardoise' | 'action';

/** Fond de pastille / couleur d'icône (contraste AA). */
export const TEINTES: Record<TeinteId, { fond: string; icone: string }> = {
  ambre: { fond: '#FEF3C7', icone: '#92400E' },
  ciel: { fond: '#E0F2FE', icone: '#075985' },
  rose: { fond: '#FCE7F3', icone: '#9D174D' },
  orange: { fond: '#FFEDD5', icone: '#9A3412' },
  ardoise: { fond: '#E2E8F0', icone: '#334155' },
  action: { fond: 'rgba(67,56,202,0.10)', icone: '#4338CA' },
};

export type IconeCategorie =
  | 'message-circle' | 'shapes' | 'compass' | 'scale' | 'languages' | 'palette' | 'activity' | 'book-open'
  | 'pencil' | 'image' | 'file-text' | 'backpack' | 'building-2';

export interface Categorie {
  teinte: TeinteId;
  icone: IconeCategorie;
}

// ─── Disciplines et domaines ───────────────────────────────────────────────

export type DisciplineId = 'francais' | 'maths' | 'monde' | 'emc' | 'langue-vivante' | 'arts' | 'eps' | 'inconnu';

export const DISCIPLINES: Record<DisciplineId, Categorie> = {
  francais: { teinte: 'ambre', icone: 'message-circle' },
  maths: { teinte: 'orange', icone: 'shapes' },
  monde: { teinte: 'ardoise', icone: 'compass' },
  emc: { teinte: 'ardoise', icone: 'scale' },
  'langue-vivante': { teinte: 'ambre', icone: 'languages' },
  arts: { teinte: 'rose', icone: 'palette' },
  eps: { teinte: 'ciel', icone: 'activity' },
  inconnu: { teinte: 'ardoise', icone: 'book-open' },
};

/** « Éducation Physique & Sportive » → « education physique sportive » (accents, ponctuation, casse). */
export function normaliserLibelle(libelle: string): string {
  return libelle
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Libellé (référentiel officiel de l'enfant, ou abréviation usuelle) → identifiant stable.
 * Les libellés viennent de src/data/referentiels : le test vérifie que chacun est couvert.
 */
const PAR_LIBELLE: Record<string, DisciplineId> = {
  // Cycle 1 (domaines, programme 2026)
  'le developpement et la structuration du langage oral et ecrit': 'francais',
  'agir s exprimer comprendre a travers les activites physiques': 'eps',
  'agir s exprimer comprendre a travers les activites artistiques': 'arts',
  'l acquisition des premiers outils mathematiques': 'maths',
  'se reperer dans le temps et l espace': 'monde',
  // Proposé, hors liste du sprint : le domaine 6 est l'ancêtre de « Questionner le monde ».
  'decouvrir le monde du vivant de la matiere et des objets': 'monde',
  // Cycles 2 et 3 (disciplines)
  francais: 'francais',
  mathematiques: 'maths',
  'questionner le monde': 'monde',
  'enseignement moral et civique': 'emc',
  emc: 'emc',
  'langue vivante anglais': 'langue-vivante',
  'langue vivante': 'langue-vivante',
  'langues vivantes': 'langue-vivante',
  'enseignements artistiques': 'arts',
  'education physique et sportive': 'eps',
  eps: 'eps',
  // Noms courts des emplois du temps et des devoirs (agenda de démo, Agenda réel) : mêmes disciplines.
  'histoire geo': 'monde',
  anglais: 'langue-vivante',
  sciences: 'monde',
  arts: 'arts',
  musique: 'arts',
  'explorer le monde': 'monde',
  // Proposés, hors liste du sprint : disciplines du cycle 3 de la même famille.
  'arts plastiques': 'arts',
  'education musicale': 'arts',
  'histoire des arts': 'arts',
  'histoire et geographie': 'monde',
  'sciences et technologie': 'monde',
};

/** Libellés rencontrés sans identifiant (relevés pour le rapport de sprint ; développement seulement). */
const NON_MAPPES = new Set<string>();

export function idDiscipline(libelle: string | null | undefined): DisciplineId {
  const cle = normaliserLibelle(libelle ?? '');
  const id = PAR_LIBELLE[cle];
  if (id) return id;
  if (libelle && typeof __DEV__ !== 'undefined' && __DEV__ && !NON_MAPPES.has(cle)) {
    NON_MAPPES.add(cle);
    console.warn(`[categories] discipline sans teinte : « ${libelle} » (ardoise par défaut)`);
  }
  return 'inconnu';
}

/** Catégorie d'une discipline ou d'un domaine, par libellé : jamais d'erreur. */
export function categorieDiscipline(libelle: string | null | undefined): Categorie {
  return DISCIPLINES[idDiscipline(libelle)];
}

// ─── Types de contenu (hors discipline) ────────────────────────────────────

export type TypeContenu =
  | 'mot' | 'autorisation' | 'a-repondre'
  | 'photo' | 'souvenir' | 'livret' | 'document' | 'a-prevoir';

export const TYPES_CONTENU: Record<TypeContenu, Categorie> = {
  mot: { teinte: 'action', icone: 'pencil' },
  autorisation: { teinte: 'action', icone: 'pencil' },
  'a-repondre': { teinte: 'action', icone: 'pencil' },
  photo: { teinte: 'ardoise', icone: 'image' },
  souvenir: { teinte: 'ardoise', icone: 'image' },
  livret: { teinte: 'ardoise', icone: 'file-text' },
  document: { teinte: 'ardoise', icone: 'file-text' },
  'a-prevoir': { teinte: 'ardoise', icone: 'backpack' },
};

/** École, direction, mairie (liste de messages) : ardoise + building-2. Les personnes n'ont aucune teinte propre. */
export const INSTITUTION: Categorie = { teinte: 'ardoise', icone: 'building-2' };
