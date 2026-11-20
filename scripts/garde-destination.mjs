// Garde de destination des scripts de sauvegarde et de restauration : AUCUN dossier de sauvegarde dans le dépôt.
// Origine : le 4 oct 2026 un chemin Windows mal cité (antislashs perdus) a fait écrire un dossier de sauvegarde À L'INTÉRIEUR du dépôt.
// Le chemin est RÉSOLU (chemin absolu, « .. » et liens symboliques / jonctions suivis sur l'ancêtre existant le plus proche), puis
// comparé au dépôt ; la comparaison ignore la casse sous Windows (path.relative).
import fs from 'node:fs';
import path from 'node:path';

function resoudreReel(chemin) {
  const abs = path.resolve(String(chemin));
  const reste = [];
  let courant = abs;
  // Remonte jusqu'à un ancêtre qui existe (le dossier visé peut ne pas exister encore), le « réalise », puis rajoute le reste.
  while (!fs.existsSync(courant)) {
    const parent = path.dirname(courant);
    if (parent === courant) return abs;
    reste.unshift(path.basename(courant));
    courant = parent;
  }
  return path.join(fs.realpathSync.native(courant), ...reste);
}

export function estDansDepot(chemin, depot) {
  const rel = path.relative(resoudreReel(depot), resoudreReel(chemin));
  if (rel === '') return true;
  if (path.isAbsolute(rel)) return false; // autre lecteur
  return rel.split(path.sep)[0] !== '..';
}

export function refuserDansDepot(chemin, depot, quoi = 'destination') {
  if (estDansDepot(chemin, depot)) {
    console.error(
      `REFUS (garde de destination) : ${quoi} « ${path.resolve(String(chemin))} » est située dans le dépôt (${path.resolve(depot)}). ` +
        `Une sauvegarde contient des données personnelles : elle va HORS du dépôt (ex. C:\\Users\\admin\\ScolariaBackups\\…). Rien n'a été lancé ni écrit.`,
    );
    process.exit(2);
  }
}
