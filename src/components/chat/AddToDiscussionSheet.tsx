import { useCallback } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Camera, Image as ImageIcon, FileText, X } from 'lucide-react-native';
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
  const BlurView = Platform.OS === 'web' ? null : (require('expo-blur').BlurView as React.ComponentType<any>);

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.22)' }]} />
        ) : (
          <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
        )}

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Ajouter à la discussion</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}>
              <X size={18} color="#0F172A" strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.card}>
            <Pressable onPress={pickFromCamera} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
              <Camera size={20} color="#0F172A" strokeWidth={2} />
              <Text style={styles.rowLabel}>Caméra</Text>
            </Pressable>
            <View style={styles.sep} />
            <Pressable onPress={pickFromPhotos} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
              <ImageIcon size={20} color="#0F172A" strokeWidth={2} />
              <Text style={styles.rowLabel}>Photos</Text>
            </Pressable>
            <View style={styles.sep} />
            <Pressable onPress={pickFile} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}>
              <FileText size={20} color="#0F172A" strokeWidth={2} />
              <Text style={styles.rowLabel}>Fichiers</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  title: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#FFFFFF',
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
  card: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 28 },
      android: { elevation: 0 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 28 },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: '#0F172A',
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15,23,42,0.08)',
    marginLeft: 48,
  },
});

