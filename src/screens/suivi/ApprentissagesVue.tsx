/**
 * ApprentissagesVue — onglet Suivi (route 'Notes') pour la maternelle et le primaire (COMPONENTS §17).
 *
 * Maternelle : domaines du programme (ordre officiel) → observations : texte, ligne source.
 *              AUCUN niveau, aucune barre, aucun score, aucune comparaison.
 * Primaire   : sélecteur de période (P1…P5, S1/S2 ou « 1er trimestre » en toutes lettres ; jamais « T1 »), puis
 *              disciplines → compétences. Barre à 3 OU 4 segments selon l'échelle de CHAQUE ligne,
 *              libellé sous la barre, ligne source obligatoire. Jamais de vert / rouge, jamais de /20.
 * Empty state si rien pour la période.
 * `entete` : bouton année + segmented Apprentissages · Souvenirs · Livrets (SuiviEntete), en tête.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomBarScrollPadding } from '../../components/navigation/BottomBar';
import { useTopbarScrollHandler } from '../../contexts/TopbarScrollContext';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../../components/ui';
import {
  libelleNiveau,
  libellePeriode,
  ligneSource,
  nombrePeriodes,
  periodeCourante,
  type Decoupage,
  type Echelle,
  type ElementSuivi,
} from '../../utils/competences';

export function Segments({ niveau, echelle }: { niveau: number; echelle: Echelle }) {
  return (
    <View style={st.segments} accessibilityLabel={libelleNiveau(niveau, echelle)}>
      {Array.from({ length: echelle }, (_, i) => (
        <View key={i} style={[st.segment, i + 1 <= niveau && st.segmentOn, i < echelle - 1 && { marginRight: 3 }]} />
      ))}
    </View>
  );
}

export default function ApprentissagesVue({
  mode,
  titre,
  items,
  decoupage,
  referentiel,
  vide,
  entete,
  pied,
  periodeInitiale,
}: {
  entete?: ReactNode;
  /** Sous la liste (ex. livrets d'une année archivée). */
  pied?: ReactNode;
  /** Période ouverte au départ (archive : la dernière) ; par défaut, la période en cours. */
  periodeInitiale?: number;
  mode: 'maternelle' | 'primaire';
  titre: string;
  items: ElementSuivi[];
  decoupage: Decoupage;
  /** Domaines / disciplines du niveau, dans l'ordre officiel (src/data/referentiels). */
  referentiel: readonly string[];
  vide: string;
}) {
  const insets = useSafeAreaInsets();
  const scrollHandler = useTopbarScrollHandler();
  const primaire = mode === 'primaire';

  const courante = periodeInitiale ?? periodeCourante(decoupage);
  const [periode, setPeriode] = useState(courante);
  useEffect(() => setPeriode(periodeInitiale ?? periodeCourante(decoupage)), [decoupage, periodeInitiale]);

  const visibles = primaire ? items.filter((it) => (it.periode ?? courante) === periode) : items;

  // Regroupement par domaine / discipline, dans l'ordre du référentiel officiel (inconnus à la fin).
  const rang = (d: string) => {
    const i = referentiel.indexOf(d);
    return i < 0 ? referentiel.length : i;
  };
  const domaines: { nom: string; items: ElementSuivi[] }[] = [];
  for (const it of visibles) {
    let d = domaines.find((x) => x.nom === it.domaine);
    if (!d) {
      d = { nom: it.domaine, items: [] };
      domaines.push(d);
    }
    d.items.push(it);
  }
  domaines.sort((a, b) => rang(a.nom) - rang(b.nom));
  for (const d of domaines) d.items.sort((a, b) => b.date.localeCompare(a.date));

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
      <Text style={st.titre}>{titre}</Text>

      {primaire && (
        <View style={st.periodes} accessibilityRole="tablist">
          {Array.from({ length: nombrePeriodes(decoupage) }, (_, i) => i + 1).map((n) => {
            const actif = n === periode;
            return (
              <Pressable
                key={n}
                onPress={() => setPeriode(n)}
                accessibilityRole="tab"
                accessibilityState={{ selected: actif }}
                hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                style={[st.periode, actif && st.periodeActive]}
              >
                <Text style={[st.periodeTexte, actif && st.periodeTexteActive]}>
                  {libellePeriode(decoupage, n)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {domaines.length === 0 ? (
        <Text style={st.vide}>{vide}</Text>
      ) : (
        domaines.map((d) => (
          <View key={d.nom} style={st.bloc}>
            <Text style={st.domaine}>{d.nom.toUpperCase()}</Text>
            <View style={st.card}>
              {d.items.map((it, i) => (
                <View key={it.id} style={[st.row, i < d.items.length - 1 && st.rowBorder]}>
                  <Text style={st.texte}>{it.texte}</Text>
                  {primaire && it.niveau && it.echelle ? (
                    <View style={st.niveauLigne}>
                      <Segments niveau={it.niveau} echelle={it.echelle} />
                      <Text style={st.niveau}>{libelleNiveau(it.niveau, it.echelle)}</Text>
                    </View>
                  ) : null}
                  <Text style={st.source}>{ligneSource(it)}</Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
      {pied}
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
  periodes: { flexDirection: 'row', paddingHorizontal: 14, marginTop: 4, marginBottom: 4 },
  periode: {
    minWidth: 44,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.06)',
    marginRight: 6,
  },
  periodeActive: { backgroundColor: '#0F172A' },
  periodeTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, lineHeight: 17, color: 'rgba(15,23,42,0.62)' },
  periodeTexteActive: { color: '#FFFFFF' },
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
  niveauLigne: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  segments: { flexDirection: 'row', marginRight: 8 },
  segment: { width: 22, height: 6, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.12)' },
  segmentOn: { backgroundColor: '#0F172A' },
  niveau: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, lineHeight: 15, color: '#0F172A' },
  source: { fontFamily: FontFamily.sansRegular, fontSize: 11, lineHeight: 14, color: 'rgba(15,23,42,0.6)', marginTop: 6 },
});
