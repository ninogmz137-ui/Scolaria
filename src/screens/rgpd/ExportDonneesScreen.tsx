import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollView, Animated, Alert, Switch, ActivityIndicator, Platform } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import { getExportHistory, createExport, type ExportRecord } from '../../services/rgpdService';

// ─── Types ────────────────────────────────────────────────

interface DataModule {
  key: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
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

// ─── Shadow & helpers ─────────────────────────────────────

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
});

// ─── Component ────────────────────────────────────────────

export default function ExportDonneesScreen() {
  const { theme } = useChildTheme();
  const [exportFormat, setExportFormat] = useState<'json' | 'pdf' | 'both'>('both');
  const [modules, setModules] = useState<DataModule[]>([
    { key: 'profil', name: 'Profil & identité', icon: 'person', color: Colors.violet, size: '12 Ko', count: '2 profils', selected: true },
    { key: 'notes', name: 'Notes & bulletins', icon: 'school', color: Colors.cyan, size: '145 Ko', count: '47 notes', selected: true },
    { key: 'agenda', name: 'Agenda & événements', icon: 'calendar', color: Colors.violet, size: '89 Ko', count: '156 événements', selected: true },
    { key: 'ressenti', name: 'Ressenti & bien-être', icon: 'heart', color: Colors.pink, size: '67 Ko', count: '89 check-ins', selected: true },
    { key: 'competences', name: 'Compétences & radar', icon: 'analytics', color: Colors.green, size: '8 Ko', count: '5 compétences', selected: true },
    { key: 'portfolio', name: 'Portfolio extra-scolaire', icon: 'trophy', color: Colors.orange, size: '15 Ko', count: '5 activités', selected: true },
    { key: 'photos', name: 'Photos & médias', icon: 'camera', color: Colors.orange, size: '4.2 Mo', count: '24 photos', selected: false },
    { key: 'conversations', name: 'Conversations Aria', icon: 'sparkles', color: Colors.violetLight, size: '234 Ko', count: '34 conversations', selected: true },
    { key: 'journal', name: 'Journal d\'accès', icon: 'list', color: Colors.cyan, size: '56 Ko', count: '210 entrées', selected: true },
    { key: 'permissions', name: 'Permissions', icon: 'shield', color: Colors.green, size: '3 Ko', count: '5 personnes', selected: true },
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
        '✅ Export terminé',
        `Vos données ont été exportées en ${formatLabel}.\n\nTaille : ${totalSizeStr}\nModules : ${selectedModules.length}/${modules.length}\n\nLe fichier est prêt à être téléchargé.`,
      );
    });
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView style={{ flex: 1, backgroundColor: '#E8EDF5' }} showsVerticalScrollIndicator={false}>
        {/* Info header */}
        <HStack
          className="items-center gap-3.5 m-5 mb-4 p-4 rounded-2xl border"
          style={{ backgroundColor: theme.card, borderColor: Colors.orange, borderWidth: 1.5, ...CARD_SHADOW }}
        >
          <Box
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: Colors.orange + '15' }}
          >
            <Ionicons name="download" size={24} color={Colors.orange} />
          </Box>
          <Box className="flex-1">
            <Text className="text-base font-extrabold" style={{ color: theme.textPrimary }}>Export intégral RGPD</Text>
            <Text className="text-xs mt-0.5 leading-[17px]" style={{ color: theme.textMuted }}>
              Article 20 du RGPD — Droit à la portabilité. Téléchargez toutes vos données en JSON lisible par machine + PDF lisible par humain.
            </Text>
          </Box>
        </HStack>

        {/* Format selector */}
        <HStack className="items-center gap-2 mb-2.5 px-6">
          <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: Colors.orange }} />
          <Text className="text-[13px] font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>FORMAT D'EXPORT</Text>
        </HStack>
        <HStack className="gap-2.5 mx-5 mb-5">
          {([
            { key: 'json' as const, label: 'JSON', icon: 'code-slash' as const, desc: 'Lisible par machine' },
            { key: 'pdf' as const, label: 'PDF', icon: 'document-text' as const, desc: 'Lisible par humain' },
            { key: 'both' as const, label: 'Les deux', icon: 'documents' as const, desc: 'Recommandé' },
          ]).map((fmt) => (
            <Pressable
              key={fmt.key}
              className="flex-1 items-center p-4 rounded-[14px] border-[1.5px] gap-1.5"
              style={[
                { backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW },
                exportFormat === fmt.key && { borderColor: Colors.orange, backgroundColor: Colors.orange + '10' },
              ]}
              onPress={() => setExportFormat(fmt.key)}
            >
              <Ionicons
                name={fmt.icon}
                size={24}
                color={exportFormat === fmt.key ? Colors.orange : Colors.gray}
              />
              <Text className="text-sm font-bold" style={{ color: exportFormat === fmt.key ? Colors.orange : theme.textPrimary }}>
                {fmt.label}
              </Text>
              <Text className="text-[10px]" style={{ color: theme.textMuted }}>{fmt.desc}</Text>
              {exportFormat === fmt.key && (
                <Box
                  className="absolute top-1.5 right-1.5 w-[18px] h-[18px] rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.orange }}
                >
                  <Ionicons name="checkmark" size={12} color={Colors.white} />
                </Box>
              )}
            </Pressable>
          ))}
        </HStack>

        {/* Module selection */}
        <HStack className="justify-between items-center pr-6 mb-2.5">
          <HStack className="items-center gap-2 px-6">
            <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: Colors.cyan }} />
            <Text className="text-[13px] font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>DONNÉES À EXPORTER</Text>
          </HStack>
          <Pressable onPress={selectAll}>
            <Text className="text-[13px] font-semibold" style={{ color: Colors.cyan }}>
              {modules.every((m) => m.selected) ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Text>
          </Pressable>
        </HStack>

        <Box
          className="mx-5 rounded-2xl border overflow-hidden mb-4"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW }}
        >
          {modules.map((mod, i) => (
            <HStack
              key={mod.key}
              className="items-center p-3.5 gap-3"
              style={i < modules.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.cardBorder } : undefined}
            >
              <Box
                className="w-9 h-9 rounded-[10px] items-center justify-center"
                style={{ backgroundColor: mod.color + '15' }}
              >
                <Ionicons name={mod.icon} size={18} color={mod.color} />
              </Box>
              <Box className="flex-1">
                <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{mod.name}</Text>
                <Text className="text-[11px] mt-px" style={{ color: theme.textMuted }}>
                  {mod.count} · {mod.size}
                </Text>
              </Box>
              <Switch
                value={mod.selected}
                onValueChange={() => toggleModule(mod.key)}
                trackColor={{ false: Colors.darkGray, true: mod.color + '60' }}
                thumbColor={mod.selected ? mod.color : Colors.gray}
              />
            </HStack>
          ))}
        </Box>

        {/* Summary */}
        <VStack
          className="mx-5 p-4 rounded-[14px] border gap-2.5 mb-4"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW }}
        >
          <HStack className="justify-between items-center">
            <Text className="text-[13px]" style={{ color: theme.textMuted }}>Modules sélectionnés</Text>
            <Text className="text-sm font-bold" style={{ color: theme.textPrimary }}>{selectedModules.length}/{modules.length}</Text>
          </HStack>
          <HStack className="justify-between items-center">
            <Text className="text-[13px]" style={{ color: theme.textMuted }}>Taille estimée</Text>
            <Text className="text-sm font-bold" style={{ color: Colors.cyan }}>{totalSizeStr}</Text>
          </HStack>
          <HStack className="justify-between items-center">
            <Text className="text-[13px]" style={{ color: theme.textMuted }}>Format</Text>
            <Text className="text-sm font-bold" style={{ color: Colors.orange }}>
              {exportFormat === 'both' ? 'JSON + PDF' : exportFormat.toUpperCase()}
            </Text>
          </HStack>
        </VStack>

        {/* Export button */}
        {exporting ? (
          <VStack className="mx-5 items-center gap-2.5 p-5">
            <ActivityIndicator color={Colors.orange} size="small" />
            <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Export en cours...</Text>
            <Box className="w-full h-1.5 rounded-sm overflow-hidden" style={{ backgroundColor: theme.cardBorder }}>
              <Animated.View style={{ height: '100%', backgroundColor: Colors.orange, borderRadius: 3, width: progressWidth }} />
            </Box>
          </VStack>
        ) : (
          <Pressable
            className="mx-5 rounded-[30px] overflow-hidden"
            onPress={handleExport}
            disabled={selectedModules.length === 0}
          >
            <LinearGradient
              colors={selectedModules.length > 0 ? [Colors.orange, '#E67E22'] : [Colors.darkGray, Colors.darkGray]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 }}
            >
              <Ionicons name="download" size={22} color={Colors.white} />
              <Text className="text-base font-extrabold text-white">
                Exporter mes données ({totalSizeStr})
              </Text>
            </LinearGradient>
          </Pressable>
        )}

        {/* Export history */}
        <HStack className="items-center gap-2 mb-2.5 px-6 mt-6">
          <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: Colors.green }} />
          <Text className="text-[13px] font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>HISTORIQUE DES EXPORTS</Text>
        </HStack>
        <Box
          className="mx-5 rounded-2xl border overflow-hidden mb-4"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW }}
        >
          {history.map((exp, i) => (
            <HStack
              key={exp.id}
              className="items-center p-3.5 gap-3"
              style={i < history.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.cardBorder } : undefined}
            >
              <Box
                className="w-9 h-9 rounded-[10px] items-center justify-center"
                style={{ backgroundColor: Colors.green + '15' }}
              >
                <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
              </Box>
              <Box className="flex-1">
                <Text className="text-[13px] font-semibold" style={{ color: theme.textPrimary }}>{exp.date}</Text>
                <Text className="text-[11px] mt-0.5" style={{ color: theme.textMuted }}>
                  {exp.format.toUpperCase()} · {exp.size} · {exp.modules}
                </Text>
              </Box>
              <Pressable>
                <Ionicons name="refresh" size={18} color={Colors.cyan} />
              </Pressable>
            </HStack>
          ))}
        </Box>

        {/* JSON preview */}
        <HStack className="items-center gap-2 mb-2.5 px-6 mt-2">
          <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: Colors.violet }} />
          <Text className="text-[13px] font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>APERÇU JSON</Text>
        </HStack>
        <Box
          className="mx-5 p-4 rounded-[14px] border mb-4"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW }}
        >
          <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: Colors.green, lineHeight: 17 }}>{`{
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
        </Box>

        {/* RGPD notice */}
        <HStack
          className="items-start gap-2.5 mx-5 p-3.5 rounded-[14px] border"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW }}
        >
          <Ionicons name="information-circle" size={16} color={Colors.cyan} />
          <Text className="flex-1 text-[11px] leading-4" style={{ color: theme.textMuted }}>
            Conformément à l'article 20 du RGPD, vos données sont fournies dans un format structuré, couramment utilisé et lisible par machine (JSON). Le PDF offre une version lisible par humain.
          </Text>
        </HStack>

        <Box className="h-10" />
      </ScrollView>
    </Animated.View>
  );
}
