import { useCallback } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { SlideInUp } from 'react-native-reanimated';
import { Camera, Image as ImageIcon, FileUp, X } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';

export type AddAttachment = { kind: 'camera' | 'photo' | 'file'; uri: string; name?: string | null };

export default function AddToDiscussionSheet({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (a: AddAttachment) => void;
}) {
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
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.22)' }]} />
        ) : (
          <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
        )}

        <Animated.View entering={SlideInUp.duration(280)} style={styles.sheetWrap}>
          <View style={styles.header}>
            <Text style={styles.title}>Ajouter à la discussion</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}>
              <X size={18} color="#0F172A" strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.optionsRow}>
            <Pressable
              onPress={pickFromCamera}
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.85 }]}
            >
              <Camera size={22} color="#0F172A" strokeWidth={2} />
              <Text style={styles.optionLabel}>Caméra</Text>
            </Pressable>
            <Pressable
              onPress={pickFromPhotos}
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.85 }]}
            >
              <ImageIcon size={22} color="#0F172A" strokeWidth={2} />
              <Text style={styles.optionLabel}>Photos</Text>
            </Pressable>
            <Pressable
              onPress={pickFile}
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.85 }]}
            >
              <FileUp size={22} color="#0F172A" strokeWidth={2} />
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
  sheetWrap: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  title: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  option: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 10,
  },
  optionLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: '#0F172A',
    textAlign: 'center',
  },
});
