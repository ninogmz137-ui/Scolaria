/**
 * AccueilScreen — Dashboard with wallpaper background + glass cards.
 *
 * Wallpaper is fixed, content scrolls on top with glass morphism tiles.
 * No gradient header — all content is glass cards over the wallpaper.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Animated,
  Pressable as RNPressable,
  StyleSheet,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Papicons } from '@getpapillon/papicons';
import GlassCard from '../components/GlassCard';
import WallpaperBackground from '../components/WallpaperBackground';
import ScreenHeader from '../components/ScreenHeader';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { getTodayAbsence, MOTIF_LABELS } from '../services/absenceService';
import { FontFamily } from '../hooks/useSolariaFonts';
import { getCheckins, getGrades, getAgendaEvents } from '../services/database';
import { getParentMots } from '../services/liaisonService';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';

// ─── Mock data ──────────────────────────────────────────

interface DashboardData {
  ariaSummary: string;
  liaison: { total: number; unsigned: number };
  devoirs: { count: number; nextDate: string };
  notes: { average: number; trend: number };
  agenda: { weekEvents: number; nextEvent: string };
  joyScore: { value: number; trend: 'stable' | 'up' | 'down' };
}

function getMockDashboard(childId: string, childName: string = 'Votre enfant'): DashboardData {
  switch (childId) {
    case '1':
      return {
        ariaSummary: `${childName} a une journée tranquille. Atelier peinture prévu ce matin. Aucun mot en attente dans le cahier de liaison.`,
        liaison: { total: 3, unsigned: 0 },
        devoirs: { count: 0, nextDate: '—' },
        notes: { average: 0, trend: 0 },
        agenda: { weekEvents: 4, nextEvent: 'Atelier peinture · 10h' },
        joyScore: { value: 4.2, trend: 'up' },
      };
    case '2':
      return {
        ariaSummary: `${childName} a un contrôle de Maths vendredi. 2 devoirs à rendre cette semaine. 1 mot non signé dans le cahier de liaison.`,
        liaison: { total: 4, unsigned: 1 },
        devoirs: { count: 2, nextDate: 'Jeudi' },
        notes: { average: 14.2, trend: 0.8 },
        agenda: { weekEvents: 6, nextEvent: 'Contrôle Maths · Vendredi' },
        joyScore: { value: 3.8, trend: 'stable' },
      };
    case '3':
    default:
      return {
        ariaSummary: `Bonne journée pour ${childName}. Aucun devoir urgent. 1 autorisation à signer pour la sortie du 15 avril.`,
        liaison: { total: 4, unsigned: 1 },
        devoirs: { count: 1, nextDate: 'Lundi' },
        notes: { average: 15.6, trend: -0.3 },
        agenda: { weekEvents: 8, nextEvent: 'SVT · Demain 10h' },
        joyScore: { value: 4.0, trend: 'up' },
      };
  }
}

// ─── Joy config ─────────────────────────────────────────

const JOY_TREND = {
  up: { label: 'En hausse', icon: 'ArrowUp' as const, color: '#10B981' },
  stable: { label: 'Stable', icon: 'Minus' as const, color: '#F59E0B' },
  down: { label: 'Attention', icon: 'ArrowDown' as const, color: '#EF4444' },
};

// ─── Mock cours du jour ─────────────────────────────────

const MOCK_COURS = [
  { time: '8h30', subject: 'Français', room: 'Salle 12', color: '#6366F1' },
  { time: '9h30', subject: 'Mathématiques', room: 'Salle 8', color: '#EF4444' },
  { time: '10h30', subject: 'Histoire', room: 'Salle 3', color: '#F59E0B' },
  { time: '13h30', subject: 'SVT', room: 'Labo B', color: '#10B981' },
  { time: '14h30', subject: 'Anglais', room: 'Salle 15', color: '#EC4899' },
];

// ─── Component ──────────────────────────────────────────

export default function AccueilScreen() {
  const { theme } = useChildTheme();
  const { selectedChild, selectedChildId, fadeAnim } = useActiveChild();

  // Card-specific text colors — switch on dark background themes (primaire mode)
  const cardText          = theme.isDarkBg ? '#FFFFFF'              : '#0F172A';
  const cardTextSecondary = theme.isDarkBg ? 'rgba(255,255,255,0.7)' : '#64748B';
  const cardTextMuted     = theme.isDarkBg ? 'rgba(255,255,255,0.5)' : '#94A3B8';
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const todayAbsence = getTodayAbsence(selectedChildId);
  const accent = theme.accent;
  const [data, setData] = useState<DashboardData>(getMockDashboard(selectedChildId, selectedChild?.name));

  // Topbar spacer height
  const TOPBAR_H = insets.top + 56;

  const loadDashboard = useCallback(async (childId: string, childName: string) => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const [motsResult, agendaResult, gradesResult, checkinsResult] = await Promise.allSettled([
      getParentMots(childId),
      getAgendaEvents(childId, {
        startDate: monday.toISOString(),
        endDate: sunday.toISOString(),
      }),
      getGrades(childId, { limit: 20 }),
      getCheckins(childId, { days: 7 }),
    ]);

    const mots: any[]     = motsResult.status     === 'fulfilled' ? (motsResult.value?.data     ?? []) : [];
    const events: any[]   = agendaResult.status   === 'fulfilled' ? (agendaResult.value?.data   ?? []) : [];
    const grades: any[]   = gradesResult.status   === 'fulfilled' ? (gradesResult.value?.data   ?? []) : [];
    const checkins: any[] = checkinsResult.status === 'fulfilled' ? (checkinsResult.value?.data ?? []) : [];

    if (!mots.length && !events.length && !grades.length && !checkins.length) {
      setData(getMockDashboard(childId, childName));
      return;
    }

    const liaisonTotal    = mots.length;
    const liaisonUnsigned = mots.filter((m: any) => !m.signed).length;

    const sortedEvents = [...events].sort(
      (a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    const nextEventObj = sortedEvents.find((e: any) => new Date(e.start_time) >= now);
    const nextEventLabel = nextEventObj
      ? (() => {
          const d = new Date(nextEventObj.start_time);
          const hh = d.getHours().toString().padStart(2, '0');
          const mm = d.getMinutes().toString().padStart(2, '0');
          return `${nextEventObj.title} · ${hh}h${mm !== '00' ? mm : ''}`;
        })()
      : '—';

    let gradeAverage = 0;
    let gradeTrend   = 0;
    if (grades.length > 0) {
      const normalized = grades.map((g: any) =>
        g.max_value && g.max_value !== 20
          ? (g.value / g.max_value) * 20
          : g.value
      );
      gradeAverage = normalized.reduce((s: number, v: number) => s + v, 0) / normalized.length;
      if (normalized.length >= 10) {
        const last5 = normalized.slice(0, 5);
        const prev5 = normalized.slice(5, 10);
        const avgLast = last5.reduce((s: number, v: number) => s + v, 0) / 5;
        const avgPrev = prev5.reduce((s: number, v: number) => s + v, 0) / 5;
        gradeTrend = Math.round((avgLast - avgPrev) * 10) / 10;
      }
    }

    let joyValue: number = 0;
    let joyTrend: 'stable' | 'up' | 'down' = 'stable';
    if (checkins.length > 0) {
      const scores = checkins.map((c: any) => c.joy_score ?? 0);
      joyValue = Math.round((scores.reduce((s: number, v: number) => s + v, 0) / scores.length) * 10) / 10;
      if (scores.length >= 4) {
        const recentHalf = scores.slice(0, Math.floor(scores.length / 2));
        const olderHalf  = scores.slice(Math.floor(scores.length / 2));
        const rAvg = recentHalf.reduce((s: number, v: number) => s + v, 0) / recentHalf.length;
        const oAvg = olderHalf.reduce((s: number, v: number) => s + v, 0) / olderHalf.length;
        const delta = rAvg - oAvg;
        joyTrend = delta > 0.3 ? 'up' : delta < -0.3 ? 'down' : 'stable';
      }
    }

    const mock = getMockDashboard(childId, childName);
    setData({
      ariaSummary: mock.ariaSummary,
      liaison: { total: liaisonTotal, unsigned: liaisonUnsigned },
      devoirs: mock.devoirs,
      notes: { average: Math.round(gradeAverage * 10) / 10, trend: gradeTrend },
      agenda: { weekEvents: events.length, nextEvent: nextEventLabel },
      joyScore: { value: joyValue || mock.joyScore.value, trend: joyTrend },
    });
  }, []);

  const enterAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    enterAnim.setValue(0);
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 400,
      delay: 100,
      useNativeDriver: true,
    }).start();
    loadDashboard(selectedChildId, selectedChild?.name || 'Votre enfant');
  }, [selectedChildId, loadDashboard]);

  return (
    <View style={styles.root}>
      <WallpaperBackground />

      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: TOPBAR_H + 12, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10 },
          ]}
        >
          {/* ── Quick tiles 2×2 grid ── */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionBar, { backgroundColor: accent }]} />
            <Text style={[styles.sectionLabel, { color: theme.textOnBg }]}>Aujourd'hui</Text>
          </View>

          <Animated.View style={[styles.tileGrid, { opacity: enterAnim }]}>
            <GlassTile
              icon="Paper"
              iconColor="#FF8C42"
              value={String(data.liaison.total)}
              label="Mots reçus"
              detail={data.liaison.unsigned > 0 ? `${data.liaison.unsigned} à signer` : 'Tout signé'}
              detailColor={data.liaison.unsigned > 0 ? '#EF4444' : undefined}
              badge={data.liaison.unsigned > 0 ? data.liaison.unsigned : undefined}
              onPress={() => navigation.navigate('CahierLiaisonScreen')}
            />
            <GlassTile
              icon="Pen"
              iconColor="#38BDF8"
              value={String(data.devoirs.count)}
              label="Devoirs"
              detail={data.devoirs.count > 0 ? `Prochain : ${data.devoirs.nextDate}` : 'Aucun devoir'}
              onPress={() => navigation.navigate('Agenda')}
            />
            <GlassTile
              icon="Grades"
              iconColor="#A78BFA"
              value={data.notes.average > 0 ? data.notes.average.toFixed(1) : '—'}
              label="Moyenne"
              detail={
                data.notes.trend !== 0
                  ? `${data.notes.trend > 0 ? '+' : ''}${data.notes.trend.toFixed(1)} vs mois dernier`
                  : '—'
              }
              detailColor={data.notes.trend > 0 ? '#10B981' : data.notes.trend < 0 ? '#EF4444' : undefined}
              onPress={() => navigation.getParent()?.navigate('Notes')}
            />
            <GlassTile
              icon="Calendar"
              iconColor="#10B981"
              value={String(data.agenda.weekEvents)}
              label="Cette semaine"
              detail={data.agenda.nextEvent}
              onPress={() => navigation.getParent()?.navigate('Agenda')}
            />
          </Animated.View>

          {/* ── Cours du jour ── */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionBar, { backgroundColor: accent }]} />
            <Text style={[styles.sectionLabel, { color: theme.textOnBg }]}>Cours du jour</Text>
          </View>

          <GlassCard style={{ marginBottom: 14 }} noPadding>
            <View style={{ padding: 4 }}>
              {MOCK_COURS.map((cours, i) => (
                <View key={i} style={styles.coursRow}>
                  <View style={[styles.coursBar, { backgroundColor: cours.color }]} />
                  <Text style={[styles.coursTime, { color: cardTextSecondary }]}>{cours.time}</Text>
                  <View style={styles.coursFlex}>
                    <Text style={[styles.coursSubject, { color: cardText }]}>{cours.subject}</Text>
                    <Text style={[styles.coursRoom, { color: cardTextMuted }]}>{cours.room}</Text>
                  </View>
                </View>
              ))}
            </View>
          </GlassCard>

          {/* ── Aria synthesis ── */}
          <GlassCard style={{ marginBottom: 14 }}>
            <View style={styles.ariaHeader}>
              <LinearGradient
                colors={[accent, accent + 'AA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ariaIcon}
              >
                <Text style={{ fontSize: 12, color: '#FFFFFF', fontFamily: FontFamily.sansBold }}>✦</Text>
              </LinearGradient>
              <Text style={[styles.ariaLabel, { color: cardTextSecondary }]}>Aria · Synthèse du jour</Text>
            </View>
            <Text style={[styles.ariaSummary, { color: cardText }]}>{data.ariaSummary}</Text>
          </GlassCard>

          {/* ── Absence banner ── */}
          {todayAbsence && (
            <GlassCard style={{ marginBottom: 14 }}>
              <View style={styles.absenceRow}>
                <Papicons name="Calendar" size={18} color={accent} />
                <Text style={[styles.absenceText, { color: cardTextSecondary }]} numberOfLines={1}>
                  {selectedChild.name} absent(e) · {MOTIF_LABELS[todayAbsence.motif]}{' '}
                  {todayAbsence.statut === 'prise_en_compte' ? '✓' : '⏳'}
                </Text>
              </View>
            </GlassCard>
          )}

          {/* ── Signal absence button ── */}
          <RNPressable
            style={[
              styles.absenceButton,
              {
                backgroundColor: theme.isDarkBg
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(0,0,0,0.04)',
                borderColor: theme.isDarkBg
                  ? 'rgba(255,255,255,0.25)'
                  : 'rgba(0,0,0,0.1)',
              },
            ]}
            onPress={() => navigation.navigate('SignalerAbsenceScreen')}
          >
            <Papicons name="Add" size={20} color={accent} />
            <Text style={[styles.absenceButtonText, { color: accent }]}>
              Prévenir d'une absence
            </Text>
          </RNPressable>

          {/* ── Score de Joie ── */}
          <RNPressable onPress={() => navigation.navigate('BienEtreScreen')}>
            <GlassCard>
              <View style={styles.joyRow}>
                <View style={[styles.joyEmoji, { backgroundColor: JOY_TREND[data.joyScore.trend].color + '15' }]}>
                  <Text style={{ fontSize: 24 }}>💛</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.joyLabel, { color: cardTextSecondary }]}>Score de Joie</Text>
                  <View style={styles.joyValueRow}>
                    <Text style={[styles.joyValue, { color: cardText }]}>{data.joyScore.value}</Text>
                    <Text style={[styles.joyMax, { color: cardTextMuted }]}>/5</Text>
                    <Text style={[styles.joyPeriod, { color: cardTextMuted }]}>cette semaine</Text>
                  </View>
                  <View style={styles.joyTrendRow}>
                    <Papicons
                      name={JOY_TREND[data.joyScore.trend].icon}
                      size={14}
                      color={JOY_TREND[data.joyScore.trend].color}
                    />
                    <Text style={[styles.joyTrendText, { color: JOY_TREND[data.joyScore.trend].color }]}>
                      {JOY_TREND[data.joyScore.trend].label}
                    </Text>
                  </View>
                </View>
                <Papicons name="ChevronRight" size={18} color={cardTextMuted} />
              </View>
            </GlassCard>
          </RNPressable>
        </ScrollView>

        {/* ScreenHeader renders above scroll content (position:absolute, zIndex:1) */}
        <ScreenHeader />
      </Animated.View>
    </View>
  );
}

// ─── GlassTile — Quick metric tile with glass effect ────

function GlassTile({
  icon,
  iconColor,
  value,
  label,
  detail,
  detailColor,
  badge,
  onPress,
}: {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
  detail: string;
  detailColor?: string;
  badge?: number;
  onPress: () => void;
}) {
  const { theme: tileTheme } = useChildTheme();
  const cardText          = tileTheme.isDarkBg ? '#FFFFFF'               : '#0F172A';
  const cardTextSecondary = tileTheme.isDarkBg ? 'rgba(255,255,255,0.7)' : '#64748B';
  const cardTextMuted     = tileTheme.isDarkBg ? 'rgba(255,255,255,0.5)' : '#94A3B8';

  return (
    <RNPressable onPress={onPress} style={styles.tileWrap}>
      <GlassCard style={styles.tileFull}>
        <View style={styles.tileHeader}>
          <View style={[styles.tileIcon, { backgroundColor: iconColor + '20' }]}>
            <Papicons name={icon} size={18} color={iconColor} />
          </View>
          {badge !== undefined && badge > 0 && (
            <View style={styles.tileBadge}>
              <Text style={styles.tileBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tileValue, { color: cardText }]}>{value}</Text>
        <Text style={[styles.tileLabel, { color: cardTextSecondary }]}>{label}</Text>
        <Text
          style={[styles.tileDetail, { color: detailColor ?? cardTextMuted }]}
          numberOfLines={1}
        >
          {detail}
        </Text>
      </GlassCard>
    </RNPressable>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 18, gap: 12 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBar: { width: 4, height: 16, borderRadius: 2 },
  sectionLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    // color is applied inline via theme.textOnBg
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // Tile grid
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tileWrap: { width: '47%', flexGrow: 1 },
  tileFull: { flex: 1 },
  tileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tileBadgeText: { fontFamily: FontFamily.sansBold, fontSize: 10, color: '#FFFFFF' },
  tileValue: { fontFamily: FontFamily.sansBold, fontSize: 26, color: '#0F172A', marginBottom: 2 },
  tileLabel: { fontFamily: FontFamily.sansSemiBold, fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  tileDetail: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: '#94A3B8' },

  // Cours du jour
  coursRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, gap: 12 },
  coursBar: { width: 4, height: 32, borderRadius: 2 },
  coursTime: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, color: '#64748B', width: 40 },
  coursFlex: { flex: 1 },
  coursSubject: { fontFamily: FontFamily.sansBold, fontSize: 14, color: '#0F172A' },
  coursRoom: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: '#94A3B8', marginTop: 1 },

  // Aria
  ariaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  ariaIcon: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  ariaLabel: { fontFamily: FontFamily.sansBold, fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1.2 },
  ariaSummary: { fontFamily: FontFamily.sansRegular, fontSize: 14, color: '#0F172A', lineHeight: 21 },

  // Absence
  absenceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  absenceText: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, color: '#64748B', flex: 1 },
  absenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 16,
    // backgroundColor and borderColor applied inline via theme.isDarkBg
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  absenceButtonText: { fontFamily: FontFamily.sansBold, fontSize: 14 },

  // Joy score
  joyRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  joyEmoji: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  joyLabel: { fontFamily: FontFamily.sansBold, fontSize: 13, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8 },
  joyValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  joyValue: { fontFamily: FontFamily.sansBold, fontSize: 24, color: '#0F172A' },
  joyMax: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: '#94A3B8' },
  joyPeriod: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#94A3B8', marginLeft: 4 },
  joyTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  joyTrendText: { fontFamily: FontFamily.sansBold, fontSize: 12 },
});
