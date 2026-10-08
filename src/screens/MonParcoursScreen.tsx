/**
 * MonParcoursScreen — toutes les années du carnet de l'enfant actif (page profonde, COMPONENTS §8).
 *
 * « En cours » puis « Archives · lecture seule » (années archivées et recopiées par la famille, avec
 * le nom de l'école) ; une archive ouvre ArchivedYearDetail. Le titre est dans l'en-tête de la page :
 * jamais répété ici. Aucune couleur de statut (ni vert, ni orange) : un libellé suffit.
 * Démo : src/data/demo/parcours.ts. Compte réel : academic_years (lecture sous RLS).
 * « Ajouter une année passée » : crée une année « importée » (M19 : antérieure à l'année en cours).
 */

import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ChevronRight, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { FontFamily } from '../hooks/useSolariaFonts';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import { getAcademicYears } from '../services/database';
import { useDemoData } from '../contexts/DemoContext';
import { Text, Pressable } from '../components/ui';
import { AucunEnfantPage } from '../components/AucunEnfant';
import { getAnneesDemo, millesimeAffiche, type AnneeParcours } from '../data/demo/parcours';

function MonParcoursScreenContent() {
  const { selectedChild: enfantActif } = useActiveChild();
  const selectedChild = enfantActif!; // non nul : garanti par le garde en bas du fichier
  const { isDemoMode } = useDemoData();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [annees, setAnnees] = useState<AnneeParcours[]>(() => (isDemoMode ? getAnneesDemo(selectedChild.id) : []));

  const charger = useCallback(async () => {
    if (isDemoMode) {
      setAnnees(getAnneesDemo(selectedChild.id));
      return;
    }
    const { data } = await getAcademicYears(selectedChild.id);
    setAnnees(
      (data ?? []).map((a) => ({
        id: a.id,
        annee: a.annee_scolaire,
        niveau: a.niveau,
        etablissement: a.etablissement ?? '',
        statut: a.statut,
      })),
    );
  }, [isDemoMode, selectedChild.id]);

  useEffect(() => {
    charger();
  }, [charger]);
  // Retour de « Ajouter une année passée » : relire la liste.
  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  const enCours = annees.filter((a) => a.statut === 'active');
  const archives = annees.filter((a) => a.statut !== 'active').sort((a, b) => b.annee.localeCompare(a.annee));

  const ouvrir = (a: AnneeParcours) =>
    navigation.navigate('ArchivedYearDetail', {
      year: millesimeAffiche(a.annee),
      niveau: a.niveau,
      etablissement: a.etablissement,
      statut: a.statut,
      childId: selectedChild.id,
      anneeId: a.id,
    });

  return (
    <ScrollView
      style={st.root}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: insets.top + 64 + 8, paddingBottom: getBottomBarScrollPadding(insets.bottom) }}
    >
      <Text style={st.resume}>
        {`${selectedChild.name.split(' ')[0]} · ${annees.length} année${annees.length > 1 ? 's' : ''} dans le carnet`}
      </Text>

      {enCours.length > 0 && (
        <>
          <Text style={st.section}>EN COURS</Text>
          <View style={st.groupe}>
            {enCours.map((a) => (
              <View key={a.id} style={st.row}>
                <View style={{ flex: 1 }}>
                  <Text style={st.annee}>{`${millesimeAffiche(a.annee)} · ${a.niveau}`}</Text>
                  {a.etablissement ? <Text style={st.ecole}>{a.etablissement}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={st.section}>ARCHIVES · LECTURE SEULE</Text>
      {archives.length === 0 ? (
        <Text style={st.vide}>Aucune année précédente dans le carnet.</Text>
      ) : (
        <View style={st.groupe}>
          {archives.map((a, i) => (
            <Pressable
              key={a.id}
              onPress={() => ouvrir(a)}
              accessibilityRole="button"
              style={[st.row, i < archives.length - 1 && st.rowBorder]}
            >
              <View style={{ flex: 1 }}>
                <Text style={st.annee}>{`${millesimeAffiche(a.annee)} · ${a.niveau}`}</Text>
                <Text style={st.ecole}>
                  {[a.etablissement, a.statut === 'importée' ? 'recopiée par la famille' : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <ChevronRight size={20} color="rgba(15,23,42,0.35)" strokeWidth={2} />
            </Pressable>
          ))}
        </View>
      )}

      <Pressable onPress={() => navigation.navigate('AjouterAnne')} style={st.ajouter} accessibilityRole="button">
        <Plus size={18} color="#0F172A" strokeWidth={2} />
        <Text style={st.ajouterTexte}>Ajouter une année passée</Text>
      </Pressable>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F1EE' },
  resume: { fontFamily: FontFamily.sansMedium, fontSize: 13, lineHeight: 18, color: 'rgba(15,23,42,0.6)', paddingHorizontal: 16 },
  section: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    color: 'rgba(15,23,42,0.38)',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 6,
  },
  groupe: { backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.05)' },
  annee: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, lineHeight: 19, color: '#0F172A' },
  ecole: { fontFamily: FontFamily.sansRegular, fontSize: 13, lineHeight: 18, color: 'rgba(15,23,42,0.6)', marginTop: 2 },
  vide: { fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 20, color: 'rgba(15,23,42,0.62)', paddingHorizontal: 16 },
  ajouter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: 52,
    maxWidth: 280,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.18)',
    marginTop: 24,
  },
  ajouterTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, lineHeight: 19, color: '#0F172A', marginLeft: 8 },
});

/** Garde : cette page n'existe que pour un enfant actif (compte réel sans enfant → état vide). */
export default function MonParcoursScreen() {
  const { selectedChild } = useActiveChild();
  if (!selectedChild) return <AucunEnfantPage title="Mon parcours" />;
  return <MonParcoursScreenContent />;
}
