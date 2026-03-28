/**
 * ActiveChildContext — Global state for the currently selected child.
 *
 * Lifts child selection from AccueilScreen so every screen can access
 * the active child and switch between children.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { Animated } from 'react-native';
import { useSchoolMode } from './SchoolModeContext';

// ─── Types ─────────────────────────────────────────────

export type Child = {
  id: string;
  name: string;
  avatar: string;
  classe: string;
  birthDate?: string;
};

// ─── Mock data (will be replaced by API/Supabase later) ───

export const CHILDREN: Child[] = [
  { id: '1', name: 'Léa', avatar: '👧', classe: 'Grande section — Maternelle Pasteur', birthDate: '2021-05-14' },
  { id: '2', name: 'Lucas', avatar: '👦', classe: 'CM2 — École Voltaire', birthDate: '2016-03-22' },
  { id: '3', name: 'Emma', avatar: '👩', classe: '3ème — Collège Hugo', birthDate: '2012-09-10' },
];

// ─── Context ────────────────────────────────────────────

interface ActiveChildContextValue {
  children: Child[];
  selectedChild: Child;
  selectedChildId: string;
  selectChild: (id: string) => void;
  fadeAnim: Animated.Value;
}

const ActiveChildContext = createContext<ActiveChildContextValue>({
  children: CHILDREN,
  selectedChild: CHILDREN[0],
  selectedChildId: CHILDREN[0].id,
  selectChild: () => {},
  fadeAnim: new Animated.Value(1),
});

export function ActiveChildProvider({ children: reactChildren }: { children: ReactNode }) {
  const { setModeFromBirthDate } = useSchoolMode();
  const [selectedChildId, setSelectedChildId] = useState(CHILDREN[0].id);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const selectedChild = CHILDREN.find((c) => c.id === selectedChildId) || CHILDREN[0];

  // Sync theme when child changes
  useEffect(() => {
    if (selectedChild.birthDate) {
      setModeFromBirthDate(selectedChild.birthDate);
    }
  }, [selectedChildId, selectedChild.birthDate, setModeFromBirthDate]);

  const selectChild = useCallback(
    (id: string) => {
      if (id === selectedChildId) return;
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setSelectedChildId(id);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    },
    [selectedChildId, fadeAnim],
  );

  return (
    <ActiveChildContext.Provider
      value={{
        children: CHILDREN,
        selectedChild,
        selectedChildId,
        selectChild,
        fadeAnim,
      }}
    >
      {reactChildren}
    </ActiveChildContext.Provider>
  );
}

export function useActiveChild() {
  return useContext(ActiveChildContext);
}
