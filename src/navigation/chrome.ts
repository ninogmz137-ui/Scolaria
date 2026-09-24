/**
 * Chrome de navigation — qui affiche quoi, écran par écran.
 *
 * Source unique de vérité : chaque route enregistrée dans une pile de TabNavigator
 * DOIT avoir un mode ici. Les piles sont typées avec `StackParams` (dérivé de cette
 * table) : enregistrer une route absente d'ici échoue à `tsc`.
 *
 * Deux modes, une seule règle : **un écran n'affiche jamais deux en-têtes.**
 *  - 'full' : top bar + bottom bar. L'en-tête de l'écran, c'est la top bar. L'écran réserve
 *             la place de la top bar en haut (insets.top + 60) et celle de la bottom bar en bas
 *             (getBottomBarScrollPadding). C'est le cas des 4 écrans racines et des pages
 *             profondes sans en-tête propre.
 *  - 'none' : l'écran dessine SON en-tête (DeepScreenHeader ou en-tête maison) ; il REMPLACE la
 *             top bar. Les deux barres sont masquées. L'écran gère lui-même l'inset du haut
 *             (SafeAreaView ou insets.top) et celui du bas (insets.bottom).
 */

export type ChromeMode = 'full' | 'none';

export const ROUTE_CHROME = {
  // ── Pile Accueil ──────────────────────────────────────
  AccueilHome: 'full',
  SignalerAbsenceScreen: 'none',
  BienEtreScreen: 'none',
  ProfilEnfant: 'none',
  AjouterEnfant: 'none',
  AjouterAnne: 'full',
  MonParcours: 'full',
  FamilleParametres: 'none',
  RGPDScreen: 'full',
  PermissionsRGPD: 'none',
  JournalAcces: 'none',
  TransfertCode: 'none',
  Effacement: 'none',
  ExportDonnees: 'none',
  APropos: 'none',
  AriaScreen: 'none',
  AriaHome: 'none',
  AriaConversation: 'none',
  WallpaperPicker: 'full',
  ArchivedYearDetail: 'full',
  Homework: 'none',
  Timetable: 'none',
  SignDoc: 'none',
  SignSuccess: 'none',
  // ── Pile Notes ────────────────────────────────────────
  NotesHome: 'full',
  SubjectDetail: 'full',
  GradeDetail: 'none',
  BulletinScreen: 'none',
  // ── Pile Agenda ───────────────────────────────────────
  AgendaHome: 'full',
  EventDetail: 'none',
  // ── Pile Messagerie ───────────────────────────────────
  MessagerieHome: 'full',
  SignalerAbsence: 'none',
  MessagesListScreen: 'full',
  AbsencesListScreen: 'full',
  EcoleListScreen: 'full',
  MessagerieAriaScreen: 'none',
  ConversationDetailScreen: 'full',
  MotDetailScreen: 'full',
} as const satisfies Record<string, ChromeMode>;

export type AppRouteName = keyof typeof ROUTE_CHROME;

/** Param list des piles : toute route enregistrée doit exister dans ROUTE_CHROME. */
export type StackParams = Record<AppRouteName, object | undefined>;

/** Mode d'une route ; les noms inconnus (onglets, racine) gardent le chrome complet. */
export function getChromeMode(routeName: string | undefined): ChromeMode {
  if (!routeName) return 'full';
  return (ROUTE_CHROME as Record<string, ChromeMode>)[routeName] ?? 'full';
}

interface NavStateLike {
  index?: number;
  routes: { name: string; state?: NavStateLike; params?: any }[];
}

/**
 * Nom de la route focalisée la plus profonde de tout l'état de navigation
 * (racine → onglets → pile). Si un navigateur imbriqué n'est pas encore monté,
 * on lit `params.screen` de la navigation en cours.
 */
export function getFocusedLeafRouteName(state: NavStateLike | undefined): string | undefined {
  let current = state;
  let name: string | undefined;
  while (current && current.routes.length > 0) {
    const route = current.routes[current.index ?? current.routes.length - 1];
    name = route.name;
    if (route.state) {
      current = route.state;
      continue;
    }
    let p = route.params;
    while (p && typeof p.screen === 'string') {
      name = p.screen;
      p = p.params;
    }
    break;
  }
  return name;
}
