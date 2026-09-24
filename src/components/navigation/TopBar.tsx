/**
 * TopBar — Barre de navigation supérieure Scolaria (pattern Notion)
 *
 * Structure : [Burger ☰] [Pill Accueil] [Pill Notes] [Pill Agenda] [Pill Messages] [Avatar enfant]
 *
 * - Burger 34px gauche → écran unique « Famille & paramètres »
 * - Pill active : icône + libellé, fond rgba(15,23,42,0.08), hauteur 30 (COMPONENTS §0)
 * - Onglet inactif : icône seule, SANS fond, couleur rgba(15,23,42,0.38)
 * - Sur #F2F1EE (tous les onglets, et l'Accueil dès que le voile apparaît) : couleurs ci-dessus.
 * - Sur le header coloré de l'Accueil, au repos : même forme, couleurs claires (pill active
 *   blanc 22 %, icônes et libellé blancs, inactifs SANS fond) + barre d'état claire.
 * - Avatar enfant 34px droite → ouvre ChildSelectorSheet
 * - Badge rouge 6px sur Messages si hasUnreadMessages
 */

import React, { useState } from 'react';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useTopbarScrollY } from '../../contexts/TopbarScrollContext';
import { View, StyleSheet, Platform } from 'react-native';
import { Pressable, Text } from '../ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Grades, Calendar, TextBubble } from '@getpapillon/papicons';
import { useNavigation } from '@react-navigation/native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import ChildSelectorSheet from '../ChildSelectorSheet';
import ChildAvatar from '../ChildAvatar';

// ─── Types ──────────────────────────────────────────────

export type ActiveTab = 'accueil' | 'notes' | 'agenda' | 'messages' | 'aria';

export interface TopBarProps {
  activeTab: ActiveTab;
  hasUnreadMessages?: boolean;
}

// ─── Config onglets ─────────────────────────────────────

type LucideIcon = typeof Home;

interface TabConfig {
  id: ActiveTab;
  label: string;
  routeName: string;
  icon: LucideIcon;
}

const TABS: TabConfig[] = [
  { id: 'accueil',  label: 'Accueil',   routeName: 'Accueil',       icon: Home },
  { id: 'notes',    label: 'Notes',     routeName: 'Notes',         icon: Grades },
  { id: 'agenda',   label: 'Agenda',    routeName: 'Agenda',        icon: Calendar },
  { id: 'messages', label: 'Messages',  routeName: 'MessagerieTab', icon: TextBubble },
];

/** Géométrie de la rangée (pour le voile ScrollVeil du haut). */
export const TOPBAR_PADDING_TOP = 10;
export const TOPBAR_ROW_HEIGHT = 34;

const ICON_ACTIVE = '#0F172A';
const ICON_INACTIVE = 'rgba(15,23,42,0.38)';
const ICON_ACTIVE_ON_HEADER = '#FFFFFF';
const ICON_INACTIVE_ON_HEADER = 'rgba(255,255,255,0.78)';

/** Au-delà de ce défilement, le voile #F2F1EE couvre le header : couleurs sombres. */
const HEADER_UNTIL_SCROLL = 8;

// ─── Composant ───────────────────────────────────────────

export default function TopBar({ activeTab, hasUnreadMessages }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { selectedChild, children } = useActiveChild();
  const [showChildSelector, setShowChildSelector] = useState(false);

  // Accueil au repos : la barre est posée sur le header coloré → couleurs claires.
  const scrollY = useTopbarScrollY();
  const [overContent, setOverContent] = useState(false);
  useAnimatedReaction(
    () => scrollY.value > HEADER_UNTIL_SCROLL,
    (next, prev) => {
      if (next !== prev) runOnJS(setOverContent)(next);
    },
  );
  const onHeader = activeTab === 'accueil' && !overContent;


  const handleTabPress = (tab: TabConfig) => {
    if (tab.id === 'accueil') {
      (navigation as any).navigate('MainPager', {
        screen: 'Accueil',
        params: { screen: 'AccueilHome' },
      });
    } else {
      (navigation as any).navigate('MainPager', { screen: tab.routeName });
    }
  };

  const handleBurgerPress = () => {
    (navigation as any).navigate('MainPager', {
      screen: 'Accueil',
      params: { screen: 'FamilleParametres', initial: false },
    });
  };

  return (
    <>
      <StatusBar style={onHeader ? 'light' : 'dark'} />
      <View style={[styles.container, { paddingTop: insets.top + TOPBAR_PADDING_TOP }]}>

        {/* Burger — gauche */}
        <Pressable
          onPress={handleBurgerPress}
          style={[styles.burger, onHeader && styles.burgerOnHeader]}
          accessibilityRole="button"
          accessibilityLabel="Famille et paramètres"
        >
          <View style={[styles.burgerLine, onHeader && styles.burgerLineOnHeader]} />
          <View style={[styles.burgerLine, onHeader && styles.burgerLineOnHeader]} />
          <View style={[styles.burgerLine, onHeader && styles.burgerLineOnHeader]} />
        </Pressable>

        {/* Pills de navigation */}
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const isMessages = tab.id === 'messages';
          const isLast = index === TABS.length - 1;
          const Icon = tab.icon;

          return (
            <Pressable
              key={tab.id}
              onPress={() => handleTabPress(tab)}
              style={[
                styles.pill,
                isActive ? (onHeader ? styles.pillActiveOnHeader : styles.pillActive) : styles.pillInactive,
                !isLast && styles.pillMargin,
              ]}
              hitSlop={{ top: 7, bottom: 7 }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Icon
                size={22}
                color={
                  onHeader
                    ? (isActive ? ICON_ACTIVE_ON_HEADER : ICON_INACTIVE_ON_HEADER)
                    : (isActive ? ICON_ACTIVE : ICON_INACTIVE)
                }
              />
              {isActive && (
                <Text style={[styles.pillLabel, onHeader && styles.pillLabelOnHeader]}>{tab.label}</Text>
              )}
              {isMessages && hasUnreadMessages && (
                <View style={styles.badge} />
              )}
            </Pressable>
          );
        })}

        {/* Avatar enfant actif — droite */}
        <Pressable
          onPress={() => setShowChildSelector(true)}
          accessibilityRole="button"
          accessibilityLabel="Changer d'enfant"
          style={styles.childAvatarBtn}
        >
          {/* Outer: shadow */}
          <View style={styles.childAvatarOuter}>
            <ChildAvatar
              child={selectedChild}
              size={34}
              borderColor={onHeader ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.15)'}
            />
          </View>
        </Pressable>
      </View>

      <ChildSelectorSheet
        visible={showChildSelector}
        onClose={() => setShowChildSelector(false)}
      />
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    // Jamais opaque : la lisibilité au défilement vient du voile ScrollVeil (TabNavigator).
    backgroundColor: 'transparent',
  },

  // ── Burger ───────────────────────────────────────────
  burger: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  burgerLine: {
    width: 13,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: 'rgba(15,23,42,0.75)',
    marginVertical: 1.5,
  },

  // ── Pills ────────────────────────────────────────────
  pill: {
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  // Onglet actif : pill grise, icône + libellé
  pillActive: {
    height: 30,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  pillActiveOnHeader: {
    height: 30,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  // Onglet inactif : icône seule, sans fond (zone tactile 44 px en hauteur via hitSlop)
  pillInactive: {
    width: 34,
    height: 30,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  pillLabelOnHeader: {
    color: '#FFFFFF',
  },
  burgerOnHeader: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  burgerLineOnHeader: {
    backgroundColor: '#FFFFFF',
  },
  pillMargin: {
    marginRight: 5,
  },
  pillLabel: {
    marginLeft: 6,
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: '#0F172A',
    lineHeight: Platform.OS === 'android' ? 20 : undefined,
  },

  // ── Badge ────────────────────────────────────────────
  badge: {
    position: 'absolute',
    top: -3,
    right: -1,
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#EF4444',
  },

  // ── Avatar enfant ────────────────────────────────────
  childAvatarBtn: {
    marginLeft: 'auto',
    flexShrink: 0,
  },
  childAvatarOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOpacity: 0.30,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 4 },
    }),
  },
});
