/**
 * jourParis — « aujourd'hui », « demain » et l'heure, calculés en HEURE DE PARIS partout dans l'app
 * (lot 4, ajout A4 du 20 nov. 2026).
 *
 * Avant : selon les écrans, le jour venait de `toISOString()` (UTC : entre minuit et 1 h ou 2 h à Paris,
 * « aujourd'hui » valait encore la veille) ou de l'heure du téléphone. Désormais une seule source.
 *
 * Règle de l'heure d'été européenne (directive 2000/84/CE) : UTC+2 du dernier dimanche de mars à 1 h UTC
 * au dernier dimanche d'octobre à 1 h UTC, UTC+1 le reste de l'année. Calculée ici, sans Intl : le résultat
 * ne dépend ni du fuseau du téléphone ni de la prise en charge des fuseaux par le moteur JavaScript.
 *
 * Module pur : aucun import (testé par node, src/utils/jourParis.test.mts).
 * Format des jours : 'AAAA-MM-JJ'.
 */

/** Dernier dimanche du mois (mois 1-12) de l'année, à 1 h UTC, en millisecondes. */
function dernierDimanche1hUtc(annee: number, mois: number): number {
  const dernierJour = new Date(Date.UTC(annee, mois, 0)); // jour 0 du mois suivant = dernier jour du mois
  const recul = dernierJour.getUTCDay(); // 0 = dimanche
  return Date.UTC(annee, mois - 1, dernierJour.getUTCDate() - recul, 1, 0, 0);
}

/** Décalage de Paris par rapport à UTC, en heures (1 ou 2), à l'instant donné. */
export function decalageParis(instant: Date = new Date()): number {
  const t = instant.getTime();
  const annee = instant.getUTCFullYear();
  return t >= dernierDimanche1hUtc(annee, 3) && t < dernierDimanche1hUtc(annee, 10) ? 2 : 1;
}

/** L'instant donné, décalé pour que ses champs UTC soient l'heure de Paris. */
function horlogeParis(instant: Date): Date {
  return new Date(instant.getTime() + decalageParis(instant) * 3600000);
}

const deux = (n: number) => String(n).padStart(2, '0');

/** Jour de Paris de l'instant donné (par défaut : maintenant), 'AAAA-MM-JJ'. */
export function jourParis(instant: Date = new Date()): string {
  const p = horlogeParis(instant);
  return `${p.getUTCFullYear()}-${deux(p.getUTCMonth() + 1)}-${deux(p.getUTCDate())}`;
}

/** Heure de Paris de l'instant donné, 'HH:MM'. */
export function heureParis(instant: Date = new Date()): string {
  const p = horlogeParis(instant);
  return `${deux(p.getUTCHours())}:${deux(p.getUTCMinutes())}`;
}

/** Le jour 'AAAA-MM-JJ' décalé de n jours (n négatif : vers le passé). */
export function decalerJour(jour: string, n: number): string {
  const [a, m, j] = jour.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + n));
  return `${d.getUTCFullYear()}-${deux(d.getUTCMonth() + 1)}-${deux(d.getUTCDate())}`;
}

/** Aujourd'hui à Paris. */
export function aujourdhuiParis(instant: Date = new Date()): string {
  return jourParis(instant);
}

/** Demain à Paris. */
export function demainParis(instant: Date = new Date()): string {
  return decalerJour(jourParis(instant), 1);
}

/**
 * Minuit local (heure du téléphone) portant le jour de Paris : remplace `new Date()` + `setHours(0,0,0,0)`
 * dans les écrans qui raisonnent en objets Date (semaine, « Pour demain »).
 */
export function dateAujourdhuiParis(instant: Date = new Date()): Date {
  return dateDuJour(jourParis(instant));
}

/** Instant (UTC) du début du jour 'AAAA-MM-JJ' à Paris : minuit, heure de Paris. */
export function minuitParis(jour: string): Date {
  const [a, m, j] = jour.split('-').map(Number);
  const minuitUtc = Date.UTC(a, m - 1, j);
  // Le changement d'heure a lieu à 1 h UTC : à minuit de Paris, le décalage est celui de minuit UTC du même jour.
  return new Date(minuitUtc - decalageParis(new Date(minuitUtc)) * 3600000);
}

/** Bornes ISO (UTC) des jours de Paris `de` à `a` inclus : pour filtrer des horodatages en base. */
export function bornesParis(de: string, a: string = de): { debut: string; fin: string } {
  return { debut: minuitParis(de).toISOString(), fin: new Date(minuitParis(decalerJour(a, 1)).getTime() - 1).toISOString() };
}

/** Jour de la semaine d'un jour 'AAAA-MM-JJ' : 1 = lundi … 7 = dimanche. */
export function jourSemaine(jour: string): number {
  const [a, m, j] = jour.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j)).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Lundi de la semaine d'un jour 'AAAA-MM-JJ'. */
export function lundiDuJour(jour: string): string {
  return decalerJour(jour, 1 - jourSemaine(jour));
}

/** Nombre de jours de `de` à `a` (tous deux 'AAAA-MM-JJ'). */
export function joursEntre(de: string, a: string): number {
  const ms = (j: string) => {
    const [y, m, d] = j.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(a) - ms(de)) / 86400000);
}

/**
 * Date locale (minuit, heure du téléphone) portant le jour 'AAAA-MM-JJ' : pour les écrans qui manipulent
 * des objets Date (bandeau de la semaine, libellés). Ne sert jamais à recalculer « aujourd'hui ».
 */
export function dateDuJour(jour: string): Date {
  const [a, m, j] = jour.split('-').map(Number);
  return new Date(a, m - 1, j);
}

/** Jour 'AAAA-MM-JJ' d'une Date construite par dateDuJour (champs locaux, sans conversion de fuseau). */
export function jourDeDate(d: Date): string {
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}
