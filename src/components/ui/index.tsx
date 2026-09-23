/**
 * Scolaria UI primitives — thin wrappers around React Native core components.
 *
 * NativeWind v4 adds `className` support to all RN components via
 * react-native-css-interop. These re-exports let us keep the semantic
 * names (Box, HStack, VStack) used throughout the migrated codebase
 * while using RN's actual components that NativeWind can style.
 */

import {
  View,
  Text as RNText,
  Pressable as RNPressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import type { ViewProps, TextProps, PressableProps, ActivityIndicatorProps, TextStyle } from 'react-native';
import React from 'react';
import { cssInterop } from 'nativewind';

// ─── Layout primitives ──────────────────────────────────

export const Box = View;
export const VStack = View;

/**
 * HStack — a View that defaults to flex-row.
 * Accepts extra className to merge with the default.
 */
export const HStack = React.forwardRef<View, ViewProps & { className?: string; space?: string }>(
  ({ className, space: _space, ...props }, ref) => (
    <View ref={ref} className={`flex-row ${className ?? ''}`} {...props} />
  ),
);
HStack.displayName = 'HStack';

// ─── Typography ─────────────────────────────────────────

/** Graisse → fichier Figtree chargé par useSolariaFonts. */
const FIGTREE_BY_WEIGHT: Record<string, string> = {
  '100': 'Figtree_300Light',
  '200': 'Figtree_300Light',
  '300': 'Figtree_300Light',
  '400': 'Figtree_400Regular',
  normal: 'Figtree_400Regular',
  '500': 'Figtree_500Medium',
  '600': 'Figtree_600SemiBold',
  '700': 'Figtree_700Bold',
  bold: 'Figtree_700Bold',
  '800': 'Figtree_800ExtraBold',
  '900': 'Figtree_900Black',
};

/**
 * Text — police par défaut de toute l'app : Figtree (Rufina reste réservée à ScolariaLogo).
 *
 * - Sans fontFamily : la graisse (style ou className `font-bold`…) choisit la variante Figtree.
 * - fontWeight est retiré : chaque graisse est un fichier de police distinct, et sur Android
 *   un fontWeight posé sur une police custom provoque un faux gras ou un repli système.
 *
 * Tous les écrans importent Text d'ici, jamais de 'react-native'.
 */
export const Text = React.forwardRef<RNText, TextProps>(function Text({ style, ...props }, ref) {
  const { fontWeight, ...flat } = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const fontFamily = flat.fontFamily ?? FIGTREE_BY_WEIGHT[String(fontWeight ?? '400')] ?? 'Figtree_400Regular';
  return <RNText ref={ref} {...props} style={{ ...flat, fontFamily }} />;
});

// className NativeWind → style, pour que les classes font-* passent par le mapping ci-dessus.
cssInterop(Text, { className: 'style' });

// ─── Interaction ────────────────────────────────────────

export const Pressable = RNPressable;

// ─── Feedback ───────────────────────────────────────────

export const Spinner = ActivityIndicator;

// ─── Input (simple re-export; AuthScreen uses Gluestack Input) ──

export { TextInput as InputField } from 'react-native';
