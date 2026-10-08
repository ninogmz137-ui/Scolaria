/**
 * EtatErreur — un chargement a échoué (réseau coupé, session expirée, erreur serveur).
 * Message clair en français + pill « Réessayer » (ou « Se reconnecter » si la session a expiré).
 * Jamais un écran blanc, jamais une liste vide qui laisserait croire qu'il n'y a rien.
 * Pas de glass card : texte posé sur le fond de page (#F2F1EE).
 */

import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CloudOff, ServerCrash, LogIn } from 'lucide-react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { MESSAGES_ERREUR, type TypeErreur } from '../services/erreurs';
import { NOM_APP } from '../constants/marque';
import { useAuth } from '../contexts/AuthContext';
import { Pressable, Text } from './ui';

export default function EtatErreur({
  type,
  onReessayer,
  compact,
}: {
  type: TypeErreur;
  onReessayer: () => void | Promise<unknown>;
  /** Dans une section d'écran (au lieu de remplir la page). */
  compact?: boolean;
}) {
  const { signOut } = useAuth();
  const [essai, setEssai] = useState(false);
  const { titre, texte: brut } = MESSAGES_ERREUR[type];
  // Le texte de base nomme « Scolaria » : le nom AFFICHÉ vient de NOM_APP (variante démo : « Carnet Démo »).
  const texte = brut.replace(/Scolaria/g, NOM_APP);
  const Icone = type === 'reseau' ? CloudOff : type === 'session' ? LogIn : ServerCrash;

  const agir = async () => {
    if (type === 'session') {
      await signOut().catch(() => {});
      return;
    }
    setEssai(true);
    try {
      await onReessayer();
    } finally {
      setEssai(false);
    }
  };

  return (
    <View style={[st.root, compact && st.compact]} accessibilityRole="alert">
      <Icone size={32} color="rgba(15,23,42,0.45)" strokeWidth={2} />
      <Text style={st.titre}>{titre}</Text>
      <Text style={st.texte}>{texte}</Text>
      <Pressable onPress={agir} disabled={essai} style={[st.bouton, essai && { opacity: 0.5 }]} accessibilityRole="button">
        {essai ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={st.boutonTexte}>{type === 'session' ? 'Se reconnecter' : 'Réessayer'}</Text>
        )}
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  compact: { flex: 0, paddingVertical: 28 },
  titre: { fontFamily: FontFamily.sansBold, fontSize: 18, lineHeight: 24, color: '#0F172A', textAlign: 'center', marginTop: 16 },
  texte: { fontFamily: FontFamily.sansRegular, fontSize: 14, lineHeight: 21, color: 'rgba(15,23,42,0.62)', textAlign: 'center', marginTop: 8 },
  bouton: {
    height: 52,
    minWidth: 180,
    maxWidth: 240,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 24,
  },
  boutonTexte: { fontFamily: FontFamily.sansBold, fontSize: 15, lineHeight: 20, color: '#FFFFFF' },
});
