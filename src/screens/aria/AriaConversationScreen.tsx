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
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessagesSquare,
  MessageCirclePlus,
  Plus,
  Send,
  MessageSquare,
  FileText,
  Bell,
  Search,
  Sparkles,
} from 'lucide-react-native';
import WallpaperBackground from '../../components/WallpaperBackground';
import { FLOATING_TAB_BAR_HEIGHT } from '../../components/FloatingTabBar';
import ChatBubble, { type Message } from '../../components/chat/ChatBubble';
import { sendToAria, type ClaudeMessage } from '../../services/ariaApi';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { useSchoolMode } from '../../contexts/SchoolModeContext';
import AddToDiscussionSheet from '../../components/chat/AddToDiscussionSheet';

// ─── Constants ─────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;
const SEARCH_PILL_W = DRAWER_WIDTH - 32;
const ARIA_ALERTS_UNREAD = 2;

// ─── Category keyword filters for real conversations ────────
type ConvCategory = 'all' | 'discussions' | 'syntheses' | 'alertes';

const CATEGORY_KEYWORDS: Record<ConvCategory, RegExp | null> = {
  all: null,
  discussions: null, // shows all
  syntheses: /synth[eè]se|bilan|r[eé]sum[eé]|progression/i,
  alertes: /alerte|score|joie|urgent|interro|contrôle/i,
};

// ─── Types ──────────────────────────────────────────────────
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

// ─── Storage helpers ─────────────────────────────────────────
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

// ─── Suggestions ─────────────────────────────────────────────
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
      "🎯 Forces et axes d'amélioration",
    ];
  }
  return [
    '📊 Résumé de la semaine',
    '📝 Préparer un contrôle',
    '💡 Conseils pour progresser',
    `😊 Comment va ${childName} ?`,
  ];
}

// ─── Component ───────────────────────────────────────────────
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  // Sidebar state
  const [selectedCategory, setSelectedCategory] = useState<ConvCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const historyRef = useRef<ClaudeMessage[]>([]);
  const suggestions = useMemo(() => makeSuggestions(childFirstName, mode), [childFirstName, mode]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const loadPersisted = useCallback(async () => {
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

  useEffect(() => { loadPersisted().catch(() => {}); }, [loadPersisted]);
  useEffect(() => { scrollToEnd(); }, [messages.length, scrollToEnd]);

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
      setConversations(next.filter((c) => !!c?.id && !!c?.title).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')));
    } catch {}
  }, [childId, conversationId]);

  const sendMessage = useCallback(async (textOverride?: string) => {
    const trimmed = (textOverride ?? input).trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { id: `u_${Date.now()}`, text: trimmed, sender: 'parent', timestamp: nowTime() };
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
      const ariaMsg: Message = { id: `a_${Date.now() + 1}`, text: response, sender: 'aria', timestamp: nowTime() };
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

  const didAutoSendRef = useRef(false);
  useEffect(() => {
    if (!initialMessage || didAutoSendRef.current || messages.length > 0) return;
    didAutoSendRef.current = true;
    setTimeout(() => { sendMessage(initialMessage); }, 60);
  }, [initialMessage, messages.length, sendMessage]);

  const typingMessage: Message = useMemo(() => ({ id: 'typing', text: '', sender: 'aria', timestamp: '' }), []);

  // ─── Drawer animation ──────────────────────────────────────
  const drawerTranslate = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  useEffect(() => {
    Animated.timing(drawerTranslate, {
      toValue: drawerOpen ? 0 : -DRAWER_WIDTH,
      duration: drawerOpen ? 230 : 190,
      useNativeDriver: true,
    }).start();
  }, [drawerOpen, drawerTranslate]);

  // ─── Liquid Glass search animation ────────────────────────
  const searchWidthAnim = useRef(new Animated.Value(44)).current;

  const collapseSearch = useCallback(() => {
    setIsSearchExpanded(false);
    setSearchQuery('');
    Animated.spring(searchWidthAnim, { toValue: 44, tension: 200, friction: 20, useNativeDriver: false }).start();
  }, [searchWidthAnim]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    collapseSearch();
  }, [collapseSearch]);

  const expandSearch = useCallback(() => {
    Animated.spring(searchWidthAnim, { toValue: SEARCH_PILL_W, tension: 200, friction: 20, useNativeDriver: false }).start();
    setTimeout(() => {
      setIsSearchExpanded(true);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }, 140);
  }, [searchWidthAnim]);

  // ─── Create new conversation ───────────────────────────────
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
      setConversations(next.filter((c) => !!c?.id && !!c?.title).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')));
      setDrawerOpen(false);
      navigation.navigate('AriaConversation', { conversationId: newConv.id, title: newConv.title });
    } catch {}
  }, [childFirstName, childId, navigation]);

  // ─── Filtered conversations (sidebar) ─────────────────────
  const filteredConversations = useMemo(() => {
    let list = conversations;
    const regex = CATEGORY_KEYWORDS[selectedCategory];
    if (regex) {
      list = list.filter((c) => regex.test(c.title));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }
    return list;
  }, [conversations, selectedCategory, searchQuery]);

  const topPad = insets.top + 10;

  return (
    <View style={styles.root}>
      <WallpaperBackground />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ─── Top bar ──────────────────────────────────────── */}
        <View style={[styles.topbar, { paddingTop: topPad }]}>
          <Pressable
            onPress={() => setDrawerOpen(true)}
            style={({ pressed }) => [styles.topBtn, { opacity: pressed ? 0.75 : 1 }]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Historique"
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
            style={({ pressed }) => [styles.topBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Nouvelle discussion"
          >
            <MessageCirclePlus size={20} color="#0F172A" strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* ─── Messages ─────────────────────────────────────── */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            messages.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Sparkles size={22} color="#7C3AED" strokeWidth={2} />
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

        {/* ─── Input ────────────────────────────────────────── */}
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
              <Send size={18} color={input.trim() ? '#FFFFFF' : '#94A3B8'} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <AddToDiscussionSheet visible={addSheetOpen} onClose={() => setAddSheetOpen(false)} onPick={() => {}} />

      {/* ─── Overlay ──────────────────────────────────────────── */}
      {drawerOpen && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} accessibilityLabel="Fermer">
          <View style={styles.drawerOverlay} />
        </Pressable>
      )}

      {/* ─── Claude-style sidebar (light) ────────────────────── */}
      <Animated.View
        pointerEvents={drawerOpen ? 'auto' : 'none'}
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            paddingTop: insets.top + 18,
            transform: [{ translateX: drawerTranslate }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>
            <Text style={styles.drawerTitleSparkle}>{'✦ '}</Text>
            <Text style={styles.drawerTitleARIA}>{'ARIA'}</Text>
          </Text>
        </View>

        {/* Categories */}
        <View style={styles.categories}>
          {(
            [
              { key: 'discussions', label: 'Discussions', Icon: MessageSquare },
              { key: 'syntheses', label: 'Synthèses', Icon: FileText },
              { key: 'alertes', label: 'Alertes', Icon: Bell, hasDot: true },
            ] as const
          ).map(({ key, label, Icon, hasDot }) => {
            const isActive = selectedCategory === key || (key === 'discussions' && selectedCategory === 'all');
            return (
              <Pressable
                key={key}
                onPress={() => setSelectedCategory(selectedCategory === key ? 'all' : key)}
                style={({ pressed }) => [
                  styles.categoryRow,
                  isActive && styles.categoryRowActive,
                  pressed && !isActive && styles.categoryRowPressed,
                ]}
              >
                <Icon size={18} color={isActive ? '#7C3AED' : '#374151'} strokeWidth={2} />
                <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                  {label}
                </Text>
                {hasDot && ARIA_ALERTS_UNREAD > 0 && <View style={styles.alertDot} />}
              </Pressable>
            );
          })}
        </View>

        {/* Divider */}
        <View style={styles.drawerDivider} />

        {/* Recents label */}
        <Text style={styles.recentsLabel}>Récents</Text>

        {/* Recents list + pinned search — relative wrapper */}
        <View style={{ flex: 1, position: 'relative' }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
          >
            {filteredConversations.length === 0 ? (
              <Text style={styles.emptyListText}>Aucune conversation</Text>
            ) : (
              filteredConversations.map((c) => {
                const isActiveConv = c.id === conversationId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      closeDrawer();
                      navigation.navigate('AriaConversation', { conversationId: c.id, title: c.title });
                    }}
                    style={({ pressed }) => [
                      styles.recentRow,
                      isActiveConv && styles.recentRowActive,
                      pressed && !isActiveConv && styles.recentRowPressed,
                    ]}
                  >
                    <Text style={styles.recentTitle} numberOfLines={1}>{c.title}</Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* ─── Liquid Glass Search Button — absolute pin ─── */}
          <View style={{ position: 'absolute', bottom: 120, left: 16 }}>
            <Animated.View
              style={[
                styles.liquidGlass,
                { width: searchWidthAnim },
                Platform.OS === 'web'
                  ? ({
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    } as any)
                  : {},
              ]}
            >
              <Pressable
                onPress={isSearchExpanded ? collapseSearch : expandSearch}
                style={styles.liquidGlassInner}
                hitSlop={!isSearchExpanded ? 8 : 0}
              >
                <Search
                  size={isSearchExpanded ? 14 : 16}
                  color={isSearchExpanded ? '#9ca3af' : '#374151'}
                  strokeWidth={2}
                />
                {isSearchExpanded && (
                  <TextInput
                    ref={searchInputRef}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Rechercher…"
                    placeholderTextColor="#9ca3af"
                    style={styles.searchPillInput}
                    returnKeyType="done"
                    onSubmitEditing={collapseSearch}
                  />
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },

  // Top bar
  topbar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Liquid Glass — aligned with Aria home top bar (38px circle, blur + frosted)
  topBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select<any>({
      web: {
        backgroundColor: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
      },
      ios: {
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
        elevation: 2,
      },
      default: {
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
    }),
  },
  topTitle: { fontFamily: FontFamily.sansBold, fontSize: 16, color: '#0F172A', letterSpacing: -0.2 },
  topTitleIA: { color: '#7C3AED' },
  topSubtitle: { marginTop: 1, fontFamily: FontFamily.sansRegular, fontSize: 11, color: '#94A3B8' },

  // Empty state
  empty: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 10, alignItems: 'center' },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: 'rgba(124,58,237,0.10)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { marginTop: 12, fontFamily: FontFamily.sansBold, fontSize: 18, color: '#0F172A' },
  emptyText: { marginTop: 8, fontFamily: FontFamily.sansRegular, fontSize: 13, lineHeight: 19, color: '#64748B', textAlign: 'center' },
  suggestionChip: {
    backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.22)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, marginRight: 8,
  },
  suggestionText: { fontFamily: FontFamily.sansMedium, fontSize: 13, color: '#475569' },

  // Input
  inputWrap: { paddingHorizontal: 12, paddingTop: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 28, paddingLeft: 10, paddingRight: 6, paddingVertical: 6,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 20 },
      android: { elevation: 0 },
    }),
  },
  plusBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.10)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.18)', marginBottom: 2,
  },
  input: { flex: 1, fontFamily: FontFamily.sansRegular, fontSize: 15, color: '#0F172A', maxHeight: 120, paddingVertical: 10 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.10)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.18)', marginBottom: 2,
  },
  sendBtnActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },

  // Overlay
  drawerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.30)' },

  // Drawer — light, Claude-style
  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    backgroundColor: '#FAFAFA',
    borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'column',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.10, shadowRadius: 20 },
      android: { elevation: 8 },
      default: { shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.10, shadowRadius: 20 },
    }),
  },
  drawerHeader: { paddingHorizontal: 20, paddingBottom: 20 },
  drawerTitle: { fontFamily: FontFamily.displayBold, fontSize: 28, letterSpacing: 2 },
  drawerTitleSparkle: { color: '#7C3AED', fontFamily: FontFamily.displayBold, fontSize: 28 },
  drawerTitleARIA: { color: '#1A2340', fontFamily: FontFamily.displayBold, fontSize: 28, letterSpacing: 2 },

  // Categories
  categories: { paddingHorizontal: 8, gap: 2 },
  categoryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, minHeight: 44,
  },
  categoryRowActive: { backgroundColor: 'rgba(124,58,237,0.08)' },
  categoryRowPressed: { backgroundColor: 'rgba(124,58,237,0.04)' },
  categoryLabel: { fontFamily: FontFamily.sansMedium, fontSize: 15, color: '#1A2340', flex: 1 },
  categoryLabelActive: { color: '#7C3AED', fontFamily: FontFamily.sansSemiBold },
  alertDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#7C3AED' },

  // Divider
  drawerDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.07)', marginHorizontal: 20, marginVertical: 4 },

  // Recents
  recentsLabel: {
    fontFamily: FontFamily.sansMedium, fontSize: 12, color: '#9ca3af',
    letterSpacing: 0.84, textTransform: 'uppercase',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
  },
  recentRow: {
    paddingHorizontal: 20, paddingVertical: 10,
  },
  recentRowActive: { backgroundColor: 'rgba(124,58,237,0.10)' },
  recentRowPressed: { backgroundColor: 'rgba(124,58,237,0.05)' },
  recentTitle: { fontFamily: FontFamily.sansRegular, fontSize: 14, color: '#374151' },
  emptyListText: {
    fontFamily: FontFamily.sansRegular, fontSize: 13, color: '#9ca3af',
    paddingHorizontal: 20, paddingTop: 16,
  },

  liquidGlass: {
    height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.70)',
    overflow: 'hidden',
  },
  liquidGlassInner: {
    flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8,
  },
  searchPillInput: {
    flex: 1, fontFamily: FontFamily.sansRegular, fontSize: 14, color: '#374151', paddingVertical: 0,
  },
});
