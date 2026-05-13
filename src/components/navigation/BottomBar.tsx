/**
 * BottomBar — Barre inférieure contextuelle Scolaria
 *
 * Structure : [🔍 Recherche] [◉ Demander à Aria…] [Action contextuelle]
 *
 * - Bouton Recherche (gauche) : rond 34px
 * - Pill Aria (centre, flex:1) : ScolariaSymbol 14px + texte placeholder
 * - Bouton action droite (contextuel) :
 *     Accueil  → Edit
 *     Notes    → ScanLine
 *     Agenda   → Plus (ouvre formulaire ajout événement)
 *     Messages → Edit
 *     Aria     → invisible (espace gardé)
 *
 * - Position : absolute bottom, respecte insets.bottom
 * - Constante BOTTOM_BAR_HEIGHT exportée pour le paddingBottom des écrans
 *
 * Notes Android :
 *   - marginRight/Left explicites au lieu de gap
 *   - elevation: 0 (pas de shadow native Android sur la barre)
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Pressable } from '../ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Edit, ScanLine, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import ScolariaSymbol from '../ScolariaSymbol';
import type { ActiveTab } from './TopBar';

// ─── Constantes exportées ────────────────────────────────

/** Hauteur de la barre hors safe area (paddingTop + bouton + paddingBottom fixe) */
export const BOTTOM_BAR_HEIGHT = 70;

/** Padding bottom pour les ScrollView derrière la BottomBar */
export function getBottomBarScrollPadding(insetsBottom: number): number {
  return BOTTOM_BAR_HEIGHT + insetsBottom + 20;
}

// ─── Props ───────────────────────────────────────────────

export interface BottomBarProps {
  activeTab: ActiveTab;
  onSearchPress: () => void;
  onActionPress?: () => void;
}

// ─── Action contextuelle par onglet ─────────────────────

type LucideIcon = typeof Edit;

function getActionIcon(activeTab: ActiveTab): LucideIcon | null {
  switch (activeTab) {
    case 'notes':    return ScanLine;
    case 'agenda':   return Plus;
    case 'aria':     return null;
    default:         return Edit; // accueil + messages
  }
}

// ─── Composant ───────────────────────────────────────────

export default function BottomBar({ activeTab, onSearchPress, onActionPress }: BottomBarProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const ActionIcon = getActionIcon(activeTab);

  const handleAriaPress = () => {
    // useNavigation() ici = RootStack → passer par MainPager
    (navigation as any).navigate('MainPager', {
      screen: 'Accueil',
      params: { screen: 'AriaHome' },
    });
  };

  const handleActionPress = () => {
    switch (activeTab) {
      case 'messages':
        (navigation as any).navigate('MainPager', {
          screen: 'MessagerieTab',
          params: { openNewMessage: true },
        });
        break;
      default:
        onActionPress?.();
    }
  };

  return (
    <View style={[styles.container, { bottom: insets.bottom > 0 ? insets.bottom + 8 : 12 }]}>

      {/* ── Bouton Recherche (gauche) ── */}
      <Pressable
        onPress={onSearchPress}
        style={styles.roundBtn}
        accessibilityRole="button"
        accessibilityLabel="Rechercher"
      >
        <Search size={22} strokeWidth={2} color="rgba(15,23,42,0.55)" />
      </Pressable>

      {/* ── Pill Aria (centre) ── */}
      <Pressable
        onPress={handleAriaPress}
        style={styles.ariaPill}
        accessibilityRole="button"
        accessibilityLabel="Demander à Aria"
      >
        <ScolariaSymbol size={15} color="#6366F1" />
        <Text style={styles.ariaText} numberOfLines={1}>
          Demander à Aria…
        </Text>
      </Pressable>

      {/* ── Bouton action droite (contextuel) ── */}
      {ActionIcon ? (
        <Pressable
          onPress={handleActionPress}
          style={styles.roundBtn}
          accessibilityRole="button"
          accessibilityLabel="Action"
        >
          <ActionIcon size={22} strokeWidth={2} color="rgba(15,23,42,0.55)" />
        </Pressable>
      ) : (
        /* Espace gardé mais invisible (Agenda / Aria) */
        <View style={styles.roundBtnPlaceholder} />
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    ...Platform.select({
      android: { elevation: 0 },
    }),
  },

  // ── Bouton rond (Recherche / Action) ────────────────
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /** Espace réservé transparent (Agenda / Aria) */
  roundBtnPlaceholder: {
    width: 40,
    height: 40,
  },

  // ── Pill Aria ────────────────────────────────────────
  ariaPill: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginLeft: 8,
    marginRight: 8,
  },
  ariaText: {
    marginLeft: 8,
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: 'rgba(15,23,42,0.35)',
    lineHeight: Platform.OS === 'android' ? 18 : undefined,
  },
});
