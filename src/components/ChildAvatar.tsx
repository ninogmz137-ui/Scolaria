/**
 * ChildAvatar — avatar d'un enfant : initiale(s) du prénom sur SA couleur (children.color).
 * Un seul composant pour la top bar, le sélecteur d'enfant, Famille & paramètres et le profil.
 * Jamais d'emoji ni de photo (décision B2.6).
 */

import { View, StyleSheet } from 'react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text } from './ui';
import { useActiveChild, DEFAULT_CHILD_COLOR, type Child } from '../contexts/ActiveChildContext';
import { getChildInitials } from '../utils/childInitials';
import { de } from '../utils/francais';

interface ChildAvatarProps {
  /** null : aucun enfant → « + » neutre. */
  child: Child | null;
  size?: number;
  /** Bordure fine (top bar) ; sa couleur dépend du fond sur lequel l'avatar est posé. */
  borderColor?: string;
}

export default function ChildAvatar({ child, size = 36, borderColor }: ChildAvatarProps) {
  const { children } = useActiveChild();
  const initials = child ? getChildInitials(child.name, children.map((c) => c.name)) : '+';
  const bg = child ? child.color ?? DEFAULT_CHILD_COLOR : 'rgba(15,23,42,0.12)';

  return (
    <View
      style={[
        st.circle,
        {
          width: size,
          height: size,
          backgroundColor: bg,
          borderWidth: borderColor ? 2 : 0,
          borderColor: borderColor ?? 'transparent',
        },
      ]}
      accessibilityLabel={child ? `Avatar ${de(child.name)}` : 'Aucun enfant'}
    >
      <Text
        style={[
          st.initials,
          { fontSize: Math.round(size * 0.38), color: child ? '#FFFFFF' : '#0F172A' },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  circle: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontFamily: FontFamily.sansBold,
  },
});
