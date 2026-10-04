// Rotation des sauvegardes par ÂGE (décision du 4 oct 2026) :
//  - sauvegardes hebdomadaires (<racine>\AAAA-MM-JJ_HHmm, avec manifeste.json) : supprimées après 56 jours (8 semaines) ;
//    la plus récente sauvegarde complète n'est JAMAIS supprimée, quel que soit son âge ;
//  - dossiers « avant_Mxx » (sauvegardes faites avant une migration, dans le dossier PARENT de <racine>) : supprimés après 30 jours.
// Le script hebdomadaire appelle `appliquerRotation` après une réussite et JOURNALISE chaque suppression (statut PURGE).
// En ligne de commande ce module ne SUPPRIME RIEN : il liste les sauvegardes avec leur âge et ce qui serait purgé.
//   node scripts/rotation-sauvegardes.mjs [--racine <dossier hebdo>] [--parent <dossier des avant_Mxx>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const JOURS_HEBDO = 56;
export const JOURS_AVANT = 30;
const JOUR = 86_400_000;
const RE_HEBDO = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})$/;
const RE_AVANT = /(^|_)avant_/i; // 2026-09-25_avant_M19, avant_M29, avant_M34_cycle…

const dateNom = (nom) => {
  const m = nom.match(/^(\d{4})-(\d{2})-(\d{2})(?:_(\d{2})(\d{2}))?/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0)) : null;
};

// Date d'un dossier « avant_… » : la date dans son nom ; sinon la plus récente date d'un sous-dossier daté ; sinon sa date de modification.
function dateAvant(dossier) {
  const nom = path.basename(dossier);
  const d = dateNom(nom);
  if (d) return { date: d, source: 'nom' };
  let meilleur = null;
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (e.isDirectory()) {
      const s = dateNom(e.name);
      if (s && (!meilleur || s > meilleur)) meilleur = s;
    }
  }
  if (meilleur) return { date: meilleur, source: 'sous-dossier' };
  return { date: fs.statSync(dossier).mtime, source: 'modification' };
}

export function planifierRotation({ racine, parent, maintenant = new Date(), joursHebdo = JOURS_HEBDO, joursAvant = JOURS_AVANT }) {
  const age = (d) => Math.floor((maintenant.getTime() - d.getTime()) / JOUR);
  const hebdo = [];
  if (fs.existsSync(racine)) {
    for (const e of fs.readdirSync(racine, { withFileTypes: true })) {
      if (e.isDirectory() && RE_HEBDO.test(e.name) && fs.existsSync(path.join(racine, e.name, 'manifeste.json'))) {
        const d = dateNom(e.name);
        hebdo.push({ type: 'hebdomadaire', dossier: path.join(racine, e.name), nom: e.name, jours: age(d) });
      }
    }
  }
  hebdo.sort((a, b) => a.jours - b.jours); // la plus récente d'abord
  hebdo.forEach((h, i) => {
    h.aPurger = h.jours > joursHebdo && i > 0; // jamais la plus récente
    h.limite = joursHebdo;
  });
  const avant = [];
  if (parent && fs.existsSync(parent)) {
    for (const e of fs.readdirSync(parent, { withFileTypes: true })) {
      if (e.isDirectory() && RE_AVANT.test(e.name)) {
        const dossier = path.join(parent, e.name);
        const { date, source } = dateAvant(dossier);
        avant.push({ type: 'avant-migration', dossier, nom: e.name, jours: age(date), source, aPurger: age(date) > joursAvant, limite: joursAvant });
      }
    }
  }
  avant.sort((a, b) => a.jours - b.jours);
  return { hebdo, avant, tous: [...hebdo, ...avant] };
}

// Supprime seulement ce que le plan désigne ET qui reste sous le dossier voulu (jamais hors de racine / parent).
export function appliquerRotation(plan, { racine, parent, journaliser }) {
  const supprimes = [];
  for (const x of plan.tous) {
    if (!x.aPurger) continue;
    const base = x.type === 'hebdomadaire' ? racine : parent;
    const rel = path.relative(path.resolve(base), path.resolve(x.dossier));
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel) || rel.includes(path.sep)) continue; // enfant direct uniquement
    fs.rmSync(x.dossier, { recursive: true, force: true });
    supprimes.push(x);
    journaliser?.('PURGE', `${x.type} ${x.nom} : ${x.jours} jours (limite ${x.limite})`);
  }
  return supprimes;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (n, d) => {
    const i = process.argv.indexOf('--' + n);
    return i >= 0 ? process.argv[i + 1] : d;
  };
  const racine = arg('racine', 'C:\\Users\\admin\\ScolariaBackups\\hebdo');
  const parent = arg('parent', path.dirname(racine));
  const plan = planifierRotation({ racine, parent });
  console.log(`Sauvegardes (lecture seule — RIEN n'est supprimé par cette commande) — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
  console.log('type              âge (j)  limite  à purger  dossier');
  for (const x of plan.tous) {
    console.log(`${x.type.padEnd(17)} ${String(x.jours).padStart(7)}  ${String(x.limite).padStart(6)}  ${(x.aPurger ? 'OUI' : 'non').padEnd(8)}  ${x.dossier}`);
  }
  console.log(`\n${plan.tous.length} dossier(s) ; à purger aujourd'hui : ${plan.tous.filter((x) => x.aPurger).length}.`);
  for (const x of plan.tous.filter((y) => !y.aPurger).sort((a, b) => b.jours - a.jours).slice(0, 1)) {
    console.log(`Prochaine échéance : ${x.nom} (${x.type}) à purger après le ${new Date(Date.now() + (x.limite - x.jours) * JOUR).toISOString().slice(0, 10)}.`);
  }
}
