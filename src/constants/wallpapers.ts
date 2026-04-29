/**
 * Wallpaper catalog — Bundled background options per school cycle.
 *
 * Each wallpaper is either:
 * - A gradient definition (rendered as LinearGradient component)
 * - A bundled image (require'd from assets/wallpapers/)
 *
 * Custom photos are handled separately via WallpaperContext.
 */

export type WallpaperCategory = 'maternelle' | 'primaire' | 'college';

export interface GradientWallpaper {
  id: string;
  type: 'gradient';
  label: string;
  category: WallpaperCategory;
  colors: string[];
  /** Gradient direction: [startX, startY, endX, endY] */
  direction?: [number, number, number, number];
}

export type Wallpaper = GradientWallpaper;

// ─── Maternelle: playful, warm, bright ──────────────────

export const WALLPAPERS_MATERNELLE: Wallpaper[] = [
  {
    id: 'mat-sunrise',
    type: 'gradient',
    label: 'Lever de soleil',
    category: 'maternelle',
    colors: ['#FFECD2', '#FCB69F', '#FF9A9E'],
  },
  {
    id: 'mat-candy',
    type: 'gradient',
    label: 'Bonbons',
    category: 'maternelle',
    colors: ['#F8BBD0', '#E1BEE7', '#B3E5FC'],
  },
  {
    id: 'mat-meadow',
    type: 'gradient',
    label: 'Prairie',
    category: 'maternelle',
    colors: ['#C8E6C9', '#FFF9C4', '#BBDEFB'],
  },
  {
    id: 'mat-clouds',
    type: 'gradient',
    label: 'Nuages',
    category: 'maternelle',
    colors: ['#E3F2FD', '#F3E5F5', '#FFF3E0'],
  },
];

// ─── Primaire: nature, soft, exploratory ────────────────

export const WALLPAPERS_PRIMAIRE: Wallpaper[] = [
  {
    id: 'pri-ocean',
    type: 'gradient',
    label: 'Océan',
    category: 'primaire',
    colors: ['#0F2027', '#203A43', '#2C5364'],
  },
  {
    id: 'pri-forest',
    type: 'gradient',
    label: 'Forêt',
    category: 'primaire',
    colors: ['#134E5E', '#71B280', '#A8D8B9'],
  },
  {
    id: 'pri-sky',
    type: 'gradient',
    label: 'Ciel',
    category: 'primaire',
    colors: ['#89CFF0', '#A0D2DB', '#D4F1F4'],
  },
  {
    id: 'pri-aurora',
    type: 'gradient',
    label: 'Aurore',
    category: 'primaire',
    colors: ['#1A2980', '#26D0CE', '#A8EDEA'],
  },
];

// ─── Collège/Lycée: cinematic, abstract, dark ───────────

export const WALLPAPERS_COLLEGE: Wallpaper[] = [
  {
    id: 'col-cosmos',
    type: 'gradient',
    label: 'Cosmos',
    category: 'college',
    colors: ['#0F0C29', '#302B63', '#24243E'],
  },
  {
    id: 'col-midnight',
    type: 'gradient',
    label: 'Minuit',
    category: 'college',
    colors: ['#141E30', '#243B55', '#1A2340'],
  },
  {
    id: 'col-nebula',
    type: 'gradient',
    label: 'Nébuleuse',
    category: 'college',
    colors: ['#1A1A2E', '#16213E', '#0F3460', '#533483'],
  },
  {
    id: 'col-carbon',
    type: 'gradient',
    label: 'Carbone',
    category: 'college',
    colors: ['#232526', '#414345', '#2C3E50'],
  },
];

/** All wallpapers by category */
export const WALLPAPERS_BY_CATEGORY: Record<WallpaperCategory, Wallpaper[]> = {
  maternelle: WALLPAPERS_MATERNELLE,
  primaire: WALLPAPERS_PRIMAIRE,
  college: WALLPAPERS_COLLEGE,
};

/** Flat list of all wallpapers */
export const ALL_WALLPAPERS: Wallpaper[] = [
  ...WALLPAPERS_MATERNELLE,
  ...WALLPAPERS_PRIMAIRE,
  ...WALLPAPERS_COLLEGE,
];

/** Find a wallpaper by ID */
export function getWallpaperById(id: string): Wallpaper | undefined {
  return ALL_WALLPAPERS.find((w) => w.id === id);
}

/** Default wallpaper per category */
export const DEFAULT_WALLPAPER_IDS: Record<WallpaperCategory, string> = {
  maternelle: 'mat-sunrise',
  primaire: 'pri-ocean',
  college: 'col-cosmos',
};
