/**
 * EventDetailScreen — Détail d'un événement agenda.
 * Specs : scolaria-event.jsx · Design System v2.0
 *
 * Android rules applied:
 * - No `gap` → explicit marginRight on siblings
 * - No height:'100%' → flex:1
 * - SafeAreaView + useSafeAreaInsets for padding top in gradient header
 * - No overflow:hidden + elevation + backgroundColor on same View
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  MoreHorizontal,
  Calendar,
  Clock,
  MapPin,
  User,
} from 'lucide-react-native';
import { C, RADIUS } from '../constants/design';
import { FontFamily } from '../hooks/useSolariaFonts';
import { WhiteCard } from '../components/WhiteCard';
import { AriaInlineCard } from '../components/AriaInlineCard';

// ─── Route params ────────────────────────────────────────────────────────────
type EventDetailParams = {
  EventDetail: {
    eventId?: string;
    eventTitle?: string;
    eventCategory?: string;
  };
};

// ─── Category colours ────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { main: string; bg: string }> = {
  'Contrôle': { main: '#DB2777', bg: '#FCE7F3' },
  'Sortie':   { main: '#0891B2', bg: '#CFFAFE' },
  'Cours':    { main: '#4338CA', bg: '#EEF2FF' },
  'Devoir':   { main: '#D97706', bg: '#FEF3C7' },
  'Activité': { main: '#0891B2', bg: '#CFFAFE' },
  'Réunion':  { main: '#7C3AED', bg: '#EDE9FE' },
};

const DEFAULT_CATEGORY_COLOR = { main: '#4338CA', bg: '#EEF2FF' };

// ─── Demo data ────────────────────────────────────────────────────────────────
const EVENT_DEMO = {
  title: "Sortie Musée d'Orsay",
  category: 'Sortie',
  date: 'Vendredi 9 mai 2026',
  time: '08:30 – 17:00',
  location: "Musée d'Orsay, Paris 7e",
  teacher: 'Mme Dupont (Français)',
  participants: '28 élèves',
  description:
    "Visite du musée d'Orsay dans le cadre du cours de Français et d'Histoire de l'art. Les élèves exploreront les collections impressionnistes.",
  checklist: [
    { id: '1', label: 'Autorisation signée', done: false },
    { id: '2', label: "8€ en espèces pour l'entrée", done: false },
    { id: '3', label: 'Pique-nique (pas de cantine ce jour)', done: false },
    { id: '4', label: 'Appareil photo autorisé', done: true },
  ],
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, isLast }) => (
  <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
    <View style={styles.infoRowIcon}>{icon}</View>
    <Text style={styles.infoRowLabel}>{label}</Text>
    <Text style={styles.infoRowValue} numberOfLines={1}>{value}</Text>
  </View>
);

interface CheckItemProps {
  label: string;
  done: boolean;
  isLast?: boolean;
  onToggle: () => void;
}

const CheckItem: React.FC<CheckItemProps> = ({ label, done, isLast, onToggle }) => (
  <TouchableOpacity
    onPress={onToggle}
    activeOpacity={0.7}
    style={[styles.checkItem, !isLast && styles.checkItemBorder]}
  >
    {/* Checkbox — outer (shadow), inner (overflow:hidden) pattern */}
    <View style={[styles.checkboxOuter, done && styles.checkboxOuterDone]}>
      <View style={[styles.checkboxInner, done && styles.checkboxInnerDone]}>
        {done && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </View>
    </View>
    <Text
      style={[
        styles.checkLabel,
        done && styles.checkLabelDone,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const EventDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EventDetailParams, 'EventDetail'>>();
  const insets = useSafeAreaInsets();

  const { eventTitle, eventCategory } = route.params ?? {};
  const event = { ...EVENT_DEMO };
  if (eventTitle) event.title = eventTitle;
  if (eventCategory) event.category = eventCategory;

  const categoryColors =
    CATEGORY_COLORS[event.category] ?? DEFAULT_CATEGORY_COLOR;

  // Checklist state
  const [checklist, setChecklist] = useState(event.checklist);

  const toggleItem = (id: string) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      {/* ── Gradient header (handles top safe area itself) ── */}
      <LinearGradient
        colors={[categoryColors.main + 'CC', categoryColors.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        {/* Action row */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={22} color={C.text} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
          <TouchableOpacity style={styles.headerBtn}>
            <MoreHorizontal size={20} color={C.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Category badge */}
        <Text style={styles.categoryBadge}>{event.category.toUpperCase()}</Text>

        {/* Title */}
        <Text style={styles.eventTitle}>{event.title}</Text>

        {/* Date + time */}
        <Text style={styles.headerDateTime}>
          {event.date} · {event.time}
        </Text>
      </LinearGradient>

      {/* ── Scrollable body ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info card — overlaps header with negative marginTop */}
        <WhiteCard style={styles.infoCard} noPadding>
          <InfoRow
            icon={<Calendar size={16} color={C.text35} strokeWidth={1.8} />}
            label="Date"
            value={event.date}
          />
          <InfoRow
            icon={<Clock size={16} color={C.text35} strokeWidth={1.8} />}
            label="Horaire"
            value={event.time}
          />
          <InfoRow
            icon={<MapPin size={16} color={C.text35} strokeWidth={1.8} />}
            label="Lieu"
            value={event.location}
          />
          <InfoRow
            icon={<User size={16} color={C.text35} strokeWidth={1.8} />}
            label="Enseignant"
            value={event.teacher}
            isLast
          />
        </WhiteCard>

        {/* Description */}
        <Text style={styles.sectionLabel}>DESCRIPTION</Text>
        <WhiteCard>
          <Text style={styles.descriptionText}>{event.description}</Text>
        </WhiteCard>

        {/* Checklist */}
        <Text style={styles.sectionLabel}>CHECKLIST PRÉPARATION</Text>
        <WhiteCard noPadding>
          {checklist.map((item, idx) => (
            <CheckItem
              key={item.id}
              label={item.label}
              done={item.done}
              isLast={idx === checklist.length - 1}
              onToggle={() => toggleItem(item.id)}
            />
          ))}
        </WhiteCard>

        {/* Aria suggestion */}
        <View style={styles.ariaWrapper}>
          <AriaInlineCard>
            {"Rappel : prévoir 8€ en espèces. Départ à 08:15 — arrive 15 min avant."}
          </AriaInlineCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  categoryBadge: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: C.text,
    marginBottom: 6,
  },
  eventTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    color: C.text,
    letterSpacing: -0.6,
    lineHeight: 26,
    marginTop: 8,
  },
  headerDateTime: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: C.text55,
    marginTop: 6,
  },

  // Scroll
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 100,
  },

  // Info card overlapping header
  infoCard: {
    marginTop: -16,
    zIndex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoRowIcon: {
    width: 24,
    alignItems: 'center',
    marginRight: 10,
  },
  infoRowLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: C.text55,
    width: 80,
  },
  infoRowValue: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: C.text,
    flex: 1,
    textAlign: 'right',
  },

  // Section labels
  sectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 8.5,
    letterSpacing: 1.2,
    color: C.text28,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },

  // Description
  descriptionText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: C.text,
    lineHeight: 21,
    padding: 14,
  },

  // Checklist
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  checkItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  // Checkbox: outer = bg/shadow, inner = overflow:hidden
  checkboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.text35,
    marginRight: 12,
  },
  checkboxOuterDone: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  checkboxInner: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxInnerDone: {},
  checkmark: {
    color: C.white,
    fontSize: 12,
    fontFamily: FontFamily.sansBold,
    marginTop: -1,
  },
  checkLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: C.text,
    flex: 1,
  },
  checkLabelDone: {
    opacity: 0.45,
    textDecorationLine: 'line-through',
  },

  // Aria wrapper (marginTop spacing only — AriaInlineCard handles horizontals)
  ariaWrapper: {
    marginTop: 8,
  },
});

export default EventDetailScreen;
