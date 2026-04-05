/**
 * EcoleListScreen — School announcements and information.
 *
 * Shows a list of school-wide announcements: vacations, events, canteen info.
 */

import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ChevronLeft removed — AppTopbar handles back navigation
import { FontFamily } from '../../hooks/useSolariaFonts';

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
    subtitle: "Inscriptions ouvertes jusqu'au 10 avril. Formulaire disponible.",
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: 120 },
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
            style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
            accessibilityRole="button"
          >
            {/* Category icon — emoji in tinted circle (content icon, not avatar) */}
            <View style={[styles.annIconContainer, { backgroundColor: ann.iconBg }]}>
              <Text style={styles.annIcon}>{ann.icon}</Text>
            </View>

            {/* Text column */}
            <View style={styles.annBody}>
              <View style={styles.annTitleRow}>
                <Text style={styles.annTitle} numberOfLines={1}>
                  {ann.title}
                </Text>
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: ann.categoryColor + '18' },
                  ]}
                >
                  <Text style={[styles.categoryText, { color: ann.categoryColor }]}>
                    {ann.category}
                  </Text>
                </View>
              </View>
              <Text style={styles.annSubtitle} numberOfLines={2}>
                {ann.subtitle}
              </Text>
              <Text style={styles.annDate}>{ann.date}</Text>
            </View>
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
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    paddingHorizontal: 18,
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
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // ── Announcement card (plain white, no glass)
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
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
    color: '#1A2340',
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
