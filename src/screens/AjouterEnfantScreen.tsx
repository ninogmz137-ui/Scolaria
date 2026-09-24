/**
 * Ajouter un enfant — page profonde (en-tête ‹ retour, sans top bar ni bottom bar).
 *
 * Champs : couleur de l'enfant (avatar = initiale sur cette couleur), prénom, nom,
 * date de naissance, niveau (obligatoire, PS → Terminale), école (facultative, texte libre :
 * l'école n'est pas forcément sur Scolaria, donc pas de liste de classes).
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
  Check,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  GraduationCap,
  User,
  UserPlus,
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeepScreenHeader } from '../components/DeepScreenHeader';
import { CHILD_COLORS, DEFAULT_CHILD_COLOR_HEX } from '../constants/childColors';
import { Text, TextInput } from '../components/ui';
import { de } from '../utils/francais';

// ─── Types ───────────────────────────────────────────────

interface Props {
  navigation: any;
  onChildAdded?: () => void;
}

// ─── Niveaux ─────────────────────────────────────────────

const NIVEAUX = [
  { section: 'Maternelle', items: ['PS', 'MS', 'GS'] },
  { section: 'Élémentaire', items: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'] },
  { section: 'Collège', items: ['6ème', '5ème', '4ème', '3ème'] },
  { section: 'Lycée', items: ['2nde', '1ère', 'Terminale'] },
];

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
  const { reloadChildren } = useActiveChild();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [school, setSchool] = useState('');
  const [niveau, setNiveau] = useState('');
  const [color, setColor] = useState(DEFAULT_CHILD_COLOR_HEX);
  const [showNiveauPicker, setShowNiveauPicker] = useState(false);
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
    niveau !== '' &&
    birthDay !== '' &&
    birthMonth !== '' &&
    birthYear.length === 4;

  // ─── Submit ─────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!isFormValid) {
      Alert.alert('Champs manquants', 'Veuillez remplir le prénom, la date de naissance et le niveau.');
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
        const { data, error } = await createChild({
          parent_id: user!.id,
          scolaria_id: scolariaId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          birth_date: birthDate,
          age,
          classe: niveau,
          school: school.trim(),
          color,
        });
        if (error) throw error;
        // Source unique : la liste des enfants est rechargée et le nouvel enfant devient actif.
        await reloadChildren((data as { id?: string } | null)?.id);
      }

      Alert.alert(
        'Enfant ajouté',
        `Le carnet ${de(firstName)} est créé (identifiant ${scolariaId}).`,
        [
          {
            text: 'OK',
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
  const initiale = firstName.trim().charAt(0).toUpperCase() || '?';

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <DeepScreenHeader title="Ajouter un enfant" onBack={() => navigation.goBack()} withTopInset />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 24,
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
          {/* Intro — le titre est dans l'en-tête */}
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

          {/* Couleur de l'enfant : avatar = initiale sur cette couleur */}
          <Text style={s.label}>Couleur</Text>
          <View style={s.colorRow}>
            <View style={[s.colorPreview, { backgroundColor: color }]}>
              <Text style={s.colorPreviewText}>{initiale}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4, alignItems: 'center' }}
            >
              {CHILD_COLORS.map((c) => {
                const active = color === c.hex;
                return (
                  <TouchableOpacity
                    key={c.hex}
                    style={[s.swatchRing, active && s.swatchRingActive]}
                    hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
                    onPress={() => setColor(c.hex)}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityLabel={c.nom}
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[s.swatch, { backgroundColor: c.hex }]}>
                      {active && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

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
                  placeholder="Prénom"
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
                  placeholder="Nom"
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
            <Text style={s.label}>
              École <Text style={s.optional}>(facultatif)</Text>
            </Text>
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
              Niveau <Text style={s.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[s.input, showNiveauPicker && s.inputFocused]}
              onPress={() => setShowNiveauPicker(!showNiveauPicker)}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <GraduationCap size={18} color={TEXT35} strokeWidth={2} />
              <Text
                style={[
                  s.inputText,
                  {
                    color: niveau ? INK : PLACEHOLDER,
                    fontFamily: niveau ? FontFamily.sansSemiBold : FontFamily.sansRegular,
                  },
                ]}
              >
                {niveau || 'Choisir le niveau'}
              </Text>
              {showNiveauPicker ? (
                <ChevronUp size={18} color={TEXT35} strokeWidth={2} />
              ) : (
                <ChevronDown size={18} color={TEXT35} strokeWidth={2} />
              )}
            </TouchableOpacity>

            {showNiveauPicker && (
              <View style={s.picker}>
                {NIVEAUX.map((section, i) => (
                  <View key={section.section} style={i > 0 ? { marginTop: 16 } : undefined}>
                    <Text style={s.sectionLabel}>{section.section}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {section.items.map((item) => {
                        const active = niveau === item;
                        return (
                          <TouchableOpacity
                            key={item}
                            style={[s.pill, active ? s.pillActive : s.pillInactive]}
                            onPress={() => {
                              setNiveau(item);
                              setShowNiveauPicker(false);
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                          >
                            <Text style={[s.pillText, { color: active ? '#FFFFFF' : TEXT55 }]}>
                              {item}
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
                <View style={[s.colorPreview, s.previewAvatar, { backgroundColor: color }]}>
                  <Text style={s.colorPreviewText}>{initiale}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.previewName}>
                    {firstName} {lastName}
                  </Text>
                  <Text style={s.previewMeta}>
                    {niveau} · {age} ans
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
            <Fingerprint size={14} color={TEXT35} strokeWidth={2} />
            <Text style={s.footerText}>
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
  optional: { fontFamily: FontFamily.sansRegular, color: TEXT55 },

  colorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  colorPreview: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  colorPreviewText: { fontFamily: FontFamily.sansBold, fontSize: 20, color: '#FFFFFF' },
  previewAvatar: { width: 44, height: 44 },
  // 40 px + hitSlop 2 = 44 px tactiles ; 6 pastilles + aperçu tiennent sur 343 px.
  swatchRing: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchRingActive: { borderColor: INK },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
