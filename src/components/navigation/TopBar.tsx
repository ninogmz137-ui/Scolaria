/**
 * TopBar — Barre de navigation supérieure Scolaria (pattern Notion)
 *
 * Structure : [Burger ☰] [Pill Accueil] [Pill Notes] [Pill Agenda] [Pill Messages] [Avatar enfant]
 *
 * - Burger 34px gauche → navigation Réglages
 * - Pill active : icône + label, fond rgba(255,255,255,0.42), border blanc
 * - Pill inactive : icône seule, transparent
 * - Avatar enfant 34px droite → ouvre ChildSelectorSheet
 * - Badge rouge 6px sur Messages si hasUnreadMessages
 */

import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from '../ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Grades, Calendar, TextBubble } from '@getpapillon/papicons';
import { useNavigation } from '@react-navigation/native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import ChildSelectorSheet from '../ChildSelectorSheet';

// ─── Types ──────────────────────────────────────────────

export type ActiveTab = 'accueil' | 'notes' | 'agenda' | 'messages' | 'aria';

export interface TopBarProps {
  activeTab: ActiveTab;
  /** Conservé pour compatibilité — non utilisé (burger gère la nav Réglages en interne) */
  onAvatarPress: () => void;
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

// ─── Composant ───────────────────────────────────────────

export default function TopBar({ activeTab, hasUnreadMessages }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { selectedChild } = useActiveChild();
  const [showChildSelector, setShowChildSelector] = useState(false);
  const isHome = activeTab === 'accueil';

  const isEmoji = selectedChild.avatarType === 'emoji';
  const hasPhoto = selectedChild.avatarType === 'photo' && selectedChild.avatarPhotoUri;

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
      params: { screen: 'ReglagesScreen' },
    });
  };

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>

        {/* Burger — gauche */}
        <Pressable
          onPress={handleBurgerPress}
          style={styles.burger}
          accessibilityRole="button"
          accessibilityLabel="Réglages"
        >
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
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
                isActive
                  ? (isHome ? styles.pillActiveHome : styles.pillActiveOther)
                  : (isHome ? styles.pillInactiveHome : styles.pillInactiveOther),
                !isLast && styles.pillMargin,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Icon
                size={22}
                color={isActive ? '#0F172A' : (isHome ? 'rgba(15,23,42,0.45)' : 'rgba(15,23,42,0.50)')}
              />
              {isActive && (
                <Text style={styles.pillLabel}>{tab.label}</Text>
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
            {/* Inner: clip + border */}
            <View style={styles.childAvatarClip}>
              <LinearGradient
                colors={['#818cf8', '#6366f1']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {hasPhoto ? (
                <Image
                  source={{ uri: selectedChild.avatarPhotoUri! }}
                  style={styles.childAvatarImage}
                />
              ) : isEmoji && selectedChild.avatarEmoji ? (
                <Text style={styles.childAvatarEmoji}>{selectedChild.avatarEmoji}</Text>
              ) : (
                <Text style={styles.childAvatarInitials}>
                  {selectedChild.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </Text>
              )}
            </View>
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
    backgroundColor: 'transparent',
  },

  // ── Burger ───────────────────────────────────────────
  burger: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
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
  // Active sur Accueil (hero gradient derrière) — fond blanc semi-transparent
  pillActiveHome: {
    height: 34,
    paddingLeft: 11,
    paddingRight: 14,
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
  },
  // Active sur autres onglets (fond page uni) — fond sombre discret
  pillActiveOther: {
    height: 34,
    paddingLeft: 11,
    paddingRight: 14,
    backgroundColor: 'rgba(15,23,42,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },
  // Inactive sur Accueil — transparent (gradient visible)
  pillInactiveHome: {
    height: 32,
    padding: 8,
    backgroundColor: 'transparent',
  },
  // Inactive sur autres onglets — fond discret pour rester lisible
  pillInactiveOther: {
    width: 36,
    height: 32,
    backgroundColor: 'rgba(15,23,42,0.08)',
    justifyContent: 'center',
  },
  pillMargin: {
    marginRight: 5,
  },
  pillLabel: {
    marginLeft: 6,
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    fontWeight: '700',
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
  childAvatarClip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarImage: {
    width: 34,
    height: 34,
  },
  childAvatarEmoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  childAvatarInitials: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
