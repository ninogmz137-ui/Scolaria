/**
 * InvitationsRecues (L4) — côté INVITÉ : à l'ouverture de l'app et à chaque retour au premier plan, les
 * invitations en attente (M24, prénoms seulement) s'affichent : « Claire vous invite à suivre le carnet de
 * Léa » · Accepter / Refuser. Email du compte non confirmé → message clair (respond_invitation l'exige).
 * Compte réel seulement (jamais en démo).
 */

import { useCallback, useEffect, useState } from 'react';
import { View, Modal, StyleSheet, Alert, AppState, Platform } from 'react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text, Pressable } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { mesInvitations, repondreInvitation, type InvitationRecue } from '../services/database';

const NAVY = '#0F172A';
const TEXT55 = 'rgba(15,23,42,0.55)';

export default function InvitationsRecues() {
  const { user, isDemo } = useAuth();
  const { reloadChildren } = useActiveChild();
  const [invitations, setInvitations] = useState<InvitationRecue[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const idCompte = user?.id;

  const charger = useCallback(async () => {
    if (isDemo || !idCompte) {
      setInvitations([]);
      return;
    }
    setInvitations(await mesInvitations());
  }, [isDemo, idCompte]);

  useEffect(() => {
    charger();
    const sub = AppState.addEventListener('change', (e) => {
      if (e === 'active') charger();
    });
    return () => sub.remove();
  }, [charger]);

  const inv = invitations[0];
  if (!inv) return null;

  const repondre = async (accepter: boolean) => {
    setEnvoi(true);
    const { data, error } = await repondreInvitation(inv.invitation_id, accepter);
    setEnvoi(false);
    if (error) {
      Alert.alert(
        'Invitation',
        /confirm/i.test(error.message)
          ? 'Confirmez d’abord votre adresse email (lien reçu à l’inscription), puis réessayez.'
          : /expir/i.test(error.message)
            ? 'Cette invitation a expiré. Demandez-en une nouvelle.'
            : 'La réponse n’a pas pu être enregistrée. Réessayez.',
      );
      charger();
      return;
    }
    if (data === 'acceptee') await reloadChildren();
    charger();
  };
  const refuser = () =>
    Alert.alert('Refuser l’invitation ?', `Vous ne suivrez pas le carnet de ${inv.prenom_enfant}.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Refuser', style: 'destructive', onPress: () => repondre(false) },
    ]);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent={Platform.OS === 'android'} onRequestClose={() => {}}>
      <View style={st.fond}>
        <View style={st.carte}>
          <Text style={st.titre}>{`${inv.prenom_invitant} vous invite à suivre le carnet de ${inv.prenom_enfant}`}</Text>
          <Text style={st.texte}>
            En acceptant, vous devenez responsable de ce carnet : vous verrez tout ce que le foyer y partage. Vos ajouts
            « privés » resteront visibles par vous seul.
          </Text>
          {!inv.email_confirme && (
            <Text style={st.alerte}>Confirmez d’abord votre adresse email (lien reçu à l’inscription).</Text>
          )}
          <Pressable
            onPress={() => repondre(true)}
            disabled={envoi || !inv.email_confirme}
            style={[st.primaire, (envoi || !inv.email_confirme) && { opacity: 0.6 }]}
            accessibilityRole="button"
          >
            <Text style={st.primaireTexte}>{envoi ? 'Un instant…' : 'Accepter'}</Text>
          </Pressable>
          <Pressable onPress={refuser} disabled={envoi} style={st.ghost} accessibilityRole="button">
            <Text style={st.ghostTexte}>Refuser</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  fond: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 24 },
  carte: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20 },
  titre: { fontFamily: FontFamily.displayBold, fontSize: 19, lineHeight: 25, letterSpacing: -0.5, color: NAVY, marginBottom: 10 },
  texte: { fontFamily: FontFamily.sansRegular, fontSize: 14, lineHeight: 21, color: NAVY, marginBottom: 12 },
  alerte: { fontFamily: FontFamily.sansMedium, fontSize: 13, lineHeight: 19, color: NAVY, marginBottom: 12 },
  primaire: { height: 52, borderRadius: 999, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaireTexte: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#FFFFFF' },
  ghost: { minHeight: 44, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 6 },
  ghostTexte: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: TEXT55 },
});
