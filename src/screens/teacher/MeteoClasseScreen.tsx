/**
 * Météo de Classe — Dashboard de bien-être anonymisé.
 *
 * Affiche la tendance globale du bien-être de la classe,
 * avec des indicateurs anonymisés (aucun nom d'élève visible).
 */

import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────

interface DayWeather {
  day: string;      // "Lun", "Mar", etc.
  date: string;     // "17 mars"
  avgScore: number;  // 0-10
  responses: number;
  alerts: number;
}

interface EmotionDistribution {
  emoji: string;
  label: string;
  percent: number;
  color: string;
}

// ─── Mock data ───────────────────────────────────────────

const CLASS_INFO = {
  name: 'CM2-A',
  school: 'École Voltaire',
  totalStudents: 26,
  respondedToday: 22,
};

const WEEK_DATA: DayWeather[] = [
  { day: 'Lun', date: '16 mars', avgScore: 7.2, responses: 24, alerts: 0 },
  { day: 'Mar', date: '17 mars', avgScore: 6.8, responses: 22, alerts: 1 },
  { day: 'Mer', date: '18 mars', avgScore: 7.5, responses: 20, alerts: 0 },
  { day: 'Jeu', date: '19 mars', avgScore: 6.3, responses: 23, alerts: 2 },
  { day: 'Ven', date: '20 mars', avgScore: 7.1, responses: 22, alerts: 0 },
];

const EMOTION_DISTRIBUTION: EmotionDistribution[] = [
  { emoji: '😄', label: 'Très bien', percent: 42, color: Colors.green },
  { emoji: '🙂', label: 'Bien', percent: 31, color: Colors.cyan },
  { emoji: '😐', label: 'Bof', percent: 18, color: Colors.orange },
  { emoji: '😢', label: 'Difficile', percent: 9, color: Colors.red },
];

const WELLBEING_INDICATORS = [
  { label: 'Énergie moyenne', value: 6.8, icon: '⚡', trend: +0.3 },
  { label: 'Stress moyen', value: 3.2, icon: '😰', trend: -0.5 },
  { label: 'Motivation', value: 7.1, icon: '🎯', trend: +0.2 },
  { label: 'Climat social', value: 7.4, icon: '👥', trend: +0.1 },
];

const ANONYMOUS_ALERTS = [
  {
    id: '1',
    level: 'vigilance' as const,
    message: '1 élève montre une baisse de -35% du Score de Joie sur 5 jours',
    date: 'Aujourd\'hui',
  },
  {
    id: '2',
    level: 'attention' as const,
    message: '3 élèves ont un niveau de stress supérieur à 7/10',
    date: 'Hier',
  },
];

// ─── Helpers ─────────────────────────────────────────────

function getWeatherEmoji(score: number): string {
  if (score >= 8) return '☀️';
  if (score >= 6.5) return '⛅';
  if (score >= 5) return '🌥️';
  if (score >= 3) return '🌧️';
  return '⛈️';
}

function getWeatherLabel(score: number): string {
  if (score >= 8) return 'Grand soleil';
  if (score >= 6.5) return 'Éclaircie';
  if (score >= 5) return 'Nuageux';
  if (score >= 3) return 'Pluie';
  return 'Orage';
}

function getScoreColor(score: number): string {
  if (score >= 7.5) return Colors.green;
  if (score >= 6) return Colors.cyan;
  if (score >= 4) return Colors.orange;
  return Colors.red;
}

// ─── Component ───────────────────────────────────────────

export default function MeteoClasseScreen() {
  const [selectedDay, setSelectedDay] = useState(4); // Friday

  // Animations
  const headerScale = useRef(new Animated.Value(0)).current;
  const barAnims = useRef(WEEK_DATA.map(() => new Animated.Value(0))).current;
  const distAnims = useRef(EMOTION_DISTRIBUTION.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(headerScale, {
        toValue: 1, tension: 80, friction: 8, useNativeDriver: true,
      }),
      Animated.stagger(100, barAnims.map((a) =>
        Animated.spring(a, { toValue: 1, tension: 60, friction: 8, useNativeDriver: false }),
      )),
      Animated.stagger(80, distAnims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 400, useNativeDriver: false }),
      )),
    ]).start();
  }, []);

  const todayScore = WEEK_DATA[selectedDay].avgScore;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with big weather */}
      <LinearGradient
        colors={[Colors.cyanDark, Colors.blueNight]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
        style={styles.header}
      >
        <Text style={styles.className}>
          {CLASS_INFO.name} — {CLASS_INFO.school}
        </Text>

        <Animated.View style={[styles.weatherCenter, { transform: [{ scale: headerScale }] }]}>
          <Text style={styles.weatherEmoji}>{getWeatherEmoji(todayScore)}</Text>
          <Text style={styles.weatherScore}>{todayScore.toFixed(1)}</Text>
          <Text style={styles.weatherLabel}>{getWeatherLabel(todayScore)}</Text>
        </Animated.View>

        <View style={styles.participationBadge}>
          <Ionicons name="people" size={14} color={Colors.cyan} />
          <Text style={styles.participationText}>
            {CLASS_INFO.respondedToday}/{CLASS_INFO.totalStudents} élèves ont répondu
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Week bar chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Semaine du 16 mars</Text>
          <View style={styles.weekChart}>
            {WEEK_DATA.map((day, i) => {
              const heightPercent = (day.avgScore / 10) * 100;
              return (
                <TouchableOpacity
                  key={day.day}
                  style={styles.dayColumn}
                  onPress={() => setSelectedDay(i)}
                  activeOpacity={0.7}
                >
                  {/* Score label */}
                  <Text style={[
                    styles.dayScore,
                    selectedDay === i && { color: Colors.white, fontWeight: '800' },
                  ]}>
                    {day.avgScore.toFixed(1)}
                  </Text>

                  {/* Bar */}
                  <View style={styles.barBg}>
                    <Animated.View
                      style={[
                        styles.barFill,
                        {
                          height: barAnims[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', `${heightPercent}%`],
                          }),
                          backgroundColor: getScoreColor(day.avgScore),
                          opacity: selectedDay === i ? 1 : 0.6,
                        },
                      ]}
                    />
                  </View>

                  {/* Day label */}
                  <Text style={[
                    styles.dayLabel,
                    selectedDay === i && { color: Colors.cyan, fontWeight: '800' },
                  ]}>
                    {day.day}
                  </Text>

                  {/* Alert dot */}
                  {day.alerts > 0 && (
                    <View style={styles.alertDot}>
                      <Text style={styles.alertDotText}>{day.alerts}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Emotion distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Répartition des émotions</Text>
          <View style={styles.distCard}>
            {/* Bar visualization */}
            <View style={styles.distBar}>
              {EMOTION_DISTRIBUTION.map((e, i) => (
                <Animated.View
                  key={e.label}
                  style={[
                    styles.distBarSegment,
                    {
                      flex: distAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, e.percent],
                      }),
                      backgroundColor: e.color,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Legend */}
            <View style={styles.distLegend}>
              {EMOTION_DISTRIBUTION.map((e) => (
                <View key={e.label} style={styles.distItem}>
                  <Text style={styles.distEmoji}>{e.emoji}</Text>
                  <View style={styles.distInfo}>
                    <Text style={styles.distPercent}>{e.percent}%</Text>
                    <Text style={styles.distLabel}>{e.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Wellbeing indicators */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicateurs de bien-être</Text>
          <View style={styles.indicatorsGrid}>
            {WELLBEING_INDICATORS.map((ind) => (
              <View key={ind.label} style={styles.indicatorCard}>
                <Text style={styles.indicatorIcon}>{ind.icon}</Text>
                <Text style={[styles.indicatorValue, { color: getScoreColor(ind.label.includes('Stress') ? 10 - ind.value : ind.value) }]}>
                  {ind.value.toFixed(1)}
                </Text>
                <Text style={styles.indicatorLabel}>{ind.label}</Text>
                <View style={styles.trendBadge}>
                  <Ionicons
                    name={ind.trend >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={10}
                    color={
                      ind.label.includes('Stress')
                        ? (ind.trend <= 0 ? Colors.green : Colors.red)
                        : (ind.trend >= 0 ? Colors.green : Colors.red)
                    }
                  />
                  <Text style={[
                    styles.trendText,
                    {
                      color: ind.label.includes('Stress')
                        ? (ind.trend <= 0 ? Colors.green : Colors.red)
                        : (ind.trend >= 0 ? Colors.green : Colors.red),
                    },
                  ]}>
                    {ind.trend >= 0 ? '+' : ''}{ind.trend.toFixed(1)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Anonymous alerts */}
        {ANONYMOUS_ALERTS.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Signalements anonymes</Text>
            {ANONYMOUS_ALERTS.map((alert) => (
              <View
                key={alert.id}
                style={[
                  styles.alertCard,
                  {
                    borderColor:
                      alert.level === 'vigilance' ? Colors.orange + '40' : Colors.red + '40',
                    backgroundColor:
                      alert.level === 'vigilance' ? '#3D2E10' : '#3D1010',
                  },
                ]}
              >
                <View style={styles.alertHeader}>
                  <View style={[styles.alertLevelBadge, {
                    backgroundColor: (alert.level === 'vigilance' ? Colors.orange : Colors.red) + '20',
                  }]}>
                    <Ionicons
                      name={alert.level === 'vigilance' ? 'warning' : 'alert'}
                      size={14}
                      color={alert.level === 'vigilance' ? Colors.orange : Colors.red}
                    />
                    <Text style={[styles.alertLevelText, {
                      color: alert.level === 'vigilance' ? Colors.orange : Colors.red,
                    }]}>
                      {alert.level === 'vigilance' ? 'Vigilance' : 'Attention'}
                    </Text>
                  </View>
                  <Text style={styles.alertDate}>{alert.date}</Text>
                </View>
                <Text style={styles.alertMessage}>{alert.message}</Text>
              </View>
            ))}

            <View style={styles.anonymityNote}>
              <Ionicons name="eye-off" size={14} color={Colors.gray} />
              <Text style={styles.anonymityText}>
                Les données sont agrégées et anonymisées. Aucun nom d'élève n'est visible.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.blueNight },
  // Header
  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 24 },
  className: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  weatherCenter: { alignItems: 'center', marginBottom: 16 },
  weatherEmoji: { fontSize: 64, marginBottom: 4 },
  weatherScore: { fontSize: 42, fontWeight: '900', color: Colors.white },
  weatherLabel: { fontSize: 16, fontWeight: '600', color: Colors.cyan, marginTop: 2 },
  participationBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 14,
    paddingVertical: 6, borderRadius: 20,
  },
  participationText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  // Body
  body: { paddingHorizontal: 20, paddingTop: 8 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.white, marginBottom: 12 },
  // Week chart
  weekChart: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: Colors.blueNightCard, borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  dayColumn: { alignItems: 'center', flex: 1 },
  dayScore: { fontSize: 12, fontWeight: '600', color: Colors.gray, marginBottom: 6 },
  barBg: {
    width: 28, height: 100, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: { width: '100%', borderRadius: 14 },
  dayLabel: { fontSize: 12, fontWeight: '600', color: Colors.gray, marginTop: 6 },
  alertDot: {
    position: 'absolute', top: -4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.red, justifyContent: 'center', alignItems: 'center',
  },
  alertDotText: { fontSize: 9, fontWeight: '900', color: Colors.white },
  // Emotion distribution
  distCard: {
    backgroundColor: Colors.blueNightCard, borderRadius: 18,
    padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  distBar: {
    flexDirection: 'row', height: 14, borderRadius: 7,
    overflow: 'hidden', marginBottom: 16, gap: 2,
  },
  distBarSegment: { borderRadius: 7 },
  distLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  distItem: { alignItems: 'center', flex: 1 },
  distEmoji: { fontSize: 24, marginBottom: 4 },
  distInfo: { alignItems: 'center' },
  distPercent: { fontSize: 16, fontWeight: '800', color: Colors.white },
  distLabel: { fontSize: 10, color: Colors.gray, marginTop: 1 },
  // Indicators
  indicatorsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  indicatorCard: {
    width: (width - 50) / 2,
    backgroundColor: Colors.blueNightCard, borderRadius: 16,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  indicatorIcon: { fontSize: 24, marginBottom: 6 },
  indicatorValue: { fontSize: 24, fontWeight: '900' },
  indicatorLabel: { fontSize: 11, color: Colors.gray, marginTop: 2, textAlign: 'center' },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    marginTop: 6, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  trendText: { fontSize: 11, fontWeight: '700' },
  // Alerts
  alertCard: {
    borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 8,
  },
  alertHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  alertLevelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  alertLevelText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  alertDate: { fontSize: 11, color: Colors.gray },
  alertMessage: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 19 },
  anonymityNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, paddingHorizontal: 4,
  },
  anonymityText: { flex: 1, fontSize: 11, color: Colors.gray, lineHeight: 16 },
});
