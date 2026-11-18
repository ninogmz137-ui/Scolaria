/**
 * ReponsePrivee — « Répondre à [expéditeur] » sous un mot (mot complet, M39 ; CLAUDE.md § Messages).
 *
 * La réponse part dans MON fil individuel avec l'enseignant et CITE le mot (motsService.repondreEnPrive) :
 * l'autre responsable ne la voit pas (garde partagée). Mes réponses déjà envoyées s'affichent au-dessus,
 * chacune avec sa ligne source sur sa propre ligne. Absent si l'expéditeur n'est pas l'enseignant de l'enfant.
 */

import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, TextInput, Pressable } from '../ui';
import { repondreEnPrive, type MotCarnet } from '../../services/motsService';

const NAVY = '#0F172A';
const TEXT55 = 'rgba(15,23,42,0.55)';

const quand = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) +
  ` à ${new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

export default function ReponsePrivee({ mot, demo, onSaisie }: { mot: MotCarnet; demo: boolean; onSaisie?: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  if (!mot.peutRepondre) return null;

  const envoyer = async () => {
    setEnvoi(true);
    const erreur = await repondreEnPrive(mot, texte, demo);
    setEnvoi(false);
    if (erreur) {
      Alert.alert('Oups', erreur);
      return;
    }
    setTexte('');
    setOuvert(false);
  };

  return (
    <View style={st.bloc}>
      {mot.mesReponsesPrivees.map((r, i) => (
        <View key={`${r.le}-${i}`} style={st.envoyee}>
          <Text style={st.envoyeeTexte}>{r.texte}</Text>
          <Text style={st.source}>{`Votre réponse à ${mot.expediteur} · ${quand(r.le)}`}</Text>
        </View>
      ))}
      {ouvert ? (
        <View>
          <Text style={st.cite} numberOfLines={2}>{`En réponse au mot « ${mot.titre} »`}</Text>
          <TextInput
            value={texte}
            onChangeText={setTexte}
            placeholder={`Votre message à ${mot.expediteur}`}
            placeholderTextColor="rgba(15,23,42,0.35)"
            multiline
            maxLength={2000}
            autoFocus
            onFocus={onSaisie}
            style={st.saisie}
            accessibilityLabel={`Votre message à ${mot.expediteur}`}
          />
          <Text style={st.prive}>{`Visible de vous et de ${mot.expediteur} seulement.`}</Text>
          <View style={st.boutons}>
            <Pressable
              disabled={envoi || !texte.trim()}
              onPress={envoyer}
              style={({ pressed }) => [st.pilule, st.pilulePleine, (envoi || !texte.trim()) && st.inactif, pressed && st.presse]}
              accessibilityRole="button"
            >
              <Text style={st.piluleTextePleine}>Envoyer</Text>
            </Pressable>
            <Pressable
              disabled={envoi}
              onPress={() => {
                setOuvert(false);
                setTexte('');
              }}
              style={({ pressed }) => [st.pilule, pressed && st.presse]}
              accessibilityRole="button"
            >
              <Text style={st.piluleTexteGhost}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={st.boutons}>
          <Pressable
            onPress={() => setOuvert(true)}
            style={({ pressed }) => [st.pilule, st.piluleContour, pressed && st.presse]}
            accessibilityRole="button"
          >
            <Text style={st.piluleTexteContour}>{`Répondre à ${mot.expediteur}`}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  bloc: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(15,23,42,0.07)' },
  envoyee: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.07)',
    padding: 14,
    marginBottom: 10,
  },
  envoyeeTexte: { fontFamily: FontFamily.sansRegular, fontSize: 14, lineHeight: 20, color: NAVY },
  source: { fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 16, color: TEXT55, marginTop: 6 },
  cite: { fontFamily: FontFamily.sansSemiBold, fontSize: 12, lineHeight: 16, color: TEXT55, marginBottom: 8 },
  saisie: {
    minHeight: 96,
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.07)',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    lineHeight: 21,
    color: NAVY,
    textAlignVertical: 'top',
  },
  prive: { fontFamily: FontFamily.sansRegular, fontSize: 12, lineHeight: 16, color: TEXT55, marginTop: 6 },
  boutons: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  pilule: {
    height: 44,
    paddingHorizontal: 20,
    marginRight: 8,
    marginTop: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pilulePleine: { backgroundColor: NAVY },
  piluleContour: { borderWidth: 2, borderColor: 'rgba(15,23,42,0.18)' },
  piluleTextePleine: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: '#FFFFFF' },
  piluleTexteContour: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: NAVY },
  piluleTexteGhost: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: TEXT55 },
  inactif: { opacity: 0.4 },
  presse: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
