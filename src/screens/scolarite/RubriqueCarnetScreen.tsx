/**
 * RubriqueCarnetScreen — Scolarité, niveau 2 : Souvenirs ou Documents en page profonde (route
 * ScolariteSouvenirs / ScolariteDocuments). UNE ligne de filtres, puis la liste (CarnetVue).
 *
 * Un filtre sans élément n'est pas affiché (jamais de module grisé) ; s'il ne reste que « Tout », la
 * ligne n'est pas affichée. Documents = livrets, bulletins, évaluations nationales et tout document ajouté
 * par le parent (catégorie « livret » en base : livret scanné, certificat, attestation…).
 * « Mots signés » arrive au lot 3 (archivage des mots traités).
 */

import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Text, Pressable } from '../../components/ui';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { AucunEnfantOnglet } from '../../components/AucunEnfant';
import EtatErreur from '../../components/EtatErreur';
import CarnetVue from '../suivi/CarnetVue';
import { useScolarite } from '../../hooks/useScolarite';
import { useOuvrirFichierCarnet } from '../../hooks/useOuvrirFichierCarnet';
import type { ElementCarnet } from '../../services/carnetService';

type Filtre = { id: string; libelle: string; garde: (e: ElementCarnet) => boolean };

const FILTRES_SOUVENIRS: Filtre[] = [
  { id: 'tout', libelle: 'Tout', garde: () => true },
  { id: 'photos', libelle: 'Photos et dessins', garde: (e) => e.type === 'dessin' || e.type === 'album' },
  { id: 'jalons', libelle: 'Premières fois', garde: (e) => e.type === 'jalon' },
];

const FILTRES_DOCUMENTS: Filtre[] = [
  { id: 'tout', libelle: 'Tout', garde: () => true },
  { id: 'livrets', libelle: 'Livrets et bulletins', garde: (e) => e.source === 'ecole' && (e.type === 'livret' || e.type === 'bulletin') },
  { id: 'evaluations', libelle: 'Évaluations nationales', garde: (e) => e.type === 'evaluation_nationale' },
  { id: 'mots', libelle: 'Mots signés et autorisations', garde: (e) => !!e.motId },
  { id: 'ajouts', libelle: 'Ajoutés par vous', garde: (e) => !!e.deMoi },
];

export default function RubriqueCarnetScreen() {
  const { selectedChild } = useActiveChild();
  if (!selectedChild) return <AucunEnfantOnglet />;
  return <Rubrique />;
}

function Rubrique() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { selectedChild } = useActiveChild();
  const s = useScolarite();
  const documents = route.name === 'ScolariteDocuments';
  const items = documents ? s.documents : s.souvenirs;
  const filtres = useMemo(
    () => (documents ? FILTRES_DOCUMENTS : FILTRES_SOUVENIRS).filter((f) => f.id === 'tout' || items.some(f.garde)),
    [documents, items],
  );
  const [actif, setActif] = useState('tout');
  // Changement d'enfant, ou filtre devenu vide : retour à « Tout ».
  useEffect(() => setActif('tout'), [selectedChild?.id]);
  const filtre = filtres.find((f) => f.id === actif) ?? filtres[0];
  const visibles = items.filter(filtre.garde);

  const ouvrirFichier = useOuvrirFichierCarnet();
  const ouvrir = async (e: ElementCarnet) => {
    if (e.motId) {
      navigation.navigate('MotDetailScreen', { motId: e.motId, childId: selectedChild?.id, expediteur: e.auteur });
      return;
    }
    if (e.deMoi) {
      navigation.navigate('AjouterAuCarnet', { element: e });
      return;
    }
    await ouvrirFichier(e);
  };
  const erreur = s.erreurCarnet;

  const entete = (
    <>
      {filtres.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={st.filtres}
          contentContainerStyle={st.filtresContenu}
        >
          {filtres.map((f, i) => {
            const estActif = f.id === filtre.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setActif(f.id)}
                style={[st.pill, estActif ? st.pillActive : st.pillInactive, i < filtres.length - 1 && st.pillEspace]}
                accessibilityRole="button"
                accessibilityState={{ selected: estActif }}
                hitSlop={{ top: 7, bottom: 7 }}
              >
                <Text style={[st.pillTexte, estActif ? st.pillTexteActif : st.pillTexteInactif]}>{f.libelle}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      {erreur ? <EtatErreur type={erreur} compact onReessayer={s.reessayer} /> : null}
    </>
  );

  return (
    <CarnetVue
      mode={documents ? 'livrets' : 'souvenirs'}
      entete={entete}
      items={visibles}
      vide={erreur ? '' : documents ? 'Aucun document pour l’instant.' : 'Aucun souvenir pour l’instant.'}
      onParcours={documents ? () => navigation.navigate('MonParcours') : undefined}
      onOuvrir={ouvrir}
    />
  );
}

const st = StyleSheet.create({
  // ScrollView horizontal dans une colonne : flexGrow 0 (leçon du 25 sept. 2026, vide partagé sinon).
  filtres: { flexGrow: 0, flexShrink: 0, marginBottom: 10 },
  filtresContenu: { paddingHorizontal: 14, paddingVertical: 2 },
  // Pills de filtre (COMPONENTS §3) ; marginRight plutôt que gap (Android, leçon du 18 avr.).
  pill: { height: 30, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center' },
  pillEspace: { marginRight: 6 },
  pillActive: { backgroundColor: '#0F172A' },
  pillInactive: { backgroundColor: 'rgba(15,23,42,0.08)' },
  pillTexte: { fontSize: 12 },
  pillTexteActif: { fontFamily: FontFamily.sansSemiBold, color: '#FFFFFF' },
  pillTexteInactif: { fontFamily: FontFamily.sansMedium, color: 'rgba(15,23,42,0.55)' },
});
