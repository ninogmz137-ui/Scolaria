/**
 * Ajouter un Enfant — Formulaire complet pour ajouter un enfant.
 *
 * Champs : prénom, date de naissance, école, classe, emoji avatar.
 * Génère automatiquement un identifiant Scolaria (SCA-YYYY-FR-XXXXXX).
 */

import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>👶</Text>
            <Text style={styles.headerTitle}>Ajouter un enfant</Text>
            <Text style={styles.headerSubtitle}>
              Remplissez les informations de votre enfant pour créer son passeport scolaire
            </Text>
          </View>

          {/* Scolaria ID badge */}
          <Animated.View style={[styles.idBadge, { transform: [{ scale: idPulse }] }]}>
            <LinearGradient
              colors={[Colors.violet + '30', Colors.cyan + '15']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.idGradient}
            >
              <Ionicons name="finger-print" size={20} color={Colors.cyan} />
              <View>
                <Text style={styles.idLabel}>Identifiant Scolaria</Text>
                <Text style={styles.idValue}>{scolariaId}</Text>
              </View>
              <View style={styles.autoBadge}>
                <Text style={styles.autoText}>Auto</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Avatar picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avatar</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarList}
            >
              {AVATARS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.avatarItem,
                    selectedAvatar === emoji && styles.avatarItemSelected,
                  ]}
                  onPress={() => setSelectedAvatar(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.avatarEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Prénom & Nom */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                Prénom <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person" size={18} color={Colors.gray} />
                <TextInput
                  style={styles.input}
                  placeholder="Lucas"
                  placeholderTextColor={Colors.gray}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Nom</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={Colors.gray} />
                <TextInput
                  style={styles.input}
                  placeholder="Moreau"
                  placeholderTextColor={Colors.gray}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          </View>

          {/* Date de naissance */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Date de naissance <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.dateRow}>
              <View style={[styles.inputWrapper, styles.dateInput]}>
                <TextInput
                  style={[styles.input, styles.dateInputText]}
                  placeholder="JJ"
                  placeholderTextColor={Colors.gray}
                  value={birthDay}
                  onChangeText={(t) => setBirthDay(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <Text style={styles.dateSep}>/</Text>
              <View style={[styles.inputWrapper, styles.dateInput]}>
                <TextInput
                  style={[styles.input, styles.dateInputText]}
                  placeholder="MM"
                  placeholderTextColor={Colors.gray}
                  value={birthMonth}
                  onChangeText={(t) => setBirthMonth(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <Text style={styles.dateSep}>/</Text>
              <View style={[styles.inputWrapper, styles.dateInputYear]}>
                <TextInput
                  style={[styles.input, styles.dateInputText]}
                  placeholder="AAAA"
                  placeholderTextColor={Colors.gray}
                  value={birthYear}
                  onChangeText={(t) => setBirthYear(t.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              {computeAge() !== null && (
                <View style={styles.ageBadge}>
                  <Text style={styles.ageText}>{computeAge()} ans</Text>
                </View>
              )}
            </View>
          </View>

          {/* École */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>École / Établissement</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="business" size={18} color={Colors.gray} />
              <TextInput
                style={styles.input}
                placeholder="École Victor Hugo"
                placeholderTextColor={Colors.gray}
                value={school}
                onChangeText={setSchool}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Classe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Classe <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.inputWrapper,
                styles.classeSelector,
                showClassePicker && styles.classeSelectorOpen,
              ]}
              onPress={() => setShowClassePicker(!showClassePicker)}
              activeOpacity={0.8}
            >
              <Ionicons name="school" size={18} color={Colors.gray} />
              <Text
                style={[
                  styles.classeSelectorText,
                  selectedClasse && styles.classeSelectorTextActive,
                ]}
              >
                {selectedClasse || 'Sélectionner la classe'}
              </Text>
              <Ionicons
                name={showClassePicker ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.gray}
              />
            </TouchableOpacity>

            {showClassePicker && (
              <View style={styles.classePickerContainer}>
                {CLASSES.map((section) => (
                  <View key={section.section}>
                    <Text style={styles.classeSectionTitle}>{section.section}</Text>
                    <View style={styles.classeChips}>
                      {section.items.map((classe) => (
                        <TouchableOpacity
                          key={classe}
                          style={[
                            styles.classeChip,
                            selectedClasse === classe && styles.classeChipSelected,
                          ]}
                          onPress={() => {
                            setSelectedClasse(classe);
                            setShowClassePicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.classeChipText,
                              selectedClasse === classe && styles.classeChipTextSelected,
                            ]}
                          >
                            {classe}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Summary preview */}
          {isFormValid && (
            <View style={styles.preview}>
              <LinearGradient
                colors={[Colors.blueNightCard, Colors.blueNightLight]}
                style={styles.previewGradient}
              >
                <Text style={styles.previewTitle}>Aperçu du profil</Text>
                <View style={styles.previewContent}>
                  <Text style={styles.previewAvatar}>{selectedAvatar}</Text>
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewName}>
                      {firstName} {lastName}
                    </Text>
                    <Text style={styles.previewMeta}>
                      {selectedClasse} • {computeAge()} ans
                      {school ? ` • ${school}` : ''}
                    </Text>
                    <Text style={styles.previewId}>{scolariaId}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!isFormValid || loading}
          >
            <LinearGradient
              colors={
                isFormValid
                  ? [Colors.violet, Colors.violetDark]
                  : ['#333', '#222']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="person-add" size={22} color={Colors.white} />
                  <Text style={styles.submitText}>Ajouter {firstName || 'l\'enfant'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Info footer */}
          <View style={styles.infoFooter}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.cyan} />
            <Text style={styles.infoText}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueNight,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 20,
  },
  // Header
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerEmoji: {
    fontSize: 42,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  // ID Badge
  idBadge: {
    marginVertical: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  idGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cyan + '25',
  },
  idLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  idValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.cyan,
    letterSpacing: 1,
    marginTop: 2,
  },
  autoBadge: {
    marginLeft: 'auto',
    backgroundColor: Colors.green + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  autoText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.green,
  },
  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.lightGray,
    marginBottom: 12,
  },
  // Avatar
  avatarList: {
    gap: 10,
    paddingVertical: 4,
  },
  avatarItem: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.blueNightCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarItemSelected: {
    borderColor: Colors.cyan,
    backgroundColor: Colors.cyan + '15',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  // Form
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.lightGray,
    marginBottom: 8,
  },
  required: {
    color: Colors.red,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blueNightCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
    paddingVertical: 14,
  },
  // Date
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    justifyContent: 'center',
  },
  dateInputYear: {
    flex: 1.5,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blueNightCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    gap: 10,
  },
  dateInputText: {
    textAlign: 'center',
  },
  dateSep: {
    fontSize: 20,
    color: Colors.gray,
    fontWeight: '300',
  },
  ageBadge: {
    backgroundColor: Colors.cyan + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 4,
  },
  ageText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.cyan,
  },
  // Classe picker
  classeSelector: {
    justifyContent: 'space-between',
  },
  classeSelectorOpen: {
    borderColor: Colors.cyan + '40',
  },
  classeSelectorText: {
    flex: 1,
    fontSize: 15,
    color: Colors.gray,
    paddingVertical: 14,
  },
  classeSelectorTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  classePickerContainer: {
    backgroundColor: Colors.blueNightCard,
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 16,
  },
  classeSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.cyan,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  classeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  classeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  classeChipSelected: {
    backgroundColor: Colors.violet + '30',
    borderColor: Colors.violet,
  },
  classeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray,
  },
  classeChipTextSelected: {
    color: Colors.white,
  },
  // Preview
  preview: {
    marginBottom: 20,
    borderRadius: 18,
    overflow: 'hidden',
  },
  previewGradient: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.violet + '25',
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  previewAvatar: {
    fontSize: 42,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  previewMeta: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 3,
  },
  previewId: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.cyan,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  // Submit
  submitButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.white,
  },
  // Info footer
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.gray,
    lineHeight: 18,
  },
});
