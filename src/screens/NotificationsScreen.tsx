/**
 * NotificationsScreen — List of notifications for the selected child.
 *
 * Accessible via the bell icon in the topbar.
 * Displays mock notifications grouped by date.
 */

import { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Papicons } from '@getpapillon/papicons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import WallpaperBackground from '../components/WallpaperBackground';
import GlassCard from '../components/GlassCard';
import ScreenHeader, { HEADER_HEIGHT } from '../components/ScreenHeader';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import { getGrades, getAgendaEvents } from '../services/database';
import { getParentMots } from '../services/liaisonService';
import { getStudentAbsences } from '../services/absenceService';

// ─── Helpers ─────────────────────────────────────────────

const NOTIF_PAPICONS: Record<string, { icon: string; color: string }> = {
  liaison: { icon: 'Paper',    color: '#FF8C42' },
  note:    { icon: 'Grades',   color: '#A78BFA' },
  agenda:  { icon: 'Calendar', color: '#10B981' },
  aria:    { icon: 'Sparkles', color: '#6366F1' },
  absence: { icon: 'Warning',  color: '#EF4444' },
};

// ─── Types ────────────────────────────────────────────────

interface Notification {
  id: string;
  type: 'liaison' | 'note' | 'agenda' | 'aria' | 'absence';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

// Internal type used only during aggregation — carries a sortable ISO date
// that is stripped before the items reach state.
type NotificationWithDate = Notification & { _isoDate: string };

// ─── Mock notifications ──────────────────────────────────

function getMockNotifications(childId: string): { today: Notification[]; earlier: Notification[] } {
  const today: Notification[] = [
    { id: '1', type: 'liaison', title: 'Nouveau mot', message: 'Sortie scolaire du 15 avril — autorisation à signer', time: '14h30', read: false },
    { id: '2', type: 'aria',    title: 'Aria · Synthèse', message: 'La synthèse du jour est disponible', time: '08h00', read: false },
    { id: '3', type: 'agenda',  title: 'Rappel', message: 'Contrôle de Maths demain', time: '07h30', read: true },
  ];

  const earlier: Notification[] = [
    { id: '4', type: 'note',    title: 'Nouvelle note', message: 'Français — Dictée : 14/20', time: 'Hier', read: true },
    { id: '5', type: 'liaison', title: 'Mot signé', message: 'Le mot « Piscine » a été signé avec succès', time: 'Hier', read: true },
    { id: '6', type: 'absence', title: 'Absence prise en compte', message: "Absence du 25/03 validée par l'école", time: 'Lun.', read: true },
  ];

  return { today, earlier };
}

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
  useChildTheme(); // kept for future theme re-integration
  const { selectedChild } = useActiveChild();
  const accent = '#3B82F6';
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;

  // Initialize with mock data so the screen is never blank while loading
  const initMock = getMockNotifications(selectedChild.id);
  const [today, setToday] = useState<Notification[]>(initMock.today);
  const [earlier, setEarlier] = useState<Notification[]>(initMock.earlier);

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

    // Sort all by date descending, then strip any entry missing title or message
    // (can happen when Supabase returns null fields, e.g. mot.titre or event.title)
    items.sort((a, b) => b._isoDate.localeCompare(a._isoDate));
    const validItems = items.filter((n) => n.title && n.message);

    // Split into today / earlier — strip _isoDate before storing in state
    const todayItems: Notification[] = validItems
      .filter((n) => isToday(n._isoDate))
      .map(({ _isoDate, ...rest }) => rest);
    const earlierItems: Notification[] = validItems
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

  // Text colors (all modes are light bg now)
  const titleColor = '#0F172A';
  const subtitleColor = '#64748B';
  const sectionColor = '#0F172A';
  const cardTxt = '#0F172A';
  const cardTxtSec = '#64748B';
  const cardTxtMuted = '#94A3B8';

  return (
    <View style={{ flex: 1 }}>
      <WallpaperBackground />
      <ScreenHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + 12,
          paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10,
          paddingHorizontal: 18,
          gap: 12,
        }}
      >
        {/* Page title */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: titleColor, textShadowColor: 'transparent' }]}>Notifications</Text>
          <Text style={[styles.subtitle, { color: subtitleColor, textShadowColor: 'transparent' }]}>
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
          </Text>
        </View>

        {/* Today */}
        {today.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <View style={[styles.sectionBar, { backgroundColor: accent }]} />
              <Text style={[styles.sectionLabel, { color: sectionColor, textShadowColor: 'transparent' }]}>Aujourd'hui</Text>
            </View>
            {today.map((notif) => (
              <NotifCard key={notif.id} notif={notif} accent={accent} onPress={handleNotifPress} />
            ))}
          </>
        )}

        {/* Earlier */}
        {earlier.length > 0 && (
          <>
            <View style={[styles.sectionRow, { marginTop: 4 }]}>
              <View style={[styles.sectionBar, { backgroundColor: 'rgba(203,213,225,0.7)' }]} />
              <Text style={[styles.sectionLabel, { color: subtitleColor, textShadowColor: 'transparent' }]}>Plus tôt</Text>
            </View>
            {earlier.map((notif) => (
              <NotifCard key={notif.id} notif={notif} accent={accent} onPress={handleNotifPress} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── NotifCard ──────────────────────────────────────────

function NotifCard({ notif, accent, onPress }: {
  notif: Notification;
  accent: string;
  onPress: (notif: Notification) => void;
}) {
  const cText = '#0F172A';
  const cTextSec = '#64748B';
  const cTextMuted = '#94A3B8';
  const cfg = NOTIF_PAPICONS[notif.type] ?? NOTIF_PAPICONS.aria;

  return (
    <Pressable
      onPress={() => onPress(notif)}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <GlassCard
        noPadding
        style={notif.read ? undefined : { borderLeftWidth: 3, borderLeftColor: accent }}
      >
        <View style={styles.cardInner}>
          {/* Icon */}
          <View style={[styles.iconBox, { backgroundColor: cfg.color + '20' }]}>
            <Papicons name={cfg.icon} size={18} color={cfg.color} />
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text style={[
                styles.notifTitle,
                { fontFamily: notif.read ? FontFamily.sansSemiBold : FontFamily.sansBold, color: cText },
              ]}>
                {notif.title}
              </Text>
              <Text style={[styles.notifTime, { color: cTextMuted }]}>{notif.time}</Text>
            </View>
            <Text style={[styles.notifMessage, { color: cTextSec }]}>{notif.message}</Text>
          </View>

          {/* Unread dot */}
          {!notif.read && (
            <View style={[styles.unreadDot, { backgroundColor: accent }]} />
          )}
        </View>
      </GlassCard>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  titleRow: {
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.sansBold,
    fontSize: 26,
    // color + textShadowColor applied inline
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    // color + textShadowColor applied inline
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginTop: 4,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sectionBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  sectionLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    // color + textShadowColor applied inline
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTitle: {
    fontSize: 14,
    // color applied inline
  },
  notifTime: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    // color applied inline
  },
  notifMessage: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 18,
    // color applied inline
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
});
