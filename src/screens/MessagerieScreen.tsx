/**
 * MessagerieScreen — Unified inbox, iOS-cinematic style.
 *
 * Key UX:
 * - Header + filter chips
 * - Grouped list: one glass container per group
 * - Context actions: iOS-like bottom sheet with blur + quick actions
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  Platform,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import {
  MoreHorizontal,
  Reply,
  EyeOff,
  Eye,
  Share2,
  User,
  CheckCircle,
  Archive,
  Trash2,
  MessageCirclePlus,
  MessageCircle,
  School,
  AlertCircle,
  Sparkles,
  Search,
  X,
  ChevronDown,
  Check,
  GraduationCap,
  Calendar,
  UserRound,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { getGrades, getAgendaEvents } from '../services/database';
import { getParentMots } from '../services/liaisonService';
import { getStudentAbsences } from '../services/absenceService';
import { useDemoData } from '../contexts/DemoContext';

// ─── Constants ────────────────────────────────────────────

const ACCENT = '#7C3AED';
const SHEET_BG = 'rgba(30,36,60,0.97)';
const IOS_DESTRUCTIVE = '#FF453A';

// ─── Types ────────────────────────────────────────────────

type MessagerieItemType = 'liaison' | 'ecole' | 'note' | 'agenda' | 'aria' | 'absence';

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

type FilterId = 'all' | 'unread' | 'messages' | 'ecole' | 'absences';

type Teacher = { id: string; name: string; subject: string };

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
      id: 'mock-ecole-1',
      type: 'ecole',
      title: "Annonce de l'école",
      message: 'Réunion parents-professeurs jeudi à 18h.',
      time: 'Mar.',
      read: true,
      _isoDate: getPastIso(3),
    },
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

function isThisWeek(isoString: string): boolean {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  return diffDays > 0 && diffDays <= 7;
}

function groupItems(items: MessagerieItem[]) {
  const groups: { label: string; items: MessagerieItem[] }[] = [
    { label: "Aujourd'hui", items: [] },
    { label: 'Cette semaine', items: [] },
    { label: 'Plus tôt', items: [] },
  ];
  for (const it of items) {
    if (isToday(it._isoDate)) groups[0].items.push(it);
    else if (isThisWeek(it._isoDate)) groups[1].items.push(it);
    else groups[2].items.push(it);
  }
  return groups.filter((g) => g.items.length > 0);
}

const TYPE_COLORS: Record<MessagerieItemType, string> = {
  liaison: '#1A2340',
  ecole: '#06B6D4',
  note: '#7C3AED',
  agenda: '#10B981',
  absence: '#EF4444',
  aria: '#7C3AED',
};

const TYPE_BADGE_LABEL: Record<MessagerieItemType, string> = {
  liaison: 'Prof',
  ecole: 'École',
  note: 'Note',
  agenda: 'Agenda',
  absence: 'Abs.',
  aria: 'Aria',
};

const UNREAD_DOT_COLOR = '#3B82F6';

const FILTER_LABELS: Record<FilterId, string> = {
  all: 'Tout',
  unread: 'Non lus',
  messages: 'Messages',
  ecole: 'École',
  absences: 'Absences',
};

const FILTER_OPTIONS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'unread', label: 'Non lus' },
  { id: 'messages', label: 'Messages' },
  { id: 'ecole', label: 'École' },
  { id: 'absences', label: 'Absences' },
];

type LucideIcon = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
const AVATAR_ICONS: Record<MessagerieItemType, LucideIcon | null> = {
  liaison: UserRound,
  ecole: School,
  note: GraduationCap,
  agenda: Calendar,
  absence: AlertCircle,
  aria: null,
};

const AVATAR_GRADIENTS: Record<MessagerieItemType, [string, string]> = {
  liaison: ['#1A2340', '#334155'],
  ecole: ['#06B6D4', '#0891B2'],
  note: ['#7C3AED', '#9D5CF7'],
  agenda: ['#10B981', '#34D399'],
  absence: ['#F97316', '#EF4444'],
  aria: ['#7C3AED', '#06B6D4'],
};

// ─── Component ────────────────────────────────────────────

export default function MessagerieScreen() {
  const navigation = useNavigation<any>();
  const { selectedChild } = useActiveChild();
  const {
    isDemoMode,
    getMessages: getDemoMessages,
    getMots: getDemoMots,
    getTeachers: getDemoTeachers,
  } = useDemoData();
  const insets = useSafeAreaInsets();

  // ─── State ──────────────────────────────────────────────

  const initMock = getMockItems();
  const [todayItems, setTodayItems]     = useState<MessagerieItem[]>(initMock.today);
  const [earlierItems, setEarlierItems] = useState<MessagerieItem[]>(initMock.earlier);
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const searchAnim = useRef(new Animated.Value(0)).current;
  const [selectedItem, setSelectedItem] = useState<MessagerieItem | null>(null);
  const [composerVisible, setComposerVisible] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const composerAnim = useRef(new Animated.Value(0)).current;

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
          type:
            msg.type === 'ecole'
              ? 'ecole'
              : msg.type === 'liaison'
                ? 'liaison'
                : msg.type === 'absence'
                  ? 'absence'
                  : msg.type === 'note'
                    ? 'note'
                    : 'aria',
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

  const toggleRead = useCallback((id: string) => {
    setTodayItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
    setEarlierItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  }, []);

  const handleItemPress = useCallback(
    (item: MessagerieItem) => {
      markRead(item.id);
      switch (item.type) {
        case 'liaison':
          navigation.navigate('MessagesListScreen');
          break;
        case 'ecole':
          navigation.navigate('EcoleListScreen');
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
          navigation.navigate('AriaHome');
          break;
      }
    },
    [markRead, navigation],
  );

  // ─── Derived values ──────────────────────────────────────

  const allItems = useMemo(() => {
    const merged = [...todayItems, ...earlierItems];
    merged.sort((a, b) => (b._isoDate || '').localeCompare(a._isoDate || ''));
    return merged;
  }, [todayItems, earlierItems]);

  const unreadCount = useMemo(
    () => allItems.filter((n) => !n.read).length,
    [allItems],
  );

  const filterItems = useCallback((items: MessagerieItem[]) => {
    switch (activeFilter) {
      case 'unread':
        return items.filter((i) => !i.read);
      case 'messages':
        return items.filter((i) => i.type === 'liaison');
      case 'ecole':
        return items.filter((i) => i.type === 'ecole');
      case 'absences':
        return items.filter((i) => i.type === 'absence');
      case 'all':
      default:
        return items;
    }
  }, [activeFilter]);

  const visibleItems = useMemo(() => {
    const filtered = filterItems(allItems);
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.trim().toLowerCase();
    return filtered.filter(
      (i) => i.title.toLowerCase().includes(q) || i.message.toLowerCase().includes(q),
    );
  }, [allItems, filterItems, searchQuery]);
  const groups = useMemo(() => groupItems(visibleItems), [visibleItems]);

  const FILTERS = useMemo(() => ([
    { id: 'all' as const, label: 'Tout', icon: null, count: allItems.length },
    { id: 'unread' as const, label: 'Non lus', icon: Eye, count: unreadCount },
    { id: 'messages' as const, label: 'Messages', icon: MessageCircle, count: allItems.filter((i) => i.type === 'liaison').length },
    { id: 'ecole' as const, label: 'École', icon: School, count: allItems.filter((i) => i.type === 'ecole').length },
    { id: 'absences' as const, label: 'Absences', icon: AlertCircle, count: allItems.filter((i) => i.type === 'absence').length },
  ]), [allItems, unreadCount]);

  const openSheet = useCallback((item: MessagerieItem) => {
    setSelectedItem(item);
    setSheetVisible(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const closeSheet = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSheetVisible(false);
      setSelectedItem(null);
    });
  }, [slideAnim]);

  const handleShare = useCallback(async () => {
    if (!selectedItem) return;
    try {
      await Share.share({
        message: `${selectedItem.title}\n\n${selectedItem.message}`,
      });
    } catch {}
    closeSheet();
  }, [closeSheet, selectedItem]);

  const handleDelete = useCallback(() => {
    if (!selectedItem) return;
    const id = selectedItem.id;
    setTodayItems((prev) => prev.filter((n) => n.id !== id));
    setEarlierItems((prev) => prev.filter((n) => n.id !== id));
    closeSheet();
  }, [closeSheet, selectedItem]);

  const teachers: Teacher[] = useMemo(() => {
    if (isDemoMode) {
      return getDemoTeachers(selectedChild.id).map((t) => ({
        id: t.id,
        name: t.name,
        subject: `${t.role} — ${t.class}`,
      }));
    }
    // Fallback list when not in demo (until real data wiring)
    return [
      { id: 't-1', name: 'Mme Dupont', subject: 'Professeur principal — CM2 B' },
      { id: 't-2', name: 'M. Martin', subject: 'SVT — 4e C' },
      { id: 't-3', name: 'Mme Lambert', subject: 'Français — 4e C' },
    ];
  }, [getDemoTeachers, isDemoMode, selectedChild.id]);

  const toggleSearch = useCallback(() => {
    const next = !searchVisible;
    setSearchVisible(next);
    if (!next) setSearchQuery('');
    Animated.timing(searchAnim, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [searchAnim, searchVisible]);

  const openComposer = useCallback(() => {
    setComposerVisible(true);
    Animated.spring(composerAnim, {
      toValue: 1,
      tension: 70,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [composerAnim]);

  const closeComposer = useCallback(() => {
    Animated.timing(composerAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setComposerVisible(false));
  }, [composerAnim]);

  // ─── Render ───────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Messagerie</Text>
            <Text style={styles.headerSub}>
              {unreadCount > 0 ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}
            </Text>
          </View>

          {/* Search icon */}
          <Pressable
            onPress={toggleSearch}
            style={({ pressed }) => [styles.headerIconBtn, searchVisible && styles.headerIconBtnActive, pressed && { opacity: 0.75 }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Rechercher"
          >
            {searchVisible
              ? <X size={18} color="#1A2340" strokeWidth={2.2} />
              : <Search size={18} color="#1A2340" strokeWidth={2.2} />
            }
          </Pressable>

          {/* Filter dropdown button */}
          <Pressable
            onPress={() => setDropdownVisible((v) => !v)}
            style={({ pressed }) => [styles.filterDropdownBtn, dropdownVisible && styles.filterDropdownBtnActive, pressed && { opacity: 0.82 }]}
            accessibilityRole="button"
            accessibilityLabel="Filtrer"
          >
            <Text style={[styles.filterDropdownLabel, dropdownVisible && { color: '#FFFFFF' }]}>
              {FILTER_LABELS[activeFilter]}
            </Text>
            <ChevronDown
              size={13}
              color={dropdownVisible ? '#FFFFFF' : '#1A2340'}
              strokeWidth={2.5}
              style={{ transform: [{ rotate: dropdownVisible ? '180deg' : '0deg' }] }}
            />
          </Pressable>
        </View>

        {/* Animated search bar */}
        <Animated.View
          style={[
            styles.searchBarAnimated,
            {
              maxHeight: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 56] }),
              opacity: searchAnim,
              marginBottom: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }),
            },
          ]}
          pointerEvents={searchVisible ? 'auto' : 'none'}
        >
          <View style={styles.searchBarInner}>
            <Search size={15} color="#94A3B8" strokeWidth={2} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher dans Messagerie…"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              returnKeyType="search"
              autoFocus={searchVisible}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <X size={14} color="#94A3B8" strokeWidth={2.5} />
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Groups */}
        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.emptyText}>
              Rien à afficher pour ce filtre.
            </Text>
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.label} style={{ marginTop: 14 }}>
              <Text style={styles.sectionLabel}>{g.label}</Text>
              <View style={styles.groupCard}>
                {g.items.map((item, idx) => (
                  <View key={item.id}>
                    {idx > 0 && <View style={styles.rowSeparator} />}
                    <Pressable
                      onPress={() => handleItemPress(item)}
                      style={({ pressed }) => [styles.row, pressed && { opacity: 0.86 }]}
                    >
                      {/* Unread accent */}
                      {!item.read && (
                        <View style={[styles.unreadAccent, { backgroundColor: TYPE_COLORS[item.type] }]} />
                      )}

                      {/* Avatar */}
                      <View style={styles.avatarWrapper}>
                        {item.type === 'aria' ? (
                          <View style={[styles.avatar, styles.avatarAria]}>
                            <Text style={styles.avatarTextAria}>✦</Text>
                          </View>
                        ) : Platform.OS === 'web' ? (
                          <View
                            style={[
                              styles.avatar,
                              { backgroundImage: `linear-gradient(135deg, ${AVATAR_GRADIENTS[item.type][0]}, ${AVATAR_GRADIENTS[item.type][1]})` } as any,
                            ]}
                          >
                            {AVATAR_ICONS[item.type] && React.createElement(AVATAR_ICONS[item.type]!, { size: 18, color: '#FFFFFF', strokeWidth: 2 })}
                          </View>
                        ) : (
                          <LinearGradient
                            colors={AVATAR_GRADIENTS[item.type]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.avatar}
                          >
                            {AVATAR_ICONS[item.type] && React.createElement(AVATAR_ICONS[item.type]!, { size: 18, color: '#FFFFFF', strokeWidth: 2 })}
                          </LinearGradient>
                        )}
                        <View style={[styles.avatarBadge, { backgroundColor: TYPE_COLORS[item.type] }]}>
                          <Text style={styles.avatarBadgeText}>{TYPE_BADGE_LABEL[item.type]}</Text>
                        </View>
                      </View>

                      {/* Body */}
                      <View style={styles.rowBody}>
                        <View style={styles.rowTop}>
                          <Text
                            style={[
                              styles.rowTitle,
                              { fontFamily: item.read ? FontFamily.sansSemiBold : FontFamily.sansBold },
                            ]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text style={styles.rowTime}>{item.time}</Text>
                        </View>
                        <Text style={styles.rowPreview} numberOfLines={1}>
                          <Text style={[styles.rowTag, { color: TYPE_COLORS[item.type] }]}>
                            {item.type === 'liaison'
                              ? 'Prof'
                              : item.type === 'ecole'
                                ? 'École'
                                : item.type === 'absence'
                                  ? 'Absence'
                                  : item.type === 'aria'
                                    ? 'Aria'
                                    : item.type === 'agenda'
                                      ? 'Agenda'
                                      : 'Note'}
                            {'  '}
                          </Text>
                          {item.message}
                        </Text>
                      </View>

                      {/* Right */}
                      <View style={styles.rowRight}>
                        {!item.read && <View style={styles.unreadPip} />}
                        <Pressable
                          onPress={() => openSheet(item)}
                          style={({ pressed }) => [styles.ellipsisBtn, { opacity: pressed ? 0.7 : 1 }]}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel="Actions"
                        >
                          <MoreHorizontal size={16} color="rgba(148,163,184,1)" strokeWidth={2} />
                        </Pressable>
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Filter dropdown overlay */}
      {dropdownVisible && (
        <>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setDropdownVisible(false)}
          />
          <View style={[styles.filterDropdown, { top: insets.top + 62 }]}>
            {FILTER_OPTIONS.map((opt) => {
              const isActive = activeFilter === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => { setActiveFilter(opt.id); setDropdownVisible(false); }}
                  style={({ pressed }) => [styles.filterDropdownItem, pressed && { opacity: 0.82 }]}
                >
                  <Text style={[styles.filterDropdownItemLabel, isActive && styles.filterDropdownItemLabelActive]}>
                    {opt.label}
                  </Text>
                  {isActive && <Check size={15} color="#1A2340" strokeWidth={2.5} />}
                </Pressable>
              );
            })}
            <View style={[styles.filterDropdownItem, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(15,23,42,0.06)', marginTop: 2 }]}>
              <Pressable
                onPress={() => {
                  setTodayItems((prev) => prev.map((n) => ({ ...n, read: true })));
                  setEarlierItems((prev) => prev.map((n) => ({ ...n, read: true })));
                  setDropdownVisible(false);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={styles.filterDropdownItemLabel}>Tout marquer comme lu</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {/* Nouveau message (FAB) */}
      <Pressable
        onPress={openComposer}
        style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.88 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel="Nouveau message"
      >
        <MessageCirclePlus size={22} color="#FFFFFF" strokeWidth={2.2} />
      </Pressable>

      {/* Composer — choose recipient */}
      {composerVisible && (
        <Modal visible={composerVisible} transparent animationType="none" onRequestClose={closeComposer}>
          <Pressable style={styles.sheetOverlay} onPress={closeComposer}>
            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          </Pressable>

          <Animated.View
            style={[
              styles.composerSheet,
              {
                paddingBottom: (Platform.OS === 'ios' ? insets.bottom : 0) + 18,
                transform: [
                  {
                    translateY: composerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [680, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.composerHeader}>
              <Text style={styles.composerTitle}>Nouveau message</Text>
              <Text style={styles.composerSubtitle}>Choisir un destinataire</Text>
            </View>

            <View style={styles.composerList}>
              {teachers.map((t, idx) => (
                <Pressable
                  key={t.id}
                  onPress={() => {
                    closeComposer();
                    setTimeout(() => {
                      navigation.navigate('ConversationDetailScreen', {
                        name: t.name,
                        role: t.subject,
                      });
                    }, 200);
                  }}
                  style={({ pressed }) => [styles.composerRow, pressed && { opacity: 0.82 }]}
                >
                  {idx > 0 && <View style={styles.composerSeparator} />}
                  <View style={styles.composerAvatar}>
                    <Text style={styles.composerAvatarText}>
                      {t.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.composerName} numberOfLines={1}>{t.name}</Text>
                    <Text style={styles.composerMeta} numberOfLines={1}>{t.subject}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </Modal>
      )}

      {/* Context sheet */}
      {sheetVisible && (
        <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
          <Pressable style={styles.sheetOverlay} onPress={closeSheet}>
            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          </Pressable>

          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [620, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              {selectedItem?.type === 'aria' ? (
                <View style={[styles.sheetAvatar, styles.avatarAria]}>
                  <Text style={styles.avatarTextAria}>✦</Text>
                </View>
              ) : Platform.OS === 'web' ? (
                <View
                  style={[
                    styles.sheetAvatar,
                    { backgroundImage: `linear-gradient(135deg, ${AVATAR_GRADIENTS[selectedItem?.type || 'liaison'][0]}, ${AVATAR_GRADIENTS[selectedItem?.type || 'liaison'][1]})` } as any,
                  ]}
                >
                  <Text style={styles.sheetAvatarText}>
                    {selectedItem?.type === 'absence' ? '!' : ''}
                  </Text>
                </View>
              ) : (
                <LinearGradient
                  colors={AVATAR_GRADIENTS[selectedItem?.type || 'liaison']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sheetAvatar}
                >
                  <Text style={styles.sheetAvatarText}>
                    {selectedItem?.type === 'absence' ? '!' : ''}
                  </Text>
                </LinearGradient>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetSender} numberOfLines={1}>
                  {selectedItem?.title || 'Message'}
                </Text>
                <Text style={styles.sheetPreview} numberOfLines={1}>
                  {selectedItem?.message || ''}
                </Text>
              </View>
            </View>

            {/* Quick actions */}
            <View style={styles.sheetQuick}>
              {[
                { Icon: Reply, label: 'Répondre', onPress: () => { closeSheet(); selectedItem && handleItemPress(selectedItem); } },
                {
                  Icon: selectedItem?.read ? Eye : EyeOff,
                  label: selectedItem?.read ? 'Non lu' : 'Lu',
                  onPress: () => { if (selectedItem) toggleRead(selectedItem.id); closeSheet(); },
                },
                { Icon: Share2, label: 'Partager', onPress: handleShare, tint: '#06B6D4', bg: 'rgba(6,182,212,0.15)' },
              ].map(({ Icon, label, onPress, tint, bg }) => (
                <Pressable key={label} onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.82 }]}>
                  <View style={[styles.quickIcon, bg ? { backgroundColor: bg } : null]}>
                    <Icon size={22} color={tint ?? '#FFFFFF'} strokeWidth={2} />
                  </View>
                  <Text style={styles.quickLabel}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Secondary actions */}
            <View style={styles.sheetList}>
              {[
                { Icon: User, label: 'Voir le profil', danger: false, onPress: () => { closeSheet(); navigation.navigate('ProfilEnfant'); } },
                { Icon: CheckCircle, label: 'Marquer comme lu', danger: false, onPress: () => { if (selectedItem) markRead(selectedItem.id); closeSheet(); } },
                { Icon: Archive, label: 'Archiver', danger: false, onPress: closeSheet },
                { Icon: Trash2, label: 'Supprimer', danger: true, onPress: handleDelete },
              ].map(({ Icon, label, danger, onPress }) => (
                <Pressable
                  key={label}
                  onPress={onPress}
                  style={({ pressed }) => [styles.sheetItem, pressed && { opacity: 0.82 }]}
                >
                  <Icon size={18} color={danger ? IOS_DESTRUCTIVE : 'rgba(255,255,255,0.75)'} strokeWidth={2} />
                  <Text style={[styles.sheetItemLabel, danger && { color: IOS_DESTRUCTIVE }]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </Modal>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 120,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 30,
    color: '#1A2340',
    letterSpacing: -0.6,
  },
  headerSub: {
    marginTop: 4,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
  },

  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.90)',
    marginLeft: 8,
  },
  headerIconBtnActive: {
    backgroundColor: 'rgba(15,23,42,0.08)',
    borderColor: 'rgba(15,23,42,0.10)',
  },
  filterDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.90)',
    marginLeft: 8,
  },
  filterDropdownBtnActive: {
    backgroundColor: '#1A2340',
    borderColor: '#1A2340',
  },
  filterDropdownLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#1A2340',
  },
  filterDropdown: {
    position: 'absolute',
    right: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    minWidth: 190,
    zIndex: 100,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24 },
      android: { elevation: 8 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 24 },
    }),
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterDropdownItemLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: '#1A2340',
    flex: 1,
  },
  filterDropdownItemLabelActive: {
    fontFamily: FontFamily.sansBold,
  },
  searchBarAnimated: {
    overflow: 'hidden',
    marginHorizontal: 6,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.10)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#1A2340',
    paddingVertical: 0,
  },

  sectionLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    letterSpacing: 0.4,
    color: 'rgba(148,163,184,0.65)',
    marginBottom: 6,
    marginTop: 4,
    paddingLeft: 4,
  },
  groupCard: {
    marginHorizontal: 0,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.90)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 0 },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowSeparator: {
    position: 'absolute',
    top: 0,
    left: 68,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  unreadAccent: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  avatarWrapper: {
    position: 'relative',
    flexShrink: 0,
    width: 46,
    height: 46,
    marginRight: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.92)',
    minWidth: 16,
    alignItems: 'center',
  },
  avatarBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 8,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  avatarText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  avatarAria: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
    borderRadius: 21,
    ...Platform.select({
      ios: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 8 },
      android: { elevation: 3 },
      default: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 8 },
    }),
  },
  avatarTextAria: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: '#7C3AED',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
  },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    color: '#1A2340',
  },
  rowTime: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#B0B7C3',
    flexShrink: 0,
  },
  rowPreview: {
    marginTop: 2,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#64748B',
  },
  rowTag: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  unreadPip: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: UNREAD_DOT_COLOR,
  },
  ellipsisBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.04)',
  },

  empty: {
    paddingVertical: 40,
    paddingHorizontal: 16,
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

  // Compose FAB
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 90,
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A2340',
    shadowColor: '#1A2340',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    ...Platform.select({
      android: { elevation: 0 },
    }),
  },

  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,20,40,0.45)',
  },
  composerSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(30,36,60,0.97)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
  },
  composerHeader: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  composerTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  composerSubtitle: {
    marginTop: 4,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  composerList: {
    paddingTop: 4,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  composerSeparator: {
    position: 'absolute',
    top: 0,
    left: 72,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  composerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAvatarText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
  },
  composerName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  composerMeta: {
    marginTop: 2,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: 14,
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  sheetAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheetAvatarText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  sheetSender: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  sheetPreview: {
    marginTop: 2,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },

  sheetQuick: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 14,
    paddingBottom: 8,
  },
  quickAction: { alignItems: 'center', gap: 8, width: 96 },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
  },

  sheetList: { paddingTop: 10 },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  sheetItemLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
