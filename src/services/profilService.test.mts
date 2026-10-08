/**
 * Compte sans profil — décision de l'app (`npm run test:profil`). Les droits en base sont testés par
 * supabase/tests/r2_profil_manquant.sql.
 */
import { decisionProfil } from './profilDecision.ts';

let echecs = 0;
const cas: [boolean, unknown, string, string][] = [
  [true, 'parent', 'ok', 'profil présent → rien à faire'],
  [true, 'enseignant', 'ok', 'profil présent (enseignant) → rien à faire'],
  [false, 'parent', 'terminer', 'parent sans profil → l’app termine l’inscription'],
  [false, undefined, 'terminer', 'sans rôle déclaré → traité comme parent'],
  [false, '', 'terminer', 'rôle vide → traité comme parent'],
  [false, 'enseignant', 'bloque', 'enseignant sans profil → écran « Inscription à terminer »'],
  [false, 'eleve', 'bloque', 'élève sans profil → écran « Inscription à terminer »'],
  [false, 'admin', 'bloque', 'rôle inconnu → jamais de création automatique'],
];
for (const [existe, role, attendu, libelle] of cas) {
  const obtenu = decisionProfil(existe, role);
  const ok = obtenu === attendu;
  if (!ok) echecs++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${libelle}${ok ? '' : ` (obtenu : ${obtenu})`}`);
}
console.log(`\n${cas.length} cas, ${echecs} échec(s)`);
process.exit(echecs ? 1 : 0);
