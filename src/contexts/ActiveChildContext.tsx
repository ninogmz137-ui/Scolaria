/**
 * ActiveChildContext — SOURCE UNIQUE de l'enfant actif (un enfant = un carnet).
 *
 * - Mode démo : les enfants de démo (famille Moreau) et UNIQUEMENT en mode démo.
 * - Compte réel : uniquement SES enfants, lus en base (la RLS fait le périmètre).
 *   Aucun enfant → `selectedChild = null` : les écrans affichent un état vide, jamais la démo.
 * - Le dernier enfant consulté est persisté (par compte) et restauré à la réouverture.
 * - Tout l'app lit l'enfant actif ici : aucune autre source (pas de liste locale, pas d'id en dur).
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSchoolMode } from './SchoolModeContext';
import { useAuth } from './AuthContext';
import { getChildren, updateChild } from '../services/database';
import { cycleDuNiveau, normaliserNiveau, type Cycle } from '../utils/niveau';
import demoChildren from '../data/demo/demo-children.json';

// ─── Types ─────────────────────────────────────────────

export type Child = {
  id: string;
  /** Prénom (jamais le nom de famille : initiales et contexte Aria partent du prénom). */
  name: string;
  avatar: string;
  /** Libellé affiché : « Niveau — École ». */
  classe: string;
  /** Niveau normalisé (PS … Terminale), null si inconnu. */
  niveau: string | null;
  cycle: Cycle | null;
  ecole?: string;
  birthDate?: string;
  /** Couleur personnelle (#RRGGBB) : avatar + header de l'Accueil uniquement (CLAUDE.md). */
  color?: string;
  /** Fond de l'Accueil choisi pour cet enfant (id d'image intégrée) ; null = sa couleur (M13). */
  fond?: string | null;
};

/** Couleur neutre par défaut (identique au défaut en base, migration M3). */
export const DEFAULT_CHILD_COLOR = '#4338CA';

// ─── Enfants de démo (famille Moreau) — mode démo UNIQUEMENT ───

type DemoChildRow = { id: string; firstName: string; class: string; school: string; color: string; birthDate: string };

export const DEMO_CHILDREN: Child[] = (demoChildren as DemoChildRow[]).map((c) => {
  const niveau = normaliserNiveau(c.class);
  return {
    id: c.id,
    name: c.firstName,
    avatar: '',
    classe: `${c.class} — ${c.school}`,
    niveau,
    cycle: cycleDuNiveau(niveau),
    ecole: c.school,
    birthDate: c.birthDate,
    color: c.color,
  };
});

// ─── Contexte ───────────────────────────────────────────

interface ActiveChildContextValue {
  children: Child[];
  /** Enfant actif ; null si le compte n'a encore aucun enfant. */
  selectedChild: Child | null;
  selectedChildId: string | null;
  selectChild: (id: string) => void;
  /** Recharge la liste (après l'ajout d'un enfant) ; `preferId` devient l'enfant actif. */
  reloadChildren: (preferId?: string) => Promise<void>;
  /** Couleur de l'enfant : en base (compte réel) ou sur l'appareil (démo). */
  setChildColor: (childId: string, color: string) => Promise<void>;
  /** Fond de l'Accueil de l'enfant (null = sa couleur) : en base (compte réel) ou sur l'appareil (démo). */
  setChildFond: (childId: string, fond: string | null) => Promise<void>;
  fadeAnim: Animated.Value;
  loading: boolean;
}

const ActiveChildContext = createContext<ActiveChildContextValue>({
  children: [],
  selectedChild: null,
  selectedChildId: null,
  selectChild: () => {},
  reloadChildren: async () => {},
  setChildColor: async () => {},
  setChildFond: async () => {},
  fadeAnim: new Animated.Value(1),
  loading: false,
});

type ChildRow = {
  id: string;
  first_name: string;
  avatar_emoji?: string;
  birth_date?: string;
  classe?: string;
  school?: string;
  color?: string;
  fond?: string | null;
};

function mapRow(row: ChildRow): Child {
  const niveau = normaliserNiveau(row.classe);
  return {
    id: row.id,
    name: row.first_name,
    avatar: '',
    classe: [niveau ?? row.classe, row.school].filter(Boolean).join(' — '),
    niveau,
    cycle: cycleDuNiveau(niveau),
    ecole: row.school || undefined,
    birthDate: row.birth_date,
    color: row.color || DEFAULT_CHILD_COLOR,
    fond: row.fond ?? null,
  };
}

/** Démo : couleur / fond modifiés, gardés sur l'appareil (équivalent local de children.color / fond). */
const demoKey = (childId: string) => `@scolaria:demo_enfant:${childId}`;
type DemoOverride = { color?: string; fond?: string | null };

async function lireDemoOverrides(list: Child[]): Promise<Child[]> {
  return Promise.all(
    list.map(async (c) => {
      try {
        const raw = await AsyncStorage.getItem(demoKey(c.id));
        return raw ? { ...c, ...(JSON.parse(raw) as DemoOverride) } : c;
      } catch {
        return c;
      }
    }),
  );
}

const storageKey = (userId: string) => `@scolaria:enfant_actif:${userId}`;

export function ActiveChildProvider({ children: reactChildren }: { children: ReactNode }) {
  const { setMode, setModeFromBirthDate } = useSchoolMode();
  const { user, isDemo } = useAuth();
  const userId = user?.id ?? null;

  const [childList, setChildList] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ─── Chargement : démo OU base, jamais les deux ─────────
  const loadChildren = useCallback(async (): Promise<Child[]> => {
    if (!userId) return [];
    if (isDemo) return lireDemoOverrides(DEMO_CHILDREN);
    try {
      const result = await getChildren();
      return ((result?.data ?? []) as ChildRow[]).map(mapRow);
    } catch {
      return [];
    }
  }, [userId, isDemo]);

  const applyList = useCallback(
    async (list: Child[], preferId?: string) => {
      setChildList(list);
      if (list.length === 0) {
        setSelectedChildId(null);
        return;
      }
      // Dernier enfant consulté (par compte), sinon le premier.
      let saved: string | null = null;
      if (userId) {
        try {
          saved = await AsyncStorage.getItem(storageKey(userId));
        } catch {
          saved = null;
        }
      }
      setSelectedChildId((prev) => {
        if (preferId && list.some((c) => c.id === preferId)) return preferId;
        if (prev && list.some((c) => c.id === prev)) return prev;
        if (saved && list.some((c) => c.id === saved)) return saved;
        return list[0].id;
      });
    },
    [userId],
  );

  useEffect(() => {
    let cancelled = false;
    setSelectedChildId(null);
    setChildList([]);
    if (!userId) return;
    setLoading(true);
    loadChildren().then(async (list) => {
      if (cancelled) return;
      await applyList(list);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, isDemo, loadChildren, applyList]);

  const reloadChildren = useCallback(async (preferId?: string) => {
    const list = await loadChildren();
    await applyList(list, preferId);
  }, [loadChildren, applyList]);

  const selectedChild = useMemo(
    () => childList.find((c) => c.id === selectedChildId) ?? null,
    [childList, selectedChildId],
  );

  // ─── Persistance du dernier enfant consulté ─────────────
  useEffect(() => {
    if (userId && selectedChildId) {
      AsyncStorage.setItem(storageKey(userId), selectedChildId).catch(() => {});
    }
  }, [userId, selectedChildId]);

  // ─── Mode scolaire = cycle de l'enfant actif ────────────
  useEffect(() => {
    if (!selectedChild) return;
    if (selectedChild.cycle === 'maternelle') setMode('maternelle');
    else if (selectedChild.cycle === 'primaire') setMode('primaire');
    else if (selectedChild.cycle === 'college' || selectedChild.cycle === 'lycee') setMode('lycee');
    else if (selectedChild.birthDate) setModeFromBirthDate(selectedChild.birthDate);
  }, [selectedChild, setMode, setModeFromBirthDate]);

  // ─── Couleur et fond (avatar + header de l'Accueil) ─────
  const majEnfant = useCallback(
    async (childId: string, patch: DemoOverride) => {
      setChildList((prev) => prev.map((c) => (c.id === childId ? { ...c, ...patch } : c)));
      if (isDemo) {
        try {
          const raw = await AsyncStorage.getItem(demoKey(childId));
          const prev = raw ? (JSON.parse(raw) as DemoOverride) : {};
          await AsyncStorage.setItem(demoKey(childId), JSON.stringify({ ...prev, ...patch }));
        } catch {
          /* réglage local non critique */
        }
        return;
      }
      const { error } = await updateChild(childId, patch);
      if (error) {
        // Échec en base : on recharge la liste pour ne pas afficher une valeur non enregistrée.
        await reloadChildren(childId);
        throw error;
      }
    },
    [isDemo, reloadChildren],
  );

  const setChildColor = useCallback((id: string, color: string) => majEnfant(id, { color }), [majEnfant]);
  const setChildFond = useCallback((id: string, fond: string | null) => majEnfant(id, { fond }), [majEnfant]);

  // ─── Changement d'enfant (fondu) ────────────────────────
  const selectChild = useCallback(
    (id: string) => {
      if (id === selectedChildId || !childList.some((c) => c.id === id)) return;
      // Sélection IMMÉDIATE (tous les écrans suivent sans délai) ; le fondu n'est que visuel.
      setSelectedChildId(id);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    },
    [selectedChildId, childList, fadeAnim],
  );

  return (
    <ActiveChildContext.Provider
      value={{
        children: childList,
        selectedChild,
        selectedChildId: selectedChild?.id ?? null,
        selectChild,
        reloadChildren,
        setChildColor,
        setChildFond,
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
