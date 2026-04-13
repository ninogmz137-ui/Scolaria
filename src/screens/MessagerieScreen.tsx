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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { School, CalendarX, Search, MessageSquarePlus, ChevronDown } from 'lucide-react-native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { FLOATING_TAB_BAR_HEIGHT, TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';
import {
  getConversations,
  markConversationRead,
} from '../stores/messagerieStore';
import type { Conversation } from '../data/messagerieData';
import { SCREEN_BACKGROUND } from '../constants/colors';

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

/** Search field expands left from fixed icon; max input width */
const SEARCH_ICON_W = 44;
const HEADER_ACTION_GAP = 8;
const SEARCH_INPUT_MAX_W = 220;

/** White pill — search button + filter selector (no border, subtle shadow) */
const whitePillShadow = Platform.select({
  ios: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: {
    backgroundColor: '#FFFFFF',
    elevation: 3,
  },
  default: {
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } as object) : {}),
  },
});

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

  // ── Focus refresh ────────────────────────────────────────
  const [tick, setTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setTick((t) => t + 1);
    }, []),
  );

  // ── Search: field expands left from bare icon; filter pill always visible ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  const [filterPillW, setFilterPillW] = useState(120);
  const [headerBlockH, setHeaderBlockH] = useState(72);
  const [dropdownWin, setDropdownWin] = useState<{ left: number; top: number; width: number } | null>(null);

  const searchInputRef = useRef<any>(null);
  const filterPillRef = useRef<View | null>(null);
  const searchWidthSV = useSharedValue(0);
  const ddOpacitySV = useSharedValue(0);
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
    setSearchOpen(true);
    searchWidthSV.value = withTiming(
      SEARCH_INPUT_MAX_W,
      { duration: SEARCH_TIMING_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(focusSearchInput)();
      },
    );
  }, [focusSearchInput, searchWidthSV]);

  const closeSearch = useCallback(() => {
    searchInputRef.current?.blur();
    searchWidthSV.value = withTiming(0, { duration: SEARCH_TIMING_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(finishCloseSearch)();
    });
  }, [finishCloseSearch, searchWidthSV]);

  const toggleSearch = useCallback(() => {
    if (searchOpen) {
      closeSearch();
    } else {
      openSearch();
    }
  }, [searchOpen, openSearch, closeSearch]);

  const searchWidthStyle = useAnimatedStyle(() => {
    const w = searchWidthSV.value;
    return {
      width: w,
      opacity: interpolate(w, [0, 16], [0, 1], Extrapolation.CLAMP),
    };
  });

  const dropdownEnterStyle = useAnimatedStyle(() => ({
    opacity: ddOpacitySV.value,
    transform: [{ translateY: ddTranslateYSV.value }],
  }));

  useEffect(() => {
    if (filterDropdownVisible) {
      ddOpacitySV.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) });
      ddTranslateYSV.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) });
    } else {
      ddOpacitySV.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.cubic) });
      ddTranslateYSV.value = withTiming(-4, { duration: 150, easing: Easing.in(Easing.cubic) });
    }
  }, [filterDropdownVisible, ddOpacitySV, ddTranslateYSV]);

  const openFilterDropdown = useCallback(() => {
    filterPillRef.current?.measureInWindow((x, y, width, height) => {
      setDropdownWin({ left: x, top: y + height + 4, width });
      setFilterDropdownVisible(true);
    });
  }, []);

  const closeFilterDropdown = useCallback(() => {
    setFilterDropdownVisible(false);
    setDropdownWin(null);
  }, []);

  // ── Filter state ─────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');

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

  const inputRightOffset =
    filterPillW + HEADER_ACTION_GAP + SEARCH_ICON_W + HEADER_ACTION_GAP;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View
        style={[styles.headerWrap, styles.screenHorizontalPad]}
        onLayout={(e) => setHeaderBlockH(e.nativeEvent.layout.height)}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextArea}>
            <Text style={styles.headerTitle}>Messagerie</Text>
            <Text style={styles.headerSub}>
              {unreadCount > 0
                ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`
                : 'Tout est à jour'}
            </Text>
          </View>

          <View style={styles.headerActionsCluster}>
            <Animated.View
              style={[
                styles.searchInputAbs,
                styles.searchInputPill,
                searchWidthStyle,
                { right: inputRightOffset },
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
              />
            </Animated.View>

            <Pressable
              onPress={toggleSearch}
              style={({ pressed }) => [styles.searchIconBare, pressed && { opacity: 0.65 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={searchOpen ? 'Fermer la recherche' : 'Rechercher'}
            >
              <Search size={22} color={NAVY} strokeWidth={1.5} />
            </Pressable>

            <View style={styles.filterPillSlot}>
              <View
                ref={filterPillRef}
                collapsable={false}
                onLayout={(e) => setFilterPillW(e.nativeEvent.layout.width)}
              >
                <Pressable
                  onPress={openFilterDropdown}
                  style={({ pressed }) => [
                    styles.filterSelectorPill,
                    whitePillShadow,
                    pressed && { opacity: 0.9 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrer : ${FILTER_OPTIONS.find((o) => o.id === activeFilter)?.label ?? ''}`}
                >
                  <Text style={styles.filterSelectorPillText} numberOfLines={1}>
                    {FILTER_OPTIONS.find((o) => o.id === activeFilter)?.label ?? 'Tout'}
                  </Text>
                  <ChevronDown size={14} color={NAVY} strokeWidth={2} />
                </Pressable>
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

      <Modal
        visible={filterDropdownVisible && dropdownWin != null}
        transparent
        animationType="none"
        onRequestClose={closeFilterDropdown}
      >
        <View style={styles.filterDropdownModalRoot} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeFilterDropdown} />
          {dropdownWin ? (
            <Animated.View
              style={[
                styles.filterDropdownCard,
                dropdownEnterStyle,
                {
                  position: 'absolute',
                  left: Math.max(
                    16,
                    Math.min(
                      dropdownWin.left,
                      Dimensions.get('window').width - 16 - 160,
                    ),
                  ),
                  top: dropdownWin.top,
                  minWidth: Math.max(160, dropdownWin.width),
                },
              ]}
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
                    style={({ pressed }) => [
                      styles.filterModalRow,
                      pressed && { opacity: 0.88 },
                    ]}
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
                      style={[
                        styles.filterModalRowText,
                        active && styles.filterModalRowTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </Animated.View>
          ) : null}
        </View>
      </Modal>

      {/* ── Conversation list ── */}
      <ScrollView
        style={styles.conversationScroll}
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

      <Pressable
        onPress={() => navigation.navigate('MessagesListScreen', { openCompose: true })}
        style={({ pressed }) => [styles.fab, styles.fabPosition, pressed && { opacity: 0.92 }]}
        accessibilityRole="button"
        accessibilityLabel="Nouveau message"
      >
        <MessageSquarePlus size={24} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  /** Shared horizontal inset for header + conversation list (Android overflow). */
  screenHorizontalPad: {
    paddingHorizontal: 16,
  },

  // ── Header ────────────────────────────────────────────
  headerWrap: {
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 100,
    maxWidth: '100%',
    overflow: 'visible',
  },
  headerRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    gap: 8,
    minHeight: 52,
  },
  headerActionsCluster: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: HEADER_ACTION_GAP,
    flexShrink: 0,
    minHeight: 40,
  },
  searchInputAbs: {
    position: 'absolute',
    top: 0,
    height: 40,
    overflow: 'hidden',
    zIndex: 1,
    paddingLeft: 12,
  },
  /** Expanding field only — white pill + shadow (opacity follows width via animated style) */
  searchInputPill: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      default: {
        ...(Platform.OS === 'web' ? ({ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } as object) : {}),
      },
    }),
  },
  searchInputField: {
    flex: 1,
    height: 40,
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NAVY,
    paddingVertical: 0,
  },
  /** Bare Search tap target — no pill, no background */
  searchIconBare: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  filterPillSlot: {
    zIndex: 2,
  },
  searchDismissLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    backgroundColor: 'transparent',
  },
  filterDropdownModalRoot: {
    flex: 1,
  },
  headerTextArea: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 4,
  },
  filterSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    maxWidth: 168,
  },
  filterSelectorPillText: {
    flexShrink: 1,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: NAVY,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 30,
    color: NAVY,
    letterSpacing: -0.6,
  },
  headerSub: {
    marginTop: 2,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
  },

  filterDropdownCard: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  filterModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
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
  },

  // Scroll
  scrollContent: {
    paddingBottom: TAB_BAR_SCROLL_PADDING,
    maxWidth: '100%',
  },

  fab: {
    position: 'absolute',
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A2340',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...Platform.select<any>({
      web: {
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
    }),
  },
  fabPosition: {
    right: 16,
  },

  // Section
  section: {
    marginBottom: 0,
  },
  sectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionCard: {
    backgroundColor: 'transparent',
    maxWidth: '100%',
    overflow: 'hidden',
  },

  // Row
  row: {
    paddingVertical: 11,
    paddingLeft: 0,
    paddingRight: 0,
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
    marginBottom: 3,
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
