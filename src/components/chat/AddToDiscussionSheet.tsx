import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Camera, Image as ImageIcon, FileUp, X } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';

export type AddAttachment = { kind: 'camera' | 'photo' | 'file'; uri: string; name?: string | null };

const TIMING_EASE = Easing.out(Easing.ease);

export default function AddToDiscussionSheet({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (a: AddAttachment) => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const translateY = useSharedValue(300);
  const [modalVisible, setModalVisible] = useState(false);

  const hiddenY = useMemo(
    () => Math.max(windowHeight * 0.45, 320),
    [windowHeight],
  );

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      translateY.value = hiddenY;
      translateY.value = withTiming(0, { duration: 220, easing: TIMING_EASE });
    }
  }, [visible, hiddenY]);

  useEffect(() => {
    if (!visible && modalVisible) {
      translateY.value = withTiming(hiddenY, { duration: 180, easing: TIMING_EASE }, (finished) => {
        if (finished) {
          runOnJS(setModalVisible)(false);
        }
      });
    }
  }, [visible, modalVisible, hiddenY]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderMove: (_, g) => {
          translateY.value = Math.max(0, g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 100 || g.vy > 0.8) {
            onClose();
          } else {
            translateY.value = withTiming(0, { duration: 180, easing: TIMING_EASE });
          }
        },
        onPanResponderTerminate: () => {
          translateY.value = withTiming(0, { duration: 180, easing: TIMING_EASE });
        },
      }),
    [onClose, translateY],
  );

  const pickFromCamera = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const ImagePicker = await import('expo-image-picker');
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled && res.assets?.[0]?.uri) {
      onPick({ kind: 'camera', uri: res.assets[0].uri, name: res.assets[0].fileName ?? null });
      onClose();
    }
  }, [onClose, onPick]);

  const pickFromPhotos = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const ImagePicker = await import('expo-image-picker');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.9, allowsMultipleSelection: false });
    if (!res.canceled && res.assets?.[0]?.uri) {
      onPick({ kind: 'photo', uri: res.assets[0].uri, name: res.assets[0].fileName ?? null });
      onClose();
    }
  }, [onClose, onPick]);

  const pickFile = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const DocumentPicker = await import('expo-document-picker');
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (res.canceled) return;
    onPick({ kind: 'file', uri: res.assets[0].uri, name: res.assets[0].name ?? null });
    onClose();
  }, [onClose, onPick]);

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.22)' }]} />
        ) : (
          <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
        )}

        <Animated.View
          style={[
            styles.sheet,
            sheetAnimatedStyle,
            {
              paddingBottom: insets.bottom + 16,
              zIndex: 100,
            },
          ]}
        >
          <View style={styles.handleWrap} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Ajouter à la discussion</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}>
              <X size={18} color="#0F172A" strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.optionsList}>
            <Pressable
              onPress={pickFromCamera}
              style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.iconCircle}>
                <Camera size={22} color="#0F172A" strokeWidth={2} />
              </View>
              <Text style={styles.optionLabel}>Caméra</Text>
            </Pressable>
            <View style={styles.separator} />
            <Pressable
              onPress={pickFromPhotos}
              style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.iconCircle}>
                <ImageIcon size={22} color="#0F172A" strokeWidth={2} />
              </View>
              <Text style={styles.optionLabel}>Photos</Text>
            </Pressable>
            <View style={styles.separator} />
            <Pressable
              onPress={pickFile}
              style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.iconCircle}>
                <FileUp size={22} color="#0F172A" strokeWidth={2} />
              </View>
              <Text style={styles.optionLabel}>Fichiers</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
    }),
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15,23,42,0.18)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    color: '#0F172A',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    marginTop: 4,
  },
  optionRow: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: '#0F172A',
    marginLeft: 14,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F5',
  },
});
