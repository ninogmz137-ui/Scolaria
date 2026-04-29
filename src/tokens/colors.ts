// src/tokens/colors.ts
// Semantic color tokens — light mode active, dark mode prepared for future

import { SCREEN_BACKGROUND } from '../constants/colors';

export const lightTokens = {
  background: SCREEN_BACKGROUND,
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255,255,255,0.55)',
  surfaceElevated: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  border: 'rgba(0,0,0,0.06)',
  borderSubtle: 'rgba(0,0,0,0.03)',
  accent: '#7C3AED',
  accentLight: '#EDE9FE',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#7C3AED',
  tabBarBg: 'rgba(255,255,255,0.7)',
  tabBarText: '#94A3B8',
  tabBarTextActive: '#0F172A',
};

export const darkTokens = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceGlass: 'rgba(30,30,30,0.7)',
  surfaceElevated: '#2C2C2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#ABABAB',
  textMuted: '#636366',
  textInverse: '#000000',
  border: 'rgba(255,255,255,0.1)',
  borderSubtle: 'rgba(255,255,255,0.05)',
  accent: '#A78BFA',
  accentLight: '#2E1065',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#A78BFA',
  tabBarBg: 'rgba(15,20,35,0.7)',
  tabBarText: '#636366',
  tabBarTextActive: '#FFFFFF',
};

// For now, always use light tokens
export const tokens = lightTokens;
export type ColorTokens = typeof lightTokens;
