import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Papicons } from '@getpapillon/papicons';
import { Colors } from '../constants/colors';
import { FontFamily } from '../hooks/useSolariaFonts';
import WallpaperBackground from '../components/WallpaperBackground';
import GlassCard from '../components/GlassCard';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import ChatBubble, { Message } from '../components/chat/ChatBubble';
import AriaAvatar from '../components/chat/AriaAvatar';
import { sendToAria, ClaudeMessage } from '../services/ariaApi';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import ScreenHeader from '../components/ScreenHeader';

// ─── Helper: build welcome & suggestions per child ───────

function makeWelcomeMessage(childName: string): Message {
  return {
    id: '1',
    text: `Bonjour ! Je suis Aria ✦, ton assistante scolaire. J'ai accès au profil complet de ${childName} — notes, activités, bien-être. Pose-moi une question ! 📚`,
    sender: 'aria',
    timestamp: new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function makeSuggestions(childName: string, mode: string): string[] {
  if (mode === 'maternelle') {
    return [
      `🌈 Comment va ${childName} aujourd'hui ?`,
      '🎨 Activités de la semaine',
      '😊 Score de Joie',
      '🌱 Progrès récents',
      '👩‍🏫 Observation de la maîtresse',
    ];
  }
  if (mode === 'college' || mode === 'lycee') {
    return [
      '📊 Bilan de la semaine',
      '📝 Réviser pour le prochain contrôle',
      '📈 Évolution des notes',
      '🎯 Points forts et axes d\'amélioration',
      '🧠 Méthodes de travail',
    ];
  }
  // primaire (default)
  return [
    '📊 Résumé de la semaine',
    '📝 Préparer le contrôle de maths',
    '💡 Conseils pour progresser',
    `😊 Comment va ${childName} ?`,
    '🎯 Forces et faiblesses',
  ];
}

// ─── Helpers ──────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

// ─── Component ────────────────────────────────────────────

export default function AriaScreen() {
  const { theme } = useChildTheme();
  const { selectedChild } = useActiveChild();
  const { mode } = useSchoolMode();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;

  const childName = selectedChild?.name ?? 'votre enfant';
  const childId = selectedChild?.id ?? '1';

  const [messages, setMessages] = useState<Message[]>([makeWelcomeMessage(childName)]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Reset conversation when switching child
  const suggestions = makeSuggestions(childName, mode);
  useEffect(() => {
    setMessages([makeWelcomeMessage(childName)]);
    conversationHistoryRef.current = [];
  }, [childId, childName]);

  // Conversation history for Claude API (excludes welcome message)
  const conversationHistoryRef = useRef<ClaudeMessage[]>([]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const now = () =>
    new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const trimmed = (textOverride ?? input).trim();
      if (!trimmed || isTyping) return;

      // Add user message to UI
      const userMsg: Message = {
        id: Date.now().toString(),
        text: trimmed,
        sender: 'parent',
        timestamp: now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsTyping(true);
      scrollToEnd();

      try {
        // Call Claude API with conversation history
        const response = await sendToAria(
          trimmed,
          conversationHistoryRef.current,
          childId,
        );

        // Update conversation history
        conversationHistoryRef.current = [
          ...conversationHistoryRef.current,
          { role: 'user', content: trimmed },
          { role: 'assistant', content: response },
        ];

        // Keep last 20 messages to stay within context limits
        if (conversationHistoryRef.current.length > 20) {
          conversationHistoryRef.current =
            conversationHistoryRef.current.slice(-20);
        }

        // Add Aria response to UI
        const ariaMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: response,
          sender: 'aria',
          timestamp: now(),
        };

        setMessages((prev) => [...prev, ariaMsg]);
      } catch (error) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: '❌ Une erreur est survenue. Réessaie dans quelques instants.',
          sender: 'aria',
          timestamp: now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
        scrollToEnd();
      }
    },
    [input, isTyping, scrollToEnd, childId],
  );

  const handleSuggestionPress = useCallback(
    (suggestion: string) => {
      sendMessage(suggestion);
    },
    [sendMessage],
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => <ChatBubble message={item} />,
    [],
  );

  const typingMessage: Message = {
    id: 'typing',
    text: '',
    sender: 'aria',
    timestamp: '',
  };

  const cardText = theme.isDarkBg ? '#FFFFFF' : '#0F172A';
  const cardTextSecondary = theme.isDarkBg ? 'rgba(255,255,255,0.7)' : '#64748B';
  const cardTextMuted = theme.isDarkBg ? 'rgba(255,255,255,0.5)' : '#94A3B8';

  const rgb = hexToRgb(theme.accent);
  const accentBorder = rgb
    ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`
    : theme.cardBorder;

  return (
    <View style={styles.root}>
      <WallpaperBackground />
      <ScreenHeader heightRatio={0.25} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Messages list — scrolls under topbar, paddingTop pushes content below it */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={{
            paddingTop: TOPBAR_H + 8,
            paddingBottom: 8,
          }}
          onContentSizeChange={scrollToEnd}
          ListHeaderComponent={
            /* Suggestions banner rendered inside the list so it scrolls with messages */
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={suggestions}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.suggestionsContainer}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.suggestionPill,
                    {
                      borderColor: accentBorder,
                      backgroundColor: theme.isDarkBg
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(255,255,255,0.50)',
                    },
                    isTyping && styles.suggestionPillDisabled,
                  ]}
                  onPress={() => handleSuggestionPress(item)}
                  disabled={isTyping}
                >
                  <Text
                    style={[
                      styles.suggestionText,
                      { color: theme.isDarkBg ? 'rgba(255,255,255,0.7)' : theme.textSecondary },
                      isTyping && styles.textDisabled,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              )}
            />
          }
          ListFooterComponent={
            isTyping ? (
              <ChatBubble message={typingMessage} isTyping />
            ) : null
          }
        />

        {/* Glass input bar */}
        <View style={[styles.inputWrapper, { paddingBottom: FLOATING_TAB_BAR_HEIGHT + 8 }]}>
          <View
            style={[
              styles.inputRow,
              {
                borderColor: accentBorder,
                backgroundColor: theme.isDarkBg
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(255,255,255,0.55)',
              },
            ]}
          >
            <TextInput
              style={[styles.textInput, { color: theme.textPrimary }]}
              placeholder="Demandez à Aria..."
              placeholderTextColor={theme.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              onSubmitEditing={() => sendMessage()}
              editable={!isTyping}
            />
            {input.trim() ? (
              <Pressable
                style={[
                  styles.sendButton,
                  { backgroundColor: Colors.violet },
                  isTyping && styles.buttonDisabled,
                ]}
                onPress={() => sendMessage()}
                disabled={isTyping}
              >
                <Papicons name="Send" size={20} color={Colors.white} />
              </Pressable>
            ) : (
              <Pressable
                style={[
                  styles.sendButton,
                  { backgroundColor: Colors.violet },
                ]}
              >
                <Papicons name="Microphone" size={22} color={Colors.white} />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Glass header card — rendered last so it floats above the list */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        <GlassCard
          intensity="strong"
          borderRadius={20}
          noPadding
          style={styles.headerCard}
        >
          <View style={styles.headerInner}>
            {/* Avatar + name + status */}
            <AriaAvatar size={40} />
            <View style={styles.headerInfo}>
              <Text style={[styles.headerTitle, { color: cardText }]}>{theme.ariaLabel}</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isTyping ? Colors.orange : '#34D399' },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: isTyping ? Colors.orange : '#34D399' },
                  ]}
                >
                  {isTyping ? 'Réfléchit...' : 'En ligne'}
                </Text>
              </View>
            </View>
            {/* Claude Sonnet badge + menu */}
            <View style={styles.headerActions}>
              <View style={styles.modelBadge}>
                <Text style={styles.modelBadgeText}>Claude Sonnet</Text>
              </View>
              <Pressable style={styles.menuButton}>
                <Papicons name="Dots" size={20} color={theme.isDarkBg ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)'} />
              </Pressable>
            </View>
          </View>
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  // ── Messages ──
  messageList: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  // ── Suggestions ──
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  suggestionPill: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  suggestionPillDisabled: {
    opacity: 0.4,
  },
  suggestionText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
  },
  textDisabled: {
    opacity: 0.4,
  },
  // ── Input bar ──
  inputWrapper: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1.5,
    borderRadius: 28,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  textInput: {
    flex: 1,
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  // ── Floating glass header ──
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  headerCard: {
    // GlassCard handles its own shadow
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 17,
    color: '#0F172A',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelBadge: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modelBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
    color: '#6366F1',
  },
  menuButton: {
    padding: 8,
  },
});
