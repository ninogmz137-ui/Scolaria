/**
 * DemoContext — Provides centralized demo data for all screens.
 *
 * When isDemoMode === true (from AuthContext), screens use this context
 * to get data instead of fetching from Supabase.
 *
 * Data comes from static JSON files in src/data/demo/.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ─── Import demo data ────────────────────────────────────

import demoChildren from '../data/demo/demo-children.json';
import demoSubjects from '../data/demo/demo-subjects.json';
import demoGrades from '../data/demo/demo-grades.json';
import demoAgenda from '../data/demo/demo-agenda.json';
import demoMessages from '../data/demo/demo-messages.json';
import demoMots from '../data/demo/demo-mots.json';
import demoParcours from '../data/demo/demo-parcours.json';
import demoDashboard from '../data/demo/demo-dashboard.json';

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
  emoji: string;
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
  emoji: string;
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

export interface DemoMot {
  id: string;
  childId: string;
  title: string;
  deadline: string | null;
  isSigned: boolean;
}

export interface DemoParcours {
  childId: string;
  currentYear: any;
  archives: any[];
  superPouvoirs: any[];
  scoreDeJoie: any;
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
  getMots: (childId: string) => DemoMot[];
  getParcours: (childId: string) => DemoParcours | null;
  getDashboard: (childId: string) => DemoDashboard | null;
  toggleAgendaDone: (eventId: string) => void;
  signMot: (motId: string) => void;
}

const DemoContext = createContext<DemoContextValue>({
  isDemoMode: false,
  children: [],
  getSubjects: () => [],
  getGrades: () => [],
  getAgenda: () => [],
  getMessages: () => [],
  getMots: () => [],
  getParcours: () => null,
  getDashboard: () => null,
  toggleAgendaDone: () => {},
  signMot: () => {},
});

// ─── Provider ────────────────────────────────────────────

export function DemoProvider({ children: reactChildren }: { children: ReactNode }) {
  const { isDemo } = useAuth();

  // Local state for interactive demo data (agenda done, mots signed)
  const [agendaState, setAgendaState] = useState<Record<string, boolean>>({});
  const [motsState, setMotsState] = useState<Record<string, boolean>>({});

  const getSubjects = useCallback((childId: string): DemoSubject[] => {
    return (demoSubjects as DemoSubject[]).filter((s) => s.childId === childId);
  }, []);

  const getGrades = useCallback((childId: string, trimester?: number): DemoGrade[] => {
    let grades = (demoGrades as DemoGrade[]).filter((g) => g.childId === childId);
    if (trimester !== undefined) {
      grades = grades.filter((g) => g.trimester === trimester);
    }
    return grades;
  }, []);

  const getAgenda = useCallback((childId: string, date?: string): DemoAgendaEvent[] => {
    let events = (demoAgenda as DemoAgendaEvent[]).filter((e) => e.childId === childId);
    if (date) {
      events = events.filter((e) => e.date === date);
    }
    // Apply local toggle state
    return events.map((e) => ({
      ...e,
      is_completed: agendaState[e.id] !== undefined ? agendaState[e.id] : e.is_completed,
    }));
  }, [agendaState]);

  const getMessages = useCallback((childId: string): DemoMessage[] => {
    return (demoMessages as DemoMessage[])
      .filter((m) => m.childId === childId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);

  const getMots = useCallback((childId: string): DemoMot[] => {
    return (demoMots as DemoMot[]).map((m) => ({
      ...m,
      isSigned: motsState[m.id] !== undefined ? motsState[m.id] : m.isSigned,
    })).filter((m) => m.childId === childId);
  }, [motsState]);

  const getParcours = useCallback((childId: string): DemoParcours | null => {
    return (demoParcours as DemoParcours[]).find((p) => p.childId === childId) || null;
  }, []);

  const getDashboard = useCallback((childId: string): DemoDashboard | null => {
    return (demoDashboard as DemoDashboard[]).find((d) => d.childId === childId) || null;
  }, []);

  const toggleAgendaDone = useCallback((eventId: string) => {
    setAgendaState((prev) => ({
      ...prev,
      [eventId]: prev[eventId] !== undefined ? !prev[eventId] : true,
    }));
  }, []);

  const signMot = useCallback((motId: string) => {
    setMotsState((prev) => ({ ...prev, [motId]: true }));
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
        getMots,
        getParcours,
        getDashboard,
        toggleAgendaDone,
        signMot,
      }}
    >
      {reactChildren}
    </DemoContext.Provider>
  );
}

export function useDemoData() {
  return useContext(DemoContext);
}
