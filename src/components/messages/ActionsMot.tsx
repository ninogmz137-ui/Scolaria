/**
 * ActionsMot — statuts par responsable (« Marc ✓ · Vous », COMPONENTS §17) et action attendue de MOI :
 *   - signature : « Signer » ;
 *   - autorisation : « Oui » / « Non » ;
 *   - participation : « Oui » / « Peut-être » / « Non ».
 * Confirmation OBLIGATOIRE avant tout enregistrement : « Signer au nom de [prénom nom] ? ».
 * Une signature par responsable et par carnet (motsService).
 */

import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../ui';
import { repondreMot, signerMot, type MotCarnet, type Participation, type Reponse } from '../../services/motsService';

const NAVY = '#0F172A';

const LIBELLE_REPONSE: Record<string, string> = { true: 'Oui', false: 'Non', oui: 'Oui', peut_etre: 'Peut-être', non: 'Non' };

const dateLongue = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** « Signé par Marc le 3 octobre 2026 » / « Répondu par Marc : Oui » — mode « one » : un signataire suffit. */
export function libelleTraitement(mot: MotCarnet): string | null {
  const t = mot.traitePar;
  if (!t) return null;
  const qui = t.estMoi ? 'vous' : t.prenom;
  const reponse = (mot.type === 'autorisation' || mot.type === 'participation') && t.reponse !== null
    ? `Répondu par ${qui} : ${LIBELLE_REPONSE[String(t.reponse)]}`
    : `Signé par ${qui}`;
  return t.le ? `${reponse} le ${dateLongue(t.le)}` : reponse;
}

export function StatutsSignature({ mot }: { mot: MotCarnet }) {
  if (mot.signatureMode === 'none') return null;
  if (mot.signatureMode === 'one') {
    const l = libelleTraitement(mot);
    return (
      <View style={st.statuts} accessibilityLabel={l ?? 'Une seule signature suffit'}>
        <Text style={st.statutTexte}>{l ? `✓ ${l}` : 'Une seule signature suffit'}</Text>
        {l && !mot.traitePar?.estMoi ? <Text style={st.statutTexte}>· traité pour tout le foyer</Text> : null}
        {mot.reponsesAnciennes.length > 0 && mot.traitePar?.ancien !== true
          ? mot.reponsesAnciennes.map((r, i) => (
              <Text key={`rep-ancien-${i}`} style={st.statutTexte}>{`Répondu par un responsable (compte supprimé) : ${LIBELLE_REPONSE[String(r.reponse)]}`}</Text>
            ))
          : null}
      </View>
    );
  }
  if (mot.responsables.length === 0 && mot.signaturesAnciens.length === 0) return null;
  // Les autres d'abord, « Vous » en dernier (« Marc ✓ · Vous »).
  const ordre = [...mot.responsables].sort((a, b) => Number(a.estMoi) - Number(b.estMoi));
  return (
    <View style={st.statuts} accessibilityLabel={ordre.map((r) => `${r.estMoi ? 'Vous' : r.prenom} ${r.aSigne ? 'a signé' : 'n’a pas signé'}`).join(', ')}>
      {ordre.map((r) => (
        <View key={r.id} style={[st.statut, r.aSigne && st.statutSigne]}>
          <Text style={[st.statutTexte, r.aSigne && st.statutTexteSigne]}>
            {`${r.estMoi ? 'Vous' : r.prenom}${r.aSigne ? ' ✓' : ''}`}
          </Text>
        </View>
      ))}
      {mot.signaturesAnciens.map((d, i) => (
        <Text key={`ancien-${i}`} style={st.statutTexte}>
          {`Signé par un responsable (compte supprimé) le ${dateLongue(d)}`}
        </Text>
      ))}
      {mot.reponsesAnciennes.map((r, i) => (
        <Text key={`rep-ancien-${i}`} style={st.statutTexte}>
          {`Répondu par un responsable (compte supprimé) : ${LIBELLE_REPONSE[String(r.reponse)]}`}
        </Text>
      ))}
    </View>
  );
}

export default function ActionsMot({ mot, monNom, demo }: { mot: MotCarnet; monNom: string; demo: boolean }) {
  const [envoi, setEnvoi] = useState(false);

  const confirmer = (titre: string, message: string, bouton: string, action: () => Promise<string | null>) => {
    Alert.alert(titre, message, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: bouton,
        onPress: async () => {
          setEnvoi(true);
          const erreur = await action();
          setEnvoi(false);
          if (erreur) Alert.alert('Oups', erreur);
        },
      },
    ]);
  };

  const signer = () =>
    confirmer(`Signer au nom de ${monNom} ?`, `« ${mot.titre} »`, 'Signer', () => signerMot(mot, demo));
  const repondre = (reponse: Reponse) =>
    confirmer(
      `Répondre « ${LIBELLE_REPONSE[String(reponse)]} » au nom de ${monNom} ?`,
      `« ${mot.titre} »${mot.signatureMode !== 'none' ? '\nVotre réponse vaut signature.' : ''}`,
      'Confirmer',
      () => repondreMot(mot, reponse, demo),
    );

  const choix: { libelle: string; valeur: Reponse }[] | null =
    mot.type === 'autorisation'
      ? [
          { libelle: 'Oui', valeur: true },
          { libelle: 'Non', valeur: false },
        ]
      : mot.type === 'participation'
        ? [
            { libelle: 'Oui', valeur: 'oui' as Participation },
            { libelle: 'Peut-être', valeur: 'peut_etre' as Participation },
            { libelle: 'Non', valeur: 'non' as Participation },
          ]
        : null;

  return (
    <View>
      <StatutsSignature mot={mot} />
      {mot.signatureMode === 'one' && mot.traitePar ? null : choix ? (
        mot.maReponse === null ? (
          <View style={st.choix}>
            {choix.map((c) => (
              <Pressable
                key={c.libelle}
                disabled={envoi}
                onPress={() => repondre(c.valeur)}
                style={({ pressed }) => [st.pillSecondaire, pressed && st.presse]}
                accessibilityRole="button"
              >
                <Text style={st.pillSecondaireTexte}>{c.libelle}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={st.reponse}>{`Votre réponse : ${LIBELLE_REPONSE[String(mot.maReponse)]}`}</Text>
        )
      ) : mot.signatureMode !== 'none' && !mot.maSignature && !mot.signeParAncien ? (
        <Pressable
          disabled={envoi}
          onPress={signer}
          style={({ pressed }) => [st.pillPrimaire, pressed && st.presse]}
          accessibilityRole="button"
        >
          <Text style={st.pillPrimaireTexte}>Signer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  statuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  statut: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 999,
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  statutSigne: { backgroundColor: 'rgba(67,56,202,0.10)' },
  statutTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 11, lineHeight: 14, color: 'rgba(15,23,42,0.62)' },
  statutTexteSigne: { color: '#4338CA' },
  choix: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pillSecondaire: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSecondaireTexte: { fontFamily: FontFamily.sansBold, fontSize: 14, color: NAVY },
  pillPrimaire: {
    marginTop: 12,
    height: 44,
    minWidth: 140,
    alignSelf: 'flex-start',
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPrimaireTexte: { fontFamily: FontFamily.sansBold, fontSize: 14, color: '#FFFFFF' },
  presse: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  reponse: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: 'rgba(15,23,42,0.62)', marginTop: 10 },
});
