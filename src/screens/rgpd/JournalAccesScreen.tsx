import { useState, useRef, useEffect } from 'react';
import { ScrollView, Animated } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useChildTheme } from '../../contexts/ChildThemeContext';

// ─── Types ────────────────────────────────────────────────

interface AccessEntry {
  id: string;
  person: string;
  avatar: string;
  role: string;
  action: string;
  module: string;
  moduleIcon: keyof typeof Ionicons.glyphMap;
  child: string;
  date: string;
  time: string;
  ip?: string;
  device?: string;
  color: string;
}

type FilterType = 'all' | 'today' | 'week' | 'month';

// ─── Mock data ────────────────────────────────────────────

const ACCESS_LOG: AccessEntry[] = [
  {
    id: '1', person: 'Sophie Moreau', avatar: '👩', role: 'Tuteur légal',
    action: 'Consultation', module: 'Notes & bulletins', moduleIcon: 'school',
    child: 'Lucas', date: "Aujourd'hui", time: '14:32', device: 'iPhone 15', ip: '192.168.1.42',
    color: Colors.cyan,
  },
  {
    id: '2', person: 'Sophie Moreau', avatar: '👩', role: 'Tuteur légal',
    action: 'Consultation', module: 'Profil enfant', moduleIcon: 'person',
    child: 'Lucas', date: "Aujourd'hui", time: '14:28', device: 'iPhone 15', ip: '192.168.1.42',
    color: Colors.green,
  },
  {
    id: '3', person: 'Marc Moreau', avatar: '👨', role: 'Tuteur légal',
    action: 'Exportation PDF', module: 'Profil complet', moduleIcon: 'document-text',
    child: 'Lucas', date: "Aujourd'hui", time: '12:15', device: 'MacBook Pro', ip: '86.245.12.8',
    color: Colors.violet,
  },
  {
    id: '4', person: 'Marie-Claire Moreau', avatar: '👵', role: 'Grand-mère',
    action: 'Consultation', module: 'Photos', moduleIcon: 'camera',
    child: 'Lucas', date: 'Hier', time: '18:45', device: 'iPad Air', ip: '90.112.45.3',
    color: Colors.orange,
  },
  {
    id: '5', person: 'Marc Moreau', avatar: '👨', role: 'Tuteur légal',
    action: 'Modification', module: 'Agenda', moduleIcon: 'calendar',
    child: 'Emma', date: 'Hier', time: '20:15', device: 'Samsung Galaxy S24', ip: '86.245.12.8',
    color: Colors.violet,
  },
  {
    id: '6', person: 'Assistante maternelle', avatar: '👩‍🏫', role: 'Accompagnant',
    action: 'Consultation', module: 'Agenda', moduleIcon: 'calendar',
    child: 'Lucas', date: 'Il y a 2 jours', time: '08:30', device: 'Huawei P40', ip: '176.145.23.6',
    color: Colors.violet,
  },
  {
    id: '7', person: 'Sophie Moreau', avatar: '👩', role: 'Tuteur légal',
    action: 'Modification permissions', module: 'Réglages RGPD', moduleIcon: 'shield-checkmark',
    child: '—', date: 'Il y a 3 jours', time: '10:12', device: 'iPhone 15', ip: '192.168.1.42',
    color: Colors.green,
  },
  {
    id: '8', person: 'Dr. Martin', avatar: '👩‍⚕️', role: 'Accès minimal',
    action: 'Consultation', module: 'Profil (résumé)', moduleIcon: 'person',
    child: 'Lucas', date: 'Il y a 5 jours', time: '09:00', device: 'PC Bureau', ip: '212.56.89.1',
    color: Colors.green,
  },
  {
    id: '9', person: 'Sophie Moreau', avatar: '👩', role: 'Tuteur légal',
    action: 'Génération code transfert', module: 'RGPD Transfert', moduleIcon: 'swap-horizontal',
    child: 'Lucas', date: 'Il y a 1 semaine', time: '16:00', device: 'iPhone 15', ip: '192.168.1.42',
    color: Colors.pink,
  },
  {
    id: '10', person: 'Marc Moreau', avatar: '👨', role: 'Tuteur légal',
    action: 'Export intégral JSON', module: 'RGPD Export', moduleIcon: 'download',
    child: 'Tous', date: 'Il y a 2 semaines', time: '21:30', device: 'MacBook Pro', ip: '86.245.12.8',
    color: Colors.orange,
  },
];

// ─── Component ────────────────────────────────────────────

export default function JournalAccesScreen() {
  const { theme } = useChildTheme();
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Tout' },
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week', label: 'Semaine' },
    { key: 'month', label: 'Mois' },
  ];

  const filteredLog = ACCESS_LOG.filter((entry) => {
    if (filter === 'today') return entry.date === "Aujourd'hui";
    if (filter === 'week') return ["Aujourd'hui", 'Hier', 'Il y a 2 jours', 'Il y a 3 jours', 'Il y a 5 jours'].includes(entry.date);
    if (filter === 'month') return true;
    return true;
  });

  const getActionColor = (action: string) => {
    if (action.includes('Modification')) return Colors.orange;
    if (action.includes('Export') || action.includes('Génération')) return Colors.violet;
    if (action.includes('Suppression')) return Colors.red;
    return Colors.cyan;
  };

  const getActionIcon = (action: string): keyof typeof Ionicons.glyphMap => {
    if (action.includes('Modification')) return 'create';
    if (action.includes('Export')) return 'download';
    if (action.includes('Génération')) return 'key';
    if (action.includes('Suppression')) return 'trash';
    return 'eye';
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} showsVerticalScrollIndicator={false}>
        {/* Info header */}
        <HStack
          className="items-center gap-3.5 m-5 mb-3 p-4 rounded-2xl border"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
        >
          <Box
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: Colors.cyan + '15' }}
          >
            <Ionicons name="list" size={24} color={Colors.cyan} />
          </Box>
          <Box className="flex-1">
            <Text className="text-base font-extrabold" style={{ color: theme.textPrimary }}>Journal de transparence</Text>
            <Text className="text-xs mt-0.5 leading-[17px]" style={{ color: theme.textMuted }}>
              Chaque consultation, modification et export est enregistré et visible ici.
            </Text>
          </Box>
        </HStack>

        {/* Stats summary */}
        <HStack className="gap-2.5 mx-5 mb-4">
          <VStack
            className="flex-1 items-center p-3.5 rounded-[14px] border"
            style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
          >
            <Text className="text-[22px] font-black" style={{ color: Colors.cyan }}>{ACCESS_LOG.length}</Text>
            <Text className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>Total accès</Text>
          </VStack>
          <VStack
            className="flex-1 items-center p-3.5 rounded-[14px] border"
            style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
          >
            <Text className="text-[22px] font-black" style={{ color: Colors.green }}>
              {ACCESS_LOG.filter((e) => e.date === "Aujourd'hui").length}
            </Text>
            <Text className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>Aujourd'hui</Text>
          </VStack>
          <VStack
            className="flex-1 items-center p-3.5 rounded-[14px] border"
            style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
          >
            <Text className="text-[22px] font-black" style={{ color: Colors.violet }}>
              {new Set(ACCESS_LOG.map((e) => e.person)).size}
            </Text>
            <Text className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>Personnes</Text>
          </VStack>
        </HStack>

        {/* Filters */}
        <HStack className="gap-2 mx-5 mb-4">
          {filters.map((f) => (
            <Pressable
              key={f.key}
              className="px-3.5 py-2 rounded-[20px] border"
              style={[
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
                filter === f.key && { backgroundColor: Colors.cyan + '20', borderColor: Colors.cyan },
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                className="text-[13px] font-semibold"
                style={{ color: filter === f.key ? Colors.cyan : theme.textMuted }}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </HStack>

        {/* Log entries */}
        {filteredLog.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const actionColor = getActionColor(entry.action);
          const actionIcon = getActionIcon(entry.action);

          return (
            <Pressable
              key={entry.id}
              className="mx-5 mb-2.5 p-3.5 rounded-2xl border"
              style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
              onPress={() => setExpandedId(isExpanded ? null : entry.id)}
            >
              {/* Top row */}
              <HStack className="items-center gap-3 mb-2.5">
                <Box
                  className="w-[38px] h-[38px] rounded-full items-center justify-center border-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: actionColor }}
                >
                  <Text className="text-lg">{entry.avatar}</Text>
                </Box>
                <Box className="flex-1">
                  <HStack className="justify-between items-center">
                    <Text className="text-sm font-bold" style={{ color: theme.textPrimary }}>{entry.person}</Text>
                    <Text className="text-xs" style={{ color: theme.textMuted }}>{entry.time}</Text>
                  </HStack>
                  <Text className="text-[11px]" style={{ color: theme.textMuted }}>{entry.role}</Text>
                </Box>
              </HStack>

              {/* Action row */}
              <HStack className="gap-2 mb-2 flex-wrap">
                <HStack
                  className="items-center gap-[5px] px-2.5 py-1 rounded-[10px]"
                  style={{ backgroundColor: actionColor + '15' }}
                >
                  <Ionicons name={actionIcon} size={14} color={actionColor} />
                  <Text className="text-xs font-semibold" style={{ color: actionColor }}>{entry.action}</Text>
                </HStack>
                <HStack
                  className="items-center gap-[5px] px-2.5 py-1 rounded-[10px]"
                  style={{ backgroundColor: entry.color + '15' }}
                >
                  <Ionicons name={entry.moduleIcon} size={12} color={entry.color} />
                  <Text className="text-xs font-semibold" style={{ color: entry.color }}>{entry.module}</Text>
                </HStack>
              </HStack>

              {/* Date & child */}
              <HStack className="gap-4">
                <Text className="text-[11px]" style={{ color: theme.textMuted }}>
                  📅 {entry.date}
                </Text>
                <Text className="text-[11px]" style={{ color: theme.textMuted }}>
                  👤 {entry.child}
                </Text>
              </HStack>

              {/* Expanded details */}
              {isExpanded && (
                <VStack className="mt-2.5 pt-2.5 border-t gap-1.5" style={{ borderTopColor: theme.cardBorder }}>
                  {entry.device && (
                    <HStack className="items-center gap-2">
                      <Ionicons name="phone-portrait" size={14} color={Colors.gray} />
                      <Text className="text-xs" style={{ color: theme.textMuted }}>Appareil : {entry.device}</Text>
                    </HStack>
                  )}
                  {entry.ip && (
                    <HStack className="items-center gap-2">
                      <Ionicons name="globe" size={14} color={Colors.gray} />
                      <Text className="text-xs" style={{ color: theme.textMuted }}>IP : {entry.ip}</Text>
                    </HStack>
                  )}
                  <HStack className="items-center gap-2">
                    <Ionicons name="time" size={14} color={Colors.gray} />
                    <Text className="text-xs" style={{ color: theme.textMuted }}>Horodatage : {entry.date} à {entry.time}</Text>
                  </HStack>
                </VStack>
              )}
            </Pressable>
          );
        })}

        {filteredLog.length === 0 && (
          <VStack className="items-center p-10 gap-2.5">
            <Text className="text-[40px]">📭</Text>
            <Text className="text-sm" style={{ color: theme.textMuted }}>Aucun accès pour cette période</Text>
          </VStack>
        )}

        {/* RGPD notice */}
        <HStack
          className="items-start gap-2.5 mx-5 mt-2 p-3.5 rounded-[14px] border"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder }}
        >
          <Ionicons name="information-circle" size={16} color={Colors.cyan} />
          <Text className="flex-1 text-[11px] leading-4" style={{ color: theme.textMuted }}>
            Conformément au RGPD (art. 15), vous avez le droit d'accéder à l'intégralité des données de consultation. Ce journal est conservé 12 mois.
          </Text>
        </HStack>

        <Box className="h-10" />
      </ScrollView>
    </Animated.View>
  );
}
