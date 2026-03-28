import { useState, useMemo } from 'react';
import {
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import { Colors } from '../constants/colors';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import SuperPowerBadge, { type ProfileTag } from '../components/profile/SuperPowerBadge';
import CompetenceRadar from '../components/profile/CompetenceRadar';
import JoyHistory from '../components/profile/JoyHistory';
import Portfolio from '../components/profile/Portfolio';
import JoyAlerts, {
  detectJoyAlert,
  detectCriticalKeywords,
} from '../components/profile/JoyAlerts';
import YearSelector, { type YearPill } from '../components/profile/YearSelector';
import ArchiveBanner from '../components/profile/ArchiveBanner';
import CahierLiaisonParent from '../components/profile/CahierLiaisonParent';
import ThemeSelector from '../components/profile/ThemeSelector';
import {
  exportProfilePDF,
  exportTransitionMemo,
  type PDFExportData,
  type TransitionMemoData,
} from '../services/pdfExport';
import type { AcademicYearStatut } from '../services/database';

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

// ─── Mock academic years per child ───────────────────────

function getMockAcademicYears(childId: string): YearPill[] {
  switch (childId) {
    case '1': // Léa — maternelle
      return [
        { id: 'y1-1', annee_scolaire: '2025-2026', niveau: 'GS', statut: 'active' },
        { id: 'y1-2', annee_scolaire: '2024-2025', niveau: 'MS', statut: 'archivée' },
      ];
    case '2': // Lucas — primaire
      return [
        { id: 'y2-1', annee_scolaire: '2025-2026', niveau: 'CM2', statut: 'active' },
        { id: 'y2-2', annee_scolaire: '2024-2025', niveau: 'CM1', statut: 'archivée' },
        { id: 'y2-3', annee_scolaire: '2023-2024', niveau: 'CE2', statut: 'archivée' },
        { id: 'y2-4', annee_scolaire: '2022-2023', niveau: 'CE1', statut: 'importée' },
      ];
    case '3': // Emma — collège
    default:
      return [
        { id: 'y3-1', annee_scolaire: '2025-2026', niveau: '3ème', statut: 'active' },
        { id: 'y3-2', annee_scolaire: '2024-2025', niveau: '4ème', statut: 'archivée' },
        { id: 'y3-3', annee_scolaire: '2023-2024', niveau: '5ème', statut: 'archivée' },
        { id: 'y3-4', annee_scolaire: '2022-2023', niveau: '6ème', statut: 'archivée' },
        { id: 'y3-5', annee_scolaire: '2021-2022', niveau: 'CM2', statut: 'importée' },
      ];
  }
}

// ─── Mock archived data (simplified) ─────────────────────

function getArchivedProfileOverrides(yearId: string): Partial<ChildProfileData> | null {
  // Return overrides for archived years
  const archives: Record<string, Partial<ChildProfileData>> = {
    // Lucas CM1
    'y2-2': {
      classe: 'CM1 — École Voltaire',
      superPower: 'Explorateur Logique',
      superPowerEmoji: '🧩',
      superPowerDescription: 'En CM1, Lucas montrait déjà une aptitude remarquable pour la résolution de problèmes et la pensée séquentielle.',
      tags: [
        { label: 'Logique', emoji: '🧠', color: Colors.violet },
        { label: 'Curieux', emoji: '🔍', color: Colors.green },
        { label: 'Méthodique', emoji: '📋', color: '#38BDF8' },
      ],
      competences: [
        { label: 'Connaissances', value: 7, emoji: '📚' },
        { label: 'Créativité', value: 6, emoji: '🎨' },
        { label: 'Confiance', value: 5, emoji: '💪' },
        { label: 'Logique', value: 7, emoji: '🧠' },
        { label: 'Curiosité', value: 8, emoji: '🔍' },
      ],
    },
    // Lucas CE2
    'y2-3': {
      classe: 'CE2 — École Voltaire',
      superPower: 'Petit Scientifique',
      superPowerEmoji: '🔬',
      superPowerDescription: 'Lucas adorait les expériences et posait toujours des questions sur le pourquoi des choses.',
      tags: [
        { label: 'Curieux', emoji: '🔍', color: Colors.green },
        { label: 'Scientifique', emoji: '🔬', color: Colors.cyan },
      ],
      competences: [
        { label: 'Connaissances', value: 6, emoji: '📚' },
        { label: 'Créativité', value: 6, emoji: '🎨' },
        { label: 'Confiance', value: 5, emoji: '💪' },
        { label: 'Logique', value: 6, emoji: '🧠' },
        { label: 'Curiosité', value: 7, emoji: '🔍' },
      ],
    },
    // Emma 4ème
    'y3-2': {
      classe: '4ème — Collège Hugo',
      superPower: 'Plume Sensible',
      superPowerEmoji: '✍️',
      superPowerDescription: 'En 4ème, Emma a révélé un talent d\'écriture remarquable, mêlant sensibilité et expression artistique.',
      tags: [
        { label: 'Littéraire', emoji: '📖', color: Colors.green },
        { label: 'Sensible', emoji: '💜', color: '#A78BFA' },
        { label: 'Créative', emoji: '🎨', color: Colors.pink },
      ],
      competences: [
        { label: 'Expression', value: 8, emoji: '✍️' },
        { label: 'Créativité', value: 8, emoji: '🎨' },
        { label: 'Analyse', value: 6, emoji: '🔬' },
        { label: 'Organisation', value: 6, emoji: '📋' },
        { label: 'Autonomie', value: 7, emoji: '🚀' },
      ],
    },
  };
  return archives[yearId] ?? null;
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
  const { selectedChild } = useActiveChild();
  const navigation = useNavigation<any>();
  const childId = selectedChild?.id ?? '2';

  // Academic years
  const academicYears = useMemo(() => getMockAcademicYears(childId), [childId]);
  const activeYearId = academicYears.find((y) => y.statut === 'active')?.id ?? academicYears[0]?.id;
  const [selectedYearId, setSelectedYearId] = useState<string>(activeYearId);

  // Resolve selected year info
  const selectedYear = academicYears.find((y) => y.id === selectedYearId);
  const isArchiveMode = selectedYear?.statut === 'archivée' || selectedYear?.statut === 'importée';

  // Get base profile data, then overlay archived overrides
  const baseData = useMemo(() => getChildProfileData(childId), [childId]);
  const archivedOverrides = isArchiveMode ? getArchivedProfileOverrides(selectedYearId) : null;

  const data: ChildProfileData = useMemo(() => {
    if (!archivedOverrides) return baseData;
    return { ...baseData, ...archivedOverrides } as ChildProfileData;
  }, [baseData, archivedOverrides]);

  const [exporting, setExporting] = useState(false);
  const [exportingMemo, setExportingMemo] = useState(false);

  // Detect alert level — only for active year (spec: no alerts on historical data)
  const joyAlert = isArchiveMode ? { level: null, dropPercent: 0, recentAvg: 0, previousAvg: 0 } : detectJoyAlert(data.joy30Days);
  const hasCriticalMessage = isArchiveMode ? false : detectCriticalKeywords(data.lastCheckinMessage);

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header card */}
      <LinearGradient
        colors={theme.headerGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 28 }}
      >
        {/* Avatar */}
        <Box
          className="w-20 h-20 rounded-full justify-center items-center mb-3"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 3, borderColor: accent }}
        >
          <Text className="text-[40px]">{data.avatar}</Text>
        </Box>

        <Text className="text-2xl font-black mb-1" style={{ color: Colors.white }}>{data.name}</Text>
        <Text className="text-sm mb-3.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{data.classe}</Text>

        {/* Scolaria ID */}
        <HStack
          className="items-center rounded-[20px] px-3.5 py-2"
          style={{ gap: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: accent + '30' }}
        >
          <Ionicons name="finger-print" size={14} color={accent} />
          <Text
            className="text-[13px] font-bold tracking-wide"
            style={{ color: accent, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
          >
            {data.scolariaId}
          </Text>
          <Pressable>
            <Ionicons name="copy-outline" size={14} color={Colors.gray} />
          </Pressable>
        </HStack>
      </LinearGradient>

      {/* Year selector — horizontal scrollable pills */}
      <YearSelector
        years={academicYears}
        selectedId={selectedYearId}
        onSelect={setSelectedYearId}
        onAddYear={() => navigation.navigate('AjouterAnne')}
        accentColor={accent}
      />

      {/* Archive banner — shown for non-active years */}
      {isArchiveMode && selectedYear && (
        <ArchiveBanner
          anneeScolaire={selectedYear.annee_scolaire}
          statut={selectedYear.statut}
        />
      )}

      <Box className="px-5">
        {/* Joy Alerts — only for active year */}
        {!isArchiveMode && (joyAlert.level || hasCriticalMessage) && (
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
          <Text className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>
            Compétences
            {isArchiveMode && selectedYear ? ` · ${selectedYear.annee_scolaire}` : ''}
          </Text>
          <Box
            className="rounded-[20px] p-4 items-center"
            style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
          >
            <CompetenceRadar data={data.competences} />
          </Box>
        </Box>

        {/* Portfolio — only for active year */}
        {!isArchiveMode && (
          <Box className="mb-6">
            <Portfolio activities={data.portfolio} />
          </Box>
        )}

        {/* Cahier de Liaison — only for active year */}
        {!isArchiveMode && (
          <Box className="mb-6">
            <CahierLiaisonParent
              childId={childId}
              childName={data.firstName}
              accentColor={accent}
            />
          </Box>
        )}

        {/* Theme Selector — only for active year */}
        {!isArchiveMode && (
          <Box className="mb-6">
            <ThemeSelector accentColor={accent} />
          </Box>
        )}

        {/* Joy History 30 days — only for active year */}
        {!isArchiveMode && (
          <Box className="mb-6">
            <JoyHistory data={data.joy30Days} month="Mars 2026" />
          </Box>
        )}

        {/* Archive: Aria consultation hint */}
        {isArchiveMode && (
          <HStack
            className="rounded-2xl p-4 mb-6 items-start"
            style={{ gap: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
          >
            <Ionicons name="sparkles" size={18} color={accent} />
            <VStack className="flex-1">
              <Text className="text-sm font-bold mb-1" style={{ color: theme.textPrimary }}>
                Aria · Mode consultation
              </Text>
              <Text className="text-xs leading-[17px]" style={{ color: theme.textSecondary }}>
                Aria peut analyser les données historiques de cette année, mais ne génère pas d'alertes sur les archives.
              </Text>
            </VStack>
          </HStack>
        )}

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
    </ScrollView>
  );
}
