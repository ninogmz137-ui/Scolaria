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
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { School, CalendarX, Search, X, ChevronDown, Check, MessageSquarePlus } from 'lucide-react-native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import {
  getConversations,
  markConversationRead,
} from '../stores/messagerieStore';
import type { Conversation } from '../data/messagerieData';

// ─── Constants ────────────────────────────────────────────

const NAVY = '#1A2340';
const VIOLET = '#7C3AED';
const UNREAD_DOT = '#3B82F6';
const BG = '#F2F2F7';

// ─── Filter types ─────────────────────────────────────────

type FilterId = 'all' | 'unread' | 'teachers' | 'school' | 'absences';

const FILTER_OPTIONS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'unread', label: 'Non lus' },
  { id: 'teachers', label: 'Enseignants' },
  { id: 'school', label: 'École' },
  { id: 'absences', label: 'Absences' },
];

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
    borderColor: 'rgba(255,255,255,0.7)',
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
          >
            {conv.name}
          </Text>
          <Text style={styles.rowTime}>{formatLastDate(conv.lastDate)}</Text>
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
          >
            {conv.lastMessage}
          </Text>
          {conv.unread && <View style={styles.unreadDot} />}
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

  // ── Search state ─────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<any>(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    Animated.timing(searchAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: false,
    }).start(() => searchInputRef.current?.focus());
  }, [searchAnim]);

  const closeSearch = useCallback(() => {
    searchInputRef.current?.blur();
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      setSearchOpen(false);
      setSearchQuery('');
    });
  }, [searchAnim]);

  // ── Filter state ─────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [dropdownVisible, setDropdownVisible] = useState(false);

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

  const currentFilterLabel =
    FILTER_OPTIONS.find((f) => f.id === activeFilter)?.label ?? 'Tout';
  const isFiltered = activeFilter !== 'all';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header wrap (zIndex keeps dropdown on top) ── */}
      <View style={styles.headerWrap}>

        {/* Main header row */}
        <View style={styles.headerRow}>

          {/* Left: title OR search input */}
          {!searchOpen ? (
            <View style={styles.headerTextArea}>
              <Text style={styles.headerTitle}>Messagerie</Text>
              <Text style={styles.headerSub}>
                {unreadCount > 0
                  ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`
                  : 'Tout est à jour'}
              </Text>
            </View>
          ) : (
            <Animated.View
              style={[
                styles.searchInputWrap,
                glassStyle,
                {
                  opacity: searchAnim,
                  maxWidth: searchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 600],
                  }),
                },
              ]}
            >
              <Search size={14} color="#94A3B8" strokeWidth={2} />
              <TextInput
                ref={searchInputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher…"
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                returnKeyType="search"
                onSubmitEditing={closeSearch}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={13} color="#94A3B8" strokeWidth={2.5} />
                </Pressable>
              )}
            </Animated.View>
          )}

          {/* Right: search toggle + filter pill */}
          <View style={styles.headerActions}>
            {/* Search icon / close */}
            <Pressable
              onPress={searchOpen ? closeSearch : openSearch}
              style={({ pressed }) => [
                styles.glassBtn,
                glassStyle,
                pressed && { opacity: 0.75 },
              ]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={searchOpen ? 'Fermer la recherche' : 'Rechercher'}
            >
              {searchOpen
                ? <X size={18} color={NAVY} strokeWidth={2.2} />
                : <Search size={18} color={NAVY} strokeWidth={2.2} />
              }
            </Pressable>

            {/* Filter pill */}
            <Pressable
              onPress={() => setDropdownVisible((v) => !v)}
              style={({ pressed }) => [
                styles.glassPill,
                glassStyle,
                isFiltered && styles.glassPillActive,
                pressed && { opacity: 0.75 },
              ]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Filtrer les conversations"
            >
              <Text
                style={[
                  styles.filterPillLabel,
                  isFiltered && { color: VIOLET, fontFamily: FontFamily.sansBold },
                ]}
              >
                {currentFilterLabel}
              </Text>
              <ChevronDown
                size={12}
                color={isFiltered ? VIOLET : NAVY}
                strokeWidth={2.5}
                style={dropdownVisible ? { transform: [{ rotate: '180deg' }] } : undefined}
              />
            </Pressable>
          </View>
        </View>

        {/* Filter dropdown */}
        {dropdownVisible && (
          <>
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => setDropdownVisible(false)}
            />
            <View style={styles.dropdown}>
              {FILTER_OPTIONS.map((opt, idx) => {
                const active = opt.id === activeFilter;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      setActiveFilter(opt.id);
                      setDropdownVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      idx > 0 && styles.dropdownItemBorder,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        active && styles.dropdownItemTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {active && (
                      <Check size={14} color={VIOLET} strokeWidth={2.5} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </View>

      {/* ── Conversation list ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={() => {
          if (dropdownVisible) setDropdownVisible(false);
        }}
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
        onPress={() => navigation.navigate('MessagesListScreen')}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.92 }]}
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
  },

  // ── Header ────────────────────────────────────────────
  headerWrap: {
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    minHeight: 52,
  },
  headerTextArea: {
    flex: 1,
    paddingLeft: 4,
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

  // Search input (animated) — true pill shape
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 40,
    gap: 8,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NAVY,
    paddingVertical: 0,
  },

  // Right action buttons
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },

  // Glass icon button (search toggle) — perfect circle
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Glass filter pill — true pill (borderRadius = height/2)
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
  },
  glassPillActive: {
    // violet tint overlay when filter is active
    borderColor: 'rgba(124,58,237,0.35)',
  },
  filterPillLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: NAVY,
  },

  // Filter dropdown — Liquid Glass
  dropdown: {
    position: 'absolute',
    right: 16,
    top: 62,
    minWidth: 180,
    borderRadius: 16,
    paddingVertical: 4,
    zIndex: 30,
    ...Platform.select<any>({
      web: {
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.7)',
      },
      ios: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        backgroundColor: '#FFFFFF',
        elevation: 8,
      },
      default: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  dropdownItemBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.06)',
  },
  dropdownItemText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: NAVY,
    flex: 1,
  },
  dropdownItemTextActive: {
    fontFamily: FontFamily.sansBold,
    color: VIOLET,
  },

  // Scroll
  scrollContent: {
    paddingBottom: 120,
  },

  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: '#FFFFFF',
    position: 'relative',
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
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  rowName: {
    flex: 1,
    fontSize: 16,
    color: NAVY,
  },
  rowTime: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    flexShrink: 0,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowPreview: {
    flex: 1,
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
    left: 76, // 16 + 48 + 12 = 76 — aligns with text
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
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
