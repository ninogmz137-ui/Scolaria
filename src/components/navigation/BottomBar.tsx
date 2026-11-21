/**
 * BottomBar — barre du bas, identique sur tous les onglets (lot 5 ; CLAUDE.md § Navigation, COMPONENTS §0).
 *
 * Structure : [◉ Rechercher ou demander…] [+]
 *
 * - Champ unique « Rechercher ou demander » (flex:1) : recherche et assistant fusionnés ; ouvre la feuille de
 *   recherche (QuickSearchScreen), dont la première ligne envoie la saisie à l'assistant. Plus de loupe séparée.
 * - « + » à droite : SEUL bouton d'ajout de l'application, sur tous les onglets → feuille « Ajouter »
 *   (AjouterAuCarnetSheet, ordre selon l'onglet). Plus de ⊞, de ✏️ ni d'action différente par onglet.
 * - Écran de l'assistant : pas de « + » (l'écran a son propre champ), espace gardé.
 *
 * - Position : absolute bottom, respecte insets.bottom
 * - Constante BOTTOM_BAR_HEIGHT exportée pour le paddingBottom des écrans
 *
 * Notes Android :
 *   - marginRight/Left explicites au lieu de gap
 *   - elevation: 0 (pas de shadow native Android sur la barre)
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Pressable, Text } from '../ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import ScolariaSymbol from '../ScolariaSymbol';
import type { ActiveTab } from './TopBar';

// ─── Constantes exportées ────────────────────────────────

/** Hauteur de la barre hors safe area (paddingTop + bouton + paddingBottom fixe) */
export const BOTTOM_BAR_HEIGHT = 70;

/** Hauteur visible de la rangée (paddingTop 4 + boutons 40). */
export const BOTTOM_BAR_ROW_HEIGHT = 44;

/** Distance entre le bas de l'écran et la barre (safe-area Android/iOS comprise). */
export function getBottomBarOffset(insetsBottom: number): number {
  return insetsBottom > 0 ? insetsBottom + 8 : 12;
}

/** Hauteur de la zone du bas réservée au défilement : barre + marge de 28 px (≥ voile ScrollVeil). */
export function getBottomChromeHeight(insetsBottom: number): number {
  return getBottomBarOffset(insetsBottom) + BOTTOM_BAR_HEIGHT + 28;
}

/**
 * paddingBottom des ScrollView sous la bottom bar : toute la zone du bas (barre + voile)
 * + 12 px d'air, pour que le dernier élément ne passe jamais sous la barre ni sous le voile.
 */
export function getBottomBarScrollPadding(insetsBottom: number): number {
  return getBottomChromeHeight(insetsBottom) + 12;
}

/** Bouton rond de 40 dp → zone tactile de 44 dp (2 de chaque côté ; 8 d'écart avec le champ : aucun chevauchement). */
const ZONE_TACTILE = { top: 2, bottom: 2, left: 2, right: 2 } as const;
const MARGE_BASSE = 4;

// ─── Props ───────────────────────────────────────────────

export interface BottomBarProps {
  activeTab: ActiveTab;
  /** Champ « Rechercher ou demander ». */
  onSearchPress: () => void;
  /** « + » : feuille « Ajouter ». */
  onActionPress?: () => void;
}

// ─── Composant ───────────────────────────────────────────

export default function BottomBar({ activeTab, onSearchPress, onActionPress }: BottomBarProps) {
  const insets = useSafeAreaInsets();
  const avecPlus = activeTab !== 'aria';

  return (
    // box-none : la marge transparente basse (voir styles.container) laisse passer les appuis au contenu dessous.
    // Le décalage de -MARGE_BASSE compense le paddingBottom : la barre ne bouge pas d'un pixel.
    <View pointerEvents="box-none" style={[styles.container, { bottom: getBottomBarOffset(insets.bottom) - MARGE_BASSE }]}>

      {/* ── Champ unique « Rechercher ou demander » ── */}
      <Pressable
        onPress={onSearchPress}
        hitSlop={{ top: 2, bottom: 2 }}
        style={styles.champ}
        accessibilityRole="search"
        accessibilityLabel="Rechercher ou demander"
      >
        <ScolariaSymbol size={15} color="#6366F1" />
        <Text style={styles.champTexte} numberOfLines={1}>
          Rechercher ou demander
        </Text>
      </Pressable>

      {/* ── « + » : seul bouton d'ajout ── */}
      {avecPlus ? (
        <Pressable
          onPress={() => onActionPress?.()}
          hitSlop={ZONE_TACTILE}
          style={styles.roundBtn}
          accessibilityRole="button"
          accessibilityLabel="Ajouter"
        >
          <Plus size={22} strokeWidth={2} color="rgba(15,23,42,0.55)" />
        </Pressable>
      ) : (
        /* Espace gardé mais invisible (assistant) */
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
    // Marge transparente basse : sans elle, la zone tactile agrandie (hitSlop de 2) déborderait du conteneur par le bas
    // et ne recevrait pas les appuis. Compensée par `bottom` ci-dessus.
    paddingBottom: MARGE_BASSE,
    backgroundColor: 'transparent',
    // Au-dessus du voile du bas (élévation 12) : Android trie les vues sœurs par élévation avant
    // le zIndex. Conteneur sans fond → aucune ombre dessinée.
    ...Platform.select({
      android: { elevation: 13 },
    }),
  },

  // ── Bouton rond « + » ─────────────────────────────────
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /** Espace réservé transparent (assistant) */
  roundBtnPlaceholder: {
    width: 40,
    height: 40,
  },

  // ── Champ « Rechercher ou demander » ──────────────────
  champ: {
    flex: 1,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginRight: 8,
  },
  champTexte: {
    marginLeft: 8,
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: 'rgba(15,23,42,0.35)',
    lineHeight: Platform.OS === 'android' ? 18 : undefined,
  },
});
