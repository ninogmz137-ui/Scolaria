import { useState } from 'react';
import {
  Alert,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ChevronLeft, MessageCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { createCheckin } from '../services/database';
import MaternelleMode from '../components/checkin/MaternelleMode';
import PrimaireMode from '../components/checkin/PrimaireMode';
import LyceeMode from '../components/checkin/LyceeMode';
import { FLOATING_TAB_BAR_HEIGHT, TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';
import { detectCriticalKeywords } from '../components/profile/JoyAlerts';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

type AgeMode = 'maternelle' | 'primaire' | 'lycee';

const PAGE_BG = '#F2F4F8';
const NAVY = '#1A2340';

const VALUE_JOY: Record<string, number> = {
  super: 9,
  bien: 7,
  triste: 4,
  colere: 2,
};

function mapSchoolModeToAgeMode(schoolMode: 'maternelle' | 'primaire' | 'lycee'): AgeMode {
  if (schoolMode === 'maternelle') return 'maternelle';
  if (schoolMode === 'lycee') return 'lycee';
  return 'primaire';
}

const HEADER_EMOJI: Record<AgeMode, string> = {
  maternelle: '💛',
  primaire: '💚',
  lycee: '💜',
};

const GLOW_SHADOW: Record<AgeMode, object> = {
  maternelle: {
    shadowColor: '#F59E0B',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  primaire: {
    shadowColor: '#22C55E',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  lycee: {
    shadowColor: '#7C3AED',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export default function MonRessentiScreen() {
  const navigation = useNavigation<any>();
  const { mode: schoolMode } = useSchoolMode();
  const mode: AgeMode = mapSchoolModeToAgeMode(schoolMode);
  const { selectedChildId } = useActiveChild();
  const insets = useSafeAreaInsets();

  const [message, setMessage] = useState('');
  const [matSel, setMatSel] = useState<string | null>(null);
  const [energy, setEnergy] = useState(5);
  const [humeur, setHumeur] = useState(5);
  const [lycee, setLycee] = useState({
    energy: 5,
    stress: 3,
    motivation: 5,
    social: 5,
  });

  const setLyceeVal = (key: keyof typeof lycee, v: number) =>
    setLycee((prev) => ({ ...prev, [key]: v }));

  const submitMaternelle = async () => {
    if (!matSel) return;
    try {
      await createCheckin({
        child_id: selectedChildId,
        mode: 'maternelle',
        emotion: matSel,
        joy_score: VALUE_JOY[matSel] ?? 5,
        message: message.trim() || undefined,
      });
      Alert.alert('Merci 💛', 'Ton ressenti a été enregistré !');
      setMessage('');
      setMatSel(null);
    } catch (e) {
      console.error(e);
    }
  };

  const submitPrimaire = async () => {
    try {
      const joy_score = Math.round((humeur + (10 - 5) + energy) / 3);
      await createCheckin({
        child_id: selectedChildId,
        mode: 'primaire',
        emotion: String(humeur),
        energy,
        stress: 5,
        message: message.trim() || undefined,
        joy_score,
      });
      Alert.alert('Merci 💛', 'Ton ressenti a été enregistré !');
      setMessage('');
    } catch (e) {
      console.error(e);
    }
  };

  const submitLycee = async () => {
    try {
      const { energy: e, stress, motivation, social } = lycee;
      const joy_score = Math.round((e + (10 - stress) + motivation + social) / 4);
      await createCheckin({
        child_id: selectedChildId,
        mode: 'lycee',
        energy: e,
        stress,
        motivation,
        social,
        message: message.trim() || undefined,
        joy_score,
      });
      Alert.alert('Merci 💛', 'Ton ressenti a été enregistré !');
      setMessage('');
    } catch (e) {
      console.error(e);
    }
  };

  const onSubmit = () => {
    if (mode === 'maternelle') submitMaternelle();
    else if (mode === 'primaire') submitPrimaire();
    else submitLycee();
  };

  const canSubmit =
    mode === 'maternelle' ? matSel != null : true;

  const messageLabel =
    mode === 'lycee' ? 'Message confidentiel' : 'Un mot ? (optionnel)';

  const showCounter = mode === 'lycee';

  const critical = detectCriticalKeywords(message);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: FLOATING_TAB_BAR_HEIGHT + TAB_BAR_SCROLL_PADDING + insets.bottom,
        }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.navRow}>
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
              <ChevronLeft size={18} color={NAVY} strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.navTitle}>Bien-être</Text>
            <View style={{ width: 34 }} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.bigEmoji}>{HEADER_EMOJI[mode]}</Text>
            <View>
              <Text style={styles.screenTitle}>Mon Ressenti</Text>
              <Text style={styles.subtitle}>Prends un moment pour toi</Text>
            </View>
          </View>
          <View style={styles.confBadge}>
            <Text style={styles.confText}>🔒 Confidentiel</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, marginTop: 14 }}>
          <View style={[styles.glowCard, GLOW_SHADOW[mode]]}>
            <View style={styles.mainCardInner}>
              {mode === 'maternelle' && (
                <MaternelleMode selected={matSel} onSelect={setMatSel} />
              )}
              {mode === 'primaire' && (
                <PrimaireMode
                  energy={energy}
                  humeur={humeur}
                  onEnergy={setEnergy}
                  onHumeur={setHumeur}
                />
              )}
              {mode === 'lycee' && (
                <LyceeMode
                  energy={lycee.energy}
                  stress={lycee.stress}
                  motivation={lycee.motivation}
                  social={lycee.social}
                  onEnergy={(v) => setLyceeVal('energy', v)}
                  onStress={(v) => setLyceeVal('stress', v)}
                  onMotivation={(v) => setLyceeVal('motivation', v)}
                  onSocial={(v) => setLyceeVal('social', v)}
                />
              )}
            </View>
          </View>

          <View style={styles.msgGlass}>
            <BlurView intensity={16} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.msgInner}>
              <View style={styles.msgLabelRow}>
                <MessageCircle size={16} color="#6B7280" strokeWidth={1.8} />
                <Text style={styles.msgLabel}>{messageLabel}</Text>
              </View>
              <TextInput
                style={mode === 'lycee' ? styles.textareaTall : styles.textarea}
                placeholder={
                  mode === 'lycee'
                    ? 'Ce que tu ressens est important...'
                    : 'Raconte ta journée...'
                }
                placeholderTextColor="#94A3B8"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={mode === 'primaire' ? 200 : 500}
              />
              {showCounter ? (
                <Text style={styles.counter}>{message.length}/500</Text>
              ) : null}
            </View>
          </View>

          {critical && (
            <View style={styles.urgency}>
              <CriticalHelp />
            </View>
          )}

          <Pressable
            style={[
              styles.submitSolid,
              mode === 'maternelle' && !canSubmit ? { opacity: 0.45 } : null,
            ]}
            onPress={onSubmit}
            disabled={mode === 'maternelle' && !canSubmit}
          >
            <Text style={styles.submitTxt}>✓ Enregistrer mon ressenti</Text>
          </Pressable>

          <Text style={styles.privacy}>
            🔒 Tes réponses sont chiffrées et ne sont partagées avec personne.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function CriticalHelp() {
  return (
    <View style={styles.urgencyBox}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Ionicons name="heart" size={18} color={Colors.red} />
        <Text style={styles.urgencyTitle}>Tu n'es pas seul(e)</Text>
      </View>
      <Text style={styles.urgencyBody}>
        Si tu traverses un moment difficile, parle à un adulte de confiance ou appelle :
      </Text>
      <Pressable style={styles.urgencyLine} onPress={() => Linking.openURL('tel:3020')}>
        <Text style={styles.urgencyPhone}>📞 3020</Text>
        <Text style={styles.urgencyHint}>Non au Harcèlement</Text>
      </Pressable>
      <Pressable style={styles.urgencyLine} onPress={() => Linking.openURL('tel:3114')}>
        <Text style={styles.urgencyPhone}>🆘 3114</Text>
        <Text style={styles.urgencyHint}>Prévention du suicide — 24h/24</Text>
      </Pressable>
      <Pressable style={styles.urgencyLine} onPress={() => Linking.openURL('tel:119')}>
        <Text style={styles.urgencyPhone}>🛡️ 119</Text>
        <Text style={styles.urgencyHint}>Allo Enfance en Danger</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 18,
    paddingBottom: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 17,
    textTransform: 'uppercase',
    letterSpacing: 0.85,
    color: NAVY,
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bigEmoji: { fontSize: 36 },
  screenTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 24,
    textTransform: 'uppercase',
    color: NAVY,
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  confBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  confText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: '#6B7280',
  },
  glowCard: {
    borderRadius: 20,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  mainCardInner: {
    padding: 16,
  },
  msgGlass: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(255,255,255,0.72)',
    marginBottom: 14,
  },
  msgInner: { padding: 14 },
  msgLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  msgLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: NAVY,
  },
  textarea: {
    minHeight: 62,
    borderRadius: 11,
    backgroundColor: 'rgba(248,249,252,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    padding: 12,
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NAVY,
    textAlignVertical: 'top',
  },
  textareaTall: {
    minHeight: 100,
    borderRadius: 11,
    backgroundColor: 'rgba(248,249,252,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    padding: 12,
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: NAVY,
    textAlignVertical: 'top',
  },
  counter: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  submitSolid: {
    height: 50,
    borderRadius: 25,
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  submitTxt: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  privacy: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 12,
  },
  urgency: { marginBottom: 10 },
  urgencyBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  urgencyTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: '#991B1B',
  },
  urgencyBody: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#7F1D1D',
    marginBottom: 8,
  },
  urgencyLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  urgencyPhone: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: '#991B1B',
  },
  urgencyHint: { fontSize: 11, color: '#7F1D1D', flex: 1 },
});
