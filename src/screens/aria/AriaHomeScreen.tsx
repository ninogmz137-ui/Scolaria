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
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Plus,
  MessagesSquare,
  MessageCirclePlus,
  Send,
  MessageSquare,
  FileText,
  Bell,
  Search,
  Mic,
} from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import WallpaperBackground from '../../components/WallpaperBackground';
import { FLOATING_TAB_BAR_HEIGHT, TAB_BAR_SCROLL_PADDING } from '../../components/FloatingTabBar';
import { useActiveChild } from '../../contexts/ActiveChildContext';
import { useSchoolMode } from '../../contexts/SchoolModeContext';
import AddToDiscussionSheet from '../../components/chat/AddToDiscussionSheet';
import AriaOrb, { type AriaOrbState } from '../../components/AriaOrb';
import { SCREEN_BACKGROUND } from '../../constants/colors';

// ─── Constants ─────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;
const SEARCH_PILL_W = DRAWER_WIDTH - 32;
const ARIA_ALERTS_UNREAD = 2;

// ─── Demo recents data ──────────────────────────────────────
type RecentCategory = 'all' | 'discussions' | 'syntheses' | 'alertes';

type RecentItem = {
  id: string;
  title: string;
  time: string;
  updatedAt: string;
  category: 'discussions' | 'syntheses' | 'alertes';
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}
const _todayBase = new Date().toISOString().split('T')[0];

const MOCK_RECENTS: RecentItem[] = [
  { id: 'r1', title: 'Notes du 3ème trimestre',   time: '18h32', updatedAt: `${_todayBase}T18:32:00`, category: 'syntheses' },
  { id: 'r2', title: 'Score de Joie — analyse',   time: '14h10', updatedAt: `${_todayBase}T14:10:00`, category: 'alertes' },
  { id: 'r3', title: 'Devoirs de la semaine',      time: 'Mer',   updatedAt: daysAgoIso(3),            category: 'discussions' },
  { id: 'r4', title: 'Bilan semaine',              time: 'Mar',   updatedAt: daysAgoIso(4),            category: 'syntheses' },
  { id: 'r5', title: 'Interro SVT — révision',    time: 'Lun',   updatedAt: daysAgoIso(6),            category: 'alertes' },
  { id: 'r6', title: 'Progression annuelle',       time: '28 mar', updatedAt: '2026-03-28T10:00:00',  category: 'syntheses' },
  { id: 'r7', title: 'Conseil fractions',          time: '22 mar', updatedAt: '2026-03-22T10:00:00',  category: 'discussions' },
  { id: 'r8', title: 'Rencontre parents-profs',    time: '15 mar', updatedAt: '2026-03-15T10:00:00',  category: 'discussions' },
];

// ─── Types & persistence ────────────────────────────────────
type Conversation = {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
};

function keyForChild(childId: string) {
  return `@scolaria_aria_conversations:${childId}`;
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

// ─── Suggestions ────────────────────────────────────────────
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

// ─── Component ──────────────────────────────────────────────
export default function AriaHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { selectedChild } = useActiveChild();
  const { mode } = useSchoolMode();
  const childId = selectedChild?.id ?? '1';
  const childName = (selectedChild?.name ?? 'votre enfant').split(' ')[0];

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [input, setInput] = useState('');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecentCategory>('all');
  const [orbState, setOrbState] = useState<AriaOrbState>('idle');
  const searchInputRef = useRef<TextInput>(null);

  const suggestions = useMemo(() => makeSuggestions(childName, mode), [childName, mode]);

  const refresh = useCallback(async () => {
    const convs = await loadConversations(childId);
    setConversations(convs);
  }, [childId]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const createConversation = useCallback(
    async (initialMessage?: string) => {
      const now = new Date().toISOString();
      const newConv: Conversation = {
        id: `c_${Date.now()}`,
        title: `Conseils pour ${childName}`,
        lastMessage: 'Nouvelle conversation',
        updatedAt: now,
      };
      const next = [newConv, ...conversations];
      setConversations(next);
      await saveConversations(childId, next);
      navigation.navigate('AriaConversation', {
        conversationId: newConv.id,
        title: newConv.title,
        initialMessage,
      });
    },
    [childId, childName, conversations, navigation],
  );

  const sendFromHome = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setInput('');
      setOrbState('thinking');
      try {
        await createConversation(trimmed);
      } finally {
        setOrbState('idle');
      }
    },
    [createConversation],
  );

  // ─── Drawer slide animation (react-native Animated) ───────
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
    Animated.spring(searchWidthAnim, {
      toValue: 44,
      tension: 200,
      friction: 20,
      useNativeDriver: false,
    }).start();
  }, [searchWidthAnim]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    collapseSearch();
  }, [collapseSearch]);

  const expandSearch = useCallback(() => {
    Animated.spring(searchWidthAnim, {
      toValue: SEARCH_PILL_W,
      tension: 200,
      friction: 20,
      useNativeDriver: false,
    }).start();
    // Reveal content at ~halfway point of animation
    setTimeout(() => {
      setIsSearchExpanded(true);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }, 140);
  }, [searchWidthAnim]);

  const filteredRecents = useMemo(() => {
    let list = MOCK_RECENTS;
    if (selectedCategory !== 'all') {
      list = list.filter((r) => r.category === selectedCategory);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => r.title.toLowerCase().includes(q));
    }
    return list;
  }, [selectedCategory, searchQuery]);

  return (
    <View style={styles.root}>
      <WallpaperBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ─── Top bar ──────────────────────────────────────── */}
        <View style={[styles.topbar, { paddingTop: insets.top + 10 }]}>
          <Pressable
            onPress={() => setDrawerOpen(true)}
            style={({ pressed }) => [styles.topBtn, { opacity: pressed ? 0.75 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Historique"
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
            style={({ pressed }) => [styles.topBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Nouvelle discussion"
          >
            <MessageCirclePlus size={20} color="#0F172A" strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* ─── Hero ─────────────────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 44,
            paddingBottom: FLOATING_TAB_BAR_HEIGHT + TAB_BAR_SCROLL_PADDING,
            paddingHorizontal: 18,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <AriaOrb state={orbState} />
            <Text style={styles.heroTitle}>Comment puis-je t'aider ce soir ?</Text>
          </View>

          <View style={[styles.suggestionWrap, { marginTop: 26 }]}>
            {suggestions.map((s) => (
              <Pressable
                key={s}
                onPress={() => sendFromHome(s)}
                style={({ pressed }) => [styles.suggestionChip, pressed && { opacity: 0.86 }]}
              >
                <Text style={styles.suggestionText}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* ─── Input dock ───────────────────────────────────── */}
        <View style={[styles.inputDock, { paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10 }]}>
          <View style={styles.inputRow}>
            <Pressable
              onPress={() => setAddSheetOpen(true)}
              style={({ pressed }) => [styles.plusBtn, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel="Ajouter"
            >
              <Plus size={18} color="#64748B" strokeWidth={2.2} />
            </Pressable>
            <Pressable
              onPressIn={() => setOrbState('listening')}
              onPressOut={() =>
                setOrbState((s) => (s === 'thinking' ? 'thinking' : 'idle'))
              }
              style={({ pressed }) => [styles.plusBtn, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel="Microphone"
            >
              <Mic size={18} color="#64748B" strokeWidth={2.2} />
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

      {/* ─── Overlay ──────────────────────────────────────────── */}
      {drawerOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeDrawer}
          accessibilityLabel="Fermer"
        >
          <View style={styles.drawerOverlay} />
        </Pressable>
      )}

      {/* ─── Claude-style sidebar ─────────────────────────────── */}
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
            <AriaOrb state={orbState} size={52} />
          </View>
          <View style={styles.drawerHeaderSpacer} />
        </View>

        {/* Categories — filter buttons only, no navigation */}
        <View style={styles.categories}>
          {(
            [
              { key: 'discussions', label: 'Discussions', Icon: MessageSquare, hasDot: false as const },
              { key: 'syntheses',   label: 'Documents',   Icon: FileText, hasDot: false as const },
              { key: 'alertes',     label: 'Alertes',     Icon: Bell, hasDot: true as const },
            ] as const
          ).map(({ key, label, Icon, hasDot }) => {
            const isActive = selectedCategory === key;
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

        {/* Recents label */}
        <Text style={styles.recentsLabel}>RÉCENTS</Text>

        <View style={styles.drawerBody}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: TAB_BAR_SCROLL_PADDING }}
            style={styles.drawerRecentsScroll}
          >
            {filteredRecents.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => {
                  setDrawerOpen(false);
                  createConversation(r.title);
                }}
                style={({ pressed }) => [
                  styles.recentRow,
                  pressed && styles.recentRowPressed,
                ]}
              >
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {r.title}
                </Text>
                <Text style={styles.recentTime}>{r.time}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.drawerSearchBar}>
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
                  : {
                      backgroundColor: 'rgba(255,255,255,0.92)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.92)',
                    },
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

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SCREEN_BACKGROUND },

  // Top bar
  topbar: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 10,
    paddingBottom: 8,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select<any>({
      web: {
        backgroundColor: 'rgba(255,255,255,0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.7)',
      },
      ios: {
        backgroundColor: 'rgba(255,255,255,0.80)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        backgroundColor: 'rgba(255,255,255,0.80)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
        elevation: 0,
      },
      default: {
        backgroundColor: 'rgba(255,255,255,0.80)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.85)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
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

  heroTitle: {
    marginTop: 18,
    fontFamily: FontFamily.displayBold,
    fontSize: 28,
    color: '#0F172A',
    letterSpacing: -0.6,
    textAlign: 'center',
  },

  suggestionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignContent: 'flex-start',
    width: '100%',
  },
  suggestionChip: {
    width: '48%',
    minWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 0,
  },
  suggestionText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: '#475569',
  },

  // Input dock
  inputDock: { paddingHorizontal: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    columnGap: 8,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 28,
    paddingLeft: 12,
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

  // Overlay
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },

  // Drawer — light, Claude-style
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
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.10,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.10,
        shadowRadius: 20,
      },
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
  drawerTitleSparkle: {
    color: '#7C3AED',
    fontFamily: FontFamily.displayBold,
    fontSize: 26,
  },
  drawerTitleARIA: {
    color: '#7C3AED',
    fontFamily: FontFamily.displayBold,
    fontSize: 26,
    letterSpacing: 1,
  },
  drawerOrbWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerHeaderSpacer: {
    width: 100,
  },
  drawerBody: {
    flex: 1,
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  drawerRecentsScroll: {
    flexGrow: 1,
    flexShrink: 1,
  },
  drawerSearchBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: 'flex-start',
  },

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
  categoryRowActive: {
    backgroundColor: 'rgba(124,58,237,0.08)',
  },
  categoryRowPressed: {
    backgroundColor: 'rgba(124,58,237,0.04)',
  },
  categoryLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: '#1A2340',
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#7C3AED',
    fontFamily: FontFamily.sansSemiBold,
  },
  alertDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7C3AED',
    marginLeft: 6,
  },

  // Divider
  drawerDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginHorizontal: 20,
    marginVertical: 4,
  },

  // Recents
  recentsLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: '#9ca3af',
    letterSpacing: 0.84,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    columnGap: 8,
  },
  recentRowPressed: {
    backgroundColor: 'rgba(124,58,237,0.08)',
  },
  recentTitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  recentTime: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#9ca3af',
    flexShrink: 0,
  },

  liquidGlass: {
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.70)',
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
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: '#374151',
    paddingVertical: 0,
  },
});
