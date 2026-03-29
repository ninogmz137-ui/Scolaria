/**
 * ActiveChildContext — Global state for the currently selected child.
 *
 * Loads children from Supabase when a user is authenticated.
 * Falls back to MOCK_CHILDREN in demo mode or when Supabase returns nothing.
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
import { useAuth } from './AuthContext';
import { getChildren } from '../services/database';

// ─── Types ─────────────────────────────────────────────

export type Child = {
  id: string;
  name: string;
  avatar: string;
  classe: string;
  birthDate?: string;
  avatar_url?: string;
};

// ─── Fallback data (demo mode / empty Supabase result) ───

export const MOCK_CHILDREN: Child[] = [
  { id: '1', name: 'Léa', avatar: '👧', classe: 'Grande section — Maternelle Pasteur', birthDate: '2021-05-14' },
  { id: '2', name: 'Lucas', avatar: '👦', classe: 'CM2 — École Voltaire', birthDate: '2016-03-22' },
  { id: '3', name: 'Emma', avatar: '👩', classe: '3ème — Collège Hugo', birthDate: '2012-09-10' },
];

// Backwards-compatible alias — any file importing CHILDREN keeps working
export const CHILDREN = MOCK_CHILDREN;

// ─── Context ────────────────────────────────────────────

interface ActiveChildContextValue {
  children: Child[];
  selectedChild: Child;
  selectedChildId: string;
  selectChild: (id: string) => void;
  fadeAnim: Animated.Value;
  loading: boolean;
}

const ActiveChildContext = createContext<ActiveChildContextValue>({
  children: MOCK_CHILDREN,
  selectedChild: MOCK_CHILDREN[0],
  selectedChildId: MOCK_CHILDREN[0].id,
  selectChild: () => {},
  fadeAnim: new Animated.Value(1),
  loading: false,
});

export function ActiveChildProvider({ children: reactChildren }: { children: ReactNode }) {
  const { setModeFromBirthDate } = useSchoolMode();
  const { user } = useAuth();

  const [childList, setChildList] = useState<Child[]>(MOCK_CHILDREN);
  const [selectedChildId, setSelectedChildId] = useState(MOCK_CHILDREN[0].id);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ─── Load children from Supabase ───────────────────────
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await getChildren(user!.id);
        if (cancelled) return;

        const rows = result?.data;
        if (rows && rows.length > 0) {
          const mapped: Child[] = rows.map((row: {
            id: string;
            first_name: string;
            last_name?: string;
            avatar_emoji?: string;
            birth_date?: string;
            classe?: string;
            school?: string;
          }) => ({
            id: row.id,
            name: row.first_name,
            avatar: row.avatar_emoji || '👦',
            classe: [row.classe, row.school].filter(Boolean).join(' — '),
            birthDate: row.birth_date,
          }));
          setChildList(mapped);
        }
        // Empty or null result → keep MOCK_CHILDREN (already the default state)
      } catch {
        // Network / Supabase error → keep MOCK_CHILDREN silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  // ─── Keep selection valid when childList changes ────────
  useEffect(() => {
    const stillValid = childList.some((c) => c.id === selectedChildId);
    if (!stillValid && childList.length > 0) {
      setSelectedChildId(childList[0].id);
    }
  }, [childList, selectedChildId]);

  const selectedChild =
    childList.find((c) => c.id === selectedChildId) || childList[0];

  // ─── Sync school mode with selected child's birth date ──
  useEffect(() => {
    if (selectedChild?.birthDate) {
      setModeFromBirthDate(selectedChild.birthDate);
    }
  }, [selectedChildId, selectedChild?.birthDate, setModeFromBirthDate]);

  // ─── Animated child switch ───────────────────────────────
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
        children: childList,
        selectedChild,
        selectedChildId,
        selectChild,
        fadeAnim,
        loading,
      }}
    >
      {reactChildren}
    </ActiveChildContext.Provider>
  );
}

export function useActiveChild() {
  return useContext(ActiveChildContext);
}
