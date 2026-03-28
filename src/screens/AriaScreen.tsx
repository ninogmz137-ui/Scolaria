import { useState, useRef, useCallback, useEffect } from 'react';
import {
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import ChatBubble, { Message } from '../components/chat/ChatBubble';
import AriaAvatar from '../components/chat/AriaAvatar';
import { sendToAria, ClaudeMessage } from '../services/ariaApi';
import { useSchoolMode } from '../contexts/SchoolModeContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';

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

function makeSuggestions(childName: string): string[] {
  return [
    '📊 Résumé de la semaine',
    '📝 Préparer le contrôle de maths',
    '💡 Conseils pour progresser',
    `😊 Comment va ${childName} ?`,
    '🎯 Forces et faiblesses',
  ];
}

// ─── Component ────────────────────────────────────────────

export default function AriaScreen() {
  const { theme } = useChildTheme();
  const { selectedChild } = useActiveChild();
  const childName = selectedChild?.name ?? 'votre enfant';
  const childId = selectedChild?.id ?? '1';

  const [messages, setMessages] = useState<Message[]>([makeWelcomeMessage(childName)]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Reset conversation when switching child
  const suggestions = makeSuggestions(childName);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <HStack
        className="items-center px-4 py-3"
        style={{ borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}
      >
        <AriaAvatar size={40} />
        <VStack className="flex-1 ml-3">
          <Text className="text-[17px]" style={{ fontWeight: '800', color: theme.textPrimary }}>
            {theme.ariaLabel}
          </Text>
          <HStack className="items-center gap-[5px] mt-0.5">
            <Box
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: isTyping ? Colors.orange : Colors.green }}
            />
            <Text
              className="text-xs"
              style={{
                fontWeight: '500',
                color: isTyping ? Colors.orange : Colors.green,
              }}
            >
              {isTyping ? 'Réfléchit...' : 'En ligne'}
            </Text>
          </HStack>
        </VStack>
        <HStack className="items-center gap-2">
          <Box
            className="px-2 py-1 rounded-lg"
            style={{
              backgroundColor: 'rgba(109,40,217,0.2)',
              borderWidth: 1,
              borderColor: 'rgba(109,40,217,0.3)',
            }}
          >
            <Text className="text-[10px]" style={{ fontWeight: '700', color: Colors.violetLight }}>
              Claude Sonnet
            </Text>
          </Box>
          <Pressable className="p-2">
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color={Colors.gray}
            />
          </Pressable>
        </HStack>
      </HStack>

      {/* Suggestions banner */}
      <Box style={{ borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={suggestions}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          renderItem={({ item }) => (
            <Pressable
              className="rounded-full px-3.5 py-2 mr-2"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.cardBorder,
              }}
              onPress={() => handleSuggestionPress(item)}
              disabled={isTyping}
            >
              <Text
                className="text-[13px]"
                style={{
                  fontWeight: '500',
                  color: theme.textSecondary,
                  opacity: isTyping ? 0.4 : 1,
                }}
              >
                {item}
              </Text>
            </Pressable>
          )}
        />
      </Box>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
        onContentSizeChange={scrollToEnd}
        ListFooterComponent={
          isTyping ? (
            <ChatBubble message={typingMessage} isTyping />
          ) : null
        }
      />

      {/* Input bar */}
      <Box
        className="px-3 py-2.5"
        style={{ backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.cardBorder }}
      >
        <HStack
          className="items-end rounded-3xl pl-4 pr-1 py-1"
          style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
        >
          <TextInput
            style={{
              flex: 1,
              color: theme.textPrimary,
              fontSize: 15,
              maxHeight: 100,
              paddingVertical: 10,
            }}
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
              className="w-10 h-10 rounded-full justify-center items-center"
              style={{ backgroundColor: Colors.violet, opacity: isTyping ? 0.4 : 1 }}
              onPress={() => sendMessage()}
              disabled={isTyping}
            >
              <Ionicons name="send" size={20} color={Colors.white} />
            </Pressable>
          ) : (
            <Pressable className="w-10 h-10">
              <LinearGradient
                colors={[Colors.violet, Colors.violetDark]}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="mic" size={22} color={Colors.white} />
              </LinearGradient>
            </Pressable>
          )}
        </HStack>
      </Box>
    </KeyboardAvoidingView>
  );
}
