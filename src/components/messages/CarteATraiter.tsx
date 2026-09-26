/**
 * CarteATraiter — en tête du segment Général : SEULE carte de l'écran Messages (COMPONENTS §6).
 * Pour chaque mot qui attend une action de moi : titre, expéditeur, date, échéance, pastilles
 * « À prévoir », statuts par responsable et bouton (Signer, Oui / Non, Oui / Peut-être / Non).
 */

import { View, StyleSheet, Platform } from 'react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../ui';
import ActionsMot from './ActionsMot';
import type { MotCarnet } from '../../services/motsService';

const NAVY = '#0F172A';
const TEXT55 = 'rgba(15,23,42,0.55)';
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

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

export function PastillesAPrevoir({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={st.pastilles} accessibilityLabel={`À prévoir : ${items.join(', ')}`}>
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
      <Text style={st.label}>À TRAITER</Text>
      {mots.map((m, i) => (
        <View key={m.id} style={[st.mot, i > 0 && st.motSuivant]}>
          <Pressable onPress={() => onOuvrir(m)} accessibilityRole="button" accessibilityLabel={`Ouvrir « ${m.titre} »`}>
            <Text style={st.titre}>{m.titre}</Text>
            <Text style={st.meta} numberOfLines={1}>
              {[m.expediteur, jourCourt(m.date)].join(' · ')}
            </Text>
            {m.evenement && (
              <Text style={st.echeance} numberOfLines={1}>
                {`${m.evenement.titre} · ${jourCourt(m.evenement.date)}${m.evenement.heure ? ` ${heureCourte(m.evenement.heure)}` : ''}`}
              </Text>
            )}
            {m.echeance && (
              <Text style={st.echeance} numberOfLines={1}>
                {`À faire avant le ${jourCourt(m.echeance)}`}
              </Text>
            )}
          </Pressable>
          <PastillesAPrevoir items={m.aPrevoir} />
          <ActionsMot mot={m} monNom={monNom} demo={demo} />
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  // Comme les cartes de l'Accueil : fond opaque, ombre iOS seulement. Sur Android, une élévation sous
  // un fond translucide dessine l'ombre À L'INTÉRIEUR de la carte (rectangle gris constaté sur le Redmi).
  carte: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
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
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    color: 'rgba(15,23,42,0.45)',
    marginBottom: 8,
  },
  mot: {},
  motSuivant: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(15,23,42,0.06)' },
  titre: { fontFamily: FontFamily.sansBold, fontSize: 16, lineHeight: 21, color: NAVY },
  meta: { fontFamily: FontFamily.sansRegular, fontSize: 13, lineHeight: 18, color: TEXT55, marginTop: 2 },
  echeance: { fontFamily: FontFamily.sansMedium, fontSize: 13, lineHeight: 18, color: NAVY, marginTop: 4 },
  pastilles: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 },
  aPrevoir: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, color: TEXT55, marginRight: 2 },
  pastille: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  pastilleTexte: { fontFamily: FontFamily.sansMedium, fontSize: 12, color: NAVY },
});
