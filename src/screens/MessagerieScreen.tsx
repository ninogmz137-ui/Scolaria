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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MessageSquarePlus, ChevronRight, MessageCircle, Home, Calendar, FileText, GraduationCap, AlertTriangle, Mail, X, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useActiveChild } from '../contexts/ActiveChildContext';
import AriaSparkleIcon from '../components/AriaSparkleIcon';
import { FontFamily } from '../hooks/useSolariaFonts';
import { getGrades, getAgendaEvents } from '../services/database';
import { getParentMots } from '../services/liaisonService';
import { getStudentAbsences } from '../services/absenceService';
import { useDemoData } from '../contexts/DemoContext';

// ─── Constants ────────────────────────────────────────────

const ACCENT = '#7C3AED';
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

// ─── Type config — lucide icons and colors ────────────────

const TYPE_CONFIG: Record<MessagerieItemType, { Icon: React.ElementType; color: string }> = {
  liaison: { Icon: FileText,       color: '#FF8C42' },
  note:    { Icon: GraduationCap,  color: '#A78BFA' },
  agenda:  { Icon: Calendar,       color: '#10B981' },
  absence: { Icon: AlertTriangle,  color: '#EF4444' },
  aria:    { Icon: Sparkles,       color: '#7C3AED' },
};

// ─── FAB action config ────────────────────────────────────

interface FabAction {
  Icon: React.ElementType;
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
  const { isDemoMode, getMessages: getDemoMessages, getMots: getDemoMots } = useDemoData();
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

  // ─── FAB sheet helpers ───────────────────────────────────

  const openFab = useCallback(() => {
    setFabOpen(true);
    Animated.spring(sheetAnim, {
      toValue: 0,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [sheetAnim]);

  const closeFab = useCallback(() => {
    Animated.timing(sheetAnim, {
      toValue: 320,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setFabOpen(false));
  }, [sheetAnim]);

  // ─── Data loading ────────────────────────────────────────

  const loadData = useCallback(async (childId: string) => {
    // ── Demo mode: load from DemoContext ──
    if (isDemoMode) {
      const messages = getDemoMessages(childId);
      const mots = getDemoMots(childId);
      const items: MessagerieItem[] = [];

      for (const msg of messages) {
        items.push({
          id: `msg-${msg.id}`,
          type: msg.type === 'liaison' ? 'liaison' : msg.type === 'absence' ? 'absence' : msg.type === 'note' ? 'note' : 'aria',
          title: msg.sender,
          message: msg.preview,
          time: formatTime(msg.date),
          read: msg.isRead,
          _isoDate: msg.date,
        });
      }
      for (const mot of mots) {
        if (!mot.isSigned) {
          items.push({
            id: `mot-${mot.id}`,
            type: 'liaison',
            title: 'Mot à signer',
            message: mot.title,
            time: mot.deadline ? formatTime(mot.deadline) : 'Aujourd\'hui',
            read: false,
            _isoDate: mot.deadline || new Date().toISOString(),
          });
        }
      }

      items.sort((a, b) => b._isoDate.localeCompare(a._isoDate));
      if (items.length > 0) {
        setTodayItems(items.filter((n) => isToday(n._isoDate)));
        setEarlierItems(items.filter((n) => !isToday(n._isoDate)));
      } else {
        const mock = getMockItems();
        setTodayItems(mock.today);
        setEarlierItems(mock.earlier);
      }
      return;
    }

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
  }, [isDemoMode, getDemoMessages, getDemoMots]);

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
          navigation.navigate('MessagesListScreen');
          break;
        case 'note':
          navigation.navigate('Notes');
          break;
        case 'agenda':
          navigation.navigate('Agenda');
          break;
        case 'absence':
          navigation.navigate('SignalerAbsence');
          break;
        case 'aria':
          navigation.navigate('MessagerieAriaScreen');
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

  // ─── FAB actions ─────────────────────────────────────────

  const fabActions: FabAction[] = [
    {
      Icon: MessageCircle,
      color: ACCENT,
      label: "Envoyer un message à l'enseignant",
      onPress: () => {
        closeFab();
        setTimeout(
          () => navigation.navigate('MessagesListScreen'),
          300,
        );
      },
    },
    {
      Icon: Mail,
      color: '#10B981',
      label: "Contacter l'établissement",
      onPress: () => {
        closeFab();
        setTimeout(
          () => navigation.navigate('EcoleListScreen'),
          300,
        );
      },
    },
    {
      Icon: AlertTriangle,
      color: '#EF4444',
      label: 'Signaler une absence',
      onPress: () => {
        closeFab();
        setTimeout(() => navigation.navigate('SignalerAbsence'), 300);
      },
    },
  ];

  // ─── Render ───────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: '#F2F2F7' }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
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
            <Mail size={22} color={hasUnread ? ACCENT : '#CCCCCC'} strokeWidth={2} />
            {hasUnread && <View style={styles.bellDot} />}
          </Pressable>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {unreadCount > 0
            ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}`
            : 'Tout est à jour'}
        </Text>

        {/* ── Category cards (stacked) ── */}
        <View style={styles.categoryStack}>
          {/* Messages */}
          <CategoryCardRow
            onPress={() => navigation.navigate('MessagesListScreen')}
            gradientColors={['#1A2340', '#334155']}
            iconContent={<MessageCircle size={20} color="#FFFFFF" strokeWidth={2} />}
            label="Messages"
            sublabel={messagesCount > 0 ? `${messagesCount} conversation${messagesCount > 1 ? 's' : ''}` : 'Aucune conversation'}
            time="14h30"
            badgeCount={allItems.filter((n) => n.type === 'liaison' && !n.read).length}
          />
          {/* École */}
          <CategoryCardRow
            onPress={() => navigation.navigate('EcoleListScreen')}
            gradientColors={['#F59E0B', '#F97316']}
            iconContent={<Home size={20} color="#FFFFFF" strokeWidth={2} />}
            label="École"
            sublabel="Infos & annonces"
            time=""
            badgeCount={0}
          />
          {/* Absences */}
          <CategoryCardRow
            onPress={() => navigation.navigate('AbsencesListScreen')}
            gradientColors={['#64748B', '#94A3B8']}
            iconContent={<Calendar size={20} color="#FFFFFF" strokeWidth={2} />}
            label="Absences"
            sublabel={absencesCount > 0 ? `${absencesCount} signalée${absencesCount > 1 ? 's' : ''}` : 'Historique'}
            time=""
            badgeCount={absencesCount}
          />
          {/* Aria */}
          <CategoryCardRow
            onPress={() => navigation.navigate('MessagerieAriaScreen')}
            gradientColors={['#7C3AED', '#06B6D4']}
            iconContent={<Text style={{ color: '#FFFFFF', fontSize: 16 }}>✦</Text>}
            isCircle
            label="Aria"
            sublabel="Synthèses & conseils"
            time=""
            badgeCount={ariaUnreadCount}
          />
        </View>

        {/* ── Empty state ── */}
        {isEmpty && (
          <View style={styles.emptyState}>
            <Mail size={48} color="#94A3B8" strokeWidth={1.5} />
            <Text style={styles.emptyText}>Aucun message</Text>
          </View>
        )}

        {/* ── Aujourd'hui section ── */}
        {visibleToday.length > 0 && (
          <>
            <Text style={styles.todayLabel}>AUJOURD'HUI</Text>
            {visibleToday.map((item) => (
              <MessageCard key={item.id} item={item} onPress={handleItemPress} />
            ))}
          </>
        )}

        {/* ── Plus tôt section ── */}
        {visibleEarlier.length > 0 && (
          <>
            <View style={styles.laterDivider}>
              <View style={styles.laterLine} />
              <Text style={styles.laterLabel}>PLUS TÔT</Text>
              <View style={styles.laterLine} />
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
          { opacity: pressed ? 0.85 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={fabOpen ? 'Fermer' : 'Nouveau message'}
      >
        <MessageSquarePlus size={22} color="#1A2340" strokeWidth={2} />
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
                      <action.Icon size={20} color={action.color} strokeWidth={2} />
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
                  <X size={16} color="#64748B" strokeWidth={2} />
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

// ─── CategoryCardRow ─────────────────────────────────────

interface CategoryCardRowProps {
  onPress: () => void;
  gradientColors: [string, string];
  iconContent: React.ReactNode;
  isCircle?: boolean;
  label: string;
  sublabel: string;
  time: string;
  badgeCount: number;
}

function CategoryCardRow({
  onPress,
  gradientColors,
  iconContent,
  isCircle,
  label,
  sublabel,
  time,
  badgeCount,
}: CategoryCardRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.catRow, { opacity: pressed ? 0.85 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {/* Icon with gradient (web fallback via CSS backgroundImage) */}
      <View style={{ position: 'relative' }}>
        {Platform.OS === 'web' ? (
          <View
            style={[
              styles.catIconBox,
              isCircle && styles.catIconCircle,
              // @ts-ignore — web-only CSS property
              { backgroundImage: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]})` },
            ]}
          >
            {iconContent}
          </View>
        ) : (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.catIconBox, isCircle && styles.catIconCircle]}
          >
            {iconContent}
          </LinearGradient>
        )}
        {badgeCount > 0 && (
          <View style={styles.catBadge}>
            <Text style={styles.catBadgeText}>
              {badgeCount > 9 ? '9+' : String(badgeCount)}
            </Text>
          </View>
        )}
      </View>

      {/* Text column */}
      <View style={styles.catTextCol}>
        <Text style={styles.catLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.catSublabel} numberOfLines={1}>{sublabel}</Text>
      </View>

      {/* Right: time + chevron */}
      <View style={styles.catRight}>
        {time ? <Text style={styles.catTime}>{time}</Text> : null}
        <ChevronRight size={16} color="#D1D5DB" strokeWidth={2} />
      </View>
    </Pressable>
  );
}

// ─── MessageCard ─────────────────────────────────────────

interface MessageCardProps {
  item: MessagerieItem;
  onPress: (item: MessagerieItem) => void;
}

function MessageCard({ item, onPress }: MessageCardProps) {
  if (!item.title || !item.message) return null;
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.aria;

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.msgRow, pressed && { opacity: 0.82 }]}
      accessibilityRole="button"
    >
      {/* Avatar / icon */}
      {item.type === 'aria' ? (
        <AriaSparkleIcon size={44} />
      ) : (
        <View style={[styles.msgAvatar, { backgroundColor: '#E2E8F0' }]}>
          <cfg.Icon size={18} color="#64748B" strokeWidth={2} />
        </View>
      )}

      {/* Text column */}
      <View style={styles.msgTextCol}>
        <View style={styles.msgTitleRow}>
          <Text
            style={[styles.msgTitle, { fontFamily: item.read ? FontFamily.sansSemiBold : FontFamily.sansBold }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.msgTime}>{item.time}</Text>
        </View>
        <Text style={styles.msgPreview} numberOfLines={1}>
          {item.message}
        </Text>
      </View>

      {/* Unread dot */}
      {!item.read && <View style={styles.msgUnreadDot} />}
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
  categoryStack: {
    gap: 8,
    marginBottom: 20,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 0 },
    }),
  },
  catIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  catIconCircle: {
    borderRadius: 20,
  },
  catBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9,
    color: '#FFFFFF',
    lineHeight: 11,
  },
  catTextCol: {
    flex: 1,
    gap: 2,
  },
  catLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  catSublabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
  },
  catRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catTime: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#CBD5E1',
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

  // ── Section labels
  todayLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  laterDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 12,
  },
  laterLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  laterLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ── Message row (plain, no card wrapper)
  msgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  msgAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  msgTextCol: {
    flex: 1,
    gap: 2,
  },
  msgTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  msgTitle: {
    flex: 1,
    fontSize: 14,
    color: '#1A2340',
  },
  msgTime: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#CBD5E1',
    flexShrink: 0,
  },
  msgPreview: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#64748B',
  },
  msgUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
    flexShrink: 0,
  },

  // ── FAB
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
