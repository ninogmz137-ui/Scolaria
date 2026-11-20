// Garde d'hôte des scripts de test et du lanceur web : ils ne démarrent QUE contre un serveur de la machine.
// Règle : le nom d'hôte de l'URL doit être exactement localhost, 127.0.0.1 ou [::1] (pas un « contient localhost » : une URL
// comme https://xxx.supabase.co/?h=localhost passerait), ET l'URL ne doit contenir la référence d'AUCUN projet hébergé connu
// (Paris : nmizwmymhqleasnxcyvu). Origine : le 4 oct 2026 un aperçu « local » visait Paris sans que personne s'en aperçoive.
export const REFERENCES_INTERDITES = ['nmizwmymhqleasnxcyvu'];
const HOTES_LOCAUX = new Set(['localhost', '127.0.0.1', '[::1]']);

export function verifierHoteLocal(url) {
  let u;
  try {
    u = new URL(String(url));
  } catch {
    return { ok: false, raison: `URL illisible : ${String(url).slice(0, 60)}` };
  }
  const brut = String(url).toLowerCase();
  const ref = REFERENCES_INTERDITES.find((r) => brut.includes(r));
  if (ref) return { ok: false, raison: `l'URL contient la référence d'un projet hébergé (${ref})` };
  if (!HOTES_LOCAUX.has(u.hostname.toLowerCase())) return { ok: false, raison: `hôte « ${u.hostname} » : ni localhost, ni 127.0.0.1, ni [::1]` };
  return { ok: true, raison: '' };
}

// SCOLARIA_TEST_FORCER_URL : réservée à scripts/test-garde-hote.mjs. Elle ne peut que RENDRE LA GARDE PLUS STRICTE : l'URL
// réelle ET l'URL forcée doivent toutes deux être locales, sinon refus.
export function exigerHoteLocal(url) {
  let r = verifierHoteLocal(url);
  if (r.ok && process.env.SCOLARIA_TEST_FORCER_URL) r = verifierHoteLocal(process.env.SCOLARIA_TEST_FORCER_URL);
  if (!r.ok) {
    console.error(`REFUS (garde d'hôte) : ${r.raison}. Ce script ne tourne que contre un serveur local ; rien n'a été lancé.`);
    process.exit(2);
  }
}
