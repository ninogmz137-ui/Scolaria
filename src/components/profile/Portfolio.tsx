import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Plus } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';

/** Single accent for all portfolio progress fills (no per-activity bar colors). */
const PORTFOLIO_BAR_COLOR = '#7C3AED';

interface Activity {
  id: string;
  name: string;
  emoji: string;
  category: string;
  level: string;
  color: string;
  hoursPerWeek?: number;
  progressPercent?: number;
  since?: string;
}

interface Props {
  activities: Activity[];
}

export default function Portfolio({ activities }: Props) {
  const totalH = activities.reduce((sum, a) => sum + (a.hoursPerWeek || 0), 0);

  return (
    <View style={styles.wrap}>
      <BlurView intensity={16} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Portfolio</Text>
            <Text style={styles.meta}>
              {activities.length} activité{activities.length > 1 ? 's' : ''} · {totalH}h/semaine
            </Text>
          </View>
          <Pressable style={styles.addBtn} hitSlop={8}>
            <Plus size={16} color="#7C3AED" strokeWidth={2} />
          </Pressable>
        </View>

        <View style={styles.grid}>
          {activities.map((activity) => (
            <View key={activity.id} style={styles.cell}>
              <View style={[styles.cellInner, { borderTopColor: activity.color, borderTopWidth: 3 }]}>
                <Text style={styles.emoji}>{activity.emoji}</Text>
                <Text style={styles.name} numberOfLines={2}>
                  {activity.name}
                </Text>
                <Text style={styles.category} numberOfLines={1}>
                  {activity.category}
                </Text>
                {activity.progressPercent != null && (
                  <View style={styles.progressRow}>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          { width: `${activity.progressPercent}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.pct}>{activity.progressPercent}%</Text>
                  </View>
                )}
                <View style={[styles.badge, { borderColor: activity.color }]}>
                  <Text style={[styles.badgeText, { color: activity.color }]} numberOfLines={1}>
                    {activity.level}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  inner: { padding: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#9CA3AF',
  },
  meta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(124,58,237,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  cell: {
    width: '31%',
    minWidth: 100,
    marginBottom: 8,
  },
  cellInner: {
    backgroundColor: 'rgba(248,249,252,0.85)',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  emoji: { fontSize: 22, marginBottom: 6 },
  name: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: '#1A2340',
    textAlign: 'center',
    minHeight: 28,
  },
  category: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 9,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 4,
    marginBottom: 6,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: PORTFOLIO_BAR_COLOR,
  },
  pct: {
    fontFamily: FontFamily.sansBold,
    fontSize: 9,
    color: PORTFOLIO_BAR_COLOR,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: '100%',
  },
  badgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 9,
  },
});
