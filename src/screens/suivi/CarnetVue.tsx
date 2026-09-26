/**
 * CarnetVue — Suivi › Souvenirs et Suivi › Livrets (COMPONENTS §17).
 *
 * Livrets  : livrets, bulletins, évaluations nationales. Ligne source obligatoire
 *            (« Saisi par Mme Dupont · 2 oct. » / « Scanné par vous · 12 sept. »).
 * Souvenirs: albums de classe, dessins et travaux de la famille, jalons. Visibilité affichée pour ce
 *            que la famille ajoute : « Visible par le foyer » (défaut) ou « Visible par vous seul ».
 * État vide informatif + lien vers Mon parcours (livrets des années précédentes).
 */

import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Award, BookOpen, ClipboardCheck, FileText, Flag, Images, Lock, Palette, Users } from 'lucide-react-native';
import { getBottomBarScrollPadding } from '../../components/navigation/BottomBar';
import { useTopbarScrollHandler } from '../../contexts/TopbarScrollContext';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../../components/ui';
import { jourMois } from '../../utils/competences';
import type { ElementCarnet, TypeCarnet } from '../../services/carnetService';

const ICONES: Record<TypeCarnet, typeof FileText> = {
  livret: BookOpen,
  bulletin: FileText,
  evaluation_nationale: ClipboardCheck,
  album: Images,
  dessin: Palette,
  jalon: Flag,
};

const LIBELLES_TYPE: Record<TypeCarnet, string> = {
  livret: 'Livret',
  bulletin: 'Bulletin',
  evaluation_nationale: 'Évaluation nationale',
  album: 'Album de classe',
  dessin: 'Dessin, travail',
  jalon: 'Première fois',
};

/** « Saisi par Mme Dupont · 2 oct. », « Scanné par vous · 12 sept. », « Ajouté par vous · 3 sept. » */
export function ligneSourceCarnet(e: ElementCarnet): string {
  let qui: string;
  if (e.source === 'ecole') qui = `Saisi par ${e.auteur ?? 'l’école'}`;
  else if (e.scanne) qui = `Scanné par ${e.auteur ?? 'vous'}`;
  else qui = `Ajouté par ${e.auteur ?? 'vous'}`;
  return `${qui} · ${jourMois(e.date)}`;
}

function Visibilite({ e }: { e: ElementCarnet }) {
  if (e.source === 'ecole') return null;
  const prive = e.visibilite === 'prive';
  const Icone = prive ? Lock : Users;
  return (
    <View style={st.visibilite}>
      <Icone size={12} color="rgba(15,23,42,0.55)" strokeWidth={2} />
      <Text style={st.visibiliteTexte}>{prive ? 'Visible par vous seul' : 'Visible par le foyer'}</Text>
    </View>
  );
}

export default function CarnetVue({
  mode,
  entete,
  items,
  vide,
  onParcours,
}: {
  mode: 'souvenirs' | 'livrets';
  entete: ReactNode;
  items: ElementCarnet[];
  vide: string;
  /** Lien « Livrets des années précédentes → Mon parcours » (onglet Livrets). */
  onParcours?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const scrollHandler = useTopbarScrollHandler();

  return (
    <Reanimated.ScrollView
      style={st.root}
      contentContainerStyle={{
        paddingTop: insets.top + 64 + 8,
        paddingBottom: getBottomBarScrollPadding(insets.bottom),
      }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={scrollHandler}
    >
      {entete}

      {items.length === 0 ? (
        <Text style={st.vide}>{vide}</Text>
      ) : mode === 'souvenirs' ? (
        <View style={st.grille}>
          {items.map((e) => {
            const Icone = ICONES[e.type];
            return (
              <View key={e.id} style={st.tuile}>
                <View style={st.visuel}>
                  <Icone size={28} color="rgba(15,23,42,0.35)" strokeWidth={1.8} />
                </View>
                <View style={st.tuileTexte}>
                  <Text style={st.type}>{LIBELLES_TYPE[e.type].toUpperCase()}</Text>
                  <Text style={st.titre} numberOfLines={2}>{e.titre}</Text>
                  {e.note ? <Text style={st.note} numberOfLines={3}>{e.note}</Text> : null}
                  <Text style={st.source}>{ligneSourceCarnet(e)}</Text>
                  <Visibilite e={e} />
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={st.card}>
          {items.map((e, i) => {
            const Icone = e.type === 'evaluation_nationale' ? ClipboardCheck : e.type === 'bulletin' ? FileText : ICONES[e.type] ?? Award;
            return (
              <View key={e.id} style={[st.row, i < items.length - 1 && st.rowBorder]}>
                <View style={st.rowIcone}>
                  <Icone size={20} color="#0F172A" strokeWidth={2} />
                </View>
                <View style={st.rowTexte}>
                  <Text style={st.type}>{LIBELLES_TYPE[e.type].toUpperCase()}</Text>
                  <Text style={st.titre}>{e.titre}</Text>
                  {e.note ? <Text style={st.note}>{e.note}</Text> : null}
                  <Text style={st.source}>{ligneSourceCarnet(e)}</Text>
                  <Visibilite e={e} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {onParcours ? (
        <Pressable onPress={onParcours} style={st.lien} accessibilityRole="link" hitSlop={{ top: 8, bottom: 8 }}>
          <Text style={st.lienTexte}>Livrets des années précédentes → Mon parcours</Text>
        </Pressable>
      ) : null}
    </Reanimated.ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F1EE' },
  vide: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(15,23,42,0.62)',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    marginHorizontal: 14,
    marginTop: 4,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.05)' },
  rowIcone: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTexte: { flex: 1 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginTop: 4 },
  tuile: {
    width: '50%',
    padding: 4,
  },
  visuel: {
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(15,23,42,0.05)',
  },
  tuileTexte: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(15,23,42,0.05)',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  type: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    color: 'rgba(15,23,42,0.45)',
  },
  titre: { fontFamily: FontFamily.sansBold, fontSize: 14, lineHeight: 19, color: '#0F172A', marginTop: 2 },
  note: { fontFamily: FontFamily.sansRegular, fontSize: 13, lineHeight: 18, color: 'rgba(15,23,42,0.7)', marginTop: 4 },
  source: { fontFamily: FontFamily.sansRegular, fontSize: 11, lineHeight: 14, color: 'rgba(15,23,42,0.6)', marginTop: 6 },
  visibilite: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  visibiliteTexte: { fontFamily: FontFamily.sansMedium, fontSize: 11, lineHeight: 14, color: 'rgba(15,23,42,0.6)', marginLeft: 4 },
  lien: { paddingHorizontal: 16, paddingTop: 16, minHeight: 44, justifyContent: 'center' },
  lienTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, lineHeight: 18, color: '#4338CA' },
});
