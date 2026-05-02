/**
 * MainLayout — Wrapper principal encapsulant TopBar + contenu + BottomBar.
 *
 * Utilisé par les écrans principaux (Accueil, Notes, Agenda, Messages).
 * La SafeAreaView gère le bord haut ; BottomBar gère le bord bas via insets.
 *
 * Usage :
 * ```tsx
 * <MainLayout activeTab="accueil" onAvatarPress={...} onSearchPress={...}>
 *   <MonContenu />
 * </MainLayout>
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopBar, { type ActiveTab } from './TopBar';
import BottomBar from './BottomBar';

// ─── Props ───────────────────────────────────────────────

export interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: ActiveTab;
  /** Ouvre le sélecteur d'enfant (sprint suivant) */
  onAvatarPress: () => void;
  /** Ouvre la modal de recherche */
  onSearchPress: () => void;
  /** Action contextuelle droite de la BottomBar (scanner, composer…) */
  onActionPress?: () => void;
  /** Affiche le badge rouge sur la pill Messages */
  hasUnreadMessages?: boolean;
}

// ─── Composant ───────────────────────────────────────────

export default function MainLayout({
  children,
  activeTab,
  onAvatarPress,
  onSearchPress,
  onActionPress,
  hasUnreadMessages,
}: MainLayoutProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <TopBar
        activeTab={activeTab}
        onAvatarPress={onAvatarPress}
        hasUnreadMessages={hasUnreadMessages}
      />
      <View style={styles.content}>
        {children}
      </View>
      <BottomBar
        activeTab={activeTab}
        onSearchPress={onSearchPress}
        onActionPress={onActionPress}
      />
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F1EE',
  },
  content: {
    flex: 1,
  },
});
