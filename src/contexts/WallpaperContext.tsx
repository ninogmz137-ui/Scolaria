/**
 * WallpaperContext — Per-child wallpaper selection and persistence.
 *
 * Reads the child's school mode to determine wallpaper category.
 * Persists selections in AsyncStorage (keyed by childId).
 * Supports custom photos via expo-image-picker.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useActiveChild } from './ActiveChildContext';
import { useSchoolMode, type SchoolMode } from './SchoolModeContext';
import {
  getWallpaperById,
  DEFAULT_WALLPAPER_IDS,
  type Wallpaper,
  type WallpaperCategory,
} from '../constants/wallpapers';

// ─── Types ─────────────────────────────────────────────

interface WallpaperSelection {
  /** Wallpaper catalog ID or 'custom' for a personal photo */
  wallpaperId: string;
  /** Custom photo URI (only when wallpaperId === 'custom') */
  customPhotoUri?: string;
}

interface WallpaperContextValue {
  /** Current wallpaper definition (null if custom photo) */
  currentWallpaper: Wallpaper | null;
  /** Custom photo URI if using personal photo */
  customPhotoUri: string | null;
  /** Whether a custom photo is active */
  isCustomPhoto: boolean;
  /** Wallpaper category based on school mode */
  category: WallpaperCategory;
  /** Select a catalog wallpaper */
  setWallpaper: (wallpaperId: string) => void;
  /** Select a custom photo */
  setCustomPhoto: (uri: string) => void;
}

const STORAGE_PREFIX = '@scolaria_wallpaper_';

function modeToCategory(mode: SchoolMode): WallpaperCategory {
  if (mode === 'lycee') return 'college';
  return mode;
}

const WallpaperContext = createContext<WallpaperContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────

export function WallpaperProvider({ children }: { children: ReactNode }) {
  const { selectedChildId } = useActiveChild();
  const { mode } = useSchoolMode();
  const category = modeToCategory(mode);

  const [selection, setSelection] = useState<WallpaperSelection>({
    wallpaperId: DEFAULT_WALLPAPER_IDS[category],
  });

  // Load persisted wallpaper when child changes
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_PREFIX + selectedChildId)
      .then((json) => {
        if (json) {
          const saved: WallpaperSelection = JSON.parse(json);
          setSelection(saved);
        } else {
          // Use default for this category
          setSelection({ wallpaperId: DEFAULT_WALLPAPER_IDS[category] });
        }
      })
      .catch(() => {
        setSelection({ wallpaperId: DEFAULT_WALLPAPER_IDS[category] });
      });
  }, [selectedChildId, category]);

  const persist = useCallback(
    (sel: WallpaperSelection) => {
      setSelection(sel);
      AsyncStorage.setItem(
        STORAGE_PREFIX + selectedChildId,
        JSON.stringify(sel),
      ).catch(() => {});
    },
    [selectedChildId],
  );

  const setWallpaper = useCallback(
    (wallpaperId: string) => {
      persist({ wallpaperId });
    },
    [persist],
  );

  const setCustomPhoto = useCallback(
    (uri: string) => {
      persist({ wallpaperId: 'custom', customPhotoUri: uri });
    },
    [persist],
  );

  const isCustomPhoto = selection.wallpaperId === 'custom';
  const currentWallpaper = isCustomPhoto
    ? null
    : getWallpaperById(selection.wallpaperId) ?? null;

  return (
    <WallpaperContext.Provider
      value={{
        currentWallpaper,
        customPhotoUri: isCustomPhoto ? (selection.customPhotoUri ?? null) : null,
        isCustomPhoto,
        category,
        setWallpaper,
        setCustomPhoto,
      }}
    >
      {children}
    </WallpaperContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────

export function useWallpaper() {
  const ctx = useContext(WallpaperContext);
  if (!ctx) {
    throw new Error('useWallpaper must be used within a WallpaperProvider');
  }
  return ctx;
}
