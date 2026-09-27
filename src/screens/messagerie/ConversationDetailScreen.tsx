/**
 * ConversationDetailScreen — WhatsApp-style message thread.
 *
 * - Receives conversationId via route.params
 * - Participant strip below the AppTopbar (name + role)
 * - Bubbles: parent = right navy #1A2340, other = left white
 * - Date separator between days ("Mercredi 8 avril")
 * - Input bar with Send button — appends bubble locally, no Supabase
 * - Keyboard pushes input bar up via KeyboardAvoidingView
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { School, CalendarX } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { getBottomBarScrollPadding } from '../../components/navigation/BottomBar';
import { useKeyboardInputPadding } from '../../hooks/useKeyboardInputPadding';
import UniversalInputBar from '../../components/UniversalInputBar';
import {
  getConversation,
  sendMessage as storeSendMessage,
  envoyerSeulementMoi,
} from '../../stores/messagerieStore';
import { autreResponsableDemo } from '../../data/demo/responsables';
import { Pressable } from '../../components/ui';
import { Lock, Check } from 'lucide-react-native';
import { SCREEN_BACKGROUND } from '../../constants/colors';
import type { Conversation, Message } from '../../data/messagerieData';
import { Text } from '../../components/ui';

// ─── Constants ────────────────────────────────────────────

const NAVY = '#0F172A';
const TOPBAR_BODY_HEIGHT = 50; // AppTopbar body without safe area inset

// ─── Helpers ─────────────────────────────────────────────

function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

interface BubbleGroup {
  date: string;
  messages: Message[];
}

function groupByDate(messages: Message[]): BubbleGroup[] {
  const groups: BubbleGroup[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.date === msg.date) {
      last.messages.push(msg);
    } else {
      groups.push({ date: msg.date, messages: [msg] });
    }
  }
  return groups;
}

// ─── StickyCTA ────────────────────────────────────────────

function StickyCTA({ conv, onPress }: { conv: Conversation; onPress: () => void }) {
  if (conv.urgency !== 'signer') return null;
  return (
    <View style={styles.stickyCTA}>
      <View style={styles.stickyCTABadge}>
        <Text style={styles.stickyCTABadgeText}>À SIGNER</Text>
      </View>
      <View style={{ flex: 1 }} />
      <TouchableOpacity style={styles.stickyCTABtn} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.stickyCTABtnText}>Signer</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Avatar (small, for participant strip) ────────────────

function SmallAvatar({ conv }: { conv: Conversation }) {
  if (conv.avatarType === 'school') {
    return (
      <View style={[styles.stripAvatar, { backgroundColor: '#DBEAFE' }]}>
        <School size={18} color="#2563EB" strokeWidth={1.8} />
      </View>
    );
  }
  if (conv.avatarType === 'absence') {
    return (
      <View style={[styles.stripAvatar, { backgroundColor: '#FEF3C7' }]}>
        <CalendarX size={18} color="#D97706" strokeWidth={1.8} />
      </View>
    );
  }
  const initials =
    conv.initials ??
    conv.name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  return (
    <View style={[styles.stripAvatar, { backgroundColor: NAVY }]}>
      <Text style={styles.stripAvatarText}>{initials}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────

export default function ConversationDetailScreen({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const insets = useSafeAreaInsets();
  const inputPadBottom = useKeyboardInputPadding(insets.bottom);
  const { conversationId } = route.params ?? {};

  const conv: Conversation | undefined = getConversation(conversationId);

  // Local message state — starts from store, appends on send
  const [messages, setMessages] = useState<Message[]>(conv?.messages ?? []);
  const [inputText, setInputText] = useState('');
  // « Seulement moi » (B4b) : depuis le fil famille, envoyer dans MON fil individuel avec l'enseignant.
  const [seulementMoi, setSeulementMoi] = useState(false);
  // L'autre responsable de l'enfant (démo). Même foyer : il partage le fil famille (« Seulement moi »
  // possible). Autre foyer (Emma, famille recomposée) : il a ses propres fils, ne voit rien des vôtres.
  const autreResp = autreResponsableDemo(conv?.childId);
  const autre = autreResp.prenom;
  const memeFoyer = autreResp.memeFoyer;
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), 80);
  }, []);

  // Scroll to bottom on mount
  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    setInputText('');

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const date = now.toISOString().split('T')[0];
    const newMsg: Message = {
      id: `sent-${Date.now()}`,
      sender: 'parent',
      text,
      time,
      date,
    };

    if (seulementMoi && conv?.portee === 'foyer') {
      const idIndividuel = envoyerSeulementMoi(conversationId, text);
      setSeulementMoi(false);
      if (idIndividuel) navigation.replace('ConversationDetailScreen', { conversationId: idIndividuel });
      return;
    }
    setMessages((prev) => [...prev, newMsg]);
    storeSendMessage(conversationId, text);
    scrollToBottom(true);
  }, [inputText, conversationId, scrollToBottom, seulementMoi, conv?.portee, navigation]);

  const groups = groupByDate(messages);

  // AppTopbar height = insets.top + TOPBAR_BODY_HEIGHT
  const topbarHeight = insets.top + TOPBAR_BODY_HEIGHT;

  return (
    <View style={styles.root}>
      {/* ── Spacer for AppTopbar ── */}
      <View style={{ height: topbarHeight }} />

      {/* ── Participant strip — name + role below topbar ── */}
      {conv && (
        <View style={styles.participantStrip}>
          <SmallAvatar conv={conv} />
          <View style={styles.participantInfo}>
            <Text
              style={styles.participantName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {conv.name}
            </Text>
            {conv.portee === 'foyer' ? (
              <Text style={styles.participantRole} numberOfLines={1}>{memeFoyer ? `Fil famille · vous et ${autre}` : 'Fil famille · votre foyer'}</Text>
            ) : conv.portee === 'individuel' ? (
              <View style={styles.porteeLigne}>
                <Lock size={12} color="#64748B" strokeWidth={2} />
                <Text style={styles.participantRole} numberOfLines={1}>{memeFoyer ? `Seulement vous · ${autre} ne voit pas ce fil` : 'Seulement vous'}</Text>
              </View>
            ) : conv.role ? (
              <Text
                style={styles.participantRole}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {conv.role}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {/* ── Chat area (messages + input) ── */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={[
            styles.messageListContent,
            { paddingBottom: getBottomBarScrollPadding(insets.bottom) },
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            // Only auto-scroll if near bottom (avoid interrupting user scrolling up)
          }}
        >
          {groups.map((group) => (
            <View key={group.date}>
              {/* Date separator */}
              <View style={styles.dateSep}>
                <View style={styles.dateSepLine} />
                <Text style={styles.dateSepText}>
                  {formatDateSeparator(group.date)}
                </Text>
                <View style={styles.dateSepLine} />
              </View>

              {/* Bubbles */}
              {group.messages.map((msg) => {
                const isParent = msg.sender === 'parent';
                // Fil famille : chaque message de parent affiche son auteur (« Vous », « Marc »).
                const auteur = isParent && conv?.portee === 'foyer' ? (msg.auteur === 'autre' ? autre : 'Vous') : null;
                return (
                  <View key={msg.id}>
                  {auteur && <Text style={styles.auteur}>{auteur}</Text>}
                  <View
                    style={[
                      styles.bubbleRow,
                      isParent ? styles.bubbleRowRight : styles.bubbleRowLeft,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        isParent ? styles.bubbleParent : styles.bubbleOther,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          isParent
                            ? styles.bubbleTextParent
                            : styles.bubbleTextOther,
                        ]}
                      >
                        {msg.text}
                      </Text>
                      <Text
                        style={[
                          styles.bubbleTime,
                          isParent
                            ? styles.bubbleTimeParent
                            : styles.bubbleTimeOther,
                        ]}
                      >
                        {msg.time}
                      </Text>
                    </View>
                  </View>
                  {!isParent && !!msg.envoyeAussiA?.length && (
                    <Text style={styles.envoyeAussi}>{`Envoyé aussi à ${msg.envoyeAussiA.join(', ')}`}</Text>
                  )}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={{ backgroundColor: 'transparent' }}>
          {conv && (
            <StickyCTA
              conv={conv}
              onPress={() => navigation.navigate('SignDoc', { conversationId: conv.id, docTitle: conv.name })}
            />
          )}
          {/* « Seulement moi » : utile seulement si un autre responsable partage VOTRE fil famille. */}
          {conv?.portee === 'foyer' && memeFoyer && (
            <View style={styles.optionEnvoi}>
              <Pressable
                onPress={() => setSeulementMoi((v) => !v)}
                style={[styles.seulementMoi, seulementMoi && styles.seulementMoiActif]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: seulementMoi }}
              >
                {seulementMoi ? <Check size={14} color="#FFFFFF" strokeWidth={2.5} /> : <Lock size={14} color={NAVY} strokeWidth={2} />}
                <Text style={[styles.seulementMoiTexte, seulementMoi && styles.seulementMoiTexteActif]}>Seulement moi</Text>
              </Pressable>
              <Text style={styles.optionTexte} numberOfLines={1}>
                {seulementMoi ? `${autre} ne verra pas ce message` : `Envoyé au fil famille (vous et ${autre})`}
              </Text>
            </View>
          )}
          <UniversalInputBar
            placeholder="Écrire un message…"
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSend}
            onPressPlus={() => {}}
            onPressMic={() => {}}
            variant="human"
            containerStyle={{
              paddingBottom: inputPadBottom,
              paddingHorizontal: 4,
            }}
            maxLength={2000}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SCREEN_BACKGROUND,
    maxWidth: '100%',
    overflow: 'hidden',
  },

  // Participant strip
  participantStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: SCREEN_BACKGROUND,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D5DB',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  stripAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: 12,
  },
  stripAvatarText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  participantInfo: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  participantName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    color: NAVY,
  },
  porteeLigne: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  auteur: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(15,23,42,0.55)',
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 2,
    marginRight: 4,
  },
  envoyeAussi: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(15,23,42,0.55)',
    marginLeft: 4,
    marginBottom: 4,
  },
  optionEnvoi: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  seulementMoi: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    minWidth: 44,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  seulementMoiActif: { backgroundColor: NAVY },
  seulementMoiTexte: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, color: NAVY },
  seulementMoiTexteActif: { color: '#FFFFFF' },
  optionTexte: { flex: 1, fontFamily: FontFamily.sansRegular, fontSize: 12, color: 'rgba(15,23,42,0.62)' },
  participantRole: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },

  // Chat area
  chatArea: {
    flex: 1,
  },

  // Messages
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    maxWidth: '100%',
  },

  // Date separator
  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dateSepLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#CBD5E1',
  },
  dateSepText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: '#94A3B8',
    marginHorizontal: 10,
  },

  // Bubbles
  bubbleRow: {
    marginBottom: 4,
    flexDirection: 'row',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  bubbleParent: {
    backgroundColor: NAVY,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: { elevation: 0 },
      default: {},
    }),
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextParent: {
    fontFamily: FontFamily.sansRegular,
    color: '#FFFFFF',
  },
  bubbleTextOther: {
    fontFamily: FontFamily.sansRegular,
    color: NAVY,
  },
  bubbleTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeParent: {
    fontFamily: FontFamily.sansRegular,
    color: 'rgba(255,255,255,0.55)',
  },
  bubbleTimeOther: {
    fontFamily: FontFamily.sansRegular,
    color: '#94A3B8',
  },

  // StickyCTA
  stickyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
    backgroundColor: '#FFFFFF',
  },
  stickyCTABadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(239,68,68,0.10)',
  },
  stickyCTABadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: '#EF4444',
    letterSpacing: 0.4,
  },
  stickyCTABtn: {
    height: 34,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyCTABtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },

});
