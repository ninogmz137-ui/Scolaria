/**
 * HomeworkScreen — Cahier de texte
 * Liste des devoirs d'Emma, filtres par matière/statut, AriaInlineCard.
 *
 * Android rules applied:
 * - No `gap` → marginRight/marginBottom explicit
 * - No `height: '100%'` → flex: 1
 * - No backdropFilter → semi-opaque colors
 * - Checkbox checked pattern: outer shadow View + inner overflow:hidden View
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
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import { useNavigation } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import { C, SHADOW } from '../constants/design';
import { FontFamily } from '../hooks/useSolariaFonts';
import { DeepScreenHeader } from '../components/DeepScreenHeader';
import { WhiteCard } from '../components/WhiteCard';
import { AriaInlineCard } from '../components/AriaInlineCard';

// ─── Types ────────────────────────────────────────────────────────────────────

type HomeworkItem = {
  id: string;
  subject: string;
  subjectColor: string;
  subjectBg: string;
  title: string;
  subtitle: string;
  done: boolean;
  urgent?: boolean;
};

type DayGroup = {
  id: string;
  label: string;
  badge?: string;
  count: number;
  items: HomeworkItem[];
};

// ─── Demo data ────────────────────────────────────────────────────────────────

const DAY_GROUPS: DayGroup[] = [
  {
    id: 'wed',
    label: 'Mer. 23 avril',
    badge: 'Demain',
    count: 2,
    items: [
      {
        id: 'hw1',
        subject: 'Maths',
        subjectColor: C.indigo,
        subjectBg: 'rgba(67,56,202,0.08)',
        title: 'Exercices p.47 + 48',
        subtitle: 'À rendre demain · sans PJ',
        done: false,
        urgent: true,
      },
      {
        id: 'hw2',
        subject: 'Français',
        subjectColor: C.green,
        subjectBg: 'rgba(5,150,105,0.08)',
        title: 'Lecture texte de Molière',
        subtitle: 'Rendu · noté',
        done: true,
      },
    ],
  },
  {
    id: 'mon',
    label: 'Lun. 21 avril',
    count: 3,
    items: [
      {
        id: 'hw3',
        subject: 'SVT',
        subjectColor: '#7C3AED',
        subjectBg: 'rgba(124,58,237,0.08)',
        title: 'Exercices p.67',
        subtitle: 'À rendre lundi · sans PJ',
        done: false,
      },
      {
        id: 'hw4',
        subject: 'Histoire-Géo',
        subjectColor: '#D97706',
        subjectBg: 'rgba(217,119,6,0.08)',
        title: 'Résumé guerre froide',
        subtitle: 'Apprentissage · oral possible',
        done: false,
      },
      {
        id: 'hw5',
        subject: 'Anglais',
        subjectColor: '#0891B2',
        subjectBg: 'rgba(8,145,178,0.08)',
        title: 'Vocab liste 8',
        subtitle: 'Révisions pour contrôle',
        done: false,
      },
    ],
  },
];

const FILTERS = ['Tout', 'À faire', 'Cette semaine', 'Maths', 'Français'];

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatStrip: React.FC = () => (
  <WhiteCard style={styles.statCard}>
    <View style={styles.statRow}>
      <View style={styles.statCol}>
        <Text style={styles.statNum}>5</Text>
        <Text style={styles.statLabel}>À FAIRE</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statCol}>
        <Text style={styles.statNum}>2</Text>
        <Text style={styles.statLabel}>CETTE SEMAINE</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statCol}>
        <Text style={styles.statNum}>12</Text>
        <Text style={styles.statLabel}>RENDUS</Text>
      </View>
    </View>
  </WhiteCard>
);

const Checkbox: React.FC<{ checked: boolean }> = ({ checked }) => {
  if (checked) {
    // Android shadow pattern: outer = elevation+bg, inner = overflow:hidden
    return (
      <View style={styles.checkboxCheckedOuter}>
        <View style={styles.checkboxCheckedInner}>
          <Check size={13} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      </View>
    );
  }
  return <View style={styles.checkboxUnchecked} />;
};

const SubjectBadge: React.FC<{ label: string; color: string; bg: string }> = ({
  label,
  color,
  bg,
}) => (
  <View style={[styles.badge, { backgroundColor: bg }]}>
    <Text style={[styles.badgeText, { color }]}>{label.toUpperCase()}</Text>
  </View>
);

const UrgentBadge: React.FC = () => (
  <View style={styles.urgentBadge}>
    <Text style={styles.urgentBadgeText}>DEMAIN</Text>
  </View>
);

const HomeworkRow: React.FC<{ item: HomeworkItem; isLast: boolean }> = ({
  item,
  isLast,
}) => (
  <View style={[styles.hwRow, !isLast && styles.hwRowBorder]}>
    <View style={styles.hwLeft}>
      <Checkbox checked={item.done} />
    </View>
    <View style={styles.hwContent}>
      {/* Badges row */}
      <View style={styles.hwBadges}>
        <SubjectBadge
          label={item.subject}
          color={item.subjectColor}
          bg={item.subjectBg}
        />
        {item.urgent && <UrgentBadge />}
      </View>
      {/* Title */}
      <Text
        style={[styles.hwTitle, item.done && styles.hwTitleDone]}
        numberOfLines={1}
      >
        {item.title}
      </Text>
      {/* Subtitle */}
      <Text style={styles.hwSubtitle} numberOfLines={1}>
        {item.subtitle}
      </Text>
    </View>
  </View>
);

const DayGroupSection: React.FC<{ group: DayGroup }> = ({ group }) => (
  <View style={styles.daySection}>
    {/* Section header */}
    <View style={styles.dayHeader}>
      <View style={styles.dayHeaderLeft}>
        <Text style={styles.dayLabel}>{group.label}</Text>
        {group.badge && (
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>{group.badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.dayCount}>
        {group.count} {group.count > 1 ? 'devoirs' : 'devoir'}
      </Text>
    </View>

    {/* Cards */}
    <WhiteCard noPadding style={styles.groupCard}>
      {group.items.map((item, idx) => (
        <HomeworkRow
          key={item.id}
          item={item}
          isLast={idx === group.items.length - 1}
        />
      ))}
    </WhiteCard>
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeworkScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('Tout');

  return (
    <SafeAreaView style={styles.root}>
      <DeepScreenHeader
        onBack={() => navigation.goBack()}
        title="Cahier de texte"
        subtitle="Emma · 4ᵉB"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getBottomBarScrollPadding(insets.bottom) },
        ]}
      >
        {/* Stat strip */}
        <StatStrip />

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
          style={styles.pillsScroll}
        >
          {FILTERS.map((f, i) => {
            const isActive = f === activeFilter;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                style={[
                  styles.pill,
                  isActive ? styles.pillActive : styles.pillInactive,
                  i < FILTERS.length - 1 && styles.pillSpacing,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    isActive ? styles.pillTextActive : styles.pillTextInactive,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Day groups */}
        {DAY_GROUPS.map((group) => (
          <DayGroupSection key={group.id} group={group} />
        ))}

        {/* Aria card */}
        <AriaInlineCard>
          <Text style={styles.ariaText}>
            2 devoirs urgents cette semaine. Veux-tu activer les rappels ?
          </Text>
          <View style={styles.ariaActions}>
            <TouchableOpacity style={styles.ariaActionPrimary} activeOpacity={0.8}>
              <Text style={styles.ariaActionPrimaryText}>Activer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ariaActionSecondary} activeOpacity={0.8}>
              <Text style={styles.ariaActionSecondaryText}>Plus tard</Text>
            </TouchableOpacity>
          </View>
        </AriaInlineCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingTop: 8,
  },

  // ── Stat strip ──
  statCard: {
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 22,
    color: C.text,
    letterSpacing: -0.8,
  },
  statLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    color: C.text28,
    letterSpacing: 1.1,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: C.border,
  },

  // ── Filter pills ──
  pillsScroll: {
    marginBottom: 16,
  },
  pillsContainer: {
    paddingHorizontal: 14,
  },
  pill: {
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillSpacing: {
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: C.text,
  },
  pillInactive: {
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  pillText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  pillTextActive: {
    color: C.white,
  },
  pillTextInactive: {
    color: C.text35,
  },

  // ── Day group ──
  daySection: {
    marginBottom: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: C.text,
    letterSpacing: -0.2,
    marginRight: 8,
  },
  dayBadge: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  dayBadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10.5,
    color: C.amber,
    letterSpacing: 0.3,
  },
  dayCount: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: C.text35,
  },
  groupCard: {
    marginBottom: 0,
  },

  // ── Homework row ──
  hwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hwRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  hwLeft: {
    marginRight: 12,
  },
  hwContent: {
    flex: 1,
  },
  hwBadges: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  hwTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: C.text,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  hwTitleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.45,
  },
  hwSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: C.text35,
  },

  // ── Checkbox ──
  checkboxUnchecked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.text35,
  },
  checkboxCheckedOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.green,
    ...(SHADOW.card as any),
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCheckedInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Subject badge ──
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  badgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10.5,
    letterSpacing: 0.4,
  },

  // ── Urgent badge ──
  urgentBadge: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgentBadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10.5,
    color: C.amber,
    letterSpacing: 0.4,
  },

  // ── Aria card content ──
  ariaText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13.5,
    color: C.text,
    lineHeight: 20,
    letterSpacing: -0.1,
    marginBottom: 10,
  },
  ariaActions: {
    flexDirection: 'row',
  },
  ariaActionPrimary: {
    backgroundColor: C.indigo,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginRight: 8,
  },
  ariaActionPrimaryText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: C.white,
    letterSpacing: -0.1,
  },
  ariaActionSecondary: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.25)',
  },
  ariaActionSecondaryText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: C.indigo,
    letterSpacing: -0.1,
  },
});
