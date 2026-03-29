import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollView, Animated, Alert, TextInput, Platform } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import { createDeletionRequest, cancelDeletionRequest, getDeletionRequests, getChildDataCounts } from '../../services/rgpdService';

// ─── Types ────────────────────────────────────────────────

interface DeletionStep {
  id: number;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  completed: boolean;
}

interface DataCategory {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: string;
  color: string;
  details: string;
}

// ─── Shadow & helpers ─────────────────────────────────────

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
});

// ─── Component ────────────────────────────────────────────

export default function EffacementScreen() {
  const { theme } = useChildTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [showDataPreview, setShowDataPreview] = useState(false);
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
    { name: 'Notes & bulletins', icon: 'school', count: '47 notes, 3 bulletins', color: Colors.cyan, details: 'Toutes les notes enregistrées et bulletins scannés' },
    { name: 'Agenda & événements', icon: 'calendar', count: '156 événements', color: Colors.violet, details: 'Événements scolaires, devoirs, sorties' },
    { name: 'Ressenti & bien-être', icon: 'heart', count: '89 check-ins', color: Colors.pink, details: 'Historique du Score de Joie et messages' },
    { name: 'Profil & compétences', icon: 'person', count: '5 compétences, 5 activités', color: Colors.green, details: 'Radar, portfolio, Super-Pouvoir' },
    { name: 'Photos & médias', icon: 'camera', count: '24 photos', color: Colors.orange, details: 'Photos de vie de classe et galerie' },
    { name: 'Conversations Aria', icon: 'sparkles', count: '34 conversations', color: Colors.violetLight, details: 'Historique des échanges avec l\'IA' },
    { name: 'Journal d\'accès', icon: 'list', count: '210 entrées', color: Colors.cyan, details: 'Logs de consultation et modifications' },
    { name: 'Permissions & partages', icon: 'shield', count: '5 personnes', color: Colors.green, details: 'Autorisations d\'accès configurées' },
  ];

  const STEPS: DeletionStep[] = [
    { id: 1, title: 'Sélection', description: 'Choisissez le profil à supprimer', icon: 'person', completed: currentStep > 0 },
    { id: 2, title: 'Aperçu', description: 'Vérifiez les données concernées', icon: 'eye', completed: currentStep > 1 },
    { id: 3, title: 'Confirmation', description: 'Confirmez par email', icon: 'mail', completed: currentStep > 2 },
    { id: 4, title: 'Suppression', description: 'Exécution sous 72h', icon: 'trash', completed: requestSent },
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
      '⚠️ Dernière confirmation',
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
      <ScrollView style={{ flex: 1, backgroundColor: '#E8EDF5' }} showsVerticalScrollIndicator={false}>
        {/* Warning header */}
        <LinearGradient
          colors={[Colors.red + '30', '#E8EDF5']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 20, paddingHorizontal: 20 }}
        >
          <Box
            className="w-16 h-16 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: Colors.red + '15', borderWidth: 1.5, borderColor: Colors.red }}
          >
            <Ionicons name="warning" size={32} color={Colors.red} />
          </Box>
          <Text className="text-[22px] font-black mb-1.5" style={{ color: theme.textPrimary }}>Droit à l'effacement</Text>
          <Text className="text-[13px] text-center leading-[19px]" style={{ color: theme.textMuted }}>
            Article 17 du RGPD — Suppression définitive et irréversible de toutes les données personnelles
          </Text>
        </LinearGradient>

        {/* Steps progress */}
        <HStack className="justify-between px-5 mb-6">
          {STEPS.map((step, i) => (
            <VStack key={step.id} className="items-center flex-1">
              <Box
                className="w-7 h-7 rounded-full border-2 items-center justify-center mb-1"
                style={[
                  { borderColor: Colors.gray, backgroundColor: 'transparent' },
                  step.completed && { backgroundColor: Colors.green, borderColor: Colors.green },
                  currentStep === i && !step.completed && { backgroundColor: Colors.violet, borderColor: Colors.violet },
                ]}
              >
                {step.completed ? (
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
                ) : (
                  <Text className="text-xs font-bold" style={{ color: currentStep === i ? Colors.white : Colors.gray }}>{step.id}</Text>
                )}
              </Box>
              <Text className="text-[10px] font-semibold" style={{ color: currentStep >= i ? theme.textPrimary : theme.textMuted }}>
                {step.title}
              </Text>
              {i < STEPS.length - 1 && (
                <Box
                  className="absolute top-3.5 -right-5 w-10 h-0.5"
                  style={{ backgroundColor: step.completed ? Colors.green : Colors.darkGray }}
                />
              )}
            </VStack>
          ))}
        </HStack>

        {/* Step 1: Select child */}
        {currentStep === 0 && (
          <Box className="px-5">
            <Text className="text-lg font-extrabold mb-2" style={{ color: theme.textPrimary }}>Quel profil supprimer ?</Text>
            <Box
              className="rounded-2xl border overflow-hidden mb-4"
              style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW }}
            >
              {CHILDREN.map((child, i) => (
                <Pressable
                  key={child.id}
                  className="flex-row items-center p-3.5 gap-3"
                  style={[
                    i < CHILDREN.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
                    selectedChild === child.id && { backgroundColor: Colors.red + '08' },
                  ]}
                  onPress={() => setSelectedChild(child.id)}
                >
                  <Box
                    className="w-11 h-11 rounded-full items-center justify-center"
                    style={{ backgroundColor: child.id === 'all' ? Colors.red + '15' : 'rgba(109,40,217,0.15)' }}
                  >
                    <Text className="text-[22px]">{child.avatar}</Text>
                  </Box>
                  <Box className="flex-1">
                    <Text className="text-[15px] font-bold" style={{ color: theme.textPrimary }}>{child.name}</Text>
                    <Text className="text-xs mt-px" style={{ color: theme.textMuted }}>{child.classe}</Text>
                  </Box>
                  <Box
                    className="w-[22px] h-[22px] rounded-full border-2 items-center justify-center"
                    style={{ borderColor: selectedChild === child.id ? Colors.red : Colors.gray }}
                  >
                    {selectedChild === child.id && (
                      <Box className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.red }} />
                    )}
                  </Box>
                </Pressable>
              ))}
            </Box>

            <Pressable
              className="flex-row items-center justify-center gap-2 py-4 px-6 rounded-[14px]"
              style={[{ backgroundColor: Colors.violet }, !selectedChild && { opacity: 0.4 }]}
              onPress={() => selectedChild && setCurrentStep(1)}
              disabled={!selectedChild}
            >
              <Text className="text-[15px] font-bold text-white">Suivant</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </Pressable>
          </Box>
        )}

        {/* Step 2: Data preview */}
        {currentStep === 1 && (
          <Box className="px-5">
            <Text className="text-lg font-extrabold mb-2" style={{ color: theme.textPrimary }}>Données qui seront supprimées</Text>
            <Text className="text-[13px] mb-4 leading-[19px]" style={{ color: theme.textMuted }}>
              Toutes les données suivantes seront définitivement effacées :
            </Text>

            <Box
              className="rounded-2xl border overflow-hidden mb-4"
              style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW }}
            >
              {DATA_CATEGORIES.map((cat, i) => (
                <HStack
                  key={cat.name}
                  className="items-center p-3.5 gap-3"
                  style={i < DATA_CATEGORIES.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.cardBorder } : undefined}
                >
                  <Box
                    className="w-9 h-9 rounded-[10px] items-center justify-center"
                    style={{ backgroundColor: cat.color + '15' }}
                  >
                    <Ionicons name={cat.icon} size={18} color={cat.color} />
                  </Box>
                  <Box className="flex-1">
                    <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{cat.name}</Text>
                    <Text className="text-xs mt-px" style={{ color: theme.textMuted }}>{cat.count}</Text>
                  </Box>
                  <Ionicons name="trash-outline" size={16} color={Colors.red + '60'} />
                </HStack>
              ))}
            </Box>

            {/* Export suggestion */}
            <HStack
              className="items-center gap-3 p-3.5 rounded-[14px] border mb-4"
              style={{ backgroundColor: Colors.orange + '12', borderColor: Colors.orange + '30' }}
            >
              <Ionicons name="download" size={20} color={Colors.orange} />
              <Box className="flex-1">
                <Text className="text-sm font-bold" style={{ color: theme.textPrimary }}>
                  Pensez à exporter vos données d'abord !
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                  Téléchargez une copie JSON + PDF avant la suppression.
                </Text>
              </Box>
            </HStack>

            <HStack className="gap-3 mt-1">
              <Pressable
                className="flex-row items-center justify-center gap-1.5 px-5 py-4 rounded-[14px] border"
                style={{ borderColor: theme.cardBorder }}
                onPress={() => setCurrentStep(0)}
              >
                <Ionicons name="arrow-back" size={18} color={theme.textPrimary} />
                <Text className="text-[15px] font-semibold" style={{ color: theme.textPrimary }}>Retour</Text>
              </Pressable>
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-2 py-4 rounded-[14px]"
                style={{ backgroundColor: Colors.violet }}
                onPress={() => setCurrentStep(2)}
              >
                <Text className="text-[15px] font-bold text-white">Confirmer</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </Pressable>
            </HStack>
          </Box>
        )}

        {/* Step 3: Email confirmation */}
        {currentStep === 2 && (
          <Animated.View style={[{ paddingHorizontal: 20 }, { transform: [{ translateX: shakeAnim }] }]}>
            <Text className="text-lg font-extrabold mb-2" style={{ color: theme.textPrimary }}>Confirmation de suppression</Text>
            <Text className="text-[13px] mb-4 leading-[19px]" style={{ color: theme.textMuted }}>
              Pour des raisons de sécurité, confirmez votre identité.
            </Text>

            {/* Email input */}
            <Box className="mb-4">
              <Text className="text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>Email du compte</Text>
              <TextInput
                style={{
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  fontSize: 16,
                  backgroundColor: theme.card,
                  color: theme.textPrimary,
                  borderColor: theme.cardBorder,
                }}
                placeholder="votre@email.fr"
                placeholderTextColor={Colors.gray}
                value={confirmEmail}
                onChangeText={setConfirmEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Box>

            {/* Confirm text */}
            <Box className="mb-4">
              <Text className="text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>
                Tapez <Text style={{ color: Colors.red, fontWeight: '900' }}>SUPPRIMER</Text> pour confirmer
              </Text>
              <TextInput
                style={{
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  fontSize: 16,
                  backgroundColor: theme.card,
                  color: theme.textPrimary,
                  borderColor: theme.cardBorder,
                }}
                placeholder="SUPPRIMER"
                placeholderTextColor={Colors.gray}
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
              />
            </Box>

            {/* Legal notice */}
            <HStack
              className="items-start gap-2.5 p-3.5 rounded-[14px] border mb-4"
              style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW }}
            >
              <Ionicons name="information-circle" size={18} color={Colors.cyan} />
              <Text className="flex-1 text-[11px] leading-4" style={{ color: theme.textMuted }}>
                Conformément à l'article 17 du RGPD, votre demande sera traitée sous 72 heures. Un email de confirmation sera envoyé à l'adresse du compte. Vous disposez de 48h pour annuler la demande après réception de l'email.
              </Text>
            </HStack>

            <HStack className="gap-3 mt-1">
              <Pressable
                className="flex-row items-center justify-center gap-1.5 px-5 py-4 rounded-[14px] border"
                style={{ borderColor: theme.cardBorder }}
                onPress={() => setCurrentStep(1)}
              >
                <Ionicons name="arrow-back" size={18} color={theme.textPrimary} />
                <Text className="text-[15px] font-semibold" style={{ color: theme.textPrimary }}>Retour</Text>
              </Pressable>
              <Pressable
                className="flex-1 flex-row items-center justify-center gap-2 py-4 rounded-[14px]"
                style={{ backgroundColor: Colors.red }}
                onPress={handleSubmitRequest}
              >
                <Ionicons name="trash" size={18} color={Colors.white} />
                <Text className="text-[15px] font-bold text-white">Demander la suppression</Text>
              </Pressable>
            </HStack>
          </Animated.View>
        )}

        {/* Step 4: Confirmation sent */}
        {currentStep === 4 && requestSent && (
          <VStack className="px-5 items-center py-4">
            <Box
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: Colors.cyan + '15' }}
            >
              <Ionicons name="mail" size={40} color={Colors.cyan} />
            </Box>
            <Text className="text-[22px] font-black mb-2" style={{ color: theme.textPrimary }}>Demande envoyée</Text>
            <Text className="text-sm text-center leading-5 mb-6" style={{ color: theme.textMuted }}>
              Un email de confirmation a été envoyé à{'\n'}
              <Text style={{ color: Colors.cyan, fontWeight: '700' }}>moreau.famille@email.fr</Text>
            </Text>

            <Box
              className="w-full p-5 rounded-2xl border mb-5"
              style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW }}
            >
              <HStack className="items-center gap-3">
                <Box className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.green }} />
                <Box className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Demande reçue</Text>
                  <Text className="text-xs" style={{ color: theme.textMuted }}>Maintenant</Text>
                </Box>
              </HStack>
              <Box className="ml-[5px] h-6 border-l-2" style={{ borderLeftColor: theme.cardBorder }} />
              <HStack className="items-center gap-3">
                <Box className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.orange }} />
                <Box className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Email de confirmation</Text>
                  <Text className="text-xs" style={{ color: theme.textMuted }}>Dans quelques minutes</Text>
                </Box>
              </HStack>
              <Box className="ml-[5px] h-6 border-l-2" style={{ borderLeftColor: theme.cardBorder }} />
              <HStack className="items-center gap-3">
                <Box className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.violet }} />
                <Box className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Période d'annulation (48h)</Text>
                  <Text className="text-xs" style={{ color: theme.textMuted }}>Vous pouvez encore annuler</Text>
                </Box>
              </HStack>
              <Box className="ml-[5px] h-6 border-l-2" style={{ borderLeftColor: theme.cardBorder }} />
              <HStack className="items-center gap-3">
                <Box className="w-3 h-3 rounded-full" style={{ backgroundColor: Colors.red }} />
                <Box className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Suppression définitive</Text>
                  <Text className="text-xs" style={{ color: theme.textMuted }}>Sous 72 heures</Text>
                </Box>
              </HStack>
            </Box>

            <Pressable
              className="flex-row items-center gap-2 px-6 py-3.5 rounded-[14px] border-[1.5px]"
              style={{ borderColor: Colors.green }}
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
              <Ionicons name="close-circle" size={18} color={Colors.green} />
              <Text className="text-[15px] font-bold" style={{ color: Colors.green }}>
                Annuler la demande
              </Text>
            </Pressable>
          </VStack>
        )}

        <Box className="h-10" />
      </ScrollView>
    </Animated.View>
  );
}
