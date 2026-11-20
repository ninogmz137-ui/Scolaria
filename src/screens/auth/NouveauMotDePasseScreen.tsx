/**
 * NouveauMotDePasseScreen (L3) — ouvert par le lien de réinitialisation (session de récupération déjà
 * établie par LiensAuthRouteur). Enregistre le nouveau mot de passe (supabase.auth.updateUser).
 */

import { useState } from 'react';
import { View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { Text, TextInput, Pressable } from '../../components/ui';
import { stylesAuth as st } from './MotDePasseOublieScreen';

const LONGUEUR_MIN = 8;

export default function NouveauMotDePasseScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [mdp, setMdp] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const valide = mdp.length >= LONGUEUR_MIN && mdp === confirmation;
  const enregistrer = async () => {
    if (!valide || envoi) return;
    setEnvoi(true);
    setErreur(null);
    const { error } = await supabase.auth.updateUser({ password: mdp });
    setEnvoi(false);
    if (error) {
      setErreur(
        /same|different/i.test(error.message)
          ? 'Choisissez un mot de passe différent de l’ancien.'
          : /weak|short|characters/i.test(error.message)
            ? 'Mot de passe trop faible : 8 caractères au moins, mélangez lettres et chiffres.'
            : 'Le mot de passe n’a pas pu être enregistré. Redemandez un lien.',
      );
      return;
    }
    Alert.alert('Mot de passe modifié', 'Votre nouveau mot de passe est enregistré.');
    navigation.reset({ index: 0, routes: [{ name: 'MainPager' }] });
  };

  return (
    <View style={[st.racine, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={st.entete}>
        <View style={{ width: 44, height: 44 }} />
        <Text style={st.titre}>Nouveau mot de passe</Text>
        <View style={{ width: 44, height: 44 }} />
      </View>
      <View style={st.corps}>
        <Text style={st.texte}>Choisissez votre nouveau mot de passe (8 caractères au moins).</Text>
        <TextInput
          style={st.champ}
          value={mdp}
          onChangeText={setMdp}
          placeholder="Nouveau mot de passe"
          placeholderTextColor="rgba(15,23,42,0.35)"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          accessibilityLabel="Nouveau mot de passe"
        />
        <TextInput
          style={st.champ}
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="Confirmez le mot de passe"
          placeholderTextColor="rgba(15,23,42,0.35)"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={enregistrer}
          accessibilityLabel="Confirmez le mot de passe"
        />
        {confirmation.length > 0 && mdp !== confirmation && <Text style={st.erreur}>Les deux mots de passe sont différents.</Text>}
        {erreur && <Text style={st.erreur}>{erreur}</Text>}
        <Pressable
          onPress={enregistrer}
          disabled={!valide || envoi}
          style={[st.primaire, (!valide || envoi) && { opacity: 0.65 }]}
          accessibilityRole="button"
        >
          <Text style={st.primaireTexte}>{envoi ? 'Un instant…' : 'Enregistrer'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
