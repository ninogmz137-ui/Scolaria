/**
 * CarnetVide — carte de l'Accueil d'un carnet ENTIÈREMENT vide (compte réel, tous niveaux ; jamais en démo).
 * Une phrase honnête et une pilule compacte « Ajouter au carnet » qui ouvre la feuille existante (même que le « + » de la
 * barre du bas). Affichée seulement si useCarnetVide le prouve (chargement fini, aucune erreur, aucune table non vide).
 */

import { View, StyleSheet, Platform } from 'react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../ui';
import { demanderAjoutCarnet } from '../../services/ouvertureAjout';
import { de } from '../../utils/francais';

export default function CarnetVide({ prenom }: { prenom: string }) {
  return (
    <View style={st.carte}>
      <Text style={st.titre}>{`Le carnet ${de(prenom)} est vide pour l’instant.`}</Text>
      <Text style={st.texte}>
        Ajoutez un mot reçu, un livret, un souvenir ou une première fois : tout est rangé dans son carnet.
      </Text>
      <Pressable
        onPress={() => demanderAjoutCarnet({ onglet: 'Accueil' })}
        // 40 dp de visuel + 2 + 2 = 44 dp tactiles (COMPONENTS §2, pilule compacte)
        hitSlop={{ top: 2, bottom: 2 }}
        style={st.pilule}
        accessibilityRole="button"
        accessibilityLabel="Ajouter au carnet"
      >
        <Text style={st.piluleTexte}>Ajouter au carnet</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  // Carte blanche d'écran principal : fond opaque, ombre iOS seulement (élévation = rectangle gris sur Android).
  carte: {
    marginHorizontal: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 0 },
      default: {},
    }),
  },
  titre: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, lineHeight: 19, color: '#0F172A' },
  texte: { fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 17, color: 'rgba(15,23,42,0.6)', marginTop: 3 },
  pilule: {
    alignSelf: 'flex-start',
    marginTop: 12,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  piluleTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, lineHeight: 18, color: '#FFFFFF' },
});
