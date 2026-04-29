/**
 * MessagerieScreen — WhatsApp-style conversation list.
 *
 * - Active child from ActiveChildContext determines which conversations show.
 * - Sections: "Cette semaine" / "Plus tôt" based on lastDate.
 * - Tap a row → ConversationDetailScreen (thread).
 * - Mark as read when tapped, unread blue dot on right.
 * - Zero Aria content, no Supabase, local store only.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { School, CalendarX, Search, MessageCircle, Plus, ChevronDown } from 'lucide-react-native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_ROW_HEIGHT,
  TAB_BAR_SCROLL_PADDING,
  getFloatingTabBottomOffset,
} from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';
import {
  getConversations,
  markConversationRead,
} from '../stores/messagerieStore';
import type { Conversation } from '../data/messagerieData';
import { SCREEN_BACKGROUND } from '../constants/colors';
import { androidFloatingWhitePill, nativeWhiteInteractiveShadow } from '../constants/theme';

// ─── Constants ────────────────────────────────────────────

const NAVY = '#1A2340';
const UNREAD_DOT = '#3B82F6';
const BG = SCREEN_BACKGROUND;

// ─── Filter types ─────────────────────────────────────────

type FilterId = 'all' | 'unread' | 'teachers' | 'school' | 'absences';

const FILTER_OPTIONS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'unread', label: 'Non lus' },
  { id: 'teachers', label: 'Messages' },
  { id: 'school', label: 'École' },
  { id: 'absences', label: 'Absences' },
];

/** Single pill: collapsed width → expanded (same component) */
const HEADER_ACTION_GAP = 8;
const SEARCH_PILL_MIN_W = 40;
const SEARCH_PILL_MAX_W = Math.round(Dimensions.get('window').width * 0.4);

const MESS_FAB_SIZE = 56;
const MESS_FAB_GUTTER = 16;
/** Marge entre le bord haut de la barre d’onglets flottante et le bas du FAB. */
const FAB_GAP_ABOVE_TAB_ROW = 12;

// ─── Helpers ─────────────────────────────────────────────

function formatLastDate(dateStr: string): string {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateStr === todayStr) return "Aujourd'hui";
  if (dateStr === yesterdayStr) return 'Hier';

  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;

  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) {
    const DAY = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
    return DAY[d.getDay()];
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  return diffDays <= 7;
}

// ─── Avatar ───────────────────────────────────────────────

function ConvAvatar({ conv }: { conv: Conversation }) {
  if (conv.avatarType === 'school') {
    return (
      <View style={[styles.avatar, { backgroundColor: '#DBEAFE' }]}>
        <School size={22} color="#2563EB" strokeWidth={1.8} />
      </View>
    );
  }
  if (conv.avatarType === 'absence') {
    return (
      <View style={[styles.avatar, { backgroundColor: '#FEF3C7' }]}>
        <CalendarX size={22} color="#D97706" strokeWidth={1.8} />
      </View>
    );
  }
  // initials
  const initials = conv.initials ?? conv.name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  return (
    <View style={[styles.avatar, { backgroundColor: NAVY }]}>
      <Text style={styles.avatarInitials}>{initials}</Text>
    </View>
  );
}

// ─── Row ─────────────────────────────────────────────────

function ConvRow({
  conv,
  onPress,
  isLast,
}: {
  conv: Conversation;
  onPress: () => void;
  isLast: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        conv.unread && styles.rowUnread,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.rowInner}>
      <ConvAvatar conv={conv} />

      <View style={styles.rowBody}>
        {/* Name + timestamp */}
        <View style={styles.rowTop}>
          <Text
            style={[
              styles.rowName,
              {
                fontFamily: conv.unread
                  ? FontFamily.sansBold
                  : FontFamily.sansSemiBold,
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {conv.name}
          </Text>
          <Text style={styles.rowTime} numberOfLines={1} ellipsizeMode="tail">
            {formatLastDate(conv.lastDate)}
          </Text>
        </View>

        {/* Preview + unread dot */}
        <View style={styles.rowBottom}>
          <Text
            style={[
              styles.rowPreview,
              {
                fontFamily: conv.unread
                  ? FontFamily.sansMedium
                  : FontFamily.sansRegular,
                color: conv.unread ? NAVY : '#64748B',
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {conv.lastMessage}
          </Text>
          {conv.unread && <View style={styles.unreadDot} />}
        </View>
      </View>
      </View>

      {/* Hairline separator — between rows, not after last */}
      {!isLast && (
        <View style={styles.separator} />
      )}
    </Pressable>
  );
}

// ─── Section ─────────────────────────────────────────────

function Section({
  label,
  conversations,
  onPress,
}: {
  label: string;
  conversations: Conversation[];
  onPress: (conv: Conversation) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionCard}>
        {conversations.map((conv, idx) => (
          <ConvRow
            key={conv.id}
            conv={conv}
            onPress={() => onPress(conv)}
            isLast={idx === conversations.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────

export default function MessagerieScreen() {
  const navigation = useNavigation<any>();
  const { selectedChild } = useActiveChild();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  /** Avec barre flottante, h parfois 0 : on se cale sur la même règle que FloatingTabBar. */
  const fabRowBottom = Math.max(
    tabBarHeight,
    getFloatingTabBottomOffset(insets.bottom) + FLOATING_TAB_BAR_ROW_HEIGHT,
  ) + FAB_GAP_ABOVE_TAB_ROW;

  // ── Focus refresh ────────────────────────────────────────
  const [tick, setTick] = useState(0);

  // ── Search: one white pill expands in-place (width + input opacity); filter always visible ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  const [headerBlockH, setHeaderBlockH] = useState(72);
  const [dropdownWin, setDropdownWin] = useState<{ left: number; top: number; width: number } | null>(null);
  const { width: windowW } = useWindowDimensions();
  /**
   * Android : marge écran (safe area) + marge 20 comme le ressenti web : évite le panneau collé
   * au bord (Modal plein écran, repères = mesure `measureInWindow` sur la pill).
   */
  const dropdownLayout = useMemo(() => {
    if (!dropdownWin) return null;
    /** Même ressenti que `screenHorizontalPad` (16) + un peu d’air sur Android (aligné web). */
    const gutter = Platform.OS === 'android' ? 20 : 16;
    const minLeft = Math.max(insets.left, 0) + gutter;
    const maxRight = windowW - Math.max(insets.right, 0) - gutter;
    const availableW = maxRight - minLeft;
    if (availableW < 1) return null;
    const pillRight = dropdownWin.left + dropdownWin.width;
    /**
     * Sur Android étroit, `Math.min(280, availableW)` donnait un cardW plus large
     * que `pillRight - minLeft`, forçant `left = minLeft` (collé au bord gauche).
     * On plafonne cardW par la distance disponible à gauche de la pill pour que
     * l’alignement droit (sous la pill) reste respecté. Min 200 sinon la liste
     * devient illisible sur écrans très étroits.
     */
    const maxCardW = Math.max(200, pillRight - minLeft);
    const cardW = Math.min(280, availableW, maxCardW);
    let left = pillRight - cardW;
    if (left < minLeft) left = minLeft;
    if (left + cardW > maxRight) left = maxRight - cardW;
    if (left < minLeft) left = minLeft;
    return { left, top: dropdownWin.top, width: cardW };
  }, [dropdownWin, windowW, insets.left, insets.right]);

  const searchInputRef = useRef<any>(null);
  const filterPillRef = useRef<View | null>(null);
  const searchWidthSV = useSharedValue(SEARCH_PILL_MIN_W);
  const inputOpacitySV = useSharedValue(0);
  const isSearchOpenSV = useSharedValue(0);
  const ddTranslateYSV = useSharedValue(-4);

  const SEARCH_TIMING_MS = 220;

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const finishCloseSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  const openSearch = useCallback(() => {
    setFilterDropdownVisible(false);
    setDropdownWin(null);
    setSearchOpen(true);
    isSearchOpenSV.value = 1;
    inputOpacitySV.value = 0;
    searchWidthSV.value = withTiming(
      SEARCH_PILL_MAX_W,
      { duration: SEARCH_TIMING_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(focusSearchInput)();
      },
    );
    inputOpacitySV.value = withDelay(
      100,
      withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
    );
  }, [focusSearchInput, isSearchOpenSV, inputOpacitySV, searchWidthSV]);

  const closeSearch = useCallback(() => {
    searchInputRef.current?.blur();
    isSearchOpenSV.value = 0;
    inputOpacitySV.value = withTiming(0, { duration: 120, easing: Easing.out(Easing.cubic) });
    searchWidthSV.value = withTiming(
      SEARCH_PILL_MIN_W,
      { duration: SEARCH_TIMING_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishCloseSearch)();
      },
    );
  }, [finishCloseSearch, inputOpacitySV, isSearchOpenSV, searchWidthSV]);

  const onSearchIconPress = useCallback(() => {
    if (searchOpen) {
      closeSearch();
    } else {
      openSearch();
    }
  }, [searchOpen, openSearch, closeSearch]);

  const searchPillWidthStyle = useAnimatedStyle(() => ({
    width: searchWidthSV.value,
  }));

  const searchInputOpacityStyle = useAnimatedStyle(() => ({
    opacity: inputOpacitySV.value,
  }));

  // Android: never animate `opacity` on the whole card — the white background becomes
  // translucent and list text shows through. Only translate; menu stays 100% opaque.
  const dropdownEnterStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ddTranslateYSV.value }],
  }));

  useEffect(() => {
    if (filterDropdownVisible) {
      ddTranslateYSV.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) });
    } else {
      ddTranslateYSV.value = withTiming(-4, { duration: 150, easing: Easing.in(Easing.cubic) });
    }
  }, [filterDropdownVisible, ddTranslateYSV]);

  /**
   * Toutes plateformes : `Modal` plein écran + mesure de la pill dans la fenêtre (mêmes repères).
   * L’overlay in-tree Android cassait le layout au retour sur l’onglet (stack / focus).
   */
  const openFilterDropdown = useCallback(() => {
    const pill = filterPillRef.current;
    if (!pill) return;
    pill.measureInWindow((x, y, w, h) => {
      setDropdownWin({ left: x, top: y + h + 4, width: w });
      setFilterDropdownVisible(true);
    });
  }, []);

  const closeFilterDropdown = useCallback(() => {
    setFilterDropdownVisible(false);
    setDropdownWin(null);
  }, []);

  /**
   * Interrompt les withTiming (recherche / filtre) puis remet l’UI dans un état cohérent.
   * Sans `cancelAnimation`, un reset concurrent peut laisser la largeur de pill ou le layout
   * dans un état corrompu au retour (stack / onglet / web).
   */
  const resetMessagerieTransientState = useCallback(() => {
    setFilterDropdownVisible(false);
    setDropdownWin(null);
    setSearchOpen(false);
    setSearchQuery('');
    searchInputRef.current?.blur();
    cancelAnimation(searchWidthSV);
    cancelAnimation(inputOpacitySV);
    cancelAnimation(ddTranslateYSV);
    searchWidthSV.value = SEARCH_PILL_MIN_W;
    inputOpacitySV.value = 0;
    isSearchOpenSV.value = 0;
    ddTranslateYSV.value = -4;
  }, [searchWidthSV, inputOpacitySV, isSearchOpenSV, ddTranslateYSV]);

  // ── Filter state ─────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const filterLabel = useMemo(
    () => FILTER_OPTIONS.find((o) => o.id === activeFilter)?.label ?? 'Tout',
    [activeFilter],
  );

  useFocusEffect(
    useCallback(() => {
      setTick((t) => t + 1);
      return () => {
        resetMessagerieTransientState();
      };
    }, [resetMessagerieTransientState]),
  );

  // ── Data ─────────────────────────────────────────────────
  const conversations = getConversations(selectedChild.id);
  const unreadCount = conversations.filter((c) => c.unread).length;

  const filtered = useMemo(() => {
    let result = conversations;
    switch (activeFilter) {
      case 'unread':    result = result.filter((c) => c.unread); break;
      case 'teachers':  result = result.filter((c) => c.avatarType === 'initials'); break;
      case 'school':    result = result.filter((c) => c.avatarType === 'school'); break;
      case 'absences':  result = result.filter((c) => c.avatarType === 'absence'); break;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q),
      );
    }
    return result;
  }, [conversations, activeFilter, searchQuery, tick]); // tick keeps it fresh on focus

  const thisWeek = filtered.filter((c) => isThisWeek(c.lastDate));
  const earlier  = filtered.filter((c) => !isThisWeek(c.lastDate));

  const handlePress = useCallback(
    (conv: Conversation) => {
      markConversationRead(conv.id);
      setTick((t) => t + 1);
      navigation.navigate('ConversationDetailScreen', {
        conversationId: conv.id,
      });
    },
    [navigation],
  );

  const filterMenuCard = (sheetStyle: object) => (
    <Animated.View
      style={[styles.filterDropdownCard, dropdownEnterStyle, { position: 'absolute' as const }, sheetStyle]}
    >
      <Text style={styles.filterModalTitle}>AFFICHER</Text>
      {FILTER_OPTIONS.map((opt) => {
        const active = opt.id === activeFilter;
        return (
          <Pressable
            key={opt.id}
            onPress={() => {
              setActiveFilter(opt.id);
              closeFilterDropdown();
            }}
            style={({ pressed }) => [styles.filterModalRow, pressed && { opacity: 0.88 }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.filterModalCheck,
                active ? styles.filterModalCheckOn : styles.filterModalCheckOff,
              ]}
            >
              {active ? '✓' : ' '}
            </Text>
            <Text
              style={[styles.filterModalRowText, active && styles.filterModalRowTextActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );

  return (
    <View style={styles.screenShell}>
    <View
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <View
        style={[styles.headerWrap, styles.screenHorizontalPad]}
        onLayout={(e) => setHeaderBlockH(e.nativeEvent.layout.height)}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextArea}>
            <Text
              style={[styles.headerTitle, searchOpen && styles.headerTitleCompact]}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              Messagerie
            </Text>
            <Text style={styles.headerSub}>
              {unreadCount > 0
                ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`
                : 'Tout est à jour'}
            </Text>
          </View>

          <View style={styles.headerActionsCluster}>
            <Animated.View style={[styles.searchPillShadowWrap, searchPillWidthStyle]}>
              <View style={styles.searchPillShell}>
                <View
                  style={[
                    styles.searchPillInnerRow,
                    searchOpen ? styles.searchPillInnerRowOpen : styles.searchPillInnerRowClosed,
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.searchInputOpaqueWrap,
                      searchInputOpacityStyle,
                      !searchOpen && styles.searchInputOpaqueWrapCollapsed,
                    ]}
                    pointerEvents={searchOpen ? 'auto' : 'none'}
                  >
                    <TextInput
                      ref={searchInputRef}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Rechercher…"
                      placeholderTextColor="#94A3B8"
                      style={styles.searchInputField}
                      returnKeyType="search"
                      onSubmitEditing={() => searchInputRef.current?.blur()}
                      autoCorrect={false}
                      editable={searchOpen}
                      pointerEvents={searchOpen ? 'auto' : 'none'}
                    />
                  </Animated.View>
                  <Pressable
                    onPress={onSearchIconPress}
                    style={({ pressed }) => [styles.searchIconHit, pressed && { opacity: 0.75 }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={searchOpen ? 'Fermer la recherche' : 'Rechercher'}
                  >
                    <Search size={20} color={NAVY} strokeWidth={1.5} />
                  </Pressable>
                </View>
              </View>
            </Animated.View>

            <View style={styles.filterPillSlot}>
              <View ref={filterPillRef} collapsable={false}>
                {activeFilter === 'all' ? (
                  <View style={styles.filterToutOuterWrap}>
                    <Pressable
                      onPress={openFilterDropdown}
                      style={({ pressed }) => [
                        styles.filterPillPressableNoBg,
                        pressed && { opacity: 0.92 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Filtrer : ${filterLabel}`}
                    >
                      <View style={styles.filterPillContentRow}>
                        <Text
                          style={[
                            styles.filterSelectorPillText,
                            Platform.OS === 'android' && styles.filterSelectorPillTextAndroid,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                        >
                          {filterLabel}
                        </Text>
                        <View style={styles.filterPillChevronWrap} pointerEvents="none">
                          <ChevronDown size={14} color={NAVY} strokeWidth={2} />
                        </View>
                      </View>
                    </Pressable>
                  </View>
                ) : (
                  <View style={[styles.filterPillShadowWrap, styles.filterPillShadowWrapNavy]}>
                    <Pressable
                      onPress={openFilterDropdown}
                      style={({ pressed }) => [
                        styles.filterPillInner,
                        pressed && { opacity: 0.92 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Filtrer : ${filterLabel}`}
                    >
                      <View style={styles.filterPillContentRow}>
                        <Text
                          style={[
                            styles.filterSelectorPillText,
                            styles.filterSelectorPillTextOnNavy,
                            Platform.OS === 'android' && styles.filterSelectorPillTextAndroid,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
                        >
                          {filterLabel}
                        </Text>
                        <View style={styles.filterPillChevronWrap} pointerEvents="none">
                          <ChevronDown size={14} color="#FFFFFF" strokeWidth={2} />
                        </View>
                      </View>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>

      {searchOpen ? (
        <Pressable
          style={[styles.searchDismissLayer, { top: insets.top + headerBlockH }]}
          onPress={closeSearch}
          accessibilityLabel="Fermer la recherche"
        />
      ) : null}

      {/* ── Conversation list ── */}
      <ScrollView
        style={[
          styles.conversationScroll,
          Platform.OS === 'android' && styles.conversationScrollAndroid,
        ]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          styles.screenHorizontalPad,
          { paddingBottom: FLOATING_TAB_BAR_HEIGHT + insets.bottom + TAB_BAR_SCROLL_PADDING },
        ]}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {searchQuery.trim()
                ? 'Aucun résultat'
                : 'Aucune conversation'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? 'Modifiez votre recherche ou changez de filtre.'
                : 'Sélectionnez un autre enfant ou revenez plus tard.'}
            </Text>
          </View>
        ) : (
          <>
            {thisWeek.length > 0 && (
              <Section
                label="Cette semaine"
                conversations={thisWeek}
                onPress={handlePress}
              />
            )}
            {earlier.length > 0 && (
              <Section
                label="Plus tôt"
                conversations={earlier}
                onPress={handlePress}
              />
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/*
        Bandeau bas pleine largeur + flex-end : évite left = width-72 quand width vaut 0
        (FAB coincé en bas-gauche) et aligne à droite même en RTL.
      */}
      <View
        style={[styles.fabSlot, { bottom: fabRowBottom }]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => {
            /* New-message flow TBD — silent no-op for now. */
          }}
          style={({ pressed }) => [styles.fabPress, pressed && { transform: [{ scale: 0.96 }] }]}
          accessibilityRole="button"
          accessibilityLabel="Nouveau message"
        >
          <View style={styles.fabInner}>
            <View style={styles.fabMessIconWrap} pointerEvents="none">
              <MessageCircle size={24} color="#FFFFFF" strokeWidth={2.2} />
              <View style={styles.fabPlusCentered}>
                <Plus size={11} color="#FFFFFF" strokeWidth={3.2} />
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    </View>

    <Modal
      visible={!!(filterDropdownVisible && dropdownLayout)}
      transparent
      animationType="none"
      onRequestClose={closeFilterDropdown}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.filterDropdownModalRoot} pointerEvents="box-none">
        <Pressable
          onPress={closeFilterDropdown}
          style={[StyleSheet.absoluteFill, styles.filterDropdownScrim]}
          accessibilityLabel="Fermer le filtre"
        />
        {dropdownLayout
          ? filterMenuCard({
              left: dropdownLayout.left,
              top: dropdownLayout.top,
              width: dropdownLayout.width,
            })
          : null}
      </View>
    </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  /**
   * Un seul hôte natif (pas de Fragment) : évite des mesures de largeur 0 / flex cassés sur Android
   * quand l’écran n’est pas le composant direct du navigateur.
   */
  screenShell: {
    flex: 1,
    minHeight: 0,
    ...Platform.select({
      web: { width: '100%' as const, minWidth: 0 },
      android: { alignSelf: 'stretch' },
      default: {},
    }),
  },
  root: {
    flex: 1,
    backgroundColor: BG,
    ...Platform.select({
      /**
       * Web : `minHeight`/`minWidth`/`width` aident le flex au retour d’onglet.
       * Android : pas de `width: '100%'` sur l’hôte (souvent largeur 0% si le parent n’a pas de base explicite) ;
       * `overflow: visible` casse fréquemment le moteur de layout (Yoga) sur vues `flex:1` + `ScrollView`.
       */
      web: { minHeight: 0, minWidth: 0, width: '100%' as const },
      android: { minHeight: 0, overflow: 'hidden' as const },
      default: { minHeight: 0 },
    }),
  },
  /** Shared horizontal inset for header + conversation list (Android overflow). */
  screenHorizontalPad: {
    paddingHorizontal: 16,
  },

  // ── Header ────────────────────────────────────────────
  headerWrap: {
    paddingTop: 10,
    paddingBottom: 16,
    zIndex: 100,
    maxWidth: '100%',
  },
  headerRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    minHeight: 52,
  },
  headerActionsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADER_ACTION_GAP,
    flexShrink: 0,
    minHeight: 40,
    zIndex: 6,
    ...Platform.select({
      android: { elevation: 4 },
      default: {},
    }),
  },
  searchPillShadowWrap: {
    height: 40,
    minHeight: 40,
    maxHeight: 40,
    alignSelf: 'center',
    borderRadius: 20,
    ...nativeWhiteInteractiveShadow,
    ...androidFloatingWhitePill,
  },
  /** Single expanding pill — width 40 → 220; inner clips content */
  searchPillShell: {
    height: 40,
    minHeight: 40,
    maxHeight: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    maxWidth: SEARCH_PILL_MAX_W,
    width: '100%',
  },
  /**
   * Android : `flex:1` sur la rangée interne (parent en colonne) peut absorber toute la
   * hauteur disponible dès qu’un enchaînement flex est ambigu — hauteur fixe obligatoire.
   */
  searchPillInnerRow: {
    height: 40,
    minHeight: 40,
    maxHeight: 40,
    width: '100%' as const,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      android: { flex: 0, flexBasis: 40, flexGrow: 0, flexShrink: 0 },
      default: { flex: 1, minHeight: 40 },
    }),
  },
  /** Champ visible — padding horizontal symétrique */
  searchPillInnerRowOpen: {
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
  },
  /** État fermé (pill 40px) — icône seule, centrée */
  searchPillInnerRowClosed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  searchInputOpaqueWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  searchInputOpaqueWrapCollapsed: {
    flex: 0,
    width: 0,
    minWidth: 0,
    overflow: 'hidden',
  },
  searchInputField: {
    flex: 1,
    height: 40,
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NAVY,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  /** Zone tactile icône — carré égal à la hauteur de la pill */
  searchIconHit: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillSlot: {
    zIndex: 2,
    flexShrink: 1,
    minWidth: 72,
    maxWidth: 200,
  },
  filterToutOuterWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    ...androidFloatingWhitePill,
    ...Platform.select({
      web: { minWidth: 120, width: '100%' as any },
    }),
  },
  /* Ligne texte + chevron — ne pas inverser en RTL (chevron seule à gauche). */
  filterPillContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    ...Platform.select({
      /** Web: sans largeur, flex shrink peut réduire le Text à 0. */
      web: { alignSelf: 'stretch' as const, width: '100%' as any },
      default: {},
    }),
  },
  filterPillPressableNoBg: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    minWidth: 0,
    ...Platform.select({
      web: { width: '100%' as any },
    }),
  },
  filterPillChevronWrap: {
    flexShrink: 0,
    justifyContent: 'center',
    marginLeft: 0,
  },
  filterPillShadowWrap: {
    borderRadius: 18,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    ...androidFloatingWhitePill,
    ...Platform.select({
      web: { minWidth: 120, width: '100%' as any },
    }),
  },
  filterPillShadowWrapNavy: {
    backgroundColor: '#0F1B2D',
  },
  filterPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    minWidth: 0,
    maxHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...Platform.select({
      web: { width: '100%' as any },
    }),
  },
  searchDismissLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    backgroundColor: 'transparent',
    ...Platform.select({
      /** Must stay above FAB wrapper elevation when search is open. */
      android: { elevation: 32 },
      default: {},
    }),
  },
  filterDropdownModalRoot: {
    flex: 1,
  },
  /** Dims the screen so list text is not visually merged with the menu. */
  filterDropdownScrim: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  headerTextArea: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    paddingLeft: 4,
    paddingRight: 8,
    marginRight: 8,
  },
  filterSelectorPillText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: NAVY,
    marginRight: 4,
    ...Platform.select({
      web: {
        maxWidth: 200,
        flexGrow: 1,
        flexShrink: 0,
        minWidth: 40,
        overflow: 'visible' as const,
      } as any,
      default: {
        flex: 0,
        flexGrow: 0,
        flexShrink: 1,
        minWidth: 0,
        maxWidth: 148,
      },
    }),
  },
  filterSelectorPillTextAndroid: {
    lineHeight: 20,
  },
  filterSelectorPillTextOnNavy: {
    color: '#FFFFFF',
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 34,
    color: NAVY,
    letterSpacing: -0.6,
  },
  /** Shrink title when search pill is expanded so it never gets truncated. */
  headerTitleCompact: {
    fontSize: 22,
  },
  headerSub: {
    marginTop: 2,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
  },

  filterDropdownCard: {
    zIndex: 2,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 10 },
    }),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(15, 23, 42, 0.08)',
      },
      default: {
        ...(Platform.OS === 'web'
          ? ({ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' } as object)
          : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
            }),
      },
    }),
  },
  filterModalTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: '#8E8E93',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingTop: 10,
    paddingBottom: 6,
    ...Platform.select({
      android: { paddingHorizontal: 20 },
      default: { paddingHorizontal: 16 },
    }),
  },
  filterModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
    ...Platform.select({
      android: { paddingHorizontal: 20 },
      default: { paddingHorizontal: 16 },
    }),
  },
  filterModalCheck: {
    width: 22,
    fontSize: 16,
    textAlign: 'center',
  },
  filterModalCheckOn: {
    color: NAVY,
    fontFamily: FontFamily.sansBold,
  },
  filterModalCheckOff: {
    color: 'transparent',
  },
  filterModalRowText: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 16,
    color: NAVY,
  },
  filterModalRowTextActive: {
    fontFamily: FontFamily.sansSemiBold,
  },

  conversationScroll: {
    flex: 1,
    ...Platform.select({
      web: { minHeight: 0, minWidth: 0 },
      android: { minHeight: 0 },
      default: { minHeight: 0 },
    }),
  },
  /** Keep list layer under the FAB on Android (stacking + elevation interop). */
  conversationScrollAndroid: {
    zIndex: 0,
    elevation: 0,
  },

  // Scroll
  scrollContent: {
    paddingBottom: TAB_BAR_SCROLL_PADDING,
    maxWidth: '100%',
  },

  // FAB — single Pressable owns position + shadow + elevation (no outer wrapper).
  // Android requires BOTH `zIndex` AND `elevation` to stay above a sibling ScrollView
  // with nested elevation children (list items have shadows of their own).
  fabInner: {
    width: MESS_FAB_SIZE,
    height: MESS_FAB_SIZE,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  /** Bulle de conversation + au centre. */
  fabMessIconWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPlusCentered: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** `direction: ltr` : bas-droite visuel quelle que soit la langue RTL. */
  fabSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: MESS_FAB_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: MESS_FAB_GUTTER,
    zIndex: 99,
    direction: 'ltr',
  } as any,
  fabPress: {
    width: MESS_FAB_SIZE,
    height: MESS_FAB_SIZE,
    borderRadius: 28,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    ...Platform.select<any>({
      web: {
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
    }),
  },
  // Section
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 0,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: 'transparent',
    maxWidth: '100%',
    overflow: 'hidden',
  },

  // Row
  row: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: SCREEN_BACKGROUND,
    position: 'relative',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  rowUnread: {
    backgroundColor: '#F0F4FF',
  },
  rowPressed: {
    backgroundColor: '#F3F4F6',
  },

  // Avatar
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: 12,
  },
  avatarInitials: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: '#FFFFFF',
  },

  // Row body
  rowBody: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
    minWidth: 0,
    maxWidth: '100%',
  },
  rowName: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: NAVY,
  },
  rowTime: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    flexShrink: 0,
    maxWidth: '42%',
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    maxWidth: '100%',
  },
  rowPreview: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: UNREAD_DOT,
    flexShrink: 0,
  },

  // Hairline separator between rows
  separator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F2F2F2',
  },

  // Empty
  empty: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: '#0F172A',
  },
  emptyText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
