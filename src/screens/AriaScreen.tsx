import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily } from '../hooks/useSolariaFonts';
import WallpaperBackground from '../components/WallpaperBackground';
import UniversalInputBar from '../components/UniversalInputBar';
import {
  TAB_BAR_SCROLL_PADDING,
  FLAT_LIST_TAB_BAR_FOOTER_SPACER,
} from '../components/FloatingTabBar';
import { useKeyboardInputPadding } from '../hooks/useKeyboardInputPadding';
import ChatBubble, { Message } from '../components/chat/ChatBubble';
import { sendToAria, ClaudeMessage } from '../services/ariaApi';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useAuth } from '../contexts/AuthContext';

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
  useChildTheme(); // kept for future theme re-integration
  const navigation = useNavigation<any>();
  const { selectedChild } = useActiveChild();
  const { mode } = useSchoolMode();
  const { isDemo } = useAuth();
  const insets = useSafeAreaInsets();
  const inputPadBottom = useKeyboardInputPadding(insets.bottom);
  // Content starts below topbar (insets.top + topbar height + gap)
  const TOPBAR_BOTTOM = insets.top + 64;

  const childName = selectedChild?.name ?? 'votre enfant';
  const firstName = childName.split(' ')[0];
  const childId = selectedChild?.id ?? 'demo-lea';

  const [messages, setMessages] = useState<Message[]>([makeWelcomeMessage(firstName)]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Reset conversation when switching child
  const suggestions = makeSuggestions(firstName, mode);
  useEffect(() => {
    setMessages([makeWelcomeMessage(firstName)]);
    conversationHistoryRef.current = [];
  }, [childId, firstName]);

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
          { isDemo },
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

  const handleAriaAction = useCallback(
    (route: string) => {
      if (route === 'Notes' || route === 'Agenda') {
        navigation.navigate(route);
      } else {
        navigation.navigate('Accueil', { screen: route });
      }
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <ChatBubble message={item} onAction={handleAriaAction} />
    ),
    [handleAriaAction],
  );

  const typingMessage: Message = {
    id: 'typing',
    text: '',
    sender: 'aria',
    timestamp: '',
  };

  const rgb = hexToRgb('#4338CA');
  const accentBorder = rgb
    ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`
    : 'rgba(67,56,202,0.35)';

  return (
    <View style={styles.root}>
      <WallpaperBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            paddingTop: TOPBAR_BOTTOM,
            paddingBottom: TAB_BAR_SCROLL_PADDING,
          }}
          onContentSizeChange={scrollToEnd}
          ListHeaderComponent={
            /* Suggestions banner rendered inside the list so it scrolls with messages */
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={suggestions}
              keyExtractor={(item) => item}
              style={{ height: 56 }}
              contentContainerStyle={styles.suggestionsContainer}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.suggestionPill,
                    {
                      borderColor: accentBorder,
                      backgroundColor: 'rgba(255,255,255,0.50)',
                    },
                    isTyping && styles.suggestionPillDisabled,
                  ]}
                  onPress={() => handleSuggestionPress(item)}
                  disabled={isTyping}
                >
                  <Text
                    style={[
                      styles.suggestionText,
                      { color: '#64748B' },
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
            <>
              {isTyping ? (
                <ChatBubble message={typingMessage} isTyping />
              ) : null}
              <View style={{ height: FLAT_LIST_TAB_BAR_FOOTER_SPACER }} />
            </>
          }
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
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
        />
      </KeyboardAvoidingView>

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
  menuButton: {
    padding: 8,
  },
});
