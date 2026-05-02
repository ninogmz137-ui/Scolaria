import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlignJustify, ChevronDown, FileText, MessageCircle, PenLine, Search, MoreHorizontal, School, Plus } from 'lucide-react-native';
import { SCREEN_BACKGROUND } from '../constants/colors';
import { FontFamily } from '../hooks/useSolariaFonts';

type ConversationRow = {
  id: string;
  nom: string;
  matiere: string;
  avatar: string;
  avatarBg: string;
  preview: string;
  heure: string;
  nonLu: boolean;
};

const DEMO_CONVERSATIONS: ConversationRow[] = [
  {
    id: '1',
    nom: 'Mme Dupont',
    matiere: 'Français',
    avatar: 'MD',
    avatarBg: '#1A2340',
    preview: 'Le brevet blanc est fixé au 2 mai…',
    heure: '09:41',
    nonLu: true,
  },
  {
    id: '2',
    nom: 'M. Garcia',
    matiere: 'Maths',
    avatar: 'MG',
    avatarBg: '#4338CA',
    preview: 'Je vous envoie une fiche…',
    heure: '08:15',
    nonLu: true,
  },
  {
    id: '3',
    nom: 'M. Martin',
    matiere: 'Histoire',
    avatar: 'MT',
    avatarBg: '#0F766E',
    preview: 'Emma a eu 13/20, encourageant !',
    heure: '10 avr.',
    nonLu: false,
  },
];

function SectionLabel({ label, isFirst }: { label: string; isFirst?: boolean }) {
  return (
    <Text style={[styles.sectionLabel, isFirst && { paddingTop: 10 }]}>
      {label.toUpperCase()}
    </Text>
  );
}

export default function MessagesScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const buckets = useMemo(() => {
    const today = DEMO_CONVERSATIONS.filter((c) => c.heure.includes(':'));
    const earlier = DEMO_CONVERSATIONS.filter((c) => !c.heure.includes(':'));
    return [
      { label: "Aujourd'hui", items: today },
      { label: 'Plus tôt', items: earlier },
    ];
  }, []);

  return (
    <View style={styles.page}>
      <View style={styles.toolbar}>
        <View style={styles.searchPill}>
          <Search size={13} color="rgba(15,23,42,0.35)" strokeWidth={2} />
          <TextInput
            placeholder="Rechercher…"
            placeholderTextColor="rgba(15,23,42,0.35)"
            style={styles.searchInput}
          />
        </View>

        <Pressable style={styles.filterPill} accessibilityRole="button" accessibilityLabel="Filtrer">
          <Text style={styles.filterText}>Tout</Text>
          <ChevronDown size={11} color="rgba(15,23,42,0.55)" strokeWidth={2.5} />
        </Pressable>

        <Pressable style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Menu">
          <AlignJustify size={14} color="rgba(15,23,42,0.55)" strokeWidth={2.2} />
        </Pressable>
        <Pressable style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Actions">
          <MoreHorizontal size={14} color="rgba(15,23,42,0.55)" strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {buckets.map((bucket, idx) =>
          bucket.items.length ? (
            <View key={bucket.label}>
              <SectionLabel label={bucket.label} isFirst={idx === 0} />
              <View>
                {bucket.items.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => navigation.navigate('ConversationScreen', { conversation: c })}
                    style={({ pressed }) => [
                      styles.row,
                      c.nonLu && styles.rowUnread,
                      pressed && { backgroundColor: 'rgba(15,23,42,0.03)' },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Conversation avec ${c.nom}`}
                  >
                    <View style={[styles.avatar, { backgroundColor: c.avatarBg }]}>
                      <Text style={styles.avatarText}>{c.avatar}</Text>
                    </View>

                    <View style={styles.rowContent}>
                      <View style={styles.rowTopLine}>
                        <Text style={styles.nameText} numberOfLines={1}>
                          {c.nom}
                        </Text>
                        <Text style={styles.timeText}>{c.heure}</Text>
                      </View>
                      <Text style={styles.previewText} numberOfLines={1} ellipsizeMode="tail">
                        {c.preview}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null,
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: 72 + (insets.bottom > 0 ? Math.max(0, insets.bottom - 10) : 0) },
          pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
        ]}
        onPress={() => setNewMessageOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Nouveau message"
      >
        <View style={styles.fabInner}>
          <MessageCircle size={20} color="#FFFFFF" strokeWidth={2} />
          <View style={styles.fabPlus}>
            <Plus size={14} color="#FFFFFF" strokeWidth={3} />
          </View>
        </View>
      </Pressable>

      <Modal visible={newMessageOpen} transparent animationType="fade" onRequestClose={() => setNewMessageOpen(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setNewMessageOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Nouveau message</Text>

            <Pressable style={styles.sheetRow} onPress={() => setNewMessageOpen(false)} accessibilityRole="button">
              <PenLine size={16} color="rgba(15,23,42,0.70)" strokeWidth={2} />
              <Text style={styles.sheetRowText}>Message à un enseignant</Text>
            </Pressable>
            <Pressable style={styles.sheetRow} onPress={() => setNewMessageOpen(false)} accessibilityRole="button">
              <School size={16} color="rgba(15,23,42,0.70)" strokeWidth={2} />
              <Text style={styles.sheetRowText}>Message à la direction</Text>
            </Pressable>
            <Pressable
              style={[styles.sheetRow, { borderBottomWidth: 0 }]}
              onPress={() => setNewMessageOpen(false)}
              accessibilityRole="button"
            >
              <FileText size={16} color="rgba(15,23,42,0.70)" strokeWidth={2} />
              <Text style={styles.sheetRowText}>Justifier une absence</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const SHADOW = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
  },
  android: { elevation: 10 },
  default: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
  },
});

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  toolbar: {
    flexDirection: 'row',
    columnGap: 8,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  searchPill: {
    flex: 1,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.08)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: 'rgba(15,23,42,0.85)',
  },
  filterPill: {
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.08)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },
  filterText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: 'rgba(15,23,42,0.55)',
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 7.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#0F172A',
    opacity: 0.28,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  rowUnread: {
    borderLeftWidth: 2.5,
    borderLeftColor: '#4338CA',
    paddingLeft: 11.5,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    columnGap: 10,
  },
  nameText: {
    flex: 1,
    minWidth: 0,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  timeText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 10,
    color: 'rgba(15,23,42,0.30)',
  },
  previewText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: 'rgba(15,23,42,0.55)',
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 14,
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    ...SHADOW,
  },
  fabInner: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPlus: {
    position: 'absolute',
    right: 10,
    bottom: 10,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 12,
    paddingBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 22,
      },
      android: { elevation: 16 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 22,
      },
    }),
  },
  sheetHandle: {
    width: 34,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.14)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.05)',
    marginBottom: 2,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  sheetRowText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: '#0F172A',
    letterSpacing: -0.15,
  },
});

