/**
 * ApprentissagesVue — onglet Notes (futur Suivi) pour la maternelle et le primaire.
 *
 * Primaire : compétences sur 4 niveaux (Non atteint · Partiellement atteint · Atteint · Dépassé),
 * 4 segments remplis #0F172A / vides rgba(15,23,42,0.12). JAMAIS de note /20, jamais vert / rouge.
 * Maternelle sans données : domaines vides. Toujours la source (« Saisi par … · date »).
 * La refonte complète (segmented Apprentissages · Souvenirs · Livrets, année) est le lot B3.
 */

import { View, StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomBarScrollPadding } from '../../components/navigation/BottomBar';
import { useTopbarScrollHandler } from '../../contexts/TopbarScrollContext';
import { NIVEAUX_COMPETENCE, type NiveauCompetence } from '../../data/demo/carnet';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text } from '../../components/ui';

export interface ApprentissageItem {
  domaine: string;
  texte: string;
  niveau?: NiveauCompetence;
  date: string;
  source: string;
}

function Segments({ niveau }: { niveau: NiveauCompetence }) {
  return (
    <View style={st.segments}>
      {[1, 2, 3, 4].map((n, i) => (
        <View key={n} style={[st.segment, n <= niveau && st.segmentOn, i < 3 && { marginRight: 3 }]} />
      ))}
    </View>
  );
}

export default function ApprentissagesVue({
  titre,
  items,
  vide,
}: {
  titre: string;
  items: ApprentissageItem[];
  vide: string;
}) {
  const insets = useSafeAreaInsets();
  const scrollHandler = useTopbarScrollHandler();

  const domaines: { nom: string; items: ApprentissageItem[] }[] = [];
  for (const it of items) {
    let d = domaines.find((x) => x.nom === it.domaine);
    if (!d) {
      d = { nom: it.domaine, items: [] };
      domaines.push(d);
    }
    d.items.push(it);
  }

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
      <Text style={st.titre}>{titre}</Text>

      {domaines.length === 0 ? (
        <Text style={st.vide}>{vide}</Text>
      ) : (
        domaines.map((d) => (
          <View key={d.nom} style={st.bloc}>
            <Text style={st.domaine}>{d.nom.toUpperCase()}</Text>
            <View style={st.card}>
              {d.items.map((it, i) => (
                <View key={`${d.nom}-${i}`} style={[st.row, i < d.items.length - 1 && st.rowBorder]}>
                  <Text style={st.texte}>{it.texte}</Text>
                  <View style={st.meta}>
                    {it.niveau ? (
                      <>
                        <Segments niveau={it.niveau} />
                        <Text style={st.niveau}>{NIVEAUX_COMPETENCE[it.niveau]}</Text>
                        <Text style={st.source}> · </Text>
                      </>
                    ) : null}
                    <Text style={st.source}>Saisi par {it.source} · {it.date}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </Reanimated.ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F1EE' },
  titre: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(15,23,42,0.55)',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  vide: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(15,23,42,0.55)',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bloc: { marginTop: 12 },
  domaine: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    color: 'rgba(15,23,42,0.38)',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  card: {
    marginHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    overflow: 'hidden',
  },
  row: { paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.05)' },
  texte: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    lineHeight: 19,
    color: '#0F172A',
  },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6 },
  segments: { flexDirection: 'row', marginRight: 6 },
  segment: { width: 14, height: 5, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.12)' },
  segmentOn: { backgroundColor: '#0F172A' },
  niveau: { fontFamily: FontFamily.sansSemiBold, fontSize: 11, lineHeight: 14, color: '#0F172A' },
  source: { fontFamily: FontFamily.sansRegular, fontSize: 11, lineHeight: 14, color: 'rgba(15,23,42,0.55)' },
});
