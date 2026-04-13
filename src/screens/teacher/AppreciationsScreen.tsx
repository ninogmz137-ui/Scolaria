/**
 * Générateur d'appréciations — L'enseignant coche 3 compétences,
 * Aria rédige 2 variantes en 2 secondes. Le professeur choisit,
 * modifie et valide.
 */

import { useState, useRef } from 'react';
import { FontFamily } from '../../hooks/useSolariaFonts';
import {
  ScrollView,
  TextInput,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { Box, Text, Pressable, HStack, VStack, Spinner } from '../../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, SCREEN_BACKGROUND } from '../../constants/colors';
import { TAB_BAR_SCROLL_PADDING } from '../../components/FloatingTabBar';
import { saveAppreciation } from '../../services/teacherService';

const TEACHER_ORANGE = '#FF8C42';

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
});

// ─── Compétences disponibles ─────────────────────────────

interface Competence {
  id: string;
  label: string;
  emoji: string;
  category: 'savoir' | 'savoir-faire' | 'savoir-etre';
}

const COMPETENCES: Competence[] = [
  // Savoirs
  { id: 'maitrise', label: 'Maîtrise des connaissances', emoji: '📚', category: 'savoir' },
  { id: 'expression_ecrite', label: 'Expression écrite', emoji: '✍️', category: 'savoir' },
  { id: 'expression_orale', label: 'Expression orale', emoji: '🗣️', category: 'savoir' },
  { id: 'calcul', label: 'Raisonnement logique', emoji: '🧠', category: 'savoir' },
  { id: 'culture', label: 'Culture générale', emoji: '🌍', category: 'savoir' },
  // Savoir-faire
  { id: 'methode', label: 'Méthode de travail', emoji: '📋', category: 'savoir-faire' },
  { id: 'autonomie', label: 'Autonomie', emoji: '🚀', category: 'savoir-faire' },
  { id: 'recherche', label: 'Recherche & curiosité', emoji: '🔍', category: 'savoir-faire' },
  { id: 'numerique', label: 'Compétences numériques', emoji: '💻', category: 'savoir-faire' },
  { id: 'creativite', label: 'Créativité', emoji: '🎨', category: 'savoir-faire' },
  // Savoir-être
  { id: 'participation', label: 'Participation en classe', emoji: '🙋', category: 'savoir-etre' },
  { id: 'respect', label: 'Respect des règles', emoji: '🤝', category: 'savoir-etre' },
  { id: 'collaboration', label: 'Travail en groupe', emoji: '👥', category: 'savoir-etre' },
  { id: 'effort', label: 'Efforts & persévérance', emoji: '💪', category: 'savoir-etre' },
  { id: 'comportement', label: 'Comportement général', emoji: '⭐', category: 'savoir-etre' },
];

const CATEGORY_LABELS = {
  savoir: 'Savoirs',
  'savoir-faire': 'Savoir-faire',
  'savoir-etre': 'Savoir-être',
};

// ─── Niveaux d'appréciation ──────────────────────────────

type Level = 'excellent' | 'bien' | 'assez_bien' | 'insuffisant';

const LEVELS: { key: Level; label: string; emoji: string; color: string }[] = [
  { key: 'excellent', label: 'Excellent', emoji: '🌟', color: Colors.green },
  { key: 'bien', label: 'Bien', emoji: '👍', color: Colors.cyan },
  { key: 'assez_bien', label: 'Assez bien', emoji: '📈', color: Colors.orange },
  { key: 'insuffisant', label: 'Insuffisant', emoji: '⚠️', color: Colors.red },
];

// ─── Élèves mock ─────────────────────────────────────────

const STUDENTS = [
  { id: '1', name: 'Lucas M.', avatar: '👦' },
  { id: '2', name: 'Emma D.', avatar: '👧' },
  { id: '3', name: 'Théo B.', avatar: '🧒' },
  { id: '4', name: 'Léa R.', avatar: '👧' },
  { id: '5', name: 'Hugo L.', avatar: '👦' },
  { id: '6', name: 'Chloé P.', avatar: '🧒' },
];

// ─── Génération d'appréciation (mock Aria) ───────────────

function generateAppreciation(
  studentName: string,
  level: Level,
  competences: string[],
  comment: string,
): { variantA: string; variantB: string } {
  const compLabels = competences
    .map((id) => COMPETENCES.find((c) => c.id === id)?.label || '')
    .filter(Boolean);

  const templatesA: Record<Level, string> = {
    excellent: `${studentName} fait preuve d'une excellente maîtrise en ${compLabels.slice(0, 2).join(' et ')}. ${compLabels[2] ? `Sa ${compLabels[2].toLowerCase()} est également remarquable. ` : ''}Un élève moteur pour la classe, dont l'investissement et la rigueur sont exemplaires. Continuez ainsi !`,
    bien: `${studentName} réalise un bon trimestre. ${compLabels[0] ? `La ${compLabels[0].toLowerCase()} est satisfaisante` : 'Les résultats sont satisfaisants'}${compLabels[1] ? ` et la ${compLabels[1].toLowerCase()} est en bonne voie` : ''}. ${compLabels[2] ? `Un effort supplémentaire en ${compLabels[2].toLowerCase()} permettrait d'atteindre l'excellence. ` : ''}Bon travail, à poursuivre.`,
    assez_bien: `${studentName} obtient des résultats corrects mais irréguliers. ${compLabels[0] ? `En ${compLabels[0].toLowerCase()}, les bases sont acquises` : 'Les bases sont acquises'} mais ${compLabels[1] ? `la ${compLabels[1].toLowerCase()} demande plus d'attention` : 'un effort supplémentaire est nécessaire'}. ${compLabels[2] ? `La ${compLabels[2].toLowerCase()} doit être renforcée. ` : ''}Un travail plus régulier est attendu pour le prochain trimestre.`,
    insuffisant: `${studentName} rencontre des difficultés significatives ce trimestre. ${compLabels[0] ? `La ${compLabels[0].toLowerCase()} est fragile` : 'Les fondamentaux sont fragiles'}${compLabels[1] ? ` et la ${compLabels[1].toLowerCase()} nécessite un soutien renforcé` : ''}. ${compLabels[2] ? `Un accompagnement en ${compLabels[2].toLowerCase()} est recommandé. ` : ''}Un plan d'aide sera proposé. La famille est invitée à prendre contact.`,
  };

  const templatesB: Record<Level, string> = {
    excellent: `Trimestre remarquable pour ${studentName}. Les résultats en ${compLabels[0].toLowerCase()} témoignent d'un travail régulier et approfondi. ${compLabels[1] ? `La ${compLabels[1].toLowerCase()} est un vrai point fort. ` : ''}${compLabels[2] ? `En ${compLabels[2].toLowerCase()}, ${studentName} se distingue par sa qualité de travail. ` : ''}Félicitations pour cet engagement constant, c'est un plaisir de l'avoir en classe.`,
    bien: `Bon ensemble pour ${studentName}. ${compLabels.slice(0, 2).map((l) => l.toLowerCase()).join(' et ')} : des acquis solides qui montrent un réel investissement. ${compLabels[2] ? `En ${compLabels[2].toLowerCase()}, quelques progrès encore possibles. ` : ''}Pour progresser encore, il faudrait approfondir le travail personnel. Bilan positif et encourageant.`,
    assez_bien: `Trimestre en demi-teinte pour ${studentName}. Des capacités réelles en ${compLabels.slice(0, 2).map((l) => l.toLowerCase()).join(' et ')} mais un manque de constance dans l'effort. ${compLabels[2] ? `En ${compLabels[2].toLowerCase()}, il faut davantage s'impliquer. ` : ''}Plus de rigueur et de concentration sont nécessaires. Je reste confiant(e) dans sa capacité à rebondir.`,
    insuffisant: `Des résultats préoccupants pour ${studentName}. Les lacunes en ${compLabels.slice(0, 2).map((l) => l.toLowerCase()).join(' et ')} doivent être comblées rapidement. ${compLabels[2] ? `En ${compLabels[2].toLowerCase()}, un travail de fond est indispensable. ` : ''}Un dialogue avec la famille et un suivi personnalisé sont indispensables. Je reste disponible pour accompagner ${studentName} dans ses progrès.`,
  };

  let variantA = templatesA[level];
  let variantB = templatesB[level];

  if (comment.trim()) {
    variantA += ` Note personnelle : ${comment.trim()}`;
    variantB += ` Note personnelle : ${comment.trim()}`;
  }

  return { variantA, variantB };
}

// ─── Component ───────────────────────────────────────────

export default function AppreciationsScreen() {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedComps, setSelectedComps] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [variantA, setVariantA] = useState('');
  const [variantB, setVariantB] = useState('');
  const [generating, setGenerating] = useState(false);
  const [chosenText, setChosenText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Animations
  const resultFade = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(30)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;

  const toggleComp = (id: string) => {
    setSelectedComps((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const canGenerate = selectedStudent && selectedLevel && selectedComps.length >= 1;

  const studentName = STUDENTS.find((s) => s.id === selectedStudent)?.name || '';

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setVariantA('');
    setVariantB('');
    setChosenText('');
    setEditMode(false);

    Animated.sequence([
      Animated.timing(buttonPulse, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.spring(buttonPulse, { toValue: 1, tension: 200, friction: 5, useNativeDriver: true }),
    ]).start();

    await new Promise((r) => setTimeout(r, 1500));

    const student = STUDENTS.find((s) => s.id === selectedStudent);
    const { variantA: a, variantB: b } = generateAppreciation(
      student!.name,
      selectedLevel!,
      selectedComps,
      comment,
    );
    setVariantA(a);
    setVariantB(b);
    setGenerating(false);

    resultFade.setValue(0);
    resultSlide.setValue(30);
    Animated.parallel([
      Animated.timing(resultFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(resultSlide, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const handleChoose = (text: string) => {
    setChosenText(text);
    setEditMode(true);
    setVariantA('');
    setVariantB('');

    setTimeout(() => {
      resultFade.setValue(0);
      resultSlide.setValue(30);
      Animated.parallel([
        Animated.timing(resultFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(resultSlide, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 50);
  };

  const handleCopy = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(chosenText);
      }
    } catch {
      // Clipboard not available in some environments
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleValidate = async () => {
    const student = STUDENTS.find((s) => s.id === selectedStudent);
    if (student && selectedLevel) {
      await saveAppreciation({
        student_id: student.id,
        student_name: student.name,
        level: selectedLevel,
        competences: selectedComps,
        text: chosenText,
        trimestre: 2,
      });
    }
    Alert.alert(
      'Appréciation validée',
      `Appréciation validée pour ${studentName}. Prête à être copiée dans le bulletin.`,
      [{ text: 'OK' }],
    );
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setSelectedLevel(null);
    setSelectedComps([]);
    setComment('');
    setVariantA('');
    setVariantB('');
    setChosenText('');
    setEditMode(false);
  };

  const hasVariants = variantA !== '' && variantB !== '';

  // ─── Render ──────────────────────────────────────────

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#E8EDF5' }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SCROLL_PADDING }}
    >
      {/* Header */}
      <LinearGradient
        colors={['#0B1628', TEACHER_ORANGE + 'DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
      >
        <Text className="text-[42px] mb-2">✍️</Text>
        <Text className="text-[22px] font-black mb-1" style={{ color: '#FFFFFF' }}>Générateur d'appréciations</Text>
        <Text className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.8)' }}>
          Cochez les compétences, Aria rédige en 2 secondes
        </Text>
      </LinearGradient>

      <VStack className="px-5 pt-2">
        {/* Step 1: Select student */}
        <VStack className="mb-6">
          <Box className="w-6 h-6 rounded-full justify-center items-center mb-2" style={{ backgroundColor: Colors.violet + '30' }}>
            <Text className="text-[13px] font-extrabold" style={{ color: Colors.violet }}>1</Text>
          </Box>
          <HStack className="items-center gap-2 mb-3">
            <Box style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: TEACHER_ORANGE }} />
            <Text className="text-base font-bold" style={{ color: '#0F172A' }}>Élève</Text>
          </HStack>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HStack className="gap-2">
              {STUDENTS.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setSelectedStudent(s.id)}
                  className="items-center py-2.5 px-3.5 rounded-[14px]"
                  style={{
                    backgroundColor: selectedStudent === s.id ? Colors.cyan + '12' : SCREEN_BACKGROUND,
                    borderWidth: 1.5,
                    borderColor: selectedStudent === s.id ? Colors.cyan : '#EEF0F5',
                    ...CARD_SHADOW,
                    minWidth: 72,
                  }}
                >
                  <Text className="text-[28px] mb-1">{s.avatar}</Text>
                  <Text className="text-xs font-semibold" style={{ color: selectedStudent === s.id ? Colors.cyan : '#94A3B8' }}>
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </HStack>
          </ScrollView>
        </VStack>

        {/* Step 2: Select level */}
        <VStack className="mb-6">
          <Box className="w-6 h-6 rounded-full justify-center items-center mb-2" style={{ backgroundColor: Colors.violet + '30' }}>
            <Text className="text-[13px] font-extrabold" style={{ color: Colors.violet }}>2</Text>
          </Box>
          <HStack className="items-center gap-2 mb-3">
            <Box style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: TEACHER_ORANGE }} />
            <Text className="text-base font-bold" style={{ color: '#0F172A' }}>Niveau général</Text>
          </HStack>
          <HStack className="gap-2">
            {LEVELS.map((l) => (
              <Pressable
                key={l.key}
                onPress={() => setSelectedLevel(l.key)}
                className="flex-1 items-center py-3 rounded-[14px]"
                style={{
                  backgroundColor: SCREEN_BACKGROUND,
                  borderWidth: 1.5,
                  borderColor: selectedLevel === l.key ? l.color : '#EEF0F5',
                  ...CARD_SHADOW,
                  ...(selectedLevel === l.key ? { backgroundColor: l.color + '15' } : {}),
                }}
              >
                <Text className="text-[22px] mb-1">{l.emoji}</Text>
                <Text className="text-[11px] font-bold" style={{ color: selectedLevel === l.key ? l.color : '#94A3B8' }}>
                  {l.label}
                </Text>
              </Pressable>
            ))}
          </HStack>
        </VStack>

        {/* Step 3: Select competences (max 3) */}
        <VStack className="mb-6">
          <Box className="w-6 h-6 rounded-full justify-center items-center mb-2" style={{ backgroundColor: Colors.violet + '30' }}>
            <Text className="text-[13px] font-extrabold" style={{ color: Colors.violet }}>3</Text>
          </Box>
          <HStack className="items-center gap-2 mb-3">
            <Box style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: TEACHER_ORANGE }} />
            <Text className="text-base font-bold" style={{ color: '#0F172A' }}>
            Compétences{' '}
            <Text className="font-semibold" style={{ color: Colors.cyan }}>
              ({selectedComps.length}/3)
            </Text>
          </Text>
          </HStack>

          {(['savoir', 'savoir-faire', 'savoir-etre'] as const).map((cat) => (
            <VStack key={cat} className="mb-3.5">
              <Text className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: Colors.cyan }}>
                {CATEGORY_LABELS[cat]}
              </Text>
              <VStack className="gap-1.5">
                {COMPETENCES.filter((c) => c.category === cat).map((comp) => {
                  const isSelected = selectedComps.includes(comp.id);
                  const isDisabled = !isSelected && selectedComps.length >= 3;
                  return (
                    <Pressable
                      key={comp.id}
                      onPress={() => !isDisabled && toggleComp(comp.id)}
                      className="rounded-xl"
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        paddingVertical: 10, paddingHorizontal: 14,
                        backgroundColor: isSelected ? Colors.cyan + '10' : SCREEN_BACKGROUND,
                        borderWidth: 1.5,
                        borderColor: isSelected ? Colors.cyan + '50' : '#EEF0F5',
                        ...CARD_SHADOW,
                        opacity: isDisabled ? 0.35 : 1,
                      }}
                    >
                      <Text className="text-lg">{comp.emoji}</Text>
                      <Text className="flex-1 text-sm" style={{ color: isSelected ? '#0F172A' : '#94A3B8', fontFamily: isSelected ? FontFamily.sansSemiBold : FontFamily.sansMedium }}>
                        {comp.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color={Colors.cyan} />
                      )}
                    </Pressable>
                  );
                })}
              </VStack>
            </VStack>
          ))}
        </VStack>

        {/* Optional comment */}
        <VStack className="mb-6">
          <HStack className="items-center gap-2 mb-3">
            <Box style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: TEACHER_ORANGE }} />
            <Text className="text-base font-bold" style={{ color: '#0F172A' }}>
              Note personnelle <Text className="text-[13px] font-normal" style={{ color: '#94A3B8' }}>(optionnel)</Text>
            </Text>
          </HStack>
          <TextInput
            style={{
              backgroundColor: SCREEN_BACKGROUND, borderRadius: 14,
              padding: 14, color: '#0F172A', fontSize: 14,
              minHeight: 60, textAlignVertical: 'top',
              borderWidth: 1.5, borderColor: '#EEF0F5',
              ...CARD_SHADOW,
            }}
            placeholder="Ajouter un commentaire spécifique..."
            placeholderTextColor={Colors.gray}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={150}
          />
        </VStack>

        {/* Generate button */}
        <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
          <Pressable
            onPress={handleGenerate}
            disabled={!canGenerate || generating}
            className="rounded-[30px] overflow-hidden mb-5"
            style={{ opacity: canGenerate ? 1 : 0.5 }}
          >
            <LinearGradient
              colors={canGenerate ? [Colors.violet, Colors.cyanDark] : ['#CBD5E1', '#94A3B8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 }}
            >
              {generating ? (
                <>
                  <Spinner color={Colors.white} size="small" />
                  <Text className="text-[17px] font-extrabold" style={{ color: Colors.white }}>Aria rédige...</Text>
                </>
              ) : (
                <>
                  <Text className="text-xl" style={{ color: Colors.cyan }}>✦</Text>
                  <Text className="text-[17px] font-extrabold" style={{ color: Colors.white }}>Générer l'appréciation</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Variant cards */}
        {hasVariants && (
          <Animated.View
            style={{
              opacity: resultFade,
              transform: [{ translateY: resultSlide }],
            }}
          >
            {/* Variant A */}
            <Box className="rounded-[20px] p-[18px] mb-3.5" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: Colors.violet + '30', ...CARD_SHADOW }}>
              <HStack className="items-center mb-3 gap-2">
                <Box className="w-7 h-7 rounded-[14px] justify-center items-center" style={{ backgroundColor: Colors.violet + '30' }}>
                  <Text className="text-sm font-black" style={{ color: '#0F172A' }}>A</Text>
                </Box>
                <Text className="text-[15px] font-bold flex-1" style={{ color: '#0F172A' }}>Variante A</Text>
                <Text className="text-[11px] font-semibold px-2 py-[3px] rounded-lg" style={{ color: '#94A3B8', backgroundColor: '#F1F5F9' }}>Formelle</Text>
              </HStack>
              <Text className="text-sm mb-3.5 leading-[21px]" style={{ color: '#64748B', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }} numberOfLines={6}>
                {variantA}
              </Text>
              <Pressable
                onPress={() => handleChoose(variantA)}
                className="rounded-xl py-2.5"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.violet }}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
                <Text className="text-sm font-bold" style={{ color: Colors.white }}>Choisir</Text>
              </Pressable>
            </Box>

            {/* Variant B */}
            <Box className="rounded-[20px] p-[18px] mb-3.5" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: Colors.violet + '30', ...CARD_SHADOW }}>
              <HStack className="items-center mb-3 gap-2">
                <Box className="w-7 h-7 rounded-[14px] justify-center items-center" style={{ backgroundColor: Colors.cyan + '20' }}>
                  <Text className="text-sm font-black" style={{ color: '#0F172A' }}>B</Text>
                </Box>
                <Text className="text-[15px] font-bold flex-1" style={{ color: '#0F172A' }}>Variante B</Text>
                <Text className="text-[11px] font-semibold px-2 py-[3px] rounded-lg" style={{ color: '#94A3B8', backgroundColor: '#F1F5F9' }}>Chaleureuse</Text>
              </HStack>
              <Text className="text-sm mb-3.5 leading-[21px]" style={{ color: '#64748B', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }} numberOfLines={6}>
                {variantB}
              </Text>
              <Pressable
                onPress={() => handleChoose(variantB)}
                className="rounded-xl py-2.5"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.cyanDark }}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
                <Text className="text-sm font-bold" style={{ color: Colors.white }}>Choisir</Text>
              </Pressable>
            </Box>
          </Animated.View>
        )}

        {/* Edit mode after choosing a variant */}
        {editMode && (
          <Animated.View
            style={{
              opacity: resultFade,
              transform: [{ translateY: resultSlide }],
              backgroundColor: SCREEN_BACKGROUND,
              borderRadius: 20,
              padding: 20,
              borderWidth: 1.5,
              borderColor: Colors.violet + '30',
              ...CARD_SHADOW,
            }}
          >
            <HStack className="items-center justify-between mb-3.5">
              <HStack className="items-center gap-1.5 px-2.5 py-1 rounded-[10px]" style={{ backgroundColor: Colors.violet + '20' }}>
                <Text className="text-sm" style={{ color: Colors.cyan }}>✦</Text>
                <Text className="text-xs font-bold" style={{ color: Colors.violet }}>Aria</Text>
              </HStack>
              <Text className="text-sm font-bold" style={{ color: '#0F172A' }}>{studentName}</Text>
            </HStack>

            <TextInput
              style={{
                backgroundColor: SCREEN_BACKGROUND, borderRadius: 14,
                padding: 14, color: '#0F172A', fontSize: 15, lineHeight: 23,
                minHeight: 120, textAlignVertical: 'top',
                borderWidth: 1, borderColor: '#EEF0F5',
                fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
              }}
              value={chosenText}
              onChangeText={setChosenText}
              multiline
              scrollEnabled
            />

            <Text className="text-xs text-right mt-1.5 mb-3.5" style={{ color: '#94A3B8' }}>
              {chosenText.length} caractères
            </Text>

            <HStack className="gap-2.5 items-center pt-3.5" style={{ borderTopWidth: 1, borderTopColor: '#EEF0F5' }}>
              <Pressable onPress={handleCopy} className="rounded-[10px] py-2 px-3" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9' }}>
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={18}
                  color={copied ? Colors.green : Colors.cyan}
                />
                <Text className="text-[13px] font-semibold" style={{ color: copied ? Colors.green : Colors.cyan }}>
                  {copied ? 'Copié !' : 'Copier'}
                </Text>
              </Pressable>

              <Pressable onPress={handleGenerate} className="rounded-[10px] py-2 px-3" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9' }}>
                <Ionicons name="refresh" size={18} color={Colors.cyan} />
                <Text className="text-[13px] font-semibold" style={{ color: Colors.cyan }}>Reformuler</Text>
              </Pressable>

              <Pressable
                onPress={handleValidate}
                className="rounded-[10px] py-2 px-4 ml-auto"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.green }}
              >
                <Ionicons name="checkmark" size={18} color={Colors.white} />
                <Text className="text-[13px] font-bold" style={{ color: Colors.white }}>Valider</Text>
              </Pressable>
            </HStack>

            <Pressable onPress={handleReset} className="items-center mt-3.5 py-1.5" style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <Ionicons name="arrow-back" size={16} color="#94A3B8" />
              <Text className="text-[13px] font-medium" style={{ color: '#94A3B8' }}>Nouvel élève</Text>
            </Pressable>
          </Animated.View>
        )}

        <Box className="h-10" />
      </VStack>
    </ScrollView>
  );
}
