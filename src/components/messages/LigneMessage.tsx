/**
 * LigneMessage — ligne de la liste à plat de Messages (COMPONENTS §18.4, sprint « Carnet vivant »).
 *
 * Pas une carte : minHeight 64 · avatar 42 rond · séparateur 1px rgba(15,23,42,0.06).
 * École / direction / mairie : fond ardoise + icône building-2. Personne : initiales sur ardoise, aucune teinte propre.
 * Non lu : titre Figtree 700, date indigo 500, point 8px à droite de l'aperçu. Lu : titre 500, date atténuée.
 * Message avec photo : icône image 14px devant l'aperçu + miniature 44×44 à droite.
 * Jamais de rôle, de tag de catégorie, de résumé Aria ni de rouge.
 * Ligne source facultative (« Importé par vous ») et mention « Visible par vous seul ».
 */

import type { ComponentType, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image as ImageIcone, Lock } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../ui';
import { INSTITUTION, TEINTES } from '../../theme/categories';

const NAVY = '#0F172A';
const TEXT55 = 'rgba(15,23,42,0.55)';
const ARDOISE = TEINTES.ardoise;

/** Couleur de l'icône d'une institution : celle de la catégorie (ardoise), jamais une teinte propre. */
export const ICONE_INSTITUTION = INSTITUTION;

export interface LigneMessageProps {
  nom: string;
  date: string;
  apercu: string;
  nonLu: boolean;
  /** Initiales (personne) ou icône (école, direction, mairie, absences). */
  initiales?: string;
  Icone?: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  /** Le message porte une photo : icône devant l'aperçu, miniature (`miniature`) à droite. */
  avecPhoto?: boolean;
  miniature?: ReactNode;
  /** « Importé par vous · 26 sept. » */
  source?: string;
  prive?: boolean;
  separateur?: boolean;
  onPress: () => void;
}

export default function LigneMessage({
  nom,
  date,
  apercu,
  nonLu,
  initiales,
  Icone,
  avecPhoto,
  miniature,
  source,
  prive,
  separateur,
  onPress,
}: LigneMessageProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${nom}, ${date}${nonLu ? ', non lu' : ''}${avecPhoto ? ', avec une photo' : ''}. ${apercu}`}
      style={({ pressed }) => [st.ligne, separateur && st.separateur, pressed && st.presse]}
    >
      <View style={st.avatar}>
        {Icone ? (
          <Icone size={20} color={ARDOISE.icone} strokeWidth={2} />
        ) : (
          <Text style={st.initiales}>{initiales ?? '?'}</Text>
        )}
      </View>
      <View style={st.corps}>
        <View style={st.haut}>
          <Text style={[st.nom, nonLu && st.nomNonLu]} numberOfLines={1}>
            {nom}
          </Text>
          <Text style={[st.date, nonLu && st.dateNonLu]} numberOfLines={1}>
            {date}
          </Text>
        </View>
        <View style={st.bas}>
          {avecPhoto && (
            <View style={st.iconePhoto}>
              <ImageIcone size={14} color={TEXT55} strokeWidth={2} />
            </View>
          )}
          <Text style={st.apercu} numberOfLines={1} ellipsizeMode="tail">
            {apercu}
          </Text>
          {nonLu && <View style={st.point} accessibilityElementsHidden importantForAccessibility="no" />}
        </View>
        {(source || prive) && (
          <View style={st.sourceLigne}>
            {prive && (
              <View style={{ marginRight: 4 }}>
                <Lock size={12} color={TEXT55} strokeWidth={2} />
              </View>
            )}
            <Text style={st.source} numberOfLines={1}>
              {[source, prive ? 'Visible par vous seul' : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
        )}
      </View>
      {miniature ? <View style={st.miniature}>{miniature}</View> : null}
    </Pressable>
  );
}

const st = StyleSheet.create({
  ligne: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  separateur: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.06)',
  },
  presse: { backgroundColor: 'rgba(15,23,42,0.04)' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: ARDOISE.fond,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initiales: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    lineHeight: 17,
    color: ARDOISE.icone,
  },
  corps: { flex: 1, minWidth: 0 },
  haut: { flexDirection: 'row', alignItems: 'baseline' },
  nom: {
    flex: 1,
    marginRight: 8,
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 20,
    color: NAVY,
  },
  nomNonLu: { fontFamily: FontFamily.sansBold },
  date: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(15,23,42,0.5)',
  },
  dateNonLu: { color: '#4338CA' },
  bas: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  iconePhoto: { marginRight: 4 },
  apercu: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(15,23,42,0.65)',
  },
  point: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#4338CA', marginLeft: 8 },
  miniature: { marginLeft: 12 },
  sourceLigne: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  source: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(15,23,42,0.6)',
  },
});
