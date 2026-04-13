/**
 * WallpaperContext — Global wallpaper selection for Accueil background.
 *
 * Preset images are bundled with `require()` so thumbnails render reliably on Android.
 * Custom photos from the gallery use a file URI.
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageSourcePropType } from 'react-native';

// ─── Wallpaper definitions ──────────────────────────────

export interface WallpaperDef {
  id: string;
  label: string;
  category: 'nature' | 'abstract' | 'custom';
  /** Thumbnail + full-screen: bundled JPEG */
  type: 'image' | 'gradient';
  colors: string[];
  /** Bundled asset — required for native Image */
  source: ImageSourcePropType;
}

export const WALLPAPERS: WallpaperDef[] = [
  {
    id: 'mountains',
    label: 'Montagnes',
    category: 'nature',
    type: 'image',
    colors: ['#1E3A5F', '#3B7DD8', '#89B4E8'],
    source: require('../../assets/wallpapers/mountains.jpg'),
  },
  {
    id: 'lake',
    label: 'Lac alpin',
    category: 'nature',
    type: 'image',
    colors: ['#0B3D2E', '#1A6B4A', '#7BC8A4'],
    source: require('../../assets/wallpapers/lake.jpg'),
  },
  {
    id: 'forest',
    label: 'Forêt',
    category: 'nature',
    type: 'image',
    colors: ['#1B4332', '#2D6A4F', '#52B788'],
    source: require('../../assets/wallpapers/forest.jpg'),
  },
  {
    id: 'ocean',
    label: 'Océan',
    category: 'nature',
    type: 'image',
    colors: ['#0077B6', '#00B4D8', '#90E0EF'],
    source: require('../../assets/wallpapers/ocean.jpg'),
  },
  {
    id: 'sunset',
    label: 'Coucher de soleil',
    category: 'nature',
    type: 'image',
    colors: ['#FF6B35', '#F7C59F', '#EFEFD0'],
    source: require('../../assets/wallpapers/sunset.jpg'),
  },
  {
    id: 'aurora',
    label: 'Aurore',
    category: 'abstract',
    type: 'image',
    colors: ['#0B0C1A', '#1B264F', '#4CC9F0'],
    source: require('../../assets/wallpapers/aurora.jpg'),
  },
  {
    id: 'gradient-warm',
    label: 'Chaleur',
    category: 'abstract',
    type: 'gradient',
    colors: ['#FF6B6B', '#FCA311', '#FFD93D'],
    source: require('../../assets/wallpapers/gradient-warm.jpg'),
  },
  {
    id: 'gradient-cool',
    label: 'Sérénité',
    category: 'abstract',
    type: 'gradient',
    colors: ['#667EEA', '#764BA2', '#F093FB'],
    source: require('../../assets/wallpapers/gradient-cool.jpg'),
  },
  {
    id: 'nebula',
    label: 'Nébuleuse',
    category: 'abstract',
    type: 'image',
    colors: ['#0A0A14', '#1A1A3E', '#6D28D9'],
    source: require('../../assets/wallpapers/nebula.jpg'),
  },
  {
    id: 'pastel',
    label: 'Pastel',
    category: 'abstract',
    type: 'gradient',
    colors: ['#FFE5EC', '#E8D5FF', '#D5EEFF'],
    source: require('../../assets/wallpapers/pastel.jpg'),
  },
];

const STORAGE_KEY = 'selectedWallpaper';
const STORAGE_KEY_CUSTOM = 'customWallpaperUri';
const DEFAULT_ID = 'mountains';

// ─── Wallpaper source — resolved for rendering ────

export type WallpaperSource = { type: 'image'; source: ImageSourcePropType };

// ─── Context ────────────────────────────────────────────

interface WallpaperContextValue {
  wallpaper: WallpaperDef;
  wallpapers: typeof WALLPAPERS;
  setWallpaperId: (id: string) => void;
  setCustomWallpaper: (uri: string) => void;
  customUri: string | null;
  wallpaperSource: WallpaperSource;
}

const WallpaperContext = createContext<WallpaperContextValue>({
  wallpaper: WALLPAPERS[0],
  wallpapers: WALLPAPERS,
  setWallpaperId: () => {},
  setCustomWallpaper: () => {},
  customUri: null,
  wallpaperSource: { type: 'image', source: WALLPAPERS[0].source },
} as WallpaperContextValue);

// ─── Provider ─────────────────────────────────────────

export function WallpaperProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedId] = useState(DEFAULT_ID);
  const [customUri, setCustomUri] = useState<string | null>(null);

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
      return { type: 'image', source: { uri: customUri } };
    }
    return { type: 'image', source: wallpaper.source };
  }, [customUri, wallpaper]);

  return (
    <WallpaperContext.Provider
      value={{ wallpaper, wallpapers: WALLPAPERS, setWallpaperId, setCustomWallpaper, customUri, wallpaperSource }}
    >
      {children}
    </WallpaperContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────

export const useWallpaper = () => useContext(WallpaperContext);
