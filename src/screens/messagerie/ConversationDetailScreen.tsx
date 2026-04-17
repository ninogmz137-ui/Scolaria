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
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { School, CalendarX } from 'lucide-react-native';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { getInputBarPaddingBottom, TAB_BAR_SCROLL_PADDING } from '../../components/FloatingTabBar';
import UniversalInputBar from '../../components/UniversalInputBar';
import {
  getConversation,
  sendMessage as storeSendMessage,
} from '../../stores/messagerieStore';
import { SCREEN_BACKGROUND } from '../../constants/colors';
import type { Conversation, Message } from '../../data/messagerieData';

// ─── Constants ────────────────────────────────────────────

const NAVY = '#1A2340';
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
}: {
  route: any;
  navigation: any;
}) {
  const insets = useSafeAreaInsets();
  const { conversationId } = route.params ?? {};

  const conv: Conversation | undefined = getConversation(conversationId);

  // Local message state — starts from store, appends on send
  const [messages, setMessages] = useState<Message[]>(conv?.messages ?? []);
  const [inputText, setInputText] = useState('');
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

    setMessages((prev) => [...prev, newMsg]);
    storeSendMessage(conversationId, text);
    scrollToBottom(true);
  }, [inputText, conversationId, scrollToBottom]);

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
            {conv.role ? (
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
          contentContainerStyle={styles.messageListContent}
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
                return (
                  <View
                    key={msg.id}
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
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={{ backgroundColor: 'transparent' }}>
          <UniversalInputBar
            placeholder="Écrire un message…"
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSend}
            onPressPlus={() => {}}
            onPressMic={() => {}}
            variant="human"
            containerStyle={{
              paddingBottom: getInputBarPaddingBottom(insets.bottom),
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
    backgroundColor: '#EEF2F7',
    maxWidth: '100%',
    overflow: 'hidden',
  },

  // Participant strip
  participantStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    paddingBottom: TAB_BAR_SCROLL_PADDING,
    maxWidth: '100%',
  },

  // Date separator
  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
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
    borderRadius: 20,
    overflow: 'hidden',
  },
  bubbleParent: {
    backgroundColor: NAVY,
    borderBottomRightRadius: 5,
  },
  bubbleOther: {
    backgroundColor: SCREEN_BACKGROUND,
    borderBottomLeftRadius: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
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

});
