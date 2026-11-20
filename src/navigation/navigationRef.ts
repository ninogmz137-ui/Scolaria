/**
 * Référence unique du NavigationContainer (App.tsx).
 *
 * `navigationRef.goBack()` agit sur le navigateur FOCALISÉ le plus profond (la pile de l'onglet
 * courant), contrairement à `navigation.dispatch(goBack())` depuis l'écran racine, qui laissait
 * le navigateur d'onglets revenir à l'onglet précédent au lieu de dépiler la page profonde.
 */
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

// Développement uniquement : permet de piloter la navigation depuis les tests web (console).
if (__DEV__) (globalThis as any).__navRef = navigationRef;
