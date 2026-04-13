/**
 * MessagerieScreen — WhatsApp-style conversation list.
 *
 * - Active child from ActiveChildContext determines which conversations show.
 * - Sections: "Cette semaine" / "Plus tôt" based on lastDate.
 * - Tap a row → ConversationDetailScreen (thread).
 * - Mark as read when tapped, unread blue dot on right.
 * - Zero Aria content, no Supabase, local store only.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { School, CalendarX, Search, X, MessageSquarePlus, ChevronDown } from 'lucide-react-native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { FLOATING_TAB_BAR_HEIGHT, TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';
import {
  getConversations,
  markConversationRead,
} from '../stores/messagerieStore';
import type { Conversation } from '../data/messagerieData';
import { Colors, SCREEN_BACKGROUND } from '../constants/colors';

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

/** Inline search pill: collapsed (icon-only) → expanded (≈220px), spring-animated */
const SEARCH_PILL_COLLAPSED = 44;
const SEARCH_PILL_EXPANDED = 220;

// ─── Liquid Glass style ───────────────────────────────────

const glassStyle = Platform.select<any>({
  web: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundImage:
      'linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.28) 100%)',
  },
  default: {
    backgroundColor: 'rgba(255,255,255,0.60)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
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

  // ── Search: spring width on pill; title always visible ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const searchInputRef = useRef<any>(null);
  const pillW = useSharedValue(SEARCH_PILL_COLLAPSED);

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const finishCloseSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    pillW.value = withSpring(SEARCH_PILL_EXPANDED, { damping: 17, stiffness: 320 }, (finished) => {
      if (finished) runOnJS(focusSearchInput)();
    });
  }, [focusSearchInput, pillW]);

  const closeSearch = useCallback(() => {
    searchInputRef.current?.blur();
    pillW.value = withSpring(SEARCH_PILL_COLLAPSED, { damping: 17, stiffness: 320 }, (finished) => {
      if (finished) runOnJS(finishCloseSearch)();
    });
  }, [finishCloseSearch, pillW]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    width: pillW.value,
  }));

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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      <View style={[styles.headerWrap, styles.screenHorizontalPad]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextArea}>
            <Text style={styles.headerTitle}>Messagerie</Text>
            <Text style={styles.headerSub}>
              {unreadCount > 0
                ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`
                : 'Tout est à jour'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Animated.View
              style={[
                styles.searchPill,
                glassStyle,
                pillAnimatedStyle,
                { borderWidth: 1, borderColor: Colors.cardBorder },
              ]}
            >
              <View style={styles.searchPillInner}>
                {searchOpen ? (
                  <>
                    <TextInput
                      ref={searchInputRef}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Rechercher…"
                      placeholderTextColor="#94A3B8"
                      style={styles.searchInputInPill}
                      returnKeyType="search"
                      onSubmitEditing={() => searchInputRef.current?.blur()}
                      autoCorrect={false}
                    />
                    <Pressable
                      onPress={closeSearch}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Fermer la recherche"
                    >
                      <X size={17} color="#64748B" strokeWidth={2.2} />
                    </Pressable>
                  </>
                ) : null}
                <Pressable
                  onPress={searchOpen ? () => searchInputRef.current?.focus() : openSearch}
                  style={({ pressed }) => [styles.searchIconSlot, pressed && { opacity: 0.8 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Rechercher"
                >
                  <Search size={22} color={NAVY} strokeWidth={1.5} />
                </Pressable>
              </View>
            </Animated.View>

            {!searchOpen ? (
              <Pressable
                onPress={() => setFilterModalVisible(true)}
                style={({ pressed }) => [
                  styles.filterSelectorPill,
                  pressed && { opacity: 0.88 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Filtrer : ${FILTER_OPTIONS.find((o) => o.id === activeFilter)?.label ?? ''}`}
              >
                <Text style={styles.filterSelectorPillText} numberOfLines={1}>
                  {FILTER_OPTIONS.find((o) => o.id === activeFilter)?.label ?? 'Tout'}
                </Text>
                <ChevronDown size={14} color={NAVY} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <Modal
          visible={filterModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFilterModalVisible(false)}
        >
          <View style={styles.filterModalRoot}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setFilterModalVisible(false)}
              accessibilityLabel="Fermer"
            />
            <View style={styles.filterModalCenter} pointerEvents="box-none">
              <View style={styles.filterModalCard}>
                <Text style={styles.filterModalTitle}>AFFICHER</Text>
                {FILTER_OPTIONS.map((opt) => {
                  const active = opt.id === activeFilter;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => {
                        setActiveFilter(opt.id);
                        setFilterModalVisible(false);
                      }}
                      style={({ pressed }) => [
                        styles.filterModalRow,
                        pressed && { opacity: 0.88 },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.filterModalCheck, active ? styles.filterModalCheckOn : styles.filterModalCheckOff]}>
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
              </View>
            </View>
          </View>
        </Modal>
      </View>

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
    zIndex: 20,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  headerRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    gap: 8,
    minHeight: 52,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerTextArea: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 4,
  },
  filterSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
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

  searchPill: {
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    maxWidth: SEARCH_PILL_EXPANDED,
  },
  searchPillInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingLeft: 10,
    paddingRight: 8,
    gap: 6,
    minWidth: 0,
  },
  searchInputInPill: {
    flex: 1,
    minWidth: 0,
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NAVY,
    paddingVertical: 0,
  },
  searchIconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  filterModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  filterModalCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 28,
    zIndex: 1,
  },
  filterModalCard: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    maxWidth: 360,
    alignSelf: 'center',
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
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
