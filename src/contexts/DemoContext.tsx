/**
 * DemoContext — Provides centralized demo data for all screens.
 *
 * When isDemoMode === true (from AuthContext), screens use this context
 * to get data instead of fetching from Supabase.
 *
 * Data comes from static JSON files in src/data/demo/.
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ─── Import demo data ────────────────────────────────────

import demoChildren from '../data/demo/demo-children.json';
import demoSubjects from '../data/demo/demo-subjects.json';
import demoGrades from '../data/demo/demo-grades.json';
import demoAgenda from '../data/demo/demo-agenda.json';
import demoMessages from '../data/demo/demo-messages.json';
import demoParcours from '../data/demo/demo-parcours.json';
import demoDashboard from '../data/demo/demo-dashboard.json';
import demoTeachers from '../data/demo/demo-teachers.json';
import demoArchivedGrades from '../data/demo/demo-archived-grades.json';

// ─── Types ───────────────────────────────────────────────

export interface DemoChild {
  id: string;
  firstName: string;
  lastName: string;
  class: string;
  school: string;
  level: string;
  avatarEmoji: string;
  birthDate: string;
}

export interface DemoSubject {
  id: string;
  childId: string;
  name: string;
  color: string;
  average?: number;
  classAverage?: number;
  trend?: string;
  acquis?: number;
  total?: number;
}

export interface DemoGrade {
  id: string;
  childId: string;
  subjectId: string;
  value: number;
  outOf: number;
  date: string;
  title: string;
  coefficient: number;
  comment: string;
  trimester: number;
}

export interface DemoAgendaEvent {
  id: string;
  childId: string;
  title: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
  room: string;
  description: string;
  is_completed: boolean;
  color: string;
}

export interface DemoMessage {
  id: string;
  childId: string;
  sender: string;
  senderRole: string;
  senderClass: string;
  date: string;
  preview: string;
  content: string;
  isRead: boolean;
  type: string;
}

export interface DemoParcours {
  childId: string;
  currentYear: any;
  archives: any[];
  superPouvoirs: any[];
  scoreDeJoie: any;
}

export interface DemoTeacher {
  id: string;
  name: string;
  role: string;
  class: string;
}

export interface DemoArchivedBulletin {
  childId: string;
  year: string;
  class: string;
  trimester: number;
  average: number;
  subjects: { name: string; average: number; classAverage: number }[];
  appreciation: string;
}

export interface DemoDashboard {
  childId: string;
  motsRecus: number;
  motsToutSigne: boolean;
  devoirs: number;
  moyenne?: number;
  meilleure?: { note: number; matiere: string };
  totalNotes?: number;
  competencesAcquis?: number;
  competencesEnCours?: number;
  competencesTotal?: number;
  courseDuJour: any[];
  eventsSemaine: number;
  prochainEvent: string;
}

// ─── Context ────────────────────────────────────────────

interface DemoContextValue {
  isDemoMode: boolean;
  children: DemoChild[];
  getSubjects: (childId: string) => DemoSubject[];
  getGrades: (childId: string, trimester?: number) => DemoGrade[];
  getAgenda: (childId: string, date?: string) => DemoAgendaEvent[];
  getMessages: (childId: string) => DemoMessage[];
  getParcours: (childId: string) => DemoParcours | null;
  getDashboard: (childId: string) => DemoDashboard | null;
  getTeachers: (childId: string) => DemoTeacher[];
  getArchivedGrades: (childId: string, year: string) => DemoArchivedBulletin[];
  toggleAgendaDone: (eventId: string) => void;
}

const DemoContext = createContext<DemoContextValue>({
  isDemoMode: false,
  children: [],
  getSubjects: () => [],
  getGrades: () => [],
  getAgenda: () => [],
  getMessages: () => [],
  getParcours: () => null,
  getDashboard: () => null,
  getTeachers: () => [],
  getArchivedGrades: () => [],
  toggleAgendaDone: () => {},
});

// ─── Agenda de démo recalé sur aujourd'hui ───────────────

/** Lundi de la semaine type des données de démo (demo-agenda.json). */
const LUNDI_DEMO = new Date(2026, 2, 30);

function lundiDe(d: Date): Date {
  const l = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  l.setDate(l.getDate() - ((l.getDay() + 6) % 7));
  return l;
}

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Les dates de démo sont relatives à aujourd'hui : la semaine type devient la semaine en cours
 * (même jour de la semaine), et ses cours se répètent la semaine suivante (emploi du temps fixe).
 * La semaine courante n'est donc jamais vide, pour chaque enfant.
 */
function agendaRecale(aujourdHui: Date): DemoAgendaEvent[] {
  const decalage = Math.round((lundiDe(aujourdHui).getTime() - LUNDI_DEMO.getTime()) / 86400000);
  const deplacer = (date: string, jours: number) => {
    const [a, m, j] = date.split('-').map(Number);
    return isoLocal(new Date(a, m - 1, j + jours));
  };
  // Sorties, réunions et événements (souvent liés à un mot à signer, B4a) : jamais dans le passé, sinon
  // un mot « à traiter » renverrait à un événement déjà passé → reportés à la semaine suivante.
  const aujourdHuiIso = isoLocal(aujourdHui);
  const semaine = (demoAgenda as DemoAgendaEvent[]).map((e) => {
    const date = deplacer(e.date, decalage);
    const aVenir = ['sortie', 'reunion', 'evenement', 'activite'].includes(e.type) && date < aujourdHuiIso;
    return { ...e, date: aVenir ? deplacer(date, 7) : date };
  });
  const suivante = semaine
    .filter((e) => e.type === 'cours')
    .map((e) => ({ ...e, id: `${e.id}-s2`, date: deplacer(e.date, 7) }));
  return [...semaine, ...suivante];
}

/** Un événement de l'Agenda de démo (recalé sur aujourd'hui) par son id : mots liés à un événement (B4a). */
export function evenementDemoParId(id: string): DemoAgendaEvent | undefined {
  return agendaRecale(new Date()).find((e) => e.id === id);
}

// ─── Messages et mots de démo recalés sur aujourd'hui ─────

/**
 * demo-messages.json, demo-mots.json et demo-grades.json sont écrits comme si aujourd'hui était le
 * 25 sept. 2026 (2-3 dernières semaines, échéances à venir). Chaque date est décalée du même nombre
 * de jours que l'écart entre aujourd'hui et cette référence (comme messagerieData.ts, en « il y a n jours »).
 */
const REFERENCE_MESSAGES_DEMO = new Date(2026, 8, 25);

function decalageMessages(aujourdHui: Date): number {
  const jour = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), aujourdHui.getDate());
  return Math.round((jour.getTime() - REFERENCE_MESSAGES_DEMO.getTime()) / 86400000);
}

/** « YYYY-MM-DD » ou « YYYY-MM-DDTHH:MM:SS » décalé de `jours` jours (heure locale conservée). */
function decalerDate(date: string, jours: number): string {
  const [jourIso, heure] = date.split('T');
  const [a, m, j] = jourIso.split('-').map(Number);
  const d = new Date(a, m - 1, j + jours);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return heure ? `${iso}T${heure}` : iso;
}

// ─── Provider ────────────────────────────────────────────

export function DemoProvider({ children: reactChildren }: { children: ReactNode }) {
  const { isDemo } = useAuth();

  // Local state for interactive demo data (agenda done, mots signed)
  const [agendaState, setAgendaState] = useState<Record<string, boolean>>({});

  const getSubjects = useCallback((childId: string): DemoSubject[] => {
    return (demoSubjects as DemoSubject[]).filter((s) => s.childId === childId);
  }, []);

  const getGrades = useCallback((childId: string, trimester?: number): DemoGrade[] => {
    // Notes datées comme les messages (référence du 25 sept. 2026) : mêmes jours dans l'Accueil,
    // le Suivi et les Messages.
    const decal = decalageMessages(new Date());
    let grades = (demoGrades as DemoGrade[])
      .filter((g) => g.childId === childId)
      .map((g) => ({ ...g, date: decalerDate(g.date, decal) }));
    if (trimester !== undefined) {
      grades = grades.filter((g) => g.trimester === trimester);
    }
    return grades;
  }, []);

  const agenda = useMemo(() => agendaRecale(new Date()), []);

  const getAgenda = useCallback((childId: string, date?: string): DemoAgendaEvent[] => {
    let events = agenda.filter((e) => e.childId === childId);
    if (date) {
      events = events.filter((e) => e.date === date);
    }
    // Apply local toggle state
    return events.map((e) => ({
      ...e,
      is_completed: agendaState[e.id] !== undefined ? agendaState[e.id] : e.is_completed,
    }));
  }, [agenda, agendaState]);

  const decalage = useMemo(() => decalageMessages(new Date()), []);

  const getMessages = useCallback((childId: string): DemoMessage[] => {
    return (demoMessages as DemoMessage[])
      .filter((m) => m.childId === childId)
      .map((m) => ({ ...m, date: decalerDate(m.date, decalage) }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [decalage]);

  const getParcours = useCallback((childId: string): DemoParcours | null => {
    return (demoParcours as DemoParcours[]).find((p) => p.childId === childId) || null;
  }, []);

  const getDashboard = useCallback((childId: string): DemoDashboard | null => {
    return (demoDashboard as DemoDashboard[]).find((d) => d.childId === childId) || null;
  }, []);

  const getTeachers = useCallback((childId: string): DemoTeacher[] => {
    const entry = (demoTeachers as any[]).find((t) => t.childId === childId);
    return entry?.teachers ?? [];
  }, []);

  const getArchivedGrades = useCallback((childId: string, year: string): DemoArchivedBulletin[] => {
    return (demoArchivedGrades as DemoArchivedBulletin[]).filter((b) => b.childId === childId && b.year === year);
  }, []);

  const toggleAgendaDone = useCallback((eventId: string) => {
    setAgendaState((prev) => ({
      ...prev,
      [eventId]: prev[eventId] !== undefined ? !prev[eventId] : true,
    }));
  }, []);

  return (
    <DemoContext.Provider
      value={{
        isDemoMode: isDemo,
        children: demoChildren as DemoChild[],
        getSubjects,
        getGrades,
        getAgenda,
        getMessages,
        getParcours,
        getDashboard,
        getTeachers,
        getArchivedGrades,
        toggleAgendaDone,
      }}
    >
      {reactChildren}
    </DemoContext.Provider>
  );
}

export function useDemoData() {
  return useContext(DemoContext);
}
