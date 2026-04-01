import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Papicons } from '@getpapillon/papicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild, type AvatarType } from '../contexts/ActiveChildContext';
import ChildAvatar from '../components/ChildAvatar';
import AvatarPicker, { type AvatarSelection } from '../components/AvatarPicker';
import { useChildTheme } from '../contexts/ChildThemeContext';
import WallpaperBackground from '../components/WallpaperBackground';
import GlassCard from '../components/GlassCard';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';
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

// ─── Component ────────────────────────────────────────────

export default function ProfilEnfantScreen() {
  const { theme } = useChildTheme();
  const { selectedChild, updateChildAvatar } = useActiveChild();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;
  const childId = selectedChild?.id ?? '2';

  const [data, setData] = useState<ChildProfileData>(() => getChildProfileData(childId));
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);

  const handleAvatarSelect = useCallback((selection: AvatarSelection) => {
    updateChildAvatar(childId, selection.type, selection.emoji, selection.photoUri);
  }, [childId, updateChildAvatar]);

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

  const accent = theme.accent;

  return (
    <View style={styles.root}>
      <WallpaperBackground />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: TOPBAR_H + 12, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10 },
        ]}
      >
        {/* Profile header card */}
        <GlassCard style={styles.headerCard} borderRadius={20}>
          {/* Avatar — tap to customize */}
          <Pressable onPress={() => setAvatarPickerVisible(true)} style={styles.avatarRing}>
            <ChildAvatar
              name={data.name}
              emoji={selectedChild.avatarType === 'photo' ? undefined : (selectedChild.avatarEmoji || data.avatar)}
              photoUri={selectedChild.avatarPhotoUri}
              accentColor={theme.accent}
              size={72}
            />
            <View style={styles.avatarEditBadge}>
              <Papicons name="Pen" size={12} color="#FFFFFF" />
            </View>
          </Pressable>

          <Text style={styles.nameText}>{data.name}</Text>
          <Text style={styles.classeText}>{data.classe}</Text>

          {/* Scolaria ID — pill */}
          <View style={styles.idPill}>
            <Papicons name="Fingerprint" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.idText}>{data.scolariaId}</Text>
          </View>
        </GlassCard>

        {/* Joy Alerts */}
        {(joyAlert.level || hasCriticalMessage) && (
          <View style={styles.section}>
            <JoyAlerts
              level={joyAlert.level}
              dropPercent={joyAlert.dropPercent}
              recentAvg={joyAlert.recentAvg}
              childName={data.firstName}
              showUrgencyProtocol={hasCriticalMessage}
            />
          </View>
        )}

        {/* Super Power Badge */}
        <View style={styles.section}>
          <SuperPowerBadge
            power={data.superPower}
            emoji={data.superPowerEmoji}
            description={data.superPowerDescription}
            childName={data.firstName}
            tags={data.tags}
            trimesterWeeksLeft={data.trimesterWeeksLeft}
            accentColor={accent}
            accentLight={theme.accentLight ?? theme.accent}
          />
        </View>

        {/* Competences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionBar, { backgroundColor: accent }]} />
            <Text style={styles.sectionTitle}>Compétences</Text>
          </View>
          <GlassCard borderRadius={20} noPadding>
            <View style={styles.radarPadding}>
              <CompetenceRadar data={data.competences} />
            </View>
          </GlassCard>
        </View>

        {/* Portfolio */}
        <View style={styles.section}>
          <Portfolio activities={data.portfolio} />
        </View>

        {/* Joy History 30 days */}
        <View style={styles.section}>
          <JoyHistory data={data.joy30Days} month="Mars 2026" />
        </View>

        {/* Export PDF button */}
        <Pressable
          style={[styles.exportBtn, { backgroundColor: Colors.violet }]}
          onPress={handleExportPDF}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.exportBtnText}>Génération...</Text>
            </>
          ) : (
            <>
              <Papicons name="Document" size={22} color="#FFFFFF" />
              <Text style={styles.exportBtnText}>Exporter en PDF</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.exportHint}>
          Génère un passeport scolaire complet au format PDF
        </Text>

        {/* Transition Memo button */}
        <Pressable
          style={[styles.exportBtn, styles.exportBtnMemo]}
          onPress={handleExportMemo}
          disabled={exportingMemo}
        >
          {exportingMemo ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.exportBtnText}>Génération...</Text>
            </>
          ) : (
            <>
              <Papicons name="GraduationCap" size={22} color="#FFFFFF" />
              <Text style={styles.exportBtnText}>Mémo de bienvenue</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.exportHint}>
          Document de transition partageable avec le nouvel établissement
        </Text>
      </ScrollView>

      {/* Avatar Picker Modal */}
      <AvatarPicker
        visible={avatarPickerVisible}
        onClose={() => setAvatarPickerVisible(false)}
        onSelect={handleAvatarSelect}
        childName={data.name}
        accentColor={theme.accent}
        currentEmoji={selectedChild.avatarEmoji || data.avatar}
        currentPhotoUri={selectedChild.avatarPhotoUri}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
  },
  headerCard: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 10,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nameText: {
    fontFamily: FontFamily.loraBold,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  classeText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 14,
  },
  idPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  idText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 17,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  radarPadding: {
    padding: 16,
    alignItems: 'center',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 30,
    marginTop: 8,
  },
  exportBtnMemo: {
    backgroundColor: Colors.cyan ?? '#22D3EE',
    marginTop: 16,
  },
  exportBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  exportHint: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
