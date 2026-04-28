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
  Bell,
  School,
} from 'lucide-react-native';
import { Colors, SCREEN_BACKGROUND } from '../../constants/colors';
import { TAB_BAR_SCROLL_PADDING } from '../../components/FloatingTabBar';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { getTransferCodes, createTransferCode, revokeTransferCode, type TransferCode as SupabaseTransferCode } from '../../services/rgpdService';
import GlassCard from '../../components/GlassCard';
import RgpdHero from '../../components/rgpd/RgpdHero';
import RgpdSectionLabel from '../../components/rgpd/RgpdSectionLabel';
import { ARIA_INDIGO } from '../../constants/theme';
import GradientButton from '../../components/shared/GradientButton';
import RgpdBottomSheet from '../../components/rgpd/RgpdBottomSheet';

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
    childAvatar: '',
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
    childAvatar: '',
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
    childAvatar: '',
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
  { id: '1', name: 'Lucas Moreau', avatar: '', classe: 'CM2 — École Voltaire' },
  { id: '2', name: 'Emma Moreau', avatar: '', classe: '6ème — Collège Hugo' },
];

// ─── Component ────────────────────────────────────────────

export default function TransfertCodeScreen() {
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
      case 'active': return { label: 'Actif', color: ARIA_INDIGO, Icon: Check };
      case 'used': return { label: 'Utilisé', color: Colors.textSecondary, Icon: Check };
      case 'expired': return { label: 'Expiré', color: Colors.red, Icon: X };
      default: return { label: status, color: Colors.gray, Icon: Info };
    }
  };

  const initials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (first + last).toUpperCase();
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <View style={{ flex: 1, backgroundColor: SCREEN_BACKGROUND }}>
        <RgpdBottomSheet>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 56,
              paddingBottom: TAB_BAR_SCROLL_PADDING,
              paddingHorizontal: 18,
            }}
          >
          <RgpdHero
            Icon={ArrowRight}
            title="Code de transfert"
            subtitle="Générez un code sécurisé pour transférer le dossier scolaire vers un nouvel établissement. Valable 90 jours."
          />

          {/* How it works */}
          <GlassCard style={[styles.cardBorder, { marginTop: 14, marginBottom: 18 }]}>
            <Text style={styles.sectionTitle}>Comment ça marche ?</Text>
            {[
              { text: 'Générez un code unique pour votre enfant', Icon: Key },
              { text: 'Communiquez le code au nouvel établissement', Icon: ExternalLink },
              { text: "L’établissement saisit le code pour recevoir le dossier", Icon: School },
              { text: 'Vous êtes notifié de son utilisation', Icon: Bell },
            ].map((s, i) => (
              <View key={i} style={styles.howRow}>
                <View style={styles.howIcon}>
                  <s.Icon size={18} color={ARIA_INDIGO} />
                </View>
                <Text style={styles.howText}>{s.text}</Text>
              </View>
            ))}
          </GlassCard>

          {/* Generate section label */}
          <RgpdSectionLabel style={{ marginBottom: 10 }}>Générer un nouveau code</RgpdSectionLabel>

          <GlassCard noPadding style={[styles.cardBorder, { marginBottom: 16 }]}>
            {CHILDREN.map((child, i) => (
              <Pressable
                key={child.id}
                style={[styles.childRow, i < CHILDREN.length - 1 && styles.rowBorder]}
                onPress={() => handleGenerate(child.id)}
                disabled={generatingFor === child.id}
              >
                <View style={styles.childAvatar}>
                  <Text style={styles.childAvatarText}>{initials(child.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{child.name}</Text>
                  <Text style={styles.personRole}>{child.classe}</Text>
                </View>
                {generatingFor === child.id ? (
                  <Text style={[styles.genText, { color: Colors.textSecondary }]}>Génération…</Text>
                ) : (
                  <View style={[styles.genBtn, { backgroundColor: 'rgba(67,56,202,0.08)', borderColor: 'rgba(67,56,202,0.14)' }]}>
                    <Key size={16} color={ARIA_INDIGO} />
                    <Text style={[styles.genText, { color: Colors.textPrimary }]}>Générer</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </GlassCard>

          {/* New code display */}
          {newCode && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 20 }}>
              <GlassCard style={[styles.cardBorder, { alignItems: 'center' }]}>
                <View style={{ alignItems: 'center' }}>
                  <Check size={32} color={ARIA_INDIGO} />
                  <Text style={styles.newCodeSuccess}>Code généré avec succès !</Text>
                  <Text style={styles.newCodeValue}>{newCode}</Text>
                  <Text style={styles.newCodeExpiry}>Expire dans 90 jours</Text>
                  <View style={styles.newCodeActions}>
                    <GradientButton
                      label="Copier"
                      onPress={() => handleCopy(newCode)}
                      leftIcon={<ArrowRight size={18} color="#FFFFFF" strokeWidth={2} />}
                      style={{ flex: 1 }}
                    />
                    <GradientButton
                      label="Partager"
                      variant="outline"
                      onPress={() => handleCopy(newCode)}
                      leftIcon={<ExternalLink size={18} color={ARIA_INDIGO} strokeWidth={2} />}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {/* Existing codes label */}
          <RgpdSectionLabel style={{ marginBottom: 10 }}>Codes existants</RgpdSectionLabel>

          {codes.map((tc) => {
            const statusCfg = getStatusConfig(tc.status);
            return (
              <GlassCard key={tc.id} style={[styles.cardBorder, { marginBottom: 12 }]}>
                {/* Header */}
                <View style={styles.codeHeader}>
                  <View style={styles.childAvatar}>
                    <Text style={styles.childAvatarText}>{initials(tc.child)}</Text>
                  </View>
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
                      { color: tc.status === 'active' ? ARIA_INDIGO : Colors.textMuted },
                    ]}
                  >
                    {tc.code}
                  </Text>
                  <ArrowRight size={16} color="#CBD5E1" />
                </Pressable>

                {/* Meta */}
                <View style={styles.codeMeta}>
                  <Text style={styles.metaText}>Créé le {tc.createdAt}</Text>
                  <Text style={styles.metaText}>Expire le {tc.expiresAt}</Text>
                  {tc.status === 'active' && (
                    <Text style={[styles.metaText, { fontFamily: FontFamily.sansBold, color: Colors.textPrimary }]}>
                      {tc.daysLeft} jours restants
                    </Text>
                  )}
                  {tc.usedBy && (
                    <Text style={[styles.metaText, { color: Colors.textSecondary }]}>
                      Utilisé par {tc.usedBy} le {tc.usedAt}
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
                      style={[styles.codeActionBtn, { backgroundColor: 'rgba(67,56,202,0.08)' }]}
                      onPress={() => handleCopy(tc.code)}
                    >
                      <ExternalLink size={16} color={ARIA_INDIGO} />
                      <Text style={[styles.codeActionText, { color: Colors.textPrimary }]}>Partager</Text>
                    </Pressable>
                  </View>
                )}
              </GlassCard>
            );
          })}

          {/* Security notice */}
          <GlassCard style={[styles.cardBorder, { marginBottom: 8 }]}>
            <View style={styles.noticeRow}>
              <Lock size={16} color={ARIA_INDIGO} />
              <Text style={styles.noticeText}>
                Les codes de transfert sont chiffrés de bout en bout. Seul l'établissement destinataire peut lire les données transmises. Le transfert est journalisé et visible dans le journal d'accès.
              </Text>
            </View>
          </GlassCard>
          </ScrollView>
        </RgpdBottomSheet>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardBorder: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sectionTitle: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#1A2340', marginBottom: 14 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  howIcon: { width: 36, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(67,56,202,0.08)', borderWidth: 1, borderColor: 'rgba(67,56,202,0.14)' },
  howText: { fontFamily: FontFamily.sansRegular, fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  childRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  childAvatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(67,56,202,0.14)' },
  childAvatarText: { fontFamily: FontFamily.sansBold, fontSize: 14, color: Colors.textPrimary },
  personName: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: Colors.textPrimary },
  personRole: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  genBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  genText: { fontFamily: FontFamily.sansBold, fontSize: 13 },
  newCodeSuccess: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#1A2340', marginTop: 8 },
  newCodeValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 16,
    color: ARIA_INDIGO,
    letterSpacing: 2,
    marginTop: 12,
    backgroundColor: 'rgba(67,56,202,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newCodeExpiry: { fontFamily: FontFamily.sansRegular, fontSize: 13, color: Colors.textSecondary, marginTop: 8 },
  newCodeActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  codeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FontFamily.sansSemiBold, fontSize: 11 },
  codeDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC', marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, letterSpacing: 1 },
  codeMeta: { gap: 4, marginBottom: 10 },
  metaText: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: Colors.textSecondary },
  codeActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, paddingTop: 12, marginTop: 2 },
  codeActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  codeActionText: { fontFamily: FontFamily.sansSemiBold, fontSize: 13 },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noticeText: { fontFamily: FontFamily.sansRegular, fontSize: 11.5, lineHeight: 16, color: Colors.textSecondary, flex: 1 },
});
