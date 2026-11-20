/**
 * VisionneuseImageScreen — une photo du carnet affichée DANS l'app, depuis son URL signée d'1 h (L6).
 * Aucun fichier n'est écrit hors du cache privé de l'app ; rien dans la galerie ni les téléchargements.
 * Params : { url, titre }.
 */

import { useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { X } from 'lucide-react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text, Pressable } from '../components/ui';

export default function VisionneuseImageScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { url, titre } = (useRoute<any>().params ?? {}) as { url?: string; titre?: string };
  const [etat, setEtat] = useState<'chargement' | 'ok' | 'erreur'>('chargement');

  return (
    <View style={st.racine}>
      <View style={[st.entete, { paddingTop: insets.top + 8 }]}>
        <Text style={st.titre} numberOfLines={1}>
          {titre ?? ''}
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={st.fermer} accessibilityRole="button" accessibilityLabel="Fermer">
          <X size={22} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      </View>
      <View style={st.image}>
        {url ? (
          <Image
            source={{ uri: url }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            onLoad={() => setEtat('ok')}
            onError={() => setEtat('erreur')}
            accessibilityLabel={titre}
          />
        ) : null}
        {etat === 'chargement' && <ActivityIndicator color="#FFFFFF" />}
        {(etat === 'erreur' || !url) && <Text style={st.erreur}>La photo n’a pas pu être affichée. Réessayez.</Text>}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  racine: { flex: 1, backgroundColor: '#0F172A' },
  entete: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  titre: { flex: 1, fontFamily: FontFamily.sansSemiBold, fontSize: 15, color: '#FFFFFF' },
  fermer: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  image: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  erreur: { fontFamily: FontFamily.sansRegular, fontSize: 14, color: '#FFFFFF', paddingHorizontal: 24, textAlign: 'center' },
});
