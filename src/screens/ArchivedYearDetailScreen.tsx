/**
 * ArchivedYearDetailScreen — une année précédente du carnet, en LECTURE SEULE (page profonde).
 *
 * Maternelle / primaire : observations ou compétences de cette année-là, avec l'échelle de CETTE
 * école (ex. Lucas CM1 : 4 niveaux LSU, semestres), puis ses livrets.
 * Collège / lycée : bulletins trimestriels (moyennes en chiffres, jamais de vert / rouge).
 * Archives : aucune alerte, aucun Score de Joie, aucune modification.
 * Démo : src/data/demo/parcours.ts + archives.ts. Compte réel : état vide tant que le contenu des
 * années passées n'est pas lu par année (les années recopiées n'ont pas encore de documents : lot B5).
 */

import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import { useDemoData } from '../contexts/DemoContext';
import { Text, Pressable } from '../components/ui';
import ApprentissagesVue from './suivi/ApprentissagesVue';
import { ListeLivrets } from './suivi/CarnetVue';
import { getAnneesDemo, millesimeAffiche } from '../data/demo/parcours';
import { getArchiveDemo, type BulletinArchive } from '../data/demo/archives';
import { referentielDuNiveau } from '../data/referentiels';
import { cycleDuNiveau } from '../utils/niveau';
import { nombrePeriodes, type Decoupage } from '../utils/competences';
import { libellePeriodeLong } from '../utils/livrets';

type Params = {
  year: string;
  niveau: string;
  etablissement: string;
  statut: 'archivée' | 'importée';
  childId: string;
  anneeId?: string;
};

function moyenne(n: number): string {
  return n.toFixed(1).replace('.', ',');
}

function Bulletin({ b }: { b: BulletinArchive }) {
  const [ouvert, setOuvert] = useState(false);
  const Chevron = ouvert ? ChevronUp : ChevronDown;
  return (
    <View>
      <Pressable
        onPress={() => setOuvert((v) => !v)}
        style={st.bulletinEntete}
        accessibilityRole="button"
        accessibilityState={{ expanded: ouvert }}
      >
        <View style={{ flex: 1 }}>
          <Text style={st.titre}>{`Bulletin · ${libellePeriodeLong('trimestres', b.trimestre)}`}</Text>
          <Text style={st.meta}>{`Moyenne générale ${moyenne(b.moyenne)} / 20`}</Text>
        </View>
        <Chevron size={20} color="rgba(15,23,42,0.45)" strokeWidth={2} />
      </Pressable>
      {ouvert && (
        <View style={st.matieres}>
          {b.matieres.map((m) => (
            <View key={m.nom} style={st.matiere}>
              <Text style={st.matiereNom}>{m.nom}</Text>
              <Text style={st.matiereMoy}>{moyenne(m.moyenne)}</Text>
            </View>
          ))}
          {b.appreciation ? <Text style={st.appreciation}>{`« ${b.appreciation} »`}</Text> : null}
        </View>
      )}
    </View>
  );
}

export default function ArchivedYearDetailScreen() {
  const route = useRoute<RouteProp<{ ArchivedYearDetail: Params }, 'ArchivedYearDetail'>>();
  const { year, niveau, etablissement, statut, childId, anneeId } = route.params;
  const insets = useSafeAreaInsets();
  const { isDemoMode } = useDemoData();

  const annee = isDemoMode
    ? getAnneesDemo(childId).find((a) => a.id === anneeId || a.annee === year)
    : undefined;
  const contenu = annee ? getArchiveDemo(annee.id) : { items: [], livrets: [], bulletins: [] };
  const cycle = cycleDuNiveau(niveau);
  const importee = statut === 'importée';

  const infos = (
    <View style={st.infos}>
      <Text style={st.ecole}>{etablissement || 'Établissement non renseigné'}</Text>
      <View style={st.lecture}>
        <Lock size={12} color="rgba(15,23,42,0.55)" strokeWidth={2} />
        <Text style={st.lectureTexte}>
          {importee ? 'Année recopiée par la famille · lecture seule' : 'Archive · lecture seule'}
        </Text>
      </View>
      {annee?.echelle ? (
        <Text style={st.lectureTexte}>
          {`Cette année-là, l’école évaluait sur ${annee.echelle} niveaux${annee.echelle === 4 ? ' (livret scolaire unique)' : ''}.`}
        </Text>
      ) : null}
    </View>
  );

  const livrets = contenu.livrets.length > 0 ? (
    <View style={st.bloc}>
      <Text style={st.section}>LIVRETS</Text>
      <ListeLivrets items={contenu.livrets} />
    </View>
  ) : null;

  // Maternelle / primaire avec observations ou compétences : même vue que le Suivi, en lecture.
  if ((cycle === 'maternelle' || cycle === 'primaire') && contenu.items.length > 0) {
    const decoupage: Decoupage = annee?.decoupage ?? 'periodes';
    return (
      <ApprentissagesVue
        entete={infos}
        mode={cycle === 'maternelle' ? 'maternelle' : 'primaire'}
        titre={cycle === 'maternelle' ? `Carnet de suivi des apprentissages · ${niveau}` : `Compétences · ${niveau}`}
        items={contenu.items}
        decoupage={decoupage}
        periodeInitiale={nombrePeriodes(decoupage)}
        referentiel={referentielDuNiveau(niveau)}
        vide="Rien d’enregistré sur cette période."
        pied={livrets}
      />
    );
  }

  const rien = contenu.bulletins.length === 0 && contenu.livrets.length === 0;
  return (
    <Reanimated.ScrollView
      style={st.root}
      contentContainerStyle={{ paddingTop: insets.top + 64 + 8, paddingBottom: getBottomBarScrollPadding(insets.bottom) }}
      showsVerticalScrollIndicator={false}
    >
      {infos}
      {contenu.bulletins.length > 0 && (
        <View style={st.bloc}>
          <Text style={st.section}>BULLETINS</Text>
          <View style={st.card}>
            {contenu.bulletins.map((b, i) => (
              <View key={b.trimestre} style={i < contenu.bulletins.length - 1 && st.rowBorder}>
                <Bulletin b={b} />
              </View>
            ))}
          </View>
          <Text style={st.sourceBloc}>{`Saisi par le ${etablissement || 'collège'}`}</Text>
        </View>
      )}
      {livrets}
      {rien && (
        <Text style={st.vide}>
          {importee
            ? `Aucun document recopié pour ${millesimeAffiche(year)} pour l’instant.`
            : 'Aucun document enregistré pour cette année.'}
        </Text>
      )}
    </Reanimated.ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F1EE' },
  infos: { paddingHorizontal: 16, paddingBottom: 8 },
  ecole: { fontFamily: FontFamily.sansBold, fontSize: 16, lineHeight: 21, color: '#0F172A' },
  lecture: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  lectureTexte: { fontFamily: FontFamily.sansMedium, fontSize: 12, lineHeight: 16, color: 'rgba(15,23,42,0.6)', marginLeft: 4, marginTop: 2 },
  bloc: { marginTop: 14 },
  section: {
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
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.05)' },
  bulletinEntete: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, minHeight: 56 },
  titre: { fontFamily: FontFamily.sansBold, fontSize: 14, lineHeight: 19, color: '#0F172A' },
  meta: { fontFamily: FontFamily.sansMedium, fontSize: 13, lineHeight: 18, color: 'rgba(15,23,42,0.62)', marginTop: 2 },
  matieres: { paddingHorizontal: 14, paddingBottom: 12 },
  matiere: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  matiereNom: { fontFamily: FontFamily.sansRegular, fontSize: 13, lineHeight: 18, color: '#0F172A' },
  matiereMoy: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, lineHeight: 18, color: '#0F172A' },
  appreciation: { fontFamily: FontFamily.sansRegular, fontSize: 13, lineHeight: 19, color: 'rgba(15,23,42,0.7)', marginTop: 8 },
  sourceBloc: { fontFamily: FontFamily.sansRegular, fontSize: 11, lineHeight: 14, color: 'rgba(15,23,42,0.6)', paddingHorizontal: 16, marginTop: 6 },
  vide: { fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 20, color: 'rgba(15,23,42,0.62)', paddingHorizontal: 16, paddingTop: 16 },
});
