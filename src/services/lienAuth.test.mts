// Tests de analyserLienAuth (L3). Lancer : npm run test:liens-auth
import { analyserLienAuth } from './lienAuth.ts';

let ok = 0;
let echecs = 0;
function verifier(nom: string, obtenu: unknown, attendu: unknown) {
  const bon = JSON.stringify(obtenu) === JSON.stringify(attendu);
  console.log(`${bon ? 'OK ' : 'ÉCHEC'} ${nom}${bon ? '' : ` : obtenu ${JSON.stringify(obtenu)}, attendu ${JSON.stringify(attendu)}`}`);
  if (bon) ok++;
  else echecs++;
}

verifier('confirmation d’inscription (code)', analyserLienAuth('scolaria://auth/callback?code=abc-123'), { type: 'code', code: 'abc-123', recuperation: false });
verifier('réinitialisation (chemin auth/recuperation)', analyserLienAuth('scolaria://auth/recuperation?code=xyz'), { type: 'code', code: 'xyz', recuperation: true });
verifier('réinitialisation (ancien type=recovery accepté)', analyserLienAuth('scolaria://auth/callback?type=recovery&code=xyz'), { type: 'code', code: 'xyz', recuperation: true });
verifier('schéma quelconque (renommage)', analyserLienAuth('autreapp://auth/callback?code=k'), { type: 'code', code: 'k', recuperation: false });
verifier('client de dev (exp+schéma)', analyserLienAuth('exp+scolaria://auth/callback?code=k2'), { type: 'code', code: 'k2', recuperation: false });
verifier(
  'lien expiré (erreur dans le fragment)',
  analyserLienAuth('scolaria://auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'),
  { type: 'erreur', expire: true, message: 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau depuis l’app.' },
);
verifier(
  'erreur inconnue (requête)',
  analyserLienAuth('scolaria://auth/callback?error=server_error&error_description=Oops'),
  { type: 'erreur', expire: false, message: 'Ce lien ne peut pas être utilisé. Demandez-en un nouveau depuis l’app.' },
);
verifier('autre lien de l’app → null', analyserLienAuth('scolaria://dev/demo'), null);
verifier('callback sans code → null', analyserLienAuth('scolaria://auth/callback'), null);
verifier('URL vide → null', analyserLienAuth(''), null);
verifier('page web quelconque → null', analyserLienAuth('https://exemple.fr/?code=abc'), null);

console.log(echecs === 0 ? `── ${ok}/${ok} ──` : `── ${echecs} échec(s) ──`);
process.exitCode = echecs === 0 ? 0 : 1;
