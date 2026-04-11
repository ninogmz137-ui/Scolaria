/**
 * ProfilEnfantScreen — Clean white/black design.
 * No WallpaperBackground, no GlassCard, no Papicons.
 * Matches SettingsScreen / NotesScreen visual language.
 */

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
import {
  FileText,
  GraduationCap,
  Pencil,
  Fingerprint,
  MessageCircle,
  Activity,
  Palette,
  Users,
  Star,
  BookOpen,
  Shield,
  Cpu,
  Mic,
  BarChart2,
  ClipboardList,
  Search,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveChild } from '../contexts/ActiveChildContext';
import ChildAvatar from '../components/ChildAvatar';
import AvatarPicker, { type AvatarSelection } from '../components/AvatarPicker';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';
import SuperPowerBadge, { type ProfileTag } from '../components/profile/SuperPowerBadge';
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
import { Colors } from '../constants/colors';

const PAGE_BG = 'rgba(248, 249, 252, 1)';
const COMPETENCE_ICON_COLOR = '#6B7280';

const COMPETENCE_ICONS: Record<string, typeof MessageCircle> = {
  Langage: MessageCircle,
  Motricité: Activity,
  Créativité: Palette,
  Sociabilité: Users,
  Autonomie: Star,
  Connaissances: BookOpen,
  Confiance: Shield,
  Logique: Cpu,
  Expression: Mic,
  Analyse: BarChart2,
  Organisation: ClipboardList,
  Curiosité: Search,
};

// ─── Types ────────────────────────────────────────────────

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
  competences: { label: string; value: number }[];
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

// ─── Mock data ────────────────────────────────────────────

function getChildProfileData(childId: string): ChildProfileData {
  switch (childId) {
    case '1':
    case 'demo-lea':
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
          { label: 'Langage', value: 7 },
          { label: 'Motricité', value: 8 },
          { label: 'Créativité', value: 9 },
          { label: 'Sociabilité', value: 8 },
          { label: 'Autonomie', value: 6 },
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

    case '2':
    case 'demo-lucas':
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
          { label: 'Connaissances', value: 8 },
          { label: 'Créativité', value: 7 },
          { label: 'Confiance', value: 6 },
          { label: 'Logique', value: 8 },
          { label: 'Curiosité', value: 7 },
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

    case '3':
    case 'demo-emma':
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
          { label: 'Expression', value: 9 },
          { label: 'Créativité', value: 9 },
          { label: 'Analyse', value: 7 },
          { label: 'Organisation', value: 7 },
          { label: 'Autonomie', value: 8 },
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

// ─── Inline sub-components ────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface CompetenceRowProps {
  label: string;
  value: number; // 0–10
  accentColor: string;
}

function CompetenceRow({ label, value, accentColor }: CompetenceRowProps) {
  const pct = Math.min(100, Math.max(0, value * 10));
  const Icon = COMPETENCE_ICONS[label] ?? Star;
  return (
    <View style={styles.competenceRow}>
      <View style={styles.competenceIconWrap}>
        <Icon size={18} color={COMPETENCE_ICON_COLOR} strokeWidth={1.5} />
      </View>
      <Text style={styles.competenceLabel}>{label}</Text>
      <View style={styles.competenceBarTrack}>
        <View style={[styles.competenceBarFill, { width: `${pct}%` as any, backgroundColor: accentColor }]} />
      </View>
      <Text style={[styles.competenceValue, { color: accentColor }]}>{value}</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────

export default function ProfilEnfantScreen() {
  useChildTheme();
  const { selectedChild, updateChildAvatar } = useActiveChild();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;
  const childId = selectedChild?.id ?? '2';

  const [data, setData] = useState<ChildProfileData>(() => getChildProfileData(childId));
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingMemo, setExportingMemo] = useState(false);

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

    let joy30Days = mock.joy30Days;
    let lastCheckinMessage = mock.lastCheckinMessage;

    if (checkins.length > 0) {
      const sorted = [...checkins].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
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
    setData(getChildProfileData(childId));
    loadProfile();
  }, [childId, loadProfile]);

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
    const joyAvg = data.joy30Days.reduce((s, d) => s + d.score, 0) / data.joy30Days.length;
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

  const accent = '#7C3AED';

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: TOPBAR_H + 16, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 24 },
        ]}
      >
        {/* ── Header ── */}
        <Card style={styles.headerCard}>
          <Pressable onPress={() => setAvatarPickerVisible(true)} style={styles.avatarWrap}>
            <ChildAvatar
              name={data.name}
              emoji={selectedChild.avatarType === 'photo' ? undefined : (selectedChild.avatarEmoji || data.avatar)}
              photoUri={selectedChild.avatarPhotoUri}
              accentColor={accent}
              size={64}
            />
            <View style={styles.avatarEditBadge}>
              <Pencil size={10} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </Pressable>

          <Text style={styles.nameText}>{data.name}</Text>
          <Text style={styles.classeText}>{data.classe}</Text>

          <View style={styles.idPill}>
            <Fingerprint size={13} color="#94A3B8" strokeWidth={2} />
            <Text style={styles.idText}>{data.scolariaId}</Text>
          </View>
        </Card>

        {/* ── Joy alerts ── */}
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

        {/* ── Super-Pouvoir ── */}
        <SectionTitle label="SUPER-POUVOIR" />
        <Card style={styles.section}>
          <SuperPowerBadge
            power={data.superPower}
            emoji={data.superPowerEmoji}
            description={data.superPowerDescription}
            childName={data.firstName}
            tags={data.tags}
            trimesterWeeksLeft={data.trimesterWeeksLeft}
            accentColor={accent}
            accentLight={accent}
          />
        </Card>

        {/* ── Compétences clés ── */}
        <SectionTitle label="COMPÉTENCES CLÉS" />
        <Card style={styles.section}>
          {data.competences.map((c) => (
            <CompetenceRow
              key={c.label}
              label={c.label}
              value={c.value}
              accentColor={accent}
            />
          ))}
        </Card>

        {/* ── Score de joie ── */}
        <SectionTitle label="SCORE DE JOIE" />
        <View style={styles.section}>
          <JoyHistory data={data.joy30Days} month="Mars 2026" />
        </View>

        {/* ── Portfolio ── */}
        <SectionTitle label="PORTFOLIO EXTRA-SCOLAIRE" />
        <View style={styles.section}>
          <Portfolio activities={data.portfolio} />
        </View>

        {/* ── Actions ── */}
        <SectionTitle label="ACTIONS" />
        <View style={styles.actionsContainer}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
            onPress={handleExportPDF}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color="#7C3AED" size="small" />
            ) : (
              <FileText size={20} color="#7C3AED" strokeWidth={1.5} />
            )}
            <Text style={styles.actionBtnText}>
              {exporting ? 'Génération…' : 'Exporter en PDF'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
            onPress={handleExportMemo}
            disabled={exportingMemo}
          >
            {exportingMemo ? (
              <ActivityIndicator color="#7C3AED" size="small" />
            ) : (
              <GraduationCap size={20} color="#7C3AED" strokeWidth={1.5} />
            )}
            <Text style={styles.actionBtnText}>
              {exportingMemo ? 'Génération…' : 'Mémo de bienvenue'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <AvatarPicker
        visible={avatarPickerVisible}
        onClose={() => setAvatarPickerVisible(false)}
        onSelect={handleAvatarSelect}
        childName={data.name}
        accentColor={accent}
        currentEmoji={selectedChild.avatarEmoji || data.avatar}
        currentPhotoUri={selectedChild.avatarPhotoUri}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Section title
  sectionTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: '#94A3B8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    elevation: 0,
  },

  section: {
    marginBottom: 20,
  },

  // Header card
  headerCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },

  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  nameText: {
    fontFamily: FontFamily.displayBold,
    fontSize: 24,
    color: '#1A2340',
    marginBottom: 4,
    textAlign: 'center',
  },
  classeText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 14,
    textAlign: 'center',
  },
  idPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  idText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#64748B',
    letterSpacing: 0.5,
  },

  // Competence rows
  competenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  competenceIconWrap: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  competenceLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: '#1A2340',
    width: 100,
  },
  competenceBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  competenceBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  competenceValue: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    width: 20,
    textAlign: 'right',
  },

  // Actions
  actionsContainer: {
    marginBottom: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  actionBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#7C3AED',
  },
});
