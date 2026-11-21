/**
 * MARQUE — SOURCE UNIQUE du nom de l'application, du nom de l'assistant et des textes de permission iOS.
 * Les valeurs vivent dans `marque.json` (lisible par app.config.js, les Edge Functions et l'application) ; ce module
 * en tire les constantes et les FORMES GRAMMATICALES de l'assistant. Le renommage des TEXTES se fait dans marque.json
 * seulement (voir tasks/renommage.md pour les identifiants techniques, qui ne sont pas des textes).
 *
 * L'assistant : `assistant.nom` est son nom propre (« Aria »). Passer `assistant.generique` à `true` le fait devenir
 * « l'assistant » PARTOUT, sans autre changement de code : les textes n'écrivent jamais le nom, ils emploient ces formes
 * (nom, nomMilieu, a, avec, que, pronom, e…), qui s'accordent (« est désactivée » / « est désactivé »).
 *
 * Nom de l'application : « Scolaria » n'est pas disponible, un nouveau nom sera choisi (nom provisoire).
 */
import marque from './marque.json' with { type: 'json' };

export const NOM_APP: string = marque.nomApp;

/** Textes iOS de demande d'autorisation (gabarits : `{app}` = nom affiché de l'application). */
export const PERMISSIONS_IOS: { appareilPhoto: string; photos: string } = marque.permissionsIos;

export interface FormesAssistant {
  /** Nom propre configuré (« Aria »), même en mode générique. */
  nomPropre: string;
  generique: boolean;
  /** En tête de phrase ou de titre : « Aria » / « L’assistant ». */
  nom: string;
  /** Dans une phrase : « Aria » / « l’assistant ». */
  nomMilieu: string;
  /** « à Aria » / « à l’assistant ». */
  a: string;
  /** « d’Aria » / « de l’assistant ». */
  de: string;
  /** « avec Aria » / « avec l’assistant ». */
  avec: string;
  /** « par Aria » / « par l’assistant ». */
  par: string;
  /** « qu’Aria » / « que l’assistant » (« le ton qu’Aria utilise »). */
  que: string;
  /** Après un nom commun : « Conseils Aria » / « Conseils de l’assistant ». */
  complement: string;
  /** Après un nom de conversation : « vos conversations Aria » / « vos conversations avec l’assistant ». */
  complementAvec: string;
  /** Après « Je suis » : « Aria, votre assistante » / « votre assistant ». */
  presentation: string;
  /** « elle » / « il ». */
  pronom: string;
  /** « Elle » / « Il ». */
  Pronom: string;
  /** Pronom complément : « la » / « le » (« la réactiver »). */
  le: string;
  /** Marque du féminin : « e » / « » (« désactivé » + e). */
  e: string;
}

/** Calcule les formes à partir de la configuration (pure : testée sans réseau ni application). */
export function formesAssistant(a: { nom: string; genre: string; generique: boolean }): FormesAssistant {
  const g = a.generique;
  const f = !g && a.genre === 'f';
  return {
    nomPropre: a.nom,
    generique: g,
    nom: g ? 'L’assistant' : a.nom,
    nomMilieu: g ? 'l’assistant' : a.nom,
    a: g ? 'à l’assistant' : `à ${a.nom}`,
    de: g ? 'de l’assistant' : `d’${a.nom}`,
    avec: g ? 'avec l’assistant' : `avec ${a.nom}`,
    par: g ? 'par l’assistant' : `par ${a.nom}`,
    que: g ? 'que l’assistant' : `qu’${a.nom}`,
    complement: g ? 'de l’assistant' : a.nom,
    complementAvec: g ? 'avec l’assistant' : a.nom,
    presentation: g ? 'votre assistant' : `${a.nom}, votre assistante`,
    pronom: f ? 'elle' : 'il',
    Pronom: f ? 'Elle' : 'Il',
    le: f ? 'la' : 'le',
    e: f ? 'e' : '',
  };
}

export const ASSISTANT: FormesAssistant = formesAssistant(marque.assistant);

/** Nom de l'assistant tel qu'on l'écrit seul (« Aria », ou « L’assistant » en mode générique). */
export const NOM_ASSISTANT: string = ASSISTANT.nom;
