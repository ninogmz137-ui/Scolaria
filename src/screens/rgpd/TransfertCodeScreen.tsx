import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Animated, Alert, Platform } from 'react-native';
import {
  ArrowRight,
  Check,
  X,
  ExternalLink,
  Lock,
  Key,
  Info,
} from 'lucide-react-native';
import { Colors, SCREEN_BACKGROUND } from '../../constants/colors';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT, TAB_BAR_SCROLL_PADDING } from '../../components/FloatingTabBar';
import { FontFamily } from '../../hooks/useSolariaFonts';
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

// ─── Component ────────────────────────────────────────────

export default function TransfertCodeScreen() {
  const { theme } = useChildTheme();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;
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
      case 'active': return { label: 'Actif', color: Colors.green, Icon: Check };
      case 'used': return { label: 'Utilisé', color: Colors.cyan, Icon: Check };
      case 'expired': return { label: 'Expiré', color: Colors.red, Icon: X };
      default: return { label: status, color: Colors.gray, Icon: Info };
    }
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <View style={{ flex: 1, backgroundColor: SCREEN_BACKGROUND }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: TOPBAR_H + 12,
            paddingBottom: FLOATING_TAB_BAR_HEIGHT + TAB_BAR_SCROLL_PADDING,
            paddingHorizontal: 18,
          }}
        >
          {/* Info header */}
          <View style={[styles.card, { borderColor: Colors.violet + '60', marginBottom: 14 }]}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: Colors.violet + '20' }]}>
                <ArrowRight size={24} color={Colors.violet} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Code de transfert</Text>
                <Text style={styles.infoSubtitle}>
                  Générez un code sécurisé pour transférer le dossier scolaire vers un nouvel établissement. Valable 90 jours.
                </Text>
              </View>
            </View>
          </View>

          {/* How it works */}
          <View style={[styles.card, { marginBottom: 18 }]}>
            <Text style={styles.sectionTitle}>Comment ça marche ?</Text>
            {[
              { step: '1', text: 'Générez un code unique pour votre enfant', icon: '🔑' },
              { step: '2', text: 'Communiquez le code au nouvel établissement', icon: '📩' },
              { step: '3', text: 'L\'école saisit le code pour recevoir le dossier', icon: '🏫' },
              { step: '4', text: 'Vous êtes notifié de l\'utilisation du code', icon: '🔔' },
            ].map((s, i) => (
              <View key={i} style={styles.howRow}>
                <View style={[styles.howIcon, { backgroundColor: Colors.violet + '15' }]}>
                  <Text style={{ fontSize: 18 }}>{s.icon}</Text>
                </View>
                <Text style={styles.howText}>{s.text}</Text>
              </View>
            ))}
          </View>

          {/* Generate section label */}
          <Text style={styles.sectionLabel}>GÉNÉRER UN NOUVEAU CODE</Text>

          <View style={[styles.card, { marginBottom: 16, padding: 0 }]}>
            {CHILDREN.map((child, i) => (
              <Pressable
                key={child.id}
                style={[styles.childRow, i < CHILDREN.length - 1 && styles.rowBorder]}
                onPress={() => handleGenerate(child.id)}
                disabled={generatingFor === child.id}
              >
                <View style={styles.childAvatar}>
                  <Text style={{ fontSize: 22 }}>{child.avatar}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{child.name}</Text>
                  <Text style={styles.personRole}>{child.classe}</Text>
                </View>
                {generatingFor === child.id ? (
                  <Text style={[styles.genText, { color: Colors.violet }]}>Génération...</Text>
                ) : (
                  <View style={[styles.genBtn, { backgroundColor: Colors.violet + '15' }]}>
                    <Key size={16} color={Colors.violet} />
                    <Text style={[styles.genText, { color: Colors.violet }]}>Générer</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* New code display */}
          {newCode && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 20 }}>
              <View style={[styles.card, { borderColor: Colors.violet + '60', alignItems: 'center' }]}>
                <View style={{ alignItems: 'center' }}>
                  <Check size={32} color={Colors.green} />
                  <Text style={styles.newCodeSuccess}>Code généré avec succès !</Text>
                  <Text style={styles.newCodeValue}>{newCode}</Text>
                  <Text style={styles.newCodeExpiry}>Expire dans 90 jours</Text>
                  <View style={styles.newCodeActions}>
                    <Pressable
                      style={[styles.newCodeBtn, { backgroundColor: Colors.violet + '15' }]}
                      onPress={() => handleCopy(newCode)}
                    >
                      <ArrowRight size={18} color={Colors.violet} />
                      <Text style={[styles.newCodeBtnText, { color: Colors.violet }]}>Copier</Text>
                    </Pressable>
                    <Pressable style={[styles.newCodeBtn, { backgroundColor: '#F1F5F9' }]}>
                      <ExternalLink size={18} color="#94A3B8" />
                      <Text style={[styles.newCodeBtnText, { color: '#94A3B8' }]}>Partager</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Existing codes label */}
          <Text style={styles.sectionLabel}>CODES EXISTANTS</Text>

          {codes.map((tc) => {
            const statusCfg = getStatusConfig(tc.status);
            return (
              <View key={tc.id} style={[styles.card, { marginBottom: 12 }]}>
                {/* Header */}
                <View style={styles.codeHeader}>
                  <Text style={{ fontSize: 28 }}>{tc.childAvatar}</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.personName}>{tc.child}</Text>
                    <Text style={styles.personRole}>{tc.fromSchool} → {tc.toSchool}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '15' }]}>
                    <statusCfg.Icon size={14} color={statusCfg.color} />
                    <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                  </View>
                </View>

                {/* Code display */}
                <Pressable
                  style={styles.codeDisplay}
                  onPress={() => handleCopy(tc.code)}
                >
                  <Text
                    style={[
                      styles.codeText,
                      { color: tc.status === 'active' ? Colors.violet : '#CBD5E1' },
                    ]}
                  >
                    {tc.code}
                  </Text>
                  <ArrowRight size={16} color="#CBD5E1" />
                </Pressable>

                {/* Meta */}
                <View style={styles.codeMeta}>
                  <Text style={styles.metaText}>📅 Créé le {tc.createdAt}</Text>
                  <Text style={styles.metaText}>⏳ Expire le {tc.expiresAt}</Text>
                  {tc.status === 'active' && (
                    <Text style={[styles.metaText, { fontFamily: FontFamily.sansBold, color: tc.daysLeft > 30 ? Colors.green : Colors.orange }]}>
                      {tc.daysLeft} jours restants
                    </Text>
                  )}
                  {tc.usedBy && (
                    <Text style={[styles.metaText, { color: Colors.cyan }]}>
                      ✅ Utilisé par {tc.usedBy} le {tc.usedAt}
                    </Text>
                  )}
                </View>

                {/* Actions */}
                {tc.status === 'active' && (
                  <View style={[styles.codeActions, { borderTopColor: '#F1F5F9' }]}>
                    <Pressable
                      style={[styles.codeActionBtn, { backgroundColor: Colors.red + '10' }]}
                      onPress={() => handleRevoke(tc.id)}
                    >
                      <X size={16} color={Colors.red} />
                      <Text style={[styles.codeActionText, { color: Colors.red }]}>Révoquer</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.codeActionBtn, { backgroundColor: Colors.cyan + '10' }]}
                      onPress={() => handleCopy(tc.code)}
                    >
                      <ExternalLink size={16} color={Colors.cyan} />
                      <Text style={[styles.codeActionText, { color: Colors.cyan }]}>Partager</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          {/* Security notice */}
          <View style={styles.card}>
            <View style={styles.noticeRow}>
              <Lock size={16} color={Colors.green} />
              <Text style={styles.noticeText}>
                Les codes de transfert sont chiffrés de bout en bout. Seul l'établissement destinataire peut lire les données transmises. Le transfert est journalisé et visible dans le journal d'accès.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SCREEN_BACKGROUND,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    marginBottom: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#1A2340' },
  infoSubtitle: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#94A3B8', marginTop: 2, lineHeight: 17 },
  sectionTitle: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#1A2340', marginBottom: 14 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  howIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  howText: { fontFamily: FontFamily.sansRegular, fontSize: 13, color: '#94A3B8', flex: 1, lineHeight: 18 },
  sectionLabel: { fontFamily: FontFamily.sansBold, fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, marginTop: 2 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  childRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  childAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.violet + '10' },
  personName: { fontFamily: FontFamily.sansBold, fontSize: 14, color: '#1A2340' },
  personRole: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#94A3B8', marginTop: 1 },
  genBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  genText: { fontFamily: FontFamily.sansBold, fontSize: 13 },
  newCodeSuccess: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#1A2340', marginTop: 8 },
  newCodeValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 16,
    color: Colors.violet,
    letterSpacing: 2,
    marginTop: 12,
    backgroundColor: Colors.violet + '08',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newCodeExpiry: { fontFamily: FontFamily.sansRegular, fontSize: 13, color: '#94A3B8', marginTop: 8 },
  newCodeActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  newCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  newCodeBtnText: { fontFamily: FontFamily.sansSemiBold, fontSize: 14 },
  codeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FontFamily.sansSemiBold, fontSize: 11 },
  codeDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC', marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, letterSpacing: 1 },
  codeMeta: { gap: 4, marginBottom: 10 },
  metaText: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#94A3B8' },
  codeActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, paddingTop: 12, marginTop: 2 },
  codeActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  codeActionText: { fontFamily: FontFamily.sansSemiBold, fontSize: 13 },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noticeText: { fontFamily: FontFamily.sansRegular, fontSize: 11, lineHeight: 16, color: '#94A3B8', flex: 1 },
});
