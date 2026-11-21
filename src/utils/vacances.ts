/**
 * vacances — calendrier officiel des vacances scolaires 2026-2027 par zone (lot 4c, ajout A1 du 20 nov. 2026).
 * Sert à NE PAS afficher les rendez-vous fixes hebdomadaires pendant les vacances. Fichier statique, sans table.
 *
 * Source : arrêté du 22 octobre 2025 fixant le calendrier scolaire de l'année 2026-2027 (JORF, Légifrance
 * JORFTEXT000052416058), tableau annexé ordonné ZONE A, ZONE B, ZONE C ; dates de la zone B recoupées avec
 * education.gouv.fr. « Le départ en vacances a lieu après la classe, la reprise des cours le matin des jours
 * indiqués. » → jours de vacances = STRICTEMENT entre le jour de départ et le jour de reprise.
 * « Les classes vaqueront le vendredi 7 mai 2027 » (pont de l'Ascension, toutes zones).
 * Zones (article 3) : A = Besançon, Bordeaux, Clermont-Ferrand, Dijon, Grenoble, Limoges, Lyon, Poitiers ;
 * B = Aix-Marseille, Amiens, Lille, Nancy-Metz, Nantes, Nice, Normandie, Orléans-Tours, Reims, Rennes, Strasbourg ;
 * C = Créteil, Montpellier, Paris, Toulouse, Versailles. Corse et outre-mer (article 5) : calendriers propres, non
 * repris ici → zone B par défaut, comme toute école dont la zone est inconnue (décision du 20 nov. 2026).
 * Hors de l'année couverte (avant la rentrée du 1er septembre 2026, après le début des vacances d'été du
 * 3 juillet 2027) : jours de vacances. Le fichier de 2027-2028 sera à ajouter.
 *
 * Module pur : aucun import (testé par node, src/utils/vacances.test.mts). Jours 'AAAA-MM-JJ'.
 */

export type Zone = 'A' | 'B' | 'C';

export const ANNEE_COUVERTE = { rentree: '2026-09-01', ete: '2027-07-03' };

/** Années scolaires dont le calendrier est dans ce fichier (garde-fou : src/utils/vacances-garde.test.mts). */
export const ANNEES_COUVERTES = ['2026-2027'];

/** Année scolaire d'un jour : de septembre à août (« 2026-2027 » du 1er sept. 2026 au 31 août 2027). */
export function anneeScolaire(jour: string): string {
  const [a, m] = jour.split('-').map(Number);
  return m >= 9 ? `${a}-${a + 1}` : `${a - 1}-${a}`;
}

/**
 * Années dont le calendrier doit être présent à cette date : l'année en cours, et la suivante à partir du 1er juin
 * (l'arrêté de l'année suivante est publié bien avant ; l'app doit le connaître avant la rentrée).
 */
export function anneesRequises(jour: string): string[] {
  const enCours = anneeScolaire(jour);
  const [, m] = jour.split('-').map(Number);
  if (m >= 6 && m <= 8) {
    const fin = Number(enCours.slice(5));
    return [enCours, `${fin}-${fin + 1}`];
  }
  return [enCours];
}

/** Années requises absentes du fichier (vide = tout va bien). */
export function calendriersManquants(jour: string): string[] {
  return anneesRequises(jour).filter((a) => !ANNEES_COUVERTES.includes(a));
}

/** [départ, reprise] : les jours strictement entre les deux sont des jours de vacances. */
const VACANCES: Record<Zone, [string, string][]> = {
  A: [['2026-10-17', '2026-11-02'], ['2026-12-19', '2027-01-04'], ['2027-02-13', '2027-03-01'], ['2027-04-10', '2027-04-26']],
  B: [['2026-10-17', '2026-11-02'], ['2026-12-19', '2027-01-04'], ['2027-02-20', '2027-03-08'], ['2027-04-17', '2027-05-03']],
  C: [['2026-10-17', '2026-11-02'], ['2026-12-19', '2027-01-04'], ['2027-02-06', '2027-02-22'], ['2027-04-03', '2027-04-19']],
};

/** Jours vaqués (ponts), toutes zones. */
const PONTS = ['2027-05-07'];

/** Département (deux caractères, « 2A »/« 2B » pour la Corse) → zone ; absent = zone inconnue. */
const ZONES_DEPARTEMENTS: Record<Zone, string[]> = {
  // Besançon, Bordeaux, Clermont-Ferrand, Dijon, Grenoble, Limoges, Lyon, Poitiers
  A: ['25', '39', '70', '90', '24', '33', '40', '47', '64', '03', '15', '43', '63', '21', '58', '71', '89',
    '07', '26', '38', '73', '74', '19', '23', '87', '01', '42', '69', '16', '17', '79', '86'],
  // Aix-Marseille, Amiens, Lille, Nancy-Metz, Nantes, Nice, Normandie, Orléans-Tours, Reims, Rennes, Strasbourg
  B: ['04', '05', '13', '84', '02', '60', '80', '59', '62', '54', '55', '57', '88', '44', '49', '53', '72', '85',
    '06', '83', '14', '27', '50', '61', '76', '18', '28', '36', '37', '41', '45', '08', '10', '51', '52',
    '22', '29', '35', '56', '67', '68'],
  // Créteil, Montpellier, Paris, Toulouse, Versailles
  C: ['77', '93', '94', '11', '30', '34', '48', '66', '75', '09', '12', '31', '32', '46', '65', '81', '82',
    '78', '91', '92', '95'],
};

/** Villes chefs-lieux d'académie (repli quand l'école n'a pas de code UAI). */
const ZONES_VILLES: Record<Zone, string[]> = {
  A: ['besancon', 'bordeaux', 'clermont-ferrand', 'dijon', 'grenoble', 'limoges', 'lyon', 'poitiers'],
  B: ['marseille', 'aix-en-provence', 'amiens', 'lille', 'nancy', 'metz', 'nantes', 'nice', 'caen', 'rouen',
    'orleans', 'tours', 'reims', 'rennes', 'strasbourg'],
  C: ['creteil', 'montpellier', 'paris', 'toulouse', 'versailles'],
};

function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * Zone de l'école : par le département du code UAI (3 premiers caractères, « 013 » → 13 ; « 620 »/« 720 » =
 * Corse), sinon par la ville (chef-lieu d'académie), sinon zone B (défaut).
 */
export function zoneDepuisEcole(ecole: { code_uai?: string | null; ville?: string | null } | null | undefined): Zone {
  const uai = (ecole?.code_uai ?? '').trim().toUpperCase();
  if (/^\d{3}/.test(uai)) {
    const dept = uai.slice(1, 3);
    for (const z of ['A', 'B', 'C'] as Zone[]) if (uai.startsWith('0') && ZONES_DEPARTEMENTS[z].includes(dept)) return z;
  }
  const ville = sansAccents(ecole?.ville ?? '');
  if (ville) for (const z of ['A', 'B', 'C'] as Zone[]) if (ZONES_VILLES[z].includes(ville)) return z;
  return 'B';
}

/** Ce jour est-il un jour sans classe pour les vacances scolaires (ou un pont) dans cette zone ? */
export function enVacances(jour: string, zone: Zone): boolean {
  if (jour < ANNEE_COUVERTE.rentree || jour > ANNEE_COUVERTE.ete) return true;
  if (PONTS.includes(jour)) return true;
  return VACANCES[zone].some(([depart, reprise]) => jour > depart && jour < reprise);
}
