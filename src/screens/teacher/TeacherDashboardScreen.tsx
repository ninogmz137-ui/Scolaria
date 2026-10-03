import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomBarScrollPadding } from '../../components/navigation/BottomBar';
import { getClassWellbeing, type StudentWellbeing } from '../../services/teacherService';

const { width } = Dimensions.get('window');
const TEACHER_ORANGE = '#FF8C42';

// ─── Helpers ──────────────────────────────────────────────

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

const TEACHER_ORANGE_RGB = hexToRgb(TEACHER_ORANGE);

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
});

// ─── Mock data — 26 élèves anonymisés ───────────────────

interface Student {
  id: string;
  code: string;           // anonymised label
  avatar: string;
  joyScore: number;       // current score /10
  weekTrend: number[];    // L M M J V scores
  trend: 'up' | 'down' | 'stable';
  alert: boolean;
  unreadMessages: number;
}

const STUDENTS: Student[] = [
  { id: '1',  code: 'Élève 01', avatar: '👦', joyScore: 8, weekTrend: [7,7,8,8,8],   trend: 'up',     alert: false, unreadMessages: 0 },
  { id: '2',  code: 'Élève 02', avatar: '👧', joyScore: 4, weekTrend: [6,5,5,4,4],   trend: 'down',   alert: true,  unreadMessages: 2 },
  { id: '3',  code: 'Élève 03', avatar: '👦', joyScore: 7, weekTrend: [7,7,7,7,7],   trend: 'stable', alert: false, unreadMessages: 0 },
  { id: '4',  code: 'Élève 04', avatar: '👧', joyScore: 9, weekTrend: [8,8,9,9,9],   trend: 'up',     alert: false, unreadMessages: 1 },
  { id: '5',  code: 'Élève 05', avatar: '👦', joyScore: 3, weekTrend: [5,4,4,3,3],   trend: 'down',   alert: true,  unreadMessages: 0 },
  { id: '6',  code: 'Élève 06', avatar: '👧', joyScore: 6, weekTrend: [6,6,6,6,6],   trend: 'stable', alert: false, unreadMessages: 0 },
  { id: '7',  code: 'Élève 07', avatar: '👦', joyScore: 7, weekTrend: [6,6,7,7,7],   trend: 'up',     alert: false, unreadMessages: 3 },
  { id: '8',  code: 'Élève 08', avatar: '👧', joyScore: 8, weekTrend: [8,8,8,8,8],   trend: 'stable', alert: false, unreadMessages: 0 },
  { id: '9',  code: 'Élève 09', avatar: '👦', joyScore: 5, weekTrend: [6,6,5,5,5],   trend: 'down',   alert: false, unreadMessages: 1 },
  { id: '10', code: 'Élève 10', avatar: '👧', joyScore: 9, weekTrend: [9,9,9,9,9],   trend: 'stable', alert: false, unreadMessages: 0 },
  { id: '11', code: 'Élève 11', avatar: '👦', joyScore: 6, weekTrend: [5,5,6,6,6],   trend: 'up',     alert: false, unreadMessages: 0 },
  { id: '12', code: 'Élève 12', avatar: '👧', joyScore: 7, weekTrend: [7,7,7,7,7],   trend: 'stable', alert: false, unreadMessages: 0 },
  { id: '13', code: 'Élève 13', avatar: '👦', joyScore: 4, weekTrend: [6,5,5,4,4],   trend: 'down',   alert: true,  unreadMessages: 0 },
  { id: '14', code: 'Élève 14', avatar: '👧', joyScore: 8, weekTrend: [7,8,8,8,8],   trend: 'up',     alert: false, unreadMessages: 0 },
  { id: '15', code: 'Élève 15', avatar: '👦', joyScore: 7, weekTrend: [7,7,7,7,7],   trend: 'stable', alert: false, unreadMessages: 0 },
  { id: '16', code: 'Élève 16', avatar: '👧', joyScore: 6, weekTrend: [6,6,6,6,6],   trend: 'stable', alert: false, unreadMessages: 2 },
  { id: '17', code: 'Élève 17', avatar: '👦', joyScore: 8, weekTrend: [7,7,8,8,8],   trend: 'up',     alert: false, unreadMessages: 0 },
  { id: '18', code: 'Élève 18', avatar: '👧', joyScore: 5, weekTrend: [7,6,6,5,5],   trend: 'down',   alert: false, unreadMessages: 0 },
  { id: '19', code: 'Élève 19', avatar: '👦', joyScore: 9, weekTrend: [8,9,9,9,9],   trend: 'up',     alert: false, unreadMessages: 0 },
  { id: '20', code: 'Élève 20', avatar: '👧', joyScore: 7, weekTrend: [7,7,7,7,7],   trend: 'stable', alert: false, unreadMessages: 1 },
  { id: '21', code: 'Élève 21', avatar: '👦', joyScore: 6, weekTrend: [6,6,6,6,6],   trend: 'stable', alert: false, unreadMessages: 0 },
  { id: '22', code: 'Élève 22', avatar: '👧', joyScore: 8, weekTrend: [7,7,8,8,8],   trend: 'up',     alert: false, unreadMessages: 0 },
  { id: '23', code: 'Élève 23', avatar: '👦', joyScore: 3, weekTrend: [5,4,4,3,3],   trend: 'down',   alert: true,  unreadMessages: 0 },
  { id: '24', code: 'Élève 24', avatar: '👧', joyScore: 7, weekTrend: [7,7,7,7,7],   trend: 'stable', alert: false, unreadMessages: 0 },
  { id: '25', code: 'Élève 25', avatar: '👦', joyScore: 8, weekTrend: [8,8,8,8,8],   trend: 'stable', alert: false, unreadMessages: 0 },
  { id: '26', code: 'Élève 26', avatar: '👧', joyScore: 6, weekTrend: [5,5,6,6,6],   trend: 'up',     alert: false, unreadMessages: 0 },
];

const CLASS_INFO = {
  name: 'CM2-B',
  school: 'École Voltaire',
  students: 26,
  teacher: 'Mme Dupont',
};

/**
 * Score de Joie (CLAUDE.md) : tendance en mots uniquement — jamais de chiffre, jamais de vert/rouge,
 * aucune alerte en V1 (les alertes viendront avec Aria stade 3, Phase 3).
 */
const TENDANCE_MOT: Record<Student['trend'], string> = {
  up: 'plutôt en hausse',
  down: 'plutôt en baisse',
  stable: 'stable',
};
const getTrendIcon = (t: string): keyof typeof Ionicons.glyphMap =>
  t === 'up' ? 'trending-up' : t === 'down' ? 'trending-down' : 'remove';

/** Tendance de la classe : majorité des tendances individuelles (sans chiffre affiché). */
const tendanceClasse = (list: Student[]): Student['trend'] => {
  const up = list.filter((s) => s.trend === 'up').length;
  const down = list.filter((s) => s.trend === 'down').length;
  if (up - down > list.length * 0.2) return 'up';
  if (down - up > list.length * 0.2) return 'down';
  return 'stable';
};

// ─── Component ────────────────────────────────────────────

type ViewMode = 'list' | 'grid';

export default function TeacherDashboardScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showAll, setShowAll] = useState(false);
  const [students, setStudents] = useState<Student[]>(STUDENTS);

  const loadWellbeing = useCallback(async () => {
    const data = await getClassWellbeing(CLASS_INFO.name);
    if (data.length > 0) {
      setStudents(data);
    }
  }, []);

  useEffect(() => {
    loadWellbeing();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const classe = tendanceClasse(students);
  const totalMessages = students.reduce((a, s) => a + s.unreadMessages, 0);

  // Ordre alphabétique uniquement : aucun classement par Score de Joie (pas de palmarès, pas d'alerte).
  const sorted = [...students].sort((a, b) => a.code.localeCompare(b.code));

  const displayed = showAll ? sorted : sorted.slice(0, 10);

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#E8EDF5', opacity: fadeAnim }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: getBottomBarScrollPadding(insets.bottom) }}
      >
        {/* ─── Header gradient ─── */}
        <LinearGradient
          colors={['#0B1628', TEACHER_ORANGE + 'DD']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingTop: 8, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
        >
          <HStack className="justify-between items-start px-5 mb-5">
            <VStack>
              <Text className="text-[22px] font-black" style={{ color: Colors.white }}>Bonjour, {CLASS_INFO.teacher}</Text>
              <Text className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>{CLASS_INFO.name} · {CLASS_INFO.school}</Text>
            </VStack>
            <HStack className="items-center gap-1.5 rounded-[14px] px-3 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Ionicons name="people" size={16} color={Colors.white} />
              <Text className="text-sm font-extrabold" style={{ color: Colors.white }}>{CLASS_INFO.students}</Text>
            </HStack>
          </HStack>

          {/* Score de Joie de la classe : une tendance en mots, jamais de chiffre */}
          <HStack className="items-center gap-2 mx-5 p-3 rounded-[14px]" style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
            <Ionicons name={getTrendIcon(classe)} size={18} color={Colors.white} />
            <Text className="text-sm font-semibold" style={{ color: Colors.white }}>
              💛 Tendance de la classe sur 5 jours : {TENDANCE_MOT[classe]}
            </Text>
          </HStack>
        </LinearGradient>

        <VStack className="px-5">
          {/* ─── Quick actions ─── */}
          <HStack className="items-center mt-6 mb-3">
            <Box style={{ width: 4, height: 20, backgroundColor: TEACHER_ORANGE, borderRadius: 2, marginRight: 8 }} />
            <Text className="text-[17px] font-extrabold" style={{ color: Colors.textPrimary }}>Actions rapides</Text>
          </HStack>
          <HStack className="flex-wrap gap-2.5">
            {[
              { label: 'Appréciations', icon: 'create' as const, color: Colors.violet, badge: '3 en attente',
                onPress: () => navigation.getParent()?.navigate('Appréciations') },
              { label: 'Météo', icon: 'partly-sunny' as const, color: Colors.cyan, badge: 'Voir le suivi',
                onPress: () => navigation.getParent()?.navigate('Classe') },
              { label: 'Vie de classe', icon: 'camera' as const, color: Colors.pink, badge: '2 posts',
                onPress: () => navigation.getParent()?.navigate('Classe', { screen: 'VieDeClasse' }) },
              { label: 'Absences', icon: 'medical' as const, color: '#F87171', badge: 'Voir les absences',
                onPress: () => navigation.navigate('AbsencesEnseignant') },
              { label: 'Messagerie', icon: 'chatbubbles' as const, color: TEACHER_ORANGE,
                badge: totalMessages > 0 ? `${totalMessages} non lu${totalMessages > 1 ? 's' : ''}` : 'Tout lu',
                onPress: () => navigation.getParent()?.navigate('Messages') },
            ].map(a => (
              <Pressable key={a.label} onPress={a.onPress} style={{ width: (width - 50) / 2, backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)', ...CARD_SHADOW }}>
                <Box className="w-11 h-11 rounded-[14px] justify-center items-center mb-2.5" style={{ backgroundColor: a.color + '20' }}>
                  <Ionicons name={a.icon} size={24} color={a.color} />
                </Box>
                <Text className="text-sm font-bold" style={{ color: Colors.textPrimary }}>{a.label}</Text>
                <Text className="text-[11px] mt-1" style={{ color: Colors.textSecondary }}>{a.badge}</Text>
              </Pressable>
            ))}
          </HStack>

          {/* ─── Class list controls ─── */}
          <HStack className="justify-between items-center">
            <HStack className="items-center mt-6 mb-3">
              <Box style={{ width: 4, height: 20, backgroundColor: TEACHER_ORANGE, borderRadius: 2, marginRight: 8 }} />
              <Text className="text-[17px] font-extrabold" style={{ color: Colors.textPrimary }}>Vue classe</Text>
            </HStack>
            <HStack className="items-center gap-1.5">
              <Pressable onPress={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}>
                <Ionicons name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} size={20} color={Colors.textSecondary} />
              </Pressable>
            </HStack>
          </HStack>

          {/* ─── Student list ─── */}
          {viewMode === 'list' ? (
            <Box className="rounded-2xl overflow-hidden" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, ...CARD_SHADOW }}>
              {displayed.map((student, i) => (
                <HStack
                  key={student.id}
                  className="items-center p-3 gap-2.5"
                  style={i < displayed.length - 1 ? { borderBottomWidth: 1, borderBottomColor: Colors.cardBorder } : undefined}
                >
                  {/* Avatar */}
                  <Box className="w-[34px] h-[34px] rounded-[17px] justify-center items-center" style={{ backgroundColor: '#E8EDF5' }}>
                    <Text className="text-base">{student.avatar}</Text>
                  </Box>

                  {/* Code + mini-trend */}
                  <VStack className="flex-1">
                    <HStack className="items-center gap-1.5">
                      <Text className="text-[13px] font-semibold" style={{ color: Colors.textPrimary }}>{student.code}</Text>
                      {student.unreadMessages > 0 && (
                        <Box className="w-4 h-4 rounded-full justify-center items-center" style={{ backgroundColor: TEACHER_ORANGE }}>
                          <Text className="text-[9px] font-extrabold" style={{ color: Colors.white }}>{student.unreadMessages}</Text>
                        </Box>
                      )}
                    </HStack>
                  </VStack>

                  {/* Tendance en mots, couleur neutre */}
                  <HStack className="items-center gap-1">
                    <Ionicons name={getTrendIcon(student.trend)} size={14} color={Colors.textMuted} />
                    <Text className="text-[12px]" style={{ color: Colors.textSecondary }}>{TENDANCE_MOT[student.trend]}</Text>
                  </HStack>
                </HStack>
              ))}

              {!showAll && (
                <Pressable className="p-3.5 items-center" style={{ borderTopWidth: 1, borderTopColor: Colors.cardBorder }} onPress={() => setShowAll(true)}>
                  <Text className="text-[13px] font-semibold" style={{ color: TEACHER_ORANGE }}>Afficher les {CLASS_INFO.students} élèves →</Text>
                </Pressable>
              )}
              {showAll && sorted.length > 10 && (
                <Pressable className="p-3.5 items-center" style={{ borderTopWidth: 1, borderTopColor: Colors.cardBorder }} onPress={() => setShowAll(false)}>
                  <Text className="text-[13px] font-semibold" style={{ color: TEACHER_ORANGE }}>Réduire la liste ↑</Text>
                </Pressable>
              )}
            </Box>
          ) : (
            /* ─── Grid view ─── */
            <HStack className="flex-wrap gap-2">
              {sorted.map(student => (
                <VStack key={student.id} className="items-center p-2.5 rounded-[14px] relative" style={{ width: (width - 56) / 4, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder }}>
                  <Text className="text-[22px] mb-0.5">{student.avatar}</Text>
                  <Text className="text-[10px] font-bold" style={{ color: Colors.textSecondary }}>{student.code.replace('Élève ', '#')}</Text>
                  <Ionicons name={getTrendIcon(student.trend)} size={12} color={Colors.textMuted} />
                  <Text className="text-[10px] text-center" style={{ color: Colors.textSecondary }}>{TENDANCE_MOT[student.trend]}</Text>
                </VStack>
              ))}
            </HStack>
          )}

          {/* ─── Anonymisation notice ─── */}
          <HStack className="items-start gap-2 mt-4 p-3 rounded-xl" style={{ backgroundColor: Colors.cyan + '08' }}>
            <Ionicons name="eye-off" size={14} color={Colors.cyan} />
            <Text className="flex-1 text-[11px] leading-4" style={{ color: Colors.textSecondary }}>
              Données anonymisées. Le Score de Joie est une tendance, jamais une note : aucun chiffre, aucune alerte.
            </Text>
          </HStack>

          <Box className="h-10" />
        </VStack>
      </ScrollView>
    </Animated.View>
  );
}
