/**
 * AjouterAnneScreen — Wizard 4 steps to add a past school year
 *
 * Step 1: Select niveau + annee scolaire
 * Step 2: Optional etablissement + classe
 * Step 3: Propose OCR bulletin scan
 * Step 4: Confirmation
 */

import { useState } from 'react';
import { ScrollView, TextInput, Alert } from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { createAcademicYear, type Niveau } from '../services/database';

// ─── Constants ────────────────────────────────────────────

const NIVEAUX: { group: string; items: Niveau[] }[] = [
  { group: 'Maternelle', items: ['PS', 'MS', 'GS'] },
  { group: 'Elementaire', items: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'] },
  { group: 'Collège', items: ['6ème', '5ème', '4ème', '3ème'] },
  { group: 'Lycée', items: ['2nde', '1ère', 'Terminale'] },
];

function generatePastYears(count: number): string[] {
  const now = new Date();
  const currentYearStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const result: string[] = [];
  for (let i = 1; i <= count; i++) {
    const start = currentYearStart - i;
    result.push(`${start}-${start + 1}`);
  }
  return result;
}

const PAST_YEARS = generatePastYears(10);

// ─── Component ────────────────────────────────────────────

export default function AjouterAnneScreen() {
  const { theme } = useSchoolMode();
  const { selectedChild } = useActiveChild();
  const navigation = useNavigation<any>();

  const [step, setStep] = useState(1);
  const [selectedNiveau, setSelectedNiveau] = useState<Niveau | null>(null);
  const [selectedAnnee, setSelectedAnnee] = useState<string | null>(null);
  const [etablissement, setEtablissement] = useState('');
  const [classe, setClasse] = useState('');
  const [creating, setCreating] = useState(false);

  const canProceedStep1 = selectedNiveau && selectedAnnee;
  const childName = selectedChild?.name ?? 'l\'enfant';

  const handleCreate = async () => {
    if (!selectedNiveau || !selectedAnnee || !selectedChild) return;

    setCreating(true);
    const result = await createAcademicYear({
      student_id: selectedChild.id,
      annee_scolaire: selectedAnnee,
      niveau: selectedNiveau,
      etablissement: etablissement || undefined,
      classe: classe || undefined,
      statut: 'importée',
    });
    setCreating(false);

    if (result.error) {
      Alert.alert('Erreur', 'Impossible de creer le millesime');
      return;
    }

    Alert.alert(
      'Millesime cree',
      `L'annee ${selectedAnnee} (${selectedNiveau}) a ete ajoutee au profil de ${childName}.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  const handleScanBulletins = () => {
    setStep(4);
  };

  // ─── Step renderers ──────────────────────────────────────

  const renderStep1 = () => (
    <Box className="px-6 pb-10">
      <Text className="text-[22px] font-extrabold mb-1.5" style={{ color: theme.textPrimary }}>
        Quelle annee scolaire ?
      </Text>
      <Text className="text-sm leading-5 mb-6" style={{ color: theme.textSecondary }}>
        Selectionnez le niveau et l'annee a ajouter au profil de {childName}
      </Text>

      {/* Year selection */}
      <Text className="text-[13px] font-bold mb-2 uppercase tracking-wide" style={{ color: theme.textPrimary }}>
        Annee scolaire
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
      >
        {PAST_YEARS.map((year) => (
          <Pressable
            key={year}
            className="px-3.5 py-2 rounded-xl"
            style={{
              borderWidth: 1,
              borderColor: selectedAnnee === year ? theme.accent : theme.cardBorder,
              backgroundColor: selectedAnnee === year ? theme.accent : 'transparent',
            }}
            onPress={() => setSelectedAnnee(year)}
          >
            <Text
              className="text-[13px] font-semibold"
              style={{ color: selectedAnnee === year ? Colors.white : theme.textSecondary }}
            >
              {year}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Niveau selection */}
      <Text
        className="text-[13px] font-bold mb-2 uppercase tracking-wide mt-5"
        style={{ color: theme.textPrimary }}
      >
        Niveau
      </Text>
      {NIVEAUX.map((group) => (
        <Box key={group.group}>
          <Text
            className="text-[11px] font-semibold uppercase tracking-wide mt-3 mb-1.5"
            style={{ color: theme.textMuted }}
          >
            {group.group}
          </Text>
          <Box className="flex-row flex-wrap" style={{ gap: 8 }}>
            {group.items.map((niveau) => (
              <Pressable
                key={niveau}
                className="px-4 py-2.5 rounded-xl"
                style={{
                  borderWidth: 1,
                  borderColor: selectedNiveau === niveau ? theme.accent : theme.cardBorder,
                  backgroundColor: selectedNiveau === niveau ? theme.accent : theme.card,
                }}
                onPress={() => setSelectedNiveau(niveau)}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: selectedNiveau === niveau ? Colors.white : theme.textPrimary }}
                >
                  {niveau}
                </Text>
              </Pressable>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );

  const renderStep2 = () => (
    <Box className="px-6 pb-10">
      <Text className="text-[22px] font-extrabold mb-1.5" style={{ color: theme.textPrimary }}>
        Details (optionnel)
      </Text>
      <Text className="text-sm leading-5 mb-6" style={{ color: theme.textSecondary }}>
        Ces informations sont facultatives — vous pourrez les completer plus tard
      </Text>

      <Text className="text-[13px] font-bold mb-2 uppercase tracking-wide" style={{ color: theme.textPrimary }}>
        Etablissement
      </Text>
      <TextInput
        className="text-[15px] px-3.5 py-3 rounded-xl"
        style={{ color: theme.textPrimary, borderColor: theme.cardBorder, backgroundColor: theme.card, borderWidth: 1 }}
        placeholder="Ex : Ecole Voltaire"
        placeholderTextColor={theme.textMuted}
        value={etablissement}
        onChangeText={setEtablissement}
      />

      <Text className="text-[13px] font-bold mb-2 uppercase tracking-wide mt-4" style={{ color: theme.textPrimary }}>
        Classe
      </Text>
      <TextInput
        className="text-[15px] px-3.5 py-3 rounded-xl"
        style={{ color: theme.textPrimary, borderColor: theme.cardBorder, backgroundColor: theme.card, borderWidth: 1 }}
        placeholder="Ex : CM1 B"
        placeholderTextColor={theme.textMuted}
        value={classe}
        onChangeText={setClasse}
      />

      {/* Preview card */}
      <Box
        className="mt-6 p-4 rounded-2xl"
        style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1 }}
      >
        <Text className="text-sm font-bold mb-1.5" style={{ color: theme.textPrimary }}>
          Resume
        </Text>
        <Text className="text-[13px] leading-5" style={{ color: theme.textSecondary }}>
          {selectedAnnee} · {selectedNiveau}
        </Text>
        {etablissement ? (
          <Text className="text-[13px] leading-5" style={{ color: theme.textSecondary }}>
            {etablissement}{classe ? ` — ${classe}` : ''}
          </Text>
        ) : null}
      </Box>
    </Box>
  );

  const renderStep3 = () => (
    <Box className="px-6 pb-10">
      <Text className="text-[22px] font-extrabold mb-1.5" style={{ color: theme.textPrimary }}>
        Importer des bulletins ?
      </Text>
      <Text className="text-sm leading-5 mb-6" style={{ color: theme.textSecondary }}>
        Vous pouvez scanner des bulletins pour enrichir cette annee. Vous pourrez aussi le faire plus tard.
      </Text>

      {/* Scan option */}
      <Pressable
        className="p-6 rounded-[20px] items-center mb-4"
        style={{ backgroundColor: theme.card, borderColor: theme.accent + '30', borderWidth: 1, gap: 10 }}
        onPress={handleScanBulletins}
      >
        <Box
          className="w-[60px] h-[60px] rounded-full justify-center items-center mb-1"
          style={{ backgroundColor: theme.accent + '15' }}
        >
          <Ionicons name="scan-outline" size={28} color={theme.accent} />
        </Box>
        <Text className="text-base font-bold" style={{ color: theme.textPrimary }}>
          Scanner des bulletins
        </Text>
        <Text className="text-[13px] text-center leading-[18px]" style={{ color: theme.textSecondary }}>
          Prenez en photo ou importez un PDF de bulletin scolaire de l'annee {selectedAnnee}
        </Text>
        <HStack className="items-center rounded-lg mt-1" style={{ backgroundColor: theme.accent + '15', paddingHorizontal: 10, paddingVertical: 4, gap: 4 }}>
          <Ionicons name="sparkles" size={12} color={theme.accent} />
          <Text className="text-[11px] font-bold" style={{ color: theme.accent }}>OCR Google Vision</Text>
        </HStack>
      </Pressable>

      {/* Skip option */}
      <Pressable
        className="flex-row items-center justify-center py-3.5 rounded-[14px]"
        style={{ borderColor: theme.cardBorder, borderWidth: 1, gap: 6 }}
        onPress={() => setStep(4)}
      >
        <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>
          Passer cette etape
        </Text>
        <Ionicons name="arrow-forward" size={16} color={theme.textSecondary} />
      </Pressable>
    </Box>
  );

  const renderStep4 = () => (
    <Box className="px-6 pb-10">
      <Box className="items-center mb-4 mt-5">
        <Text style={{ fontSize: 48 }}>📚</Text>
      </Box>
      <Text className="text-[22px] font-extrabold text-center mb-1.5" style={{ color: theme.textPrimary }}>
        Pret a creer le millesime
      </Text>
      <Text className="text-sm text-center leading-5" style={{ color: theme.textSecondary }}>
        L'annee {selectedAnnee} ({selectedNiveau}) sera ajoutee au profil de {childName} en statut "importee"
      </Text>

      <Box
        className="mt-5 p-4 rounded-2xl"
        style={{ backgroundColor: theme.card, borderColor: theme.cardBorder, borderWidth: 1, gap: 10 }}
      >
        <SummaryRow label="Annee" value={selectedAnnee ?? ''} color={theme.textPrimary} />
        <SummaryRow label="Niveau" value={selectedNiveau ?? ''} color={theme.textPrimary} />
        {etablissement ? <SummaryRow label="Etablissement" value={etablissement} color={theme.textPrimary} /> : null}
        {classe ? <SummaryRow label="Classe" value={classe} color={theme.textPrimary} /> : null}
        <SummaryRow label="Statut" value="Importee" color={Colors.cyan} />
      </Box>
    </Box>
  );

  return (
    <Box className="flex-1" style={{ backgroundColor: theme.bg }}>
      {/* Progress bar */}
      <HStack className="justify-center py-4" style={{ gap: 8 }}>
        {[1, 2, 3, 4].map((s) => (
          <Box
            key={s}
            className="h-1 rounded-sm"
            style={{
              width: s === step ? 48 : 32,
              backgroundColor: s <= step ? theme.accent : theme.cardBorder,
            }}
          />
        ))}
      </HStack>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      {/* Navigation buttons */}
      <HStack
        className="items-center px-5 py-4"
        style={{ borderTopWidth: 1, borderColor: theme.cardBorder, gap: 12 }}
      >
        {step > 1 && (
          <Pressable
            className="flex-row items-center px-4 py-3 rounded-[14px]"
            style={{ borderColor: theme.cardBorder, borderWidth: 1, gap: 6 }}
            onPress={() => setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
            <Text className="text-sm font-semibold" style={{ color: theme.textSecondary }}>Retour</Text>
          </Pressable>
        )}

        <Box className="flex-1" />

        {step < 4 ? (
          <Pressable
            className="rounded-[14px] overflow-hidden"
            style={!canProceedStep1 && step === 1 ? { opacity: 0.4 } : undefined}
            onPress={() => {
              if (step === 1 && !canProceedStep1) return;
              setStep(step + 1);
            }}
            disabled={step === 1 && !canProceedStep1}
          >
            <LinearGradient
              colors={[theme.accent, theme.accentDark ?? theme.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 }}
            >
              <Text className="text-[15px] font-bold" style={{ color: Colors.white }}>Suivant</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            className="rounded-[14px] overflow-hidden"
            onPress={handleCreate}
            disabled={creating}
          >
            <LinearGradient
              colors={[Colors.green, '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 }}
            >
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text className="text-[15px] font-bold" style={{ color: Colors.white }}>
                {creating ? 'Creation...' : 'Creer le millesime'}
              </Text>
            </LinearGradient>
          </Pressable>
        )}
      </HStack>
    </Box>
  );
}

// ─── Small helper ────────────────────────────────────────

function SummaryRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <HStack className="justify-between items-center">
      <Text className="text-[13px] font-medium" style={{ color: Colors.textSecondary }}>{label}</Text>
      <Text className="text-sm font-bold" style={{ color }}>{value}</Text>
    </HStack>
  );
}
