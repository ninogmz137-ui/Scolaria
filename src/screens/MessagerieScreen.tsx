/**
 * MessagerieScreen — WhatsApp-style conversation list.
 *
 * - Active child from ActiveChildContext determines which conversations show.
 * - Sections: "Cette semaine" / "Plus tôt" based on lastDate.
 * - Tap a row → ConversationDetailScreen (thread).
 * - Mark as read when tapped, unread blue dot on right.
 * - Zero Aria content, no Supabase, local store only.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { School, CalendarX } from 'lucide-react-native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import {
  getConversations,
  markConversationRead,
} from '../stores/messagerieStore';
import type { Conversation } from '../data/messagerieData';

// ─── Constants ────────────────────────────────────────────

const NAVY = '#1A2340';
const UNREAD_DOT = '#3B82F6';
const BG = '#F2F2F7';

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

  // Re-render on focus (back from thread) to pick up read-state changes
  const [tick, setTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setTick((t) => t + 1);
    }, []),
  );

  // Read fresh from store on every render (tick forces re-render on focus)
  const conversations = getConversations(selectedChild.id);

  const thisWeek = conversations.filter((c) => isThisWeek(c.lastDate));
  const earlier = conversations.filter((c) => !isThisWeek(c.lastDate));
  const unreadCount = conversations.filter((c) => c.unread).length;

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messagerie</Text>
        <Text style={styles.headerSub}>
          {unreadCount > 0
            ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`
            : 'Tout est à jour'}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {conversations.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptyText}>
              Sélectionnez un autre enfant ou revenez plus tard.
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
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
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

  // Scroll
  scrollContent: {
    paddingBottom: 120,
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
