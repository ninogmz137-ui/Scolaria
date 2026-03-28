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
} from 'react-native';
import type { ViewProps, TextProps, PressableProps, ActivityIndicatorProps } from 'react-native';
import React from 'react';

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

export const Text = RNText;

// ─── Interaction ────────────────────────────────────────

export const Pressable = RNPressable;

// ─── Feedback ───────────────────────────────────────────

export const Spinner = ActivityIndicator;

// ─── Input (simple re-export; AuthScreen uses Gluestack Input) ──

export { TextInput as InputField } from 'react-native';
