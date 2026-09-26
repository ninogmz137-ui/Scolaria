/**
 * LigneMessage — ligne de la liste à plat de Messages (COMPONENTS §7 « Card message », B4 du 26 sept 2026).
 *
 * Façon X : PAS une carte. Avatar 44 px · nom lisible + date · aperçu sur une ligne · gras + point
 * indigo si non lu. Jamais de rôle, de tag de catégorie, de résumé Aria ni de rouge.
 * Ligne source facultative (« Importé par vous ») et mention « Visible par vous seul ».
 */

import type { ComponentType } from 'react';
import { View, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../ui';

const NAVY = '#0F172A';
const TEXT55 = 'rgba(15,23,42,0.55)';

/** Séparateur entre les lignes : AUCUN par défaut (décision à trancher sur le Redmi, captures avec / sans). */
export const SEPARATEURS_MESSAGES = false;

export interface LigneMessageProps {
  nom: string;
  date: string;
  apercu: string;
  nonLu: boolean;
  /** Initiales (enseignant) ou icône (établissement, absences). */
  initiales?: string;
  Icone?: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
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
  source,
  prive,
  separateur,
  onPress,
}: LigneMessageProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${nom}, ${date}${nonLu ? ', non lu' : ''}. ${apercu}`}
      style={({ pressed }) => [st.ligne, separateur && st.separateur, pressed && st.presse]}
    >
      <View style={st.avatar}>
        {Icone ? (
          <Icone size={20} color={NAVY} strokeWidth={2} />
        ) : (
          <Text style={st.initiales}>{initiales ?? '?'}</Text>
        )}
      </View>
      <View style={st.corps}>
        <View style={st.haut}>
          <Text style={[st.nom, nonLu && st.gras]} numberOfLines={1}>
            {nom}
          </Text>
          <Text style={st.date} numberOfLines={1}>
            {date}
          </Text>
        </View>
        <View style={st.bas}>
          <Text style={[st.apercu, nonLu && st.apercuNonLu]} numberOfLines={1} ellipsizeMode="tail">
            {apercu}
          </Text>
          {nonLu && <View style={st.point} accessibilityElementsHidden />}
        </View>
        {(source || prive) && (
          <View style={st.sourceLigne}>
            {prive && <Lock size={12} color={TEXT55} strokeWidth={2} />}
            <Text style={st.source} numberOfLines={1}>
              {[source, prive ? 'Visible par vous seul' : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  ligne: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  separateur: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  presse: { backgroundColor: 'rgba(15,23,42,0.04)' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initiales: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    lineHeight: 18,
    color: NAVY,
  },
  corps: { flex: 1, minWidth: 0 },
  haut: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  nom: {
    flex: 1,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 20,
    color: NAVY,
  },
  gras: { fontFamily: FontFamily.sansBold },
  date: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 16,
    color: TEXT55,
  },
  bas: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  apercu: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    lineHeight: 19,
    color: TEXT55,
  },
  apercuNonLu: { fontFamily: FontFamily.sansBold, color: NAVY },
  point: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#4338CA' },
  sourceLigne: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  source: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(15,23,42,0.6)',
  },
});
