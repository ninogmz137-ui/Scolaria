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

export function StatutsSignature({ mot, retrait = 0 }: { mot: MotCarnet; retrait?: number }) {
  if (mot.signatureMode === 'none') return null;
  if (mot.signatureMode === 'one') {
    const l = libelleTraitement(mot);
    return (
      <View style={[st.statuts, { marginLeft: retrait }]} accessibilityLabel={l ?? 'Une seule signature suffit'}>
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
    <View style={[st.statuts, { marginLeft: retrait }]} accessibilityLabel={ordre.map((r) => `${r.estMoi ? 'Vous' : r.prenom} ${r.aSigne ? 'a signé' : 'n’a pas signé'}`).join(', ')}>
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

/** `retrait` : alignement sur le texte d'une ligne à pastille (50 = pastille 38 + 12). */
export default function ActionsMot({
  mot,
  monNom,
  demo,
  retrait = 0,
}: {
  mot: MotCarnet;
  monNom: string;
  demo: boolean;
  retrait?: number;
}) {
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

  // Pilules COMPACTES (COMPONENTS §2) : la première est pleine (réponse « positive »), les autres en contour.
  const choix: { libelle: string; valeur: Reponse; pleine?: boolean }[] | null =
    mot.type === 'autorisation'
      ? [
          { libelle: 'J’autorise', valeur: true, pleine: true },
          { libelle: 'Non', valeur: false },
        ]
      : mot.type === 'participation'
        ? [
            { libelle: 'Je participe', valeur: 'oui' as Participation, pleine: true },
            { libelle: 'Peut-être', valeur: 'peut_etre' as Participation },
            { libelle: 'Non', valeur: 'non' as Participation },
          ]
        : null;

  return (
    <View>
      <StatutsSignature mot={mot} retrait={retrait} />
      {mot.signatureMode === 'one' && mot.traitePar ? null : choix ? (
        mot.maReponse === null ? (
          <View style={[st.choix, { marginLeft: retrait }]}>
            {choix.map((c) => (
              <Pressable
                key={c.libelle}
                disabled={envoi}
                onPress={() => repondre(c.valeur)}
                hitSlop={{ top: 2, bottom: 2 }}
                style={({ pressed }) => [st.pilule, c.pleine ? st.pilulePleine : st.piluleContour, pressed && st.presse]}
                accessibilityRole="button"
              >
                <Text style={c.pleine ? st.piluleTextePleine : st.piluleTexteContour}>{c.libelle}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={[st.reponse, { marginLeft: retrait }]}>{`Votre réponse : ${LIBELLE_REPONSE[String(mot.maReponse)]}`}</Text>
        )
      ) : mot.signatureMode !== 'none' && !mot.maSignature && !mot.signeParAncien ? (
        <View style={[st.choix, { marginLeft: retrait }]}>
          <Pressable
            disabled={envoi}
            onPress={signer}
            hitSlop={{ top: 2, bottom: 2 }}
            style={({ pressed }) => [st.pilule, st.pilulePleine, pressed && st.presse]}
            accessibilityRole="button"
          >
            <Text style={st.piluleTextePleine}>Signer</Text>
          </Pressable>
        </View>
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
  // Pilules compactes : hauteur 40, retour à la ligne autorisé (marges plutôt que gap : leçon du 10 avril).
  choix: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  pilule: {
    height: 40,
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
  presse: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  reponse: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: 'rgba(15,23,42,0.62)', marginTop: 10 },
});
