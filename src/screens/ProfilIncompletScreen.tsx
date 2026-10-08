/**
 * ProfilIncompletScreen — compte connecté dont le profil n'existe pas et n'a pas pu être créé
 * automatiquement (compte enseignant / élève, ou échec réseau / droits). Jamais d'écran blanc :
 * un message clair, « Réessayer » et « Se déconnecter ».
 */

import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text, Pressable } from '../components/ui';
import ScolariaSymbol from '../components/ScolariaSymbol';

export default function ProfilIncompletScreen({
  onReessayer,
  onDeconnecter,
}: {
  onReessayer: () => Promise<void>;
  onDeconnecter: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [essai, setEssai] = useState(false);
  const reessayer = async () => {
    setEssai(true);
    try {
      await onReessayer();
    } finally {
      setEssai(false);
    }
  };
  return (
    <View style={[st.root, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
      <ScolariaSymbol size={48} />
      <Text style={st.titre}>Votre inscription n’est pas terminée</Text>
      <Text style={st.texte}>
        Votre compte existe, mais son profil n’a pas pu être créé. Réessayez : si le problème continue,
        déconnectez-vous puis reconnectez-vous plus tard.
      </Text>
      <Pressable onPress={reessayer} disabled={essai} style={[st.primaire, essai && { opacity: 0.5 }]} accessibilityRole="button">
        {essai ? <ActivityIndicator color="#FFFFFF" /> : <Text style={st.primaireTexte}>Réessayer</Text>}
      </Pressable>
      <Pressable onPress={onDeconnecter} style={st.secondaire} accessibilityRole="button">
        <Text style={st.secondaireTexte}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F1EE', alignItems: 'center', paddingHorizontal: 24 },
  titre: { fontFamily: FontFamily.sansBold, fontSize: 20, lineHeight: 26, color: '#0F172A', textAlign: 'center', marginTop: 24 },
  texte: { fontFamily: FontFamily.sansRegular, fontSize: 15, lineHeight: 22, color: 'rgba(15,23,42,0.62)', textAlign: 'center', marginTop: 12 },
  primaire: {
    height: 52,
    minWidth: 200,
    maxWidth: 240,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  primaireTexte: { fontFamily: FontFamily.sansBold, fontSize: 15, lineHeight: 20, color: '#FFFFFF' },
  secondaire: {
    height: 52,
    minWidth: 200,
    maxWidth: 240,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaireTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 15, lineHeight: 20, color: '#0F172A' },
});
