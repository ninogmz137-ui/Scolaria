/**
 * AjouterAuCarnetScreen — formulaire « Ajouter au carnet » (lot B5), page profonde avec son en-tête.
 *
 * Ajout  : aperçu du fichier (déjà NETTOYÉ de ses métadonnées), titre, catégorie (Mot · Livret ·
 *          Souvenir · Jalon), date, année du carnet (en cours ou une autre de ses années), visibilité
 *          (foyer par défaut, « Visible par vous seul » en option), note facultative.
 * Modifier (élément ajouté par le parent connecté) : catégorie, date, titre, visibilité ; ouvrir le
 *          fichier (URL signée de 24 h) ; supprimer (Alert native ; le fichier est supprimé aussi).
 * Rangé dans le carnet de l'enfant SÉLECTIONNÉ. Démo : en mémoire pour la session, rien en base.
 */

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, FileText, Lock, Trash2 } from 'lucide-react-native';
import { DeepScreenHeader } from '../components/DeepScreenHeader';
import { Text, TextInput, Pressable } from '../components/ui';
import { FontFamily } from '../hooks/useSolariaFonts';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useDemoData } from '../contexts/DemoContext';
import { getAcademicYears } from '../services/database';
import { getAnneesDemo, millesimeAffiche, type AnneeParcours } from '../data/demo/parcours';
import { prendreEnAttente, type FichierPrepare, type SourceAjout } from '../services/carnetImport';
import {
  ajouterAuCarnet,
  ErreurCarnet,
  lienFichier,
  modifierAjout,
  supprimerAjout,
  type CategorieCarnet,
  type ElementCarnet,
} from '../services/carnetService';
import { jourMois } from '../utils/competences';
import { de } from '../utils/francais';

type Params = { source?: SourceAjout; element?: ElementCarnet };

const CATEGORIES: { id: CategorieCarnet; libelle: string }[] = [
  { id: 'mot', libelle: 'Mot' },
  { id: 'livret', libelle: 'Livret' },
  { id: 'souvenir', libelle: 'Souvenir' },
  { id: 'jalon', libelle: 'Jalon' },
];
const CATEGORIE_PAR_DEFAUT: Record<SourceAjout, CategorieCarnet> = {
  photo: 'souvenir',
  capture: 'mot',
  document: 'livret',
  jalon: 'jalon',
};

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function decaler(iso: string, jours: number): string {
  const [a, m, j] = iso.split('-').map(Number);
  return isoLocal(new Date(a, m - 1, j + jours));
}

export default function AjouterAuCarnetScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ AjouterAuCarnet: Params }, 'AjouterAuCarnet'>>();
  const insets = useSafeAreaInsets();
  const { selectedChild } = useActiveChild();
  const { isDemoMode } = useDemoData();
  const element = route.params?.element;
  const modification = !!element;
  const source: SourceAjout = route.params?.source ?? 'jalon';

  const [fichier] = useState<FichierPrepare | null>(() => (modification ? null : prendreEnAttente()));
  const aujourdHui = isoLocal(new Date());
  const [titre, setTitre] = useState(element?.titre ?? '');
  const [note, setNote] = useState(element?.note ?? '');
  const [categorie, setCategorie] = useState<CategorieCarnet>(element?.categorieCarnet ?? CATEGORIE_PAR_DEFAUT[source]);
  const [date, setDate] = useState(element?.date ?? aujourdHui);
  const [prive, setPrive] = useState(element?.visibilite === 'prive');
  const [annees, setAnnees] = useState<AnneeParcours[]>([]);
  const [anneeId, setAnneeId] = useState<string | undefined>(element?.anneeId);
  const [envoi, setEnvoi] = useState(false);

  const prenom = selectedChild?.name.split(' ')[0] ?? '';

  useEffect(() => {
    if (!selectedChild || modification) return;
    let annule = false;
    const choisir = (liste: AnneeParcours[]) => {
      if (annule) return;
      setAnnees(liste);
      setAnneeId((id) => id ?? liste.find((a) => a.statut === 'active')?.id);
    };
    if (isDemoMode) choisir(getAnneesDemo(selectedChild.id));
    else getAcademicYears(selectedChild.id).then(({ data }) =>
      choisir((data ?? []).map((a) => ({ id: a.id, annee: a.annee_scolaire, niveau: a.niveau, etablissement: a.etablissement ?? '', statut: a.statut }))));
    return () => {
      annule = true;
    };
  }, [selectedChild?.id, isDemoMode, modification]);

  const anneesTriees = useMemo(() => [...annees].sort((a, b) => b.annee.localeCompare(a.annee)), [annees]);
  const valide = titre.trim().length > 0 && !!selectedChild && (modification || !!anneeId || !fichier);

  const enregistrer = async () => {
    if (!selectedChild || !valide || envoi) return;
    setEnvoi(true);
    try {
      if (element) {
        await modifierAjout(element, { categorie, date, titre: titre.trim(), visibilite: prive ? 'prive' : 'foyer' }, isDemoMode, selectedChild.id);
      } else {
        await ajouterAuCarnet(
          {
            childId: selectedChild.id,
            anneeId,
            categorie,
            titre: titre.trim(),
            note: note.trim() || undefined,
            date,
            visibilite: prive ? 'prive' : 'foyer',
            fichier: fichier ?? undefined,
          },
          isDemoMode,
        );
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Ajouter au carnet', e instanceof ErreurCarnet ? e.message : 'Enregistrement impossible. Réessayez.');
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = () => {
    if (!element || !selectedChild) return;
    Alert.alert(
      'Supprimer du carnet ?',
      element.fichier ? 'L’élément et son fichier seront supprimés définitivement.' : 'L’élément sera supprimé définitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await supprimerAjout(element, isDemoMode, selectedChild.id);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Supprimer', e instanceof ErreurCarnet ? e.message : 'Suppression impossible. Réessayez.');
            }
          },
        },
      ],
    );
  };

  const ouvrirFichier = async () => {
    if (!element) return;
    const url = await lienFichier(element, isDemoMode);
    if (url) Linking.openURL(url);
    else Alert.alert('Fichier', 'Ouverture impossible pour l’instant.');
  };

  const apercuUri = fichier?.mime.startsWith('image/') ? fichier.uriLocale : null;

  return (
    <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <DeepScreenHeader
        title={modification ? 'Modifier' : 'Ajouter au carnet'}
        subtitle={prenom ? `Carnet ${de(prenom)}` : undefined}
        onBack={() => navigation.goBack()}
        withTopInset
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        {apercuUri ? (
          <Image source={{ uri: apercuUri }} style={st.apercu} resizeMode="cover" accessibilityLabel="Aperçu de la photo" />
        ) : fichier ? (
          <View style={st.document}>
            <FileText size={22} color="#0F172A" strokeWidth={2} />
            <Text style={st.documentNom} numberOfLines={1}>{fichier.nom}</Text>
          </View>
        ) : null}
        {fichier?.mime.startsWith('image/') ? (
          <Text style={st.aide}>Position GPS et autres informations de la photo retirées avant l’envoi.</Text>
        ) : null}

        <Text style={st.label}>{categorie === 'jalon' ? `Qu’a fait ${prenom} pour la première fois ?` : 'Titre'}</Text>
        <TextInput
          style={st.champ}
          value={titre}
          onChangeText={setTitre}
          placeholder={categorie === 'jalon' ? 'Premier exposé, écrit son prénom…' : 'Dessin de la maison, mot de la maîtresse…'}
          placeholderTextColor="rgba(15,23,42,0.35)"
          maxLength={120}
        />

        <Text style={st.label}>Catégorie</Text>
        <View style={st.pills}>
          {CATEGORIES.map((c) => {
            const actif = c.id === categorie;
            return (
              <Pressable key={c.id} onPress={() => setCategorie(c.id)} style={[st.pill, actif && st.pillActive]}
                accessibilityRole="radio" accessibilityState={{ selected: actif }}>
                <Text style={[st.pillTexte, actif && st.pillTexteActif]}>{c.libelle}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={st.label}>Date</Text>
        <View style={st.date}>
          <Pressable onPress={() => setDate((d) => decaler(d, -1))} style={st.fleche} accessibilityLabel="Jour précédent">
            <ChevronLeft size={20} color="#0F172A" strokeWidth={2} />
          </Pressable>
          <Text style={st.dateTexte}>{date === aujourdHui ? `Aujourd’hui · ${jourMois(date)}` : jourMois(date)}</Text>
          <Pressable onPress={() => setDate((d) => (d < aujourdHui ? decaler(d, 1) : d))} disabled={date >= aujourdHui}
            style={[st.fleche, date >= aujourdHui && { opacity: 0.3 }]} accessibilityLabel="Jour suivant">
            <ChevronRight size={20} color="#0F172A" strokeWidth={2} />
          </Pressable>
        </View>

        {!modification && anneesTriees.length > 1 ? (
          <>
            <Text style={st.label}>Année du carnet</Text>
            <View style={st.pills}>
              {anneesTriees.map((a) => {
                const actif = a.id === anneeId;
                return (
                  <Pressable key={a.id} onPress={() => setAnneeId(a.id)} style={[st.pill, actif && st.pillActive]}
                    accessibilityRole="radio" accessibilityState={{ selected: actif }}>
                    <Text style={[st.pillTexte, actif && st.pillTexteActif]}>{`${millesimeAffiche(a.annee)} · ${a.niveau}`}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {!modification ? (
          <>
            <Text style={st.label}>Note (facultatif)</Text>
            <TextInput style={[st.champ, { minHeight: 72, textAlignVertical: 'top' }]} value={note} onChangeText={setNote}
              multiline maxLength={500} placeholder="Un mot pour se souvenir" placeholderTextColor="rgba(15,23,42,0.35)" />
          </>
        ) : null}

        <Pressable onPress={() => setPrive((p) => !p)} style={st.visibilite} accessibilityRole="switch" accessibilityState={{ checked: prive }}>
          <Lock size={18} color="#0F172A" strokeWidth={2} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={st.visibiliteTitre}>Visible par vous seul</Text>
            <Text style={st.aide}>{prive ? 'L’autre responsable ne le verra pas.' : 'Par défaut : visible par le foyer.'}</Text>
          </View>
          <View style={[st.interrupteur, prive && st.interrupteurActif]}>
            <View style={[st.pastille, prive && { alignSelf: 'flex-end' }]} />
          </View>
        </Pressable>

        <Pressable onPress={enregistrer} disabled={!valide || envoi} style={[st.primaire, (!valide || envoi) && { opacity: 0.4 }]} accessibilityRole="button">
          {envoi ? <ActivityIndicator color="#FFFFFF" /> : <Text style={st.primaireTexte}>{modification ? 'Enregistrer' : 'Ajouter au carnet'}</Text>}
        </Pressable>

        {modification && element?.fichier ? (
          <Pressable onPress={ouvrirFichier} style={st.secondaire} accessibilityRole="button">
            <Text style={st.secondaireTexte}>Voir le fichier</Text>
          </Pressable>
        ) : null}
        {modification ? (
          <Pressable onPress={supprimer} style={st.destructif} accessibilityRole="button">
            <Trash2 size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={st.destructifTexte}>Supprimer</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F1EE' },
  apercu: { width: '100%', height: 200, borderRadius: 16, backgroundColor: '#FFFFFF', marginTop: 8 },
  document: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginTop: 8 },
  documentNom: { fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 19, color: '#0F172A', marginLeft: 10, flex: 1 },
  aide: { fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 16, color: 'rgba(15,23,42,0.55)', marginTop: 6 },
  label: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, lineHeight: 17, color: '#0F172A', marginTop: 18, marginBottom: 8 },
  champ: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    lineHeight: 20,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap' },
  pill: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.08)', justifyContent: 'center', marginRight: 8, marginBottom: 8 },
  pillActive: { backgroundColor: '#0F172A' },
  pillTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, lineHeight: 17, color: 'rgba(15,23,42,0.7)' },
  pillTexteActif: { color: '#FFFFFF' },
  date: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' },
  fleche: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dateTexte: { flex: 1, textAlign: 'center', fontFamily: FontFamily.sansSemiBold, fontSize: 14, lineHeight: 19, color: '#0F172A' },
  visibilite: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginTop: 18, minHeight: 56 },
  visibiliteTitre: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, lineHeight: 19, color: '#0F172A' },
  interrupteur: { width: 44, height: 26, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.15)', padding: 3, justifyContent: 'center' },
  interrupteurActif: { backgroundColor: '#4338CA' },
  pastille: { width: 20, height: 20, borderRadius: 999, backgroundColor: '#FFFFFF' },
  primaire: {
    height: 52,
    maxWidth: 240,
    alignSelf: 'center',
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaireTexte: { fontFamily: FontFamily.sansBold, fontSize: 15, lineHeight: 20, color: '#FFFFFF' },
  secondaire: {
    height: 52,
    maxWidth: 240,
    alignSelf: 'center',
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaireTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 15, lineHeight: 20, color: '#0F172A' },
  destructif: {
    height: 52,
    maxWidth: 240,
    alignSelf: 'center',
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  destructifTexte: { fontFamily: FontFamily.sansBold, fontSize: 15, lineHeight: 20, color: '#FFFFFF', marginLeft: 8 },
});
