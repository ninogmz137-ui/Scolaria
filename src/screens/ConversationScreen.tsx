import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MoreHorizontal } from 'lucide-react-native';
import { SCREEN_BACKGROUND } from '../constants/colors';
import { FontFamily } from '../hooks/useSolariaFonts';
import UniversalInputBar from '../components/UniversalInputBar';
import { getInputBarPaddingBottom, TAB_BAR_SCROLL_PADDING } from '../components/FloatingTabBar';

type ConversationRow = {
  id: string;
  nom: string;
  matiere: string;
  avatar: string;
  avatarBg: string;
  preview: string;
  heure: string;
  nonLu: boolean;
};

type Bubble = {
  id: string;
  from: 'me' | 'them';
  text: string;
};

function nowStampFr(): string {
  const d = new Date();
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ConversationScreen({ route, navigation }: { route: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const conversation: ConversationRow | undefined = route?.params?.conversation;
  const title = conversation ? `${conversation.nom} · ${conversation.matiere}` : 'Conversation';

  const [signed, setSigned] = useState(false);
  const [signSheetOpen, setSignSheetOpen] = useState(false);
  const [signStamp, setSignStamp] = useState<string | null>(null);

  const [inputText, setInputText] = useState('');
  const [bubbles, setBubbles] = useState<Bubble[]>(
    useMemo(
      () => [
        { id: 'b1', from: 'them', text: 'Bonjour, petit rappel : merci de vérifier le devoir pour lundi.' },
        { id: 'b2', from: 'me', text: "Merci, c'est noté. Je regarde ce soir." },
        { id: 'b3', from: 'them', text: 'Aussi, un mot dans le cahier de liaison nécessite votre signature.' },
      ],
      [],
    ),
  );

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated }));
  }, []);

  const onSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setBubbles((prev) => [...prev, { id: `me-${Date.now()}`, from: 'me', text }]);
    setInputText('');
    scrollToBottom(true);
  }, [inputText, scrollToBottom]);

  const confirmSign = useCallback(() => {
    const stamp = nowStampFr();
    setSigned(true);
    setSignStamp(stamp);
    setSignSheetOpen(false);
  }, []);

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: Math.max(10, insets.top - 2) }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ChevronLeft size={18} color="rgba(15,23,42,0.75)" strokeWidth={2.4} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <Pressable
          onPress={() => {}}
          style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Actions"
        >
          <MoreHorizontal size={18} color="rgba(15,23,42,0.75)" strokeWidth={2.4} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={() => scrollToBottom(false)}
        >
          {!signed ? (
            <Pressable
              style={({ pressed }) => [styles.signPill, pressed && { opacity: 0.86, transform: [{ scale: 0.99 }] }]}
              onPress={() => setSignSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Signer ce mot"
            >
              <Text style={styles.signPillText}>Signer ce mot</Text>
            </Pressable>
          ) : signStamp ? (
            <View style={styles.signedRow}>
              <Text style={styles.signedText}>Signé · {signStamp}</Text>
            </View>
          ) : null}

          {bubbles.map((b) => (
            <View key={b.id} style={[styles.bubble, b.from === 'me' ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.bubbleText, b.from === 'me' && styles.bubbleTextMe]}>{b.text}</Text>
            </View>
          ))}
        </ScrollView>

        <UniversalInputBar
          placeholder="Répondre…"
          value={inputText}
          onChangeText={setInputText}
          onSend={onSend}
          onPressPlus={() => {}}
          onPressMic={() => {}}
          variant="aria"
          containerStyle={{ paddingBottom: getInputBarPaddingBottom(insets.bottom) }}
        />
      </KeyboardAvoidingView>

      <Modal visible={signSheetOpen} transparent animationType="fade" onRequestClose={() => setSignSheetOpen(false)}>
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSignSheetOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Signer ce mot</Text>

            <Pressable style={styles.sheetRow} onPress={confirmSign} accessibilityRole="button">
              <Text style={styles.sheetRowText}>Confirmer la signature</Text>
            </Pressable>
            <Pressable
              style={[styles.sheetRow, { borderBottomWidth: 0 }]}
              onPress={() => setSignSheetOpen(false)}
              accessibilityRole="button"
            >
              <Text style={[styles.sheetRowText, { color: 'rgba(15,23,42,0.55)' }]}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
  },
  backText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: 'rgba(15,23,42,0.70)',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: TAB_BAR_SCROLL_PADDING,
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: '75%',
    marginBottom: 10,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15,23,42,0.06)',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
  },
  bubbleText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 19,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
  },
  signPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 14,
  },
  signPillText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: '#0F172A',
    letterSpacing: -0.1,
  },
  signedRow: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  signedText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: 'rgba(15,23,42,0.55)',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 12,
    paddingBottom: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 22,
      },
      android: { elevation: 16 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 22,
      },
    }),
  },
  sheetHandle: {
    width: 34,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.14)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.05)',
    marginBottom: 2,
  },
  sheetRow: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  sheetRowText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: '#0F172A',
    letterSpacing: -0.15,
  },
});

