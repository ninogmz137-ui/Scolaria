/**
 * MessagesListScreen — Teacher conversations + mots du cahier de liaison.
 *
 * Sections:
 *   1. Conversations — mock teacher threads
 *   2. Mots à signer — liaison items from mock data
 */

import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import GlassCard from '../../components/GlassCard';
import { FLOATING_TAB_BAR_HEIGHT } from '../../components/FloatingTabBar';

// ─── Types ────────────────────────────────────────────────

interface Conversation {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  date: string;
  unread: boolean;
}

interface MotLiaison {
  id: string;
  title: string;
  deadline: string | null;
  signed: boolean;
}

// ─── Mock data ────────────────────────────────────────────

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    name: 'Mme Dupont',
    role: 'CM2 B — Professeur principal',
    lastMessage: 'La sortie scolaire est confirmée pour le 15 avril.',
    date: "Aujourd'hui",
    unread: true,
  },
  {
    id: 'conv-2',
    name: 'M. Martin',
    role: 'SVT — 4e C',
    lastMessage: "Le contrôle de SVT aura lieu vendredi.",
    date: 'Hier',
    unread: false,
  },
  {
    id: 'conv-3',
    name: 'Mme Lambert',
    role: 'Français — 4e C',
    lastMessage: 'Excellent travail sur la rédaction !',
    date: 'Lun.',
    unread: false,
  },
];

const MOCK_MOTS: MotLiaison[] = [
  {
    id: 'mot-1',
    title: 'Sortie scolaire du 15 avril',
    deadline: '12/04',
    signed: false,
  },
  {
    id: 'mot-2',
    title: 'Règlement intérieur 2025-2026',
    deadline: null,
    signed: true,
  },
  {
    id: 'mot-3',
    title: 'Autorisation piscine — Printemps',
    deadline: '08/04',
    signed: false,
  },
];

// ─── Component ────────────────────────────────────────────

export default function MessagesListScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;

  return (
    <View style={[styles.root]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ChevronLeft size={24} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10 },
        ]}
      >
        {/* ── Section: Conversations ── */}
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionAccentBar, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.sectionLabel}>Conversations</Text>
        </View>

        {MOCK_CONVERSATIONS.map((conv) => (
          <Pressable
            key={conv.id}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: 8 })}
            accessibilityRole="button"
          >
            <GlassCard borderRadius={14}>
              <View style={styles.convRow}>
                {/* Avatar initial */}
                <View style={styles.convAvatar}>
                  <Text style={styles.convAvatarText}>
                    {conv.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>

                {/* Text */}
                <View style={styles.convBody}>
                  <View style={styles.convTitleRow}>
                    <Text
                      style={[
                        styles.convName,
                        { fontFamily: conv.unread ? FontFamily.sansBold : FontFamily.sansSemiBold },
                      ]}
                      numberOfLines={1}
                    >
                      {conv.name}
                    </Text>
                    <Text style={styles.convDate}>{conv.date}</Text>
                  </View>
                  <Text style={styles.convRole} numberOfLines={1}>{conv.role}</Text>
                  <Text
                    style={[
                      styles.convMessage,
                      { fontFamily: conv.unread ? FontFamily.sansMedium : FontFamily.sansRegular },
                    ]}
                    numberOfLines={1}
                  >
                    {conv.lastMessage}
                  </Text>
                </View>

                {/* Unread dot */}
                {conv.unread && <View style={styles.unreadDot} />}
              </View>
            </GlassCard>
          </Pressable>
        ))}

        {/* ── Section: Mots à signer ── */}
        <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
          <View style={[styles.sectionAccentBar, { backgroundColor: '#FF8C42' }]} />
          <Text style={styles.sectionLabel}>Mots à signer</Text>
        </View>

        {MOCK_MOTS.map((mot) => (
          <Pressable
            key={mot.id}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: 8 })}
            accessibilityRole="button"
          >
            <GlassCard borderRadius={14}>
              <View style={styles.motRow}>
                {/* School icon */}
                <View style={styles.motIconContainer}>
                  <Text style={styles.motIcon}>🏫</Text>
                </View>

                {/* Text */}
                <View style={styles.motBody}>
                  <Text style={styles.motTitle} numberOfLines={1}>{mot.title}</Text>
                  {mot.deadline && !mot.signed && (
                    <Text style={styles.motDeadline}>
                      À signer avant le {mot.deadline}
                    </Text>
                  )}
                </View>

                {/* Status badge */}
                <View
                  style={[
                    styles.motBadge,
                    { backgroundColor: mot.signed ? '#D1FAE5' : '#FEF3C7' },
                  ]}
                >
                  <Text
                    style={[
                      styles.motBadgeText,
                      { color: mot.signed ? '#065F46' : '#92400E' },
                    ]}
                  >
                    {mot.signed ? 'Signé ✓' : 'À signer'}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#F2F2F7',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  headerRight: {
    width: 40,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },

  // ── Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionAccentBar: {
    width: 30,
    height: 3,
    borderRadius: 2,
  },
  sectionLabel: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // ── Conversation card
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  convAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  convAvatarText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#3B82F6',
  },
  convBody: {
    flex: 1,
    gap: 2,
  },
  convTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  convName: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  convDate: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#94A3B8',
    flexShrink: 0,
  },
  convRole: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
  },
  convMessage: {
    fontSize: 13,
    color: '#64748B',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    flexShrink: 0,
  },

  // ── Mot card
  motRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  motIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  motIcon: {
    fontSize: 20,
  },
  motBody: {
    flex: 1,
    gap: 2,
  },
  motTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  motDeadline: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#F59E0B',
  },
  motBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 0,
  },
  motBadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
  },
});
