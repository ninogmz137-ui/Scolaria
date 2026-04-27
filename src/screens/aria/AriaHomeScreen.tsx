/**
 * AriaHomeScreen — Écran Aria unifié.
 *
 * Deux modes internes, zéro navigation push :
 *   • Accueil  (conversationId === null) : hero + suggestion cards
 *   • Conversation (conversationId !== null) : FlatList avec messages
 *
 * Le bouton "+" réinitialise vers l'accueil au lieu de pousser un nouvel écran.
 * La sidebar charge les conversations existantes via loadConversation().
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessagesSquare,
  MessageCirclePlus,
  MessageSquare,
  FileText,
  Bell,
  Search,
} from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import WallpaperBackground from '../../components/WallpaperBackground';
import {
  FLOATING_TAB_BAR_HEIGHT,
  TAB_BAR_SCROLL_PADDING,
  FLAT_LIST_TAB_BAR_FOOTER_SPACER,
} from '../../components/FloatingTabBar';
import { useKeyboardInputPadding } from '../../hooks/useKeyboardInputPadding';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { useSchoolMode } from '../../contexts/SchoolModeContext';
import { useAuth } from '../../contexts/AuthContext';
import UniversalInputBar from '../../components/UniversalInputBar';
import AriaOrb, { type AriaOrbState } from '../../components/AriaOrb';
import ChatBubble, { type Message } from '../../components/chat/ChatBubble';
import AriaActionCard from '../../components/aria/AriaActionCard';
import { SCREEN_BACKGROUND } from '../../constants/colors';
import {
  androidFloatingWhitePill,
  ariaTopBarIconSlot,
  ariaTopBarStackFrame,
  ariaTopBarStackPress,
  ariaTopBarStackShadow,
  ARIA_INDIGO,
  nativeWhiteInteractiveShadow,
} from '../../constants/theme';
import { sendToAria, type ClaudeMessage } from '../../services/ariaApi';
import { parseAriaResponse, executeAriaAction, type AriaAction } from '../../services/ariaActions';
import { defaultNewAriaConversationTitle } from '../../utils/ariaConversationTitle';

// ─── Constants ─────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;
const SEARCH_PILL_W = DRAWER_WIDTH - 32;
const ARIA_ALERTS_UNREAD = 2;
const HEADER_ORB_SIZE = 64;

// ─── Types ──────────────────────────────────────────────────
type ConvCategory = 'all' | 'discussions' | 'syntheses' | 'alertes';

const CATEGORY_KEYWORDS: Record<ConvCategory, RegExp | null> = {
  all: null,
  discussions: null,
  syntheses: /synth[eè]se|bilan|r[eé]sum[eé]|progression/i,
  alertes: /alerte|score|joie|urgent|interro|contrôle/i,
};

type Conversation = {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
};

// ─── Storage helpers ─────────────────────────────────────────
function convListKey(childId: string) {
  return `@scolaria_aria_conversations:${childId}`;
}
function messagesKey(childId: string, convId: string) {
  return `@scolaria_aria_messages:${childId}:${convId}`;
}
function historyKey(childId: string, convId: string) {
  return `@scolaria_aria_history:${childId}:${convId}`;
}
function nowTime() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

async function loadConvList(childId: string): Promise<Conversation[]> {
  const raw = await AsyncStorage.getItem(convListKey(childId));
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

async function saveConvList(childId: string, convs: Conversation[]) {
  await AsyncStorage.setItem(convListKey(childId), JSON.stringify(convs));
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
export default function AriaHomeScreen() {
  const insets = useSafeAreaInsets();
  const inputPadBottom = useKeyboardInputPadding(insets.bottom);
  const { selectedChild } = useActiveChild();
  const { mode } = useSchoolMode();
  const { isDemo } = useAuth();

  const childId = selectedChild?.id ?? 'demo-lea';
  const childName = (selectedChild?.name ?? 'votre enfant').split(' ')[0];
  const suggestions = useMemo(() => makeSuggestions(childName, mode), [childName, mode]);

  // ─── Conversation state ───────────────────────────────────
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState('');
  const [pendingAction, setPendingAction] = useState<AriaAction | null>(null);
  const [actionStatus, setActionStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
  const [actionResult, setActionResult] = useState<string | undefined>();
  const historyRef = useRef<ClaudeMessage[]>([]);
  const listRef = useRef<FlatList>(null);

  // ─── Sidebar state ────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ConvCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  // ID de la ligne de l'historique actuellement pressée (pour le gris Android)
  const [pressedConvId, setPressedConvId] = useState<string | null>(null);

  const [orbState, setOrbState] = useState<AriaOrbState>('idle');

  // true when a conversation is active (even while first message is loading)
  const isConversationMode = conversationId !== null;

  // ─── Load conversations list on mount / child change ─────
  useEffect(() => {
    loadConvList(childId).then(setConversations).catch(() => {});
  }, [childId]);

  // ─── Scroll helpers ───────────────────────────────────────
  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToEnd();
  }, [messages.length, scrollToEnd]);

  // ─── Persistence helpers ──────────────────────────────────
  const persist = useCallback(
    async (convId: string, msgs: Message[], hist: ClaudeMessage[]) => {
      await AsyncStorage.multiSet([
        [messagesKey(childId, convId), JSON.stringify(msgs)],
        [historyKey(childId, convId), JSON.stringify(hist)],
      ]);
    },
    [childId],
  );

  const updateConvPreview = useCallback(
    async (convId: string, lastMessage: string) => {
      try {
        const raw = await AsyncStorage.getItem(convListKey(childId));
        const parsed = raw ? (JSON.parse(raw) as Conversation[]) : [];
        const list = Array.isArray(parsed) ? parsed : [];
        const now = new Date().toISOString();
        const next = list.map((c) =>
          c.id === convId
            ? { ...c, lastMessage: lastMessage.slice(0, 120), updatedAt: now }
            : c,
        );
        await AsyncStorage.setItem(convListKey(childId), JSON.stringify(next));
        setConversations(
          next.filter((c) => !!c?.id && !!c?.title).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
        );
      } catch {}
    },
    [childId],
  );

  // ─── Send message ─────────────────────────────────────────
  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const trimmed = (textOverride ?? input).trim();
      if (!trimmed || isTyping) return;

      // Create conversation on first message (sync before any await)
      let activeConvId = conversationId;
      if (!activeConvId) {
        activeConvId = `c_${Date.now()}`;
        const newConv: Conversation = {
          id: activeConvId,
          title: trimmed.slice(0, 40),
          lastMessage: trimmed.slice(0, 120),
          updatedAt: new Date().toISOString(),
        };
        const next = [newConv, ...conversations];
        setConversations(next);
        saveConvList(childId, next).catch(() => {});
        setConversationId(activeConvId); // batched with setMessages below
      }

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
      setOrbState('thinking');

      try {
        const response = await sendToAria(trimmed, historyRef.current, childId, {
          isDemo,
          childName: selectedChild?.name,
        });

        const { cleanText, action } = parseAriaResponse(response);

        historyRef.current = [
          ...historyRef.current,
          { role: 'user' as const, content: trimmed },
          { role: 'assistant' as const, content: cleanText },
        ].slice(-20);

        const ariaMsg: Message = {
          id: `a_${Date.now() + 1}`,
          text: cleanText,
          sender: 'aria',
          timestamp: nowTime(),
        };
        const finalUI = [...nextUI, ariaMsg];
        setMessages(finalUI);
        await persist(activeConvId, finalUI, historyRef.current);
        await updateConvPreview(activeConvId, cleanText);

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
        await persist(activeConvId, finalUI, historyRef.current);
      } finally {
        setIsTyping(false);
        setOrbState('idle');
      }
    },
    [
      childId, input, isTyping, messages, conversationId, conversations,
      persist, updateConvPreview, scrollToEnd, isDemo, selectedChild?.name,
    ],
  );

  // ─── Action card callbacks ────────────────────────────────
  const handleConfirmAction = useCallback(async () => {
    if (!pendingAction || !conversationId) return;
    setActionStatus('loading');
    const result = await executeAriaAction(pendingAction, {
      studentId: childId,
      studentName: selectedChild?.name,
      studentAvatar: selectedChild?.avatar || selectedChild?.avatarEmoji || '👧',
    });
    setActionStatus(result.success ? 'success' : 'error');
    setActionResult(result.message);

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
        void persist(conversationId, next, historyRef.current);
        return next;
      });
      setPendingAction(null);
      scrollToEnd();
    }, 2000);
  }, [pendingAction, conversationId, persist, scrollToEnd, childId, selectedChild?.name, selectedChild?.avatar, selectedChild?.avatarEmoji]);

  const handleCancelAction = useCallback(() => {
    if (!conversationId) return;
    setPendingAction(null);
    const cancelMsg: Message = {
      id: `a_${Date.now()}`,
      text: "D'accord, je n'ai rien fait. N'hésite pas à me redemander si tu changes d'avis. 😊",
      sender: 'aria',
      timestamp: nowTime(),
    };
    setMessages((prev) => {
      const next = [...prev, cancelMsg];
      void persist(conversationId, next, historyRef.current);
      return next;
    });
    scrollToEnd();
  }, [conversationId, persist, scrollToEnd]);

  // ─── Reset to home (replaces "push new conversation") ────
  const resetToHome = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    historyRef.current = [];
    setInput('');
    setPendingAction(null);
    setOrbState('idle');
    setDrawerOpen(false);
  }, []);

  // ─── Load conversation from sidebar ───────────────────────
  const loadConversation = useCallback(
    async (conv: Conversation) => {
      setDrawerOpen(false);
      if (conv.id === conversationId) return;

      const rawMsgs = await AsyncStorage.getItem(messagesKey(childId, conv.id));
      const rawHist = await AsyncStorage.getItem(historyKey(childId, conv.id));

      let msgs: Message[] = [];
      if (rawMsgs) {
        try { msgs = JSON.parse(rawMsgs) as Message[]; } catch {}
      }
      historyRef.current = [];
      if (rawHist) {
        try { historyRef.current = JSON.parse(rawHist) as ClaudeMessage[]; } catch {}
      }

      setConversationId(conv.id);
      setMessages(msgs);
      setInput('');
      setPendingAction(null);
      setOrbState('idle');
    },
    [childId, conversationId],
  );

  // ─── Drawer animation ─────────────────────────────────────
  const drawerTranslate = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  useEffect(() => {
    Animated.timing(drawerTranslate, {
      toValue: drawerOpen ? 0 : -DRAWER_WIDTH,
      duration: drawerOpen ? 230 : 190,
      useNativeDriver: true,
    }).start();
  }, [drawerOpen, drawerTranslate]);

  // ─── Search animation ─────────────────────────────────────
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

  // ─── Filtered & grouped conversations ────────────────────
  const filteredConversations = useMemo(() => {
    let list = conversations;
    const regex = CATEGORY_KEYWORDS[selectedCategory];
    if (regex) list = list.filter((c) => regex.test(c.title));
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter((c) => c.title.toLowerCase().includes(q));
    return list;
  }, [conversations, selectedCategory, searchQuery]);

  const groupedConversations = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;
    const monthStart = todayStart - 30 * 86400000;

    const buckets: { key: string; label: string; items: Conversation[] }[] = [
      { key: 'today',     label: "Aujourd'hui",         items: [] },
      { key: 'yesterday', label: 'Hier',                items: [] },
      { key: 'week',      label: '7 jours précédents',  items: [] },
      { key: 'month',     label: '30 jours précédents', items: [] },
      { key: 'older',     label: 'Plus anciens',        items: [] },
    ];

    for (const c of filteredConversations) {
      const t = new Date(c.updatedAt).getTime();
      if (!Number.isFinite(t)) { buckets[4].items.push(c); continue; }
      if (t >= todayStart)      buckets[0].items.push(c);
      else if (t >= yesterdayStart) buckets[1].items.push(c);
      else if (t >= weekStart)  buckets[2].items.push(c);
      else if (t >= monthStart) buckets[3].items.push(c);
      else                      buckets[4].items.push(c);
    }

    return buckets.filter((b) => b.items.length > 0);
  }, [filteredConversations]);

  const typingMessage: Message = useMemo(
    () => ({ id: 'typing', text: '', sender: 'aria', timestamp: '' }),
    [],
  );

  const topPad = insets.top + 10;
  const activeTitle = conversations.find((c) => c.id === conversationId)?.title;

  // ─── Render ───────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <WallpaperBackground />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
      >
        {/* ─── Top bar ──────────────────────────────────────── */}
        <View style={[styles.topbar, { paddingTop: topPad }]}>
          <View style={styles.topBtnFrame} collapsable={false}>
            <View style={styles.topBtnShadow} />
            <Pressable
              onPress={() => setDrawerOpen(true)}
              style={({ pressed }) => [ariaTopBarStackPress, { opacity: pressed ? 0.75 : 1 }]}
              hitSlop={10}
              android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
              accessibilityRole="button"
              accessibilityLabel="Historique"
            >
              <View style={ariaTopBarIconSlot}>
                <MessagesSquare size={20} color="#0F172A" strokeWidth={2} />
              </View>
            </Pressable>
          </View>

          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 10 }}>
            {!drawerOpen && (
              <View style={styles.headerOrbSlot}>
                <AriaOrb size={HEADER_ORB_SIZE} state={isTyping ? 'thinking' : orbState} />
              </View>
            )}
            <Text style={styles.topTitle}>Aria</Text>
            <Text style={styles.topSubtitle} numberOfLines={1}>
              {isConversationMode ? (activeTitle ?? 'Conversation') : 'Étendu'}
            </Text>
          </View>

          <View style={styles.topBtnFrame} collapsable={false}>
            <View style={styles.topBtnShadow} />
            <Pressable
              onPress={isConversationMode ? resetToHome : undefined}
              disabled={!isConversationMode}
              style={({ pressed }) => [
                ariaTopBarStackPress,
                isConversationMode && pressed && { opacity: 0.85 },
                !isConversationMode && { opacity: 0.35 },
              ]}
              android_ripple={isConversationMode ? { color: 'rgba(0,0,0,0.08)' } : undefined}
              accessibilityRole="button"
              accessibilityLabel="Nouvelle conversation"
            >
              <View style={ariaTopBarIconSlot}>
                <MessageCirclePlus size={20} color="#0F172A" strokeWidth={2} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* ─── Mode accueil : hero + suggestion cards ───────── */}
        {!isConversationMode && (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 44,
              paddingBottom: FLOATING_TAB_BAR_HEIGHT + TAB_BAR_SCROLL_PADDING,
              paddingHorizontal: 18,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.heroTitle}>Comment puis-je t'aider ce soir ?</Text>
            </View>

            <View style={[styles.suggestionWrap, { marginTop: 26 }]}>
              {suggestions.map((s) => (
                <View key={s} style={styles.suggestionCardOuter}>
                  <Pressable
                    onPress={() => sendMessage(s)}
                    style={({ pressed }) => [styles.suggestionPressable, pressed && { opacity: 0.86 }]}
                  >
                    <Text style={styles.suggestionText} numberOfLines={2}>{s}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ─── Mode conversation : FlatList messages ────────── */}
        {isConversationMode && (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <ChatBubble message={item} />}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: TAB_BAR_SCROLL_PADDING }}
            showsVerticalScrollIndicator={false}
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
          />
        )}

        {/* ─── Barre de saisie (toujours visible) ───────────── */}
        <UniversalInputBar
          placeholder="Demandez à Aria…"
          value={input}
          onChangeText={setInput}
          onSend={() => sendMessage()}
          onPressPlus={() => {}}
          onPressMic={() => {}}
          onMicPressIn={() => setOrbState('listening')}
          onMicPressOut={() => setOrbState((s) => (s === 'thinking' ? 'thinking' : 'idle'))}
          variant="aria"
          editable={!isTyping}
          containerStyle={{ paddingBottom: inputPadBottom }}
          maxLength={800}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
        />
      </KeyboardAvoidingView>

      {/* ─── Overlay sidebar ──────────────────────────────────── */}
      {drawerOpen && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} accessibilityLabel="Fermer">
          <View style={styles.drawerOverlay} />
        </Pressable>
      )}

      {/* ─── Sidebar Claude-style ─────────────────────────────── */}
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
        {/* Header sidebar */}
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerBrand}>
            <Text style={styles.drawerTitleSparkle}>{'✦ '}</Text>
            <Text style={styles.drawerTitleARIA}>{'Aria'}</Text>
          </Text>
          <View style={styles.drawerOrbWrap} pointerEvents="none">
            <AriaOrb state={isTyping ? 'thinking' : orbState} size={52} />
          </View>
          <View style={styles.drawerHeaderSpacer} />
        </View>

        {/* Filtres catégories */}
        <View style={styles.categories}>
          {(
            [
              { key: 'discussions', label: 'Discussions', Icon: MessageSquare, hasDot: false as const },
              { key: 'syntheses',   label: 'Documents',   Icon: FileText,       hasDot: false as const },
              { key: 'alertes',     label: 'Alertes',     Icon: Bell,           hasDot: true as const },
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
                  <Icon size={20} color={isActive ? ARIA_INDIGO : '#374151'} strokeWidth={2} />
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

        <View style={styles.drawerDivider} />

        <View style={styles.drawerBody}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: TAB_BAR_SCROLL_PADDING, paddingTop: 4 }}
            style={styles.drawerRecentsScroll}
          >
            {groupedConversations.length > 0 ? (
              groupedConversations.map((bucket) => (
                <View key={bucket.key} style={styles.recentsSection}>
                  <Text style={styles.recentsSectionLabel}>{bucket.label}</Text>
                  {bucket.items.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      activeOpacity={1}
                      onPressIn={() => setPressedConvId(c.id)}
                      onPressOut={() => setPressedConvId(null)}
                      onPress={() => loadConversation(c)}
                      style={[
                        styles.recentRow,
                        c.id === conversationId && styles.recentRowActive,
                        pressedConvId === c.id && styles.recentRowPressed,
                      ]}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[styles.recentRowTitle, c.id === conversationId && styles.recentRowTitleActive]}
                        numberOfLines={1}
                      >
                        {c.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            ) : (
              <Text style={styles.drawerEmpty}>Aucune conversation pour le moment</Text>
            )}
          </ScrollView>

          <View style={styles.drawerSearchBar}>
            <Animated.View style={[styles.liquidGlass, { width: searchWidthAnim }]}>
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

  topbar: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 10,
    paddingBottom: 10,
    ...Platform.select({
      android: { overflow: 'visible' as const },
      default: {},
    }),
  },
  topBtnFrame: { ...ariaTopBarStackFrame },
  topBtnShadow: { ...ariaTopBarStackShadow },

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
    fontFamily: FontFamily.sansBold,
    fontSize: 20,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  topSubtitle: {
    marginTop: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#94A3B8',
  },

  heroTitle: {
    marginTop: 18,
    fontFamily: FontFamily.displayBold,
    fontSize: 28,
    color: '#0F172A',
    letterSpacing: -0.6,
    textAlign: 'center',
  },

  // Suggestion cards — identiques à AriaHomeScreen
  // (paddingHorizontal:18 du ScrollView donne une largeur définie sur Android)
  suggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    alignContent: 'flex-start',
    width: '100%',
  },
  suggestionCardOuter: {
    width: '47%',
    minHeight: 80,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    justifyContent: 'center',
  },
  suggestionPressable: { flex: 1 },
  suggestionText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F1B2D',
  },

  // Overlay
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },

  // Drawer
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: SCREEN_BACKGROUND,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.06)',
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
  drawerBrand: { width: 100, fontFamily: FontFamily.displayBold, fontSize: 26, letterSpacing: 1 },
  drawerTitleSparkle: { color: ARIA_INDIGO, fontFamily: FontFamily.displayBold, fontSize: 26 },
  drawerTitleARIA: { color: ARIA_INDIGO, fontFamily: FontFamily.displayBold, fontSize: 26, letterSpacing: 1 },
  drawerOrbWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  drawerHeaderSpacer: { width: 100 },
  drawerBody: { flex: 1, paddingHorizontal: 8, flexDirection: 'column', justifyContent: 'flex-start' },
  drawerRecentsScroll: { flex: 1 },
  drawerSearchBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, alignItems: 'flex-start' },
  drawerEmpty: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
  },

  // Catégories
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
    backgroundColor: 'transparent',
  },
  categoryCell: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  categoryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  categoryRowActive: { backgroundColor: 'rgba(67, 56, 202, 0.08)' },
  categoryRowPressed: { backgroundColor: 'rgba(15, 23, 42, 0.05)' },
  categoryLabel: { fontFamily: FontFamily.sansMedium, fontSize: 14, color: '#1A2340', textAlign: 'center' },
  categoryLabelActive: { color: ARIA_INDIGO, fontFamily: FontFamily.sansSemiBold },
  alertDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: ARIA_INDIGO, marginLeft: 6 },

  drawerDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.07)', marginHorizontal: 20, marginVertical: 4 },

  // Conversations récentes — style Claude
  // TouchableOpacity + activeOpacity=1 + onPressIn/Out (fiable sur Android)
  recentsSection: { marginTop: 8 },
  recentsSectionLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: '#9ca3af',
    letterSpacing: 0.2,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  recentRow: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginHorizontal: 6,
    marginBottom: 1,
    backgroundColor: 'transparent',
  },
  // Même gris que ReglagesScreen (rgba 0.11) — visible sur fond clair
  recentRowActive:  { backgroundColor: 'rgba(15, 23, 42, 0.08)' },
  recentRowPressed: { backgroundColor: 'rgba(15, 23, 42, 0.11)' },
  recentRowTitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  recentRowTitleActive: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },

  // Pill recherche
  liquidGlass: {
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...nativeWhiteInteractiveShadow,
    ...androidFloatingWhitePill,
  },
  liquidGlassInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    columnGap: 8,
  },
  searchPillInput: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#374151',
    paddingVertical: 0,
  },
});
