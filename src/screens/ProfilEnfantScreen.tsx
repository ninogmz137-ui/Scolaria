import { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import { Colors } from '../constants/colors';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import DecorativeBlobs from '../components/DecorativeBlobs';
import SuperPowerBadge, { type ProfileTag } from '../components/profile/SuperPowerBadge';
import CompetenceRadar from '../components/profile/CompetenceRadar';
import JoyHistory from '../components/profile/JoyHistory';
import Portfolio from '../components/profile/Portfolio';
import JoyAlerts, {
  detectJoyAlert,
  detectCriticalKeywords,
} from '../components/profile/JoyAlerts';
import {
  exportProfilePDF,
  exportTransitionMemo,
  type PDFExportData,
  type TransitionMemoData,
} from '../services/pdfExport';
import { getChild, getCheckins } from '../services/database';

// ─── Per-child profile data ──────────────────────────────

interface ChildProfileData {
  name: string;
  firstName: string;
  avatar: string;
  classe: string;
  scolariaId: string;
  age: number;
  superPower: string;
  superPowerEmoji: string;
  superPowerDescription: string;
  tags: ProfileTag[];
  competences: { label: string; value: number; emoji: string }[];
  portfolio: {
    id: string;
    name: string;
    emoji: string;
    category: string;
    level: string;
    color: string;
    hoursPerWeek: number;
    progressPercent: number;
    since: string;
  }[];
  joy30Days: { day: number; score: number }[];
  lastCheckinMessage: string;
  trimesterWeeksLeft: number;
}


function getChildProfileData(childId: string): ChildProfileData {
  switch (childId) {
    // ── Léa — Maternelle ──
    case '1':
      return {
        name: 'Léa Moreau',
        firstName: 'Léa',
        avatar: '👧',
        classe: 'Grande section — Maternelle Pasteur',
        scolariaId: 'SCA-2026-FR-048720',
        age: 4,
        superPower: 'Exploratrice Créative',
        superPowerEmoji: '🌈',
        superPowerDescription:
          'Léa transforme chaque moment en aventure créative. Son imagination débordante et sa joie communicative illuminent toutes ses découvertes.',
        tags: [
          { label: 'Créative', emoji: '🎨', color: Colors.pink },
          { label: 'Sociale', emoji: '🤝', color: Colors.green },
          { label: 'Curieuse', emoji: '🔍', color: Colors.cyan },
          { label: 'Expressive', emoji: '🗣️', color: Colors.orange },
        ],
        competences: [
          { label: 'Langage', value: 7, emoji: '🗣️' },
          { label: 'Motricité', value: 8, emoji: '🤸' },
          { label: 'Créativité', value: 9, emoji: '🎨' },
          { label: 'Sociabilité', value: 8, emoji: '🤝' },
          { label: 'Autonomie', value: 6, emoji: '⭐' },
        ],
        portfolio: [
          { id: '1', name: 'Éveil musical', emoji: '🎵', category: 'Musique', level: '1ère année', color: Colors.violet, hoursPerWeek: 1, progressPercent: 60, since: '2025' },
          { id: '2', name: 'Bébé nageur', emoji: '🏊', category: 'Sport', level: 'Étoile de mer', color: '#38BDF8', hoursPerWeek: 1, progressPercent: 75, since: '2024' },
          { id: '3', name: 'Peinture', emoji: '🖌️', category: 'Art', level: 'Découverte', color: Colors.pink, hoursPerWeek: 1.5, progressPercent: 50, since: '2025' },
        ],
        joy30Days: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, score: Math.floor(Math.random() * 2 + 7) })),
        lastCheckinMessage: '',
        trimesterWeeksLeft: 6,
      };

    // ── Lucas — Primaire ──
    case '2':
      return {
        name: 'Lucas Moreau',
        firstName: 'Lucas',
        avatar: '👦',
        classe: 'CM2 — École Voltaire',
        scolariaId: 'SCA-2026-FR-048721',
        age: 10,
        superPower: 'Architecte Curieux',
        superPowerEmoji: '🔭',
        superPowerDescription:
          'Lucas construit sa compréhension du monde avec une logique remarquable. Sa curiosité insatiable le pousse à explorer chaque sujet en profondeur, reliant les idées comme un véritable bâtisseur de savoirs.',
        tags: [
          { label: 'Analytique', emoji: '📐', color: Colors.cyan },
          { label: 'Curieux', emoji: '🔍', color: Colors.green },
          { label: 'Logique', emoji: '🧠', color: Colors.violet },
          { label: 'Méthodique', emoji: '📋', color: '#38BDF8' },
          { label: 'Persévérant', emoji: '💪', color: Colors.orange },
        ],
        competences: [
          { label: 'Connaissances', value: 8, emoji: '📚' },
          { label: 'Créativité', value: 7, emoji: '🎨' },
          { label: 'Confiance', value: 6, emoji: '💪' },
          { label: 'Logique', value: 8, emoji: '🧠' },
          { label: 'Curiosité', value: 7, emoji: '🔍' },
        ],
        portfolio: [
          { id: '1', name: 'Judo', emoji: '🥋', category: 'Sport', level: 'Ceinture verte', color: Colors.green, hoursPerWeek: 3, progressPercent: 65, since: '2023' },
          { id: '2', name: 'Piano', emoji: '🎹', category: 'Musique', level: '3ème année', color: Colors.violet, hoursPerWeek: 2, progressPercent: 45, since: '2024' },
          { id: '3', name: 'Anglais', emoji: '🇬🇧', category: 'Langue', level: 'A2', color: Colors.cyan, hoursPerWeek: 1, progressPercent: 55, since: '2022' },
          { id: '4', name: 'Natation', emoji: '🏊', category: 'Sport', level: 'Dauphin', color: '#38BDF8', hoursPerWeek: 1.5, progressPercent: 80, since: '2024' },
          { id: '5', name: 'Théâtre', emoji: '🎭', category: 'Activité', level: '2ème année', color: Colors.pink, hoursPerWeek: 2, progressPercent: 40, since: '2025' },
        ],
        joy30Days: Array.from({ length: 30 }, (_, i) => ({
          day: i + 1,
          score: i < 20 ? Math.floor(Math.random() * 3 + 6) : i < 25 ? Math.floor(Math.random() * 3 + 4) : Math.floor(Math.random() * 3 + 3),
        })),
        lastCheckinMessage: '',
        trimesterWeeksLeft: 6,
      };

    // ── Emma — Collège ──
    case '3':
    default:
      return {
        name: 'Emma Moreau',
        firstName: 'Emma',
        avatar: '👩',
        classe: '3ème — Collège Hugo',
        scolariaId: 'SCA-2026-FR-048722',
        age: 13,
        superPower: 'Exploratrice Visuelle',
        superPowerEmoji: '🎨',
        superPowerDescription:
          'Emma perçoit le monde à travers un prisme artistique unique. Sa créativité et sa sensibilité nourrissent une expression remarquable dans toutes les disciplines, des lettres aux sciences.',
        tags: [
          { label: 'Créative', emoji: '🎨', color: Colors.pink },
          { label: 'Visuelle', emoji: '👁️', color: Colors.violet },
          { label: 'Sensible', emoji: '💜', color: '#A78BFA' },
          { label: 'Autonome', emoji: '🚀', color: Colors.cyan },
          { label: 'Littéraire', emoji: '📖', color: Colors.green },
        ],
        competences: [
          { label: 'Expression', value: 9, emoji: '✍️' },
          { label: 'Créativité', value: 9, emoji: '🎨' },
          { label: 'Analyse', value: 7, emoji: '🔬' },
          { label: 'Organisation', value: 7, emoji: '📋' },
          { label: 'Autonomie', value: 8, emoji: '🚀' },
        ],
        portfolio: [
          { id: '1', name: 'Dessin', emoji: '✏️', category: 'Art', level: 'Avancé', color: Colors.pink, hoursPerWeek: 3, progressPercent: 85, since: '2021' },
          { id: '2', name: 'Danse', emoji: '💃', category: 'Sport', level: '4ème année', color: Colors.violet, hoursPerWeek: 3, progressPercent: 70, since: '2023' },
          { id: '3', name: 'Écriture créative', emoji: '📝', category: 'Littérature', level: 'Club ado', color: Colors.cyan, hoursPerWeek: 1, progressPercent: 60, since: '2025' },
          { id: '4', name: 'Photographie', emoji: '📷', category: 'Art', level: 'Débutant', color: Colors.orange, hoursPerWeek: 1, progressPercent: 30, since: '2026' },
        ],
        joy30Days: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, score: Math.floor(Math.random() * 3 + 6) })),
        lastCheckinMessage: '',
        trimesterWeeksLeft: 6,
      };
  }
}

// ─── Helpers ──────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
});

// ─── Component ────────────────────────────────────────────

export default function ProfilEnfantScreen() {
  const { theme } = useChildTheme();
  const { selectedChild } = useActiveChild();
  const navigation = useNavigation<any>();
  const childId = selectedChild?.id ?? '2';

  const [data, setData] = useState<ChildProfileData>(() => getChildProfileData(childId));

  const loadProfile = useCallback(async () => {
    const mock = getChildProfileData(childId);

    const [childResult, checkinsResult] = await Promise.all([
      getChild(childId),
      getCheckins(childId, { days: 30 }),
    ]);

    const child = childResult?.data;
    const checkins = checkinsResult?.data ?? [];

    if (!child) {
      setData(mock);
      return;
    }

    // Compute age from birth_date if available, else fall back to stored age
    let age = child.age ?? mock.age;
    if (child.birth_date) {
      const born = new Date(child.birth_date);
      const today = new Date();
      age = today.getFullYear() - born.getFullYear();
      const hasBirthdayPassed =
        today.getMonth() > born.getMonth() ||
        (today.getMonth() === born.getMonth() && today.getDate() >= born.getDate());
      if (!hasBirthdayPassed) age -= 1;
    }

    // Build joy30Days from real checkins
    let joy30Days = mock.joy30Days;
    let lastCheckinMessage = mock.lastCheckinMessage;

    if (checkins.length > 0) {
      // Sort ascending by date so the most recent ends up last
      const sorted = [...checkins].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      // Group joy_score by day-of-month and average
      const byDay: Record<number, number[]> = {};
      for (const c of sorted) {
        const day = new Date(c.date).getDate();
        if (!byDay[day]) byDay[day] = [];
        if (c.joy_score != null) byDay[day].push(c.joy_score);
      }

      joy30Days = Array.from({ length: 30 }, (_, i) => {
        const day = i + 1;
        const scores = byDay[day];
        if (!scores || scores.length === 0) return { day, score: 0 };
        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        return { day, score: Math.round(avg) };
      });

      // Most recent checkin message
      const latest = sorted[sorted.length - 1];
      lastCheckinMessage = latest?.message ?? '';
    }

    setData({
      ...mock,
      name: `${child.first_name} ${child.last_name ?? ''}`.trim(),
      firstName: child.first_name,
      avatar: child.avatar_emoji || '👦',
      classe: child.classe && child.school
        ? `${child.classe} — ${child.school}`
        : mock.classe,
      scolariaId: child.scolaria_id || mock.scolariaId,
      age,
      superPower: child.super_power || mock.superPower,
      superPowerEmoji: child.super_power_emoji || mock.superPowerEmoji,
      joy30Days,
      lastCheckinMessage,
    });
  }, [childId]);

  useEffect(() => {
    // Immediately show mock while real data loads
    setData(getChildProfileData(childId));
    loadProfile();
  }, [childId, loadProfile]);

  const [exporting, setExporting] = useState(false);
  const [exportingMemo, setExportingMemo] = useState(false);

  // Detect alert level
  const joyAlert = detectJoyAlert(data.joy30Days);
  const hasCriticalMessage = detectCriticalKeywords(data.lastCheckinMessage);

  const handleExportPDF = async () => {
    setExporting(true);
    const pdfData: PDFExportData = {
      child: data,
      competences: data.competences,
      activities: data.portfolio,
      joyHistory: data.joy30Days,
      generatedDate: new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };
    const result = await exportProfilePDF(pdfData);
    setExporting(false);
    if (!result.success) {
      Alert.alert('Erreur', result.error || 'Impossible de générer le PDF');
    }
  };

  const handleExportMemo = async () => {
    setExportingMemo(true);
    const joyAvg =
      data.joy30Days.reduce((s, d) => s + d.score, 0) / data.joy30Days.length;
    const memoData: TransitionMemoData = {
      child: data,
      competences: data.competences,
      activities: data.portfolio,
      joyAverage: joyAvg,
      fromSchool: data.classe.split('—')[1]?.trim() ?? 'École',
      toSchool: 'Nouvel établissement',
      teacherName: 'Enseignant(e)',
      personalNote: `${data.firstName} est un(e) élève ${data.tags.map((t) => t.label.toLowerCase()).slice(0, 3).join(', ')}. Son super-pouvoir « ${data.superPower} » reflète ses forces observées ce trimestre.`,
    };
    const result = await exportTransitionMemo(memoData);
    setExportingMemo(false);
    if (!result.success) {
      Alert.alert('Erreur', result.error || 'Impossible de générer le mémo');
    }
  };

  // Theme-aware accent colors
  const accent = theme.accent;
  const accentLight = theme.accentLight ?? theme.accent;

  const accentRgb = hexToRgb(accent);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#E8EDF5' }}
      showsVerticalScrollIndicator={false}
    >
      {/* Dark gradient header */}
      <LinearGradient
        colors={['#0B1628', accent + 'DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 32,
          paddingBottom: 28,
          alignItems: 'center',
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        {/* Avatar */}
        <Box
          className="w-20 h-20 rounded-full justify-center items-center mb-3"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 3, borderColor: '#FFFFFF' }}
        >
          <Text className="text-[40px]">{data.avatar}</Text>
        </Box>

        <Text className="text-2xl font-black mb-1" style={{ color: '#FFFFFF' }}>{data.name}</Text>
        <Text className="text-sm mb-3.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{data.classe}</Text>

        {/* Scolaria ID — glass pill */}
        <HStack
          className="items-center rounded-[20px] px-3.5 py-2"
          style={{ gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
        >
          <Ionicons name="finger-print" size={14} color="#FFFFFF" />
          <Text
            className="text-[13px] font-bold tracking-wide"
            style={{ color: '#FFFFFF', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
          >
            {data.scolariaId}
          </Text>
          <Pressable>
            <Ionicons name="copy-outline" size={14} color="rgba(255,255,255,0.5)" />
          </Pressable>
        </HStack>
      </LinearGradient>

      <View style={{ position: 'relative' }}>
        {/* Decorative blobs */}
        <DecorativeBlobs accent={accent} size={110} opacity={0.12} />

        <Box className="px-5 pt-2">
        {/* Joy Alerts */}
        {(joyAlert.level || hasCriticalMessage) && (
          <Box className="mb-6">
            <JoyAlerts
              level={joyAlert.level}
              dropPercent={joyAlert.dropPercent}
              recentAvg={joyAlert.recentAvg}
              childName={data.firstName}
              showUrgencyProtocol={hasCriticalMessage}
            />
          </Box>
        )}

        {/* Super Power Badge — enhanced with tags, description, share */}
        <Box className="mb-6">
          <SuperPowerBadge
            power={data.superPower}
            emoji={data.superPowerEmoji}
            description={data.superPowerDescription}
            childName={data.firstName}
            tags={data.tags}
            trimesterWeeksLeft={data.trimesterWeeksLeft}
            accentColor={accent}
            accentLight={accentLight}
          />
        </Box>

        {/* Competence Radar */}
        <Box className="mb-6">
          <HStack className="items-center mb-3" style={{ gap: 8 }}>
            <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: accent }} />
            <Text className="text-lg font-bold" style={{ color: theme.textPrimary }}>
              Compétences
            </Text>
          </HStack>
          <Box
            className="rounded-[20px] p-4 items-center"
            style={{
              backgroundColor: theme.card,
              borderWidth: 1.5,
              borderColor: `rgba(${accentRgb}, 0.15)`,
              ...CARD_SHADOW,
            }}
          >
            <CompetenceRadar data={data.competences} />
          </Box>
        </Box>

        {/* Portfolio */}
        <Box className="mb-6">
          <Portfolio activities={data.portfolio} />
        </Box>

        {/* Joy History 30 days */}
        <Box className="mb-6">
          <JoyHistory data={data.joy30Days} month="Mars 2026" />
        </Box>

        {/* Export PDF button */}
        <Pressable
          className="rounded-[30px] overflow-hidden mt-2"
          onPress={handleExportPDF}
          disabled={exporting}
        >
          <LinearGradient
            colors={[Colors.violet, Colors.violetDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 }}
          >
            {exporting ? (
              <>
                <ActivityIndicator color={Colors.white} size="small" />
                <Text className="text-lg font-extrabold" style={{ color: Colors.white }}>Génération...</Text>
              </>
            ) : (
              <>
                <Ionicons name="document-text" size={22} color={Colors.white} />
                <Text className="text-lg font-extrabold" style={{ color: Colors.white }}>Exporter en PDF</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Text className="text-center text-xs mt-2.5" style={{ color: Colors.gray }}>
          Génère un passeport scolaire complet au format PDF
        </Text>

        {/* Transition Memo button */}
        <Pressable
          className="rounded-[30px] overflow-hidden mt-4"
          onPress={handleExportMemo}
          disabled={exportingMemo}
        >
          <LinearGradient
            colors={[Colors.cyan, Colors.cyanDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 }}
          >
            {exportingMemo ? (
              <>
                <ActivityIndicator color={Colors.white} size="small" />
                <Text className="text-lg font-extrabold" style={{ color: Colors.white }}>Génération...</Text>
              </>
            ) : (
              <>
                <Ionicons name="school" size={22} color={Colors.white} />
                <Text className="text-lg font-extrabold" style={{ color: Colors.white }}>Mémo de bienvenue</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Text className="text-center text-xs mt-2.5" style={{ color: Colors.gray }}>
          Document de transition partageable avec le nouvel établissement
        </Text>

        <Box className="h-10" />
      </Box>
      </View>
    </ScrollView>
  );
}
