/**
 * NotificationsScreen — List of notifications for the selected child.
 *
 * Accessible via the bell icon in the topbar.
 * Displays mock notifications grouped by date.
 */

import { useState, useEffect, useCallback } from 'react';
import { ScrollView, Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import DecorativeBlobs from '../components/DecorativeBlobs';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { getGrades, getAgendaEvents } from '../services/database';
import { getParentMots } from '../services/liaisonService';
import { getStudentAbsences } from '../services/absenceService';

// ─── Helpers ─────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 20 },
}) as Record<string, any>;

// ─── Mock notifications ──────────────────────────────────

interface Notification {
  id: string;
  type: 'liaison' | 'note' | 'agenda' | 'aria' | 'absence';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const NOTIF_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  liaison: { icon: 'book', color: '#FF8C42' },
  note: { icon: 'bar-chart', color: '#A78BFA' },
  agenda: { icon: 'calendar', color: '#10B981' },
  aria: { icon: 'sparkles', color: '#6366F1' },
  absence: { icon: 'medical', color: '#EF4444' },
};

function getMockNotifications(childId: string): { today: Notification[]; earlier: Notification[] } {
  const today: Notification[] = [
    { id: '1', type: 'liaison', title: 'Nouveau mot', message: 'Sortie scolaire du 15 avril — autorisation à signer', time: '14h30', read: false },
    { id: '2', type: 'aria', title: 'Aria · Synthèse', message: 'La synthèse du jour est disponible', time: '08h00', read: false },
    { id: '3', type: 'agenda', title: 'Rappel', message: 'Contrôle de Maths demain', time: '07h30', read: true },
  ];

  const earlier: Notification[] = [
    { id: '4', type: 'note', title: 'Nouvelle note', message: 'Français — Dictée : 14/20', time: 'Hier', read: true },
    { id: '5', type: 'liaison', title: 'Mot signé', message: 'Le mot « Piscine » a été signé avec succès', time: 'Hier', read: true },
    { id: '6', type: 'absence', title: 'Absence prise en compte', message: 'Absence du 25/03 validée par l\'école', time: 'Lun.', read: true },
  ];

  return { today, earlier };
}

// Internal type used only during aggregation — carries a sortable ISO date
// that is stripped before the items reach state.
type NotificationWithDate = Notification & { _isoDate: string };

// ─── Date formatting helpers ─────────────────────────────

function formatNotifTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const dateStr = isoString.split('T')[0];

  if (dateStr === todayStr) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}h${mm}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Hier';

  const DAY_LABELS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
  return DAY_LABELS[date.getDay()];
}

function isToday(isoString: string): boolean {
  const now = new Date();
  return isoString.split('T')[0] === now.toISOString().split('T')[0];
}

// ─── Component ──────────────────────────────────────────

export default function NotificationsScreen() {
  const { theme } = useChildTheme();
  const { selectedChild } = useActiveChild();
  const accent = theme.accent;
  const navigation = useNavigation<any>();

  const [today, setToday] = useState<Notification[]>([]);
  const [earlier, setEarlier] = useState<Notification[]>([]);

  const loadNotifications = useCallback(async (childId: string) => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = todayStart.toISOString().split('T')[0];

    const [motsResult, gradesResult, agendaResult, absencesResult] = await Promise.allSettled([
      getParentMots(childId),
      getGrades(childId, { limit: 20 }),
      getAgendaEvents(childId, { startDate: todayStr }),
      getStudentAbsences(childId),
    ]);

    const items: NotificationWithDate[] = [];

    // Unsigned mots → unread liaison notifications
    if (motsResult.status === 'fulfilled') {
      const mots = motsResult.value.data ?? [];
      for (const mot of mots) {
        if (mot.requires_signature && !mot.is_signed) {
          const isoDate = (mot.date_envoi ?? '').includes('T')
            ? mot.date_envoi
            : `${mot.date_envoi}T09:00:00`;
          items.push({
            id: `liaison-${mot.id}`,
            type: 'liaison',
            title: 'Nouveau mot',
            message: mot.titre,
            time: formatNotifTime(isoDate),
            read: false,
            _isoDate: isoDate,
          });
        }
      }
    }

    // Recent grades (last 3 days) → read note notifications
    if (gradesResult.status === 'fulfilled') {
      const grades = (gradesResult.value.data ?? []) as any[];
      for (const grade of grades) {
        const gradeDate = grade.date ?? '';
        if (gradeDate >= threeDaysAgoStr) {
          const subjectName = (grade.subjects as any)?.name ?? 'Matière';
          const isoDate = gradeDate.includes('T') ? gradeDate : `${gradeDate}T10:00:00`;
          items.push({
            id: `note-${grade.id}`,
            type: 'note',
            title: 'Nouvelle note',
            message: `${subjectName} — ${grade.value}/${grade.max_value ?? 20}`,
            time: formatNotifTime(isoDate),
            read: true,
            _isoDate: isoDate,
          });
        }
      }
    }

    // Today's agenda events → read agenda reminders
    if (agendaResult.status === 'fulfilled') {
      const events = (agendaResult.value.data ?? []) as any[];
      for (const event of events) {
        const startTime: string = event.start_time ?? '';
        if (startTime.split('T')[0] === todayStr) {
          items.push({
            id: `agenda-${event.id}`,
            type: 'agenda',
            title: 'Rappel',
            message: `Rappel — ${event.title}`,
            time: formatNotifTime(startTime),
            read: true,
            _isoDate: startTime,
          });
        }
      }
    }

    // Recent absences → read absence notifications
    if (absencesResult.status === 'fulfilled') {
      const absences = absencesResult.value as any[];
      for (const absence of absences) {
        const isoDate = absence.created_at ?? `${absence.date_debut}T08:00:00`;
        const dateStr = isoDate.split('T')[0];
        if (dateStr >= threeDaysAgoStr) {
          const motifLabel = absence.motif
            ? absence.motif.charAt(0).toUpperCase() + absence.motif.slice(1).replace(/_/g, ' ')
            : 'Absence';
          items.push({
            id: `absence-${absence.id}`,
            type: 'absence',
            title: 'Absence',
            message: `Absence ${absence.statut} — ${motifLabel}`,
            time: formatNotifTime(isoDate),
            read: true,
            _isoDate: isoDate,
          });
        }
      }
    }

    // If all sources are empty, fall back to mock
    if (items.length === 0) {
      const mock = getMockNotifications(childId);
      setToday(mock.today);
      setEarlier(mock.earlier);
      return;
    }

    // Sort all by date descending
    items.sort((a, b) => b._isoDate.localeCompare(a._isoDate));

    // Split into today / earlier — strip _isoDate before storing in state
    const todayItems: Notification[] = items
      .filter((n) => isToday(n._isoDate))
      .map(({ _isoDate, ...rest }) => rest);
    const earlierItems: Notification[] = items
      .filter((n) => !isToday(n._isoDate))
      .map(({ _isoDate, ...rest }) => rest);

    setToday(todayItems);
    setEarlier(earlierItems);
  }, []);

  useEffect(() => {
    loadNotifications(selectedChild.id);
  }, [selectedChild.id, loadNotifications]);

  const markRead = useCallback((id: string) => {
    setToday((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setEarlier((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const handleNotifPress = useCallback((notif: Notification) => {
    markRead(notif.id);
    switch (notif.type) {
      case 'liaison':
        navigation.navigate('Accueil', { screen: 'CahierLiaisonScreen' });
        break;
      case 'note':
        navigation.navigate('Notes');
        break;
      case 'agenda':
        navigation.navigate('Agenda');
        break;
      case 'absence':
        navigation.navigate('Accueil', { screen: 'SignalerAbsenceScreen' });
        break;
      case 'aria':
        navigation.navigate('Aria');
        break;
    }
  }, [markRead, navigation]);

  const unreadCount = today.filter((n) => !n.read).length + earlier.filter((n) => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#E8EDF5' }}>
      {/* Header */}
      <LinearGradient
        colors={['#0B1628', accent + 'DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 28,
          paddingBottom: 24,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          overflow: 'hidden',
        }}
      >
        <DecorativeBlobs accent={accent} size={80} opacity={0.15} />

        <HStack className="items-center" style={{ gap: 10, marginBottom: 4 }}>
          <Ionicons name="notifications" size={22} color="#FFFFFF" />
          <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 22, color: '#FFFFFF' }}>
            Notifications
          </Text>
        </HStack>
        <Text style={{ fontFamily: FontFamily.sansRegular, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
          {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
        </Text>
      </LinearGradient>

      {/* Content */}
      <View style={{ flex: 1, position: 'relative' }}>
        <DecorativeBlobs accent={accent} size={70} opacity={0.08} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 18, paddingTop: 20, paddingBottom: 32, gap: 12 }}
        >
          {/* Today */}
          {today.length > 0 && (
            <>
              <HStack className="items-center" style={{ gap: 8, marginBottom: 2 }}>
                <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: accent }} />
                <Text style={{
                  fontFamily: FontFamily.sansBold,
                  fontSize: 13,
                  color: '#0F172A',
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                }}>
                  Aujourd'hui
                </Text>
              </HStack>
              {today.map((notif) => (
                <NotifCard key={notif.id} notif={notif} accent={accent} onPress={handleNotifPress} />
              ))}
            </>
          )}

          {/* Earlier */}
          {earlier.length > 0 && (
            <>
              <HStack className="items-center" style={{ gap: 8, marginTop: 8, marginBottom: 2 }}>
                <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: '#CBD5E1' }} />
                <Text style={{
                  fontFamily: FontFamily.sansBold,
                  fontSize: 13,
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                }}>
                  Plus tôt
                </Text>
              </HStack>
              {earlier.map((notif) => (
                <NotifCard key={notif.id} notif={notif} accent={accent} onPress={handleNotifPress} />
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── NotifCard ──────────────────────────────────────────

function NotifCard({ notif, accent, onPress }: {
  notif: Notification;
  accent: string;
  onPress: (notif: Notification) => void;
}) {
  const cfg = NOTIF_ICONS[notif.type] ?? NOTIF_ICONS.aria;

  return (
    <Pressable
      onPress={() => onPress(notif)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
      })}
    >
    <HStack
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        gap: 12,
        alignItems: 'flex-start',
        borderLeftWidth: notif.read ? 0 : 3,
        borderLeftColor: accent,
        ...CARD_SHADOW,
      }}
    >
      {/* Icon */}
      <Box
        className="items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: cfg.color + '15',
        }}
      >
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </Box>

      {/* Content */}
      <VStack style={{ flex: 1, gap: 2 }}>
        <HStack className="items-center justify-between">
          <Text style={{
            fontFamily: notif.read ? FontFamily.sansSemiBold : FontFamily.sansBold,
            fontSize: 14,
            color: '#0F172A',
          }}>
            {notif.title}
          </Text>
          <Text style={{ fontFamily: FontFamily.sansRegular, fontSize: 11, color: '#94A3B8' }}>
            {notif.time}
          </Text>
        </HStack>
        <Text style={{
          fontFamily: FontFamily.sansRegular,
          fontSize: 13,
          color: '#64748B',
          lineHeight: 18,
        }}>
          {notif.message}
        </Text>
      </VStack>

      {/* Unread dot */}
      {!notif.read && (
        <Box
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: accent,
            marginTop: 4,
          }}
        />
      )}
    </HStack>
    </Pressable>
  );
}
