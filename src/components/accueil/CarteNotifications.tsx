/**
 * CarteNotifications — carte unique de l'Accueil (lot 7a, décision Q2 du 22 nov. 2026) :
 * « Recevoir les mots de l'école sur ce téléphone », boutons « Activer » et « Plus tard ».
 * - Montrée seulement à un compte réel qui a au moins un enfant, tant que la permission n'est ni accordée ni refusée et
 *   que « Plus tard » n'a pas été choisi (utils/notificationsApp.doitProposerCarte, testé). Jamais au premier lancement.
 * - La demande SYSTÈME n'apparaît qu'après « Activer ». « Plus tard » fait disparaître la carte (mémorisé sur ce téléphone,
 *   pour ce compte) ; l'activation reste disponible dans Famille et paramètres › Notifications.
 */

import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { C, RADIUS, SHADOW } from '../../constants/design';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { Text, Pressable } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { ENV } from '../../services/getEnv';
import { activerNotifications, choisirPlusTard, etatPermission, plusTardChoisi } from '../../services/appareilPush';
import { doitProposerCarte, type EtatPermission } from '../../utils/notificationsApp';

export default function CarteNotifications() {
  const { user, isDemo } = useAuth();
  const { children } = useActiveChild();
  const userId = user?.id;
  const demo = isDemo || !!ENV.VARIANTE_DEMO;
  const [permission, setPermission] = useState<EtatPermission | null>(null);
  const [plusTard, setPlusTard] = useState(true);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!userId || demo) return;
    etatPermission().then(setPermission);
    plusTardChoisi(userId).then(setPlusTard);
  }, [userId, demo]);

  if (!userId || !doitProposerCarte({ demo, nbEnfants: children.length, permission, plusTard })) return null;

  const activer = async () => {
    setEnCours(true);
    const r = await activerNotifications(userId);
    setEnCours(false);
    setPermission(await etatPermission());
    if (r === 'refuse') {
      setPlusTard(true);
      await choisirPlusTard(userId);
      Alert.alert('Notifications non activées', 'Vous pourrez les activer plus tard dans Famille et paramètres › Notifications.');
    } else if (r === 'erreur') {
      Alert.alert('Notifications', 'Ce téléphone n’a pas pu être inscrit. Réessayez depuis Famille et paramètres › Notifications.');
    }
  };
  const remettre = async () => {
    setPlusTard(true);
    await choisirPlusTard(userId);
  };

  return (
    <View style={st.carte}>
      <View style={st.entete}>
        <View style={st.icone}>
          <Bell size={20} color="#0F172A" strokeWidth={2} />
        </View>
        <Text style={st.titre}>Recevoir les mots de l’école sur ce téléphone</Text>
      </View>
      <Text style={st.texte}>
        Une notification vous prévient d’un mot, d’un message de l’enseignant ou d’une absence à justifier. Seuls le prénom
        de l’enfant, le type et l’expéditeur s’affichent, jamais le contenu.
      </Text>
      <View style={st.boutons}>
        <Pressable onPress={activer} disabled={enCours} style={[st.pilule, enCours && { opacity: 0.6 }]} accessibilityRole="button">
          <Text style={st.piluleTexte}>Activer</Text>
        </Pressable>
        <Pressable onPress={remettre} style={st.plusTard} hitSlop={{ top: 6, bottom: 6 }} accessibilityRole="button">
          <Text style={st.plusTardTexte}>Plus tard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  carte: {
    marginHorizontal: 14,
    marginBottom: 8,
    padding: 16,
    borderRadius: RADIUS.card,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.border,
    ...SHADOW.card,
  },
  entete: { flexDirection: 'row', alignItems: 'center' },
  icone: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titre: { flex: 1, fontFamily: FontFamily.sansBold, fontSize: 15, lineHeight: 20, color: '#0F172A' },
  texte: { fontFamily: FontFamily.sansRegular, fontSize: 13, lineHeight: 19, color: 'rgba(15,23,42,0.6)', marginTop: 10 },
  boutons: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  pilule: {
    height: 40,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  piluleTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 14, lineHeight: 18, color: '#FFFFFF' },
  plusTard: { height: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  plusTardTexte: { fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 18, color: 'rgba(15,23,42,0.55)' },
});
