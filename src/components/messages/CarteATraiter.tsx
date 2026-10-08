/**
 * CarteATraiter — en tête du segment Général : SEULE carte de l'écran Messages (COMPONENTS §6).
 * Pour chaque mot qui attend une action de moi : pastille d'action (indigo, crayon) + titre + sous-titre
 * (expéditeur · date de l'événement · échéance), puces « À prévoir », statuts par responsable et pilules compactes
 * alignées sur le texte (Signer · J'autorise / Non · Je participe / Peut-être / Non).
 */

import { View, StyleSheet, Platform } from 'react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../ui';
import ActionsMot from './ActionsMot';
import PastilleCategorie from '../PastilleCategorie';
import { TYPES_CONTENU } from '../../theme/categories';
import type { MotCarnet } from '../../services/motsService';

const NAVY = '#0F172A';
const TEXT55 = 'rgba(15,23,42,0.55)';
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Retrait des pilules et des statuts : pastille 38 + 12 d'écart, pour s'aligner sur le texte. */
export const RETRAIT_TEXTE = 50;

/** « 2026-10-01 » → « jeu. 1 oct. » */
export function jourCourt(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number);
  const d = new Date(a, m - 1, j);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

/** « 14:00 » → « 14h », « 09:30 » → « 9h30 ». */
export function heureCourte(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return `${Number(h)}h${m === '00' ? '' : m}`;
}

/** Sous-titre du mot : expéditeur · date de l'événement · échéance (tirés des données ; rien d'inventé). */
export function sousTitreMot(m: MotCarnet): string {
  return [
    m.expediteur,
    m.evenement ? `${jourCourt(m.evenement.date)}${m.evenement.heure ? ` ${heureCourte(m.evenement.heure)}` : ''}` : null,
    m.echeance ? `avant le ${jourCourt(m.echeance)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Puces « À prévoir » : height 26, paddingH 10, fond ardoise (type de contenu, jamais une teinte de discipline). */
export function PastillesAPrevoir({ items, retrait = 0 }: { items: string[]; retrait?: number }) {
  if (items.length === 0) return null;
  return (
    <View style={[st.pastilles, { marginLeft: retrait }]} accessibilityLabel={`À prévoir : ${items.join(', ')}`}>
      <Text style={st.aPrevoir}>À prévoir</Text>
      {items.map((i) => (
        <View key={i} style={st.pastille}>
          <Text style={st.pastilleTexte}>{i}</Text>
        </View>
      ))}
    </View>
  );
}

export default function CarteATraiter({
  mots,
  monNom,
  demo,
  onOuvrir,
}: {
  mots: MotCarnet[];
  monNom: string;
  demo: boolean;
  onOuvrir: (m: MotCarnet) => void;
}) {
  if (mots.length === 0) return null;
  return (
    <View style={st.carte}>
      {mots.map((m, i) => (
        <View key={m.id} style={[st.mot, i > 0 && st.motSuivant]}>
          <Pressable
            onPress={() => onOuvrir(m)}
            style={st.entete}
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir « ${m.titre} »`}
          >
            <PastilleCategorie categorie={TYPES_CONTENU[m.type === 'autorisation' ? 'autorisation' : m.type === 'participation' ? 'a-repondre' : 'mot']} />
            <View style={st.textes}>
              <Text style={st.titre} numberOfLines={2}>{m.titre}</Text>
              <Text style={st.sousTitre} numberOfLines={2}>{sousTitreMot(m)}</Text>
            </View>
          </Pressable>
          <PastillesAPrevoir items={m.aPrevoir} retrait={RETRAIT_TEXTE} />
          <ActionsMot mot={m} monNom={monNom} demo={demo} retrait={RETRAIT_TEXTE} />
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  // Comme les cartes de l'Accueil : fond opaque, ombre iOS seulement. Sur Android, une élévation sous
  // un fond translucide dessine l'ombre À L'INTÉRIEUR de la carte (rectangle gris constaté sur le Redmi).
  carte: {
    marginHorizontal: 14,
    marginBottom: 8,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    ...Platform.select({
      ios: { shadowColor: NAVY, shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 0 },
      default: {},
    }),
  },
  mot: {},
  motSuivant: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(15,23,42,0.08)' },
  entete: { flexDirection: 'row', alignItems: 'center' },
  textes: { flex: 1, marginLeft: 12 },
  titre: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, lineHeight: 19, color: NAVY },
  sousTitre: { fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 16, color: 'rgba(15,23,42,0.6)', marginTop: 1 },
  pastilles: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10 },
  aPrevoir: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, color: TEXT55, marginRight: 8 },
  pastille: {
    height: 26,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 4,
    borderRadius: 999,
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  pastilleTexte: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#334155' },
});
