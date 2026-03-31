import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Box, Text, HStack } from '../ui';
import { Colors } from '../../constants/colors';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import AriaAvatar from './AriaAvatar';
import TypingIndicator from './TypingIndicator';
import Markdown from 'react-native-markdown-display';

export interface Message {
  id: string;
  text: string;
  sender: 'aria' | 'parent';
  timestamp: string;
}

interface Props {
  message: Message;
  isTyping?: boolean;
}

export default function ChatBubble({ message, isTyping }: Props) {
  const { theme } = useChildTheme();
  const isAria = message.sender === 'aria';

  const mdStyles = useMemo(
    () =>
      StyleSheet.create({
        body: { fontSize: 15, lineHeight: 22, color: isAria ? theme.textPrimary : Colors.white },
        heading2: { fontSize: 16, fontWeight: '700', color: isAria ? theme.textPrimary : Colors.white, marginTop: 8, marginBottom: 4 },
        heading3: { fontSize: 15, fontWeight: '700', color: isAria ? theme.textPrimary : Colors.white, marginTop: 6, marginBottom: 2 },
        strong: { fontWeight: '700' },
        em: { fontStyle: 'italic' },
        bullet_list: { marginVertical: 4 },
        ordered_list: { marginVertical: 4 },
        list_item: { marginVertical: 1 },
        paragraph: { marginTop: 0, marginBottom: 6 },
        link: { color: theme.accent },
      }),
    [isAria, theme],
  );

  return (
    <HStack
      className="mb-3 px-4 items-end gap-2"
      style={{ justifyContent: isAria ? 'flex-start' : 'flex-end' }}
    >
      {isAria && <AriaAvatar size={32} />}
      <Box
        className="rounded-2xl px-4 py-3"
        style={{
          maxWidth: '75%',
          ...(isAria
            ? {
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.cardBorder,
                borderBottomLeftRadius: 6,
              }
            : {
                backgroundColor: theme.accent,
                borderBottomRightRadius: 6,
              }),
        }}
      >
        {isAria && (
          <Text className="text-xs font-bold mb-1" style={{ color: theme.accent }}>
            Aria ✦
          </Text>
        )}
        {isTyping ? (
          <HStack className="items-center gap-1.5">
            <Text className="text-sm italic" style={{ color: Colors.textSecondary }}>
              Aria réfléchit
            </Text>
            <TypingIndicator />
          </HStack>
        ) : isAria ? (
          <Markdown style={mdStyles}>{message.text}</Markdown>
        ) : (
          <Text
            className="text-[15px]"
            style={{
              lineHeight: 22,
              color: Colors.white,
            }}
          >
            {message.text}
          </Text>
        )}
        <Text
          className="text-[11px] mt-1.5"
          style={{
            color: isAria ? theme.textMuted : 'rgba(255,255,255,0.6)',
            textAlign: isAria ? 'left' : 'right',
          }}
        >
          {message.timestamp}
        </Text>
      </Box>
    </HStack>
  );
}
