/**
 * Générateur d'appréciations — L'enseignant coche 3 compétences,
 * Aria rédige l'appréciation en 2 secondes.
 */

import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Clipboard as RNClipboard } from 'react-native';

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
): string {
  const compLabels = competences
    .map((id) => COMPETENCES.find((c) => c.id === id)?.label || '')
    .filter(Boolean);

  const templates: Record<Level, string[]> = {
    excellent: [
      `${studentName} fait preuve d'une excellente maîtrise en ${compLabels.slice(0, 2).join(' et ')}. ${compLabels[2] ? `Sa ${compLabels[2].toLowerCase()} est également remarquable. ` : ''}Un élève moteur pour la classe, dont l'investissement et la rigueur sont exemplaires. Continuez ainsi !`,
      `Trimestre remarquable pour ${studentName}. Les résultats en ${compLabels[0].toLowerCase()} témoignent d'un travail régulier et approfondi. ${compLabels[1] ? `La ${compLabels[1].toLowerCase()} est un vrai point fort. ` : ''}Félicitations pour cet engagement constant.`,
    ],
    bien: [
      `${studentName} réalise un bon trimestre. ${compLabels[0] ? `La ${compLabels[0].toLowerCase()} est satisfaisante` : 'Les résultats sont satisfaisants'}${compLabels[1] ? ` et la ${compLabels[1].toLowerCase()} est en bonne voie` : ''}. ${compLabels[2] ? `Un effort supplémentaire en ${compLabels[2].toLowerCase()} permettrait d'atteindre l'excellence. ` : ''}Bon travail, à poursuivre.`,
      `Bon ensemble pour ${studentName}. ${compLabels.slice(0, 2).map(l => l.toLowerCase()).join(' et ')} : des acquis solides. Pour progresser encore, il faudrait approfondir le travail personnel. Bilan positif.`,
    ],
    assez_bien: [
      `${studentName} obtient des résultats corrects mais irréguliers. ${compLabels[0] ? `En ${compLabels[0].toLowerCase()}, les bases sont acquises` : 'Les bases sont acquises'} mais ${compLabels[1] ? `la ${compLabels[1].toLowerCase()} demande plus d'attention` : 'un effort supplémentaire est nécessaire'}. ${compLabels[2] ? `La ${compLabels[2].toLowerCase()} doit être renforcée. ` : ''}Un travail plus régulier est attendu pour le prochain trimestre.`,
      `Trimestre en demi-teinte pour ${studentName}. Des capacités réelles en ${compLabels.slice(0, 2).map(l => l.toLowerCase()).join(' et ')} mais un manque de constance dans l'effort. Plus de rigueur et de concentration sont nécessaires.`,
    ],
    insuffisant: [
      `${studentName} rencontre des difficultés significatives ce trimestre. ${compLabels[0] ? `La ${compLabels[0].toLowerCase()} est fragile` : 'Les fondamentaux sont fragiles'}${compLabels[1] ? ` et la ${compLabels[1].toLowerCase()} nécessite un soutien renforcé` : ''}. ${compLabels[2] ? `Un accompagnement en ${compLabels[2].toLowerCase()} est recommandé. ` : ''}Un plan d'aide sera proposé. La famille est invitée à prendre contact.`,
      `Des résultats préoccupants pour ${studentName}. Les lacunes en ${compLabels.slice(0, 2).map(l => l.toLowerCase()).join(' et ')} doivent être comblées rapidement. Un dialogue avec la famille et un suivi personnalisé sont indispensables.`,
    ],
  };

  const pool = templates[level];
  let appreciation = pool[Math.floor(Math.random() * pool.length)];

  if (comment.trim()) {
    appreciation += ` Note personnelle : ${comment.trim()}`;
  }

  return appreciation;
}

// ─── Component ───────────────────────────────────────────

export default function AppreciationsScreen() {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedComps, setSelectedComps] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [appreciation, setAppreciation] = useState('');
  const [generating, setGenerating] = useState(false);
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

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setAppreciation('');

    // Bounce button
    Animated.sequence([
      Animated.timing(buttonPulse, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.spring(buttonPulse, { toValue: 1, tension: 200, friction: 5, useNativeDriver: true }),
    ]).start();

    // Simulate Aria generation (1.5s)
    await new Promise((r) => setTimeout(r, 1500));

    const student = STUDENTS.find((s) => s.id === selectedStudent);
    const text = generateAppreciation(student!.name, selectedLevel!, selectedComps, comment);
    setAppreciation(text);
    setGenerating(false);

    // Animate result
    resultFade.setValue(0);
    resultSlide.setValue(30);
    Animated.parallel([
      Animated.timing(resultFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(resultSlide, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const handleCopy = () => {
    try {
      RNClipboard.setString(appreciation);
    } catch {
      // Clipboard not available in some environments
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setSelectedLevel(null);
    setSelectedComps([]);
    setComment('');
    setAppreciation('');
  };

  // ─── Render ──────────────────────────────────────────

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.violet, Colors.blueNight]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.7 }}
        style={styles.header}
      >
        <Text style={styles.headerEmoji}>✍️</Text>
        <Text style={styles.headerTitle}>Générateur d'appréciations</Text>
        <Text style={styles.headerSubtitle}>
          Cochez les compétences, Aria rédige en 2 secondes
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* Step 1: Select student */}
        <View style={styles.section}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNumber}>1</Text>
          </View>
          <Text style={styles.sectionTitle}>Élève</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.studentsRow}>
              {STUDENTS.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.studentChip,
                    selectedStudent === s.id && styles.studentChipActive,
                  ]}
                  onPress={() => setSelectedStudent(s.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.studentAvatar}>{s.avatar}</Text>
                  <Text
                    style={[
                      styles.studentName,
                      selectedStudent === s.id && styles.studentNameActive,
                    ]}
                  >
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Step 2: Select level */}
        <View style={styles.section}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNumber}>2</Text>
          </View>
          <Text style={styles.sectionTitle}>Niveau général</Text>
          <View style={styles.levelsRow}>
            {LEVELS.map((l) => (
              <TouchableOpacity
                key={l.key}
                style={[
                  styles.levelChip,
                  selectedLevel === l.key && {
                    borderColor: l.color,
                    backgroundColor: l.color + '15',
                  },
                ]}
                onPress={() => setSelectedLevel(l.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.levelEmoji}>{l.emoji}</Text>
                <Text
                  style={[
                    styles.levelLabel,
                    selectedLevel === l.key && { color: l.color },
                  ]}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 3: Select competences (max 3) */}
        <View style={styles.section}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepNumber}>3</Text>
          </View>
          <Text style={styles.sectionTitle}>
            Compétences{' '}
            <Text style={styles.sectionHint}>
              ({selectedComps.length}/3)
            </Text>
          </Text>

          {(['savoir', 'savoir-faire', 'savoir-etre'] as const).map((cat) => (
            <View key={cat} style={styles.compCategory}>
              <Text style={styles.compCategoryTitle}>
                {CATEGORY_LABELS[cat]}
              </Text>
              <View style={styles.compChips}>
                {COMPETENCES.filter((c) => c.category === cat).map((comp) => {
                  const isSelected = selectedComps.includes(comp.id);
                  const isDisabled = !isSelected && selectedComps.length >= 3;
                  return (
                    <TouchableOpacity
                      key={comp.id}
                      style={[
                        styles.compChip,
                        isSelected && styles.compChipActive,
                        isDisabled && styles.compChipDisabled,
                      ]}
                      onPress={() => !isDisabled && toggleComp(comp.id)}
                      activeOpacity={isDisabled ? 1 : 0.7}
                    >
                      <Text style={styles.compEmoji}>{comp.emoji}</Text>
                      <Text
                        style={[
                          styles.compLabel,
                          isSelected && styles.compLabelActive,
                        ]}
                      >
                        {comp.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color={Colors.cyan} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Optional comment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Note personnelle <Text style={styles.optional}>(optionnel)</Text>
          </Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Ajouter un commentaire spécifique..."
            placeholderTextColor={Colors.gray}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={150}
          />
        </View>

        {/* Generate button */}
        <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
          <TouchableOpacity
            style={[styles.generateButton, !canGenerate && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={!canGenerate || generating}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={canGenerate ? [Colors.violet, Colors.cyanDark] : ['#333', '#222']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.generateGradient}
            >
              {generating ? (
                <>
                  <ActivityIndicator color={Colors.white} size="small" />
                  <Text style={styles.generateText}>Aria rédige...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.generateIcon}>✦</Text>
                  <Text style={styles.generateText}>Générer l'appréciation</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Result */}
        {appreciation !== '' && (
          <Animated.View
            style={[
              styles.resultCard,
              {
                opacity: resultFade,
                transform: [{ translateY: resultSlide }],
              },
            ]}
          >
            <View style={styles.resultHeader}>
              <View style={styles.resultAriaTag}>
                <Text style={styles.resultAriaIcon}>✦</Text>
                <Text style={styles.resultAriaLabel}>Aria</Text>
              </View>
              <Text style={styles.resultStudentName}>
                {STUDENTS.find((s) => s.id === selectedStudent)?.name}
              </Text>
            </View>

            <Text style={styles.resultText} selectable>
              {appreciation}
            </Text>

            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.resultAction} onPress={handleCopy}>
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={18}
                  color={copied ? Colors.green : Colors.cyan}
                />
                <Text style={[styles.resultActionText, copied && { color: Colors.green }]}>
                  {copied ? 'Copié !' : 'Copier'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resultAction} onPress={handleGenerate}>
                <Ionicons name="refresh" size={18} color={Colors.cyan} />
                <Text style={styles.resultActionText}>Reformuler</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resultAction} onPress={handleReset}>
                <Ionicons name="arrow-back" size={18} color={Colors.gray} />
                <Text style={[styles.resultActionText, { color: Colors.gray }]}>
                  Nouvel élève
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.blueNight },
  // Header
  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 24 },
  headerEmoji: { fontSize: 42, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: Colors.white, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
  // Body
  body: { paddingHorizontal: 20, paddingTop: 8 },
  section: { marginBottom: 24 },
  stepBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.violet + '30',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: { fontSize: 13, fontWeight: '800', color: Colors.violet },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.white, marginBottom: 12 },
  sectionHint: { color: Colors.cyan, fontWeight: '600' },
  optional: { fontSize: 13, fontWeight: '400', color: Colors.gray },
  // Students
  studentsRow: { flexDirection: 'row', gap: 8 },
  studentChip: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 14, backgroundColor: Colors.blueNightCard,
    borderWidth: 2, borderColor: 'transparent', minWidth: 72,
  },
  studentChipActive: { borderColor: Colors.cyan, backgroundColor: Colors.cyan + '12' },
  studentAvatar: { fontSize: 28, marginBottom: 4 },
  studentName: { fontSize: 12, fontWeight: '600', color: Colors.gray },
  studentNameActive: { color: Colors.cyan },
  // Levels
  levelsRow: { flexDirection: 'row', gap: 8 },
  levelChip: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: 14, backgroundColor: Colors.blueNightCard,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.06)',
  },
  levelEmoji: { fontSize: 22, marginBottom: 4 },
  levelLabel: { fontSize: 11, fontWeight: '700', color: Colors.gray },
  // Competences
  compCategory: { marginBottom: 14 },
  compCategoryTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.cyan,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  compChips: { gap: 6 },
  compChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, backgroundColor: Colors.blueNightCard,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  compChipActive: { borderColor: Colors.cyan + '50', backgroundColor: Colors.cyan + '10' },
  compChipDisabled: { opacity: 0.35 },
  compEmoji: { fontSize: 18 },
  compLabel: { flex: 1, fontSize: 14, color: Colors.gray, fontWeight: '500' },
  compLabelActive: { color: Colors.white, fontWeight: '600' },
  // Comment
  commentInput: {
    backgroundColor: Colors.blueNightCard, borderRadius: 14,
    padding: 14, color: Colors.white, fontSize: 14,
    minHeight: 60, textAlignVertical: 'top',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  // Generate
  generateButton: { borderRadius: 30, overflow: 'hidden', marginBottom: 20 },
  generateButtonDisabled: { opacity: 0.5 },
  generateGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  generateIcon: { fontSize: 20, color: Colors.cyan },
  generateText: { fontSize: 17, fontWeight: '800', color: Colors.white },
  // Result
  resultCard: {
    backgroundColor: Colors.blueNightCard, borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: Colors.violet + '30',
  },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  resultAriaTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.violet + '20', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 10,
  },
  resultAriaIcon: { fontSize: 14, color: Colors.cyan },
  resultAriaLabel: { fontSize: 12, fontWeight: '700', color: Colors.violet },
  resultStudentName: { fontSize: 14, fontWeight: '700', color: Colors.white },
  resultText: {
    fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 23,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  resultActions: {
    flexDirection: 'row', gap: 12, marginTop: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
  },
  resultAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  resultActionText: { fontSize: 13, fontWeight: '600', color: Colors.cyan },
});
