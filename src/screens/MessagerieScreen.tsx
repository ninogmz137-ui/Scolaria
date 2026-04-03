/**
 * MessagerieScreen — Unified message feed merging Notifications + Cahier de Liaison.
 *
 * Structure:
 *   1. 2x2 category cards grid (Messages | École | Absences | Aria)
 *   2. Chronological feed grouped into "Aujourd'hui" and "Plus tôt" sections
 *
 * The FAB opens a bottom sheet with 3 actions:
 *   1. Envoyer un message à l'enseignant (coming soon)
 *   2. Contacter l'établissement (coming soon)
 *   3. Signaler une absence → navigate to SignalerAbsenceScreen
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Papicons } from '@getpapillon/papicons';
import { useActiveChild } from '../contexts/ActiveChildContext';
import AriaSparkleIcon from '../components/AriaSparkleIcon';
import { FontFamily } from '../hooks/useSolariaFonts';
import GlassCard from '../components/GlassCard';
import { getGrades, getAgendaEvents } from '../services/database';
import { getParentMots } from '../services/liaisonService';
import { getStudentAbsences } from '../services/absenceService';

// ─── Constants ────────────────────────────────────────────

const ACCENT = '#3B82F6';
/** Matches FLOATING_TAB_BAR_HEIGHT in FloatingTabBar.tsx */
const TAB_BAR_H = 100;

// ─── Types ────────────────────────────────────────────────

type MessagerieItemType = 'liaison' | 'note' | 'agenda' | 'aria' | 'absence';

interface MessagerieItem {
  id: string;
  type: MessagerieItemType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  /** ISO date string used for grouping, not rendered */
  _isoDate: string;
}

// ─── Type config — Papicons icon names and colors ─────────

const TYPE_CONFIG: Record<MessagerieItemType, { icon: string; color: string }> = {
  liaison: { icon: 'Paper',    color: '#FF8C42' },
  note:    { icon: 'Grades',   color: '#A78BFA' },
  agenda:  { icon: 'Calendar', color: '#10B981' },
  absence: { icon: 'Warning',  color: '#EF4444' },
  aria:    { icon: 'Sparkles', color: '#6366F1' },
};

// ─── FAB action config ────────────────────────────────────

interface FabAction {
  icon: string;
  color: string;
  label: string;
  onPress: () => void;
}

// ─── Mock data fallback ───────────────────────────────────

function getPastIso(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString();
}

function getMockItems(): { today: MessagerieItem[]; earlier: MessagerieItem[] } {
  const todayIso = new Date().toISOString().split('T')[0];

  const allToday: MessagerieItem[] = [
    {
      id: 'mock-1',
      type: 'liaison',
      title: 'Nouveau mot',
      message: 'Sortie scolaire du 15 avril — autorisation à signer',
      time: '14h30',
      read: false,
      _isoDate: `${todayIso}T14:30:00`,
    },
    {
      id: 'mock-2',
      type: 'aria',
      title: 'Aria · Synthèse',
      message: 'La synthèse du jour est disponible',
      time: '08h00',
      read: false,
      _isoDate: `${todayIso}T08:00:00`,
    },
    {
      id: 'mock-3',
      type: 'agenda',
      title: 'Rappel',
      message: 'Contrôle de Maths demain',
      time: '07h30',
      read: true,
      _isoDate: `${todayIso}T07:30:00`,
    },
  ];

  const allEarlier: MessagerieItem[] = [
    {
      id: 'mock-4',
      type: 'note',
      title: 'Nouvelle note',
      message: 'Français — Dictée : 14/20',
      time: 'Hier',
      read: true,
      _isoDate: getPastIso(1),
    },
    {
      id: 'mock-5',
      type: 'liaison',
      title: 'Mot signé',
      message: 'Le mot « Piscine » a été signé avec succès',
      time: 'Hier',
      read: true,
      _isoDate: getPastIso(1),
    },
    {
      id: 'mock-6',
      type: 'absence',
      title: 'Absence prise en compte',
      message: "Absence du 25/03 validée par l'école",
      time: 'Lun.',
      read: true,
      _isoDate: getPastIso(2),
    },
  ];

  const filterValid = (arr: MessagerieItem[]) =>
    arr.filter((item) => item.title && item.title.trim() !== '' && item.message && item.message.trim() !== '');

  return { today: filterValid(allToday), earlier: filterValid(allEarlier) };
}

// ─── Date formatting helpers ──────────────────────────────

function formatTime(isoString: string): string {
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

// ─── Component ────────────────────────────────────────────

export default function MessagerieScreen() {
  const { selectedChild } = useActiveChild();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const TOPBAR_H = insets.top + 56;

  // ─── State ──────────────────────────────────────────────

  const initMock = getMockItems();
  const [todayItems, setTodayItems]     = useState<MessagerieItem[]>(initMock.today);
  const [earlierItems, setEarlierItems] = useState<MessagerieItem[]>(initMock.earlier);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  // Bottom sheet slide animation
  const sheetAnim = useRef(new Animated.Value(320)).current;
  // FAB rotation animation
  const fabRotation = useRef(new Animated.Value(0)).current;

  // ─── FAB sheet helpers ───────────────────────────────────

  const openFab = useCallback(() => {
    setFabOpen(true);
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(fabRotation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [sheetAnim, fabRotation]);

  const closeFab = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetAnim, {
        toValue: 320,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fabRotation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setFabOpen(false));
  }, [sheetAnim, fabRotation]);

  // ─── Data loading ────────────────────────────────────────

  const loadData = useCallback(async (childId: string) => {
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

    const items: MessagerieItem[] = [];

    // Mots de liaison (all, preserving read state)
    if (motsResult.status === 'fulfilled') {
      const mots = motsResult.value.data ?? [];
      for (const mot of mots) {
        const isoDate = (mot.date_envoi ?? '').includes('T')
          ? mot.date_envoi
          : `${mot.date_envoi}T09:00:00`;
        // Use first non-empty line of contenu as message preview
        const preview = mot.contenu.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? mot.titre;
        items.push({
          id: `liaison-${mot.id}`,
          type: 'liaison',
          title: mot.titre,
          message: preview,
          time: formatTime(isoDate),
          read: mot.is_read,
          _isoDate: isoDate,
        });
      }
    }

    // Recent grades (last 3 days)
    if (gradesResult.status === 'fulfilled') {
      const grades = (gradesResult.value.data ?? []) as any[];
      for (const grade of grades) {
        const gradeDate: string = grade.date ?? '';
        if (gradeDate >= threeDaysAgoStr) {
          const gradeValue = grade.value ?? grade.note;
          const subjectName = (grade.subjects as any)?.name;
          // Skip rows where both subject and value are missing — nothing useful to show
          if (!subjectName && (gradeValue === null || gradeValue === undefined)) continue;
          const displaySubject = subjectName || 'Matière';
          const displayValue   = gradeValue  !== null && gradeValue !== undefined ? String(gradeValue) : '?';
          const displayMax     = grade.max_value ?? 20;
          const message        = `${displaySubject} — ${displayValue}/${displayMax}`;
          const isoDate = gradeDate.includes('T') ? gradeDate : `${gradeDate}T10:00:00`;
          items.push({
            id: `note-${grade.id}`,
            type: 'note',
            title: 'Nouvelle note',
            message,
            time: formatTime(isoDate),
            read: true,
            _isoDate: isoDate,
          });
        }
      }
    }

    // Today's agenda events
    if (agendaResult.status === 'fulfilled') {
      const events = (agendaResult.value.data ?? []) as any[];
      for (const event of events) {
        const startTime: string = event.start_time ?? '';
        if (startTime.split('T')[0] === todayStr) {
          // Skip events with a missing or blank title — would produce "Rappel — undefined"
          if (!event.title || (typeof event.title === 'string' && event.title.trim() === '')) continue;
          items.push({
            id: `agenda-${event.id}`,
            type: 'agenda',
            title: 'Rappel',
            message: `Rappel — ${event.title}`,
            time: formatTime(startTime),
            read: true,
            _isoDate: startTime,
          });
        }
      }
    }

    // Recent absences
    if (absencesResult.status === 'fulfilled') {
      const absences = absencesResult.value as any[];
      for (const absence of absences) {
        // Skip rows with no start date — we can't place or label them
        if (!absence.date_debut) continue;
        const isoDate: string = absence.created_at ?? `${absence.date_debut}T08:00:00`;
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
            time: formatTime(isoDate),
            read: true,
            _isoDate: isoDate,
          });
        }
      }
    }

    // Fall back to mock when nothing loaded from services
    if (items.length === 0) {
      const mock = getMockItems();
      setTodayItems(mock.today);
      setEarlierItems(mock.earlier);
      return;
    }

    // Sort descending, strip entries with missing title/message
    items.sort((a, b) => b._isoDate.localeCompare(a._isoDate));
    const valid = items.filter((n) => n.title && n.message);

    setTodayItems(valid.filter((n) => isToday(n._isoDate)));
    setEarlierItems(valid.filter((n) => !isToday(n._isoDate)));
  }, []);

  useEffect(() => {
    loadData(selectedChild.id);
  }, [selectedChild.id, loadData]);

  // ─── Mark read ───────────────────────────────────────────

  const markRead = useCallback((id: string) => {
    setTodayItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setEarlierItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const handleItemPress = useCallback(
    (item: MessagerieItem) => {
      markRead(item.id);
      switch (item.type) {
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
    },
    [markRead, navigation],
  );

  // ─── Derived values ──────────────────────────────────────

  const allItems = [...todayItems, ...earlierItems];

  const unreadCount =
    todayItems.filter((n) => !n.read).length +
    earlierItems.filter((n) => !n.read).length;

  const hasUnread = unreadCount > 0;

  // Category counts
  const messagesCount = allItems.filter((n) => n.type === 'liaison').length;
  const absencesCount = allItems.filter((n) => n.type === 'absence').length;
  const ariaUnreadCount = allItems.filter((n) => n.type === 'aria' && !n.read).length;

  // Double-filter: strip any items with empty/null/sentinel title or message at render time
  const safeFilter = (arr: MessagerieItem[]) =>
    arr.filter((n) => {
      const t = typeof n.title   === 'string' ? n.title.trim()   : '';
      const m = typeof n.message === 'string' ? n.message.trim() : '';
      if (!t || !m) return false;
      if (t === 'undefined' || t === 'null') return false;
      if (m === 'undefined' || m === 'null') return false;
      // Reject messages that are only separators — result of failed data interpolation
      if (/^[\s\u2014\-\/]+$/.test(m)) return false;
      return true;
    });
  const visibleToday   = safeFilter(showUnreadOnly ? todayItems.filter((n) => !n.read) : todayItems);
  const visibleEarlier = safeFilter(showUnreadOnly ? earlierItems.filter((n) => !n.read) : earlierItems);
  const isEmpty        = visibleToday.length === 0 && visibleEarlier.length === 0;

  // FAB icon rotation interpolation
  const fabIconRotate = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  // ─── FAB actions ─────────────────────────────────────────

  const fabActions: FabAction[] = [
    {
      icon: 'TextBubble',
      color: ACCENT,
      label: "Envoyer un message à l'enseignant",
      onPress: () => {
        closeFab();
        setTimeout(
          () => Alert.alert('Bientôt disponible', 'La messagerie bidirectionnelle arrivera prochainement.'),
          300,
        );
      },
    },
    {
      icon: 'Mail',
      color: '#10B981',
      label: "Contacter l'établissement",
      onPress: () => {
        closeFab();
        setTimeout(
          () => Alert.alert('Bientôt disponible', "La messagerie vers l'établissement arrivera prochainement."),
          300,
        );
      },
    },
    {
      icon: 'Tasks',
      color: '#EF4444',
      label: 'Signaler une absence',
      onPress: () => {
        closeFab();
        setTimeout(() => navigation.navigate('Accueil', { screen: 'SignalerAbsenceScreen' }), 300);
      },
    },
  ];

  // ─── Render ───────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: '#F2F2F7' }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: TOPBAR_H + 12 }]}
      >
        {/* ── Page header ── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Messagerie</Text>
          <Pressable
            onPress={() => setShowUnreadOnly((v) => !v)}
            style={({ pressed }) => [styles.bellButton, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={
              showUnreadOnly ? 'Afficher tous les messages' : 'Afficher uniquement les non lus'
            }
          >
            <Papicons name="Bell" size={22} color={hasUnread ? ACCENT : '#CCCCCC'} />
            {hasUnread && <View style={styles.bellDot} />}
          </Pressable>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {unreadCount > 0
            ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`
            : 'Tout est à jour'}
        </Text>

        {/* ── Category cards grid 2x2 ── */}
        <View style={styles.categoryGrid}>
          {/* Row 1 */}
          <View style={styles.categoryRow}>
            {/* Messages */}
            <CategoryCard
              onPress={() => navigation.navigate('Accueil', { screen: 'MessagesListScreen' })}
              iconContent={<Text style={styles.categoryEmoji}>💬</Text>}
              iconBg="#EFF6FF"
              label="Messages"
              sublabel={messagesCount > 0 ? `${messagesCount} conversation${messagesCount > 1 ? 's' : ''}` : 'Conversations'}
              badgeCount={allItems.filter((n) => n.type === 'liaison' && !n.read).length}
              badgeColor="#EF4444"
            />
            {/* École */}
            <CategoryCard
              onPress={() => navigation.navigate('Accueil', { screen: 'EcoleListScreen' })}
              iconContent={<Text style={styles.categoryEmoji}>🏫</Text>}
              iconBg="#F0FDF4"
              label="École"
              sublabel="Infos & annonces"
              badgeCount={0}
              badgeColor={ACCENT}
            />
          </View>

          {/* Row 2 */}
          <View style={styles.categoryRow}>
            {/* Absences */}
            <CategoryCard
              onPress={() => navigation.navigate('Accueil', { screen: 'AbsencesListScreen' })}
              iconContent={<Text style={styles.categoryEmoji}>📋</Text>}
              iconBg="#FFF7ED"
              label="Absences"
              sublabel={absencesCount > 0 ? `${absencesCount} signalée${absencesCount > 1 ? 's' : ''}` : 'Historique'}
              badgeCount={absencesCount}
              badgeColor="#EF4444"
            />
            {/* Aria */}
            <CategoryCard
              onPress={() => navigation.navigate('Aria')}
              iconContent={<AriaSparkleIcon size={28} />}
              iconBg="#EEF2FF"
              label="Aria"
              sublabel="Synthèses & conseils"
              badgeCount={ariaUnreadCount}
              badgeColor="#6366F1"
            />
          </View>
        </View>

        {/* ── Divider before feed ── */}
        <View style={styles.feedDivider} />

        {/* ── Empty state ── */}
        {isEmpty && (
          <View style={styles.emptyState}>
            <Papicons name="Mail" size={48} color="#94A3B8" />
            <Text style={styles.emptyText}>Aucun message</Text>
          </View>
        )}

        {/* ── Aujourd'hui section ── */}
        {visibleToday.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionAccentBar, { backgroundColor: ACCENT }]} />
              <Text style={styles.sectionLabel}>Aujourd'hui</Text>
            </View>
            {visibleToday.map((item) => (
              <MessageCard key={item.id} item={item} onPress={handleItemPress} />
            ))}
          </>
        )}

        {/* ── Plus tôt section ── */}
        {visibleEarlier.length > 0 && (
          <>
            <View style={[styles.sectionHeaderRow, styles.sectionHeaderRowLater]}>
              <View
                style={[styles.sectionAccentBar, { backgroundColor: 'rgba(203,213,225,0.7)' }]}
              />
              <Text style={[styles.sectionLabel, styles.sectionLabelLater]}>Plus tôt</Text>
            </View>
            {visibleEarlier.map((item) => (
              <MessageCard key={item.id} item={item} onPress={handleItemPress} />
            ))}
          </>
        )}

        {/* Extra bottom clearance above FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <Pressable
        onPress={fabOpen ? closeFab : openFab}
        style={({ pressed }) => [
          styles.fab,
          fabOpen && styles.fabOpen,
          { bottom: TAB_BAR_H, opacity: pressed ? 0.85 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={fabOpen ? 'Fermer' : 'Nouveau message'}
      >
        <Animated.View style={{ transform: [{ rotate: fabIconRotate }] }}>
          <Papicons name="Plus" size={24} color="#FFFFFF" />
        </Animated.View>
      </Pressable>

      {/* ── FAB bottom sheet ── */}
      {fabOpen && (
        <Modal
          visible={fabOpen}
          transparent
          animationType="none"
          onRequestClose={closeFab}
        >
          {/* Tapping the overlay closes the sheet */}
          <Pressable style={styles.overlay} onPress={closeFab}>
            {/* Inner Pressable prevents overlay close when tapping sheet content */}
            <Animated.View
              style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}
            >
              <Pressable>
                {/* Drag handle */}
                <View style={styles.sheetHandle} />

                {/* Action rows */}
                {fabActions.map((action) => (
                  <Pressable
                    key={action.label}
                    onPress={action.onPress}
                    style={({ pressed }) => [styles.fabRow, { opacity: pressed ? 0.75 : 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    <View
                      style={[styles.fabRowIcon, { backgroundColor: action.color + '18' }]}
                    >
                      <Papicons name={action.icon} size={20} color={action.color} />
                    </View>
                    <Text style={styles.fabRowLabel}>{action.label}</Text>
                  </Pressable>
                ))}

                {/* Cancel */}
                <Pressable
                  onPress={closeFab}
                  style={({ pressed }) => [styles.cancelButton, { opacity: pressed ? 0.7 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Annuler"
                >
                  <Papicons name="Cross" size={16} color="#64748B" />
                  <Text style={styles.cancelText}>Annuler</Text>
                </Pressable>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ─── CategoryCard ────────────────────────────────────────

interface CategoryCardProps {
  onPress: () => void;
  iconContent: React.ReactNode;
  iconBg: string;
  label: string;
  sublabel: string;
  badgeCount: number;
  badgeColor: string;
}

function CategoryCard({
  onPress,
  iconContent,
  iconBg,
  label,
  sublabel,
  badgeCount,
  badgeColor,
}: CategoryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.categoryCard, { opacity: pressed ? 0.8 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <GlassCard borderRadius={16} style={styles.categoryCardInner}>
        <View style={styles.categoryCardContent}>
          {/* Icon container */}
          <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
            <View style={[styles.categoryIconBox, { backgroundColor: iconBg }]}>
              {iconContent}
            </View>
            {/* Badge */}
            {badgeCount > 0 && (
              <View style={[styles.categoryBadge, { backgroundColor: badgeColor }]}>
                <Text style={styles.categoryBadgeText}>
                  {badgeCount > 9 ? '9+' : String(badgeCount)}
                </Text>
              </View>
            )}
          </View>

          {/* Labels */}
          <Text style={styles.categoryLabel} numberOfLines={1}>{label}</Text>
          <Text style={styles.categorySublabel} numberOfLines={1}>{sublabel}</Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

// ─── MessageCard ─────────────────────────────────────────

interface MessageCardProps {
  item: MessagerieItem;
  onPress: (item: MessagerieItem) => void;
}

function MessageCard({ item, onPress }: MessageCardProps) {
  // Safety check — skip cards with missing data
  if (!item.title || !item.message) return null;

  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.aria;

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1, marginBottom: 8 })}
      accessibilityRole="button"
    >
      <GlassCard
        noPadding
        borderRadius={14}
        style={{ borderLeftWidth: 3, borderLeftColor: item.read ? cfg.color + '4D' : cfg.color }}
      >
        <View style={styles.cardInner}>
          {/* Type icon — Aria gets gradient circle, others get flat tinted circle */}
          {item.type === 'aria' ? (
            <AriaSparkleIcon size={36} />
          ) : (
            <View style={[styles.iconCircle, { backgroundColor: cfg.color + '20' }]}>
              <Papicons name={cfg.icon} size={18} color={cfg.color} />
            </View>
          )}

          {/* Text content */}
          <View style={styles.cardBody}>
            <View style={styles.cardTitleRow}>
              <Text
                style={[
                  styles.cardTitle,
                  {
                    fontFamily: item.read ? FontFamily.sansSemiBold : FontFamily.sansBold,
                  },
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={styles.cardTime}>{item.time}</Text>
            </View>
            <Text style={styles.cardMessage} numberOfLines={2}>
              {item.message}
            </Text>
          </View>

          {/* Unread dot */}
          {!item.read && <View style={styles.unreadDot} />}
        </View>
      </GlassCard>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 120,
  },

  // ── Page header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pageTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 28,
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  bellButton: {
    position: 'relative',
    padding: 6,
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },

  // ── Category grid
  categoryGrid: {
    gap: 10,
    marginBottom: 20,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
  },
  categoryCardInner: {
    // GlassCard handles the white bg, borderRadius prop is passed directly
  },
  categoryCardContent: {
    padding: 14,
    gap: 6,
  },
  categoryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#0F172A',
  },
  categorySublabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
  },
  categoryBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
    color: '#FFFFFF',
    lineHeight: 12,
  },

  // ── Feed divider
  feedDivider: {
    height: 1,
    backgroundColor: 'rgba(203,213,225,0.5)',
    marginBottom: 16,
  },

  // ── Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionHeaderRowLater: {
    marginTop: 12,
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
  sectionLabelLater: {
    color: '#94A3B8',
  },

  // ── Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: '#94A3B8',
  },

  // ── Message card
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  cardTime: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#94A3B8',
    flexShrink: 0,
  },
  cardMessage: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginTop: 4,
    flexShrink: 0,
  },

  // ── FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    // elevation: 0 — avoids grey outlines on Android
    elevation: 0,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabOpen: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },

  // ── FAB sheet / modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  fabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  fabRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabRowLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: '#0F172A',
    flex: 1,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  cancelText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: '#64748B',
  },
});
