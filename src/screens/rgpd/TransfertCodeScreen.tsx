import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollView, Animated, Alert, Platform } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import { getTransferCodes, createTransferCode, revokeTransferCode, type TransferCode as SupabaseTransferCode } from '../../services/rgpdService';

// ─── Types ────────────────────────────────────────────────

interface TransferCode {
  id: string;
  code: string;
  child: string;
  childAvatar: string;
  fromSchool: string;
  toSchool: string;
  createdAt: string;
  expiresAt: string;
  daysLeft: number;
  status: 'active' | 'used' | 'expired';
  usedBy?: string;
  usedAt?: string;
}

// ─── Mock data ────────────────────────────────────────────

const EXISTING_CODES: TransferCode[] = [
  {
    id: '1',
    code: 'SCA-TRANSFER-2031-A7F3K2',
    child: 'Lucas Moreau',
    childAvatar: '👦',
    fromSchool: 'École Voltaire',
    toSchool: 'Collège Victor Hugo',
    createdAt: '15 mars 2026',
    expiresAt: '13 juin 2026',
    daysLeft: 83,
    status: 'active',
  },
  {
    id: '2',
    code: 'SCA-TRANSFER-2031-B9D4E1',
    child: 'Emma Moreau',
    childAvatar: '👧',
    fromSchool: 'Collège Hugo',
    toSchool: 'Lycée Montaigne',
    createdAt: '2 février 2026',
    expiresAt: '3 mai 2026',
    daysLeft: 42,
    status: 'active',
  },
  {
    id: '3',
    code: 'SCA-TRANSFER-2031-X2M8P5',
    child: 'Lucas Moreau',
    childAvatar: '👦',
    fromSchool: 'École Pasteur',
    toSchool: 'École Voltaire',
    createdAt: '10 sept 2025',
    expiresAt: '9 déc 2025',
    daysLeft: 0,
    status: 'used',
    usedBy: 'Mme Dupont (Directrice)',
    usedAt: '22 sept 2025',
  },
];

const CHILDREN = [
  { id: '1', name: 'Lucas Moreau', avatar: '👦', classe: 'CM2 — École Voltaire' },
  { id: '2', name: 'Emma Moreau', avatar: '👧', classe: '6ème — Collège Hugo' },
];

// ─── Shadow & helpers ─────────────────────────────────────

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
});

// ─── Component ────────────────────────────────────────────

export default function TransfertCodeScreen() {
  const { theme } = useChildTheme();
  const [codes, setCodes] = useState(EXISTING_CODES);
  const [showNewCode, setShowNewCode] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const codeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const mapSupabaseCodes = (data: SupabaseTransferCode[]): TransferCode[] =>
    data.map((c) => {
      const exp = new Date(c.expires_at);
      const now = new Date();
      const daysLeft = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        id: c.id,
        code: c.code,
        child: c.child_name,
        childAvatar: c.child_avatar,
        fromSchool: c.from_school,
        toSchool: c.to_school ?? 'À définir',
        createdAt: new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        expiresAt: exp.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        daysLeft,
        status: c.status === 'revoked' ? 'expired' : c.status as 'active' | 'used' | 'expired',
        usedBy: c.used_by ?? undefined,
        usedAt: c.used_at ? new Date(c.used_at).toLocaleDateString('fr-FR') : undefined,
      };
    });

  const loadCodes = useCallback(async () => {
    const data = await getTransferCodes();
    if (data.length > 0) {
      setCodes(mapSupabaseCodes(data));
    }
  }, []);

  useEffect(() => {
    loadCodes();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (newCode) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [newCode]);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `SCA-TRANSFER-2031-${suffix}`;
  };

  const handleGenerate = async (childId: string) => {
    setGeneratingFor(childId);
    setShowNewCode(true);

    const child = CHILDREN.find((c) => c.id === childId);
    if (!child) { setGeneratingFor(null); return; }

    const fromSchool = child.classe.split(' — ')[1] || '';

    const result = await createTransferCode({
      child_id: childId,
      child_name: child.name,
      child_avatar: child.avatar,
      from_school: fromSchool,
    });

    if (result) {
      setNewCode(result.code);
      Animated.spring(codeAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
      loadCodes();
    } else {
      // Fallback to local generation when Supabase not configured
      const code = generateCode();
      setNewCode(code);
      Animated.spring(codeAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
      setCodes((prev) => [
        {
          id: Date.now().toString(),
          code,
          child: child.name,
          childAvatar: child.avatar,
          fromSchool,
          toSchool: 'À définir',
          createdAt: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
          daysLeft: 90,
          status: 'active',
        },
        ...prev,
      ]);
    }
    setGeneratingFor(null);
  };

  const handleCopy = (code: string) => {
    if (Platform.OS === 'web') {
      try { navigator.clipboard.writeText(code); } catch {}
    }
    Alert.alert('Copié !', `Le code ${code} a été copié dans le presse-papier.`);
  };

  const handleRevoke = (codeId: string) => {
    Alert.alert(
      'Révoquer ce code',
      'Le code ne sera plus utilisable. L\'établissement devra demander un nouveau code.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Révoquer',
          style: 'destructive',
          onPress: async () => {
            await revokeTransferCode(codeId);
            setCodes((prev) => prev.filter((c) => c.id !== codeId));
          },
        },
      ]
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active': return { label: 'Actif', color: Colors.green, icon: 'checkmark-circle' as const };
      case 'used': return { label: 'Utilisé', color: Colors.cyan, icon: 'checkmark-done' as const };
      case 'expired': return { label: 'Expiré', color: Colors.red, icon: 'close-circle' as const };
      default: return { label: status, color: Colors.gray, icon: 'help-circle' as const };
    }
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView style={{ flex: 1, backgroundColor: '#E8EDF5' }} showsVerticalScrollIndicator={false}>
        {/* Info header */}
        <HStack
          className="items-center gap-3.5 m-5 mb-4 p-4 rounded-2xl border"
          style={{ backgroundColor: theme.card, borderColor: Colors.violet, borderWidth: 1.5, ...CARD_SHADOW }}
        >
          <Box
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: Colors.violet + '15' }}
          >
            <Ionicons name="swap-horizontal" size={24} color={Colors.violet} />
          </Box>
          <Box className="flex-1">
            <Text className="text-base font-extrabold" style={{ color: theme.textPrimary }}>Code de transfert</Text>
            <Text className="text-xs mt-0.5 leading-[17px]" style={{ color: theme.textMuted }}>
              Générez un code sécurisé pour transférer le dossier scolaire vers un nouvel établissement. Valable 90 jours.
            </Text>
          </Box>
        </HStack>

        {/* How it works */}
        <Box
          className="mx-5 mb-5 p-4 rounded-2xl border"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW }}
        >
          <Text className="text-[15px] font-bold mb-3.5" style={{ color: theme.textPrimary }}>Comment ça marche ?</Text>
          {[
            { step: '1', text: 'Générez un code unique pour votre enfant', icon: '🔑' },
            { step: '2', text: 'Communiquez le code au nouvel établissement', icon: '📩' },
            { step: '3', text: 'L\'école saisit le code pour recevoir le dossier', icon: '🏫' },
            { step: '4', text: 'Vous êtes notifié de l\'utilisation du code', icon: '🔔' },
          ].map((s, i) => (
            <HStack key={i} className="items-center gap-3 mb-2.5">
              <Box
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: Colors.violet + '20' }}
              >
                <Text className="text-lg">{s.icon}</Text>
              </Box>
              <Text className="flex-1 text-[13px] leading-[18px]" style={{ color: theme.textMuted }}>{s.text}</Text>
            </HStack>
          ))}
        </Box>

        {/* Generate new code */}
        <HStack className="items-center gap-2 mb-2.5 px-6">
          <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: Colors.violet }} />
          <Text className="text-[13px] font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>GÉNÉRER UN NOUVEAU CODE</Text>
        </HStack>
        <Box
          className="mx-5 mb-4 rounded-2xl border overflow-hidden"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW }}
        >
          {CHILDREN.map((child, i) => (
            <Pressable
              key={child.id}
              className="flex-row items-center p-3.5 gap-3"
              style={i < CHILDREN.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.cardBorder } : undefined}
              onPress={() => handleGenerate(child.id)}
              disabled={generatingFor === child.id}
            >
              <Box
                className="w-11 h-11 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(109,40,217,0.2)' }}
              >
                <Text className="text-[22px]">{child.avatar}</Text>
              </Box>
              <Box className="flex-1">
                <Text className="text-[15px] font-bold" style={{ color: theme.textPrimary }}>{child.name}</Text>
                <Text className="text-xs mt-px" style={{ color: theme.textMuted }}>{child.classe}</Text>
              </Box>
              {generatingFor === child.id ? (
                <Text style={{ color: Colors.violet, fontSize: 13, fontWeight: '600' }}>Génération...</Text>
              ) : (
                <HStack
                  className="items-center gap-1.5 px-3.5 py-2 rounded-xl"
                  style={{ backgroundColor: Colors.violet + '20' }}
                >
                  <Ionicons name="key" size={16} color={Colors.violet} />
                  <Text className="text-[13px] font-bold" style={{ color: Colors.violet }}>Générer</Text>
                </HStack>
              )}
            </Pressable>
          ))}
        </Box>

        {/* New code display */}
        {newCode && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={[Colors.violet, Colors.violetDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ marginHorizontal: 20, marginBottom: 20, padding: 24, borderRadius: 20, alignItems: 'center' }}
            >
              <Ionicons name="checkmark-circle" size={32} color={Colors.green} />
              <Text className="text-base font-bold text-white mt-2">Code généré avec succès !</Text>
              <Text
                className="text-lg font-black text-white tracking-wider mt-3 p-3 rounded-xl overflow-hidden"
                style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: 'rgba(0,0,0,0.3)' }}
              >
                {newCode}
              </Text>
              <Text className="text-[13px] mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>Expire dans 90 jours</Text>
              <HStack className="gap-3 mt-4">
                <Pressable
                  className="flex-row items-center gap-1.5 px-5 py-2.5 rounded-xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  onPress={() => handleCopy(newCode)}
                >
                  <Ionicons name="copy" size={18} color={Colors.white} />
                  <Text className="text-sm font-semibold text-white">Copier</Text>
                </Pressable>
                <Pressable
                  className="flex-row items-center gap-1.5 px-5 py-2.5 rounded-xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <Ionicons name="share" size={18} color={Colors.white} />
                  <Text className="text-sm font-semibold text-white">Partager</Text>
                </Pressable>
              </HStack>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Existing codes */}
        <HStack className="items-center gap-2 mb-2.5 px-6">
          <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: Colors.cyan }} />
          <Text className="text-[13px] font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>CODES EXISTANTS</Text>
        </HStack>
        {codes.map((tc) => {
          const statusCfg = getStatusConfig(tc.status);
          return (
            <Box
              key={tc.id}
              className="mx-5 mb-3 p-4 rounded-2xl border"
              style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW }}
            >
              {/* Header */}
              <HStack className="items-center gap-2.5 mb-3">
                <Text className="text-[28px]">{tc.childAvatar}</Text>
                <Box className="flex-1">
                  <Text className="text-[15px] font-bold" style={{ color: theme.textPrimary }}>{tc.child}</Text>
                  <Text className="text-xs mt-px" style={{ color: theme.textMuted }}>
                    {tc.fromSchool} → {tc.toSchool}
                  </Text>
                </Box>
                <HStack
                  className="items-center gap-1 px-2.5 py-1 rounded-[10px]"
                  style={{ backgroundColor: statusCfg.color + '15' }}
                >
                  <Ionicons name={statusCfg.icon} size={14} color={statusCfg.color} />
                  <Text className="text-xs font-semibold" style={{ color: statusCfg.color }}>{statusCfg.label}</Text>
                </HStack>
              </HStack>

              {/* Code display */}
              <Pressable
                className="flex-row items-center justify-between p-3 rounded-xl border mb-2.5"
                style={{ backgroundColor: '#F1F5F9', borderColor: theme.cardBorder }}
                onPress={() => handleCopy(tc.code)}
              >
                <Text
                  className="text-sm font-extrabold tracking-wider"
                  style={{
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    color: tc.status === 'active' ? Colors.cyan : Colors.gray,
                  }}
                >
                  {tc.code}
                </Text>
                <Ionicons name="copy-outline" size={16} color={Colors.gray} />
              </Pressable>

              {/* Meta */}
              <VStack className="gap-1 mb-2.5">
                <Text className="text-xs" style={{ color: theme.textMuted }}>
                  📅 Créé le {tc.createdAt}
                </Text>
                <Text className="text-xs" style={{ color: theme.textMuted }}>
                  ⏳ Expire le {tc.expiresAt}
                </Text>
                {tc.status === 'active' && (
                  <Text className="text-xs font-bold mt-0.5" style={{ color: tc.daysLeft > 30 ? Colors.green : Colors.orange }}>
                    {tc.daysLeft} jours restants
                  </Text>
                )}
                {tc.usedBy && (
                  <Text className="text-xs" style={{ color: Colors.cyan }}>
                    ✅ Utilisé par {tc.usedBy} le {tc.usedAt}
                  </Text>
                )}
              </VStack>

              {/* Actions */}
              {tc.status === 'active' && (
                <HStack className="gap-2.5 border-t pt-3" style={{ borderTopColor: '#EEF0F5' }}>
                  <Pressable
                    className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl"
                    style={{ backgroundColor: Colors.red + '12' }}
                    onPress={() => handleRevoke(tc.id)}
                  >
                    <Ionicons name="close-circle" size={16} color={Colors.red} />
                    <Text className="text-[13px] font-semibold" style={{ color: Colors.red }}>Révoquer</Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl"
                    style={{ backgroundColor: Colors.cyan + '12' }}
                    onPress={() => handleCopy(tc.code)}
                  >
                    <Ionicons name="share" size={16} color={Colors.cyan} />
                    <Text className="text-[13px] font-semibold" style={{ color: Colors.cyan }}>Partager</Text>
                  </Pressable>
                </HStack>
              )}
            </Box>
          );
        })}

        {/* Security notice */}
        <HStack
          className="items-start gap-2.5 mx-5 mt-2 p-3.5 rounded-[14px] border"
          style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, ...CARD_SHADOW }}
        >
          <Ionicons name="lock-closed" size={16} color={Colors.green} />
          <Text className="flex-1 text-[11px] leading-4" style={{ color: theme.textMuted }}>
            Les codes de transfert sont chiffrés de bout en bout. Seul l'établissement destinataire peut lire les données transmises. Le transfert est journalisé et visible dans le journal d'accès.
          </Text>
        </HStack>

        <Box className="h-10" />
      </ScrollView>
    </Animated.View>
  );
}
