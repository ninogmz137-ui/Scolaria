/**
 * Protocole d'urgence d'Aria (CLAUDE.md § Aria) — module PARTAGÉ, sans dépendance :
 *  - Edge Function « aria » : vérification faisant foi, AVANT tout appel au modèle ;
 *  - app (mode démo inclus) : même vérification, pour ne jamais répondre par une réponse
 *    d'exemple à un message de détresse.
 *
 * Si un mot-clé critique est détecté : aucune réponse de l'IA, message fixe avec les numéros
 * d'aide, et alerte signalée (catégorie uniquement — jamais le contenu du message).
 *
 * Choix assumé : mieux vaut un faux positif (« le suicide dans Roméo et Juliette ») qu'un
 * message de détresse traité comme une question ordinaire.
 */

export type EmergencyCategory = 'suicide' | 'harcelement' | 'maltraitance';

/** Minuscules, sans accents, espaces normalisés, apostrophes droites. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ');
}

// Motifs appliqués au texte normalisé. \b évite « viol » dans « violon », « violet », « violent ».
const PATTERNS: Record<EmergencyCategory, RegExp[]> = {
  suicide: [
    /\bsuicid/,                              // suicide, suicider, suicidaire
    // « me tuer » seulement avec une intention (« je veux me tuer »), pas l'hyperbole
    // (« ces devoirs vont me tuer », « ce contrôle va me tuer »)
    /\b(je vais|je veux|je voudrais|j'ai envie de|envie de) me tuer\b/,
    /\b(veut|voudrait|va|parle de|pense a) se tuer\b/,
    /\b(me|se|te) foutre en l'air\b/,
    /\b(envie|veux|veut|voudrais|voulais) (de )?mourir\b/,
    /\benvie d'en finir\b/,
    /\ben finir avec la vie\b/,
    /\bplus (envie|goût|gout) de vivre\b/,
    /\b(me|se|te) faire du mal\b/,
    /\bscarifi/,                             // scarifier, scarification
    /\b(me|se) couper les veines\b/,
    /\bplus la peine de vivre\b/,
  ],
  harcelement: [
    /\bharcel/,                              // harcèlement, harcelé(e), harceler
    /\bcyberharcel/,
    /\bracket/,
    /\bmenaces? de mort\b/,
  ],
  maltraitance: [
    /\bmaltrait/,                            // maltraitance, maltraité(e)
    /\b(me|le|la|nous|les) (frappe|frappent|bat|battent)\b/,
    /\battouchements?\b/,
    /\b(abus|agression)s? sexuel/,
    /\bviol(e|ee|ees|es|er)?\b/,             // viol, violé(e) — pas violon/violet/violent
    /\binceste\b/,
  ],
};

export function detectEmergency(text: string): EmergencyCategory | null {
  const t = normalize(text);
  for (const category of Object.keys(PATTERNS) as EmergencyCategory[]) {
    if (PATTERNS[category].some((re) => re.test(t))) return category;
  }
  return null;
}

const HELP_LINES: Record<EmergencyCategory, string> = {
  suicide: '• 3114 — prévention du suicide, 24h/24, gratuit',
  harcelement: '• 3018 — harcèlement et cyberharcèlement, 7j/7 de 9h à 23h, gratuit',
  maltraitance: '• 119 — Allô Enfance en danger, 24h/24, gratuit',
};

/** Numéros d'aide du protocole (l'app les rend cliquables : tel:…). */
export const HELP_NUMBERS = ['3114', '3018', '119', '112'] as const;

/**
 * Message fixe (aucune réponse générée par l'IA). Le numéro de la catégorie détectée vient en
 * premier, les autres ensuite, le 112 toujours en dernier.
 */
export function buildEmergencyMessage(category: EmergencyCategory): string {
  const others = (Object.keys(HELP_LINES) as EmergencyCategory[]).filter((c) => c !== category);
  return [
    'Ce que vous décrivez est important et demande l’aide d’une personne, tout de suite. Aria ne peut pas répondre seule à cette situation.',
    '',
    HELP_LINES[category],
    ...others.map((c) => HELP_LINES[c]),
    '',
    'En cas de danger immédiat, appelez le 112.',
  ].join('\n');
}
