import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { nativeWhiteInteractiveShadow } from '../../constants/theme';
import RoundGlassIconButton from '../shared/RoundGlassIconButton';

type Props = {
  children: React.ReactNode;
  contentStyle?: ViewStyle;
};

export default function RgpdBottomSheet({ children, contentStyle }: Props) {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => nav.goBack()} />
      <View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(14, insets.bottom + 10) },
          contentStyle,
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.closeRow}>
          <RoundGlassIconButton
            onPress={() => nav.goBack()}
            size={40}
            backgroundColor="rgba(255,255,255,0.96)"
            borderColor="rgba(15,23,42,0.12)"
            accessibilityLabel="Fermer"
          >
            <X size={18} color={Colors.textPrimary} strokeWidth={2} />
          </RoundGlassIconButton>
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.40)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Colors.pageBg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    ...nativeWhiteInteractiveShadow,
    overflow: 'hidden',
    paddingTop: 8,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15,23,42,0.20)',
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  closeRow: {
    position: 'absolute',
    right: 14,
    top: 10,
    zIndex: 10,
  },
});

