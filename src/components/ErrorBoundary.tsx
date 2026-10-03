/**
 * ErrorBoundary — filet de sécurité : une erreur de rendu n'affiche JAMAIS un écran blanc.
 * Message clair en français + « Réessayer » (remonte l'arbre). Les détails techniques (pile) ne
 * s'affichent qu'en développement (__DEV__), jamais à une famille.
 * `nom` = écran protégé : une panne d'un onglet laisse les autres (et la navigation) utilisables.
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Pressable, Text } from './ui';

type Etat = { error: Error | null; info: React.ErrorInfo | null; essai: number };

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode; nom?: string; compact?: boolean }, Etat> {
  state: Etat = { error: null, info: null, essai: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Aucune donnée personnelle dans le message d'erreur : nom du composant et type seulement.
    if (__DEV__) console.error(error, info);
    else console.warn(`[erreur de rendu] ${this.props.nom ?? 'app'} : ${error?.name ?? 'Error'}`);
    this.setState({ error, info });
  }

  reessayer = () => this.setState((s) => ({ error: null, info: null, essai: s.essai + 1 }));

  render() {
    const { error, info, essai } = this.state;
    if (!error) return <React.Fragment key={essai}>{this.props.children}</React.Fragment>;
    return <Secours compact={this.props.compact} error={error} info={info} onReessayer={this.reessayer} />;
  }
}

function Secours({ error, info, onReessayer, compact }: { error: Error; info: React.ErrorInfo | null; onReessayer: () => void; compact?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.root, { paddingTop: compact ? 0 : insets.top + 48, paddingBottom: insets.bottom + 24 }]} accessibilityRole="alert">
      <Text style={st.titre}>Un souci est survenu</Text>
      <Text style={st.texte}>
        Cet écran n’a pas pu s’afficher. Vos données sont intactes. Réessayez ; si cela continue, fermez puis rouvrez l’application.
      </Text>
      <Pressable onPress={onReessayer} style={st.bouton} accessibilityRole="button">
        <Text style={st.boutonTexte}>Réessayer</Text>
      </Pressable>
      {__DEV__ ? (
        <ScrollView style={st.dev}>
          <Text style={st.mono}>{String(error.stack || error.message)}</Text>
          {info?.componentStack ? <Text style={st.mono}>{info.componentStack}</Text> : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, backgroundColor: Colors.pageBg },
  titre: { fontFamily: FontFamily.sansBold, fontSize: 20, lineHeight: 26, color: '#0F172A', textAlign: 'center' },
  texte: { fontFamily: FontFamily.sansRegular, fontSize: 15, lineHeight: 22, color: 'rgba(15,23,42,0.62)', textAlign: 'center', marginTop: 12 },
  bouton: {
    height: 52,
    minWidth: 180,
    maxWidth: 240,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  boutonTexte: { fontFamily: FontFamily.sansBold, fontSize: 15, lineHeight: 20, color: '#FFFFFF' },
  dev: { maxHeight: 220, marginTop: 20, alignSelf: 'stretch' },
  mono: { fontFamily: FontFamily.sansRegular, fontSize: 11, lineHeight: 16, color: 'rgba(15,23,42,0.55)' },
});
