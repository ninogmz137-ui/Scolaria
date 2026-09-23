import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, Settings, Heart, GraduationCap,
         Shield, Info, Palette, Bell, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text, TextInput, Pressable } from '../components/ui';

const QUICK_LINKS = [
  { id: 'profil',    icon: User,          label: 'Profil élève',           screen: 'ProfilEnfant',          tab: 'Accueil' },
  { id: 'parcours',  icon: GraduationCap, label: 'Mon Parcours',           screen: 'MonParcours',           tab: 'Accueil' },
  { id: 'bienetre',  icon: Heart,         label: 'Bien-être & Ressenti',   screen: 'BienEtreScreen',        tab: 'Accueil' },
  { id: 'reglages',  icon: Settings,      label: 'Réglages',               screen: 'ReglagesScreen',        tab: 'Accueil' },
  { id: 'notifs',    icon: Bell,          label: 'Notifications',          screen: 'NotificationsSettings', tab: 'Accueil' },
  { id: 'wallpaper', icon: Palette,       label: "Fond d'écran",           screen: 'WallpaperPicker',       tab: 'Accueil' },
  { id: 'rgpd',      icon: Shield,        label: 'RGPD & Confidentialité', screen: 'RGPDScreen',            tab: 'Accueil' },
  { id: 'apropos',   icon: Info,          label: 'À propos',               screen: 'APropos',               tab: 'Accueil' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function QuickSearchScreen({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() =>
    query.trim()
      ? QUICK_LINKS.filter(l => l.label.toLowerCase().includes(query.toLowerCase()))
      : QUICK_LINKS,
  [query]);

  const handlePress = (item: typeof QUICK_LINKS[0]) => {
    onClose();
    setQuery('');
    setTimeout(() => {
      navigation.navigate('MainPager', {
        screen: item.tab,
        params: { screen: item.screen },
      });
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => { onClose(); setQuery(''); }}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { onClose(); setQuery(''); }} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.searchRow}>
            <Search size={18} color="rgba(15,23,42,0.40)" strokeWidth={2} />
            <TextInput
              style={[styles.input, { marginLeft: 8 }]}
              placeholder="Rechercher dans Scolaria…"
              placeholderTextColor="rgba(15,23,42,0.35)"
              value={query}
              onChangeText={setQuery}
              autoFocus
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8} style={{ marginLeft: 8 }}>
                <X size={16} color="rgba(15,23,42,0.40)" strokeWidth={2} />
              </Pressable>
            )}
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {filtered.length === 0 ? (
              <Text style={styles.empty}>Aucun résultat</Text>
            ) : (
              filtered.map(item => {
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handlePress(item)}
                    style={({ pressed }) => [styles.row, pressed && { backgroundColor: 'rgba(15,23,42,0.04)' }]}
                  >
                    <View style={styles.iconWrap}>
                      <Icon size={18} color="#0F172A" strokeWidth={1.8} />
                    </View>
                    <Text style={styles.label}>{item.label}</Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#F2F1EE',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: '75%',
    ...Platform.select({
      android: { elevation: 20 },
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 } },
    }),
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(15,23,42,0.14)',
    alignSelf: 'center', marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(15,23,42,0.07)',
  },
  input: {
    flex: 1, fontFamily: FontFamily.sansRegular,
    fontSize: 15, color: '#0F172A',
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.05)',
    gap: 12,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)',
  },
  label: {
    fontFamily: FontFamily.sansMedium, fontSize: 15, color: '#0F172A',
  },
  empty: {
    fontFamily: FontFamily.sansRegular, fontSize: 14,
    color: 'rgba(15,23,42,0.35)', textAlign: 'center', paddingVertical: 32,
  },
});
