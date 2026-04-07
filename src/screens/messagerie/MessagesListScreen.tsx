/**
 * MessagesListScreen — Teacher conversations + mots du cahier de liaison.
 *
 * Sections:
 *   1. Conversations — mock teacher threads
 *   2. Mots à signer — liaison items from mock data
 *
 * FAB (+) bottom-right opens a teacher selection modal to start a new conversation.
 */

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { useDemoData } from '../../contexts/DemoContext';

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

interface Teacher {
  id: string;
  name: string;
  subject: string;
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

const MOCK_TEACHERS: Teacher[] = [
  { id: 't-1', name: 'Mme Dupont', subject: 'Professeur principal — CM2 B' },
  { id: 't-2', name: 'M. Martin', subject: 'SVT — 4e C' },
  { id: 't-3', name: 'Mme Lambert', subject: 'Français — 4e C' },
  { id: 't-4', name: 'M. Leclerc', subject: 'Mathématiques — 4e C' },
  { id: 't-5', name: 'Mme Bernard', subject: 'Anglais — 4e C' },
];

// ─── Helpers ─────────────────────────────────────────────

function formatMessageDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) {
      const dayNames = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
      return dayNames[d.getDay()];
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return isoDate;
  }
}

// Avatar always uses neutral bg per design system — initials in #64748B
function getAvatarColor(_name: string): string {
  return '#E2E8F0';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Component ────────────────────────────────────────────

export default function MessagesListScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { selectedChild } = useActiveChild();
  const {
    isDemoMode,
    getTeachers: getDemoTeachers,
    getMots: getDemoMots,
    getMessages: getDemoMessages,
  } = useDemoData();
  const [teacherModalVisible, setTeacherModalVisible] = useState(false);

  // In demo mode, use filtered teachers for the selected child
  const teachers = isDemoMode
    ? getDemoTeachers(selectedChild.id).map((t) => ({
        id: t.id,
        name: t.name,
        subject: `${t.role} — ${t.class}`,
      }))
    : MOCK_TEACHERS;

  // In demo mode, use filtered mots for the selected child
  const mots = isDemoMode
    ? getDemoMots(selectedChild.id).map((m) => ({
        id: m.id,
        title: m.title,
        deadline: m.deadline,
        signed: m.isSigned,
      }))
    : MOCK_MOTS;

  // In demo mode, use filtered conversations for the selected child
  const conversations: Conversation[] = isDemoMode
    ? getDemoMessages(selectedChild.id)
        .filter((m) => m.type === 'conversation')
        .map((m) => ({
          id: m.id,
          name: m.sender,
          role: `${m.senderClass}${m.senderClass && m.senderRole ? ' — ' : ''}${m.senderRole}`,
          lastMessage: m.preview,
          date: formatMessageDate(m.date),
          unread: !m.isRead,
        }))
    : MOCK_CONVERSATIONS;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: 120 },
        ]}
      >
        {/* ── Section: Conversations ── */}
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionAccentBar, { backgroundColor: '#7C3AED' }]} />
          <Text style={styles.sectionLabel}>Conversations</Text>
        </View>

        {conversations.map((conv) => (
          <Pressable
            key={conv.id}
            onPress={() => navigation.navigate('ConversationDetailScreen', { name: conv.name, role: conv.role })}
            style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
            accessibilityRole="button"
          >
            {/* Avatar with color hash */}
            <View
              style={[styles.convAvatar, { backgroundColor: getAvatarColor(conv.name) }]}
            >
              <Text style={styles.convAvatarText}>{getInitials(conv.name)}</Text>
              {conv.unread && <View style={styles.unreadDot} />}
            </View>

            {/* Text column */}
            <View style={styles.convBody}>
              <View style={styles.convTitleRow}>
                <Text
                  style={[
                    styles.convName,
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
                <Text style={styles.convDate}>{conv.date}</Text>
              </View>
              <Text style={styles.convRole} numberOfLines={1}>
                {conv.role}
              </Text>
              <Text
                style={[
                  styles.convMessage,
                  {
                    fontFamily: conv.unread
                      ? FontFamily.sansMedium
                      : FontFamily.sansRegular,
                    color: conv.unread ? '#1A2340' : '#64748B',
                  },
                ]}
                numberOfLines={1}
              >
                {conv.lastMessage}
              </Text>
            </View>
          </Pressable>
        ))}

        {/* ── Section: Mots à signer ── */}
        <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
          <View style={[styles.sectionAccentBar, { backgroundColor: '#FF8C42' }]} />
          <Text style={styles.sectionLabel}>Mots à signer</Text>
        </View>

        {mots.map((mot) => (
          <Pressable
            key={mot.id}
            onPress={() => navigation.navigate('MotDetailScreen', { title: mot.title, signed: mot.signed, deadline: mot.deadline })}
            style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
            accessibilityRole="button"
          >
            {/* Icon circle using neutral bg */}
            <View style={styles.motIconContainer}>
              <Text style={styles.motIconText}>✉</Text>
            </View>

            {/* Text */}
            <View style={styles.motBody}>
              <Text style={styles.motTitle} numberOfLines={1}>
                {mot.title}
              </Text>
              {mot.deadline && !mot.signed && (
                <Text style={styles.motDeadline}>À signer avant le {mot.deadline}</Text>
              )}
            </View>

            {/* Status badge */}
            <View
              style={[
                styles.motBadge,
                { backgroundColor: mot.signed ? '#10B98126' : '#F59E0B26' },
              ]}
            >
              <Text
                style={[
                  styles.motBadgeText,
                  { color: mot.signed ? '#10B981' : '#F59E0B' },
                ]}
              >
                {mot.signed ? 'Signé ✓' : 'À signer'}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Compose FAB ── */}
      <Pressable
        onPress={() => setTeacherModalVisible(true)}
        style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.85 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="Nouveau message"
      >
        <Plus size={22} color="#1A2340" strokeWidth={2} />
      </Pressable>

      {/* ── Teacher selection modal ── */}
      <Modal
        visible={teacherModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTeacherModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setTeacherModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Nouveau message</Text>
                <Text style={styles.modalSubtitle}>Choisir un destinataire</Text>

                {teachers.map((teacher) => (
                  <Pressable
                    key={teacher.id}
                    onPress={() => {
                      setTeacherModalVisible(false);
                      // For now, just close — future: navigate to conversation screen
                    }}
                    style={({ pressed }) => [
                      styles.teacherRow,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View
                      style={[
                        styles.teacherAvatar,
                        { backgroundColor: getAvatarColor(teacher.name) },
                      ]}
                    >
                      <Text style={styles.teacherAvatarText}>
                        {getInitials(teacher.name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.teacherName}>{teacher.name}</Text>
                      <Text style={styles.teacherSubject}>{teacher.subject}</Text>
                    </View>
                    <ChevronRight size={16} color="#94A3B8" strokeWidth={2} />
                  </Pressable>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // ── Generic card (plain white, not glass)
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },

  // ── Conversation avatar
  convAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  convAvatarText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: '#64748B',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
    position: 'absolute',
    top: 0,
    right: 0,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // ── Conversation text
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
    color: '#1A2340',
  },
  convDate: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#CBD5E1',
    flexShrink: 0,
  },
  convRole: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
  },
  convMessage: {
    fontSize: 13,
  },

  // ── Mot icon
  motIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  motIconText: {
    fontSize: 18,
    color: '#F59E0B',
  },
  motBody: {
    flex: 1,
    gap: 2,
  },
  motTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#1A2340',
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

  // ── Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  teacherAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherAvatarText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: '#64748B',
  },
  teacherName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#0F172A',
  },
  teacherSubject: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
  },
});
