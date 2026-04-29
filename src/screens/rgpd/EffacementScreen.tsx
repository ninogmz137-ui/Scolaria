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
  Home,
} from 'lucide-react-native';
import { Colors, SCREEN_BACKGROUND } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_SCROLL_PADDING } from '../../components/FloatingTabBar';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { createDeletionRequest, cancelDeletionRequest, getDeletionRequests } from '../../services/rgpdService';
import GlassCard from '../../components/GlassCard';
import RgpdHero from '../../components/rgpd/RgpdHero';
import RgpdSectionLabel from '../../components/rgpd/RgpdSectionLabel';
import { ARIA_INDIGO } from '../../constants/theme';
import GradientButton from '../../components/shared/GradientButton';
import RgpdBottomSheet from '../../components/rgpd/RgpdBottomSheet';

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
    { id: '1', name: 'Lucas Moreau', avatar: '', classe: 'CM2 — École Voltaire' },
    { id: '2', name: 'Emma Moreau', avatar: '', classe: '6ème — Collège Hugo' },
    { id: 'all', name: 'Compte entier', avatar: '', classe: 'Suppression totale du compte famille' },
  ];

  const DATA_CATEGORIES: DataCategory[] = [
    { name: 'Notes & bulletins', Icon: Check, count: '47 notes, 3 bulletins', color: ARIA_INDIGO },
    { name: 'Agenda & événements', Icon: Calendar, count: '156 événements', color: ARIA_INDIGO },
    { name: 'Ressenti & bien-être', Icon: Heart, count: '89 check-ins', color: ARIA_INDIGO },
    { name: 'Profil & compétences', Icon: User, count: '5 compétences, 5 activités', color: ARIA_INDIGO },
    { name: 'Photos & médias', Icon: Camera, count: '24 photos', color: ARIA_INDIGO },
    { name: 'Conversations Aria', Icon: Sparkles, count: '34 conversations', color: ARIA_INDIGO },
    { name: "Journal d'accès", Icon: List, count: '210 entrées', color: ARIA_INDIGO },
    { name: 'Permissions & partages', Icon: Lock, count: '5 personnes', color: ARIA_INDIGO },
  ];

  const STEPS: DeletionStep[] = [
    { id: 1, title: 'Sélection', description: 'Choisissez le profil à supprimer', Icon: User, completed: currentStep > 0 },
    { id: 2, title: 'Aperçu', description: 'Vérifiez les données concernées', Icon: Info, completed: currentStep > 1 },
    { id: 3, title: 'Confirmation', description: 'Confirmez par email', Icon: Mail, completed: currentStep > 2 },
    { id: 4, title: 'Suppression', description: 'Exécution sous 72h', Icon: Trash2, completed: requestSent },
  ];

  const initials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (first + last).toUpperCase();
  };

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
    <RgpdBottomSheet>
      <Animated.View style={{ opacity: fadeAnim }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 56,
            paddingBottom: TAB_BAR_SCROLL_PADDING,
            paddingHorizontal: 18,
          }}
        >
          <RgpdHero
            Icon={AlertTriangle}
            title="Droit à l’effacement"
            subtitle="Article 17 — suppression définitive et irréversible des données personnelles sélectionnées."
          />

          {/* Steps progress */}
          <GlassCard style={[styles.cardBorder, { marginTop: 14, marginBottom: 24 }]}>
            <View style={[styles.stepsRow, { marginBottom: 0 }]}>
              {STEPS.map((step, i) => (
                <View key={step.id} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      step.completed && { backgroundColor: ARIA_INDIGO, borderColor: ARIA_INDIGO },
                      currentStep === i && !step.completed && { backgroundColor: ARIA_INDIGO, borderColor: ARIA_INDIGO },
                    ]}
                  >
                    {step.completed ? (
                      <Check size={14} color="#fff" />
                    ) : (
                      <Text style={[styles.stepNum, { color: currentStep === i ? '#fff' : Colors.textMuted }]}>{step.id}</Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, { color: currentStep >= i ? Colors.textPrimary : Colors.textMuted }]}>
                    {step.title}
                  </Text>
                  {i < STEPS.length - 1 && (
                    <View style={[styles.stepConnector, { backgroundColor: step.completed ? ARIA_INDIGO : '#E2E8F0' }]} />
                  )}
                </View>
              ))}
            </View>
          </GlassCard>

          {/* Step 1: Select child */}
          {currentStep === 0 && (
            <View>
              <RgpdSectionLabel style={{ marginBottom: 10 }}>Sélection</RgpdSectionLabel>
              <Text style={[styles.stepHeading, { marginBottom: 12 }]}>Quel profil supprimer ?</Text>
              <GlassCard noPadding style={[styles.cardBorder, { marginBottom: 14 }]}>
                {CHILDREN.map((child, i) => (
                  <Pressable
                    key={child.id}
                    style={[
                      styles.childRow,
                      i < CHILDREN.length - 1 && styles.rowBorder,
                      selectedChild === child.id && { backgroundColor: 'rgba(67,56,202,0.05)' },
                    ]}
                    onPress={() => setSelectedChild(child.id)}
                  >
                    <View style={[styles.childAvatar, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
                      {child.id === 'all' ? (
                        <Home size={18} color={Colors.textPrimary} />
                      ) : (
                        <Text style={styles.childAvatarText}>{initials(child.name)}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personName}>{child.name}</Text>
                      <Text style={styles.personRole}>{child.classe}</Text>
                    </View>
                    <View style={[styles.radioOuter, { borderColor: selectedChild === child.id ? ARIA_INDIGO : '#CBD5E1' }]}>
                      {selectedChild === child.id && (
                        <View style={[styles.radioInner, { backgroundColor: ARIA_INDIGO }]} />
                      )}
                    </View>
                  </Pressable>
                ))}
              </GlassCard>
              <Pressable
                onPress={() => selectedChild && setCurrentStep(1)}
                disabled={!selectedChild}
                style={({ pressed }) => [
                  styles.darkBtn,
                  (!selectedChild || pressed) && { opacity: !selectedChild ? 0.45 : 0.9 },
                ]}
              >
                <Text style={styles.darkBtnText}>Suivant</Text>
                <ArrowRight size={18} color="#FFFFFF" strokeWidth={2} />
              </Pressable>
            </View>
          )}

          {/* Step 2: Data preview */}
          {currentStep === 1 && (
            <View>
              <RgpdSectionLabel style={{ marginBottom: 10 }}>Aperçu</RgpdSectionLabel>
              <Text style={[styles.stepHeading, { marginBottom: 4 }]}>Données qui seront supprimées</Text>
              <Text style={styles.stepSubheading}>Toutes les données suivantes seront définitivement effacées :</Text>

              <GlassCard noPadding style={[styles.cardBorder, { marginBottom: 14 }]}>
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
              </GlassCard>

              {/* Export suggestion */}
              <GlassCard style={[styles.cardBorder, { borderColor: 'rgba(67,56,202,0.16)', marginBottom: 14 }]}>
                <View style={styles.infoRow}>
                  <ArrowDown size={20} color={ARIA_INDIGO} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.personName}>Exporter avant de supprimer</Text>
                    <Text style={styles.personRole}>Téléchargez une copie JSON + PDF avant la suppression.</Text>
                  </View>
                </View>
              </GlassCard>

              <View style={styles.navRow}>
                <Pressable style={styles.backBtn} onPress={() => setCurrentStep(0)}>
                  <ArrowLeft size={18} color="#1A2340" />
                  <Text style={styles.backBtnText}>Retour</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Pressable
                    onPress={() => setCurrentStep(2)}
                    style={({ pressed }) => [styles.darkBtn, pressed && { opacity: 0.9 }]}
                  >
                    <Text style={styles.darkBtnText}>Continuer</Text>
                    <ArrowRight size={18} color="#FFFFFF" strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* Step 3: Email confirmation */}
          {currentStep === 2 && (
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <RgpdSectionLabel style={{ marginBottom: 10 }}>Confirmation</RgpdSectionLabel>
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
              <GlassCard style={[styles.cardBorder, { marginBottom: 16 }]}>
                <View style={styles.infoRow}>
                  <Info size={18} color={ARIA_INDIGO} />
                  <Text style={[styles.noticeText, { flex: 1, marginLeft: 10 }]}>
                    Conformément à l'article 17 du RGPD, votre demande sera traitée sous 72 heures. Un email de confirmation sera envoyé à l'adresse du compte. Vous disposez de 48h pour annuler la demande après réception de l'email.
                  </Text>
                </View>
              </GlassCard>

              <View style={styles.navRow}>
                <Pressable style={styles.backBtn} onPress={() => setCurrentStep(1)}>
                  <ArrowLeft size={18} color="#1A2340" />
                  <Text style={styles.backBtnText}>Retour</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <GradientButton
                    label="Demander la suppression"
                    variant="destructive"
                    onPress={handleSubmitRequest}
                    leftIcon={<Trash2 size={18} color={Colors.red} strokeWidth={2} />}
                  />
                </View>
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

              <GlassCard style={[styles.cardBorder, { width: '100%', marginBottom: 20 }]}>
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
              </GlassCard>

              <Pressable
                style={[styles.cancelBtn, { borderColor: ARIA_INDIGO }]}
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
                <X size={18} color={ARIA_INDIGO} />
                <Text style={[styles.cancelBtnText, { color: ARIA_INDIGO }]}>Annuler la demande</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </RgpdBottomSheet>
  );
}

const styles = StyleSheet.create({
  cardBorder: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
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
  childAvatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(67,56,202,0.14)' },
  childAvatarText: { fontFamily: FontFamily.sansBold, fontSize: 14, color: Colors.textPrimary },
  personName: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: Colors.textPrimary },
  personRole: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
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
  noticeText: { fontFamily: FontFamily.sansRegular, fontSize: 11.5, lineHeight: 16, color: Colors.textSecondary },
  successState: { alignItems: 'center', paddingTop: 8 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successTitle: { fontFamily: FontFamily.sansBold, fontSize: 22, color: '#1A2340', marginBottom: 8 },
  successSubtitle: { fontFamily: FontFamily.sansRegular, fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6 },
  timelineLine: { marginLeft: 5, height: 24, borderLeftWidth: 2 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  cancelBtnText: { fontFamily: FontFamily.sansBold, fontSize: 15 },
  darkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    borderRadius: 14,
  },
  darkBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
