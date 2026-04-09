import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, MessagesSquare, Sparkles as LucideSparkles, MessageCirclePlus, Send } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import WallpaperBackground from '../../components/WallpaperBackground';
import { FLOATING_TAB_BAR_HEIGHT } from '../../components/FloatingTabBar';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { useSchoolMode } from '../../contexts/SchoolModeContext';
import AddToDiscussionSheet from '../../components/chat/AddToDiscussionSheet';

type Conversation = {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string; // ISO
};

function keyForChild(childId: string) {
  return `@scolaria_aria_conversations:${childId}`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const dateStr = iso.split('T')[0];
  if (dateStr === today) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toISOString().split('T')[0]) return 'Hier';
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays <= 7) {
    return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function groupByPeriod(convs: Conversation[]) {
  const now = new Date();
  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Aujourd'hui", items: [] },
    { label: 'Cette semaine', items: [] },
    { label: 'Plus tôt', items: [] },
  ];
  for (const c of convs) {
    const d = new Date(c.updatedAt);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) groups[0].items.push(c);
    else if (diffDays <= 7) groups[1].items.push(c);
    else groups[2].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}

async function loadConversations(childId: string): Promise<Conversation[]> {
  const raw = await AsyncStorage.getItem(keyForChild(childId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => !!c?.id && !!c?.title)
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  } catch {
    return [];
  }
}

async function saveConversations(childId: string, convs: Conversation[]) {
  await AsyncStorage.setItem(keyForChild(childId), JSON.stringify(convs));
}

function makeNewConversationTitle(childFirstName: string) {
  return `Conseils pour ${childFirstName}`;
}

function makeSuggestions(childName: string, mode: string): string[] {
  if (mode === 'maternelle') {
    return [
      `🌈 Comment va ${childName} aujourd'hui ?`,
      '🎨 Activités de la semaine',
      '😊 Score de Joie',
      '🌱 Progrès récents',
    ];
  }
  if (mode === 'college' || mode === 'lycee') {
    return [
      '📊 Bilan de la semaine',
      '📝 Réviser pour le prochain contrôle',
      '📈 Évolution des notes',
      '🎯 Forces et axes d’amélioration',
    ];
  }
  return [
    '📊 Résumé de la semaine',
    '📝 Préparer un contrôle',
    '💡 Conseils pour progresser',
    `😊 Comment va ${childName} ?`,
  ];
}

export default function AriaHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { selectedChild } = useActiveChild();
  const { mode } = useSchoolMode();
  const childId = selectedChild?.id ?? '1';
  const childName = (selectedChild?.name ?? 'votre enfant').split(' ')[0];

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState('');
  const [input, setInput] = useState('');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const CTA_HEIGHT = 64;

  const suggestions = useMemo(() => makeSuggestions(childName, mode), [childName, mode]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const convs = await loadConversations(childId);
    setConversations(convs);
    setLoading(false);
  }, [childId]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const createConversation = useCallback(async (initialMessage?: string) => {
    const now = new Date().toISOString();
    const newConv: Conversation = {
      id: `c_${Date.now()}`,
      title: makeNewConversationTitle(childName),
      lastMessage: 'Nouvelle conversation',
      updatedAt: now,
    };
    const next = [newConv, ...conversations];
    setConversations(next);
    await saveConversations(childId, next);
    navigation.navigate('AriaConversation', { conversationId: newConv.id, title: newConv.title, initialMessage });
  }, [childId, childName, conversations, navigation]);

  const sendFromHome = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput('');
    await createConversation(trimmed);
  }, [createConversation]);

  // Drawer animation (Claude-like)
  const drawerTranslate = useRef(new Animated.Value(-320)).current;
  useEffect(() => {
    Animated.timing(drawerTranslate, {
      toValue: drawerOpen ? 0 : -320,
      duration: drawerOpen ? 220 : 180,
      useNativeDriver: true,
    }).start();
  }, [drawerOpen, drawerTranslate]);

  const filteredConversations = useMemo(() => {
    const q = drawerQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => (c.title || '').toLowerCase().includes(q));
  }, [conversations, drawerQuery]);

  return (
    <View style={styles.root}>
      <WallpaperBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Topbar (Claude-like) */}
        <View style={[styles.topbar, { paddingTop: insets.top + 10 }]}>
          <Pressable
            onPress={() => setDrawerOpen(true)}
            style={({ pressed }) => [styles.discussionsBtn, { opacity: pressed ? 0.75 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Discussions"
          >
            <MessagesSquare size={20} color="#0F172A" strokeWidth={2.2} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.topTitle}>
              Ar<Text style={styles.topTitleIA}>ia</Text>
            </Text>
            <Text style={styles.topSubtitle}>Étendu</Text>
          </View>

          <Pressable
            onPress={() => createConversation()}
            style={({ pressed }) => [styles.newChatBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Nouvelle discussion"
          >
            <View style={styles.newChatIconWrap}>
              <MessageCirclePlus size={20} color="#0F172A" strokeWidth={2.2} />
            </View>
          </Pressable>
        </View>

        {/* Hero */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 44,
            paddingBottom: FLOATING_TAB_BAR_HEIGHT + 120,
            paddingHorizontal: 18,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View style={styles.heroMark}>
              <Text style={styles.heroMarkText}>✦</Text>
            </View>
            <Text style={styles.heroTitle}>Comment puis-je t’aider ce soir ?</Text>
          </View>

          {/* Suggestions (compact chips, not full width) */}
          <View style={{ marginTop: 26 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
              {suggestions.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => sendFromHome(s)}
                  style={({ pressed }) => [styles.suggestionChip, pressed && { opacity: 0.86 }]}
                >
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Input pill bottom */}
        <View style={[styles.inputDock, { paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10 }]}>
          <View style={styles.inputRow}>
            <Pressable
              onPress={() => setAddSheetOpen(true)}
              style={({ pressed }) => [styles.plusBtn, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel="Ajouter à la discussion"
            >
              <Plus size={18} color="#64748B" strokeWidth={2.2} />
            </Pressable>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Demandez à Aria…"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              multiline
              maxLength={800}
              returnKeyType="send"
              onSubmitEditing={() => sendFromHome(input)}
            />
            <Pressable
              onPress={() => sendFromHome(input)}
              disabled={!input.trim()}
              style={({ pressed }) => [
                styles.sendBtn,
                input.trim() ? styles.sendBtnActive : null,
                pressed && input.trim() ? { opacity: 0.82 } : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Envoyer"
            >
              <Send size={18} color={input.trim() ? '#FFFFFF' : '#94A3B8'} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

      </KeyboardAvoidingView>

      <AddToDiscussionSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onPick={() => {}}
      />

      {/* Drawer overlay */}
      {drawerOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setDrawerOpen(false)}
          accessibilityLabel="Fermer les discussions"
        >
          <View style={styles.drawerOverlay} />
        </Pressable>
      )}
      <Animated.View
        pointerEvents={drawerOpen ? 'auto' : 'none'}
        style={[
          styles.drawer,
          { paddingTop: insets.top + 12, transform: [{ translateX: drawerTranslate }] },
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Discussions</Text>
          <Text style={styles.drawerSub} numberOfLines={1}>
            Aria
          </Text>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={drawerQuery}
            onChangeText={setDrawerQuery}
            placeholder="Rechercher"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.searchInput}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
          {loading ? (
            <View style={{ paddingHorizontal: 14, paddingTop: 18 }}>
              <Text style={styles.drawerEmptyTitle}>Chargement…</Text>
            </View>
          ) : filteredConversations.length === 0 ? (
            <View style={{ paddingHorizontal: 14, paddingTop: 18 }}>
              <Text style={styles.drawerEmptyTitle}>Aucune discussion</Text>
              <Text style={styles.drawerEmptyText}>
                Commence une conversation pour la retrouver ici.
              </Text>
            </View>
          ) : (
            filteredConversations.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('AriaConversation', { conversationId: c.id, title: c.title });
                }}
                style={({ pressed }) => [styles.drawerItem, pressed && { opacity: 0.82 }]}
              >
                <View style={styles.drawerAvatar}>
                  <Text style={styles.drawerAvatarText}>✦</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.drawerItemTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.drawerItemPreview} numberOfLines={1}>{c.lastMessage}</Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },

  topbar: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 8,
  },
  discussionsBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14 },
      android: { elevation: 0 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14 },
    }),
  },
  topTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  topTitleIA: { color: '#7C3AED' },
  topSubtitle: {
    marginTop: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#94A3B8',
  },
  sparkleCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sparkleCircleText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  newChatBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 16 },
      android: { elevation: 0 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 16 },
    }),
  },
  newChatIconWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingTop: 18,
  },
  heroMark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 18 },
      android: { elevation: 0 },
    }),
  },
  heroMarkText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: '#7C3AED',
  },
  heroTitle: {
    marginTop: 18,
    fontFamily: FontFamily.displayBold,
    fontSize: 28,
    color: '#0F172A',
    letterSpacing: -0.6,
    textAlign: 'center',
  },

  inputDock: { paddingHorizontal: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 28,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 20 },
      android: { elevation: 0 },
    }),
  },
  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    marginBottom: 2,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: '#0F172A',
    maxHeight: 120,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    marginBottom: 2,
  },
  sendBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },

  // FAB removed: "nouvelle discussion" lives in topbar now.

  // Drawer (shared styling with conversation)
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,12,22,0.40)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 320,
    backgroundColor: 'rgba(16,20,38,0.92)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  drawerHeader: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  drawerTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  drawerSub: {
    marginTop: 4,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  searchRow: {
    marginHorizontal: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  drawerItem: {
    marginHorizontal: 10,
    marginBottom: 6,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  drawerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,58,237,0.35)',
  },
  drawerAvatarText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  drawerItemTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  drawerItemPreview: {
    marginTop: 2,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  drawerEmptyTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  drawerEmptyText: {
    marginTop: 6,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.55)',
  },
});

