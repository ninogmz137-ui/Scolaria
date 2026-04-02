/**
 * WallpaperContext — Global wallpaper selection for Accueil background.
 *
 * Supports curated Unsplash images with gradient fallback.
 * Supports custom image from device gallery.
 * Persists selection in AsyncStorage.
 * Used primarily on AccueilScreen (top 40% area).
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Wallpaper definitions ──────────────────────────────

export interface WallpaperDef {
  id: string;
  label: string;
  category: 'nature' | 'abstract' | 'custom';
  // Gradient fallback if image fails or no image
  colors: string[];
  // Remote image URL
  imageUrl?: string;
  // User's custom local URI
  localUri?: string;
}

export const WALLPAPERS: WallpaperDef[] = [
  // Nature category
  {
    id: 'mountains',
    label: 'Montagnes',
    category: 'nature',
    colors: ['#1E3A5F', '#3B7DD8', '#89B4E8'],
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  },
  {
    id: 'lake',
    label: 'Lac alpin',
    category: 'nature',
    colors: ['#0B3D2E', '#1A6B4A', '#7BC8A4'],
    imageUrl: 'https://images.unsplash.com/photo-1439853949127-fa647821eba0?w=800&q=80',
  },
  {
    id: 'forest',
    label: 'Forêt',
    category: 'nature',
    colors: ['#1B4332', '#2D6A4F', '#52B788'],
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
  },
  {
    id: 'ocean',
    label: 'Océan',
    category: 'nature',
    colors: ['#0077B6', '#00B4D8', '#90E0EF'],
    imageUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80',
  },
  {
    id: 'sunset',
    label: 'Coucher de soleil',
    category: 'nature',
    colors: ['#FF6B35', '#F7C59F', '#EFEFD0'],
    imageUrl: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=800&q=80',
  },
  // Abstract category
  {
    id: 'aurora',
    label: 'Aurore',
    category: 'abstract',
    colors: ['#0B0C1A', '#1B264F', '#4CC9F0'],
    imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80',
  },
  {
    id: 'gradient-warm',
    label: 'Chaleur',
    category: 'abstract',
    colors: ['#FF6B6B', '#FCA311', '#FFD93D'],
    imageUrl: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&q=80',
  },
  {
    id: 'gradient-cool',
    label: 'Sérénité',
    category: 'abstract',
    colors: ['#667EEA', '#764BA2', '#F093FB'],
    imageUrl: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=800&q=80',
  },
  {
    id: 'nebula',
    label: 'Nébuleuse',
    category: 'abstract',
    colors: ['#0A0A14', '#1A1A3E', '#6D28D9'],
    imageUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80',
  },
  {
    id: 'pastel',
    label: 'Pastel',
    category: 'abstract',
    colors: ['#FFE5EC', '#E8D5FF', '#D5EEFF'],
    imageUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80',
  },
];

const STORAGE_KEY = 'selectedWallpaper';
const STORAGE_KEY_CUSTOM = 'customWallpaperUri';
const DEFAULT_ID = 'mountains';

// ─── Wallpaper source — resolved type for rendering ────

export type WallpaperSource =
  | { type: 'image'; uri: string }
  | { type: 'gradient'; colors: string[] };

// ─── Context ────────────────────────────────────────────

interface WallpaperContextValue {
  wallpaper: WallpaperDef;
  setWallpaperId: (id: string) => void;
  setCustomWallpaper: (uri: string) => void;
  customUri: string | null;
  // Computed — ready to use in AccueilScreen or anywhere
  wallpaperSource: WallpaperSource;
}

const WallpaperContext = createContext<WallpaperContextValue>({
  wallpaper: WALLPAPERS[0],
  setWallpaperId: () => {},
  setCustomWallpaper: () => {},
  customUri: null,
  wallpaperSource: { type: 'gradient', colors: WALLPAPERS[0].colors },
});

// ─── Provider ───────────────────────────────────────────

export function WallpaperProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedId] = useState(DEFAULT_ID);
  const [customUri, setCustomUri] = useState<string | null>(null);

  // Rehydrate persisted state on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(STORAGE_KEY_CUSTOM),
    ]).then(([id, uri]) => {
      if (id && WALLPAPERS.find((w) => w.id === id)) {
        setSelectedId(id);
      }
      if (uri) {
        setCustomUri(uri);
      }
    });
  }, []);

  const setWallpaperId = (id: string) => {
    setSelectedId(id);
    // Selecting a preset clears the custom override
    setCustomUri(null);
    AsyncStorage.setItem(STORAGE_KEY, id);
    AsyncStorage.removeItem(STORAGE_KEY_CUSTOM);
  };

  const setCustomWallpaper = (uri: string) => {
    setCustomUri(uri);
    AsyncStorage.setItem(STORAGE_KEY_CUSTOM, uri);
  };

  const wallpaper = WALLPAPERS.find((w) => w.id === selectedId) ?? WALLPAPERS[0];

  const wallpaperSource: WallpaperSource = useMemo(() => {
    if (customUri) {
      return { type: 'image', uri: customUri };
    }
    if (wallpaper.imageUrl) {
      return { type: 'image', uri: wallpaper.imageUrl };
    }
    return { type: 'gradient', colors: wallpaper.colors };
  }, [customUri, wallpaper]);

  return (
    <WallpaperContext.Provider
      value={{ wallpaper, setWallpaperId, setCustomWallpaper, customUri, wallpaperSource }}
    >
      {children}
    </WallpaperContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────

export const useWallpaper = () => useContext(WallpaperContext);
