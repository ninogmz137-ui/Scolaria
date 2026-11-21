/**
 * EventDetailScreen — détail d'un événement de l'Agenda (lot 4d), branché sur la base.
 *
 * Lit l'événement par son identifiant : compte réel = agenda_events (RLS : responsables de l'enfant) ; démo =
 * l'Agenda de démo recalé sur aujourd'hui. N'affiche que ce qui est vrai : catégorie écrite (src/theme/categories),
 * titre, jour et heure (heure de Paris), lieu, description. Plus de sortie fictive, plus d'« Inscrite » en dur, plus de
 * bouton sans action, plus de mention de l'assistant (décisions du lot 4d).
 * Événement introuvable (supprimé, autre enfant) : message clair, jamais un événement inventé.
 */
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../constants/design';
import { DeepScreenHeader } from '../components/DeepScreenHeader';
import { Text } from '../components/ui';
import { FontFamily } from '../hooks/useSolariaFonts';
import { useDemoData, evenementDemoParId } from '../contexts/DemoContext';
import { supabase } from '../services/supabase';
import { classerErreur, type TypeErreur } from '../services/erreurs';
import EtatErreur from '../components/EtatErreur';
import { categorieEvenement, TEINTES } from '../theme/categories';
import { heureParisIso, jourParisIso } from '../utils/jourParis';
import { jourEnClair } from '../utils/devoirs';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { aDesNotes } from '../utils/niveau';

interface EvenementDetail {
  titre: string;
  type: string;
  matiere: string | null;
  jour: string;
  heure: string | null;
  fin: string | null;
  lieu: string | null;
  description: string | null;
}

export default function EventDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { isDemoMode } = useDemoData();
  const { selectedChild } = useActiveChild();
  const eventId: string | undefined = route.params?.eventId;
  const quand: string | undefined = route.params?.eventTime;
  const [evt, setEvt] = useState<EvenementDetail | null>(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [erreur, setErreur] = useState<TypeErreur | null>(null);
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    let annule = false;
    setIntrouvable(false);
    setErreur(null);
    if (!eventId) {
      setIntrouvable(true);
      return;
    }
    if (isDemoMode) {
      const e = evenementDemoParId(eventId);
      if (!e) setIntrouvable(true);
      else setEvt({ titre: e.title, type: e.type, matiere: e.subject || null, jour: e.date, heure: e.startTime || null, fin: e.endTime || null, lieu: e.room || null, description: e.description || null });
      return;
    }
    supabase
      .from('agenda_events')
      .select('title, event_type, subject, start_time, end_time, location, description')
      .eq('id', eventId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (annule) return;
        if (error) { setErreur(classerErreur(error)); return; }
        if (!data) { setIntrouvable(true); return; }
        setEvt({
          titre: String(data.title ?? ''),
          type: String(data.event_type ?? 'evenement'),
          matiere: data.subject ? String(data.subject) : null,
          jour: jourParisIso(String(data.start_time)),
          heure: heureParisIso(String(data.start_time)),
          fin: data.end_time ? heureParisIso(String(data.end_time)) : null,
          lieu: data.location ? String(data.location) : null,
          description: data.description ? String(data.description) : null,
        });
      }, (e: unknown) => { if (!annule) setErreur(classerErreur(e)); });
    return () => { annule = true; };
  }, [eventId, isDemoMode, essai]);

  const cat = evt ? categorieEvenement(evt.type, evt.matiere, !aDesNotes(selectedChild?.cycle)) : null;
  const teinte = cat ? TEINTES[cat.categorie.teinte].icone : '#334155';
  const libelleQuand = evt
    ? quand ?? (evt.type === 'devoir' ? '' : [evt.heure, evt.fin && evt.fin !== evt.heure ? evt.fin : null].filter(Boolean).join(' — '))
    : '';

  return (
    <View style={st.root}>
      <DeepScreenHeader title={route.params?.eventCategory ?? cat?.libelle ?? 'Événement'} onBack={() => navigation.goBack()} withTopInset />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}>
        {erreur ? <EtatErreur type={erreur} onReessayer={() => setEssai((v) => v + 1)} /> : null}
        {introuvable ? <Text style={st.vide}>Cet événement n’existe plus dans l’Agenda.</Text> : null}
        {evt && cat ? (
          <View style={[st.carte, { borderLeftColor: teinte, backgroundColor: '#FFFFFF' }]}>
            <Text style={st.categorie}>{cat.libelle}</Text>
            <Text style={st.titre}>{evt.titre}</Text>
            <Text style={st.ligne}>{jourEnClair(evt.jour).replace(/^./, (c) => c.toUpperCase())}{libelleQuand ? ` · ${libelleQuand}` : ''}</Text>
            {evt.lieu ? <Text style={st.ligne}>{evt.lieu}</Text> : null}
            {evt.description ? <Text style={st.description}>{evt.description}</Text> : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  carte: { borderRadius: 16, borderLeftWidth: 3, borderWidth: 1, borderColor: 'rgba(15,23,42,0.07)', padding: 16, marginTop: 12 },
  categorie: { fontFamily: FontFamily.sansSemiBold, fontSize: 11, color: 'rgba(15,23,42,0.55)', marginBottom: 4 },
  titre: { fontFamily: FontFamily.displayBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.6, color: '#0F172A' },
  ligne: { fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 20, color: 'rgba(15,23,42,0.7)', marginTop: 6 },
  description: { fontFamily: FontFamily.sansRegular, fontSize: 14, lineHeight: 21, color: '#0F172A', marginTop: 12 },
  vide: { fontFamily: FontFamily.sansRegular, fontSize: 14, color: 'rgba(15,23,42,0.55)', textAlign: 'center', marginTop: 40 },
});
