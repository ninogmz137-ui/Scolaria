import { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import ChatBubble, { Message } from '../components/chat/ChatBubble';
import AriaAvatar from '../components/chat/AriaAvatar';

// ─── Mock conversation ────────────────────────────────────

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    text: 'Bonjour ! Je suis Aria, ton assistante scolaire. Comment puis-je t\'aider aujourd\'hui ? 📚',
    sender: 'aria',
    timestamp: '09:00',
  },
  {
    id: '2',
    text: 'Lucas a un contrôle de maths vendredi, tu peux m\'aider à le préparer ?',
    sender: 'parent',
    timestamp: '09:01',
  },
  {
    id: '3',
    text: 'Bien sûr ! J\'ai analysé les dernières notes de Lucas en maths. Il maîtrise bien la géométrie (16/20) mais pourrait renforcer les fractions. Je te propose un plan de révision sur 3 jours. On commence ?',
    sender: 'aria',
    timestamp: '09:01',
  },
];

const ARIA_RESPONSES = [
  'D\'après les résultats de Lucas, je recommande de se concentrer sur les exercices de fractions et de proportionnalité. Voulez-vous que je génère des exercices personnalisés ?',
  'J\'ai remarqué que Lucas obtient de meilleurs résultats le matin. Peut-être planifier les révisions avant 10h serait bénéfique ?',
  'Les notes d\'Emma en anglais sont en progression constante ce trimestre. C\'est encourageant ! Souhaitez-vous voir le détail ?',
  'Je peux vous envoyer un résumé hebdomadaire des progrès de vos enfants chaque dimanche. Ça vous intéresse ?',
];

// ─── Component ────────────────────────────────────────────

export default function AriaScreen() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const responseIndex = useRef(0);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: 'parent',
      timestamp: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    scrollToEnd();

    // Simulate Aria typing
    setIsTyping(true);
    scrollToEnd();

    setTimeout(() => {
      const ariaMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: ARIA_RESPONSES[responseIndex.current % ARIA_RESPONSES.length],
        sender: 'aria',
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      responseIndex.current += 1;
      setIsTyping(false);
      setMessages((prev) => [...prev, ariaMsg]);
      scrollToEnd();
    }, 2000);
  }, [input, scrollToEnd]);

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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <AriaAvatar size={40} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>Aria ✦</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>En ligne</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.gray} />
        </TouchableOpacity>
      </View>

      {/* Suggestions banner */}
      <View style={styles.suggestionsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            '📊 Résumé de la semaine',
            '📝 Préparer un contrôle',
            '💡 Conseils pour Emma',
          ]}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.suggestionsContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionChip}
              onPress={() => {
                setInput(item);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToEnd}
        ListFooterComponent={
          isTyping ? (
            <ChatBubble message={typingMessage} isTyping />
          ) : null
        }
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Demandez à Aria..."
            placeholderTextColor={Colors.gray}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
          />
          {input.trim() ? (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendMessage}
              activeOpacity={0.7}
            >
              <Ionicons name="send" size={20} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.micButton} activeOpacity={0.7}>
              <LinearGradient
                colors={[Colors.violet, Colors.violetDark]}
                style={styles.micGradient}
              >
                <Ionicons name="mic" size={22} color={Colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueNight,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.white,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green,
  },
  statusText: {
    fontSize: 12,
    color: Colors.green,
    fontWeight: '500',
  },
  headerAction: {
    padding: 8,
  },
  // Suggestions
  suggestionsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  suggestionsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: Colors.blueNightCard,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: Colors.lightGray,
    fontWeight: '500',
  },
  // Messages
  messagesList: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  // Input bar
  inputBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: Colors.blueNight,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.blueNightCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    color: Colors.white,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 10,
  },
  sendButton: {
    backgroundColor: Colors.violet,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    width: 40,
    height: 40,
  },
  micGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
