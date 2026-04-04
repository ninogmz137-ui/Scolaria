/**
 * TopbarScrollContext — Provides a scroll callback from AccueilScreen
 * to TabNavigator so the topbar can animate hide/show on scroll.
 */

import { createContext, useContext } from 'react';

interface TopbarScrollContextValue {
  /** Called by AccueilScreen with the current scrollY offset */
  onScroll: (y: number) => void;
}

export const TopbarScrollContext = createContext<TopbarScrollContextValue>({
  onScroll: () => {},
});

export function useTopbarScroll(): TopbarScrollContextValue {
  return useContext(TopbarScrollContext);
}
