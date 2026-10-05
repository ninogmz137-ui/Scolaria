/**
 * EnteteCarnet — ligne d'identité de l'en-tête du carnet (Accueil), posée sur la partie pleine du fondu
 * (COMPONENTS §18.3). Remplace « Bonjour » + prénom.
 *
 *  [cercle photo 78]  prénom (Figtree 900, 30)
 *                     classe (500, 14)
 *                     pilule « [École] · 2026–2027 ⌄ »  → menu des années (même menu que le Suivi)
 *
 * Sans photo : initiale + badge appareil photo (ouvre la feuille de photo) ; avec photo : le cercle lui-même l'ouvre.
 * Pas de bouton « Changer », pas de pastille d'enfants : le sélecteur d'enfant reste l'avatar de la top bar.
 * Tout est blanc sur la couleur de l'enfant (contrastes AA vérifiés : npm run test:entete).
 */

import { View, Image, StyleSheet } from 'react-native';
import { Camera } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../ui';
import BoutonAnnee from '../../screens/suivi/BoutonAnnee';
import type { AnneeParcours } from '../../data/demo/parcours';

const TAILLE = 78;

export default function EnteteCarnet({
  prenom,
  initiale,
  classe,
  ecole,
  enCours,
  archives,
  onParcours,
  photoUri,
  onPhoto,
  paddingTop,
}: {
  prenom: string;
  initiale: string;
  classe: string;
  ecole?: string;
  enCours?: AnneeParcours;
  archives: AnneeParcours[];
  onParcours: () => void;
  /** Photo de l'enfant (URL signée ou fichier local) ; absente : initiale sur la couleur de l'enfant. */
  photoUri?: string | null;
  /** Ouvre la feuille de photo ; absent : le cercle n'est pas pressable (aucun faux bouton). */
  onPhoto?: () => void;
  /** insets.top + 64 */
  paddingTop: number;
}) {
  const cercle = (
    <View style={st.cercle}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={st.photo} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <Text style={st.initiale}>{initiale}</Text>
      )}
    </View>
  );

  return (
    <View style={[st.ligne, { paddingTop }]}>
      <View style={st.cercleZone}>
        {onPhoto ? (
          <Pressable
            onPress={onPhoto}
            accessibilityRole="button"
            accessibilityLabel={photoUri ? `Photo de ${prenom}. Modifier` : `Ajouter une photo de ${prenom}`}
          >
            {cercle}
          </Pressable>
        ) : (
          cercle
        )}
        {onPhoto && !photoUri ? (
          <Pressable
            onPress={onPhoto}
            style={st.badge}
            hitSlop={9}
            accessibilityRole="button"
            accessibilityLabel={`Ajouter une photo de ${prenom}`}
          >
            <Camera size={14} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
      <View style={st.textes}>
        <Text style={st.prenom} numberOfLines={1}>{prenom}</Text>
        {classe ? <Text style={st.classe} numberOfLines={1}>{classe}</Text> : null}
        {enCours ? (
          <View style={st.piluleZone}>
            <BoutonAnnee enCours={enCours} archives={archives} onParcours={onParcours} pilule={{ ecole }} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  cercleZone: { width: TAILLE, height: TAILLE, marginRight: 14 },
  cercle: {
    width: TAILLE,
    height: TAILLE,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: TAILLE - 6, height: TAILLE - 6 },
  initiale: { fontFamily: FontFamily.displayBold, fontSize: 30, lineHeight: 36, color: '#FFFFFF' },
  // Badge appareil photo 26 px, zone tactile 44 par hitSlop (le cercle entier ouvre aussi la feuille).
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textes: { flex: 1, minWidth: 0 },
  prenom: {
    fontFamily: FontFamily.displaySemiBold, // Figtree 900
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1.1,
    color: '#FFFFFF',
  },
  classe: { fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 18, color: 'rgba(255,255,255,0.95)' },
  piluleZone: { marginTop: 6 },
});
