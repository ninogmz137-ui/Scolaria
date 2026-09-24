/**
 * EventDetailScreen — Détail d'un événement agenda.
 * Specs : scolaria-event.jsx · Design System v2.0
 *
 * Android rules applied:
 * - No `gap` → explicit marginRight on siblings
 * - No height:'100%' → flex:1
 * - Mode chrome 'none' (navigation/chrome.ts) : le header dégradé remplace la top bar et gère insets.top
 * - No overflow:hidden + elevation + backgroundColor on same View
 */
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  ChevronLeft,
  MoreHorizontal,
  Calendar,
  Clock,
  Check,
  Users,
} from 'lucide-react-native';
import { C, RADIUS, STICKY_CTA_BOTTOM_GAP, getStickyCtaScrollPadding } from '../constants/design';
import { FontFamily } from '../hooks/useSolariaFonts';
import { WhiteCard } from '../components/WhiteCard';
import { AriaInlineCard } from '../components/AriaInlineCard';
import ScolariaSymbol from '../components/ScolariaSymbol';
import { Text } from '../components/ui';

// ─── Route params ────────────────────────────────────────────────────────────
type EventDetailParams = {
  EventDetail: {
    eventId?: string;
    eventTitle?: string;
    eventCategory?: string;
    eventTime?: string;
    eventLocation?: string;
    eventDescription?: string;
  };
};

// ─── Category colours ────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { main: string; bg: string }> = {
  'Contrôle': { main: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
  'Sortie':   { main: '#0891B2', bg: '#CFFAFE' },
  'Cours':    { main: '#4338CA', bg: '#EEF2FF' },
  'Devoir':   { main: '#D97706', bg: '#FEF3C7' },
  'Activité': { main: '#0891B2', bg: '#CFFAFE' },
  'Réunion':  { main: '#4338CA', bg: '#EEF2FF' },
};

const DEFAULT_CATEGORY_COLOR = { main: '#4338CA', bg: '#EEF2FF' };

// ─── Demo data ────────────────────────────────────────────────────────────────
const EVENT_DEMO = {
  title: "Sortie Musée d'Orsay",
  category: 'Sortie',
  date: 'Ven. 9 mai',
  time: '08:30 – 17:00',
  location: "Musée d'Orsay, Paris 7e",
  teacher: '',
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

  const { eventTitle, eventCategory, eventTime, eventLocation, eventDescription } = route.params ?? {};
  // Un événement ouvert depuis l'Agenda n'affiche QUE ses propres données (jamais la sortie de démo).
  const event = eventTitle
    ? {
        ...EVENT_DEMO,
        title: eventTitle,
        category: eventCategory ?? 'Événement',
        date: '',
        time: eventTime ?? '',
        location: eventLocation ?? '',
        teacher: '',
        participants: '',
        description: eventDescription ?? '',
        checklist: [] as typeof EVENT_DEMO.checklist,
        aria: '',
      }
    : { ...EVENT_DEMO, aria: 'Rappel : prévoir 8 € en espèces. Départ à 08:15, arriver 15 min avant.' };

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
    <View style={styles.root}>
      {/* ── Gradient header (handles top safe area itself) ── */}
      <View style={[[styles.header, { paddingTop: insets.top + 12 }], { backgroundColor: categoryColors.bg }]}>
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
        {!!(event.date || event.time) && (
          <Text style={styles.headerDateTime}>
            {[event.date, event.time].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getStickyCtaScrollPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* QuickInfoGrid — 2×2 overlaps header */}
        <View style={styles.quickGridOuter}>
          <View style={styles.quickGridInner}>
            {/* Row 1 */}
            <View style={styles.quickRow}>
              <View style={[styles.quickCell, styles.quickCellBorderRight, styles.quickCellBorderBottom]}>
                <Calendar size={14} color={C.text35} strokeWidth={1.8} />
                <Text style={styles.quickLabel} numberOfLines={1}>{event.date}</Text>
              </View>
              <View style={[styles.quickCell, styles.quickCellBorderBottom]}>
                <Clock size={14} color={C.text35} strokeWidth={1.8} />
                <Text style={styles.quickLabel} numberOfLines={1}>{event.time}</Text>
              </View>
            </View>
            {/* Row 2 */}
            <View style={styles.quickRow}>
              <View style={[styles.quickCell, styles.quickCellBorderRight]}>
                <Users size={14} color={C.text35} strokeWidth={1.8} />
                <Text style={styles.quickLabel}>{event.participants || event.location || '—'}</Text>
              </View>
              <View style={[styles.quickCell, styles.quickCellInscrite]}>
                <View style={styles.inscriteBadge}>
                  <Check size={12} color={C.indigo} strokeWidth={2.5} />
                </View>
                <Text style={styles.quickLabelInscrite}>Inscrite</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        {!!event.description && (
          <>
            <Text style={styles.sectionLabel}>DESCRIPTION</Text>
            <WhiteCard>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </WhiteCard>
          </>
        )}

        {/* Checklist */}
        {checklist.length > 0 && <Text style={styles.sectionLabel}>CHECKLIST PRÉPARATION</Text>}
        {checklist.length > 0 && (
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
        )}

        {/* Aria suggestion */}
        {!!event.aria && (
          <View style={styles.ariaWrapper}>
            <AriaInlineCard>{event.aria}</AriaInlineCard>
          </View>
        )}

        {/* Spacer pour bottom bar */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.eventBottomBar, { bottom: insets.bottom + STICKY_CTA_BOTTOM_GAP }]}>
        <TouchableOpacity style={styles.evBtnOutline} activeOpacity={0.8}>
          <Text style={styles.evBtnOutlineText}>Voir le message</Text>
        </TouchableOpacity>
        <View style={{ width: 10 }} />
        <TouchableOpacity style={styles.evBtnDark} activeOpacity={0.85}>
          <ScolariaSymbol size={13} color={C.white} />
          <Text style={[styles.evBtnDarkText, { marginLeft: 7 }]}>Demander à Aria</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  },

  // QuickInfoGrid — 2×2, overlaps header
  quickGridOuter: {
    marginHorizontal: 14,
    marginTop: -16,
    borderRadius: 18,
    backgroundColor: C.white,
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 0 },
      default: {},
    }),
  },
  quickGridInner: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  quickRow: {
    flexDirection: 'row',
  },
  quickCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  quickCellBorderRight: {
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  quickCellBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  quickCellInscrite: {
    backgroundColor: 'rgba(67,56,202,0.04)',
  },
  quickLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: C.text,
    marginLeft: 6,
    flex: 1,
  },
  inscriteBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(67,56,202,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabelInscrite: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: C.indigo,
    marginLeft: 6,
  },

  // Bottom bar
  eventBottomBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
  },
  evBtnOutline: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evBtnOutlineText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: C.text,
  },
  evBtnDark: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: C.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evBtnDarkText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: C.white,
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
