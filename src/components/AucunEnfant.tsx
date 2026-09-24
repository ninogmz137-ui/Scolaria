/**
 * AucunEnfant — état vide d'un compte réel qui n'a encore aucun enfant.
 * « Ajoutez le carnet de votre premier enfant » + pill primaire vers « Ajouter un enfant ».
 * Jamais de données ni de prénom de démo à la place.
 */

import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeepScreenHeader } from './DeepScreenHeader';
import { UserPlus } from 'lucide-react-native';
import ScolariaSymbol from './ScolariaSymbol';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text, Pressable } from './ui';

export default function AucunEnfant({ compact }: { compact?: boolean }) {
  const navigation = useNavigation<any>();

  const ajouter = () => {
    navigation.navigate('MainPager', {
      screen: 'Accueil',
      params: { screen: 'AjouterEnfant', initial: false },
    });
  };

  return (
    <View style={[st.root, compact && st.compact]}>
      <ScolariaSymbol size={40} color="#4338CA" />
      <Text style={st.title}>Ajoutez le carnet de votre premier enfant</Text>
      <Text style={st.body}>
        Chaque enfant a son propre carnet : mots, suivi, souvenirs, agenda. Il vous suit de la
        maternelle au bac.
      </Text>
      <Pressable style={st.primary} onPress={ajouter} accessibilityRole="button">
        <UserPlus size={20} color="#FFFFFF" strokeWidth={2} />
        <Text style={st.primaryText}>Ajouter un enfant</Text>
      </Pressable>
    </View>
  );
}

/** Même état vide, en page profonde (en-tête ‹ retour) : pour les écrans qui exigent un enfant. */
export function AucunEnfantPage({ title }: { title: string }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#F2F1EE', paddingBottom: insets.bottom }}>
      <DeepScreenHeader
        title={title}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        withTopInset
      />
      <AucunEnfant />
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  compact: {
    paddingVertical: 24,
  },
  title: {
    fontFamily: FontFamily.sansBold,
    fontSize: 18,
    lineHeight: 24,
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 16,
  },
  body: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(15,23,42,0.55)',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  primary: {
    height: 52,
    width: '100%',
    maxWidth: 240,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
