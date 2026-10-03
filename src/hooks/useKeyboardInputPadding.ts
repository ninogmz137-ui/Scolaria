/**
 * useKeyboardInputPadding — dynamic bottom padding for the composer input bar.
 *
 * When the keyboard is closed, we reserve space for the bottom bar.
 * When the keyboard is open, we collapse to a minimal gap so the input sits
 * just above the keyboard (Android's adjustResize + iOS KAV handle the lift).
 *
 * Fixes the Android bug where `behavior='height'` + heavy paddingBottom caused
 * the input bar to either be masked by the keyboard or push itself offscreen.
 */

import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';

const KEYBOARD_OPEN_GAP = 12;

export function useKeyboardInputPadding(insetsBottom: number): number {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return keyboardOpen ? KEYBOARD_OPEN_GAP : getBottomBarScrollPadding(insetsBottom);
}
