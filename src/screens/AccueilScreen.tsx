/**
 * AccueilScreen — Premium dashboard with immersive header & rich tiles.
 *
 * Visual upgrades:
 * - Header 38% screen, #0B1628→accent gradient, radius 32
 * - Page bg #E8EDF5 for strong card contrast
 * - Tiles with micro-gradients, accent top borders, deep shadows
 * - Score de Joie as a full section card with colored left bar
 * - Decorative blobs in content area corners
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  Animated,
  Platform,
  Pressable as RNPressable,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Box, Text, HStack, VStack } from '../components/ui';
import DecorativeBlobs from '../components/DecorativeBlobs';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { getTodayAbsence, MOTIF_LABELS } from '../services/absenceService';
import { FontFamily } from '../hooks/useSolariaFonts';
import { getCheckins, getGrades, getAgendaEvents } from '../services/database';
import { getParentMots } from '../services/liaisonService';

// ─── Constants ──────────────────────────────────────────

const HEADER_BG = '#0B1628';
const PAGE_BG = '#E8EDF5';
const CARD_BG = '#FFFFFF';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#64748B';
const TEXT_MUTED = '#94A3B8';
const HEADER_RATIO = 0.38;
const SCREEN_H = Dimensions.get('window').height;

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
  up: { label: 'En hausse', icon: 'trending-up' as const, color: '#10B981' },
  stable: { label: 'Stable', icon: 'remove' as const, color: '#F59E0B' },
  down: { label: 'Attention', icon: 'trending-down' as const, color: '#EF4444' },
};

// ─── Tile gradient configs ──────────────────────────────

const TILE_GRADIENTS: Record<string, [string, string]> = {
  liaison: ['#EEF2FF', '#FFFFFF'],
  devoirs: ['#F0FDF4', '#FFFFFF'],
  notes: ['#EEF2FF', '#FFFFFF'],
  agenda: ['#FFF7ED', '#FFFFFF'],
};

// ─── Shared shadow (deep, visible) ─────────────────────

// Topbar height to account for (topbar overlays the header in transparent mode)
const TOPBAR_HEIGHT = Platform.OS === 'ios' ? 104 : 62;

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
  },
  android: { elevation: 8 },
  default: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
  },
}) as Record<string, any>;

// ─── Component ──────────────────────────────────────────

export default function AccueilScreen() {
  const { theme } = useChildTheme();
  const { children: allChildren, selectedChild, selectedChildId, selectChild, fadeAnim } = useActiveChild();
  const navigation = useNavigation<any>();

  const todayAbsence = getTodayAbsence(selectedChildId);
  const accent = theme.accent;
  const [childDropdownOpen, setChildDropdownOpen] = useState(false);
  const [data, setData] = useState<DashboardData>(getMockDashboard(selectedChildId, selectedChild?.name));

  const loadDashboard = useCallback(async (childId: string, childName: string) => {
    // Compute Monday–Sunday of the current week
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
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

    // If every source returned empty, fall back to mock
    if (!mots.length && !events.length && !grades.length && !checkins.length) {
      setData(getMockDashboard(childId, childName));
      return;
    }

    // Liaison
    const liaisonTotal    = mots.length;
    const liaisonUnsigned = mots.filter((m: any) => !m.signed).length;

    // Agenda — next event by start_time ascending
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

    // Grades — average + trend (last 5 vs previous 5)
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

    // Joy score — average + trend
    let joyValue: number                        = 0;
    let joyTrend: 'stable' | 'up' | 'down'     = 'stable';
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
      // ariaSummary stays from mock — AI-generated, not from DB yet
      ariaSummary: mock.ariaSummary,
      liaison: { total: liaisonTotal, unsigned: liaisonUnsigned },
      devoirs: mock.devoirs, // not in DB yet
      notes: { average: Math.round(gradeAverage * 10) / 10, trend: gradeTrend },
      agenda: { weekEvents: events.length, nextEvent: nextEventLabel },
      joyScore: { value: joyValue || mock.joyScore.value, trend: joyTrend },
    });
  }, []);

  // Stagger entrance
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

  const accentBorder = (color: string) => `rgba(${hexToRgb(color)}, 0.15)`;

  return (
    <Box className="flex-1" style={{ backgroundColor: PAGE_BG }}>
      {/* ═══════════════════════════════════════════════════════
          IMMERSIVE HEADER — 38%, gradient + dot pattern overlay
          ═══════════════════════════════════════════════════════ */}
      <LinearGradient
        colors={[HEADER_BG, accent + 'DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={{
          minHeight: SCREEN_H * HEADER_RATIO,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs inside the header corners */}
        <Box
          className="absolute"
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: accent,
            opacity: 0.20,
            top: -30,
            left: -25,
          }}
          pointerEvents="none"
        />
        <Box
          className="absolute"
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: accent,
            opacity: 0.15,
            top: -15,
            right: -20,
          }}
          pointerEvents="none"
        />
        <Box
          className="absolute"
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#22D3EE',
            opacity: 0.10,
            bottom: 30,
            right: 20,
          }}
          pointerEvents="none"
        />

        {/* 4px brand gradient banner at very top */}
        <LinearGradient
          colors={['#6366F1', '#22D3EE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 4 }}
        />

        {/* Spacer for the transparent topbar overlay (burger + logo + bell) */}
        <Box style={{ height: TOPBAR_HEIGHT - 4 }} />

        {/* Child pill selector — single pill with dropdown */}
        <Box className="items-center px-4 pt-1 pb-3" style={{ zIndex: 20 }}>
          <RNPressable
            onPress={() => setChildDropdownOpen(!childDropdownOpen)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.25)',
            }}
          >
            {/* Avatar emoji */}
            <Text style={{ fontSize: 22 }}>{selectedChild.avatar}</Text>
            <Text style={{ fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: '#FFFFFF' }}>
              {selectedChild.name}
            </Text>
            <Ionicons
              name={childDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="rgba(255,255,255,0.5)"
            />
          </RNPressable>

          {/* Dropdown list */}
          {childDropdownOpen && (
            <Box
              className="rounded-xl overflow-hidden"
              style={{
                position: 'absolute',
                top: 50,
                backgroundColor: '#FFFFFF',
                minWidth: 200,
                ...CARD_SHADOW,
                borderWidth: 1,
                borderColor: '#EEF0F5',
              }}
            >
              {allChildren.map((child) => {
                const isActive = child.id === selectedChildId;
                return (
                  <RNPressable
                    key={child.id}
                    onPress={() => {
                      selectChild(child.id);
                      setChildDropdownOpen(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      backgroundColor: isActive ? accent + '10' : 'transparent',
                      borderBottomWidth: 1,
                      borderBottomColor: '#EEF0F5',
                    }}
                  >
                    <Box
                      className="items-center justify-center"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: isActive ? accent + '30' : '#F1F5F9',
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>{child.avatar}</Text>
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Text style={{
                        fontFamily: isActive ? FontFamily.sansBold : FontFamily.sansSemiBold,
                        fontSize: 14,
                        color: TEXT_PRIMARY,
                      }}>
                        {child.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{child.classe}</Text>
                    </Box>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={18} color={accent} />
                    )}
                  </RNPressable>
                );
              })}
            </Box>
          )}
        </Box>

        {/* ── Aria synthesis card — INSIDE the header ── */}
        <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 18, paddingBottom: 24, flex: 1, justifyContent: 'flex-end' }}>
          <Box
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(255,255,255,0.10)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            {/* Aria header strip */}
            <HStack
              className="items-center gap-2 px-4 py-2.5"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              <LinearGradient
                colors={['#6366F1', '#22D3EE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 12, color: '#FFFFFF', fontFamily: FontFamily.sansBold }}>✦</Text>
              </LinearGradient>
              <Text
                style={{
                  fontFamily: FontFamily.sansBold,
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  flex: 1,
                }}
              >
                Aria · Synthèse du jour
              </Text>
            </HStack>

            <Box className="px-4 py-3.5">
              <Text
                style={{
                  fontFamily: FontFamily.sansRegular,
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.88)',
                  lineHeight: 21,
                }}
              >
                {data.ariaSummary}
              </Text>
            </Box>
          </Box>
        </Animated.View>
      </LinearGradient>

      {/* ═══════════════════════════════════════════════════════
          CONTENT — Decorative blobs + tiles + joy score
          ═══════════════════════════════════════════════════════ */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim, position: 'relative' }}>
        {/* Decorative corner blobs */}
        <DecorativeBlobs accent={accent} size={90} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 18, paddingTop: 22, paddingBottom: 28, gap: 14 }}
        >
          {/* Section label with colored left bar */}
          <HStack className="items-center" style={{ gap: 8, marginBottom: -2 }}>
            <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: accent }} />
            <Text
              style={{
                fontFamily: FontFamily.sansBold,
                fontSize: 13,
                color: TEXT_PRIMARY,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
              }}
            >
              Aujourd'hui
            </Text>
          </HStack>

          {/* 2×2 Tile grid */}
          <Box className="flex-row flex-wrap" style={{ gap: 12 }}>
            <TileCard
              icon="book"
              iconBg="#FF8C42"
              accentColor={accent}
              topBorderColor="#FF8C42"
              gradient={TILE_GRADIENTS.liaison}
              value={String(data.liaison.total)}
              label="Mots reçus"
              detail={data.liaison.unsigned > 0 ? `${data.liaison.unsigned} à signer` : 'Tout signé'}
              detailColor={data.liaison.unsigned > 0 ? '#EF4444' : undefined}
              badge={data.liaison.unsigned > 0 ? data.liaison.unsigned : undefined}
              onPress={() => navigation.navigate('CahierLiaisonScreen')}
            />
            <TileCard
              icon="create"
              iconBg="#38BDF8"
              accentColor={accent}
              topBorderColor="#38BDF8"
              gradient={TILE_GRADIENTS.devoirs}
              value={String(data.devoirs.count)}
              label="Devoirs"
              detail={data.devoirs.count > 0 ? `Prochain : ${data.devoirs.nextDate}` : 'Aucun devoir'}
              onPress={() => navigation.navigate('Agenda')}
            />
            <TileCard
              icon="school"
              iconBg="#A78BFA"
              accentColor={accent}
              topBorderColor="#A78BFA"
              gradient={TILE_GRADIENTS.notes}
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
            <TileCard
              icon="calendar"
              iconBg="#10B981"
              accentColor={accent}
              topBorderColor="#10B981"
              gradient={TILE_GRADIENTS.agenda}
              value={String(data.agenda.weekEvents)}
              label="Cette semaine"
              detail={data.agenda.nextEvent}
              onPress={() => navigation.getParent()?.navigate('Agenda')}
            />
          </Box>

          {/* Absence banner */}
          {todayAbsence && (
            <HStack
              className="items-center gap-2.5 p-3.5 rounded-2xl"
              style={{
                backgroundColor: CARD_BG,
                borderWidth: 1.5,
                borderColor: accentBorder(accent),
                ...CARD_SHADOW,
              }}
            >
              <Ionicons name="medical" size={18} color={accent} />
              <Text
                style={{ fontFamily: FontFamily.sansSemiBold, fontSize: 13, color: TEXT_SECONDARY, flex: 1 }}
                numberOfLines={1}
              >
                {selectedChild.name} absent(e) · {MOTIF_LABELS[todayAbsence.motif]}{' '}
                {todayAbsence.statut === 'prise_en_compte' ? '✓' : '⏳'}
              </Text>
            </HStack>
          )}

          {/* Signal absence button */}
          <RNPressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 14,
              borderRadius: 16,
              backgroundColor: CARD_BG,
              borderWidth: 1.5,
              borderColor: accentBorder(accent),
              borderStyle: 'dashed',
              ...CARD_SHADOW,
            }}
            onPress={() => navigation.navigate('SignalerAbsenceScreen')}
          >
            <Ionicons name="add-circle-outline" size={20} color={accent} />
            <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 14, color: accent }}>
              Prévenir d'une absence
            </Text>
          </RNPressable>

          {/* ── Score de Joie — Section card with left color bar ── */}
          <RNPressable onPress={() => navigation.navigate('BienEtreScreen')}>
            <Box
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: CARD_BG,
                borderWidth: 1.5,
                borderColor: accentBorder(JOY_TREND[data.joyScore.trend].color),
                ...CARD_SHADOW,
              }}
            >
              <HStack>
                {/* Colored left bar */}
                <Box style={{ width: 4, backgroundColor: JOY_TREND[data.joyScore.trend].color }} />

                <HStack className="flex-1 items-center gap-3.5 p-4">
                  <Box
                    className="w-12 h-12 rounded-full justify-center items-center"
                    style={{ backgroundColor: JOY_TREND[data.joyScore.trend].color + '15' }}
                  >
                    <Text style={{ fontSize: 24 }}>💛</Text>
                  </Box>
                  <VStack className="flex-1">
                    <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 13, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Score de Joie
                    </Text>
                    <HStack className="items-baseline" style={{ gap: 4 }}>
                      <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 24, color: TEXT_PRIMARY }}>
                        {data.joyScore.value}
                      </Text>
                      <Text style={{ fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: TEXT_MUTED }}>/5</Text>
                      <Text style={{ fontFamily: FontFamily.sansRegular, fontSize: 12, color: TEXT_MUTED, marginLeft: 4 }}>
                        cette semaine
                      </Text>
                    </HStack>
                    <HStack className="items-center gap-1 mt-0.5">
                      <Ionicons
                        name={JOY_TREND[data.joyScore.trend].icon}
                        size={14}
                        color={JOY_TREND[data.joyScore.trend].color}
                      />
                      <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 12, color: JOY_TREND[data.joyScore.trend].color }}>
                        {JOY_TREND[data.joyScore.trend].label}
                      </Text>
                    </HStack>
                  </VStack>
                  <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
                </HStack>
              </HStack>
            </Box>
          </RNPressable>

          <Box className="h-4" />
        </ScrollView>
      </Animated.View>
    </Box>
  );
}

// ─── Hex to RGB helper ──────────────────────────────────

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

// ─── TileCard — Gradient bg, accent top border, deep shadow ──

function TileCard({
  icon,
  iconBg,
  accentColor,
  topBorderColor,
  gradient,
  value,
  label,
  detail,
  detailColor,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  accentColor: string;
  topBorderColor: string;
  gradient: [string, string];
  value: string;
  label: string;
  detail: string;
  detailColor?: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <RNPressable
      onPress={onPress}
      style={{
        width: '47%',
        flexGrow: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderTopWidth: 3,
        borderTopColor: topBorderColor,
        backgroundColor: '#FFFFFF',
        ...CARD_SHADOW,
      }}
    >
      {/* Micro-gradient background — accent-tinted */}
      <LinearGradient
        colors={[`rgba(${hexToRgb(accentColor)}, 0.05)`, '#FFFFFF']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.7 }}
        style={{ padding: 14, flex: 1 }}
      >
        <HStack className="justify-between items-center mb-3">
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: iconBg + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={19} color={iconBg} />
          </Box>
          {badge !== undefined && badge > 0 && (
            <Box
              className="min-w-[22px] h-[22px] rounded-full justify-center items-center px-1"
              style={{ backgroundColor: '#EF4444' }}
            >
              <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 10, color: '#FFFFFF' }}>
                {badge}
              </Text>
            </Box>
          )}
        </HStack>

        {/* Value — DM Sans 700, 28px */}
        <Text
          style={{
            fontFamily: FontFamily.sansBold,
            fontSize: 28,
            color: TEXT_PRIMARY,
            marginBottom: 2,
          }}
        >
          {value}
        </Text>

        {/* Label */}
        <Text
          style={{
            fontFamily: FontFamily.sansSemiBold,
            fontSize: 10,
            color: TEXT_SECONDARY,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 5,
          }}
        >
          {label}
        </Text>

        {/* Detail */}
        <Text
          style={{
            fontFamily: FontFamily.sansRegular,
            fontSize: 11,
            color: detailColor || TEXT_MUTED,
          }}
          numberOfLines={1}
        >
          {detail}
        </Text>
      </LinearGradient>
    </RNPressable>
  );
}
