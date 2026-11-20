/**
 * MessagesListScreen — Teacher conversations + mots du cahier de liaison.
 *
 * Sections:
 *   1. Conversations — mock teacher threads
 *   (les mots du cahier de liaison sont dans Messages › Général, B4a)
 *
 */

import { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { getConversations } from '../../stores/messagerieStore';
import { ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { getBottomBarScrollPadding } from '../../components/navigation/BottomBar';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { useDemoData } from '../../contexts/DemoContext';
import { SCREEN_BACKGROUND } from '../../constants/colors';
import { nativeWhiteInteractiveShadow } from '../../constants/theme';
import { Text, Pressable } from '../../components/ui';

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
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { selectedChild } = useActiveChild();
  const {
    isDemoMode,
    getTeachers: getDemoTeachers,
    getMessages: getDemoMessages,
  } = useDemoData();
  const [teacherModalVisible, setTeacherModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.openCompose) {
        setTeacherModalVisible(true);
        navigation.setParams({ openCompose: undefined } as never);
      }
    }, [navigation, route.params?.openCompose]),
  );

  // In demo mode, use filtered teachers for the selected child
  // Compte réel : rien de fictif (les données réelles arriveront avec B4).
  const teachers = isDemoMode && selectedChild
    ? getDemoTeachers(selectedChild.id).map((t) => ({
        id: t.id,
        name: t.name,
        subject: `${t.role} — ${t.class}`,
      }))
    : [];

  // In demo mode, use filtered conversations for the selected child
  const conversations: Conversation[] = isDemoMode && selectedChild
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
    : [];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: getBottomBarScrollPadding(insets.bottom) },
        ]}
      >
        {/* ── Section: Conversations ── */}
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionAccentBar, { backgroundColor: '#4338CA' }]} />
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
                  ellipsizeMode="tail"
                >
                  {conv.name}
                </Text>
                <Text
                  style={styles.convDate}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {conv.date}
                </Text>
              </View>
              <Text
                style={styles.convRole}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
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
                ellipsizeMode="tail"
              >
                {conv.lastMessage}
              </Text>
            </View>
          </Pressable>
        ))}

      </ScrollView>

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
                      const list = selectedChild ? getConversations(selectedChild.id) : [];
                      const match =
                        list.find((c) => c.name.trim() === teacher.name.trim()) ??
                        list.find((c) => c.avatarType === 'initials');
                      if (match) {
                        navigation.navigate('ConversationDetailScreen', {
                          conversationId: match.id,
                        });
                      }
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
                    <View style={styles.teacherTextCol}>
                      <Text
                        style={styles.teacherName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {teacher.name}
                      </Text>
                      <Text
                        style={styles.teacherSubject}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {teacher.subject}
                      </Text>
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
    backgroundColor: SCREEN_BACKGROUND,
    maxWidth: '100%',
    overflow: 'hidden',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    maxWidth: '100%',
  },

  // ── Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionSecond: {
    marginTop: 24,
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
    borderWidth: 0,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    maxWidth: '100%',
    overflow: 'hidden',
    ...nativeWhiteInteractiveShadow,
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
    backgroundColor: '#4338CA',
    position: 'absolute',
    top: 0,
    right: 0,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // ── Conversation text
  convBody: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    gap: 2,
  },
  convTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minWidth: 0,
    maxWidth: '100%',
  },
  convName: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: '#1A2340',
  },
  convDate: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#CBD5E1',
    flexShrink: 0,
    maxWidth: '40%',
  },
  convRole: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
  },
  convMessage: {
    fontSize: 13,
    minWidth: 0,
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
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
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
    backgroundColor: SCREEN_BACKGROUND,
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
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F5',
    maxWidth: '100%',
    overflow: 'hidden',
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
  teacherTextCol: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    gap: 2,
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
