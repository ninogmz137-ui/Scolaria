/**
 * SignalerAbsenceScreen — absence signalée par le parent (lot 4b, CLAUDE.md § Agenda › Absence, M42).
 *
 * Page profonde (fond Brume, en-tête ‹ Retour + titre). Une seule page :
 *   Quand (aujourd'hui · demain · autre date) · Durée (matin · après-midi · journée · plusieurs jours) ·
 *   Motif (maladie · rendez-vous · raison familiale · autre, sans champ de détail) · justificatif facultatif
 *   (photo ou PDF, stockage privé) · mot facultatif.
 * Confirmation : « Absence signalée à l'école » — jamais « l'enseignant a été notifié » (aucune notification).
 * Mode « justifier » (paramètre absenceId, depuis « À justifier » de l'Accueil) : ajoute le justificatif d'une
 * absence que j'ai signalée.
 * Dates en heure de Paris (utils/jourParis). Démo : rien n'est écrit en base.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, FileText, Camera, Image as IconeImage, X } from 'lucide-react-native';
import { C } from '../constants/design';
import { DeepScreenHeader } from '../components/DeepScreenHeader';
import { Text, TextInput, Pressable } from '../components/ui';
import { FontFamily } from '../hooks/useSolariaFonts';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useDemoData } from '../contexts/DemoContext';
import { AucunEnfantPage } from '../components/AucunEnfant';
import { choisirFichier, type FichierPrepare } from '../services/carnetImport';
import { ErreurCarnet } from '../services/carnetService';
import { ajouterJustificatif, chargerAbsences, ErreurAbsence, signalerAbsence, type AbsenceLue } from '../services/absenceService';
import {
  CONFIRMATION_ABSENCE, DUREES, MOTIFS, jourCourt, libelleMotif, periodeAbsence, valeursDuree,
  type DureeAbsence, type MotifAbsence,
} from '../utils/absences';
import { aujourdhuiParis, decalerJour, demainParis } from '../utils/jourParis';
import { de } from '../utils/francais';

type Quand = 'aujourdhui' | 'demain' | 'autre';

function SignalerAbsenceScreenContent() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { selectedChild } = useActiveChild();
  const enfant = selectedChild!; // non nul : garde en bas du fichier
  const { isDemoMode } = useDemoData();
  const prenom = enfant.name.split(' ')[0];
  const absenceId: string | undefined = route.params?.absenceId;

  const auj = aujourdhuiParis();
  const dem = demainParis();
  const [quand, setQuand] = useState<Quand>('aujourdhui');
  const [autreDate, setAutreDate] = useState(() => decalerJour(auj, 2));
  const [duree, setDuree] = useState<DureeAbsence>('journee');
  const [dernierJour, setDernierJour] = useState(() => decalerJour(auj, 1));
  const [motif, setMotif] = useState<MotifAbsence | null>(null);
  const [mot, setMot] = useState('');
  const [justificatif, setJustificatif] = useState<FichierPrepare | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [envoyee, setEnvoyee] = useState<string | null>(null);
  const [aJustifier, setAJustifier] = useState<AbsenceLue | null>(null);

  const debut = quand === 'aujourdhui' ? auj : quand === 'demain' ? dem : autreDate;
  // Le dernier jour suit toujours le premier.
  useEffect(() => {
    if (dernierJour <= debut) setDernierJour(decalerJour(debut, 1));
  }, [debut, dernierJour]);

  // Mode « justifier » : l'absence visée, parmi celles de l'enfant.
  useEffect(() => {
    if (!absenceId) return;
    chargerAbsences(enfant.id, isDemoMode)
      .then((liste) => setAJustifier(liste.find((a) => a.id === absenceId) ?? null))
      .catch(() => setAJustifier(null));
  }, [absenceId, enfant.id, isDemoMode]);

  const choisir = async (source: 'photo' | 'capture' | 'document') => {
    try {
      const f = await choisirFichier(source);
      if (f) setJustificatif(f);
    } catch (e) {
      Alert.alert('Justificatif', e instanceof ErreurCarnet ? e.message : 'Le fichier n’a pas pu être préparé. Réessayez.');
    }
  };

  const envoyer = async () => {
    if (!motif) return;
    const d = valeursDuree(duree, debut, duree === 'plusieurs_jours' ? dernierJour : null);
    if ('erreur' in d) {
      Alert.alert('Dates', d.erreur);
      return;
    }
    setEnvoi(true);
    try {
      await signalerAbsence(
        {
          childId: enfant.id,
          prenom,
          dateDebut: debut,
          dateFin: d.date_fin,
          demiJournee: d.demi_journee,
          motif,
          mot: mot.trim() || null,
          justificatif,
        },
        isDemoMode,
      );
      setEnvoyee(periodeAbsence({ date_debut: debut, date_fin: d.date_fin, demi_journee: d.demi_journee }, auj, dem));
    } catch (e) {
      Alert.alert('Signaler une absence', e instanceof ErreurAbsence ? e.message : 'L’absence n’a pas pu être signalée. Réessayez.');
    } finally {
      setEnvoi(false);
    }
  };

  const justifier = async () => {
    if (!aJustifier || !justificatif) return;
    setEnvoi(true);
    try {
      await ajouterJustificatif(aJustifier, justificatif, isDemoMode);
      Alert.alert('Justificatif ajouté', 'Il est visible de l’enseignant de la classe.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Justificatif non ajouté', e instanceof ErreurAbsence ? e.message : 'Le justificatif n’a pas pu être ajouté. Réessayez.');
    } finally {
      setEnvoi(false);
    }
  };

  const blocJustificatif = (
    <>
      <Text style={st.label}>Justificatif (facultatif)</Text>
      {justificatif ? (
        <View style={st.fichier}>
          {justificatif.mime.startsWith('image/') ? (
            <Image source={{ uri: justificatif.uriLocale }} style={st.miniature} accessibilityLabel="Aperçu du justificatif" />
          ) : (
            <FileText size={22} color="#0F172A" strokeWidth={2} />
          )}
          <Text style={st.fichierNom} numberOfLines={1}>{justificatif.nom}</Text>
          <Pressable onPress={() => setJustificatif(null)} style={st.fleche} accessibilityRole="button" accessibilityLabel="Retirer le justificatif">
            <X size={18} color="#0F172A" strokeWidth={2} />
          </Pressable>
        </View>
      ) : (
        <View style={st.pills}>
          <Pressable onPress={() => choisir('photo')} style={st.pillIcone} accessibilityRole="button">
            <Camera size={16} color="#0F172A" strokeWidth={2} />
            <Text style={st.pillTexte}>Photographier</Text>
          </Pressable>
          <Pressable onPress={() => choisir('capture')} style={st.pillIcone} accessibilityRole="button">
            <IconeImage size={16} color="#0F172A" strokeWidth={2} />
            <Text style={st.pillTexte}>Photo</Text>
          </Pressable>
          <Pressable onPress={() => choisir('document')} style={st.pillIcone} accessibilityRole="button">
            <FileText size={16} color="#0F172A" strokeWidth={2} />
            <Text style={st.pillTexte}>PDF</Text>
          </Pressable>
        </View>
      )}
      <Text style={st.aide}>Visible des responsables de {prenom} et de l’enseignant de sa classe, et de personne d’autre.</Text>
    </>
  );

  // ─── Confirmation ───
  if (envoyee) {
    return (
      <View style={st.root}>
        <DeepScreenHeader title="Signaler une absence" onBack={() => navigation.goBack()} withTopInset />
        <View style={st.confirmation}>
          <Text style={st.confirmationTitre}>{CONFIRMATION_ABSENCE}</Text>
          <Text style={st.confirmationTexte}>{`Absence ${de(prenom)} · ${envoyee}`}</Text>
          <Text style={st.aide}>Elle figure dans l’Agenda de {prenom}.</Text>
          <Pressable onPress={() => navigation.goBack()} style={[st.primaire, { marginTop: 24 }]} accessibilityRole="button">
            <Text style={st.primaireTexte}>Terminé</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Mode « justifier » ───
  if (absenceId) {
    return (
      <View style={st.root}>
        <DeepScreenHeader title="Justifier l’absence" subtitle={`Carnet ${de(prenom)}`} onBack={() => navigation.goBack()} withTopInset />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}>
          {aJustifier ? (
            <View style={st.resume}>
              <Text style={st.resumeTitre}>{periodeAbsence(aJustifier, auj, dem)}</Text>
              <Text style={st.aide}>{libelleMotif(aJustifier.motif)}</Text>
            </View>
          ) : null}
          {blocJustificatif}
          <Pressable onPress={justifier} disabled={!justificatif || !aJustifier || envoi}
            style={[st.primaire, { marginTop: 24 }, (!justificatif || !aJustifier || envoi) && { opacity: 0.4 }]} accessibilityRole="button">
            {envoi ? <ActivityIndicator color="#FFFFFF" /> : <Text style={st.primaireTexte}>Ajouter le justificatif</Text>}
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ─── Signaler ───
  const pill = (actif: boolean, libelle: string, onPress: () => void) => (
    <Pressable key={libelle} onPress={onPress} style={[st.pill, actif && st.pillActive]} accessibilityRole="radio" accessibilityState={{ selected: actif }}>
      <Text style={[st.pillTexte, actif && st.pillTexteActif]}>{libelle}</Text>
    </Pressable>
  );
  const choixDate = (valeur: string, setValeur: (j: string) => void, min: string, libelle: string) => (
    <View style={st.date}>
      <Pressable onPress={() => setValeur(valeur > min ? decalerJour(valeur, -1) : valeur)} disabled={valeur <= min}
        style={[st.fleche, valeur <= min && { opacity: 0.3 }]} accessibilityLabel={`${libelle} : jour précédent`}>
        <ChevronLeft size={20} color="#0F172A" strokeWidth={2} />
      </Pressable>
      <Text style={st.dateTexte}>{jourCourt(valeur)}</Text>
      <Pressable onPress={() => setValeur(decalerJour(valeur, 1))} style={st.fleche} accessibilityLabel={`${libelle} : jour suivant`}>
        <ChevronRight size={20} color="#0F172A" strokeWidth={2} />
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <DeepScreenHeader title="Signaler une absence" subtitle={`Carnet ${de(prenom)}`} onBack={() => navigation.goBack()} withTopInset />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <Text style={st.label}>Quand</Text>
        <View style={st.pills}>
          {pill(quand === 'aujourdhui', 'Aujourd’hui', () => setQuand('aujourdhui'))}
          {pill(quand === 'demain', 'Demain', () => setQuand('demain'))}
          {pill(quand === 'autre', 'Autre date', () => setQuand('autre'))}
        </View>
        {quand === 'autre' ? choixDate(autreDate, setAutreDate, auj, 'Date') : null}

        <Text style={st.label}>Durée</Text>
        <View style={st.pills}>{DUREES.map((d) => pill(duree === d.id, d.libelle, () => setDuree(d.id)))}</View>
        {duree === 'plusieurs_jours' ? (
          <>
            <Text style={st.sousLabel}>Dernier jour d’absence</Text>
            {choixDate(dernierJour, setDernierJour, decalerJour(debut, 1), 'Dernier jour')}
          </>
        ) : null}

        <Text style={st.label}>Motif</Text>
        <View style={st.pills}>{MOTIFS.map((m) => pill(motif === m.id, m.libelle, () => setMotif(m.id)))}</View>

        {blocJustificatif}

        <Text style={st.label}>Un mot (facultatif)</Text>
        <TextInput style={[st.champ, { minHeight: 72, textAlignVertical: 'top' }]} value={mot} onChangeText={setMot}
          multiline maxLength={300} placeholder="Pour l’enseignant" placeholderTextColor="rgba(15,23,42,0.35)" />

        <Pressable onPress={envoyer} disabled={!motif || envoi} style={[st.primaire, { marginTop: 24 }, (!motif || envoi) && { opacity: 0.4 }]} accessibilityRole="button">
          {envoi ? <ActivityIndicator color="#FFFFFF" /> : <Text style={st.primaireTexte}>Signaler l’absence</Text>}
        </Pressable>
        {!motif ? <Text style={[st.aide, { textAlign: 'center' }]}>Choisissez un motif.</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  label: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, lineHeight: 17, color: '#0F172A', marginTop: 18, marginBottom: 8 },
  sousLabel: { fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 16, color: 'rgba(15,23,42,0.55)', marginTop: 4, marginBottom: 6 },
  aide: { fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 16, color: 'rgba(15,23,42,0.55)', marginTop: 6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap' },
  pill: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.08)', justifyContent: 'center', marginRight: 8, marginBottom: 8 },
  pillActive: { backgroundColor: '#0F172A' },
  pillIcone: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.08)', flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 8, marginBottom: 8 },
  pillTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, lineHeight: 17, color: 'rgba(15,23,42,0.7)' },
  pillTexteActif: { color: '#FFFFFF' },
  date: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', marginTop: 2 },
  fleche: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dateTexte: { flex: 1, textAlign: 'center', fontFamily: FontFamily.sansSemiBold, fontSize: 14, lineHeight: 19, color: '#0F172A' },
  champ: {
    fontFamily: FontFamily.sansRegular, fontSize: 15, lineHeight: 20, color: '#0F172A', backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', paddingHorizontal: 14, paddingVertical: 12,
  },
  fichier: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingLeft: 12, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' },
  miniature: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(15,23,42,0.06)' },
  fichierNom: { flex: 1, marginLeft: 10, fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 19, color: '#0F172A' },
  primaire: { height: 52, maxWidth: 240, alignSelf: 'center', paddingHorizontal: 28, borderRadius: 999, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  primaireTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 15, lineHeight: 20, color: '#FFFFFF' },
  resume: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' },
  resumeTitre: { fontFamily: FontFamily.sansSemiBold, fontSize: 15, lineHeight: 20, color: '#0F172A' },
  confirmation: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  confirmationTitre: { fontFamily: FontFamily.displayBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.6, color: '#0F172A', textAlign: 'center' },
  confirmationTexte: { fontFamily: FontFamily.sansMedium, fontSize: 15, lineHeight: 21, color: '#0F172A', textAlign: 'center', marginTop: 8 },
});

/** Garde : cette page n'existe que pour un enfant actif (compte réel sans enfant → état vide). */
export default function SignalerAbsenceScreen() {
  const { selectedChild } = useActiveChild();
  if (!selectedChild) return <AucunEnfantPage title="Signaler une absence" />;
  return <SignalerAbsenceScreenContent />;
}
