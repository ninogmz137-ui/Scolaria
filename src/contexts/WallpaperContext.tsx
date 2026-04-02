/**
 * WallpaperContext — Global wallpaper selection for Accueil gradient.
 *
 * Gradient-based wallpapers (no image files needed).
 * Persists selection in AsyncStorage.
 * Used only on AccueilScreen (top 40% gradient).
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Wallpaper definitions ──────────────────────────────

export interface WallpaperDef {
  id: string;
  label: string;
  colors: string[];   // LinearGradient colors
  preview: string[];  // Same as colors (for grid preview)
}

export const WALLPAPERS: WallpaperDef[] = [
  { id: 'mountain',  label: 'Montagne',         colors: ['#1E3A5F', '#3B7DD8', '#89B4E8'], preview: ['#1E3A5F', '#3B7DD8', '#89B4E8'] },
  { id: 'sunset',    label: 'Coucher de soleil', colors: ['#FF6B35', '#F7C59F', '#EFEFD0'], preview: ['#FF6B35', '#F7C59F', '#EFEFD0'] },
  { id: 'ocean',     label: 'Océan',             colors: ['#0077B6', '#00B4D8', '#90E0EF'], preview: ['#0077B6', '#00B4D8', '#90E0EF'] },
  { id: 'forest',    label: 'Forêt',             colors: ['#1B4332', '#2D6A4F', '#52B788'], preview: ['#1B4332', '#2D6A4F', '#52B788'] },
  { id: 'aurora',    label: 'Aurore boréale',    colors: ['#0B0C1A', '#1B264F', '#4CC9F0'], preview: ['#0B0C1A', '#1B264F', '#4CC9F0'] },
  { id: 'lavender',  label: 'Lavande',           colors: ['#4C1D95', '#7C3AED', '#C4B5FD'], preview: ['#4C1D95', '#7C3AED', '#C4B5FD'] },
  { id: 'rose',      label: 'Rose',              colors: ['#9D174D', '#EC4899', '#FBCFE8'], preview: ['#9D174D', '#EC4899', '#FBCFE8'] },
  { id: 'space',     label: 'Espace',            colors: ['#0A0A14', '#1A1A3E', '#4A4E69'], preview: ['#0A0A14', '#1A1A3E', '#4A4E69'] },
];

const STORAGE_KEY = 'selectedWallpaper';
const DEFAULT_ID = 'mountain';

// ─── Context ────────────────────────────────────────────

interface WallpaperContextValue {
  wallpaper: WallpaperDef;
  setWallpaperId: (id: string) => void;
}

const WallpaperContext = createContext<WallpaperContextValue>({
  wallpaper: WALLPAPERS[0],
  setWallpaperId: () => {},
});

// ─── Provider ───────────────────────────────────────────

export function WallpaperProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedId] = useState(DEFAULT_ID);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((id) => {
      if (id && WALLPAPERS.find((w) => w.id === id)) setSelectedId(id);
    });
  }, []);

  const setWallpaperId = (id: string) => {
    setSelectedId(id);
    AsyncStorage.setItem(STORAGE_KEY, id);
  };

  const wallpaper = WALLPAPERS.find((w) => w.id === selectedId) ?? WALLPAPERS[0];

  return (
    <WallpaperContext.Provider value={{ wallpaper, setWallpaperId }}>
      {children}
    </WallpaperContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────

export const useWallpaper = () => useContext(WallpaperContext);
