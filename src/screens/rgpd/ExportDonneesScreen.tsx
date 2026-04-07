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
import { Colors } from '../../constants/colors';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../components/FloatingTabBar';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { getExportHistory, createExport } from '../../services/rgpdService';

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
  const { theme } = useChildTheme();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;
  const [exportFormat, setExportFormat] = useState<'json' | 'pdf' | 'both'>('both');
  const [modules, setModules] = useState<DataModule[]>([
    { key: 'profil', name: 'Profil & identité', Icon: User, color: Colors.violet, size: '12 Ko', count: '2 profils', selected: true },
    { key: 'notes', name: 'Notes & bulletins', Icon: Check, color: Colors.cyan, size: '145 Ko', count: '47 notes', selected: true },
    { key: 'agenda', name: 'Agenda & événements', Icon: Calendar, color: Colors.violet, size: '89 Ko', count: '156 événements', selected: true },
    { key: 'ressenti', name: 'Ressenti & bien-être', Icon: Heart, color: Colors.pink, size: '67 Ko', count: '89 check-ins', selected: true },
    { key: 'competences', name: 'Compétences & radar', Icon: PieChart, color: Colors.green, size: '8 Ko', count: '5 compétences', selected: true },
    { key: 'portfolio', name: 'Portfolio extra-scolaire', Icon: Star, color: Colors.orange, size: '15 Ko', count: '5 activités', selected: true },
    { key: 'photos', name: 'Photos & médias', Icon: Camera, color: Colors.orange, size: '4.2 Mo', count: '24 photos', selected: false },
    { key: 'conversations', name: 'Conversations Aria', Icon: Sparkles, color: Colors.violetLight, size: '234 Ko', count: '34 conversations', selected: true },
    { key: 'journal', name: 'Journal d\'accès', Icon: List, color: Colors.cyan, size: '56 Ko', count: '210 entrées', selected: true },
    { key: 'permissions', name: 'Permissions', Icon: Lock, color: Colors.green, size: '3 Ko', count: '5 personnes', selected: true },
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
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: TOPBAR_H + 12,
            paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10,
            paddingHorizontal: 18,
          }}
        >
          {/* Info header */}
          <View style={[styles.card, { borderColor: Colors.orange + '60', marginBottom: 14 }]}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: Colors.orange + '20' }]}>
                <ArrowDown size={24} color={Colors.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Export intégral RGPD</Text>
                <Text style={styles.infoSubtitle}>
                  Article 20 du RGPD — Droit à la portabilité. Téléchargez toutes vos données en JSON lisible par machine + PDF lisible par humain.
                </Text>
              </View>
            </View>
          </View>

          {/* Format selector label */}
          <Text style={styles.sectionLabel}>FORMAT D'EXPORT</Text>

          <View style={styles.formatRow}>
            {FORMAT_OPTIONS.map((fmt) => {
              const isSelected = exportFormat === fmt.key;
              return (
                <Pressable key={fmt.key} style={{ flex: 1 }} onPress={() => setExportFormat(fmt.key)}>
                  <View
                    style={[
                      styles.formatCard,
                      isSelected && { borderColor: Colors.orange + '80', backgroundColor: Colors.orange + '08' },
                    ]}
                  >
                    {isSelected && (
                      <View style={[styles.formatCheck, { backgroundColor: Colors.orange }]}>
                        <Check size={12} color="#fff" />
                      </View>
                    )}
                    <fmt.Icon size={24} color={isSelected ? Colors.orange : '#CBD5E1'} />
                    <Text style={[styles.formatLabel, isSelected && { color: Colors.orange }]}>{fmt.label}</Text>
                    <Text style={styles.formatDesc}>{fmt.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Module selection label */}
          <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between' }]}>
            <Text style={styles.sectionLabel}>DONNÉES À EXPORTER</Text>
            <Pressable onPress={selectAll}>
              <Text style={[styles.sectionLabel, { color: Colors.cyan, textTransform: 'none', letterSpacing: 0 }]}>
                {modules.every((m) => m.selected) ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.card, { marginBottom: 14, padding: 0 }]}>
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
                  trackColor={{ false: '#E2E8F0', true: mod.color + '60' }}
                  thumbColor={mod.selected ? mod.color : '#CBD5E1'}
                />
              </View>
            ))}
          </View>

          {/* Summary */}
          <View style={[styles.card, { marginBottom: 14 }]}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Modules sélectionnés</Text>
              <Text style={styles.summaryValue}>{selectedModules.length}/{modules.length}</Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: 8 }]}>
              <Text style={styles.summaryLabel}>Taille estimée</Text>
              <Text style={[styles.summaryValue, { color: Colors.cyan }]}>{totalSizeStr}</Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: 8 }]}>
              <Text style={styles.summaryLabel}>Format</Text>
              <Text style={[styles.summaryValue, { color: Colors.orange }]}>
                {exportFormat === 'both' ? 'JSON + PDF' : exportFormat.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Export button */}
          {exporting ? (
            <View style={[styles.card, { alignItems: 'center', gap: 10, marginBottom: 14 }]}>
              <ActivityIndicator color={Colors.orange} size="small" />
              <Text style={styles.personName}>Export en cours...</Text>
              <View style={styles.progressBg}>
                <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: Colors.orange }]} />
              </View>
            </View>
          ) : (
            <Pressable
              style={[
                styles.exportBtn,
                { opacity: selectedModules.length > 0 ? 1 : 0.5 },
              ]}
              onPress={handleExport}
              disabled={selectedModules.length === 0}
            >
              <ArrowDown size={20} color="#7C3AED" strokeWidth={1.5} />
              <Text style={styles.exportBtnText}>
                Exporter mes données ({totalSizeStr})
              </Text>
            </Pressable>
          )}

          {/* Export history label */}
          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>HISTORIQUE DES EXPORTS</Text>

          <View style={[styles.card, { marginBottom: 14, padding: 0 }]}>
            {history.map((exp, i) => (
              <View
                key={exp.id}
                style={[styles.historyRow, i < history.length - 1 && styles.rowBorder]}
              >
                <View style={[styles.moduleIcon, { backgroundColor: Colors.green + '20' }]}>
                  <Check size={18} color={Colors.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{exp.date}</Text>
                  <Text style={styles.personRole}>
                    {exp.format.toUpperCase()} · {exp.size} · {exp.modules}
                  </Text>
                </View>
                <Pressable>
                  <ArrowRight size={18} color={Colors.cyan} />
                </Pressable>
              </View>
            ))}
          </View>

          {/* JSON preview label */}
          <Text style={[styles.sectionLabel, { marginTop: 4 }]}>APERÇU JSON</Text>

          <View style={[styles.card, { marginBottom: 14 }]}>
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
          </View>

          {/* RGPD notice */}
          <View style={styles.card}>
            <View style={styles.noticeRow}>
              <Info size={16} color={Colors.cyan} />
              <Text style={styles.noticeText}>
                Conformément à l'article 20 du RGPD, vos données sont fournies dans un format structuré, couramment utilisé et lisible par machine (JSON). Le PDF offre une version lisible par humain.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    marginBottom: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#1A2340' },
  infoSubtitle: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#94A3B8', marginTop: 2, lineHeight: 17 },
  sectionLabel: { fontFamily: FontFamily.sansBold, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, marginTop: 2 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  formatRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  formatCard: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
    position: 'relative',
    backgroundColor: '#FFFFFF',
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
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginBottom: 8 },
  exportBtnText: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, fontWeight: '600', color: '#7C3AED' },
  historyRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  jsonPreview: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Colors.green,
    lineHeight: 17,
  },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noticeText: { fontFamily: FontFamily.sansRegular, fontSize: 11, lineHeight: 16, color: '#94A3B8', flex: 1 },
});
