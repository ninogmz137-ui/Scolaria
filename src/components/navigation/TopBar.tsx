/**
 * TopBar — Barre de navigation supérieure Scolaria (pattern Notion)
 *
 * Structure : [Avatar] [Pill Accueil] [Pill Notes] [Pill Agenda] [Pill Messages]
 *
 * - Avatar 34px : photo/emoji/initiales de l'enfant actif → onAvatarPress
 * - Pill active : icône + label + fond rgba(15,23,42,0.08)
 * - Pill inactive : icône seule, fond transparent
 * - Badge rouge 6px sur Messages si hasUnreadMessages
 *
 * Notes Android :
 *   - Pas de `gap` sur le container → marginRight explicite
 *   - Pas de `gap` dans les pills → marginLeft sur le label
 */

import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { Pressable } from '../ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Grades, Calendar, TextBubble } from '@getpapillon/papicons';
import { useNavigation } from '@react-navigation/native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { androidFloatingWhitePill, nativeWhiteInteractiveShadow } from '../../constants/theme';

// ─── Types ──────────────────────────────────────────────

export type ActiveTab = 'accueil' | 'notes' | 'agenda' | 'messages' | 'aria';

export interface TopBarProps {
  activeTab: ActiveTab;
  /** Ouvre le dropdown de sélection d'enfant (sprint suivant) */
  onAvatarPress: () => void;
  hasUnreadMessages?: boolean;
}

// ─── Config onglets ─────────────────────────────────────

type LucideIcon = typeof Home;

interface TabConfig {
  id: ActiveTab;
  label: string;
  /** Nom de la route React Navigation */
  routeName: string;
  icon: LucideIcon;
}

const TABS: TabConfig[] = [
  { id: 'accueil',  label: 'Accueil',   routeName: 'Accueil',       icon: Home },
  { id: 'notes',    label: 'Notes',     routeName: 'Notes',         icon: Grades },
  { id: 'agenda',   label: 'Agenda',    routeName: 'Agenda',        icon: Calendar },
  { id: 'messages', label: 'Messages',  routeName: 'MessagerieTab', icon: TextBubble },
];

// ─── Helpers ─────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Composant ───────────────────────────────────────────

export default function TopBar({ activeTab, onAvatarPress, hasUnreadMessages }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { selectedChild } = useActiveChild();

  const isEmoji = selectedChild.avatarType === 'emoji';
  const hasPhoto = selectedChild.avatarType === 'photo' && selectedChild.avatarPhotoUri;

  const handleTabPress = (tab: TabConfig) => {
    // useNavigation() ici = RootStack. Il faut passer par 'MainPager' pour
    // atteindre les onglets du Tab.Navigator imbriqué.
    if (tab.id === 'accueil') {
      (navigation as any).navigate('MainPager', {
        screen: 'Accueil',
        params: { screen: 'AccueilHome' },
      });
    } else {
      (navigation as any).navigate('MainPager', { screen: tab.routeName });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>

      {/* Avatar enfant actif */}
      <Pressable
        onPress={onAvatarPress}
        style={styles.avatar}
        accessibilityRole="button"
        accessibilityLabel="Mon compte"
      >
        {hasPhoto ? (
          <Image source={{ uri: selectedChild.avatarPhotoUri! }} style={styles.avatarImage} />
        ) : isEmoji && selectedChild.avatarEmoji ? (
          <Text style={styles.avatarEmoji}>{selectedChild.avatarEmoji}</Text>
        ) : (
          <Text style={styles.avatarInitials}>{getInitials(selectedChild.name)}</Text>
        )}
      </Pressable>

      {/* Pills de navigation (chacune flottante, séparée) */}
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
              isActive && styles.pillActive,
              !isLast && styles.pillMargin,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Icon
              size={21}
              color={isActive ? '#0F172A' : 'rgba(15,23,42,0.38)'}
            />
            {isActive && (
              <Text style={styles.pillLabel}>{tab.label}</Text>
            )}
            {/* Badge non-lu (Messages) */}
            {isMessages && hasUnreadMessages && (
              <View style={styles.badge} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  /** Floating overlay row (Notion-like): pills are separate items */
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },

  // ── Avatar ──────────────────────────────────────────
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    backgroundColor: '#F7F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    // Remplace gap: 5 — marginRight explicite (Android-safe)
    marginRight: 11,
    ...nativeWhiteInteractiveShadow,
    ...androidFloatingWhitePill,
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  avatarEmoji: {
    fontSize: 23,
    lineHeight: 27,
  },
  avatarInitials: {
    color: '#0F172A',
    fontSize: 14,
    fontFamily: FontFamily.sansBold,
  },

  // ── Pills ────────────────────────────────────────────
  pill: {
    height: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F5',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.07)',
    // position relative nécessaire pour le badge absolu
    position: 'relative',
    ...nativeWhiteInteractiveShadow,
    ...androidFloatingWhitePill,
  },
  pillActive: {
    backgroundColor: '#E8E7E4',
    borderColor: 'rgba(15,23,42,0.06)',
  },
  /** Espacement entre pills (remplace gap: 5 sur le container) */
  pillMargin: {
    marginRight: 10,
  },
  pillLabel: {
    // marginLeft remplace gap: 4 à l'intérieur de la pill (Android-safe)
    marginLeft: 7,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#0F172A',
    lineHeight: Platform.OS === 'android' ? 20 : undefined,
  },

  // ── Badge ────────────────────────────────────────────
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#EF4444',
  },
});
