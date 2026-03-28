/**
 * AccueilScreen — Warm-structured dashboard with Lora typography,
 * fused child header, border-left cards, and staggered reveal animations.
 */

import { useRef, useEffect } from 'react';
import { ScrollView, Animated, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Box, Text, HStack } from '../components/ui';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { getTodayAbsence, MOTIF_LABELS } from '../services/absenceService';
import FusedChildHeader from '../components/FusedChildHeader';
import AriaCard from '../components/dashboard/AriaCard';
import DashboardTile from '../components/dashboard/DashboardTile';
import JoyScoreBanner from '../components/dashboard/JoyScoreBanner';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Pressable as RNPressable } from 'react-native';

// ─── Mock data per child ─────────────────────────────────

interface DashboardData {
  ariaSummary: string;
  liaison: { total: number; unsigned: number };
  devoirs: { count: number; nextDate: string };
  notes: { average: number; trend: number };
  agenda: { weekEvents: number; nextEvent: string };
  joyScore: { value: number; trend: 'stable' | 'up' | 'down' };
}

function getMockDashboard(childId: string): DashboardData {
  switch (childId) {
    case '1':
      return {
        ariaSummary: 'Léa a une journée tranquille. Atelier peinture prévu ce matin. Aucun mot en attente dans le cahier de liaison. 🎨',
        liaison: { total: 3, unsigned: 0 },
        devoirs: { count: 0, nextDate: '—' },
        notes: { average: 0, trend: 0 },
        agenda: { weekEvents: 4, nextEvent: 'Atelier peinture · 10h' },
        joyScore: { value: 4.2, trend: 'up' },
      };
    case '2':
      return {
        ariaSummary: 'Lucas a un contrôle de Maths vendredi. 2 devoirs à rendre cette semaine. 1 mot non signé dans le cahier de liaison. 📐',
        liaison: { total: 4, unsigned: 1 },
        devoirs: { count: 2, nextDate: 'Jeudi' },
        notes: { average: 14.2, trend: 0.8 },
        agenda: { weekEvents: 6, nextEvent: 'Contrôle Maths · Vendredi' },
        joyScore: { value: 3.8, trend: 'stable' },
      };
    case '3':
    default:
      return {
        ariaSummary: 'Bonne journée pour Emma. Aucun devoir urgent. 1 autorisation à signer pour la sortie du 15 avril. 📝',
        liaison: { total: 4, unsigned: 1 },
        devoirs: { count: 1, nextDate: 'Lundi' },
        notes: { average: 15.6, trend: -0.3 },
        agenda: { weekEvents: 8, nextEvent: 'SVT · Demain 10h' },
        joyScore: { value: 4.0, trend: 'up' },
      };
  }
}

// ─── Component ───────────────────────────────────────────

export default function AccueilScreen() {
  const { theme } = useChildTheme();
  const { selectedChild, selectedChildId, fadeAnim } = useActiveChild();
  const navigation = useNavigation<any>();

  const data = getMockDashboard(selectedChildId);
  const todayAbsence = getTodayAbsence(selectedChildId);
  const accent = theme.accent;

  // Absence button entrance animation
  const absenceEnter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    absenceEnter.setValue(0);
    Animated.timing(absenceEnter, {
      toValue: 1,
      duration: 300,
      delay: 600,
      useNativeDriver: true,
    }).start();
  }, [selectedChildId]);

  return (
    <LinearGradient
      colors={['#FFFBF5', '#F7F8FC']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* ── Fused child header ─────── */}
      <FusedChildHeader
        onAddChild={() => navigation.navigate('AjouterEnfant')}
      />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 14 }}
        >
          {/* ── Aria synthesis card ─────── */}
          <AriaCard
            summary={data.ariaSummary}
            accent={accent}
            delay={200}
          />

          {/* ── 4 Dashboard tiles (2x2 grid) ─────── */}
          <Box className="flex-row flex-wrap" style={{ gap: 12 }}>
            <DashboardTile
              icon="book"
              iconColor="#FF8C42"
              borderColor="#FF8C42"
              value={String(data.liaison.total)}
              label="Mots reçus"
              badge={data.liaison.unsigned > 0 ? data.liaison.unsigned : undefined}
              detail={data.liaison.unsigned > 0 ? `${data.liaison.unsigned} à signer` : 'Tout signé'}
              detailColor={data.liaison.unsigned > 0 ? '#EF4444' : undefined}
              delay={300}
              onPress={() => navigation.navigate('CahierLiaisonScreen')}
            />
            <DashboardTile
              icon="create"
              iconColor="#38BDF8"
              borderColor="#38BDF8"
              value={String(data.devoirs.count)}
              label="Devoirs"
              detail={data.devoirs.count > 0 ? `Prochain : ${data.devoirs.nextDate}` : 'Aucun devoir'}
              delay={370}
              onPress={() => navigation.navigate('Agenda')}
            />
            <DashboardTile
              icon="school"
              iconColor="#A78BFA"
              borderColor="#A78BFA"
              value={data.notes.average > 0 ? data.notes.average.toFixed(1) : '—'}
              label="Moyenne"
              detail={
                data.notes.trend !== 0
                  ? `${data.notes.trend > 0 ? '+' : ''}${data.notes.trend.toFixed(1)} vs mois dernier`
                  : '—'
              }
              detailColor={data.notes.trend > 0 ? '#10B981' : data.notes.trend < 0 ? '#EF4444' : undefined}
              delay={440}
              onPress={() => navigation.getParent()?.navigate('Notes')}
            />
            <DashboardTile
              icon="calendar"
              iconColor="#10B981"
              borderColor="#10B981"
              value={String(data.agenda.weekEvents)}
              label="Cette semaine"
              detail={data.agenda.nextEvent}
              delay={510}
              onPress={() => navigation.getParent()?.navigate('Agenda')}
            />
          </Box>

          {/* ── Absence banner (if child absent today) ── */}
          {todayAbsence && (
            <HStack
              className="items-center gap-2.5 p-3 rounded-xl"
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: accent + '30',
                borderLeftWidth: 3,
                borderLeftColor: accent,
              }}
            >
              <Ionicons name="medical" size={18} color={accent} />
              <Text
                style={{
                  fontFamily: FontFamily.sansSemiBold,
                  fontSize: 13,
                  color: '#64748B',
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {selectedChild.name} absent(e) aujourd'hui · {MOTIF_LABELS[todayAbsence.motif]}{' '}
                {todayAbsence.statut === 'prise_en_compte' ? '✓' : '⏳'}
              </Text>
            </HStack>
          )}

          {/* ── Button: Signal absence ── */}
          <Animated.View style={{ opacity: absenceEnter }}>
            <RNPressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 14,
                borderRadius: 14,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#EEF0F5',
                borderStyle: 'dashed',
              }}
              onPress={() => navigation.navigate('SignalerAbsenceScreen')}
            >
              <Ionicons name="add-circle-outline" size={20} color={accent} />
              <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 14, color: accent }}>
                Prévenir d'une absence
              </Text>
            </RNPressable>
          </Animated.View>

          {/* ── Joy Score banner ─────── */}
          <JoyScoreBanner
            value={data.joyScore.value}
            trend={data.joyScore.trend}
            delay={650}
            onPress={() => navigation.navigate('BienEtreScreen')}
          />
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
}
