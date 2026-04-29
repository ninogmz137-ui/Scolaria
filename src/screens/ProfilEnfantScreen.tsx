/**
 * ProfilEnfantScreen — Premium design system v2.0 (glass, white header, neutral base).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  FileText,
  GraduationCap,
  PenLine,
  Fingerprint,
  ChevronLeft,
  Info,
  Share2,
  MessageCircle,
  Activity,
  Sparkles,
  Users,
  Clock,
  BookOpen,
  Shield,
  GitBranch,
  Mic,
  BarChart2,
  ClipboardList,
  Search,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveChild } from '../contexts/ActiveChildContext';
import AvatarPicker, { type AvatarSelection } from '../components/AvatarPicker';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { FLOATING_TAB_BAR_HEIGHT, TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';
import { type ProfileTag } from '../components/profile/SuperPowerBadge';
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
import { Colors, SCREEN_BACKGROUND } from '../constants/colors';

const PAGE_BG = '#F2F4F8';
const NAVY = '#1A2340';
const VIOLET = '#7C3AED';
const CYAN = '#06B6D4';
const COMPETENCE_ICON = '#6B7280';

const COMPETENCE_ICONS: Record<string, typeof MessageCircle> = {
  Langage: MessageCircle,
  Motricité: Activity,
  Créativité: Sparkles,
  Sociabilité: Users,
  Autonomie: Clock,
  Connaissances: BookOpen,
  Confiance: Shield,
  Logique: GitBranch,
  Expression: Mic,
  Analyse: BarChart2,
  Organisation: ClipboardList,
  Curiosité: Search,
};

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

function getChildProfileData(childId: string): ChildProfileData {
  switch (childId) {
    case '1':
    case 'demo-lea':
      return {
        name: 'Léa Moreau',
        firstName: 'Léa',
        avatar: '🦁',
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

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function CompetenceRow({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value * 10));
  const Icon = COMPETENCE_ICONS[label] ?? Sparkles;
  return (
    <View style={styles.compRow}>
      <View style={styles.compIconSq}>
        <Icon size={14} color={COMPETENCE_ICON} strokeWidth={1.5} />
      </View>
      <Text style={styles.compLabel}>{label}</Text>
      <View style={styles.compTrack}>
        <View style={[styles.compFill, { width: `${pct}%`, backgroundColor: '#7C3AED' }]} />
      </View>
      <Text style={styles.compScore}>{value}</Text>
    </View>
  );
}

function SuperPouvoirCard({
  power,
  emoji,
  description,
  tags,
  weeks,
  onShare,
}: {
  power: string;
  emoji: string;
  description: string;
  tags: ProfileTag[];
  weeks: number;
  onShare: () => void;
}) {
  return (
    <LinearGradient
      colors={['rgba(124,58,237,0.07)', 'rgba(6,182,212,0.05)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.spCard}
    >
      <View style={styles.spTopRow}>
        <Text style={styles.spSectionLeft}>✦ SUPER-POUVOIR</Text>
        <LinearGradient
          colors={['rgba(124,58,237,0.1)', 'rgba(6,182,212,0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.spAriaBadge}
        >
          <Text style={styles.spAriaBadgeText}>✦ Observé par Aria</Text>
        </LinearGradient>
      </View>

      <LinearGradient
        colors={[VIOLET, CYAN]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.spIconGrad}
      >
        <Text style={styles.spEmoji}>{emoji}</Text>
      </LinearGradient>

      <Text style={styles.spName}>{power}</Text>
      <Text style={styles.spDesc}>{description}</Text>

      <View style={styles.spTraits}>
        {tags.map((t) => (
          <View key={t.label} style={styles.traitPill}>
            <Text style={styles.traitEmoji}>{t.emoji}</Text>
            <Text style={styles.traitLabel}>{t.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.spFooter}>
        <View style={styles.spFooterLeft}>
          <Info size={14} color="#9CA3AF" strokeWidth={2} />
          <Text style={styles.spFooterGrey}>Révisé dans {weeks} semaines</Text>
        </View>
        <Pressable onPress={onShare} style={styles.spShareBtn} hitSlop={8}>
          <Share2 size={14} color={VIOLET} strokeWidth={2} />
          <Text style={styles.spShareText}>Partager</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

export default function ProfilEnfantScreen() {
  useChildTheme();
  const { selectedChild, updateChildAvatar } = useActiveChild();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const childId = selectedChild?.id ?? '2';

  const [data, setData] = useState<ChildProfileData>(() => getChildProfileData(childId));
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingMemo, setExportingMemo] = useState(false);

  const displayEmoji =
    selectedChild.avatarType === 'photo'
      ? undefined
      : selectedChild.avatarEmoji || data.avatar;

  const handleAvatarSelect = useCallback(
    (selection: AvatarSelection) => {
      updateChildAvatar(childId, selection.type, selection.emoji, selection.photoUri);
    },
    [childId, updateChildAvatar],
  );

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
      classe:
        child.classe && child.school ? `${child.classe} — ${child.school}` : mock.classe,
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

  const handleShareSuper = async () => {
    const tagLine = data.tags.map((t) => `${t.emoji} ${t.label}`).join(' · ');
    try {
      await Share.share({
        message: `${data.superPowerEmoji} ${data.firstName} — ${data.superPower}\n\n${data.superPowerDescription}\n\n${tagLine}\n\n— Profil Scolaria`,
        title: `Super-pouvoir de ${data.firstName}`,
      });
    } catch {
      /* cancelled */
    }
  };

  const headerBottom = insets.top + 12 + 44 + 12 + 72 + 12 + 22 + 8 + 36;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: FLOATING_TAB_BAR_HEIGHT + TAB_BAR_SCROLL_PADDING + insets.bottom + 16,
        }}
      >
        <View style={[styles.whiteHeader, { paddingTop: insets.top + 12 }]}>
          <View style={styles.navRow}>
            <Pressable
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={12}
            >
              <ChevronLeft size={18} color={NAVY} strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.navTitle}>Profil élève</Text>
            <View style={{ width: 34 }} />
          </View>

          <Pressable
            onPress={() => setAvatarPickerVisible(true)}
            style={styles.avatarPress}
          >
            <View style={styles.avatarRing}>
              {selectedChild.avatarType === 'photo' && selectedChild.avatarPhotoUri ? (
                <Image
                  source={{ uri: selectedChild.avatarPhotoUri }}
                  style={styles.avatarPhoto}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarEmoji}>{displayEmoji}</Text>
              )}
            </View>
            <View style={styles.editBadge}>
              <PenLine size={10} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </Pressable>

          <Text style={styles.childName}>{data.name}</Text>
          <Text style={styles.schoolInfo}>{data.classe}</Text>
        </View>

        <View style={[styles.scaWrap, { marginTop: -6 }]}>
          <View style={styles.scaPill}>
            <Fingerprint size={12} color="#9CA3AF" strokeWidth={2} />
            <Text style={styles.scaText}>{data.scolariaId}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, marginTop: 8 }}>
          {(joyAlert.level || hasCriticalMessage) && (
            <View style={{ marginBottom: 16 }}>
              <JoyAlerts
                level={joyAlert.level}
                dropPercent={joyAlert.dropPercent}
                recentAvg={joyAlert.recentAvg}
                childName={data.firstName}
                showUrgencyProtocol={hasCriticalMessage}
              />
            </View>
          )}

          <SuperPouvoirCard
            power={data.superPower}
            emoji={data.superPowerEmoji}
            description={data.superPowerDescription}
            tags={data.tags}
            weeks={data.trimesterWeeksLeft}
            onShare={handleShareSuper}
          />

          <SectionTitle label="Compétences clés" />
          <View style={styles.glassCard}>
            <BlurView intensity={16} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.glassInner}>
              {data.competences.map((c) => (
                <CompetenceRow key={c.label} label={c.label} value={c.value} />
              ))}
            </View>
          </View>

          <SectionTitle label="Score de joie" />
          <JoyHistory data={data.joy30Days} month="Mars 2026" />

          <SectionTitle label="Portfolio extra-scolaire" />
          <Portfolio activities={data.portfolio} />

          <SectionTitle label="Actions" />
          <View style={styles.actionsRow}>
            <Pressable
              style={styles.actionPill}
              onPress={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color={NAVY} size="small" />
              ) : (
                <FileText size={16} color={NAVY} strokeWidth={2} />
              )}
              <Text style={styles.actionPillText} numberOfLines={2}>
                {exporting ? 'Génération…' : 'Exporter en PDF'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.actionPill}
              onPress={handleExportMemo}
              disabled={exportingMemo}
            >
              {exportingMemo ? (
                <ActivityIndicator color={NAVY} size="small" />
              ) : (
                <GraduationCap size={16} color={NAVY} strokeWidth={2} />
              )}
              <Text style={styles.actionPillText} numberOfLines={2}>
                {exportingMemo ? 'Génération…' : 'Mémo de bienvenue'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <AvatarPicker
        visible={avatarPickerVisible}
        onClose={() => setAvatarPickerVisible(false)}
        onSelect={handleAvatarSelect}
        childName={data.name}
        accentColor={VIOLET}
        currentEmoji={selectedChild.avatarEmoji || data.avatar}
        currentPhotoUri={selectedChild.avatarPhotoUri}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  whiteHeader: {
    backgroundColor: SCREEN_BACKGROUND,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 20,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 17,
    textTransform: 'uppercase',
    letterSpacing: 0.05 * 17,
    color: NAVY,
  },
  avatarPress: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F2F4F8',
    borderWidth: 2.5,
    borderColor: 'rgba(124,58,237,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 34,
  },
  avatarPhoto: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: NAVY,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 18,
    color: NAVY,
    textAlign: 'center',
    marginBottom: 4,
  },
  schoolInfo: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  scaWrap: {
    alignItems: 'center',
    zIndex: 2,
    marginBottom: 8,
  },
  scaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 0,
  },
  scaText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#9CA3AF',
    marginTop: 20,
    marginBottom: 10,
  },
  spCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.14)',
    marginBottom: 4,
  },
  spTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  spSectionLeft: {
    fontFamily: FontFamily.displayBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: VIOLET,
  },
  spAriaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.18)',
  },
  spAriaBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
    color: VIOLET,
  },
  spIconGrad: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  spEmoji: { fontSize: 26 },
  spName: {
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    color: NAVY,
    textAlign: 'center',
    marginBottom: 8,
  },
  spDesc: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 12,
  },
  spTraits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  traitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SCREEN_BACKGROUND,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  traitEmoji: { fontSize: 11 },
  traitLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    fontWeight: '500',
    color: VIOLET,
  },
  spFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 11,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,58,237,0.1)',
  },
  spFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  spFooterGrey: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#9CA3AF',
    flexShrink: 1,
  },
  spShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spShareText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: VIOLET,
  },
  glassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(255,255,255,0.72)',
    marginBottom: 8,
  },
  glassInner: { padding: 16 },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  compIconSq: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#F8F9FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    fontWeight: '500',
    color: NAVY,
    width: 96,
  },
  compTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  compFill: { height: '100%', borderRadius: 2 },
  compScore: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: NAVY,
    width: 22,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 24,
    width: '100%',
    alignSelf: 'center',
  },
  actionPill: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(26, 35, 64, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(26, 35, 64, 0.1)',
  },
  actionPillText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    fontWeight: '600',
    color: NAVY,
    textAlign: 'center',
    flexShrink: 1,
  },
});
