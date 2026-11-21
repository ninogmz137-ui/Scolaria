/**
 * PageRubrique — enveloppe d'une rubrique de Scolarité en page profonde (niveau 2, chrome 'none') :
 * en-tête « ‹ » + titre centré (DeepScreenHeader), sans top bar ni bottom bar (CLAUDE.md § Headers d'écran,
 * pages profondes). Retour aussi par glissement depuis le bord gauche (gestureEnabled de la pile).
 *
 * Les vues réutilisées (CarnetVue, ApprentissagesVue, Notes v7) lisent usePageProfonde() pour ajuster
 * leurs marges : plus de place réservée aux barres, seulement l'inset du bas.
 */

import { createContext, useContext, type ComponentType, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DeepScreenHeader } from '../../components/DeepScreenHeader';
import { C } from '../../constants/design';

const PageProfondeContext = createContext(false);

/** Vrai quand la vue est affichée dans une page profonde (pas de barres à réserver). */
export function usePageProfonde(): boolean {
  return useContext(PageProfondeContext);
}

export function PageRubrique({ titre, children }: { titre: string; children: ReactNode }) {
  const navigation = useNavigation<any>();
  return (
    <View style={st.root}>
      <DeepScreenHeader title={titre} onBack={() => navigation.goBack()} withTopInset />
      <PageProfondeContext.Provider value={true}>
        <View style={st.corps}>{children}</View>
      </PageProfondeContext.Provider>
    </View>
  );
}

/** Fabrique le composant d'écran d'une rubrique (pour <Stack.Screen component=…>). */
export function pageRubrique(titre: string, Contenu: ComponentType): ComponentType {
  function Page() {
    return (
      <PageRubrique titre={titre}>
        <Contenu />
      </PageRubrique>
    );
  }
  Page.displayName = `PageRubrique(${titre})`;
  return Page;
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  corps: { flex: 1 },
});
