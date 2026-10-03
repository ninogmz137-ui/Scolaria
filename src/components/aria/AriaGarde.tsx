/**
 * AriaGarde — entrée des écrans d'Aria (L10, décision D8 du 27 sept 2026).
 *
 * - Première utilisation : écran d'information (formulation validée : ce qui part chez Anthropic, où,
 *   combien de temps). « Activer Aria » ou « Pas maintenant » (Aria reste désactivée).
 * - Aria désactivée (Famille & paramètres) : écran clair, rien n'est envoyé ; « Activer Aria ».
 * - Sinon : l'écran d'Aria.
 * Le blocage réel des appels est dans ariaApi.sendToAria (ariaAutorisee) : cet écran n'en est que la vitrine.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../ui';
import ScolariaSymbol from '../ScolariaSymbol';
import { FORMULATION_HEBERGEMENT_ARIA } from '../../constants/textesLegaux';
import {
  enregistrerPreferencesAria,
  lirePreferencesAria,
  surChangementAria,
  type PreferencesAria,
} from '../../services/ariaPreferences';

const NAVY = '#0F172A';
const TEXT55 = 'rgba(15,23,42,0.55)';

export default function AriaGarde({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [prefs, setPrefs] = useState<PreferencesAria | null>(null);

  useEffect(() => {
    lirePreferencesAria().then(setPrefs);
    return surChangementAria(setPrefs);
  }, []);

  if (!prefs) return <View style={st.racine} />;
  if (prefs.ariaActive && prefs.ariaInfoVue) return <>{children}</>;

  const activer = () => enregistrerPreferencesAria({ ariaActive: true, ariaInfoVue: true });
  const pasMaintenant = async () => {
    await enregistrerPreferencesAria({ ariaActive: false, ariaInfoVue: true });
    if (navigation.canGoBack()) navigation.goBack();
  };

  const premiereFois = !prefs.ariaInfoVue;
  return (
    <View style={[st.racine, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 90 }]}>
      <ScrollView contentContainerStyle={st.contenu} showsVerticalScrollIndicator={false}>
        <View style={st.symbole}>
          <ScolariaSymbol size={40} color="#4338CA" />
        </View>
        <Text style={st.titre}>{premiereFois ? 'Avant d’utiliser Aria' : 'Aria est désactivée'}</Text>
        {premiereFois ? (
          <>
            <Text style={st.texte}>
              Aria vous aide à suivre le carnet de votre enfant. Elle ne pose aucun diagnostic : elle suggère et informe.
            </Text>
            <Text style={st.texte}>{FORMULATION_HEBERGEMENT_ARIA}</Text>
            <Text style={st.texteDiscret}>Vous pourrez désactiver Aria à tout moment dans Famille & paramètres.</Text>
          </>
        ) : (
          <Text style={st.texte}>
            Aucun message n’est envoyé à Aria tant qu’elle est désactivée. Vous pouvez la réactiver ici ou dans
            Famille & paramètres.
          </Text>
        )}
        <Pressable onPress={activer} style={({ pressed }) => [st.primaire, pressed && st.presse]} accessibilityRole="button">
          <Text style={st.primaireTexte}>Activer Aria</Text>
        </Pressable>
        {premiereFois && (
          <Pressable onPress={pasMaintenant} style={st.ghost} accessibilityRole="button">
            <Text style={st.ghostTexte}>Pas maintenant</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  racine: { flex: 1, backgroundColor: '#F2F1EE' },
  contenu: { paddingHorizontal: 24, paddingBottom: 24 },
  symbole: { alignItems: 'center', marginBottom: 16 },
  titre: {
    fontFamily: FontFamily.displayBold,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.6,
    color: NAVY,
    textAlign: 'center',
    marginBottom: 16,
  },
  texte: { fontFamily: FontFamily.sansRegular, fontSize: 14, lineHeight: 21, color: NAVY, marginBottom: 12 },
  texteDiscret: { fontFamily: FontFamily.sansRegular, fontSize: 13, lineHeight: 19, color: TEXT55, marginBottom: 20 },
  primaire: {
    height: 52,
    maxWidth: 240,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaireTexte: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#FFFFFF' },
  presse: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  ghost: { minHeight: 44, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 8 },
  ghostTexte: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: TEXT55 },
});
