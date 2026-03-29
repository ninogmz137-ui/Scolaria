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

const DAYS = ['L', 'M', 'M', 'J', 'V'];

const getMoodEmoji = (s: number) => s >= 8 ? '😊' : s >= 6 ? '🙂' : s >= 4 ? '😐' : '😟';
const getMoodColor = (s: number) => s >= 7 ? Colors.green : s >= 5 ? Colors.orange : Colors.red;
const getTrendIcon = (t: string): keyof typeof Ionicons.glyphMap =>
  t === 'up' ? 'trending-up' : t === 'down' ? 'trending-down' : 'remove';
const getTrendColor = (t: string) => t === 'up' ? Colors.green : t === 'down' ? Colors.red : Colors.textMuted;

// ─── Distribution helpers ─────────────────────────────────

const joyDistributionFn = (list: Student[]) => {
  const high = list.filter(s => s.joyScore >= 7).length;
  const mid  = list.filter(s => s.joyScore >= 4 && s.joyScore < 7).length;
  const low  = list.filter(s => s.joyScore < 4).length;
  return { high, mid, low };
};

// ─── Component ────────────────────────────────────────────

type SortKey = 'score' | 'trend' | 'alpha';
type ViewMode = 'list' | 'grid';

export default function TeacherDashboardScreen({ navigation }: { navigation: any }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortKey>('score');
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

  const dist = joyDistributionFn(students);
  const classAvg = students.length > 0 ? (students.reduce((a, s) => a + s.joyScore, 0) / students.length).toFixed(1) : '0';
  const alertCount = students.filter(s => s.alert).length;
  const totalMessages = students.reduce((a, s) => a + s.unreadMessages, 0);

  // Sort students
  const sorted = [...students].sort((a, b) => {
    if (sortBy === 'score') return a.joyScore - b.joyScore; // lowest first = need attention
    if (sortBy === 'trend') {
      const order = { down: 0, stable: 1, up: 2 };
      return order[a.trend] - order[b.trend];
    }
    return a.code.localeCompare(b.code);
  });

  const displayed = showAll ? sorted : sorted.slice(0, 10);

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#E8EDF5', opacity: fadeAnim }}>
      <ScrollView showsVerticalScrollIndicator={false}>
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

          {/* Stats — glass-style cards */}
          <HStack className="gap-2.5 px-5">
            <VStack className="flex-1 items-center p-3 rounded-[14px]" style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
              <Text className="text-xl mb-1">{getMoodEmoji(parseFloat(classAvg))}</Text>
              <Text className="text-[22px] font-black" style={{ color: getMoodColor(parseFloat(classAvg)) }}>{classAvg}</Text>
              <Text className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.9)' }}>Moy. classe</Text>
            </VStack>
            <VStack className="flex-1 items-center p-3 rounded-[14px]" style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
              <Text className="text-xl mb-1">😊</Text>
              <Text className="text-[22px] font-black" style={{ color: Colors.green }}>{dist.high}</Text>
              <Text className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.9)' }}>Épanouis</Text>
            </VStack>
            <VStack className="flex-1 items-center p-3 rounded-[14px]" style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
              <Text className="text-xl mb-1">😐</Text>
              <Text className="text-[22px] font-black" style={{ color: Colors.orange }}>{dist.mid}</Text>
              <Text className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.9)' }}>Modérés</Text>
            </VStack>
            <VStack className="flex-1 items-center p-3 rounded-[14px]" style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
              <Text className="text-xl mb-1">😟</Text>
              <Text className="text-[22px] font-black" style={{ color: Colors.red }}>{dist.low}</Text>
              <Text className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.9)' }}>À surveiller</Text>
            </VStack>
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
              <Pressable key={a.label} onPress={a.onPress} style={{ width: (width - 50) / 2, backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: `rgba(${TEACHER_ORANGE_RGB},0.15)`, ...CARD_SHADOW }}>
                <Box className="w-11 h-11 rounded-[14px] justify-center items-center mb-2.5" style={{ backgroundColor: a.color + '20' }}>
                  <Ionicons name={a.icon} size={24} color={a.color} />
                </Box>
                <Text className="text-sm font-bold" style={{ color: Colors.textPrimary }}>{a.label}</Text>
                <Text className="text-[11px] mt-1" style={{ color: Colors.textSecondary }}>{a.badge}</Text>
              </Pressable>
            ))}
          </HStack>

          {/* ─── Alerts ─── */}
          {alertCount > 0 && (
            <>
              <HStack className="items-center mt-6 mb-3">
                <Box style={{ width: 4, height: 20, backgroundColor: TEACHER_ORANGE, borderRadius: 2, marginRight: 8 }} />
                <Text className="text-[17px] font-extrabold" style={{ color: Colors.textPrimary }}>⚠️ Alertes bien-être ({alertCount})</Text>
              </HStack>
              <Box className="rounded-2xl p-1" style={{ backgroundColor: Colors.red + '08', borderWidth: 1.5, borderColor: Colors.red + '30', ...CARD_SHADOW }}>
                {students.filter(s => s.alert).map(student => (
                  <HStack key={student.id} className="items-center p-3 gap-3">
                    <Box className="w-10 h-10 rounded-full justify-center items-center" style={{ backgroundColor: Colors.red + '10', borderWidth: 2, borderColor: Colors.red }}>
                      <Text className="text-xl">{student.avatar}</Text>
                    </Box>
                    <VStack className="flex-1">
                      <Text className="text-sm font-bold mb-1" style={{ color: Colors.textPrimary }}>{student.code}</Text>
                      <HStack className="gap-1.5 items-end">
                        {student.weekTrend.map((v, i) => (
                          <VStack key={i} className="items-center gap-0.5">
                            <Box className="w-2 rounded-sm" style={{ height: v * 3, backgroundColor: getMoodColor(v), minHeight: 3 }} />
                            <Text className="text-[8px]" style={{ color: Colors.textMuted }}>{DAYS[i]}</Text>
                          </VStack>
                        ))}
                      </HStack>
                    </VStack>
                    <VStack className="items-center">
                      <Text className="text-base font-black mb-0.5" style={{ color: getMoodColor(student.joyScore) }}>
                        {student.joyScore}/10
                      </Text>
                      <Ionicons name={getTrendIcon(student.trend)} size={16} color={getTrendColor(student.trend)} />
                    </VStack>
                  </HStack>
                ))}
              </Box>
            </>
          )}

          {/* ─── Weekly class trend ─── */}
          <HStack className="items-center mt-6 mb-3">
            <Box style={{ width: 4, height: 20, backgroundColor: TEACHER_ORANGE, borderRadius: 2, marginRight: 8 }} />
            <Text className="text-[17px] font-extrabold" style={{ color: Colors.textPrimary }}>Tendance de la semaine</Text>
          </HStack>
          <HStack className="justify-around rounded-2xl p-4" style={{ backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, ...CARD_SHADOW }}>
            {DAYS.map((day, di) => {
              const dayAvg = students.length > 0 ? students.reduce((a, s) => a + s.weekTrend[di], 0) / students.length : 0;
              const h = dayAvg * 5;
              return (
                <VStack key={di} className="items-center gap-1">
                  <Text className="text-xs font-bold" style={{ color: getMoodColor(dayAvg) }}>{dayAvg.toFixed(1)}</Text>
                  <Box className="w-6 h-10 rounded-md justify-end overflow-hidden" style={{ backgroundColor: Colors.cardBorder }}>
                    <Box className="w-full rounded-md" style={{ height: h, backgroundColor: getMoodColor(dayAvg) }} />
                  </Box>
                  <Text className="text-base">{getMoodEmoji(dayAvg)}</Text>
                  <Text className="text-[11px] font-bold" style={{ color: Colors.textMuted }}>{day}</Text>
                </VStack>
              );
            })}
          </HStack>

          {/* ─── Class list controls ─── */}
          <HStack className="justify-between items-center">
            <HStack className="items-center mt-6 mb-3">
              <Box style={{ width: 4, height: 20, backgroundColor: TEACHER_ORANGE, borderRadius: 2, marginRight: 8 }} />
              <Text className="text-[17px] font-extrabold" style={{ color: Colors.textPrimary }}>Vue classe</Text>
            </HStack>
            <HStack className="items-center gap-1.5">
              {(['score', 'trend', 'alpha'] as SortKey[]).map(k => (
                <Pressable
                  key={k}
                  onPress={() => setSortBy(k)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1,
                    borderColor: sortBy === k ? TEACHER_ORANGE : Colors.cardBorder,
                    backgroundColor: sortBy === k ? TEACHER_ORANGE + '15' : 'transparent',
                  }}
                >
                  <Text className="text-[11px] font-semibold" style={{ color: sortBy === k ? TEACHER_ORANGE : Colors.textSecondary }}>
                    {k === 'score' ? 'Score' : k === 'trend' ? 'Tendance' : 'A-Z'}
                  </Text>
                </Pressable>
              ))}
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
                  <Box className="w-[34px] h-[34px] rounded-[17px] justify-center items-center" style={{ backgroundColor: '#E8EDF5', borderWidth: 1.5, borderColor: getMoodColor(student.joyScore) + '60' }}>
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
                    {/* Mini sparkline */}
                    <HStack className="items-end gap-[3px] mt-1 relative">
                      {student.weekTrend.map((v, di) => (
                        <Box key={di} className="w-1.5 rounded-sm" style={{ height: v * 2.5, backgroundColor: getMoodColor(v), minHeight: 2 }} />
                      ))}
                      <Text className="absolute -bottom-2.5 left-0 text-[7px]" style={{ color: Colors.textMuted, letterSpacing: 4.5 }}>L M M J V</Text>
                    </HStack>
                  </VStack>

                  {/* Score + trend */}
                  <VStack className="items-center gap-0.5 w-7">
                    <Text className="text-base font-black" style={{ color: getMoodColor(student.joyScore) }}>
                      {student.joyScore}
                    </Text>
                    <Ionicons name={getTrendIcon(student.trend)} size={14} color={getTrendColor(student.trend)} />
                  </VStack>

                  {/* Mood bar */}
                  <Box className="w-[50px] h-[5px] rounded-[3px] overflow-hidden" style={{ backgroundColor: Colors.cardBorder }}>
                    <Box className="h-full rounded-[3px]" style={{ width: `${student.joyScore * 10}%`, backgroundColor: getMoodColor(student.joyScore) }} />
                  </Box>
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
                <VStack key={student.id} className="items-center p-2.5 rounded-[14px] relative" style={{ width: (width - 56) / 4, backgroundColor: Colors.card, borderWidth: 1, borderColor: getMoodColor(student.joyScore) + '30' }}>
                  <Text className="text-[22px] mb-0.5">{student.avatar}</Text>
                  <Text className="text-[10px] font-bold" style={{ color: Colors.textSecondary }}>{student.code.replace('Élève ', '#')}</Text>
                  <Text className="text-[13px] font-extrabold mt-0.5" style={{ color: getMoodColor(student.joyScore) }}>
                    {getMoodEmoji(student.joyScore)} {student.joyScore}
                  </Text>
                  <Ionicons name={getTrendIcon(student.trend)} size={12} color={getTrendColor(student.trend)} />
                  {student.alert && (
                    <Box className="absolute top-1 right-1 w-4 h-4 rounded-full justify-center items-center" style={{ backgroundColor: Colors.red + '20' }}>
                      <Ionicons name="warning" size={10} color={Colors.red} />
                    </Box>
                  )}
                </VStack>
              ))}
            </HStack>
          )}

          {/* ─── Anonymisation notice ─── */}
          <HStack className="items-start gap-2 mt-4 p-3 rounded-xl" style={{ backgroundColor: Colors.cyan + '08' }}>
            <Ionicons name="eye-off" size={14} color={Colors.cyan} />
            <Text className="flex-1 text-[11px] leading-4" style={{ color: Colors.textSecondary }}>
              Données anonymisées — les Scores de Joie sont présentés sans identification nominative conformément au RGPD.
            </Text>
          </HStack>

          <Box className="h-10" />
        </VStack>
      </ScrollView>
    </Animated.View>
  );
}
