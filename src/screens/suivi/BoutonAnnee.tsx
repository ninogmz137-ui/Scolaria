/**
 * BoutonAnnee — « 2026–2027 · CM2 ⌄ » en tête du Suivi (COMPONENTS §17) et son menu (§12) :
 * année en cours (check indigo) · séparateur · entête « Archives · lecture seule » · années
 * précédentes + nom de l'école → ouvre Mon parcours.
 */

import { useRef, useState } from 'react';
import { Modal, View, StyleSheet, Platform } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../../components/ui';
import { millesimeAffiche, type AnneeParcours } from '../../data/demo/parcours';

export default function BoutonAnnee({
  enCours,
  archives,
  onParcours,
}: {
  enCours: AnneeParcours;
  archives: AnneeParcours[];
  onParcours: () => void;
}) {
  const bouton = useRef<View>(null);
  const [ouvert, setOuvert] = useState(false);
  const [pos, setPos] = useState({ x: 14, y: 120 });

  const ouvrir = () => {
    bouton.current?.measureInWindow((x, y, _w, h) => {
      setPos({ x, y: y + h + 6 });
      setOuvert(true);
    });
  };
  const versParcours = () => {
    setOuvert(false);
    onParcours();
  };

  return (
    <>
      <View ref={bouton} collapsable={false} style={st.ancre}>
        <Pressable
          onPress={ouvrir}
          style={st.bouton}
          accessibilityRole="button"
          accessibilityLabel={`Année ${millesimeAffiche(enCours.annee)}, ${enCours.niveau}. Ouvrir les années`}
          hitSlop={{ top: 5, bottom: 5 }}
        >
          <Text style={st.boutonTexte}>{`${millesimeAffiche(enCours.annee)} · ${enCours.niveau}`}</Text>
          <ChevronDown size={16} color="#0F172A" strokeWidth={2} />
        </Pressable>
      </View>

      <Modal visible={ouvert} transparent animationType="fade" onRequestClose={() => setOuvert(false)} statusBarTranslucent={Platform.OS === 'android'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOuvert(false)} accessibilityLabel="Fermer" />
        <View style={[st.menu, { top: pos.y, left: pos.x }]}>
          <View style={st.ligne}>
            <Check size={15} color="#4338CA" strokeWidth={2.5} />
            <Text style={st.ligneTexte}>{`${millesimeAffiche(enCours.annee)} · ${enCours.niveau}`}</Text>
          </View>
          {archives.length > 0 && (
            <>
              <View style={st.separateur} />
              <Text style={st.entete}>Archives · lecture seule</Text>
              {archives.map((a) => (
                <Pressable key={a.id} onPress={versParcours} style={st.ligne} accessibilityRole="button">
                  <View style={st.iconeVide} />
                  <View style={{ flexShrink: 1 }}>
                    <Text style={st.ligneTexte}>{`${millesimeAffiche(a.annee)} · ${a.niveau}`}</Text>
                    {a.etablissement ? <Text style={st.ecole}>{a.etablissement}</Text> : null}
                  </View>
                </Pressable>
              ))}
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  ancre: { alignSelf: 'flex-start' },
  bouton: {
    height: 34,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(15,23,42,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  boutonTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, lineHeight: 17, color: '#0F172A', marginRight: 4 },
  menu: {
    position: 'absolute',
    minWidth: 240,
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  ligne: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, minHeight: 44 },
  iconeVide: { width: 15 },
  ligneTexte: { fontFamily: FontFamily.sansMedium, fontSize: 13, lineHeight: 17, color: '#0F172A', marginLeft: 10 },
  ecole: { fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 16, color: 'rgba(15,23,42,0.55)', marginLeft: 10 },
  separateur: { height: 1, backgroundColor: 'rgba(15,23,42,0.08)', marginVertical: 3 },
  entete: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(15,23,42,0.55)',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 2,
  },
});
