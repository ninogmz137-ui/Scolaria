import { useState, useRef, useEffect, useCallback } from 'react';
import { FontFamily } from '../../hooks/useSolariaFonts';
import {
  ScrollView,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box, Text, Pressable, HStack, VStack } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { Colors, SCREEN_BACKGROUND } from '../../constants/colors';
import { getConversations, sendMessage, markConversationRead, type ConversationData } from '../../services/teacherService';
import { TAB_BAR_SCROLL_PADDING, getTeacherInputBarPaddingBottom } from '../../components/FloatingTabBar';
import UniversalInputBar from '../../components/UniversalInputBar';

const TEACHER_ORANGE = '#FF8C42';

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
});

// ─── Types ────────────────────────────────────────────────

interface Message {
  id: string;
  from: 'teacher' | 'parent';
  text: string;
  time: string;
  read: boolean;
}

interface Conversation {
  id: string;
  studentCode: string;
  studentAvatar: string;
  parentName: string;
  parentAvatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: Message[];
  pinned: boolean;
}

// ─── Mock data ────────────────────────────────────────────

const CONVERSATIONS: Conversation[] = [
  {
    id: '1', studentCode: 'Élève 02', studentAvatar: '👧', parentName: 'M. et Mme Laurent', parentAvatar: '👨‍👩‍👧',
    lastMessage: 'Merci pour votre retour sur Emma. On va surveiller ça à la maison aussi.',
    lastTime: '14:32', unread: 2, pinned: true,
    messages: [
      { id: 'm1', from: 'teacher', text: 'Bonjour, je souhaitais vous informer qu\'Emma semble un peu plus fatiguée cette semaine. Son Score de Joie a baissé. Tout va bien à la maison ?', time: 'Hier 09:15', read: true },
      { id: 'm2', from: 'parent', text: 'Merci de nous prévenir. Elle a eu du mal à dormir ces derniers jours, on pense que c\'est le changement d\'heure.', time: 'Hier 12:30', read: true },
      { id: 'm3', from: 'teacher', text: 'D\'accord, je vais faire attention à elle en classe. N\'hésitez pas si vous avez besoin.', time: 'Hier 14:00', read: true },
      { id: 'm4', from: 'parent', text: 'Merci pour votre retour sur Emma. On va surveiller ça à la maison aussi.', time: '14:20', read: false },
      { id: 'm5', from: 'parent', text: 'Est-ce qu\'elle participe bien en classe malgré tout ?', time: '14:32', read: false },
    ],
  },
  {
    id: '2', studentCode: 'Élève 05', studentAvatar: '👦', parentName: 'Mme Petit', parentAvatar: '👩',
    lastMessage: 'Le rendez-vous est pris pour jeudi 16h. Merci.',
    lastTime: 'Hier', unread: 0, pinned: true,
    messages: [
      { id: 'm1', from: 'teacher', text: 'Bonjour Mme Petit, je souhaiterais vous rencontrer pour discuter des progrès d\'Adam. Êtes-vous disponible cette semaine ?', time: 'Lundi 10:00', read: true },
      { id: 'm2', from: 'parent', text: 'Bonjour, oui je suis disponible jeudi après 16h.', time: 'Lundi 18:45', read: true },
      { id: 'm3', from: 'teacher', text: 'Parfait, je vous attends jeudi à 16h dans ma classe. À bientôt !', time: 'Mardi 08:30', read: true },
      { id: 'm4', from: 'parent', text: 'Le rendez-vous est pris pour jeudi 16h. Merci.', time: 'Hier 09:00', read: true },
    ],
  },
  {
    id: '3', studentCode: 'Élève 04', studentAvatar: '👧', parentName: 'M. Durand', parentAvatar: '👨',
    lastMessage: 'Super nouvelle ! On est très fiers d\'elle.',
    lastTime: 'Hier', unread: 1, pinned: false,
    messages: [
      { id: 'm1', from: 'teacher', text: 'Bonjour M. Durand, je voulais vous partager que Léa a obtenu un excellent résultat en mathématiques ! Elle a beaucoup progressé.', time: 'Hier 11:00', read: true },
      { id: 'm2', from: 'parent', text: 'Super nouvelle ! On est très fiers d\'elle.', time: 'Hier 19:30', read: false },
    ],
  },
  {
    id: '4', studentCode: 'Élève 07', studentAvatar: '👦', parentName: 'M. et Mme Bernard', parentAvatar: '👨‍👩‍👦',
    lastMessage: 'L\'autorisation de sortie est signée, je l\'envoie demain.',
    lastTime: 'Lun.', unread: 0, pinned: false,
    messages: [
      { id: 'm1', from: 'teacher', text: 'Rappel : l\'autorisation pour la sortie au musée doit être signée avant mercredi.', time: 'Lundi 08:00', read: true },
      { id: 'm2', from: 'parent', text: 'L\'autorisation de sortie est signée, je l\'envoie demain.', time: 'Lundi 20:15', read: true },
    ],
  },
  {
    id: '5', studentCode: 'Élève 13', studentAvatar: '👦', parentName: 'Mme Garcia', parentAvatar: '👩',
    lastMessage: 'On en parlera au prochain rendez-vous.',
    lastTime: 'Dim.', unread: 0, pinned: false,
    messages: [
      { id: 'm1', from: 'parent', text: 'Bonjour, j\'ai remarqué qu\'Hugo avait des difficultés en lecture ce week-end.', time: 'Dimanche 10:00', read: true },
      { id: 'm2', from: 'teacher', text: 'Merci de me le signaler. Je vais lui proposer des exercices adaptés. On en parlera au prochain rendez-vous.', time: 'Dimanche 18:00', read: true },
      { id: 'm3', from: 'parent', text: 'On en parlera au prochain rendez-vous.', time: 'Dimanche 18:30', read: true },
    ],
  },
  {
    id: '6', studentCode: 'Élève 16', studentAvatar: '👧', parentName: 'Mme Roux', parentAvatar: '👩',
    lastMessage: 'Merci, bonne semaine !',
    lastTime: 'Ven.', unread: 0, pinned: false,
    messages: [
      { id: 'm1', from: 'teacher', text: 'Bilan de la semaine : Chloé a bien participé et ses résultats sont en progression.', time: 'Vendredi 16:30', read: true },
      { id: 'm2', from: 'parent', text: 'Merci, bonne semaine !', time: 'Vendredi 18:00', read: true },
    ],
  },
];

// ─── Component ────────────────────────────────────────────

export default function MessagerieParentsScreen() {
  const insets = useSafeAreaInsets();
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [conversations, setConversations] = useState(CONVERSATIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadConversations = useCallback(async () => {
    const data = await getConversations();
    if (data.length > 0) {
      setConversations(data.map((c) => ({
        id: c.id,
        studentCode: c.studentCode,
        studentAvatar: c.studentAvatar,
        parentName: c.parentName,
        parentAvatar: c.parentAvatar,
        lastMessage: c.lastMessage,
        lastTime: c.lastTime,
        unread: c.unread,
        pinned: c.pinned,
        messages: c.messages.map((m) => ({
          id: m.id,
          from: m.from,
          text: m.text,
          time: m.time,
          read: m.read,
        })),
      })));
    }
  }, []);

  useEffect(() => {
    loadConversations();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const totalUnread = conversations.reduce((a, c) => a + c.unread, 0);

  const filtered = conversations.filter(c =>
    c.studentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.parentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedConvs = filtered.filter(c => c.pinned);
  const otherConvs = filtered.filter(c => !c.pinned);

  const handleSend = async () => {
    if (!messageText.trim() || !selectedConv) return;
    const text = messageText.trim();
    setMessageText('');

    // Optimistic UI update
    const newMsg: Message = {
      id: `new-${Date.now()}`,
      from: 'teacher',
      text,
      time: 'À l\'instant',
      read: true,
    };
    setConversations(prev => prev.map(c =>
      c.id === selectedConv.id
        ? { ...c, messages: [...c.messages, newMsg], lastMessage: newMsg.text, lastTime: 'À l\'instant' }
        : c
    ));
    setSelectedConv(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : null);

    // Persist to Supabase
    await sendMessage(selectedConv.id, text);
  };

  const handleMarkRead = async (convId: string) => {
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, unread: 0, messages: c.messages.map(m => ({ ...m, read: true })) } : c
    ));
    await markConversationRead(convId);
  };

  // ─── Chat view ────────────────────────────
  if (selectedConv) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#E8EDF5' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {/* Chat header */}
        <HStack className="items-center gap-3 px-4 py-3.5" style={{ backgroundColor: SCREEN_BACKGROUND, borderBottomWidth: 1, borderBottomColor: '#EEF0F5' }}>
          <Pressable onPress={() => setSelectedConv(null)} className="p-1">
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </Pressable>
          <Text className="text-[28px]">{selectedConv.studentAvatar}</Text>
          <VStack className="flex-1">
            <Text className="text-[15px] font-bold" style={{ color: '#0F172A' }}>{selectedConv.studentCode}</Text>
            <Text className="text-[11px]" style={{ color: '#64748B' }}>{selectedConv.parentName}</Text>
          </VStack>
          <Pressable>
            <Ionicons name="ellipsis-vertical" size={20} color="#94A3B8" />
          </Pressable>
        </HStack>

        {/* Messages */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[{ padding: 16, gap: 8 }, { paddingBottom: TAB_BAR_SCROLL_PADDING }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Date separator */}
          <HStack className="items-center gap-2.5 my-2">
            <Box className="flex-1 h-px" style={{ backgroundColor: '#EEF0F5' }} />
            <Text className="text-[11px]" style={{ color: '#94A3B8' }}>Conversation</Text>
            <Box className="flex-1 h-px" style={{ backgroundColor: '#EEF0F5' }} />
          </HStack>

          {selectedConv.messages.map((msg) => {
            const isTeacher = msg.from === 'teacher';
            return (
              <Box
                key={msg.id}
                className="max-w-[80%] p-3 rounded-2xl mb-1"
                style={{
                  alignSelf: isTeacher ? 'flex-end' : 'flex-start',
                  backgroundColor: isTeacher ? TEACHER_ORANGE : SCREEN_BACKGROUND,
                  borderBottomRightRadius: isTeacher ? 4 : 16,
                  borderBottomLeftRadius: isTeacher ? 16 : 4,
                  ...(isTeacher ? {} : { borderWidth: 1, borderColor: '#EEF0F5' }),
                }}
              >
                {!isTeacher && <Text className="text-[11px] font-semibold mb-1" style={{ color: Colors.cyanDark }}>{selectedConv.parentName}</Text>}
                <Text className="text-sm leading-5" style={{ color: isTeacher ? Colors.white : '#0F172A' }}>{msg.text}</Text>
                <HStack className="items-center gap-1 mt-1.5 justify-end">
                  <Text className="text-[10px]" style={{ color: isTeacher ? 'rgba(255,255,255,0.6)' : '#94A3B8' }}>{msg.time}</Text>
                  {isTeacher && (
                    <Ionicons name={msg.read ? 'checkmark-done' : 'checkmark'} size={14} color={msg.read ? Colors.cyan : 'rgba(255,255,255,0.4)'} />
                  )}
                </HStack>
              </Box>
            );
          })}
        </ScrollView>

        <View style={{ backgroundColor: 'transparent' }}>
          <UniversalInputBar
            placeholder="Écrire un message..."
            value={messageText}
            onChangeText={setMessageText}
            onSend={handleSend}
            onPressPlus={() => {}}
            onPressMic={() => {}}
            variant="human"
            containerStyle={{
              paddingHorizontal: 8,
              paddingBottom: getTeacherInputBarPaddingBottom(insets.bottom),
            }}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ─── Conversation list ────────────────────
  const renderConvRow = (conv: Conversation, i: number, total: number) => (
    <Pressable
      key={conv.id}
      onPress={() => { setSelectedConv(conv); handleMarkRead(conv.id); }}
      className="p-3.5"
      style={[
        { flexDirection: 'row', gap: 12 },
        i < total - 1 ? { borderBottomWidth: 1, borderBottomColor: '#EEF0F5' } : undefined,
      ]}
    >
      <Box className="relative">
        <Text className="text-[30px]">{conv.studentAvatar}</Text>
        {conv.unread > 0 && (
          <Box className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-[9px] justify-center items-center" style={{ backgroundColor: TEACHER_ORANGE }}>
            <Text className="text-[10px] font-extrabold" style={{ color: Colors.white }}>{conv.unread}</Text>
          </Box>
        )}
      </Box>
      <VStack className="flex-1">
        <HStack className="justify-between items-center">
          <Text className="text-sm font-bold" style={{ color: conv.unread > 0 ? '#0F172A' : '#64748B' }}>{conv.studentCode}</Text>
          <Text className="text-[11px]" style={{ color: conv.unread > 0 ? TEACHER_ORANGE : '#94A3B8' }}>{conv.lastTime}</Text>
        </HStack>
        <Text className="text-[11px] mt-[1px]" style={{ color: '#64748B' }}>{conv.parentName}</Text>
        <Text className="text-[13px] mt-1" style={{ color: conv.unread > 0 ? '#0F172A' : '#94A3B8', fontFamily: conv.unread > 0 ? FontFamily.sansSemiBold : FontFamily.sansRegular }} numberOfLines={1}>
          {conv.lastMessage}
        </Text>
      </VStack>
    </Pressable>
  );

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#E8EDF5', opacity: fadeAnim }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SCROLL_PADDING }}
      >
        {/* Header info */}
        <HStack className="items-center gap-3.5 m-5 mb-3 p-4 rounded-2xl" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
          <Box className="w-11 h-11 rounded-[22px] justify-center items-center" style={{ backgroundColor: TEACHER_ORANGE + '15' }}>
            <Ionicons name="chatbubbles" size={24} color={TEACHER_ORANGE} />
          </Box>
          <VStack className="flex-1">
            <Text className="text-base font-extrabold" style={{ color: '#0F172A' }}>Messagerie parents</Text>
            <Text className="text-xs mt-0.5" style={{ color: '#64748B' }}>
              {totalUnread > 0 ? `${totalUnread} message${totalUnread > 1 ? 's' : ''} non lu${totalUnread > 1 ? 's' : ''}` : 'Toutes les conversations sont lues'}
            </Text>
          </VStack>
        </HStack>

        {/* Search */}
        <HStack className="items-center gap-2.5 mx-5 mb-3 p-3 rounded-[14px]" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: '#0F172A', padding: 0 }}
            placeholder="Rechercher un élève ou parent..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          )}
        </HStack>

        {/* Quick stats */}
        <HStack className="gap-2.5 mx-5 mb-4">
          <VStack className="flex-1 items-center p-3 rounded-[14px]" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
            <Text className="text-xl font-black" style={{ color: TEACHER_ORANGE }}>{conversations.length}</Text>
            <Text className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>Conversations</Text>
          </VStack>
          <VStack className="flex-1 items-center p-3 rounded-[14px]" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
            <Text className="text-xl font-black" style={{ color: totalUnread > 0 ? Colors.red : Colors.green }}>{totalUnread}</Text>
            <Text className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>Non lus</Text>
          </VStack>
          <VStack className="flex-1 items-center p-3 rounded-[14px]" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
            <Text className="text-xl font-black" style={{ color: Colors.cyan }}>{pinnedConvs.length}</Text>
            <Text className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>Épinglées</Text>
          </VStack>
        </HStack>

        {/* Pinned */}
        {pinnedConvs.length > 0 && (
          <>
            <HStack className="items-center gap-2 mb-2 px-6">
              <Box style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: TEACHER_ORANGE }} />
              <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>📌 ÉPINGLÉES</Text>
            </HStack>
            <Box className="mx-5 mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
              {pinnedConvs.map((conv, i) => renderConvRow(conv, i, pinnedConvs.length))}
            </Box>
          </>
        )}

        {/* All conversations */}
        <HStack className="items-center gap-2 mb-2 px-6">
          <Box style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: TEACHER_ORANGE }} />
          <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>TOUTES LES CONVERSATIONS</Text>
        </HStack>
        <Box className="mx-5 mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: SCREEN_BACKGROUND, borderWidth: 1.5, borderColor: '#EEF0F5', ...CARD_SHADOW }}>
          {otherConvs.length === 0 && (
            <VStack className="items-center p-[30px] gap-2">
              <Text className="text-[30px]">💬</Text>
              <Text className="text-sm" style={{ color: '#64748B' }}>Aucune conversation trouvée</Text>
            </VStack>
          )}
          {otherConvs.map((conv, i) => renderConvRow(conv, i, otherConvs.length))}
        </Box>

        {/* New conversation button */}
        <Pressable className="mx-5 p-3.5 rounded-[14px] mb-4" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: TEACHER_ORANGE + '40' }}>
          <Ionicons name="create" size={20} color={TEACHER_ORANGE} />
          <Text className="text-sm font-semibold" style={{ color: TEACHER_ORANGE }}>Nouvelle conversation</Text>
        </Pressable>

        {/* RGPD notice */}
        <HStack className="items-start gap-2 mx-5 p-3 rounded-xl" style={{ backgroundColor: Colors.green + '08' }}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.green} />
          <Text className="flex-1 text-[11px] leading-4" style={{ color: '#64748B' }}>
            Les messages sont chiffrés et conservés 12 mois. Les parents peuvent exporter leurs conversations via l'export RGPD.
          </Text>
        </HStack>

        <Box className="h-10" />
      </ScrollView>
    </Animated.View>
  );
}
