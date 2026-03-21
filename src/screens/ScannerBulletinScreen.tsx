import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

// ─── Types ────────────────────────────────────────────────

interface ExtractedGrade {
  id: string;
  subject: string;
  emoji: string;
  grade: number;
  maxGrade: number;
  classAvg: number;
  appreciation: string;
  confidence: number; // OCR confidence 0-1
}

type ScreenState = 'select' | 'scanning' | 'preview';
type ImportSource = 'camera' | 'gallery' | 'pdf';

// ─── Mock OCR data ────────────────────────────────────────

const MOCK_EXTRACTED: ExtractedGrade[] = [
  {
    id: '1',
    subject: 'Mathématiques',
    emoji: '📐',
    grade: 15.5,
    maxGrade: 20,
    classAvg: 12.3,
    appreciation: 'Bon trimestre. Lucas progresse en géométrie, efforts à poursuivre en calcul.',
    confidence: 0.97,
  },
  {
    id: '2',
    subject: 'Français',
    emoji: '📖',
    grade: 14,
    maxGrade: 20,
    classAvg: 13.1,
    appreciation: 'Bonne participation à l\'oral. L\'expression écrite est en progrès.',
    confidence: 0.95,
  },
  {
    id: '3',
    subject: 'Histoire-Géo',
    emoji: '🏛️',
    grade: 16,
    maxGrade: 20,
    classAvg: 11.8,
    appreciation: 'Excellent travail. Très bonne maîtrise des repères chronologiques.',
    confidence: 0.93,
  },
  {
    id: '4',
    subject: 'Sciences',
    emoji: '🔬',
    grade: 13,
    maxGrade: 20,
    classAvg: 12.5,
    appreciation: 'Résultats corrects. Doit approfondir les méthodes expérimentales.',
    confidence: 0.88,
  },
  {
    id: '5',
    subject: 'Anglais',
    emoji: '🇬🇧',
    grade: 17,
    maxGrade: 20,
    classAvg: 13.7,
    appreciation: 'Très bon niveau. Excellente compréhension orale.',
    confidence: 0.96,
  },
  {
    id: '6',
    subject: 'EPS',
    emoji: '⚽',
    grade: 15,
    maxGrade: 20,
    classAvg: 14.2,
    appreciation: 'Bonne implication et esprit d\'équipe.',
    confidence: 0.91,
  },
];

// ─── Scanning animation ──────────────────────────────────

function ScanningState({ onComplete }: { onComplete: () => void }) {
  const scanLine = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Scan line animation
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

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start();

    // Progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onComplete();
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [scanLine, pulse, onComplete]);

  const clampedProgress = Math.min(progress, 100);

  return (
    <View style={scanStyles.container}>
      <Animated.View
        style={[scanStyles.docPreview, { transform: [{ scale: pulse }] }]}
      >
        <View style={scanStyles.docInner}>
          <View style={scanStyles.docLine} />
          <View style={scanStyles.docLine} />
          <View style={[scanStyles.docLine, { width: '60%' }]} />
          <View style={{ height: 12 }} />
          <View style={scanStyles.docLine} />
          <View style={scanStyles.docLine} />
          <View style={[scanStyles.docLine, { width: '75%' }]} />
          <View style={{ height: 12 }} />
          <View style={scanStyles.docLine} />
          <View style={[scanStyles.docLine, { width: '50%' }]} />

          {/* Scan line */}
          <Animated.View
            style={[
              scanStyles.scanLine,
              {
                transform: [
                  {
                    translateY: scanLine.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 180],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      </Animated.View>

      <Text style={scanStyles.title}>Analyse en cours...</Text>
      <Text style={scanStyles.subtitle}>Extraction des matières et notes</Text>

      {/* Progress bar */}
      <View style={scanStyles.progressBar}>
        <View
          style={[scanStyles.progressFill, { width: `${clampedProgress}%` }]}
        />
      </View>
      <Text style={scanStyles.progressText}>{Math.round(clampedProgress)}%</Text>

      {/* Steps */}
      <View style={scanStyles.steps}>
        {[
          { label: 'Détection du document', done: clampedProgress > 20 },
          { label: 'Lecture OCR', done: clampedProgress > 50 },
          { label: 'Extraction des notes', done: clampedProgress > 75 },
          { label: 'Vérification', done: clampedProgress >= 100 },
        ].map((step, i) => (
          <View key={i} style={scanStyles.stepRow}>
            <Ionicons
              name={step.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={step.done ? Colors.cyan : Colors.gray}
            />
            <Text
              style={[scanStyles.stepText, step.done && scanStyles.stepDone]}
            >
              {step.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const scanStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 30,
  },
  docPreview: {
    width: 200,
    height: 260,
    backgroundColor: Colors.blueNightCard,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 30,
    overflow: 'hidden',
  },
  docInner: {
    flex: 1,
  },
  docLine: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  scanLine: {
    position: 'absolute',
    left: -20,
    right: -20,
    height: 2,
    backgroundColor: Colors.cyan,
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 24,
  },
  progressBar: {
    width: '80%',
    height: 6,
    backgroundColor: Colors.blueNightCard,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.cyan,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.cyan,
    marginBottom: 24,
  },
  steps: {
    alignSelf: 'stretch',
    paddingHorizontal: 40,
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepText: {
    fontSize: 14,
    color: Colors.gray,
  },
  stepDone: {
    color: Colors.white,
  },
});

// ─── Grade preview card ──────────────────────────────────

function GradeCard({
  grade,
  onEdit,
}: {
  grade: ExtractedGrade;
  onEdit: (id: string) => void;
}) {
  const gradeRatio = grade.grade / grade.maxGrade;
  const gradeColor =
    gradeRatio >= 0.75 ? Colors.green : gradeRatio >= 0.5 ? Colors.orange : Colors.red;
  const confidenceColor =
    grade.confidence >= 0.9 ? Colors.green : grade.confidence >= 0.8 ? Colors.orange : Colors.red;

  return (
    <View style={cardStyles.container}>
      {/* Header row */}
      <View style={cardStyles.header}>
        <View style={cardStyles.subjectRow}>
          <Text style={cardStyles.emoji}>{grade.emoji}</Text>
          <Text style={cardStyles.subject}>{grade.subject}</Text>
        </View>
        <View style={cardStyles.gradeBox}>
          <Text style={[cardStyles.grade, { color: gradeColor }]}>
            {grade.grade}
          </Text>
          <Text style={cardStyles.maxGrade}>/{grade.maxGrade}</Text>
        </View>
      </View>

      {/* Class average */}
      <View style={cardStyles.avgRow}>
        <Text style={cardStyles.avgLabel}>Moy. classe :</Text>
        <Text style={cardStyles.avgValue}>{grade.classAvg}/20</Text>
        {grade.grade > grade.classAvg && (
          <View style={cardStyles.aboveAvg}>
            <Ionicons name="arrow-up" size={12} color={Colors.green} />
            <Text style={cardStyles.aboveAvgText}>
              +{(grade.grade - grade.classAvg).toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Appreciation */}
      <Text style={cardStyles.appreciation}>{grade.appreciation}</Text>

      {/* Footer */}
      <View style={cardStyles.footer}>
        <View style={cardStyles.confidenceRow}>
          <View
            style={[cardStyles.confidenceDot, { backgroundColor: confidenceColor }]}
          />
          <Text style={cardStyles.confidenceText}>
            Confiance : {Math.round(grade.confidence * 100)}%
          </Text>
        </View>
        <TouchableOpacity
          style={cardStyles.editButton}
          onPress={() => onEdit(grade.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={14} color={Colors.cyan} />
          <Text style={cardStyles.editText}>Corriger</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.blueNightCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  emoji: {
    fontSize: 22,
  },
  subject: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  gradeBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  grade: {
    fontSize: 28,
    fontWeight: '900',
  },
  maxGrade: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: '600',
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  avgLabel: {
    fontSize: 13,
    color: Colors.gray,
  },
  avgValue: {
    fontSize: 13,
    color: Colors.lightGray,
    fontWeight: '600',
  },
  aboveAvg: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52,211,153,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  aboveAvgText: {
    fontSize: 12,
    color: Colors.green,
    fontWeight: '700',
  },
  appreciation: {
    fontSize: 13,
    color: Colors.lightGray,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 12,
    paddingLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: Colors.violet,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: Colors.gray,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(34,211,238,0.1)',
  },
  editText: {
    fontSize: 12,
    color: Colors.cyan,
    fontWeight: '600',
  },
});

// ─── Main screen ─────────────────────────────────────────

export default function ScannerBulletinScreen() {
  const [state, setState] = useState<ScreenState>('select');
  const [source, setSource] = useState<ImportSource | null>(null);

  const handleSelectSource = (s: ImportSource) => {
    setSource(s);
    setState('scanning');
  };

  const handleScanComplete = () => {
    setState('preview');
  };

  const handleValidate = () => {
    setState('select');
    setSource(null);
  };

  const handleCancel = () => {
    setState('select');
    setSource(null);
  };

  const handleEditGrade = (id: string) => {
    console.log('Edit grade:', id);
  };

  const avgGrade =
    MOCK_EXTRACTED.reduce((sum, g) => sum + g.grade, 0) / MOCK_EXTRACTED.length;

  // ─── Select source ───────────────────────────────
  if (state === 'select') {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <LinearGradient
            colors={[Colors.violet, Colors.blueNight]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroIconCircle}>
              <Ionicons name="scan" size={48} color={Colors.white} />
            </View>
            <Text style={styles.heroTitle}>Scanner un bulletin</Text>
            <Text style={styles.heroSubtitle}>
              Importez un bulletin scolaire et{'\n'}les données seront extraites
              automatiquement
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.body}>
          {/* Import options */}
          <Text style={styles.sectionTitle}>Choisir une source</Text>

          <TouchableOpacity
            style={styles.sourceCard}
            onPress={() => handleSelectSource('camera')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[Colors.violet, Colors.violetDark]}
              style={styles.sourceIcon}
            >
              <Ionicons name="camera" size={28} color={Colors.white} />
            </LinearGradient>
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceTitle}>Prendre en photo</Text>
              <Text style={styles.sourceDesc}>
                Photographiez le bulletin avec votre caméra
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sourceCard}
            onPress={() => handleSelectSource('gallery')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[Colors.cyan, Colors.cyanDark]}
              style={styles.sourceIcon}
            >
              <Ionicons name="images" size={28} color={Colors.white} />
            </LinearGradient>
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceTitle}>Depuis la galerie</Text>
              <Text style={styles.sourceDesc}>
                Sélectionnez une photo existante
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sourceCard}
            onPress={() => handleSelectSource('pdf')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[Colors.orange, '#E5A100']}
              style={styles.sourceIcon}
            >
              <Ionicons name="document-text" size={28} color={Colors.white} />
            </LinearGradient>
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceTitle}>Importer un PDF</Text>
              <Text style={styles.sourceDesc}>
                Bulletin numérique depuis vos fichiers
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </TouchableOpacity>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Ionicons name="bulb" size={20} color={Colors.orange} />
            <View style={styles.tipsContent}>
              <Text style={styles.tipsTitle}>Conseils pour un bon scan</Text>
              <Text style={styles.tipsText}>
                • Posez le bulletin sur une surface plane{'\n'}
                • Assurez un bon éclairage, sans reflets{'\n'}
                • Cadrez l'ensemble du document
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  // ─── Scanning ────────────────────────────────────
  if (state === 'scanning') {
    return (
      <View style={styles.container}>
        <View style={styles.body}>
          <ScanningState onComplete={handleScanComplete} />
        </View>
      </View>
    );
  }

  // ─── Preview extracted data ──────────────────────
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.body}>
        {/* Success header */}
        <View style={styles.previewHeader}>
          <View style={styles.successBadge}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.green} />
            <Text style={styles.successText}>
              {MOCK_EXTRACTED.length} matières détectées
            </Text>
          </View>

          {/* Summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{avgGrade.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Moyenne</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{MOCK_EXTRACTED.length}</Text>
              <Text style={styles.summaryLabel}>Matières</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: Colors.green }]}>
                {Math.round(
                  (MOCK_EXTRACTED.reduce((s, g) => s + g.confidence, 0) /
                    MOCK_EXTRACTED.length) *
                    100,
                )}%
              </Text>
              <Text style={styles.summaryLabel}>Confiance</Text>
            </View>
          </View>
        </View>

        {/* Section title */}
        <Text style={styles.sectionTitle}>Données extraites</Text>
        <Text style={styles.sectionSubtitle}>
          Vérifiez et corrigez si nécessaire avant d'importer
        </Text>

        {/* Grade cards */}
        {MOCK_EXTRACTED.map((grade) => (
          <GradeCard
            key={grade.id}
            grade={grade}
            onEdit={handleEditGrade}
          />
        ))}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.validateButton}
            onPress={handleValidate}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-sharp" size={22} color={Colors.white} />
            <Text style={styles.validateText}>Valider et importer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Main styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueNight,
  },
  heroSection: {
    marginBottom: 8,
  },
  heroGradient: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 40,
  },
  heroIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  body: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.gray,
    marginBottom: 16,
  },
  // Source cards
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blueNightCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sourceIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 3,
  },
  sourceDesc: {
    fontSize: 13,
    color: Colors.gray,
  },
  // Tips
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.15)',
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.orange,
    marginBottom: 6,
  },
  tipsText: {
    fontSize: 13,
    color: Colors.gray,
    lineHeight: 20,
  },
  // Preview header
  previewHeader: {
    marginTop: 16,
    marginBottom: 16,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.green,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.blueNightCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.cyan,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.gray,
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  // Actions
  actions: {
    marginTop: 12,
    gap: 12,
  },
  validateButton: {
    backgroundColor: Colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 30,
  },
  validateText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelText: {
    fontSize: 15,
    color: Colors.gray,
    fontWeight: '600',
  },
});
