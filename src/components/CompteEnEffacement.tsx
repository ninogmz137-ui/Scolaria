/**
 * CompteEnEffacement (L7, D6) — un compte dont l'effacement est demandé est DÉSACTIVÉ : le serveur ne lui
 * montre plus aucun carnet (M25), et l'app n'affiche que cet écran : date d'effacement, « Annuler
 * l'effacement » (tout redevient comme avant) ou « Se déconnecter ». Compte réel seulement.
 */

import { useCallback, useEffect, useState } from 'react';
import { View, Modal, StyleSheet, Alert, AppState, Platform } from 'react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text, Pressable } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { mesEffacements, annulerEffacement, dateEffacement, surChangementEffacement, type Effacement } from '../services/effacement';

const NAVY = '#0F172A';
const TEXT55 = 'rgba(15,23,42,0.55)';

export default function CompteEnEffacement() {
  const { user, isDemo, signOut } = useAuth();
  const { reloadChildren } = useActiveChild();
  const [demande, setDemande] = useState<Effacement | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const idCompte = user?.id;

  const charger = useCallback(async () => {
    if (isDemo || !idCompte) {
      setDemande(null);
      return;
    }
    const liste = await mesEffacements();
    setDemande(liste.find((d) => d.portee === 'compte') ?? null);
  }, [isDemo, idCompte]);

  useEffect(() => {
    charger();
    const sub = AppState.addEventListener('change', (e) => {
      if (e === 'active') charger();
    });
    const desabo = surChangementEffacement(charger);
    return () => {
      sub.remove();
      desabo();
    };
  }, [charger]);

  if (!demande) return null;

  const annuler = async () => {
    setEnvoi(true);
    const ok = await annulerEffacement(demande.demande_id);
    setEnvoi(false);
    if (!ok) return Alert.alert('Effacement', 'L’annulation n’a pas pu être enregistrée. Réessayez.');
    await reloadChildren();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent={Platform.OS === 'android'} onRequestClose={() => {}}>
      <View style={st.fond}>
        <View style={st.carte}>
          <Text style={st.titre}>Votre compte sera effacé le {dateEffacement(demande.execution_prevue_le)}</Text>
          <Text style={st.texte}>
            Il est désactivé depuis votre demande : plus aucun carnet n’est visible. Jusqu’à cette date, vous pouvez
            annuler, et tout redevient comme avant.
          </Text>
          <Pressable
            onPress={annuler}
            disabled={envoi}
            style={[st.primaire, envoi && { opacity: 0.6 }]}
            accessibilityRole="button"
          >
            <Text style={st.primaireTexte}>{envoi ? 'Un instant…' : 'Annuler l’effacement'}</Text>
          </Pressable>
          <Pressable onPress={signOut} disabled={envoi} style={st.ghost} accessibilityRole="button">
            <Text style={st.ghostTexte}>Se déconnecter</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  fond: { flex: 1, backgroundColor: '#F2F1EE', justifyContent: 'center', padding: 24 },
  carte: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20 },
  titre: { fontFamily: FontFamily.displayBold, fontSize: 19, lineHeight: 25, letterSpacing: -0.5, color: NAVY, marginBottom: 10 },
  texte: { fontFamily: FontFamily.sansRegular, fontSize: 14, lineHeight: 21, color: NAVY, marginBottom: 16 },
  primaire: { height: 52, borderRadius: 999, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  primaireTexte: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#FFFFFF' },
  ghost: { minHeight: 44, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 6 },
  ghostTexte: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: TEXT55 },
});
