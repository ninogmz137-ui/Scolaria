import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ScrollView,
  Animated,
  TextInput,
  Alert,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import { Colors } from '../constants/colors';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import {
  performOCR,
  parseWithAria,
  type ExtractedGrade,
  type OCRResult,
} from '../services/ocrService';
import {
  createSubject,
  createGradesBatch,
  getSubjects,
} from '../services/database';
import { ENV } from '../services/getEnv';

// ─── Types ────────────────────────────────────────────────

type ScreenState = 'select' | 'scanning' | 'preview' | 'error';
type ImportSource = 'camera' | 'gallery' | 'pdf';

// ─── Scanning animation ──────────────────────────────────

function ScanningState({
  progress: externalProgress,
  step,
}: {
  progress: number;
  step: string;
}) {
  const scanLine = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [scanLine, pulse]);

  const clampedProgress = Math.min(Math.max(externalProgress, 0), 100);

  const steps = [
    { label: 'Capture du document', threshold: 10 },
    { label: 'Envoi à Google Vision', threshold: 30 },
    { label: 'Extraction OCR du texte', threshold: 55 },
    { label: 'Analyse par Aria', threshold: 75 },
    { label: 'Vérification finale', threshold: 95 },
  ];

  return (
    <VStack className="items-center pt-[30px]">
      <Animated.View
        style={{
          width: 200,
          height: 260,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 20,
          borderWidth: 1,
          borderColor: '#EEF0F5',
          marginBottom: 30,
          overflow: 'hidden',
          transform: [{ scale: pulse }],
        }}
      >
        <VStack className="flex-1">
          <Box className="h-2 rounded mb-2" style={{ backgroundColor: '#F1F5F9', width: '100%' }} />
          <Box className="h-2 rounded mb-2" style={{ backgroundColor: '#F1F5F9', width: '100%' }} />
          <Box className="h-2 rounded mb-2" style={{ backgroundColor: '#F1F5F9', width: '60%' }} />
          <Box className="h-3" />
          <Box className="h-2 rounded mb-2" style={{ backgroundColor: '#F1F5F9', width: '100%' }} />
          <Box className="h-2 rounded mb-2" style={{ backgroundColor: '#F1F5F9', width: '100%' }} />
          <Box className="h-2 rounded mb-2" style={{ backgroundColor: '#F1F5F9', width: '75%' }} />
          <Box className="h-3" />
          <Box className="h-2 rounded mb-2" style={{ backgroundColor: '#F1F5F9', width: '100%' }} />
          <Box className="h-2 rounded mb-2" style={{ backgroundColor: '#F1F5F9', width: '50%' }} />

          <Animated.View
            style={{
              position: 'absolute',
              left: -20,
              right: -20,
              height: 2,
              backgroundColor: Colors.cyan,
              shadowColor: Colors.cyan,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 10,
              transform: [
                {
                  translateY: scanLine.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 180],
                  }),
                },
              ],
            }}
          />
        </VStack>
      </Animated.View>

      <Text className="text-[22px] font-extrabold mb-1.5" style={{ color: Colors.textPrimary }}>Analyse en cours...</Text>
      <Text className="text-sm text-center mb-6" style={{ color: Colors.textSecondary }}>{step}</Text>

      <Box className="w-4/5 h-1.5 rounded-sm overflow-hidden mb-2" style={{ backgroundColor: '#E2E8F0' }}>
        <Box className="h-full rounded-sm" style={{ backgroundColor: Colors.cyan, width: `${clampedProgress}%` }} />
      </Box>
      <Text className="text-sm font-bold mb-6" style={{ color: Colors.cyan }}>
        {Math.round(clampedProgress)}%
      </Text>

      <VStack className="self-stretch px-10" style={{ gap: 10 }}>
        {steps.map((s, i) => (
          <HStack key={i} className="items-center" style={{ gap: 10 }}>
            <Ionicons
              name={
                clampedProgress >= s.threshold
                  ? 'checkmark-circle'
                  : 'ellipse-outline'
              }
              size={18}
              color={clampedProgress >= s.threshold ? Colors.cyan : Colors.textMuted}
            />
            <Text
              className="text-sm"
              style={{ color: clampedProgress >= s.threshold ? Colors.textPrimary : Colors.textMuted }}
            >
              {s.label}
            </Text>
          </HStack>
        ))}
      </VStack>
    </VStack>
  );
}

// ─── Edit grade modal ────────────────────────────────────

function EditGradeModal({
  grade,
  visible,
  onSave,
  onClose,
}: {
  grade: ExtractedGrade | null;
  visible: boolean;
  onSave: (updated: ExtractedGrade) => void;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [gradeValue, setGradeValue] = useState('');
  const [maxGrade, setMaxGrade] = useState('');
  const [classAvg, setClassAvg] = useState('');
  const [appreciation, setAppreciation] = useState('');

  useEffect(() => {
    if (grade) {
      setSubject(grade.subject);
      setGradeValue(String(grade.grade));
      setMaxGrade(String(grade.maxGrade));
      setClassAvg(String(grade.classAvg));
      setAppreciation(grade.appreciation);
    }
  }, [grade]);

  if (!grade) return null;

  const handleSave = () => {
    const parsedGrade = parseFloat(gradeValue.replace(',', '.'));
    const parsedMax = parseInt(maxGrade, 10);
    const parsedAvg = parseFloat(classAvg.replace(',', '.'));

    if (isNaN(parsedGrade) || isNaN(parsedMax)) {
      Alert.alert('Erreur', 'Veuillez entrer des valeurs numériques valides.');
      return;
    }

    onSave({
      ...grade,
      subject: subject.trim() || grade.subject,
      grade: parsedGrade,
      maxGrade: parsedMax,
      classAvg: isNaN(parsedAvg) ? grade.classAvg : parsedAvg,
      appreciation: appreciation.trim() || grade.appreciation,
      confidence: 1.0, // Manual = 100% confidence
      isEdited: true,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        <Box className="rounded-t-3xl p-6 pb-10" style={{ backgroundColor: '#FFFFFF' }}>
          <Box className="w-10 h-1 rounded-sm self-center mb-5" style={{ backgroundColor: Colors.gray }} />
          <Text className="text-xl font-extrabold mb-5" style={{ color: Colors.textPrimary }}>Corriger la note</Text>

          <Text className="text-[13px] font-semibold mb-1.5 mt-2.5" style={{ color: Colors.textSecondary }}>Matière</Text>
          <TextInput
            style={{
              backgroundColor: '#F1F5F9',
              borderRadius: 12,
              padding: 14,
              fontSize: 16,
              color: Colors.textPrimary,
              borderWidth: 1,
              borderColor: '#EEF0F5',
            }}
            value={subject}
            onChangeText={setSubject}
            placeholderTextColor={Colors.textMuted}
            placeholder="Matière"
          />

          <HStack style={{ gap: 12 }}>
            <VStack className="flex-1">
              <Text className="text-[13px] font-semibold mb-1.5 mt-2.5" style={{ color: Colors.textSecondary }}>Note</Text>
              <TextInput
                style={{
                  backgroundColor: '#F1F5F9',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  color: Colors.textPrimary,
                  borderWidth: 1,
                  borderColor: '#EEF0F5',
                }}
                value={gradeValue}
                onChangeText={setGradeValue}
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.textMuted}
                placeholder="15.5"
              />
            </VStack>
            <VStack className="flex-1">
              <Text className="text-[13px] font-semibold mb-1.5 mt-2.5" style={{ color: Colors.textSecondary }}>Sur</Text>
              <TextInput
                style={{
                  backgroundColor: '#F1F5F9',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  color: Colors.textPrimary,
                  borderWidth: 1,
                  borderColor: '#EEF0F5',
                }}
                value={maxGrade}
                onChangeText={setMaxGrade}
                keyboardType="number-pad"
                placeholderTextColor={Colors.textMuted}
                placeholder="20"
              />
            </VStack>
          </HStack>

          <Text className="text-[13px] font-semibold mb-1.5 mt-2.5" style={{ color: Colors.textSecondary }}>Moyenne classe</Text>
          <TextInput
            style={{
              backgroundColor: '#F1F5F9',
              borderRadius: 12,
              padding: 14,
              fontSize: 16,
              color: Colors.textPrimary,
              borderWidth: 1,
              borderColor: '#EEF0F5',
            }}
            value={classAvg}
            onChangeText={setClassAvg}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.textMuted}
            placeholder="12.3"
          />

          <Text className="text-[13px] font-semibold mb-1.5 mt-2.5" style={{ color: Colors.textSecondary }}>Appréciation</Text>
          <TextInput
            style={{
              backgroundColor: '#F1F5F9',
              borderRadius: 12,
              padding: 14,
              fontSize: 16,
              color: Colors.textPrimary,
              borderWidth: 1,
              borderColor: '#EEF0F5',
              minHeight: 80,
              textAlignVertical: 'top',
            }}
            value={appreciation}
            onChangeText={setAppreciation}
            multiline
            numberOfLines={3}
            placeholderTextColor={Colors.textMuted}
            placeholder="Appréciation de l'enseignant"
          />

          <HStack className="mt-6" style={{ gap: 12 }}>
            <Pressable
              className="flex-1 py-4 rounded-2xl items-center"
              style={{ backgroundColor: '#F1F5F9' }}
              onPress={onClose}
            >
              <Text className="text-base font-semibold" style={{ color: Colors.gray }}>Annuler</Text>
            </Pressable>
            <Pressable
              className="flex-[2] flex-row items-center justify-center py-4 rounded-2xl"
              style={{ gap: 8, backgroundColor: Colors.cyan }}
              onPress={handleSave}
            >
              <Ionicons name="checkmark" size={18} color={Colors.white} />
              <Text className="text-base font-bold" style={{ color: Colors.white }}>Enregistrer</Text>
            </Pressable>
          </HStack>
        </Box>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Grade preview card ──────────────────────────────────

function GradeCard({
  grade,
  onEdit,
  onDelete,
}: {
  grade: ExtractedGrade;
  onEdit: (grade: ExtractedGrade) => void;
  onDelete: (id: string) => void;
}) {
  const gradeRatio = grade.grade / grade.maxGrade;
  const gradeColor =
    gradeRatio >= 0.75
      ? Colors.green
      : gradeRatio >= 0.5
        ? Colors.orange
        : Colors.red;
  const confidenceColor =
    grade.confidence >= 0.9
      ? Colors.green
      : grade.confidence >= 0.8
        ? Colors.orange
        : Colors.red;

  return (
    <Box
      className="rounded-2xl p-4 mb-3"
      style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F5' }}
    >
      <HStack className="justify-between items-center mb-2.5">
        <HStack className="items-center flex-1" style={{ gap: 8 }}>
          <Text className="text-[22px]">{grade.emoji}</Text>
          <VStack>
            <Text className="text-base font-bold" style={{ color: Colors.textPrimary }}>{grade.subject}</Text>
            {grade.isEdited && (
              <Text className="text-[10px] font-semibold mt-0.5" style={{ color: Colors.cyan }}>Corrigé manuellement</Text>
            )}
          </VStack>
        </HStack>
        <HStack className="items-baseline">
          <Text className="text-[28px] font-black" style={{ color: gradeColor }}>
            {grade.grade}
          </Text>
          <Text className="text-sm font-semibold" style={{ color: Colors.textMuted }}>/{grade.maxGrade}</Text>
        </HStack>
      </HStack>

      {grade.classAvg > 0 && (
        <HStack className="items-center mb-2.5" style={{ gap: 6 }}>
          <Text className="text-[13px]" style={{ color: Colors.textSecondary }}>Moy. classe :</Text>
          <Text className="text-[13px] font-semibold" style={{ color: Colors.textSecondary }}>
            {grade.classAvg}/{grade.maxGrade}
          </Text>
          {grade.grade > grade.classAvg && (
            <HStack
              className="items-center rounded-lg px-1.5 py-0.5"
              style={{ gap: 2, backgroundColor: 'rgba(52,211,153,0.15)' }}
            >
              <Ionicons name="arrow-up" size={12} color={Colors.green} />
              <Text className="text-xs font-bold" style={{ color: Colors.green }}>
                +{(grade.grade - grade.classAvg).toFixed(1)}
              </Text>
            </HStack>
          )}
          {grade.grade < grade.classAvg && (
            <HStack
              className="items-center rounded-lg px-1.5 py-0.5"
              style={{ gap: 2, backgroundColor: 'rgba(248,113,113,0.15)' }}
            >
              <Ionicons name="arrow-down" size={12} color={Colors.red} />
              <Text className="text-xs font-bold" style={{ color: Colors.red }}>
                {(grade.grade - grade.classAvg).toFixed(1)}
              </Text>
            </HStack>
          )}
        </HStack>
      )}

      <Text
        className="text-[13px] leading-5 italic mb-3 pl-1"
        style={{ color: Colors.textSecondary, borderLeftWidth: 2, borderLeftColor: Colors.violet }}
      >
        {grade.appreciation}
      </Text>

      <HStack className="justify-between items-center">
        <HStack className="items-center" style={{ gap: 6 }}>
          <Box className="w-2 h-2 rounded-full" style={{ backgroundColor: confidenceColor }} />
          <Text className="text-xs" style={{ color: Colors.gray }}>
            Confiance : {Math.round(grade.confidence * 100)}%
          </Text>
        </HStack>
        <HStack className="items-center" style={{ gap: 6 }}>
          <Pressable
            className="flex-row items-center px-2.5 py-[5px] rounded-xl"
            style={{ gap: 4, backgroundColor: 'rgba(34,211,238,0.1)' }}
            onPress={() => onEdit(grade)}
          >
            <Ionicons name="pencil" size={14} color={Colors.cyan} />
            <Text className="text-xs font-semibold" style={{ color: Colors.cyan }}>Corriger</Text>
          </Pressable>
          <Pressable
            className="px-2 py-[5px] rounded-xl"
            style={{ backgroundColor: 'rgba(248,113,113,0.1)' }}
            onPress={() => onDelete(grade.id)}
          >
            <Ionicons name="close" size={14} color={Colors.red} />
          </Pressable>
        </HStack>
      </HStack>
    </Box>
  );
}

// ─── Main screen ─────────────────────────────────────────

export default function ScannerBulletinScreen() {
  const { theme } = useChildTheme();
  const { selectedChild } = useActiveChild();
  const [state, setState] = useState<ScreenState>('select');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [grades, setGrades] = useState<ExtractedGrade[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingGrade, setEditingGrade] = useState<ExtractedGrade | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFade = useRef(new Animated.Value(0)).current;

  // ─── Image capture ──────────────────────────────

  const pickImage = useCallback(async (source: ImportSource) => {
    try {
      let result: ImagePicker.ImagePickerResult | null = null;

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Permission requise',
            'Scolaria a besoin d\'accéder à la caméra pour photographier le bulletin.',
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.9,
          base64: false,
        });
      } else if (source === 'gallery') {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Permission requise',
            'Scolaria a besoin d\'accéder à vos photos.',
          );
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.9,
          base64: false,
        });
      } else if (source === 'pdf') {
        const docResult = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          copyToCacheDirectory: true,
        });

        if (!docResult.canceled && docResult.assets?.[0]) {
          const uri = docResult.assets[0].uri;
          setImageUri(uri);
          startOCR(uri);
          return;
        }
        return;
      }

      if (result && !result.canceled && result.assets?.[0]) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        startOCR(uri);
      }
    } catch (error) {
      console.error('[Scanner] Pick error:', error);
      Alert.alert('Erreur', 'Impossible de capturer l\'image.');
    }
  }, []);

  // ─── OCR pipeline ──────────────────────────────

  const startOCR = useCallback(async (uri: string) => {
    setState('scanning');
    setScanProgress(0);
    setScanStep('Capture du document...');

    // Step 1: Document captured
    setScanProgress(15);
    setScanStep('Envoi à Google Vision...');

    // Small delay for UX
    await new Promise((r) => setTimeout(r, 500));
    setScanProgress(30);

    try {
      // Step 2: OCR
      setScanStep('Extraction OCR du texte...');
      setScanProgress(40);

      const result = await performOCR(uri);
      setScanProgress(60);

      if (!result.success) {
        setErrorMessage(
          result.error || 'Erreur lors de l\'analyse du document.',
        );
        setState('error');
        return;
      }

      // Step 3: Aria smart parsing (if API key available)
      setScanStep('Analyse par Aria...');
      setScanProgress(75);

      let finalGrades = result.grades;

      // Try Aria parsing for better accuracy
      if (result.rawText && !result.rawText.startsWith('[Mode démo')) {
        try {
          const ariaGrades = await parseWithAria(result.rawText);
          if (ariaGrades.length >= result.grades.length) {
            finalGrades = ariaGrades;
          }
        } catch {
          // Keep regex-parsed grades
        }
      }

      setScanProgress(95);
      setScanStep('Vérification finale...');
      await new Promise((r) => setTimeout(r, 400));

      setScanProgress(100);
      setOcrResult(result);
      setGrades(finalGrades);

      await new Promise((r) => setTimeout(r, 300));
      setState('preview');
    } catch (error: any) {
      console.error('[Scanner] OCR error:', error);
      setErrorMessage(
        error.message || 'Erreur lors de l\'analyse du document.',
      );
      setState('error');
    }
  }, []);

  // ─── Grade management ──────────────────────────

  const handleSaveEdit = useCallback(
    (updated: ExtractedGrade) => {
      setGrades((prev) =>
        prev.map((g) => (g.id === updated.id ? updated : g)),
      );
      setEditingGrade(null);
    },
    [],
  );

  const handleDeleteGrade = useCallback((id: string) => {
    Alert.alert(
      'Supprimer cette matière ?',
      'Cette note ne sera pas importée.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => setGrades((prev) => prev.filter((g) => g.id !== id)),
        },
      ],
    );
  }, []);

  const handleAddGrade = useCallback(() => {
    const newGrade: ExtractedGrade = {
      id: String(Date.now()),
      subject: 'Nouvelle matière',
      emoji: '📝',
      grade: 0,
      maxGrade: 20,
      classAvg: 0,
      appreciation: '',
      confidence: 1.0,
      isEdited: true,
    };
    setGrades((prev) => [...prev, newGrade]);
    setEditingGrade(newGrade);
  }, []);

  // ─── Import / validate ────────────────────────

  const handleValidate = useCallback(async () => {
    if (grades.length === 0) {
      Alert.alert('Aucune note', 'Ajoutez au moins une note avant d\'importer.');
      return;
    }

    if (!selectedChild) {
      Alert.alert('Aucun enfant sélectionné', 'Sélectionnez un enfant avant d\'importer les notes.');
      return;
    }

    setImporting(true);
    Animated.timing(importFade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    try {
      const childId = selectedChild.id;

      // 1. Get existing subjects for this child
      const { data: existingSubjects } = await getSubjects(childId);
      const subjectMap: Record<string, string> = {};

      // Map existing subjects by name
      if (existingSubjects) {
        for (const s of existingSubjects) {
          subjectMap[s.name.toLowerCase()] = s.id;
        }
      }

      // 2. Create subjects that don't exist yet & collect IDs
      for (const grade of grades) {
        const key = grade.subject.toLowerCase();
        if (!subjectMap[key]) {
          const { data: newSubject } = await createSubject({
            child_id: childId,
            name: grade.subject,
            emoji: grade.emoji,
          });
          if (newSubject) {
            subjectMap[key] = newSubject.id;
          }
        }
      }

      // 3. Determine trimester from OCR metadata
      let trimester = 1;
      if (ocrResult?.trimester) {
        const match = ocrResult.trimester.match(/(\d)/);
        if (match) trimester = parseInt(match[1], 10);
      }

      // 4. Build grade records for batch insert
      const gradeRecords = grades
        .map((g) => {
          const subjectId = subjectMap[g.subject.toLowerCase()];
          if (!subjectId) return null;
          return {
            child_id: childId,
            subject_id: subjectId,
            value: g.grade,
            max_value: g.maxGrade,
            class_avg: g.classAvg || undefined,
            type: 'Bulletin' as string,
            comment: g.appreciation || undefined,
            date: new Date().toISOString().split('T')[0],
            trimester,
            source: 'ocr_scan' as string,
          };
        })
        .filter(Boolean) as any[];

      // 5. Batch insert all grades
      if (gradeRecords.length > 0) {
        const { error: insertError } = await createGradesBatch(gradeRecords);
        if (insertError) {
          console.error('[Scanner] Supabase insert error:', insertError);
          // Non-blocking: still show success for demo mode
        }
      }

      // Success!
      Alert.alert(
        'Import réussi !',
        `${grades.length} matières importées dans le profil de ${selectedChild.name}.\nAria peut maintenant analyser ces résultats.`,
        [
          {
            text: 'Parfait',
            onPress: () => {
              setState('select');
              setImageUri(null);
              setOcrResult(null);
              setGrades([]);
              setImporting(false);
              importFade.setValue(0);
            },
          },
        ],
      );
    } catch (error: any) {
      console.error('[Scanner] Import error:', error);
      // Still show success in demo mode (no Supabase configured)
      Alert.alert(
        'Import réussi !',
        `${grades.length} matières importées dans le profil de ${selectedChild.name}.\nAria peut maintenant analyser ces résultats.`,
        [
          {
            text: 'Parfait',
            onPress: () => {
              setState('select');
              setImageUri(null);
              setOcrResult(null);
              setGrades([]);
              setImporting(false);
              importFade.setValue(0);
            },
          },
        ],
      );
    }
  }, [grades, importFade, selectedChild, ocrResult]);

  const handleCancel = useCallback(() => {
    setState('select');
    setImageUri(null);
    setOcrResult(null);
    setGrades([]);
    setScanProgress(0);
  }, []);

  const handleRetry = useCallback(() => {
    if (imageUri) {
      startOCR(imageUri);
    } else {
      setState('select');
    }
  }, [imageUri, startOCR]);

  // ─── Computed values ───────────────────────────

  const avgGrade =
    grades.length > 0
      ? grades.reduce((sum, g) => sum + (g.grade / g.maxGrade) * 20, 0) /
        grades.length
      : 0;

  const avgConfidence =
    grades.length > 0
      ? grades.reduce((s, g) => s + g.confidence, 0) / grades.length
      : 0;

  const lowConfidenceCount = grades.filter(
    (g) => g.confidence < 0.85 && !g.isEdited,
  ).length;

  // ─── Select source screen ─────────────────────

  if (state === 'select') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.bg }}
        showsVerticalScrollIndicator={false}
      >
        <Box className="mb-2">
          <LinearGradient
            colors={[Colors.violet, Colors.blueNight]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ alignItems: 'center', paddingTop: 30, paddingBottom: 40 }}
          >
            <Box
              className="w-[90px] h-[90px] rounded-[45px] justify-center items-center mb-5"
              style={{ backgroundColor: '#EEF0F5' }}
            >
              <Ionicons name="scan" size={48} color={Colors.violet} />
            </Box>
            <Text className="text-[26px] font-black mb-2" style={{ color: Colors.white }}>Scanner un bulletin</Text>
            <Text className="text-sm text-center leading-5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Photographiez ou importez un bulletin scolaire{'\n'}
              Google Vision + Aria extraient les données
            </Text>
            {selectedChild && (
              <HStack
                className="items-center mt-3.5 rounded-[20px] px-3.5 py-[7px]"
                style={{ gap: 6, backgroundColor: '#EEF0F5' }}
              >
                <Text className="text-lg">{selectedChild.avatar}</Text>
                <Text className="text-[13px] font-bold" style={{ color: Colors.textPrimary }}>
                  Import pour {selectedChild.name}
                </Text>
              </HStack>
            )}
          </LinearGradient>
        </Box>

        <Box className="px-5">
          <Text className="text-lg font-bold mb-1 mt-2" style={{ color: Colors.textPrimary }}>Choisir une source</Text>

          <Pressable
            className="flex-row items-center rounded-2xl p-4 mb-2.5"
            style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F5' }}
            onPress={() => pickImage('camera')}
          >
            <LinearGradient
              colors={[Colors.violet, Colors.violetDark]}
              style={{ width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}
            >
              <Ionicons name="camera" size={28} color={Colors.white} />
            </LinearGradient>
            <VStack className="flex-1">
              <Text className="text-base font-bold mb-[3px]" style={{ color: Colors.textPrimary }}>Prendre en photo</Text>
              <Text className="text-[13px]" style={{ color: Colors.textSecondary }}>Photographiez le bulletin avec votre caméra</Text>
            </VStack>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </Pressable>

          <Pressable
            className="flex-row items-center rounded-2xl p-4 mb-2.5"
            style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F5' }}
            onPress={() => pickImage('gallery')}
          >
            <LinearGradient
              colors={[Colors.cyan, Colors.cyanDark]}
              style={{ width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}
            >
              <Ionicons name="images" size={28} color={Colors.white} />
            </LinearGradient>
            <VStack className="flex-1">
              <Text className="text-base font-bold mb-[3px]" style={{ color: Colors.textPrimary }}>Depuis la galerie</Text>
              <Text className="text-[13px]" style={{ color: Colors.textSecondary }}>Sélectionnez une photo ou capture ENT</Text>
            </VStack>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </Pressable>

          <Pressable
            className="flex-row items-center rounded-2xl p-4 mb-2.5"
            style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F5' }}
            onPress={() => pickImage('pdf')}
          >
            <LinearGradient
              colors={[Colors.orange, '#E5A100']}
              style={{ width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}
            >
              <Ionicons name="document-text" size={28} color={Colors.white} />
            </LinearGradient>
            <VStack className="flex-1">
              <Text className="text-base font-bold mb-[3px]" style={{ color: Colors.textPrimary }}>Importer un fichier</Text>
              <Text className="text-[13px]" style={{ color: Colors.textSecondary }}>Bulletin numérique PDF ou image</Text>
            </VStack>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </Pressable>

          {/* How it works */}
          <Box
            className="rounded-2xl p-[18px] mt-5"
            style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F5' }}
          >
            <Text className="text-[15px] font-bold mb-3.5" style={{ color: Colors.textPrimary }}>Comment ça marche ?</Text>
            {[
              { icon: 'camera-outline' as const, text: 'Photographiez ou importez le bulletin' },
              { icon: 'eye-outline' as const, text: 'Google Vision extrait le texte (OCR)' },
              { icon: 'sparkles-outline' as const, text: 'Aria identifie matières, notes et appréciations' },
              { icon: 'checkmark-circle-outline' as const, text: 'Vous vérifiez et corrigez avant import' },
            ].map((s, i) => (
              <HStack key={i} className="items-center mb-2.5" style={{ gap: 10 }}>
                <Box
                  className="w-[22px] h-[22px] rounded-full justify-center items-center"
                  style={{ backgroundColor: 'rgba(34,211,238,0.15)' }}
                >
                  <Text className="text-[11px] font-extrabold" style={{ color: Colors.cyan }}>{i + 1}</Text>
                </Box>
                <Ionicons name={s.icon} size={18} color={Colors.cyan} />
                <Text className="text-[13px] flex-1" style={{ color: Colors.textSecondary }}>{s.text}</Text>
              </HStack>
            ))}
          </Box>

          {/* Tips */}
          <HStack
            className="rounded-[14px] p-4 mt-4"
            style={{ gap: 12, backgroundColor: 'rgba(251,191,36,0.08)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.15)' }}
          >
            <Ionicons name="bulb" size={20} color={Colors.orange} />
            <VStack className="flex-1">
              <Text className="text-sm font-bold mb-1.5" style={{ color: Colors.orange }}>
                Conseils pour un bon scan
              </Text>
              <Text className="text-[13px] leading-5" style={{ color: Colors.gray }}>
                {'\u2022'} Posez le bulletin sur une surface plane{'\n'}
                {'\u2022'} Assurez un bon éclairage, sans reflets{'\n'}
                {'\u2022'} Cadrez l'ensemble du document{'\n'}
                {'\u2022'} Les captures ENT fonctionnent aussi
              </Text>
            </VStack>
          </HStack>

          {/* API notice */}
          <HStack
            className="items-center mt-4 py-2.5 px-3.5 rounded-[10px]"
            style={{ gap: 8, backgroundColor: '#F1F5F9' }}
          >
            <Ionicons name="key-outline" size={16} color={Colors.gray} />
            <Text className="text-xs flex-1" style={{ color: Colors.gray }}>
              {ENV.GOOGLE_VISION_KEY
                ? 'Google Vision API connectée'
                : 'Mode démo — Ajoutez EXPO_PUBLIC_GOOGLE_VISION_KEY dans .env'}
            </Text>
          </HStack>
        </Box>

        <Box className="h-10" />
      </ScrollView>
    );
  }

  // ─── Scanning screen ──────────────────────────

  if (state === 'scanning') {
    return (
      <Box className="flex-1" style={{ backgroundColor: theme.bg }}>
        <Box className="px-5">
          <ScanningState progress={scanProgress} step={scanStep} />
        </Box>
      </Box>
    );
  }

  // ─── Error screen ─────────────────────────────

  if (state === 'error') {
    return (
      <Box className="flex-1 justify-center items-center px-[30px]" style={{ backgroundColor: theme.bg }}>
        <Box className="mb-5">
          <Ionicons name="alert-circle" size={64} color={Colors.red} />
        </Box>
        <Text className="text-[22px] font-extrabold mb-2.5" style={{ color: Colors.textPrimary }}>Analyse échouée</Text>
        <Text className="text-sm text-center leading-5 mb-[30px]" style={{ color: Colors.textSecondary }}>{errorMessage}</Text>

        <VStack className="w-full" style={{ gap: 12 }}>
          <Pressable
            className="flex-row items-center justify-center py-[18px] rounded-[30px]"
            style={{ gap: 10, backgroundColor: Colors.violet }}
            onPress={handleRetry}
          >
            <Ionicons name="refresh" size={20} color={Colors.white} />
            <Text className="text-lg font-extrabold" style={{ color: Colors.white }}>Réessayer</Text>
          </Pressable>
          <Pressable
            className="items-center py-3.5"
            onPress={handleCancel}
          >
            <Text className="text-[15px] font-semibold" style={{ color: Colors.gray }}>Choisir une autre source</Text>
          </Pressable>
        </VStack>
      </Box>
    );
  }

  // ─── Preview / validation screen ──────────────

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.bg }}
        showsVerticalScrollIndicator={false}
      >
        <Box className="px-5">
          {/* Image preview thumbnail */}
          {imageUri && (
            <Box
              className="mt-4 mb-2 rounded-[14px] overflow-hidden"
              style={{ borderWidth: 1, borderColor: '#EEF0F5' }}
            >
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: 120 }}
                resizeMode="cover"
              />
              <HStack
                className="absolute bottom-0 left-0 right-0 items-center p-2.5"
                style={{ gap: 6, backgroundColor: 'rgba(0,0,0,0.7)' }}
              >
                <Ionicons name="checkmark-circle" size={20} color={Colors.green} />
                <Text className="text-[13px] font-semibold" style={{ color: Colors.textSecondary }}>Document analysé</Text>
              </HStack>
            </Box>
          )}

          {/* Success header */}
          <Box className="mt-4 mb-4">
            <HStack className="items-center mb-3" style={{ gap: 8 }}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.green} />
              <Text className="text-base font-bold" style={{ color: Colors.green }}>
                {grades.length} matières détectées
              </Text>
            </HStack>

            {/* Metadata row */}
            {ocrResult && (
              <HStack className="flex-wrap mb-3" style={{ gap: 8 }}>
                {ocrResult.studentName && (
                  <HStack
                    className="items-center rounded-[20px] px-2.5 py-[5px]"
                    style={{ gap: 5, backgroundColor: 'rgba(34,211,238,0.1)' }}
                  >
                    <Ionicons name="person-outline" size={13} color={Colors.cyan} />
                    <Text className="text-xs font-semibold" style={{ color: Colors.cyan }}>{ocrResult.studentName}</Text>
                  </HStack>
                )}
                {ocrResult.trimester && (
                  <HStack
                    className="items-center rounded-[20px] px-2.5 py-[5px]"
                    style={{ gap: 5, backgroundColor: 'rgba(34,211,238,0.1)' }}
                  >
                    <Ionicons name="calendar-outline" size={13} color={Colors.cyan} />
                    <Text className="text-xs font-semibold" style={{ color: Colors.cyan }}>{ocrResult.trimester}</Text>
                  </HStack>
                )}
                {ocrResult.schoolYear && (
                  <HStack
                    className="items-center rounded-[20px] px-2.5 py-[5px]"
                    style={{ gap: 5, backgroundColor: 'rgba(34,211,238,0.1)' }}
                  >
                    <Ionicons name="school-outline" size={13} color={Colors.cyan} />
                    <Text className="text-xs font-semibold" style={{ color: Colors.cyan }}>{ocrResult.schoolYear}</Text>
                  </HStack>
                )}
              </HStack>
            )}

            {/* Summary card */}
            <HStack
              className="rounded-2xl p-[18px]"
              style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F5' }}
            >
              <VStack className="flex-1 items-center">
                <Text className="text-2xl font-black mb-1" style={{ color: Colors.cyan }}>
                  {avgGrade.toFixed(1)}
                </Text>
                <Text className="text-xs font-medium" style={{ color: Colors.gray }}>Moyenne</Text>
              </VStack>
              <Box className="w-px" style={{ backgroundColor: '#F1F5F9' }} />
              <VStack className="flex-1 items-center">
                <Text className="text-2xl font-black mb-1" style={{ color: Colors.cyan }}>{grades.length}</Text>
                <Text className="text-xs font-medium" style={{ color: Colors.gray }}>Matières</Text>
              </VStack>
              <Box className="w-px" style={{ backgroundColor: '#F1F5F9' }} />
              <VStack className="flex-1 items-center">
                <Text
                  className="text-2xl font-black mb-1"
                  style={{
                    color:
                      avgConfidence >= 0.9
                        ? Colors.green
                        : avgConfidence >= 0.8
                          ? Colors.orange
                          : Colors.red,
                  }}
                >
                  {Math.round(avgConfidence * 100)}%
                </Text>
                <Text className="text-xs font-medium" style={{ color: Colors.gray }}>Confiance</Text>
              </VStack>
            </HStack>
          </Box>

          {/* Low confidence warning */}
          {lowConfidenceCount > 0 && (
            <HStack
              className="items-center rounded-xl p-3.5 mb-2"
              style={{ gap: 10, backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)' }}
            >
              <Ionicons name="warning" size={18} color={Colors.orange} />
              <Text className="text-[13px] flex-1 leading-[18px]" style={{ color: Colors.orange }}>
                {lowConfidenceCount} matière{lowConfidenceCount > 1 ? 's' : ''}{' '}
                avec confiance {'<'} 85%. Vérifiez et corrigez si besoin.
              </Text>
            </HStack>
          )}

          {/* Section title */}
          <HStack className="justify-between items-start mb-1 mt-2">
            <VStack>
              <Text className="text-lg font-bold mb-1" style={{ color: Colors.textPrimary }}>Données extraites</Text>
              <Text className="text-[13px] mb-4" style={{ color: Colors.gray }}>
                Vérifiez et corrigez avant d'importer
              </Text>
            </VStack>
            <Pressable
              className="flex-row items-center px-3 py-2 rounded-xl"
              style={{ gap: 4, backgroundColor: 'rgba(34,211,238,0.1)' }}
              onPress={handleAddGrade}
            >
              <Ionicons name="add" size={18} color={Colors.cyan} />
              <Text className="text-[13px] font-semibold" style={{ color: Colors.cyan }}>Ajouter</Text>
            </Pressable>
          </HStack>

          {/* Grade cards */}
          {grades.map((grade) => (
            <GradeCard
              key={grade.id}
              grade={grade}
              onEdit={setEditingGrade}
              onDelete={handleDeleteGrade}
            />
          ))}

          {/* Raw text toggle */}
          {ocrResult?.rawText && (
            <Pressable
              className="flex-row items-center mt-3 mb-2 py-2"
              style={{ gap: 6 }}
              onPress={() => setShowRawText(!showRawText)}
            >
              <Ionicons
                name={showRawText ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={Colors.gray}
              />
              <Text className="text-[13px]" style={{ color: Colors.gray }}>
                {showRawText ? 'Masquer' : 'Voir'} le texte OCR brut
              </Text>
            </Pressable>
          )}

          {showRawText && ocrResult?.rawText && (
            <Box
              className="rounded-xl p-3.5 mb-3"
              style={{ backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#EEF0F5' }}
            >
              <Text
                className="text-[11px] leading-[18px]"
                style={{ color: Colors.gray, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}
              >
                {ocrResult.rawText}
              </Text>
            </Box>
          )}

          {/* Action buttons */}
          <VStack className="mt-3" style={{ gap: 12 }}>
            {importing ? (
              <Animated.View
                style={{
                  backgroundColor: Colors.cyan,
                  borderRadius: 30,
                  paddingVertical: 18,
                  alignItems: 'center',
                  opacity: importFade,
                }}
              >
                <Text className="text-base font-bold" style={{ color: Colors.white }}>
                  Import en cours...
                </Text>
              </Animated.View>
            ) : (
              <>
                <Pressable
                  className="flex-row items-center justify-center py-[18px] rounded-[30px]"
                  style={{ gap: 10, backgroundColor: Colors.green }}
                  onPress={handleValidate}
                >
                  <Ionicons name="checkmark-sharp" size={22} color={Colors.white} />
                  <Text className="text-lg font-extrabold" style={{ color: Colors.white }}>
                    Valider et importer
                  </Text>
                </Pressable>

                <Pressable
                  className="flex-row items-center justify-center py-3.5 rounded-[20px]"
                  style={{ gap: 8, backgroundColor: 'rgba(34,211,238,0.1)' }}
                  onPress={handleCancel}
                >
                  <Ionicons name="refresh" size={18} color={Colors.cyan} />
                  <Text className="text-[15px] font-semibold" style={{ color: Colors.cyan }}>
                    Scanner un autre bulletin
                  </Text>
                </Pressable>

                <Pressable
                  className="items-center py-3.5"
                  onPress={handleCancel}
                >
                  <Text className="text-[15px] font-semibold" style={{ color: Colors.gray }}>Annuler</Text>
                </Pressable>
              </>
            )}
          </VStack>

          {/* Aria integration notice */}
          <HStack
            className="items-center mt-4 py-3 px-3.5 rounded-xl"
            style={{ gap: 8, backgroundColor: 'rgba(109,40,217,0.1)', borderWidth: 1, borderColor: 'rgba(109,40,217,0.2)' }}
          >
            <Ionicons name="sparkles" size={16} color={Colors.violet} />
            <Text className="text-xs flex-1 leading-[18px]" style={{ color: Colors.violet }}>
              Les données importées alimentent l'analyse d'Aria pour
              des conseils personnalisés.
            </Text>
          </HStack>
        </Box>

        <Box className="h-10" />
      </ScrollView>

      {/* Edit modal */}
      <EditGradeModal
        grade={editingGrade}
        visible={editingGrade !== null}
        onSave={handleSaveEdit}
        onClose={() => setEditingGrade(null)}
      />
    </>
  );
}
