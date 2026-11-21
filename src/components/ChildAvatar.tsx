/**
 * ChildAvatar — avatar d'un enfant : initiale(s) du prénom sur SA couleur (children.color).
 * Un seul composant pour la top bar, le sélecteur d'enfant, Famille & paramètres et le profil.
 * Jamais d'emoji. Photo de l'enfant (M35, URL signée d'1 h) si elle existe, sinon l'initiale : même règle partout
 * où l'enfant apparaît (top bar, sélecteur d'enfant, Famille & paramètres, profil).
 */

import { Image, View, StyleSheet } from 'react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { usePhotoUrl } from '../hooks/usePhotoUrl';
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
  const { children, erreur } = useActiveChild();
  // Chargement des enfants en échec : ni « + » ni « Aucun enfant » (ce serait un faux vide) : un « … » neutre.
  const initials = child ? getChildInitials(child.name, children.map((c) => c.name)) : erreur ? '…' : '+';
  const bg = child ? child.color ?? DEFAULT_CHILD_COLOR : 'rgba(15,23,42,0.12)';
  const photo = usePhotoUrl(child);

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
      accessibilityLabel={child ? `Avatar ${de(child.name)}` : erreur ? 'Enfants non chargés' : 'Aucun enfant'}
    >
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          style={[
            st.initials,
            { fontSize: Math.round(size * 0.38), color: child ? '#FFFFFF' : '#0F172A' },
          ]}
        >
          {initials}
        </Text>
      )}
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
