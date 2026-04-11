/**
 * messagerieData — Static demo conversations per child.
 * No Supabase, no Aria, pure local data.
 *
 * Child IDs match MOCK_CHILDREN in ActiveChildContext:
 *   'demo-lea'   — Léa  (Maternelle Pasteur)
 *   'demo-lucas' — Lucas (Primaire Jules Ferry CE2)
 *   'demo-emma'  — Emma  (Collège Jean Moulin 4ème)
 *
 * Dates use ISO "YYYY-MM-DD" (today = 2026-04-11 Saturday):
 *   Lundi  = 2026-04-06
 *   Mardi  = 2026-04-07
 *   Mercredi = 2026-04-08
 *   Jeudi  = 2026-04-09
 *   Vendredi = 2026-04-10
 */

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

export interface Conversation {
  id: string;
  childId: string;
  name: string;
  role: string;
  avatarType: AvatarType;
  /** Two-letter initials for avatarType === 'initials' */
  initials?: string;
  lastMessage: string;
  /** YYYY-MM-DD */
  lastDate: string;
  /** HH:MM */
  lastTime: string;
  unread: boolean;
  messages: Message[];
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
    lastDate: '2026-04-10',
    lastTime: '09:12',
    unread: true,
    messages: [
      { id: 'lea-l-1', sender: 'other', text: "Bonjour, Léa a passé une très belle journée ! Elle a bien participé en atelier.", time: '16:30', date: '2026-04-08' },
      { id: 'lea-l-2', sender: 'parent', text: "Merci Madame, ravie de l'entendre !", time: '17:45', date: '2026-04-08' },
      { id: 'lea-l-3', sender: 'other', text: "Rappel : photos de classe lundi, pensez à la tenue soignée 😊", time: '08:15', date: '2026-04-09' },
      { id: 'lea-l-4', sender: 'parent', text: "Noté, merci pour le rappel !", time: '08:32', date: '2026-04-09' },
      { id: 'lea-l-5', sender: 'other', text: "Léa a oublié son doudou ce matin, il est en sécurité dans la classe.", time: '09:12', date: '2026-04-10' },
    ],
  },
  {
    id: 'lea-ecole',
    childId: 'demo-lea',
    name: 'École Pasteur',
    role: 'Établissement',
    avatarType: 'school',
    lastMessage: 'La cantine sera fermée jeudi, merci de prévoir un repas.',
    lastDate: '2026-04-08',
    lastTime: '10:00',
    unread: false,
    messages: [
      { id: 'lea-e-1', sender: 'other', text: "Fermeture exceptionnelle vendredi 14 mars — journée pédagogique.", time: '09:00', date: '2026-04-06' },
      { id: 'lea-e-2', sender: 'other', text: "Spectacle de fin d'année le 20 juin à 18h, réservez la date !", time: '11:00', date: '2026-04-07' },
      { id: 'lea-e-3', sender: 'other', text: "La cantine sera fermée jeudi, merci de prévoir un repas.", time: '10:00', date: '2026-04-08' },
    ],
  },
  {
    id: 'lea-absences',
    childId: 'demo-lea',
    name: 'Absences Léa',
    role: 'Suivi des absences',
    avatarType: 'absence',
    lastMessage: 'Léa est de retour, merci.',
    lastDate: '2026-04-09',
    lastTime: '08:00',
    unread: false,
    messages: [
      { id: 'lea-a-1', sender: 'parent', text: "Bonjour, Léa sera absente ce matin, rendez-vous médical.", time: '07:45', date: '2026-04-07' },
      { id: 'lea-a-2', sender: 'other', text: "Absence bien notée, merci.", time: '08:30', date: '2026-04-07' },
      { id: 'lea-a-3', sender: 'parent', text: "Léa est de retour, merci.", time: '08:00', date: '2026-04-09' },
    ],
  },
];

// ─── Lucas — Primaire Jules Ferry CE2 ───────────────────

const lucasConversations: Conversation[] = [
  {
    id: 'lucas-moreau',
    childId: 'demo-lucas',
    name: 'Mme Moreau',
    role: 'Maîtresse CE2',
    avatarType: 'initials',
    initials: 'MM',
    lastMessage: 'Lucas a eu un petit accrochage avec un camarade, rien de grave, réglé en classe.',
    lastDate: '2026-04-08',
    lastTime: '14:20',
    unread: true,
    messages: [
      { id: 'lucas-m-1', sender: 'other', text: "Bonjour, Lucas a eu 15/20 à la dictée, très beau progrès !", time: '16:15', date: '2026-04-06' },
      { id: 'lucas-m-2', sender: 'parent', text: "Super, on est très contents !", time: '17:30', date: '2026-04-06' },
      { id: 'lucas-m-3', sender: 'other', text: "N'oubliez pas la sortie à la médiathèque vendredi, autorisation à signer.", time: '09:00', date: '2026-04-07' },
      { id: 'lucas-m-4', sender: 'parent', text: "Autorisation signée dans le cahier.", time: '09:45', date: '2026-04-07' },
      { id: 'lucas-m-5', sender: 'other', text: "Lucas a eu un petit accrochage avec un camarade, rien de grave, réglé en classe.", time: '14:20', date: '2026-04-08' },
    ],
  },
  {
    id: 'lucas-ecole',
    childId: 'demo-lucas',
    name: 'École Jules Ferry',
    role: 'Établissement',
    avatarType: 'school',
    lastMessage: 'Collecte alimentaire la semaine prochaine — participation bienvenue.',
    lastDate: '2026-04-10',
    lastTime: '08:00',
    unread: false,
    messages: [
      { id: 'lucas-e-1', sender: 'other', text: "Réunion de rentrée des CE2 jeudi 17h30 en salle polyvalente.", time: '09:00', date: '2026-04-06' },
      { id: 'lucas-e-2', sender: 'other', text: "Les photos de classe sont disponibles sur l'espace famille.", time: '10:00', date: '2026-04-08' },
      { id: 'lucas-e-3', sender: 'other', text: "Collecte alimentaire la semaine prochaine — participation bienvenue.", time: '08:00', date: '2026-04-10' },
    ],
  },
  {
    id: 'lucas-absences',
    childId: 'demo-lucas',
    name: 'Absences Lucas',
    role: 'Suivi des absences',
    avatarType: 'absence',
    lastMessage: 'Merci du signalement, bon rétablissement à Lucas.',
    lastDate: '2026-04-10',
    lastTime: '08:30',
    unread: false,
    messages: [
      { id: 'lucas-a-1', sender: 'parent', text: "Bonjour, Lucas est fiévreux ce matin, il sera absent aujourd'hui.", time: '07:50', date: '2026-04-10' },
      { id: 'lucas-a-2', sender: 'other', text: "Merci du signalement, bon rétablissement à Lucas.", time: '08:30', date: '2026-04-10' },
    ],
  },
];

// ─── Emma — Collège Jean Moulin 4ème ────────────────────

const emmaConversations: Conversation[] = [
  {
    id: 'emma-dupont',
    childId: 'demo-emma',
    name: 'Mme Dupont',
    role: 'Professeure de Français',
    avatarType: 'initials',
    initials: 'MD',
    lastMessage: 'Le brevet blanc de français est fixé au 2 mai, révisions à prévoir.',
    lastDate: '2026-04-09',
    lastTime: '11:00',
    unread: false,
    messages: [
      { id: 'emma-d-1', sender: 'other', text: "Emma a rendu une très belle rédaction, 17/20. Continuez ainsi !", time: '17:00', date: '2026-04-07' },
      { id: 'emma-d-2', sender: 'parent', text: "Merci Madame, elle a beaucoup travaillé.", time: '17:30', date: '2026-04-07' },
      { id: 'emma-d-3', sender: 'other', text: "Le brevet blanc de français est fixé au 2 mai, révisions à prévoir.", time: '11:00', date: '2026-04-09' },
    ],
  },
  {
    id: 'emma-garcia',
    childId: 'demo-emma',
    name: 'M. Garcia',
    role: 'Professeur de Mathématiques',
    avatarType: 'initials',
    initials: 'MG',
    lastMessage: 'Je vous envoie une fiche par cahier de liaison cette semaine.',
    lastDate: '2026-04-09',
    lastTime: '15:00',
    unread: true,
    messages: [
      { id: 'emma-g-1', sender: 'other', text: "Les résultats du contrôle sont décevants pour Emma — 8/20. Des difficultés sur les équations.", time: '16:00', date: '2026-04-06' },
      { id: 'emma-g-2', sender: 'parent', text: "Merci pour le retour. On va mettre en place du soutien.", time: '17:00', date: '2026-04-06' },
      { id: 'emma-g-3', sender: 'other', text: "N'hésitez pas à me contacter si vous avez des questions.", time: '09:00', date: '2026-04-08' },
      { id: 'emma-g-4', sender: 'parent', text: "Pouvez-vous nous conseiller des exercices de révision ?", time: '09:30', date: '2026-04-08' },
      { id: 'emma-g-5', sender: 'other', text: "Je vous envoie une fiche par cahier de liaison cette semaine.", time: '15:00', date: '2026-04-09' },
    ],
  },
  {
    id: 'emma-martin',
    childId: 'demo-emma',
    name: 'M. Martin',
    role: 'Professeur de SVT',
    avatarType: 'initials',
    initials: 'MT',
    lastMessage: 'Emma a eu 13/20, résultat encourageant !',
    lastDate: '2026-04-10',
    lastTime: '16:30',
    unread: false,
    messages: [
      { id: 'emma-mt-1', sender: 'other', text: "Contrôle SVT vendredi sur le chapitre 3 — écosystèmes.", time: '10:00', date: '2026-04-08' },
      { id: 'emma-mt-2', sender: 'parent', text: "Merci pour l'information.", time: '10:30', date: '2026-04-08' },
      { id: 'emma-mt-3', sender: 'other', text: "Emma a eu 13/20, résultat encourageant !", time: '16:30', date: '2026-04-10' },
    ],
  },
  {
    id: 'emma-direction',
    childId: 'demo-emma',
    name: 'Collège Jean Moulin',
    role: 'Direction',
    avatarType: 'school',
    lastMessage: "Rappel : règlement intérieur disponible sur l'ENT.",
    lastDate: '2026-04-09',
    lastTime: '14:00',
    unread: false,
    messages: [
      { id: 'emma-dir-1', sender: 'other', text: "Dates du brevet 2026 confirmées : 23, 24 et 25 juin.", time: '09:00', date: '2026-04-06' },
      { id: 'emma-dir-2', sender: 'other', text: "Réunion parents-professeurs le 15 mai de 17h à 19h.", time: '10:00', date: '2026-04-07' },
      { id: 'emma-dir-3', sender: 'other', text: "Rappel : règlement intérieur disponible sur l'ENT.", time: '14:00', date: '2026-04-09' },
    ],
  },
  {
    id: 'emma-absences',
    childId: 'demo-emma',
    name: 'Absences Emma',
    role: 'Suivi des absences',
    avatarType: 'absence',
    lastMessage: 'Bien noté, merci.',
    lastDate: '2026-04-09',
    lastTime: '09:00',
    unread: false,
    messages: [
      { id: 'emma-a-1', sender: 'parent', text: "Bonjour, Emma a un rendez-vous orthodontiste ce matin, arrivée vers 10h.", time: '07:30', date: '2026-04-07' },
      { id: 'emma-a-2', sender: 'other', text: "Noté, merci de l'avoir signalé.", time: '08:00', date: '2026-04-07' },
      { id: 'emma-a-3', sender: 'parent', text: "Emma sera absente vendredi après-midi — rendez-vous médical.", time: '08:45', date: '2026-04-09' },
      { id: 'emma-a-4', sender: 'other', text: "Bien noté, merci.", time: '09:00', date: '2026-04-09' },
    ],
  },
];

// ─── Export ──────────────────────────────────────────────

export const CONVERSATIONS_BY_CHILD: Record<string, Conversation[]> = {
  'demo-lea': leaConversations,
  'demo-lucas': lucasConversations,
  'demo-emma': emmaConversations,
};
