import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Animated, Alert, TextInput } from 'react-native';
import {
  Trash2,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Info,
  Mail,
  ArrowDown,
  X,
  User,
  Calendar,
  Camera,
  Heart,
  Sparkles,
  List,
  Lock,
} from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../../components/FloatingTabBar';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { createDeletionRequest, cancelDeletionRequest, getDeletionRequests } from '../../services/rgpdService';

// ─── Types ────────────────────────────────────────────────

interface DeletionStep {
  id: number;
  title: string;
  description: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  completed: boolean;
}

interface DataCategory {
  name: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  count: string;
  color: string;
}

// ─── Component ────────────────────────────────────────────

export default function EffacementScreen() {
  const { theme } = useChildTheme();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;
  const [currentStep, setCurrentStep] = useState(0);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const loadExistingRequests = useCallback(async () => {
    const requests = await getDeletionRequests();
    const pending = requests.find((r) => r.status === 'pending' || r.status === 'confirmed');
    if (pending) {
      setRequestSent(true);
      setRequestId(pending.id);
      setCurrentStep(4);
    }
  }, []);

  useEffect(() => {
    loadExistingRequests();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const CHILDREN = [
    { id: '1', name: 'Lucas Moreau', avatar: '👦', classe: 'CM2 — École Voltaire' },
    { id: '2', name: 'Emma Moreau', avatar: '👧', classe: '6ème — Collège Hugo' },
    { id: 'all', name: 'Compte entier', avatar: '🏠', classe: 'Suppression totale du compte famille' },
  ];

  const DATA_CATEGORIES: DataCategory[] = [
    { name: 'Notes & bulletins', Icon: Check, count: '47 notes, 3 bulletins', color: Colors.cyan },
    { name: 'Agenda & événements', Icon: Calendar, count: '156 événements', color: Colors.violet },
    { name: 'Ressenti & bien-être', Icon: Heart, count: '89 check-ins', color: Colors.pink },
    { name: 'Profil & compétences', Icon: User, count: '5 compétences, 5 activités', color: Colors.green },
    { name: 'Photos & médias', Icon: Camera, count: '24 photos', color: Colors.orange },
    { name: 'Conversations Aria', Icon: Sparkles, count: '34 conversations', color: Colors.violetLight },
    { name: 'Journal d\'accès', Icon: List, count: '210 entrées', color: Colors.cyan },
    { name: 'Permissions & partages', Icon: Lock, count: '5 personnes', color: Colors.green },
  ];

  const STEPS: DeletionStep[] = [
    { id: 1, title: 'Sélection', description: 'Choisissez le profil à supprimer', Icon: User, completed: currentStep > 0 },
    { id: 2, title: 'Aperçu', description: 'Vérifiez les données concernées', Icon: Info, completed: currentStep > 1 },
    { id: 3, title: 'Confirmation', description: 'Confirmez par email', Icon: Mail, completed: currentStep > 2 },
    { id: 4, title: 'Suppression', description: 'Exécution sous 72h', Icon: Trash2, completed: requestSent },
  ];

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmitRequest = () => {
    if (confirmEmail !== 'moreau.famille@email.fr') {
      shakeError();
      Alert.alert('Email incorrect', 'L\'email ne correspond pas à celui du compte.');
      return;
    }
    if (confirmText !== 'SUPPRIMER') {
      shakeError();
      Alert.alert('Confirmation requise', 'Veuillez saisir SUPPRIMER en majuscules.');
      return;
    }

    Alert.alert(
      'Dernière confirmation',
      'Cette action est IRRÉVERSIBLE. Un email de confirmation vous sera envoyé. La suppression sera effective sous 72 heures.\n\nVoulez-vous continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer la suppression',
          style: 'destructive',
          onPress: async () => {
            const result = await createDeletionRequest({
              child_id: selectedChild === 'all' ? null : selectedChild,
              scope: selectedChild === 'all' ? 'account' : 'child',
              confirm_email: confirmEmail,
            });
            if (result) setRequestId(result.id);
            setRequestSent(true);
            setCurrentStep(4);
          },
        },
      ]
    );
  };

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
          {/* Warning header */}
          <View style={[styles.card, { borderColor: Colors.red + '50', marginBottom: 14 }]}>
            <View style={styles.warningHeader}>
              <View style={[styles.warningIcon, { borderColor: Colors.red, backgroundColor: Colors.red + '10' }]}>
                <AlertTriangle size={32} color={Colors.red} />
              </View>
              <Text style={styles.warningTitle}>Droit à l'effacement</Text>
              <Text style={styles.warningSubtitle}>
                Article 17 du RGPD — Suppression définitive et irréversible de toutes les données personnelles
              </Text>
            </View>
          </View>

          {/* Steps progress */}
          <View style={styles.stepsRow}>
            {STEPS.map((step, i) => (
              <View key={step.id} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    step.completed && { backgroundColor: Colors.green, borderColor: Colors.green },
                    currentStep === i && !step.completed && { backgroundColor: Colors.violet, borderColor: Colors.violet },
                  ]}
                >
                  {step.completed
                    ? <Check size={14} color="#fff" />
                    : <Text style={[styles.stepNum, { color: currentStep === i ? '#fff' : '#CBD5E1' }]}>{step.id}</Text>
                  }
                </View>
                <Text style={[styles.stepLabel, { color: currentStep >= i ? '#1A2340' : '#CBD5E1' }]}>
                  {step.title}
                </Text>
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepConnector, { backgroundColor: step.completed ? Colors.green : '#E2E8F0' }]} />
                )}
              </View>
            ))}
          </View>

          {/* Step 1: Select child */}
          {currentStep === 0 && (
            <View>
              <Text style={[styles.stepHeading, { marginBottom: 12 }]}>Quel profil supprimer ?</Text>
              <View style={[styles.card, { marginBottom: 14, padding: 0 }]}>
                {CHILDREN.map((child, i) => (
                  <Pressable
                    key={child.id}
                    style={[
                      styles.childRow,
                      i < CHILDREN.length - 1 && styles.rowBorder,
                      selectedChild === child.id && { backgroundColor: Colors.red + '08' },
                    ]}
                    onPress={() => setSelectedChild(child.id)}
                  >
                    <View style={[styles.childAvatar, { backgroundColor: child.id === 'all' ? Colors.red + '10' : Colors.violet + '10' }]}>
                      <Text style={{ fontSize: 22 }}>{child.avatar}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personName}>{child.name}</Text>
                      <Text style={styles.personRole}>{child.classe}</Text>
                    </View>
                    <View style={[styles.radioOuter, { borderColor: selectedChild === child.id ? Colors.red : '#CBD5E1' }]}>
                      {selectedChild === child.id && (
                        <View style={[styles.radioInner, { backgroundColor: Colors.red }]} />
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: Colors.violet, opacity: selectedChild ? 1 : 0.4 }]}
                onPress={() => selectedChild && setCurrentStep(1)}
                disabled={!selectedChild}
              >
                <Text style={styles.primaryBtnText}>Suivant</Text>
                <ArrowRight size={18} color="#fff" />
              </Pressable>
            </View>
          )}

          {/* Step 2: Data preview */}
          {currentStep === 1 && (
            <View>
              <Text style={[styles.stepHeading, { marginBottom: 4 }]}>Données qui seront supprimées</Text>
              <Text style={styles.stepSubheading}>Toutes les données suivantes seront définitivement effacées :</Text>

              <View style={[styles.card, { marginBottom: 14, padding: 0 }]}>
                {DATA_CATEGORIES.map((cat, i) => (
                  <View
                    key={cat.name}
                    style={[styles.catRow, i < DATA_CATEGORIES.length - 1 && styles.rowBorder]}
                  >
                    <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                      <cat.Icon size={18} color={cat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personName}>{cat.name}</Text>
                      <Text style={styles.personRole}>{cat.count}</Text>
                    </View>
                    <Trash2 size={16} color={Colors.red + '80'} />
                  </View>
                ))}
              </View>

              {/* Export suggestion */}
              <View style={[styles.card, { borderColor: Colors.orange + '40', marginBottom: 14 }]}>
                <View style={styles.infoRow}>
                  <ArrowDown size={20} color={Colors.orange} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.personName}>Pensez à exporter vos données d'abord !</Text>
                    <Text style={styles.personRole}>Téléchargez une copie JSON + PDF avant la suppression.</Text>
                  </View>
                </View>
              </View>

              <View style={styles.navRow}>
                <Pressable style={styles.backBtn} onPress={() => setCurrentStep(0)}>
                  <ArrowLeft size={18} color="#1A2340" />
                  <Text style={styles.backBtnText}>Retour</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryBtn, { flex: 1, backgroundColor: Colors.violet }]}
                  onPress={() => setCurrentStep(2)}
                >
                  <Text style={styles.primaryBtnText}>Confirmer</Text>
                  <ArrowRight size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Step 3: Email confirmation */}
          {currentStep === 2 && (
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <Text style={[styles.stepHeading, { marginBottom: 4 }]}>Confirmation de suppression</Text>
              <Text style={[styles.stepSubheading, { marginBottom: 16 }]}>
                Pour des raisons de sécurité, confirmez votre identité.
              </Text>

              {/* Email input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email du compte</Text>
                <TextInput
                  style={styles.input}
                  placeholder="votre@email.fr"
                  placeholderTextColor="#CBD5E1"
                  value={confirmEmail}
                  onChangeText={setConfirmEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Confirm text */}
              <View style={[styles.inputGroup, { marginBottom: 14 }]}>
                <Text style={styles.inputLabel}>
                  Tapez{' '}
                  <Text style={{ color: Colors.red, fontFamily: FontFamily.sansBold }}>SUPPRIMER</Text>
                  {' '}pour confirmer
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="SUPPRIMER"
                  placeholderTextColor="#CBD5E1"
                  value={confirmText}
                  onChangeText={setConfirmText}
                  autoCapitalize="characters"
                />
              </View>

              {/* Legal notice */}
              <View style={[styles.card, { marginBottom: 16 }]}>
                <View style={styles.infoRow}>
                  <Info size={18} color={Colors.cyan} />
                  <Text style={[styles.noticeText, { flex: 1, marginLeft: 10 }]}>
                    Conformément à l'article 17 du RGPD, votre demande sera traitée sous 72 heures. Un email de confirmation sera envoyé à l'adresse du compte. Vous disposez de 48h pour annuler la demande après réception de l'email.
                  </Text>
                </View>
              </View>

              <View style={styles.navRow}>
                <Pressable style={styles.backBtn} onPress={() => setCurrentStep(1)}>
                  <ArrowLeft size={18} color="#1A2340" />
                  <Text style={styles.backBtnText}>Retour</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryBtn, { flex: 1, backgroundColor: Colors.red }]}
                  onPress={handleSubmitRequest}
                >
                  <Trash2 size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Demander la suppression</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Step 4: Confirmation sent */}
          {currentStep === 4 && requestSent && (
            <View style={styles.successState}>
              <View style={[styles.successIcon, { backgroundColor: Colors.cyan + '15' }]}>
                <Mail size={40} color={Colors.cyan} />
              </View>
              <Text style={styles.successTitle}>Demande envoyée</Text>
              <Text style={styles.successSubtitle}>
                Un email de confirmation a été envoyé à{'\n'}
                <Text style={{ color: Colors.cyan, fontFamily: FontFamily.sansBold }}>moreau.famille@email.fr</Text>
              </Text>

              <View style={[styles.card, { width: '100%', marginBottom: 20 }]}>
                {[
                  { color: Colors.green, label: 'Demande reçue', sub: 'Maintenant' },
                  { color: Colors.orange, label: 'Email de confirmation', sub: 'Dans quelques minutes' },
                  { color: Colors.violet, label: 'Période d\'annulation (48h)', sub: 'Vous pouvez encore annuler' },
                  { color: Colors.red, label: 'Suppression définitive', sub: 'Sous 72 heures' },
                ].map((item, i) => (
                  <View key={i}>
                    <View style={styles.timelineRow}>
                      <View style={[styles.timelineDot, { backgroundColor: item.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.personName}>{item.label}</Text>
                        <Text style={styles.personRole}>{item.sub}</Text>
                      </View>
                    </View>
                    {i < 3 && (
                      <View style={[styles.timelineLine, { borderLeftColor: '#E2E8F0' }]} />
                    )}
                  </View>
                ))}
              </View>

              <Pressable
                style={[styles.cancelBtn, { borderColor: Colors.green }]}
                onPress={async () => {
                  if (requestId) await cancelDeletionRequest(requestId);
                  Alert.alert('Annulation', 'Demande de suppression annulée avec succès.');
                  setRequestSent(false);
                  setRequestId(null);
                  setCurrentStep(0);
                  setConfirmEmail('');
                  setConfirmText('');
                  setSelectedChild(null);
                }}
              >
                <X size={18} color={Colors.green} />
                <Text style={[styles.cancelBtnText, { color: Colors.green }]}>Annuler la demande</Text>
              </Pressable>
            </View>
          )}
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
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  warningHeader: { alignItems: 'center', paddingVertical: 8 },
  warningIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginBottom: 12 },
  warningTitle: { fontFamily: FontFamily.sansBold, fontSize: 22, color: '#1A2340', marginBottom: 6 },
  warningSubtitle: { fontFamily: FontFamily.sansRegular, fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 24 },
  stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: 4, backgroundColor: 'transparent' },
  stepNum: { fontFamily: FontFamily.sansBold, fontSize: 12 },
  stepLabel: { fontFamily: FontFamily.sansSemiBold, fontSize: 10, textAlign: 'center' },
  stepConnector: { position: 'absolute', top: 14, left: '60%', right: '-40%', height: 2 },
  stepHeading: { fontFamily: FontFamily.sansBold, fontSize: 18, color: '#1A2340' },
  stepSubheading: { fontFamily: FontFamily.sansRegular, fontSize: 13, color: '#94A3B8', marginBottom: 14, lineHeight: 19 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  childRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  childAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  personName: { fontFamily: FontFamily.sansBold, fontSize: 14, color: '#1A2340' },
  personRole: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#94A3B8', marginTop: 1 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  primaryBtnText: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#fff' },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  backBtnText: { fontFamily: FontFamily.sansSemiBold, fontSize: 15, color: '#1A2340' },
  catRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  catIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: '#1A2340', marginBottom: 8 },
  input: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
    fontFamily: FontFamily.sansRegular,
    backgroundColor: '#F8FAFC',
    color: '#1A2340',
    borderColor: '#E2E8F0',
  },
  noticeText: { fontFamily: FontFamily.sansRegular, fontSize: 11, lineHeight: 16, color: '#94A3B8' },
  successState: { alignItems: 'center', paddingTop: 8 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successTitle: { fontFamily: FontFamily.sansBold, fontSize: 22, color: '#1A2340', marginBottom: 8 },
  successSubtitle: { fontFamily: FontFamily.sansRegular, fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6 },
  timelineLine: { marginLeft: 5, height: 24, borderLeftWidth: 2 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  cancelBtnText: { fontFamily: FontFamily.sansBold, fontSize: 15 },
});
