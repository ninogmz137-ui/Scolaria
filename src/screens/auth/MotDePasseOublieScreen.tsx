/**
 * MotDePasseOublieScreen (L3) — envoie un lien de réinitialisation. Le lien revient dans l'app
 * (`<schéma>://auth/callback?type=recovery&code=…`, flux PKCE : à ouvrir sur CE téléphone).
 * Réponse identique que le compte existe ou non (on ne révèle jamais si une adresse est inscrite).
 */

import { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { urlRetourAuth } from '../../services/liensAuthApp';
import { Text, TextInput, Pressable } from '../../components/ui';

const NAVY = '#0F172A';
const TEXT55 = 'rgba(15,23,42,0.55)';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MotDePasseOublieScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState<'saisie' | 'envoi' | 'envoye' | 'erreur'>('saisie');

  const valide = EMAIL.test(email.trim());
  const demander = async () => {
    if (!valide || etat === 'envoi') return;
    setEtat('envoi');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: urlRetourAuth({ recuperation: true }),
    });
    // Limite d'envoi atteinte ou panne : message générique ; sinon même message que le compte existe ou non.
    setEtat(error && /rate|limit|network|fetch/i.test(error.message) ? 'erreur' : 'envoye');
  };

  return (
    <View style={[st.racine, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={st.entete}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={st.retour} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft size={20} color={TEXT55} strokeWidth={2} />
        </Pressable>
        <Text style={st.titre}>Mot de passe oublié</Text>
        <View style={{ width: 44, height: 44 }} />
      </View>
      <View style={st.corps}>
        {etat === 'envoye' ? (
          <>
            <Text style={st.texte}>
              Si un compte existe pour cette adresse, un email vient d’être envoyé. Ouvrez le lien sur ce téléphone pour
              choisir un nouveau mot de passe.
            </Text>
            <Pressable onPress={() => navigation.goBack()} style={st.primaire} accessibilityRole="button">
              <Text style={st.primaireTexte}>Retour à la connexion</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={st.texte}>Indiquez l’adresse de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</Text>
            <TextInput
              style={st.champ}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (etat === 'erreur') setEtat('saisie');
              }}
              placeholder="Adresse email"
              placeholderTextColor="rgba(15,23,42,0.35)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={demander}
              accessibilityLabel="Adresse email"
            />
            {etat === 'erreur' && <Text style={st.erreur}>L’envoi n’a pas pu se faire. Réessayez dans quelques minutes.</Text>}
            <Pressable
              onPress={demander}
              disabled={!valide || etat === 'envoi'}
              style={[st.primaire, (!valide || etat === 'envoi') && { opacity: 0.65 }]}
              accessibilityRole="button"
            >
              <Text style={st.primaireTexte}>{etat === 'envoi' ? 'Un instant…' : 'Recevoir le lien'}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

export const stylesAuth = StyleSheet.create({
  racine: { flex: 1, backgroundColor: '#F2F1EE' },
  entete: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  retour: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  titre: { flex: 1, textAlign: 'center', fontFamily: 'Figtree_700Bold', fontSize: 14, color: NAVY, letterSpacing: -0.3 },
  corps: { paddingHorizontal: 24, paddingTop: 18 },
  texte: { fontFamily: 'Figtree_400Regular', fontSize: 14, lineHeight: 21, color: NAVY, marginBottom: 16 },
  champ: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    color: NAVY,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
  },
  erreur: { fontFamily: 'Figtree_400Regular', fontSize: 13, color: '#EF4444', marginBottom: 8 },
  primaire: {
    marginTop: 16,
    width: '100%',
    maxWidth: 240,
    height: 52,
    borderRadius: 999,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  primaireTexte: { fontFamily: 'Figtree_600SemiBold', fontSize: 15, color: '#FFFFFF', letterSpacing: -0.2 },
});
const st = stylesAuth;
