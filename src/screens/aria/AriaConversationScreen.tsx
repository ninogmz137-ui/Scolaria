import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MessagesSquare, Search, Plus, MessageCirclePlus, Send } from 'lucide-react-native';
import { Sparkles as SparklesIcon } from '@getpapillon/papicons';
import WallpaperBackground from '../../components/WallpaperBackground';
import { FLOATING_TAB_BAR_HEIGHT } from '../../components/FloatingTabBar';
import ChatBubble, { type Message } from '../../components/chat/ChatBubble';
import { sendToAria, type ClaudeMessage } from '../../services/ariaApi';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { useSchoolMode } from '../../contexts/SchoolModeContext';
import AddToDiscussionSheet from '../../components/chat/AddToDiscussionSheet';

type RouteParams = {
  conversationId: string;
  title?: string;
  initialMessage?: string;
};

type Conversation = {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
};

function conversationsKey(childId: string) {
  return `@scolaria_aria_conversations:${childId}`;
}

function messagesKey(childId: string, conversationId: string) {
  return `@scolaria_aria_messages:${childId}:${conversationId}`;
}

function historyKey(childId: string, conversationId: string) {
  return `@scolaria_aria_history:${childId}:${conversationId}`;
}

function nowTime() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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

export default function AriaConversationScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { selectedChild } = useActiveChild();
  const { mode } = useSchoolMode();

  const childId = selectedChild?.id ?? '1';
  const childFirstName = (selectedChild?.name ?? 'votre enfant').split(' ')[0];

  const { conversationId, title, initialMessage } = (route.params ?? {}) as RouteParams;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  // Claude history (kept separate from UI messages)
  const historyRef = useRef<ClaudeMessage[]>([]);

  const suggestions = useMemo(() => makeSuggestions(childFirstName, mode), [childFirstName, mode]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const loadPersisted = useCallback(async () => {
    // Load conversation list (drawer)
    const rawConvs = await AsyncStorage.getItem(conversationsKey(childId));
    if (rawConvs) {
      try {
        const parsed = JSON.parse(rawConvs) as Conversation[];
        if (Array.isArray(parsed)) {
          setConversations(
            parsed
              .filter((c) => !!c?.id && !!c?.title)
              .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
          );
        }
      } catch {}
    }

    const rawMsgs = await AsyncStorage.getItem(messagesKey(childId, conversationId));
    const rawHist = await AsyncStorage.getItem(historyKey(childId, conversationId));
    if (rawMsgs) {
      try {
        const parsed = JSON.parse(rawMsgs) as Message[];
        if (Array.isArray(parsed)) setMessages(parsed);
      } catch {}
    }
    if (rawHist) {
      try {
        const parsed = JSON.parse(rawHist) as ClaudeMessage[];
        if (Array.isArray(parsed)) historyRef.current = parsed;
      } catch {}
    }
  }, [childId, conversationId]);

  useEffect(() => {
    loadPersisted().catch(() => {});
  }, [loadPersisted]);

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, scrollToEnd]);

  const persist = useCallback(async (nextMessages: Message[], nextHistory: ClaudeMessage[]) => {
    await AsyncStorage.multiSet([
      [messagesKey(childId, conversationId), JSON.stringify(nextMessages)],
      [historyKey(childId, conversationId), JSON.stringify(nextHistory)],
    ]);
  }, [childId, conversationId]);

  const updateConversationPreview = useCallback(async (lastMessage: string) => {
    try {
      const raw = await AsyncStorage.getItem(conversationsKey(childId));
      const parsed = raw ? (JSON.parse(raw) as Conversation[]) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const now = new Date().toISOString();
      const next = list.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: lastMessage.slice(0, 120), updatedAt: now }
          : c,
      );
      await AsyncStorage.setItem(conversationsKey(childId), JSON.stringify(next));
      setConversations(
        next
          .filter((c) => !!c?.id && !!c?.title)
          .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
      );
    } catch {}
  }, [childId, conversationId]);

  const sendMessage = useCallback(async (textOverride?: string) => {
    const trimmed = (textOverride ?? input).trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      text: trimmed,
      sender: 'parent',
      timestamp: nowTime(),
    };

    const nextUI = [...messages, userMsg];
    setMessages(nextUI);
    setInput('');
    setIsTyping(true);
    scrollToEnd();

    try {
      const response = await sendToAria(trimmed, historyRef.current, childId);

      const nextHistory: ClaudeMessage[] = [
        ...historyRef.current,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: response },
      ].slice(-20);
      historyRef.current = nextHistory;

      const ariaMsg: Message = {
        id: `a_${Date.now() + 1}`,
        text: response,
        sender: 'aria',
        timestamp: nowTime(),
      };

      const finalUI = [...nextUI, ariaMsg];
      setMessages(finalUI);
      await persist(finalUI, nextHistory);
      await updateConversationPreview(response);
    } catch {
      const errMsg: Message = {
        id: `e_${Date.now() + 1}`,
        text: '📡 Impossible de contacter Aria pour le moment. Réessaie dans quelques instants.',
        sender: 'aria',
        timestamp: nowTime(),
      };
      const finalUI = [...nextUI, errMsg];
      setMessages(finalUI);
      await persist(finalUI, historyRef.current);
      await updateConversationPreview(errMsg.text);
    } finally {
      setIsTyping(false);
      scrollToEnd();
    }
  }, [childId, input, isTyping, messages, persist, scrollToEnd, updateConversationPreview]);

  // If we arrive from AriaHome with an initial message, auto-send it once.
  const didAutoSendRef = useRef(false);
  useEffect(() => {
    if (!initialMessage) return;
    if (didAutoSendRef.current) return;
    if (messages.length > 0) return;
    didAutoSendRef.current = true;
    setTimeout(() => {
      sendMessage(initialMessage);
    }, 60);
  }, [initialMessage, messages.length, sendMessage]);

  const typingMessage: Message = useMemo(() => ({
    id: 'typing',
    text: '',
    sender: 'aria',
    timestamp: '',
  }), []);

  const topPad = insets.top + 10;

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

  const createConversationAndNavigate = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(conversationsKey(childId));
      const parsed = raw ? (JSON.parse(raw) as Conversation[]) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const now = new Date().toISOString();
      const newConv: Conversation = {
        id: `c_${Date.now()}`,
        title: `Conseils pour ${childFirstName}`,
        lastMessage: 'Nouvelle conversation',
        updatedAt: now,
      };
      const next = [newConv, ...list];
      await AsyncStorage.setItem(conversationsKey(childId), JSON.stringify(next));
      setConversations(
        next
          .filter((c) => !!c?.id && !!c?.title)
          .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
      );
      navigation.navigate('AriaConversation', { conversationId: newConv.id, title: newConv.title });
    } catch {}
  }, [childFirstName, childId, navigation]);

  return (
    <View style={styles.root}>
      <WallpaperBackground />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Topbar */}
        <View style={[styles.topbar, { paddingTop: topPad }]}>
          <Pressable
            onPress={() => setDrawerOpen(true)}
            style={({ pressed }) => [styles.discussionsBtn, { opacity: pressed ? 0.75 : 1 }]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Discussions"
          >
            <MessagesSquare size={20} color="#0F172A" strokeWidth={2.2} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 10 }}>
            <Text style={styles.topTitle}>
              Ar<Text style={styles.topTitleIA}>ia</Text>
            </Text>
            <Text style={styles.topSubtitle} numberOfLines={1}>
              {title || `Conversation · ${childFirstName}`}
            </Text>
          </View>

          <Pressable
            onPress={createConversationAndNavigate}
            style={({ pressed }) => [styles.newChatBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Nouvelle discussion"
          >
            <View style={styles.newChatIconWrap}>
              <MessageCirclePlus size={20} color="#0F172A" strokeWidth={2.2} />
            </View>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 12,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            messages.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <SparklesIcon size={22} color="#7C3AED" />
                </View>
                <Text style={styles.emptyTitle}>Bonjour !</Text>
                <Text style={styles.emptyText}>
                  Posez une question sur {childFirstName}. Aria peut aider à comprendre les notes, préparer un contrôle, ou proposer un plan de révision.
                </Text>

                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={suggestions}
                  keyExtractor={(s) => s}
                  contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12 }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => sendMessage(item)}
                      disabled={isTyping}
                      style={({ pressed }) => [
                        styles.suggestionChip,
                        { opacity: pressed ? 0.86 : 1 },
                        isTyping && { opacity: 0.5 },
                      ]}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </Pressable>
                  )}
                />
              </View>
            ) : null
          }
          ListFooterComponent={isTyping ? <ChatBubble message={typingMessage} isTyping /> : null}
          onContentSizeChange={() => scrollToEnd()}
        />

        {/* Input */}
        <View style={[styles.inputWrap, { paddingBottom: FLOATING_TAB_BAR_HEIGHT + 8 }]}>
          <View style={styles.inputRow}>
            <Pressable
              onPress={() => setAddSheetOpen(true)}
              style={({ pressed }) => [styles.plusBtn, pressed && { opacity: 0.82 }]}
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
              editable={!isTyping}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage()}
            />
            <Pressable
              onPress={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              style={({ pressed }) => [
                styles.sendBtn,
                input.trim() ? styles.sendBtnActive : null,
                pressed && input.trim() && !isTyping ? { opacity: 0.82 } : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Envoyer"
            >
              <Send
                size={18}
                color={input.trim() ? '#FFFFFF' : '#94A3B8'}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <AddToDiscussionSheet visible={addSheetOpen} onClose={() => setAddSheetOpen(false)} onPick={() => {}} />

      {/* Left drawer — conversations history (Claude-like) */}
      {drawerOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setDrawerOpen(false)}
          accessibilityLabel="Fermer l'historique"
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
          <Text style={styles.drawerTitle}>Conversations</Text>
          <Text style={styles.drawerSub} numberOfLines={1}>
            Aria
          </Text>
        </View>

        <View style={styles.searchRow}>
          <Search size={16} color="rgba(255,255,255,0.55)" strokeWidth={2} />
          <TextInput
            value={drawerQuery}
            onChangeText={setDrawerQuery}
            placeholder="Rechercher"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          {filteredConversations.length === 0 ? (
            <View style={{ paddingHorizontal: 14, paddingTop: 18 }}>
              <Text style={styles.drawerEmptyTitle}>Aucune conversation</Text>
              <Text style={styles.drawerEmptyText}>
                Crée une conversation depuis l’écran Aria pour la retrouver ici.
              </Text>
            </View>
          ) : (
            filteredConversations.map((c) => {
              const isActive = c.id === conversationId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setDrawerOpen(false);
                    navigation.navigate('AriaConversation', { conversationId: c.id, title: c.title });
                  }}
                  style={({ pressed }) => [
                    styles.drawerItem,
                    isActive && styles.drawerItemActive,
                    pressed && { opacity: 0.82 },
                  ]}
                >
                  <View style={styles.drawerAvatar}>
                    <Text style={styles.drawerAvatarText}>✦</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.drawerItemTitle} numberOfLines={1}>{c.title}</Text>
                    <Text style={styles.drawerItemPreview} numberOfLines={1}>{c.lastMessage}</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },

  topbar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  newChatBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
  // newChatBtn/newChatIconWrap defined below (glass button)

  empty: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 10,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(124,58,237,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontFamily: FontFamily.sansBold,
    fontSize: 18,
    color: '#0F172A',
  },
  emptyText: {
    marginTop: 8,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
  },
  suggestionChip: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
  },
  suggestionText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: '#475569',
  },

  inputWrap: { paddingHorizontal: 12, paddingTop: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 28,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
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

  // FAB removed: "nouvelle discussion" is in topbar now.

  // Drawer (Claude-like)
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
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
  drawerItemActive: {
    backgroundColor: 'rgba(124,58,237,0.18)',
    borderColor: 'rgba(124,58,237,0.28)',
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

