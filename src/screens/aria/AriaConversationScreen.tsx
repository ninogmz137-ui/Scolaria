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
import { useRoute, useNavigation, StackActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessagesSquare,
  MessageCirclePlus,
  MessageSquare,
  FileText,
  Bell,
  Search,
} from 'lucide-react-native';
import WallpaperBackground from '../../components/WallpaperBackground';
import {
  TAB_BAR_SCROLL_PADDING,
  FLAT_LIST_TAB_BAR_FOOTER_SPACER,
} from '../../components/FloatingTabBar';
import { useKeyboardInputPadding } from '../../hooks/useKeyboardInputPadding';
import ChatBubble, { type Message } from '../../components/chat/ChatBubble';
import { SCREEN_BACKGROUND } from '../../constants/colors';
import { sendToAria, type ClaudeMessage } from '../../services/ariaApi';
import { parseAriaResponse, executeAriaAction, type AriaAction } from '../../services/ariaActions';
import AriaActionCard from '../../components/aria/AriaActionCard';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { useSchoolMode } from '../../contexts/SchoolModeContext';
import { useAuth } from '../../contexts/AuthContext';
import UniversalInputBar from '../../components/UniversalInputBar';
import AriaOrb from '../../components/AriaOrb';
import { ariaSidebarTitle, defaultNewAriaConversationTitle } from '../../utils/ariaConversationTitle';
import { nativeAriaSuggestionShadow, nativeWhiteInteractiveShadow } from '../../constants/theme';

// ─── Constants ─────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;
const SEARCH_PILL_W = DRAWER_WIDTH - 32;
const ARIA_ALERTS_UNREAD = 2;

/** Header orb: natural `size` on AriaOrb (no parent scale transform); ≥80px so rings aren’t clipped */
const HEADER_ORB_SIZE = 80;

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
  const inputPadBottom = useKeyboardInputPadding(insets.bottom);
  const { selectedChild } = useActiveChild();
  const { mode } = useSchoolMode();
  const { isDemo } = useAuth();

  const childId = selectedChild?.id ?? 'demo-lea';
  const childFirstName = (selectedChild?.name ?? 'votre enfant').split(' ')[0];
  const { conversationId, title, initialMessage } = (route.params ?? {}) as RouteParams;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<FlatList>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  // Sidebar state
  const [selectedCategory, setSelectedCategory] = useState<ConvCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const [pendingAction, setPendingAction] = useState<AriaAction | null>(null);
  const [actionStatus, setActionStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
  const [actionResult, setActionResult] = useState<string | undefined>(undefined);

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

  const persistConversationTitle = useCallback(
    async (title: string) => {
      try {
        const raw = await AsyncStorage.getItem(conversationsKey(childId));
        const parsed = raw ? (JSON.parse(raw) as Conversation[]) : [];
        const list = Array.isArray(parsed) ? parsed : [];
        const next = list.map((c) => (c.id === conversationId ? { ...c, title } : c));
        await AsyncStorage.setItem(conversationsKey(childId), JSON.stringify(next));
        setConversations(
          next.filter((c) => !!c?.id && !!c?.title).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
        );
      } catch {}
    },
    [childId, conversationId],
  );

  const sendMessage = useCallback(async (textOverride?: string) => {
    const trimmed = (textOverride ?? input).trim();
    if (!trimmed || isTyping) return;

    if (messages.length === 0) {
      void persistConversationTitle(trimmed.slice(0, 40));
    }

    const userMsg: Message = { id: `u_${Date.now()}`, text: trimmed, sender: 'parent', timestamp: nowTime() };
    const nextUI = [...messages, userMsg];
    setMessages(nextUI);
    setInput('');
    setIsTyping(true);
    scrollToEnd();

    try {
      const response = await sendToAria(trimmed, historyRef.current, childId, {
        isDemo,
        childName: selectedChild?.name,
      });

      // Parse action tag from Aria's response
      const { cleanText, action } = parseAriaResponse(response);

      // Update history with clean text (no tag)
      historyRef.current = [
        ...historyRef.current,
        { role: 'user' as const, content: trimmed },
        { role: 'assistant' as const, content: cleanText },
      ].slice(-20);

      const ariaMsg: Message = { id: `a_${Date.now() + 1}`, text: cleanText, sender: 'aria', timestamp: nowTime() };
      const finalUI = [...nextUI, ariaMsg];
      setMessages(finalUI);
      await persist(finalUI, historyRef.current);
      await updateConversationPreview(cleanText);

      // Show confirmation card if action detected
      if (action) {
        setPendingAction(action);
        setActionStatus('pending');
        setActionResult(undefined);
        setTimeout(() => scrollToEnd(), 100);
      }
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
  }, [childId, input, isTyping, messages, persist, persistConversationTitle, scrollToEnd, updateConversationPreview]);

  const handleConfirmAction = useCallback(async () => {
    if (!pendingAction) return;
    setActionStatus('loading');
    const result = await executeAriaAction(pendingAction, {
      studentId: childId,
      studentName: selectedChild?.name,
      studentAvatar: selectedChild?.avatar || selectedChild?.avatarEmoji || '👧',
    });
    setActionStatus(result.success ? 'success' : 'error');
    setActionResult(result.message);

    // After 2s, inject Aria confirmation message and clear card
    setTimeout(async () => {
      const confirmMsg: Message = {
        id: `a_${Date.now()}`,
        text: result.success
          ? `${result.message}\n\nY a-t-il autre chose que je peux faire pour toi ?`
          : `${result.message}\n\nVeux-tu réessayer ou as-tu besoin d'aide ?`,
        sender: 'aria',
        timestamp: nowTime(),
      };
      setMessages((prev) => {
        const next = [...prev, confirmMsg];
        void persist(next, historyRef.current);
        return next;
      });
      setPendingAction(null);
      scrollToEnd();
    }, 2000);
  }, [pendingAction, persist, scrollToEnd, childId, selectedChild?.name, selectedChild?.avatar, selectedChild?.avatarEmoji]);

  const handleCancelAction = useCallback(() => {
    setPendingAction(null);
    const cancelMsg: Message = {
      id: `a_${Date.now()}`,
      text: "D'accord, je n'ai rien fait. N'hésite pas à me redemander si tu changes d'avis. 😊",
      sender: 'aria',
      timestamp: nowTime(),
    };
    setMessages((prev) => {
      const next = [...prev, cancelMsg];
      void persist(next, historyRef.current);
      return next;
    });
    scrollToEnd();
  }, [persist, scrollToEnd]);

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
        title: defaultNewAriaConversationTitle(),
        lastMessage: 'Nouvelle conversation',
        updatedAt: now,
      };
      const next = [newConv, ...list];
      await AsyncStorage.setItem(conversationsKey(childId), JSON.stringify(next));
      setConversations(next.filter((c) => !!c?.id && !!c?.title).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')));
      setDrawerOpen(false);
      navigation.dispatch(StackActions.push('AriaConversation', { conversationId: newConv.id, title: newConv.title }));
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

  // ─── Group recents into Claude-style time buckets ───────────
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = startOfToday - 30 * 24 * 60 * 60 * 1000;

    const buckets: { key: string; label: string; items: typeof filteredConversations }[] = [
      { key: 'today',     label: "Aujourd'hui",         items: [] },
      { key: 'yesterday', label: 'Hier',                items: [] },
      { key: 'week',      label: '7 jours précédents',  items: [] },
      { key: 'month',     label: '30 jours précédents', items: [] },
      { key: 'older',     label: 'Plus anciens',        items: [] },
    ];

    for (const c of filteredConversations) {
      const t = new Date(c.updatedAt).getTime();
      if (!Number.isFinite(t)) { buckets[4].items.push(c); continue; }
      if (t >= startOfToday) buckets[0].items.push(c);
      else if (t >= startOfYesterday) buckets[1].items.push(c);
      else if (t >= sevenDaysAgo) buckets[2].items.push(c);
      else if (t >= thirtyDaysAgo) buckets[3].items.push(c);
      else buckets[4].items.push(c);
    }

    return buckets.filter((b) => b.items.length > 0);
  }, [filteredConversations]);

  const topPad = insets.top + 10;

  return (
    <View style={styles.root}>
      <WallpaperBackground />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
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
            {!drawerOpen && (
              <View style={styles.headerOrbSlot}>
                <AriaOrb size={HEADER_ORB_SIZE} state={isTyping ? 'thinking' : 'idle'} />
              </View>
            )}
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
          contentContainerStyle={{ paddingTop: 12, paddingBottom: TAB_BAR_SCROLL_PADDING }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            messages.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Bonjour !</Text>
                <Text style={styles.emptyText}>
                  Posez une question sur {childFirstName}. Aria peut aider à comprendre les notes, préparer un contrôle, ou proposer un plan de révision.
                </Text>
                {/* Horizontal ScrollView — on Android, a flex-wrap row with
                    fixed-percent chips can collapse under Yoga's strict sizing;
                    a horizontal scroller guarantees chips keep their natural height. */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                  style={styles.suggestionScroll}
                  contentContainerStyle={styles.suggestionWrap}
                >
                  {suggestions.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => sendMessage(item)}
                      disabled={isTyping}
                      style={({ pressed }) => [
                        styles.suggestionChip,
                        { opacity: pressed ? 0.86 : 1 },
                        isTyping && { opacity: 0.5 },
                      ]}
                    >
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null
          }
          ListFooterComponent={
            <>
              {isTyping ? <ChatBubble message={typingMessage} isTyping /> : null}
              {pendingAction && !isTyping ? (
                <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
                  <AriaActionCard
                    action={pendingAction}
                    onConfirm={handleConfirmAction}
                    onCancel={handleCancelAction}
                    status={actionStatus}
                    resultMessage={actionResult}
                  />
                </View>
              ) : null}
              <View style={{ height: FLAT_LIST_TAB_BAR_FOOTER_SPACER }} />
            </>
          }
          onContentSizeChange={() => scrollToEnd()}
        />

        <UniversalInputBar
          placeholder="Demandez à Aria…"
          value={input}
          onChangeText={setInput}
          onSend={() => sendMessage()}
          onPressPlus={() => {}}
          onPressMic={() => {}}
          variant="aria"
          editable={!isTyping}
          containerStyle={{ paddingBottom: inputPadBottom }}
          maxLength={800}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
        />
      </KeyboardAvoidingView>

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
        {/* Header — brand left, orb centered */}
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerBrand}>
            <Text style={styles.drawerTitleSparkle}>{'✦ '}</Text>
            <Text style={styles.drawerTitleARIA}>{'ARIA'}</Text>
          </Text>
          <View style={styles.drawerOrbWrap} pointerEvents="none">
            <AriaOrb state={isTyping ? 'thinking' : 'idle'} size={52} />
          </View>
          <View style={styles.drawerHeaderSpacer} />
        </View>

        {/* Categories */}
        <View style={styles.categories}>
          {(
            [
              { key: 'discussions', label: 'Discussions', Icon: MessageSquare, hasDot: false as const },
              { key: 'syntheses', label: 'Documents', Icon: FileText, hasDot: false as const },
              { key: 'alertes', label: 'Alertes', Icon: Bell, hasDot: true as const },
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
                <View style={styles.categoryCell}>
                  <Icon size={20} color={isActive ? '#7C3AED' : '#374151'} strokeWidth={2} />
                  <View style={styles.categoryLabelRow}>
                    <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                      {label}
                    </Text>
                    {hasDot && ARIA_ALERTS_UNREAD > 0 ? <View style={styles.alertDot} /> : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Divider */}
        <View style={styles.drawerDivider} />

        <View style={styles.drawerBody}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            /* Drawer has its own search bar below — no need for floating tab bar clearance.
               The previous `paddingBottom: TAB_BAR_SCROLL_PADDING` (120) pushed the last
               rows under the search bar and looked "écrasé en bas" on Android. */
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 4, paddingHorizontal: 16 }}
            style={styles.drawerRecentsScroll}
          >
            {groupedConversations.length === 0 ? (
              <Text style={styles.emptyListText}>Aucune conversation</Text>
            ) : (
              groupedConversations.map((bucket) => (
                <View key={bucket.key} style={styles.recentsSection}>
                  <Text style={styles.recentsSectionLabel}>{bucket.label}</Text>
                  {bucket.items.map((c) => {
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
                        <Text style={styles.recentRowTitle} numberOfLines={1}>
                          {ariaSidebarTitle(c, conversations)}
                        </Text>
                        <Text style={styles.recentRowSubtitle} numberOfLines={1}>
                          {c.updatedAt
                            ? new Date(c.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.drawerSearchBar}>
            <Animated.View
              style={[
                styles.liquidGlass,
                { width: searchWidthAnim },
                nativeWhiteInteractiveShadow,
              ]}
            >
              <Pressable
                onPress={isSearchExpanded ? collapseSearch : expandSearch}
                style={styles.liquidGlassInner}
                hitSlop={!isSearchExpanded ? 8 : 0}
              >
                <Search
                  size={isSearchExpanded ? 14 : 18}
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
  root: { flex: 1, backgroundColor: SCREEN_BACKGROUND },

  // Top bar — buttons vertically centered with the title block.
  topbar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  // Liquid Glass — aligned with Aria home top bar (40px circle, visible shadow on Android)
  // Android: `elevation: 4` gives a native drop shadow. Safe here because
  // `backgroundColor: '#FFFFFF'` + `borderRadius: 20` + no `borderWidth` → no grey frame.
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  /** Fits natural `size={80}` AriaOrb (idle + thinking); no transform scale on parent */
  headerOrbSlot: {
    width: HEADER_ORB_SIZE,
    minWidth: HEADER_ORB_SIZE,
    minHeight: HEADER_ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 6,
    overflow: 'visible',
    zIndex: 2,
  },
  topTitle: {
    marginTop: 2,
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  topTitleIA: { color: '#7C3AED' },
  topSubtitle: { marginTop: 1, fontFamily: FontFamily.sansRegular, fontSize: 11, color: '#94A3B8' },

  // Empty state
  empty: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 10,
    alignItems: 'center',
  },
  emptyTitle: { fontFamily: FontFamily.sansBold, fontSize: 18, color: '#0F172A' },
  emptyText: { marginTop: 8, fontFamily: FontFamily.sansRegular, fontSize: 13, lineHeight: 19, color: '#64748B', textAlign: 'center' },
  suggestionScroll: {
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
    marginTop: 12,
    minHeight: 72,
  },
  suggestionWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 4,
    paddingRight: 20,
    paddingVertical: 4,
    flexGrow: 1,
  },
  suggestionChip: {
    minWidth: 160,
    maxWidth: 240,
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginRight: 8,
    justifyContent: 'center',
    ...nativeAriaSuggestionShadow,
  },
  suggestionText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: '#475569',
  },

  // Overlay
  drawerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.30)' },

  // Drawer — light, Claude-style
  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    backgroundColor: SCREEN_BACKGROUND,
    borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'column',
    alignSelf: 'stretch',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.10, shadowRadius: 20 },
      android: { elevation: 8 },
      default: { shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.10, shadowRadius: 20 },
    }),
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    minHeight: 56,
  },
  drawerBrand: {
    width: 100,
    fontFamily: FontFamily.displayBold,
    fontSize: 26,
    letterSpacing: 1,
  },
  drawerTitleSparkle: { color: '#7C3AED', fontFamily: FontFamily.displayBold, fontSize: 26 },
  drawerTitleARIA: { color: '#7C3AED', fontFamily: FontFamily.displayBold, fontSize: 26, letterSpacing: 1 },
  drawerOrbWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  drawerHeaderSpacer: { width: 100 },
  drawerBody: { flex: 1, flexDirection: 'column', justifyContent: 'flex-start' },
  drawerRecentsScroll: { flex: 1 },
  drawerSearchBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, alignItems: 'flex-start' },

  // Categories — row layout (explicit for older Android; no gap)
  categories: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  categoryRow: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  categoryCell: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  categoryRowActive: { backgroundColor: 'rgba(124,58,237,0.08)' },
  categoryRowPressed: { backgroundColor: 'rgba(124,58,237,0.04)' },
  categoryLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: '#1A2340',
    textAlign: 'center',
  },
  categoryLabelActive: { color: '#7C3AED', fontFamily: FontFamily.sansSemiBold },
  alertDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7C3AED',
    marginLeft: 6,
  },

  // Divider
  drawerDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.07)', marginHorizontal: 20, marginVertical: 4 },

  // Recents — Claude-style time-bucket sections
  recentsSection: {
    marginTop: 4,
  },
  recentsSectionLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: 'rgba(15,23,42,0.5)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 6,
  },
  recentRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  recentRowActive: { backgroundColor: 'rgba(124,58,237,0.10)' },
  recentRowPressed: { opacity: 0.7 },
  recentRowTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    color: '#0F172A',
  },
  recentRowSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyListText: {
    fontFamily: FontFamily.sansRegular, fontSize: 13, color: '#9ca3af',
    paddingHorizontal: 20, paddingTop: 16,
  },

  liquidGlass: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    overflow: 'hidden',
  },
  liquidGlassInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    columnGap: 8,
  },
  searchPillInput: {
    flex: 1, fontFamily: FontFamily.sansRegular, fontSize: 14, color: '#374151', paddingVertical: 0,
  },
});
