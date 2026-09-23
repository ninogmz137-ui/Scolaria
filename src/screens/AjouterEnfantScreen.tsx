/**
 * Ajouter un Enfant — Formulaire complet pour ajouter un enfant.
 *
 * Champs : prénom, date de naissance, école, classe, emoji avatar.
 * Génère automatiquement un identifiant Scolaria (SCA-YYYY-FR-XXXXXX).
 */

import { useState, useRef, useEffect } from 'react';
import { FontFamily } from '../hooks/useSolariaFonts';
import {
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  GraduationCap,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import { Text, TextInput } from '../components/ui';

// ─── Types ───────────────────────────────────────────────

interface Props {
  navigation: any;
  onChildAdded?: () => void;
}

// ─── Classes par niveau ──────────────────────────────────

const CLASSES = [
  { section: 'Maternelle', items: ['PS', 'MS', 'GS'] },
  { section: 'Élémentaire', items: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'] },
  { section: 'Collège', items: ['6ème', '5ème', '4ème', '3ème'] },
  { section: 'Lycée', items: ['2nde', '1ère', 'Terminale'] },
];

// ─── Emojis d'avatar ─────────────────────────────────────

const AVATARS = ['👦', '👧', '🧒', '👶', '🧑', '👱', '🧑‍🎓', '🦸', '🧙', '🦊', '🐱', '🐼'];

// ─── Génération ID Scolaria ──────────────────────────────

function generateScolariaId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, '0');
  return `SCA-${year}-FR-${random}`;
}

// ─── Component ──────────────────────────────────────────

export default function AjouterEnfantScreen({ navigation, onChildAdded }: Props) {
  const insets = useSafeAreaInsets();
  const { user, isDemo } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [school, setSchool] = useState('');
  const [selectedClasse, setSelectedClasse] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👦');
  const [showClassePicker, setShowClassePicker] = useState(false);
  const [loading, setSaving] = useState(false);

  const scolariaId = useRef(generateScolariaId()).current;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const idPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation on ID badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(idPulse, {
          toValue: 1.03,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(idPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // ─── Validation ─────────────────────────────────────────

  const computeAge = (): number | null => {
    const day = parseInt(birthDay, 10);
    const month = parseInt(birthMonth, 10);
    const year = parseInt(birthYear, 10);

    if (!day || !month || !year || year < 1900 || year > new Date().getFullYear()) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const today = new Date();
    let age = today.getFullYear() - year;
    const monthDiff = today.getMonth() + 1 - month;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
      age--;
    }
    return age >= 0 && age <= 25 ? age : null;
  };

  const isFormValid =
    firstName.trim().length >= 2 &&
    selectedClasse !== '' &&
    birthDay !== '' &&
    birthMonth !== '' &&
    birthYear.length === 4;

  // ─── Submit ─────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!isFormValid) {
      Alert.alert('Champs manquants', 'Veuillez remplir le prénom, la date de naissance et la classe.');
      return;
    }

    const age = computeAge();
    if (age === null) {
      Alert.alert('Date invalide', 'Veuillez vérifier la date de naissance.');
      return;
    }

    setSaving(true);

    try {
      const birthDate = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;

      if (isDemo) {
        // Demo mode: just show success
        await new Promise((r) => setTimeout(r, 800));
      } else {
        // Real mode: save to Supabase
        const { createChild } = await import('../services/database');
        await createChild({
          parent_id: user!.id,
          scolaria_id: scolariaId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          avatar_emoji: selectedAvatar,
          birth_date: birthDate,
          age,
          classe: selectedClasse,
          school: school.trim(),
        });
      }

      Alert.alert(
        '🎉 Enfant ajouté !',
        `${firstName} a été ajouté avec l'identifiant ${scolariaId}`,
        [
          {
            text: 'Super !',
            onPress: () => {
              onChildAdded?.();
              navigation.goBack();
            },
          },
        ],
      );
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible d\'ajouter l\'enfant.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────

  const age = computeAge();

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 60,
          paddingBottom: getBottomBarScrollPadding(insets.bottom),
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={{
            paddingHorizontal: 16,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Intro — le titre est déjà dans la top bar */}
          <Text style={s.intro}>
            Remplissez les informations de votre enfant pour créer son carnet de scolarité.
          </Text>

          {/* Identifiant Scolaria */}
          <Animated.View style={[s.idCard, { transform: [{ scale: idPulse }] }]}>
            <Fingerprint size={20} color={INDIGO} strokeWidth={2} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.idLabel}>Identifiant Scolaria</Text>
              <Text style={s.idValue}>{scolariaId}</Text>
            </View>
            <View style={s.tag}>
              <Text style={s.tagText}>Auto</Text>
            </View>
          </Animated.View>

          {/* Avatar */}
          <Text style={s.label}>Avatar</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4 }}
            style={{ marginBottom: 20 }}
          >
            {AVATARS.map((emoji) => {
              const active = selectedAvatar === emoji;
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[s.avatarBtn, active && s.avatarBtnActive]}
                  onPress={() => setSelectedAvatar(emoji)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Prénom & Nom */}
          <View style={{ flexDirection: 'row' }}>
            <View style={[s.field, { flex: 1, marginRight: 12 }]}>
              <Text style={s.label}>
                Prénom <Text style={s.required}>*</Text>
              </Text>
              <View style={s.input}>
                <User size={18} color={TEXT35} strokeWidth={2} />
                <TextInput
                  style={s.inputText}
                  placeholder="Lucas"
                  placeholderTextColor={PLACEHOLDER}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={[s.field, { flex: 1 }]}>
              <Text style={s.label}>Nom</Text>
              <View style={s.input}>
                <User size={18} color={TEXT35} strokeWidth={2} />
                <TextInput
                  style={s.inputText}
                  placeholder="Moreau"
                  placeholderTextColor={PLACEHOLDER}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          </View>

          {/* Date de naissance */}
          <View style={s.field}>
            <Text style={s.label}>
              Date de naissance <Text style={s.required}>*</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[s.input, { flex: 1 }]}>
                <TextInput
                  style={[s.inputText, s.inputCentered]}
                  placeholder="JJ"
                  placeholderTextColor={PLACEHOLDER}
                  value={birthDay}
                  onChangeText={(t) => setBirthDay(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <Text style={s.dateSep}>/</Text>
              <View style={[s.input, { flex: 1 }]}>
                <TextInput
                  style={[s.inputText, s.inputCentered]}
                  placeholder="MM"
                  placeholderTextColor={PLACEHOLDER}
                  value={birthMonth}
                  onChangeText={(t) => setBirthMonth(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <Text style={s.dateSep}>/</Text>
              <View style={[s.input, { flex: 1.5 }]}>
                <TextInput
                  style={[s.inputText, s.inputCentered]}
                  placeholder="AAAA"
                  placeholderTextColor={PLACEHOLDER}
                  value={birthYear}
                  onChangeText={(t) => setBirthYear(t.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              {age !== null && (
                <View style={[s.tag, { marginLeft: 8 }]}>
                  <Text style={s.tagText}>{age} ans</Text>
                </View>
              )}
            </View>
          </View>

          {/* École */}
          <View style={s.field}>
            <Text style={s.label}>École / Établissement</Text>
            <View style={s.input}>
              <Building2 size={18} color={TEXT35} strokeWidth={2} />
              <TextInput
                style={s.inputText}
                placeholder="École Victor Hugo"
                placeholderTextColor={PLACEHOLDER}
                value={school}
                onChangeText={setSchool}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Classe */}
          <View style={s.field}>
            <Text style={s.label}>
              Classe <Text style={s.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[s.input, showClassePicker && s.inputFocused]}
              onPress={() => setShowClassePicker(!showClassePicker)}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <GraduationCap size={18} color={TEXT35} strokeWidth={2} />
              <Text
                style={[
                  s.inputText,
                  {
                    color: selectedClasse ? INK : PLACEHOLDER,
                    fontFamily: selectedClasse ? FontFamily.sansSemiBold : FontFamily.sansRegular,
                  },
                ]}
              >
                {selectedClasse || 'Sélectionner la classe'}
              </Text>
              {showClassePicker ? (
                <ChevronUp size={18} color={TEXT35} strokeWidth={2} />
              ) : (
                <ChevronDown size={18} color={TEXT35} strokeWidth={2} />
              )}
            </TouchableOpacity>

            {showClassePicker && (
              <View style={s.picker}>
                {CLASSES.map((section, i) => (
                  <View key={section.section} style={i > 0 ? { marginTop: 16 } : undefined}>
                    <Text style={s.sectionLabel}>{section.section}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {section.items.map((classe) => {
                        const active = selectedClasse === classe;
                        return (
                          <TouchableOpacity
                            key={classe}
                            style={[s.pill, active ? s.pillActive : s.pillInactive]}
                            onPress={() => {
                              setSelectedClasse(classe);
                              setShowClassePicker(false);
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                          >
                            <Text style={[s.pillText, { color: active ? '#FFFFFF' : TEXT55 }]}>
                              {classe}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Aperçu */}
          {isFormValid && (
            <View style={s.preview}>
              <Text style={s.sectionLabel}>Aperçu du profil</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 40, marginRight: 14 }}>{selectedAvatar}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.previewName}>
                    {firstName} {lastName}
                  </Text>
                  <Text style={s.previewMeta}>
                    {selectedClasse} · {age} ans
                    {school ? ` · ${school}` : ''}
                  </Text>
                  <Text style={s.previewId}>{scolariaId}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Bouton primaire §2 */}
          <TouchableOpacity
            style={[s.primaryBtn, (!isFormValid || loading) && { opacity: 0.4 }]}
            onPress={handleSubmit}
            activeOpacity={0.78}
            disabled={!isFormValid || loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <UserPlus size={20} color="#FFFFFF" strokeWidth={2} />
                <Text style={s.primaryBtnText} numberOfLines={1}>
                  Ajouter {firstName || 'l\'enfant'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info RGPD */}
          <View style={s.footer}>
            <ShieldCheck size={14} color={TEXT35} strokeWidth={2} />
            <Text style={s.footerText}>
              Les données sont protégées et conformes au RGPD.
              L'identifiant Scolaria est unique et non modifiable.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────
// Fond #F2F1EE, textes #0F172A, inputs COMPONENTS.md §5, bouton primaire §2.

const BG = '#F2F1EE';
const INK = '#0F172A';
const INDIGO = '#4338CA';
const TEXT55 = 'rgba(15,23,42,0.55)';
const TEXT35 = 'rgba(15,23,42,0.35)';
const PLACEHOLDER = 'rgba(15,23,42,0.30)';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  intro: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 20,
    color: TEXT55,
    marginTop: 8,
  },

  idCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
  },
  idLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: TEXT55,
  },
  idValue: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    letterSpacing: 0.8,
    color: INK,
    marginTop: 2,
  },
  tag: {
    height: 22,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: 'rgba(67,56,202,0.10)',
  },
  tagText: { fontFamily: FontFamily.sansSemiBold, fontSize: 11, color: INDIGO },

  field: { marginBottom: 18 },
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: INK,
    marginBottom: 8,
  },
  required: { color: '#EF4444' },

  avatarBtn: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarBtnActive: { borderColor: INDIGO },

  // Input standard §5
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  inputFocused: { borderColor: INDIGO, borderWidth: 1.5 },
  inputText: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: INK,
    marginLeft: 10,
    paddingVertical: 0,
  },
  inputCentered: { textAlign: 'center', marginLeft: 0 },
  dateSep: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 18,
    color: TEXT35,
    marginHorizontal: 8,
  },

  picker: {
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
  },
  sectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: TEXT55,
    marginBottom: 10,
  },
  // Pills filtre §3
  pill: {
    height: 30,
    borderRadius: 999,
    paddingHorizontal: 14,
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  pillActive: { backgroundColor: INK },
  pillInactive: { backgroundColor: 'rgba(15,23,42,0.08)' },
  pillText: { fontFamily: FontFamily.sansSemiBold, fontSize: 12 },

  preview: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
  },
  previewName: { fontFamily: FontFamily.sansBold, fontSize: 16, color: INK },
  previewMeta: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: TEXT55, marginTop: 2 },
  previewId: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: INDIGO,
    marginTop: 4,
  },

  // Bouton primaire §2
  primaryBtn: {
    height: 52,
    width: '100%',
    maxWidth: 240,
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: INK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  primaryBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#FFFFFF',
    marginLeft: 8,
    flexShrink: 1,
  },

  footer: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4 },
  footerText: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 18,
    color: TEXT55,
    marginLeft: 8,
  },
});
