/**
 * EnteteCarnet — ligne d'identité de l'en-tête de l'Accueil (lot 6, prompt du 16 nov. ; COMPONENTS §18.3), posée sur la
 * partie pleine du fondu de la couleur de l'enfant :
 *
 *  [rond 52]  prénom (Figtree 800 · 24 · blanc)
 *             « classe · enseignant · école » (13 px, blanc 95 %) — un élément absent est omis avec son séparateur
 *
 * Rond : la photo de l'enfant, sinon son initiale sur blanc translucide. Photo facultative, jamais exigée : sans photo,
 * toucher le rond propose « Ajouter une photo » (feuille de photo) ; avec photo, il ouvre la même feuille. Démo : pas de
 * photo, le rond n'est pas pressable (aucun faux bouton). Pas de « Bonjour », pas de pilule d'année (l'année vit dans
 * Scolarité), pas de sélecteur : l'avatar de la top bar reste le sélecteur d'enfant.
 * Contrastes AA sur les 6 couleurs d'enfant : npm run test:entete.
 */

import { View, Image, StyleSheet } from 'react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../ui';

const TAILLE = 52;

export function ligneIdentite(classe?: string | null, enseignant?: string | null, ecole?: string | null): string {
  return [classe, enseignant, ecole].map((x) => (x ?? '').trim()).filter(Boolean).join(' · ');
}

export default function EnteteCarnet({
  prenom,
  initiale,
  classe,
  enseignant,
  ecole,
  photoUri,
  onPhoto,
  anneePhoto,
  paddingTop,
}: {
  prenom: string;
  initiale: string;
  classe: string;
  enseignant?: string | null;
  ecole?: string;
  /** Photo de l'enfant (URL signée courte ou fichier local) ; absente : initiale. */
  photoUri?: string | null;
  /** Ouvre la feuille de photo ; absent : le rond n'est pas pressable. */
  onPhoto?: () => void;
  /** Variante A : la photo affichée est celle de l'année N−1 (libellé d'accessibilité seulement à cette taille). */
  anneePhoto?: string | null;
  /** insets.top + 64 */
  paddingTop: number;
}) {
  const ligne = ligneIdentite(classe, enseignant, ecole);
  const rond = (
    <View style={st.rond}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={st.photo} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <Text style={st.initiale}>{initiale}</Text>
      )}
    </View>
  );

  return (
    <View style={[st.ligne, { paddingTop }]}>
      {onPhoto ? (
        <Pressable
          onPress={onPhoto}
          hitSlop={4}
          style={st.rondZone}
          accessibilityRole="button"
          accessibilityLabel={
            anneePhoto ? `Photo de ${prenom} de ${anneePhoto}. Ajouter celle de cette année` : photoUri ? `Photo de ${prenom}. Modifier` : `Ajouter une photo de ${prenom}`
          }
        >
          {rond}
        </Pressable>
      ) : (
        <View style={st.rondZone}>{rond}</View>
      )}
      <View style={st.textes}>
        <Text style={st.prenom} numberOfLines={1} accessibilityRole="header">{prenom}</Text>
        {ligne ? <Text style={st.sousLigne} numberOfLines={2}>{ligne}</Text> : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  rondZone: { width: TAILLE, height: TAILLE, marginRight: 12 },
  rond: {
    width: TAILLE,
    height: TAILLE,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: TAILLE - 4, height: TAILLE - 4 },
  initiale: { fontFamily: FontFamily.displayBold, fontSize: 22, lineHeight: 26, color: '#FFFFFF' },
  textes: { flex: 1, minWidth: 0 },
  prenom: { fontFamily: FontFamily.displayBold, fontSize: 24, lineHeight: 28, letterSpacing: -0.6, color: '#FFFFFF' },
  sousLigne: { fontFamily: FontFamily.sansMedium, fontSize: 13, lineHeight: 17, color: 'rgba(255,255,255,0.95)', marginTop: 1 },
});
