import { Box, Text, HStack } from '../ui';
import { Colors } from '../../constants/colors';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import AriaAvatar from './AriaAvatar';
import TypingIndicator from './TypingIndicator';

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
        ) : (
          <Text
            className="text-[15px]"
            style={{
              lineHeight: 22,
              color: isAria ? theme.textPrimary : Colors.white,
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
