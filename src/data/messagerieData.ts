/**
 * messagerieData — Static demo conversations per child.
 * No Supabase, no Aria, pure local data.
 *
 * Child IDs match MOCK_CHILDREN in ActiveChildContext:
 *   'demo-lea'   — Léa  (Maternelle Pasteur)
 *   'demo-lucas' — Lucas (CM2 B, École Voltaire)
 *   'demo-emma'  — Emma  (3e B, Collège Hugo)
 * Référence unique de l'univers de démo : src/data/demo/carnet.ts
 *
 * Dates RELATIVES à aujourd'hui (comme l'Agenda de démo) : `ilYa(n)` = il y a n jours, calculé au
 * chargement. Tout tient dans les 2-3 dernières semaines ; contenus de rentrée (réunion de rentrée,
 * fournitures, sortie à venir). Emma est en 3e : brevet en juin prochain.
 */

/** Date ISO (YYYY-MM-DD, heure locale) d'il y a `jours` jours. */
function ilYa(jours: number): string {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - jours);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Année du brevet d'Emma (3e) : juin prochain. */
const ANNEE_BREVET = new Date().getMonth() >= 6 ? new Date().getFullYear() + 1 : new Date().getFullYear();

export type MessageSender = 'parent' | 'other';
export type AvatarType = 'initials' | 'school' | 'absence';

export interface Message {
  id: string;
  sender: MessageSender;
  text: string;
  /** HH:MM — display only */
  time: string;
  /** YYYY-MM-DD — used for date-separator grouping */
  date: string;
}

export type ConvTag = 'sortie' | 'devoir' | 'vie' | 'cantine' | 'admin' | 'controle' | 'rdv';
export type ConvUrgency = 'signer' | 'repondre';

export interface Conversation {
  id: string;
  childId: string;
  name: string;
  role: string;
  avatarType: AvatarType;
  /** Two-letter initials for avatarType === 'initials' */
  initials?: string;
  /** Hex color for initials avatar background */
  avatarColor?: string;
  lastMessage: string;
  /** YYYY-MM-DD */
  lastDate: string;
  /** HH:MM */
  lastTime: string;
  unread: boolean;
  messages: Message[];
  /** Category tag for filtering/display */
  tag?: ConvTag;
  /** Action required */
  urgency?: ConvUrgency;
  /** Short Aria-generated summary */
  ariaSummary?: string;
}

// ─── Léa — Maternelle Pasteur ───────────────────────────

const leaConversations: Conversation[] = [
  {
    id: 'lea-laurent',
    childId: 'demo-lea',
    name: 'Mme Laurent',
    role: 'Maîtresse MS/GS',
    avatarType: 'initials',
    initials: 'ML',
    lastMessage: 'Léa a oublié son doudou ce matin, il est en sécurité dans la classe.',
    lastDate: ilYa(1),
    lastTime: '09:12',
    unread: true,
    messages: [
      { id: 'lea-l-1', sender: 'other', text: "Bonjour, Léa s'est très bien adaptée à la grande section, elle a retrouvé ses copains !", time: '16:30', date: ilYa(12) },
      { id: 'lea-l-2', sender: 'parent', text: "Merci Madame, ravie de l'entendre !", time: '17:45', date: ilYa(12) },
      { id: 'lea-l-3', sender: 'other', text: "Rappel : photo de classe vendredi, pensez à une tenue soignée 😊", time: '08:15', date: ilYa(4) },
      { id: 'lea-l-4', sender: 'parent', text: "Noté, merci pour le rappel !", time: '08:32', date: ilYa(4) },
      { id: 'lea-l-5', sender: 'other', text: "Léa a oublié son doudou ce matin, il est en sécurité dans la classe.", time: '09:12', date: ilYa(1) },
    ],
  },
  {
    id: 'lea-ecole',
    childId: 'demo-lea',
    name: 'École Pasteur',
    role: 'Établissement',
    avatarType: 'school',
    lastMessage: 'La cantine sera fermée jeudi, merci de prévoir un repas.',
    lastDate: ilYa(3),
    lastTime: '10:00',
    unread: false,
    messages: [
      { id: 'lea-e-1', sender: 'other', text: "Bonne rentrée à tous ! La réunion de rentrée des GS aura lieu jeudi à 17h30.", time: '09:00', date: ilYa(17) },
      { id: 'lea-e-2', sender: 'other', text: "Fournitures : une boîte de mouchoirs, un tablier de peinture et une paire de chaussons.", time: '11:00', date: ilYa(15) },
      { id: 'lea-e-3', sender: 'other', text: "La cantine sera fermée jeudi, merci de prévoir un repas.", time: '10:00', date: ilYa(3) },
    ],
  },
  {
    id: 'lea-absences',
    childId: 'demo-lea',
    name: 'Absences Léa',
    role: 'Suivi des absences',
    avatarType: 'absence',
    lastMessage: 'Léa est de retour, merci.',
    lastDate: ilYa(7),
    lastTime: '08:00',
    unread: false,
    messages: [
      { id: 'lea-a-1', sender: 'parent', text: "Bonjour, Léa sera absente ce matin, rendez-vous médical.", time: '07:45', date: ilYa(9) },
      { id: 'lea-a-2', sender: 'other', text: "Absence bien notée, merci.", time: '08:30', date: ilYa(9) },
      { id: 'lea-a-3', sender: 'parent', text: "Léa est de retour, merci.", time: '08:00', date: ilYa(7) },
    ],
  },
];

// ─── Lucas — CM2 B, École Voltaire ──────────────────────

const lucasConversations: Conversation[] = [
  {
    tag: 'sortie' as const,
    urgency: 'signer' as const,
    ariaSummary: 'Autorisation pour la sortie à la médiathèque à signer avant vendredi.',
    avatarColor: '#059669',
    id: 'lucas-moreau',
    childId: 'demo-lucas',
    name: 'Mme Dupont',
    role: 'Maîtresse CM2 B',
    avatarType: 'initials',
    initials: 'MD',
    lastMessage: 'Lucas a eu un petit accrochage avec un camarade, rien de grave, réglé en classe.',
    lastDate: ilYa(2),
    lastTime: '14:20',
    unread: true,
    messages: [
      { id: 'lucas-m-1', sender: 'other', text: "Bonjour, belle rentrée pour Lucas : il s'est vite installé en CM2.", time: '16:15', date: ilYa(11) },
      { id: 'lucas-m-2', sender: 'parent', text: "Merci, il est content de sa classe !", time: '17:30', date: ilYa(11) },
      { id: 'lucas-m-3', sender: 'other', text: "Sortie à la médiathèque vendredi : l'autorisation est à signer dans le carnet.", time: '09:00', date: ilYa(5) },
      { id: 'lucas-m-4', sender: 'parent', text: "Bien noté, nous la signons ce soir.", time: '09:45', date: ilYa(5) },
      { id: 'lucas-m-5', sender: 'other', text: "Lucas a eu un petit accrochage avec un camarade, rien de grave, réglé en classe.", time: '14:20', date: ilYa(2) },
    ],
  },
  {
    id: 'lucas-ecole',
    childId: 'demo-lucas',
    name: 'École Voltaire',
    role: 'Établissement',
    avatarType: 'school',
    lastMessage: 'Collecte alimentaire la semaine prochaine — participation bienvenue.',
    lastDate: ilYa(1),
    lastTime: '08:00',
    unread: false,
    messages: [
      { id: 'lucas-e-1', sender: 'other', text: "Réunion de rentrée des CM2 jeudi 17h30 en salle polyvalente.", time: '09:00', date: ilYa(16) },
      { id: 'lucas-e-2', sender: 'other', text: "La liste des fournitures de CM2 est collée dans le cahier de liaison.", time: '10:00', date: ilYa(14) },
      { id: 'lucas-e-3', sender: 'other', text: "Collecte alimentaire la semaine prochaine — participation bienvenue.", time: '08:00', date: ilYa(1) },
    ],
  },
  {
    id: 'lucas-absences',
    childId: 'demo-lucas',
    name: 'Absences Lucas',
    role: 'Suivi des absences',
    avatarType: 'absence',
    lastMessage: 'Merci du signalement, bon rétablissement à Lucas.',
    lastDate: ilYa(8),
    lastTime: '08:30',
    unread: false,
    messages: [
      { id: 'lucas-a-1', sender: 'parent', text: "Bonjour, Lucas est fiévreux ce matin, il sera absent aujourd'hui.", time: '07:50', date: ilYa(8) },
      { id: 'lucas-a-2', sender: 'other', text: "Merci du signalement, bon rétablissement à Lucas.", time: '08:30', date: ilYa(8) },
    ],
  },
];

// ─── Emma — 3e B, Collège Hugo ──────────────────────────

const emmaConversations: Conversation[] = [
  {
    id: 'emma-dupont',
    childId: 'demo-emma',
    name: 'Mme Lambert',
    role: 'Professeure de français',
    avatarType: 'initials',
    initials: 'ML',
    avatarColor: '#EF4444',
    tag: 'controle',
    ariaSummary: 'Premier devoir sur table jeudi prochain (récit autobiographique).',
    lastMessage: 'Premier devoir sur table jeudi prochain : le récit autobiographique.',
    lastDate: ilYa(3),
    lastTime: '11:00',
    unread: false,
    messages: [
      { id: 'emma-d-1', sender: 'other', text: "Emma a rendu une très belle première rédaction, 17/20. Continuez ainsi !", time: '17:00', date: ilYa(9) },
      { id: 'emma-d-2', sender: 'parent', text: "Merci Madame, elle a beaucoup travaillé.", time: '17:30', date: ilYa(9) },
      { id: 'emma-d-3', sender: 'other', text: "Premier devoir sur table jeudi prochain : le récit autobiographique.", time: '11:00', date: ilYa(3) },
    ],
  },
  {
    id: 'emma-garcia',
    childId: 'demo-emma',
    name: 'M. Petit',
    role: 'Professeur de mathématiques',
    avatarType: 'initials',
    initials: 'MP',
    avatarColor: '#4338CA',
    tag: 'devoir',
    ariaSummary: 'Note 8/20 au premier contrôle. Fiche de révisions à venir cette semaine.',
    lastMessage: 'Je vous envoie une fiche par cahier de liaison cette semaine.',
    lastDate: ilYa(2),
    lastTime: '15:00',
    unread: true,
    messages: [
      { id: 'emma-g-1', sender: 'other', text: "Le premier contrôle est décevant pour Emma — 8/20. Des difficultés sur le calcul littéral.", time: '16:00', date: ilYa(6) },
      { id: 'emma-g-2', sender: 'parent', text: "Merci pour le retour. On va mettre en place du soutien.", time: '17:00', date: ilYa(6) },
      { id: 'emma-g-3', sender: 'other', text: "N'hésitez pas à me contacter si vous avez des questions.", time: '09:00', date: ilYa(4) },
      { id: 'emma-g-4', sender: 'parent', text: "Pouvez-vous nous conseiller des exercices de révision ?", time: '09:30', date: ilYa(4) },
      { id: 'emma-g-5', sender: 'other', text: "Je vous envoie une fiche par cahier de liaison cette semaine.", time: '15:00', date: ilYa(2) },
    ],
  },
  {
    id: 'emma-martin',
    childId: 'demo-emma',
    name: 'M. Martin',
    role: 'Professeur de SVT',
    avatarType: 'initials',
    initials: 'MT',
    avatarColor: '#059669',
    tag: 'controle',
    ariaSummary: 'Note 13/20. Chapitre 1 (génétique) — résultat encourageant.',
    lastMessage: 'Emma a eu 13/20, résultat encourageant !',
    lastDate: ilYa(1),
    lastTime: '16:30',
    unread: false,
    messages: [
      { id: 'emma-mt-1', sender: 'other', text: "Interrogation de SVT vendredi sur le chapitre 1 — la génétique.", time: '10:00', date: ilYa(5) },
      { id: 'emma-mt-2', sender: 'parent', text: "Merci pour l'information.", time: '10:30', date: ilYa(5) },
      { id: 'emma-mt-3', sender: 'other', text: "Emma a eu 13/20, résultat encourageant !", time: '16:30', date: ilYa(1) },
    ],
  },
  {
    id: 'emma-direction',
    childId: 'demo-emma',
    name: 'Collège Hugo',
    role: 'Direction',
    avatarType: 'school',
    tag: 'admin',
    ariaSummary: `Réunion de rentrée des 3e jeudi 17h30. Brevet fin juin ${ANNEE_BREVET}.`,
    lastMessage: "Rappel : le règlement intérieur est dans le carnet.",
    lastDate: ilYa(10),
    lastTime: '14:00',
    unread: false,
    messages: [
      { id: 'emma-dir-1', sender: 'other', text: `Réunion de rentrée des parents de 3e jeudi à 17h30 : présentation de l'année et du brevet (fin juin ${ANNEE_BREVET}).`, time: '09:00', date: ilYa(18) },
      { id: 'emma-dir-2', sender: 'other', text: "Les manuels scolaires sont à couvrir avant la fin du mois.", time: '10:00', date: ilYa(15) },
      { id: 'emma-dir-3', sender: 'other', text: "Rappel : le règlement intérieur est dans le carnet.", time: '14:00', date: ilYa(10) },
    ],
  },
  {
    id: 'emma-absences',
    childId: 'demo-emma',
    name: 'Absences Emma',
    role: 'Suivi des absences',
    avatarType: 'absence',
    tag: 'vie',
    ariaSummary: '2 absences justifiées depuis la rentrée. RAS.',
    lastMessage: 'Bien noté, merci.',
    lastDate: ilYa(7),
    lastTime: '09:00',
    unread: false,
    messages: [
      { id: 'emma-a-1', sender: 'parent', text: "Bonjour, Emma a un rendez-vous orthodontiste ce matin, arrivée vers 10h.", time: '07:30', date: ilYa(13) },
      { id: 'emma-a-2', sender: 'other', text: "Noté, merci de l'avoir signalé.", time: '08:00', date: ilYa(13) },
      { id: 'emma-a-3', sender: 'parent', text: "Emma sera absente vendredi après-midi — rendez-vous médical.", time: '08:45', date: ilYa(7) },
      { id: 'emma-a-4', sender: 'other', text: "Bien noté, merci.", time: '09:00', date: ilYa(7) },
    ],
  },
];

// ─── Export ──────────────────────────────────────────────

export const CONVERSATIONS_BY_CHILD: Record<string, Conversation[]> = {
  'demo-lea': leaConversations,
  'demo-lucas': lucasConversations,
  'demo-emma': emmaConversations,
};
