import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Animated, Alert, Switch, ActivityIndicator, Platform } from 'react-native';
import {
  ArrowDown,
  Check,
  Info,
  Code,
  FileText,
  User,
  Calendar,
  Camera,
  Heart,
  Sparkles,
  List,
  Lock,
  PieChart,
  Star,
  ArrowRight,
} from 'lucide-react-native';
import { Colors, SCREEN_BACKGROUND } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_SCROLL_PADDING } from '../../components/FloatingTabBar';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { getExportHistory, createExport } from '../../services/rgpdService';
import GlassCard from '../../components/GlassCard';
import RgpdHero from '../../components/rgpd/RgpdHero';
import RgpdSectionLabel from '../../components/rgpd/RgpdSectionLabel';
import { ARIA_INDIGO } from '../../constants/theme';
import GradientButton from '../../components/shared/GradientButton';
import RgpdBottomSheet from '../../components/rgpd/RgpdBottomSheet';

// ─── Types ────────────────────────────────────────────────

interface DataModule {
  key: string;
  name: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  size: string;
  count: string;
  selected: boolean;
}

interface ExportHistory {
  id: string;
  date: string;
  format: 'json' | 'pdf' | 'json+pdf';
  size: string;
  modules: string;
  status: 'completed' | 'pending';
}

// ─── Component ────────────────────────────────────────────

export default function ExportDonneesScreen() {
  const [exportFormat, setExportFormat] = useState<'json' | 'pdf' | 'both'>('both');
  const [modules, setModules] = useState<DataModule[]>([
    { key: 'profil', name: 'Profil & identité', Icon: User, color: ARIA_INDIGO, size: '12 Ko', count: '2 profils', selected: true },
    { key: 'notes', name: 'Notes & bulletins', Icon: Check, color: ARIA_INDIGO, size: '145 Ko', count: '47 notes', selected: true },
    { key: 'agenda', name: 'Agenda & événements', Icon: Calendar, color: ARIA_INDIGO, size: '89 Ko', count: '156 événements', selected: true },
    { key: 'ressenti', name: 'Ressenti & bien-être', Icon: Heart, color: ARIA_INDIGO, size: '67 Ko', count: '89 check-ins', selected: true },
    { key: 'competences', name: 'Compétences & radar', Icon: PieChart, color: ARIA_INDIGO, size: '8 Ko', count: '5 compétences', selected: true },
    { key: 'portfolio', name: 'Portfolio extra-scolaire', Icon: Star, color: ARIA_INDIGO, size: '15 Ko', count: '5 activités', selected: true },
    { key: 'photos', name: 'Photos & médias', Icon: Camera, color: ARIA_INDIGO, size: '4.2 Mo', count: '24 photos', selected: false },
    { key: 'conversations', name: 'Conversations Aria', Icon: Sparkles, color: ARIA_INDIGO, size: '234 Ko', count: '34 conversations', selected: true },
    { key: 'journal', name: "Journal d'accès", Icon: List, color: ARIA_INDIGO, size: '56 Ko', count: '210 entrées', selected: true },
    { key: 'permissions', name: 'Permissions', Icon: Lock, color: ARIA_INDIGO, size: '3 Ko', count: '5 personnes', selected: true },
  ]);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [history, setHistory] = useState<ExportHistory[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const MOCK_HISTORY: ExportHistory[] = [
    { id: '1', date: '15 mars 2026, 14:30', format: 'json+pdf', size: '4.8 Mo', modules: 'Toutes les données', status: 'completed' },
    { id: '2', date: '1er février 2026, 10:15', format: 'json', size: '623 Ko', modules: 'Notes, Agenda, Profil', status: 'completed' },
    { id: '3', date: '10 janvier 2026, 18:00', format: 'pdf', size: '2.1 Mo', modules: 'Profil complet + Photos', status: 'completed' },
  ];

  const loadHistory = useCallback(async () => {
    const data = await getExportHistory();
    if (data.length > 0) {
      setHistory(data.map((e) => ({
        id: e.id,
        date: new Date(e.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        format: e.format,
        size: e.total_size,
        modules: e.modules.join(', '),
        status: e.status === 'completed' ? 'completed' : 'pending',
      })));
    } else {
      setHistory(MOCK_HISTORY);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const toggleModule = (key: string) => {
    setModules((prev) => prev.map((m) => (m.key === key ? { ...m, selected: !m.selected } : m)));
  };

  const selectAll = () => {
    const allSelected = modules.every((m) => m.selected);
    setModules((prev) => prev.map((m) => ({ ...m, selected: !allSelected })));
  };

  const selectedModules = modules.filter((m) => m.selected);
  const totalSize = selectedModules.reduce((acc, m) => {
    const size = parseFloat(m.size);
    if (m.size.includes('Mo')) return acc + size * 1024;
    return acc + size;
  }, 0);
  const totalSizeStr = totalSize > 1024 ? `${(totalSize / 1024).toFixed(1)} Mo` : `${Math.round(totalSize)} Ko`;

  const handleExport = async () => {
    if (selectedModules.length === 0) {
      Alert.alert('Sélection vide', 'Veuillez sélectionner au moins un module à exporter.');
      return;
    }

    const dbFormat = exportFormat === 'both' ? 'json+pdf' : exportFormat;
    await createExport({
      format: dbFormat as 'json' | 'pdf' | 'json+pdf',
      modules: selectedModules.map((m) => m.key),
      total_size: totalSizeStr,
    });

    setExporting(true);
    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start(() => {
      setExporting(false);
      setExportDone(true);
      loadHistory();

      const formatLabel = exportFormat === 'both' ? 'JSON + PDF' : exportFormat.toUpperCase();
      Alert.alert(
        'Export terminé',
        `Vos données ont été exportées en ${formatLabel}.\n\nTaille : ${totalSizeStr}\nModules : ${selectedModules.length}/${modules.length}\n\nLe fichier est prêt à être téléchargé.`,
      );
    });
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const FORMAT_OPTIONS = [
    { key: 'json' as const, label: 'JSON', Icon: Code as React.ComponentType<{ size?: number; color?: string }>, desc: 'Lisible par machine' },
    { key: 'pdf' as const, label: 'PDF', Icon: FileText as React.ComponentType<{ size?: number; color?: string }>, desc: 'Lisible par humain' },
    { key: 'both' as const, label: 'Les deux', Icon: ArrowDown as React.ComponentType<{ size?: number; color?: string }>, desc: 'Recommandé' },
  ];

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <View style={{ flex: 1, backgroundColor: SCREEN_BACKGROUND }}>
        <RgpdBottomSheet>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 56,
              paddingBottom: TAB_BAR_SCROLL_PADDING,
              paddingHorizontal: 18,
            }}
          >
          <RgpdHero
            Icon={ArrowDown}
            title="Export intégral"
            subtitle="Article 20 (portabilité). Téléchargez vos données en JSON (machine) et/ou PDF (humain)."
          />

          {/* Format selector label */}
          <RgpdSectionLabel style={{ marginTop: 14, marginBottom: 10 }}>Format d’export</RgpdSectionLabel>

          <View style={styles.formatRow}>
            {FORMAT_OPTIONS.map((fmt) => {
              const isSelected = exportFormat === fmt.key;
              return (
                <Pressable key={fmt.key} style={{ flex: 1 }} onPress={() => setExportFormat(fmt.key)}>
                  <View
                    style={[
                      styles.formatCard,
                      isSelected && { borderColor: 'rgba(67,56,202,0.25)', backgroundColor: 'rgba(67,56,202,0.06)' },
                    ]}
                  >
                    {isSelected && (
                      <View style={[styles.formatCheck, { backgroundColor: ARIA_INDIGO }]}>
                        <Check size={12} color="#fff" />
                      </View>
                    )}
                    <fmt.Icon size={24} color={isSelected ? ARIA_INDIGO : Colors.textMuted} />
                    <Text style={[styles.formatLabel, isSelected && { color: Colors.textPrimary }]}>{fmt.label}</Text>
                    <Text style={styles.formatDesc}>{fmt.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Module selection label */}
          <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between' }]}>
            <RgpdSectionLabel>Données à exporter</RgpdSectionLabel>
            <Pressable onPress={selectAll}>
              <Text style={[styles.sectionLabel, { color: ARIA_INDIGO, textTransform: 'none', letterSpacing: 0 }]}>
                {modules.every((m) => m.selected) ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Text>
            </Pressable>
          </View>

          <GlassCard noPadding style={[styles.cardBorder, { marginBottom: 14 }]}>
            {modules.map((mod, i) => (
              <View
                key={mod.key}
                style={[styles.moduleRow, i < modules.length - 1 && styles.rowBorder]}
              >
                <View style={[styles.moduleIcon, { backgroundColor: mod.color + '20' }]}>
                  <mod.Icon size={18} color={mod.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{mod.name}</Text>
                  <Text style={styles.personRole}>{mod.count} · {mod.size}</Text>
                </View>
                <Switch
                  value={mod.selected}
                  onValueChange={() => toggleModule(mod.key)}
                  trackColor={{ false: '#E2E8F0', true: 'rgba(67,56,202,0.35)' }}
                  thumbColor={mod.selected ? ARIA_INDIGO : '#CBD5E1'}
                />
              </View>
            ))}
          </GlassCard>

          {/* Summary */}
          <GlassCard style={[styles.cardBorder, { marginBottom: 14 }]}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Modules sélectionnés</Text>
              <Text style={styles.summaryValue}>{selectedModules.length}/{modules.length}</Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: 8 }]}>
              <Text style={styles.summaryLabel}>Taille estimée</Text>
              <Text style={[styles.summaryValue, { color: Colors.textPrimary }]}>{totalSizeStr}</Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: 8 }]}>
              <Text style={styles.summaryLabel}>Format</Text>
              <Text style={[styles.summaryValue, { color: Colors.textPrimary }]}>
                {exportFormat === 'both' ? 'JSON + PDF' : exportFormat.toUpperCase()}
              </Text>
            </View>
          </GlassCard>

          {/* Export button */}
          {exporting ? (
            <GlassCard style={[styles.cardBorder, { alignItems: 'center', gap: 10, marginBottom: 14 }]}>
              <ActivityIndicator color={ARIA_INDIGO} size="small" />
              <Text style={styles.personName}>Export en cours...</Text>
              <View style={styles.progressBg}>
                <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: ARIA_INDIGO }]} />
              </View>
            </GlassCard>
          ) : (
            <GradientButton
              label={`Exporter (${totalSizeStr})`}
              onPress={handleExport}
              disabled={selectedModules.length === 0}
              leftIcon={<ArrowDown size={18} color="#FFFFFF" strokeWidth={2} />}
            />
          )}

          {/* Export history label */}
          <RgpdSectionLabel style={{ marginTop: 16, marginBottom: 10 }}>Historique des exports</RgpdSectionLabel>

          <GlassCard noPadding style={[styles.cardBorder, { marginBottom: 14 }]}>
            {history.map((exp, i) => (
              <View
                key={exp.id}
                style={[styles.historyRow, i < history.length - 1 && styles.rowBorder]}
              >
                <View style={[styles.moduleIcon, { backgroundColor: 'rgba(67,56,202,0.10)' }]}>
                  <Check size={18} color={ARIA_INDIGO} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{exp.date}</Text>
                  <Text style={styles.personRole}>
                    {exp.format.toUpperCase()} · {exp.size} · {exp.modules}
                  </Text>
                </View>
                <Pressable>
                  <ArrowRight size={18} color={Colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </GlassCard>

          {/* JSON preview label */}
          <RgpdSectionLabel style={{ marginTop: 4, marginBottom: 10 }}>Aperçu JSON</RgpdSectionLabel>

          <GlassCard style={[styles.cardBorder, { marginBottom: 14 }]}>
            <Text style={styles.jsonPreview}>{`{
  "scolaria_export": {
    "version": "1.0",
    "generated_at": "2026-03-22T14:30:00Z",
    "format": "RGPD Article 20",
    "family": {
      "name": "Famille Moreau",
      "children": [
        {
          "scolaria_id": "SCA-2026-FR-048721",
          "name": "Lucas Moreau",
          "classe": "CM2",
          "competences": [...],
          "notes": [...],
          "joy_history": [...],
          "portfolio": [...]
        }
      ]
    }
  }
}`}</Text>
          </GlassCard>

          {/* RGPD notice */}
          <GlassCard style={[styles.cardBorder, { marginBottom: 8 }]}>
            <View style={styles.noticeRow}>
              <View style={styles.miniIconWrap}>
                <Info size={16} color={ARIA_INDIGO} />
              </View>
              <Text style={styles.noticeText}>
                Conformément à l’article 20 du RGPD, vos données sont fournies dans un format structuré,
                couramment utilisé et lisible par machine (JSON). Le PDF offre une version lisible par humain.
              </Text>
            </View>
          </GlassCard>
          </ScrollView>
        </RgpdBottomSheet>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardBorder: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sectionLabel: { fontFamily: FontFamily.sansBold, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, marginTop: 2 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  formatRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  formatCard: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
    position: 'relative',
    backgroundColor: SCREEN_BACKGROUND,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  formatCheck: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  formatLabel: { fontFamily: FontFamily.sansBold, fontSize: 14, color: '#1A2340' },
  formatDesc: { fontFamily: FontFamily.sansRegular, fontSize: 10, color: '#94A3B8', textAlign: 'center' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  moduleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  moduleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  personName: { fontFamily: FontFamily.sansBold, fontSize: 14, color: '#1A2340' },
  personRole: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: '#94A3B8', marginTop: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontFamily: FontFamily.sansRegular, fontSize: 13, color: '#94A3B8' },
  summaryValue: { fontFamily: FontFamily.sansBold, fontSize: 14, color: '#1A2340' },
  progressBg: { width: '100%', height: 6, borderRadius: 3, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  historyRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  jsonPreview: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  miniIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(67,56,202,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.14)',
    marginTop: 1,
  },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noticeText: { fontFamily: FontFamily.sansRegular, fontSize: 11.5, lineHeight: 16, color: Colors.textSecondary, flex: 1 },
});
