/**
 * Ajouter un Enfant — Formulaire complet pour ajouter un enfant.
 *
 * Champs : prénom, date de naissance, école, classe, emoji avatar.
 * Génère automatiquement un identifiant Scolaria (SCA-YYYY-FR-XXXXXX).
 */

import { useState, useRef, useEffect } from 'react';
import {
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
      className="flex-1 bg-blue-night"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={{
            paddingHorizontal: 20,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Header */}
          <View className="items-center pt-5 pb-2">
            <Text style={{ fontSize: 42, marginBottom: 10 }}>👶</Text>
            <Text className="text-2xl font-extrabold text-white mb-1.5">Ajouter un enfant</Text>
            <Text className="text-sm text-gray-400 text-center leading-5">
              Remplissez les informations de votre enfant pour créer son passeport scolaire
            </Text>
          </View>

          {/* Scolaria ID badge */}
          <Animated.View style={{ marginVertical: 20, borderRadius: 16, overflow: 'hidden', transform: [{ scale: idPulse }] }}>
            <LinearGradient
              colors={[Colors.violet + '30', Colors.cyan + '15']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1, borderColor: Colors.cyan + '25' }}
            >
              <Ionicons name="finger-print" size={20} color={Colors.cyan} />
              <View>
                <Text className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Identifiant Scolaria</Text>
                <Text className="text-base font-extrabold mt-0.5" style={{ color: Colors.cyan, letterSpacing: 1 }}>{scolariaId}</Text>
              </View>
              <View className="ml-auto rounded-[10px] px-2.5 py-1" style={{ backgroundColor: Colors.green + '20' }}>
                <Text className="text-[11px] font-bold" style={{ color: Colors.green }}>Auto</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Avatar picker */}
          <View className="mb-5">
            <Text className="text-sm font-bold text-gray-300 mb-3">Avatar</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
            >
              {AVATARS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  className="w-[52px] h-[52px] rounded-[26px] justify-center items-center"
                  style={{
                    backgroundColor: selectedAvatar === emoji ? Colors.cyan + '15' : Colors.blueNightCard,
                    borderWidth: 2,
                    borderColor: selectedAvatar === emoji ? Colors.cyan : 'transparent',
                  }}
                  onPress={() => setSelectedAvatar(emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Prénom & Nom */}
          <View className="flex-row gap-3">
            <View className="flex-1 mb-4.5">
              <Text className="text-[13px] font-semibold text-gray-300 mb-2">
                Prénom <Text className="text-red-500">*</Text>
              </Text>
              <View className="flex-row items-center bg-blue-night-card rounded-[14px] border border-white/10 px-3.5 gap-2.5">
                <Ionicons name="person" size={18} color={Colors.gray} />
                <TextInput
                  className="flex-1 text-white text-[15px] py-3.5"
                  placeholder="Lucas"
                  placeholderTextColor={Colors.gray}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View className="flex-1 mb-4.5">
              <Text className="text-[13px] font-semibold text-gray-300 mb-2">Nom</Text>
              <View className="flex-row items-center bg-blue-night-card rounded-[14px] border border-white/10 px-3.5 gap-2.5">
                <Ionicons name="person-outline" size={18} color={Colors.gray} />
                <TextInput
                  className="flex-1 text-white text-[15px] py-3.5"
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
          <View className="mb-4.5">
            <Text className="text-[13px] font-semibold text-gray-300 mb-2">
              Date de naissance <Text className="text-red-500">*</Text>
            </Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1 flex-row items-center bg-blue-night-card rounded-[14px] border border-white/10 px-3.5 gap-2.5">
                <TextInput
                  className="flex-1 text-white text-[15px] py-3.5 text-center"
                  placeholder="JJ"
                  placeholderTextColor={Colors.gray}
                  value={birthDay}
                  onChangeText={(t) => setBirthDay(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <Text className="text-xl text-gray-400 font-light">/</Text>
              <View className="flex-1 flex-row items-center bg-blue-night-card rounded-[14px] border border-white/10 px-3.5 gap-2.5">
                <TextInput
                  className="flex-1 text-white text-[15px] py-3.5 text-center"
                  placeholder="MM"
                  placeholderTextColor={Colors.gray}
                  value={birthMonth}
                  onChangeText={(t) => setBirthMonth(t.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <Text className="text-xl text-gray-400 font-light">/</Text>
              <View
                className="flex-row items-center bg-blue-night-card rounded-[14px] border border-white/10 px-3.5 gap-2.5"
                style={{ flex: 1.5 }}
              >
                <TextInput
                  className="flex-1 text-white text-[15px] py-3.5 text-center"
                  placeholder="AAAA"
                  placeholderTextColor={Colors.gray}
                  value={birthYear}
                  onChangeText={(t) => setBirthYear(t.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              {computeAge() !== null && (
                <View className="rounded-xl px-3 py-2 ml-1" style={{ backgroundColor: Colors.cyan + '20' }}>
                  <Text className="text-[13px] font-bold" style={{ color: Colors.cyan }}>{computeAge()} ans</Text>
                </View>
              )}
            </View>
          </View>

          {/* École */}
          <View className="mb-4.5">
            <Text className="text-[13px] font-semibold text-gray-300 mb-2">École / Établissement</Text>
            <View className="flex-row items-center bg-blue-night-card rounded-[14px] border border-white/10 px-3.5 gap-2.5">
              <Ionicons name="business" size={18} color={Colors.gray} />
              <TextInput
                className="flex-1 text-white text-[15px] py-3.5"
                placeholder="École Victor Hugo"
                placeholderTextColor={Colors.gray}
                value={school}
                onChangeText={setSchool}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Classe */}
          <View className="mb-4.5">
            <Text className="text-[13px] font-semibold text-gray-300 mb-2">
              Classe <Text className="text-red-500">*</Text>
            </Text>
            <TouchableOpacity
              className="flex-row items-center bg-blue-night-card rounded-[14px] border px-3.5 gap-2.5 justify-between"
              style={{ borderColor: showClassePicker ? Colors.cyan + '40' : 'rgba(255,255,255,0.08)' }}
              onPress={() => setShowClassePicker(!showClassePicker)}
              activeOpacity={0.8}
            >
              <Ionicons name="school" size={18} color={Colors.gray} />
              <Text
                className="flex-1 text-[15px] py-3.5"
                style={{ color: selectedClasse ? Colors.white : Colors.gray, fontWeight: selectedClasse ? '600' : '400' }}
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
              <View className="bg-blue-night-card rounded-2xl p-4 mt-2.5 border border-white/10" style={{ gap: 16 }}>
                {CLASSES.map((section) => (
                  <View key={section.section}>
                    <Text className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: Colors.cyan }}>
                      {section.section}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {section.items.map((classe) => (
                        <TouchableOpacity
                          key={classe}
                          className="px-4 py-2.5 rounded-xl border"
                          style={{
                            backgroundColor: selectedClasse === classe ? Colors.violet + '30' : 'rgba(255,255,255,0.06)',
                            borderColor: selectedClasse === classe ? Colors.violet : 'rgba(255,255,255,0.08)',
                          }}
                          onPress={() => {
                            setSelectedClasse(classe);
                            setShowClassePicker(false);
                          }}
                        >
                          <Text
                            className="text-sm font-semibold"
                            style={{ color: selectedClasse === classe ? Colors.white : Colors.gray }}
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
            <View className="mb-5 rounded-[18px] overflow-hidden">
              <LinearGradient
                colors={[Colors.blueNightCard, Colors.blueNightLight]}
                style={{ padding: 18, borderRadius: 18, borderWidth: 1, borderColor: Colors.violet + '25' }}
              >
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3.5">Aperçu du profil</Text>
                <View className="flex-row items-center gap-3.5">
                  <Text style={{ fontSize: 42 }}>{selectedAvatar}</Text>
                  <View className="flex-1">
                    <Text className="text-lg font-extrabold text-white">
                      {firstName} {lastName}
                    </Text>
                    <Text className="text-[13px] text-gray-400 mt-0.5">
                      {selectedClasse} • {computeAge()} ans
                      {school ? ` • ${school}` : ''}
                    </Text>
                    <Text className="text-xs font-bold mt-1" style={{ color: Colors.cyan, letterSpacing: 0.5 }}>{scolariaId}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            className="rounded-full overflow-hidden mb-4"
            style={!isFormValid ? { opacity: 0.5 } : undefined}
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
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 }}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="person-add" size={22} color={Colors.white} />
                  <Text className="text-[17px] font-extrabold text-white">Ajouter {firstName || 'l\'enfant'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Info footer */}
          <View className="flex-row items-start gap-2 px-1">
            <Ionicons name="shield-checkmark" size={14} color={Colors.cyan} />
            <Text className="flex-1 text-xs text-gray-400 leading-[18px]">
              Les données sont protégées et conformes au RGPD.
              L'identifiant Scolaria est unique et non modifiable.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
