/**
 * EcoleListScreen — School announcements and information.
 *
 * Shows a list of school-wide announcements: vacations, events, canteen info.
 */

import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import GlassCard from '../../components/GlassCard';
import { FLOATING_TAB_BAR_HEIGHT } from '../../components/FloatingTabBar';

// ─── Types ────────────────────────────────────────────────

interface Announcement {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  date: string;
  category: string;
  categoryColor: string;
}

// ─── Mock data ────────────────────────────────────────────

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    icon: '🌸',
    iconBg: '#FDF4FF',
    title: 'Vacances de printemps',
    subtitle: "L'école sera fermée du 12 au 27 avril 2026.",
    date: '5 avr. 2026',
    category: 'Calendrier',
    categoryColor: '#6366F1',
  },
  {
    id: 'ann-2',
    icon: '🏫',
    iconBg: '#F0FDF4',
    title: 'Journée portes ouvertes',
    subtitle: "Venez découvrir l'école le samedi 5 avril de 9h à 12h.",
    date: '1 avr. 2026',
    category: 'Événement',
    categoryColor: '#10B981',
  },
  {
    id: 'ann-3',
    icon: '🍽️',
    iconBg: '#FFF7ED',
    title: 'Cantine : nouveau menu',
    subtitle: 'Le menu de mars 2026 est disponible. Nouveaux plats bio inclus.',
    date: 'Mars 2026',
    category: 'Cantine',
    categoryColor: '#F59E0B',
  },
  {
    id: 'ann-4',
    icon: '📚',
    iconBg: '#EFF6FF',
    title: 'Commandes fournitures CE1',
    subtitle: 'La liste des fournitures pour la rentrée prochaine est disponible.',
    date: 'Mars 2026',
    category: 'Scolarité',
    categoryColor: '#3B82F6',
  },
  {
    id: 'ann-5',
    icon: '⚽',
    iconBg: '#F0FDF4',
    title: 'Tournoi sportif inter-classes',
    subtitle: 'Inscriptions ouvertes jusqu\'au 10 avril. Formulaire disponible.',
    date: '28 mars 2026',
    category: 'Sport',
    categoryColor: '#10B981',
  },
];

// ─── Component ────────────────────────────────────────────

export default function EcoleListScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ChevronLeft size={24} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>École</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10 },
        ]}
      >
        {/* ── Section header ── */}
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionAccentBar, { backgroundColor: '#10B981' }]} />
          <Text style={styles.sectionLabel}>Infos et annonces</Text>
        </View>

        {MOCK_ANNOUNCEMENTS.map((ann) => (
          <Pressable
            key={ann.id}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: 8 })}
            accessibilityRole="button"
          >
            <GlassCard borderRadius={14}>
              <View style={styles.annRow}>
                {/* Icon */}
                <View style={[styles.annIconContainer, { backgroundColor: ann.iconBg }]}>
                  <Text style={styles.annIcon}>{ann.icon}</Text>
                </View>

                {/* Text */}
                <View style={styles.annBody}>
                  <View style={styles.annTitleRow}>
                    <Text style={styles.annTitle} numberOfLines={1}>{ann.title}</Text>
                    <View
                      style={[styles.categoryBadge, { backgroundColor: ann.categoryColor + '18' }]}
                    >
                      <Text style={[styles.categoryText, { color: ann.categoryColor }]}>
                        {ann.category}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.annSubtitle} numberOfLines={2}>{ann.subtitle}</Text>
                  <Text style={styles.annDate}>{ann.date}</Text>
                </View>
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#F2F2F7',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  headerRight: {
    width: 40,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
  },

  // ── Section header
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
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  // ── Announcement card
  annRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  annIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  annIcon: {
    fontSize: 22,
  },
  annBody: {
    flex: 1,
    gap: 3,
  },
  annTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  annTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#0F172A',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  categoryText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
  },
  annSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  annDate: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#94A3B8',
  },
});
