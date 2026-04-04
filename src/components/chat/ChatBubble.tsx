import { Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Box, Text, HStack } from '../ui';
import { Colors } from '../../constants/colors';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import AriaAvatar from './AriaAvatar';
import TypingIndicator from './TypingIndicator';
import SimpleMarkdown from './SimpleMarkdown';

// ─── Action button config ─────────────────────────────────

const ACTION_BUTTONS: Record<string, { label: string; icon: string; route: string }> = {
  ABSENCE: { label: 'Signaler une absence', icon: '📋', route: 'SignalerAbsenceScreen' },
  MESSAGE: { label: 'Envoyer un message', icon: '💬', route: 'MessagerieHome' },
  NOTES:   { label: 'Voir les notes', icon: '📊', route: 'Notes' },
  AGENDA:  { label: "Voir l'agenda", icon: '📅', route: 'Agenda' },
};

const ACTION_TAG_PATTERN = /\[ACTION:(ABSENCE|MESSAGE|NOTES|AGENDA)\]/;

function parseActionTag(text: string): { cleanText: string; actionKey: string | null } {
  const match = ACTION_TAG_PATTERN.exec(text);
  if (!match) {
    return { cleanText: text, actionKey: null };
  }
  const cleanText = text.replace(match[0], '').trimEnd();
  return { cleanText, actionKey: match[1] };
}

// ─── Types ────────────────────────────────────────────────

export interface Message {
  id: string;
  text: string;
  sender: 'aria' | 'parent';
  timestamp: string;
}

interface Props {
  message: Message;
  isTyping?: boolean;
  onAction?: (route: string) => void;
}

// ─── Component ────────────────────────────────────────────

export default function ChatBubble({ message, isTyping, onAction }: Props) {
  useChildTheme(); // kept for future theme re-integration
  const isAria = message.sender === 'aria';

  const { cleanText, actionKey } = isAria && !isTyping
    ? parseActionTag(message.text)
    : { cleanText: message.text, actionKey: null };

  const actionConfig = actionKey ? ACTION_BUTTONS[actionKey] : null;

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
                backgroundColor: '#FFFFFF',
                borderBottomLeftRadius: 6,
              }
            : {
                backgroundColor: '#7C3AED',
                borderBottomRightRadius: 6,
              }),
        }}
      >
        {isAria && (
          <Text className="text-xs font-bold mb-1" style={{ color: '#7C3AED' }}>
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
          <>
            <SimpleMarkdown
              baseStyle={{
                fontSize: 15,
                lineHeight: 22,
                color: '#0F172A',
              }}
            >
              {cleanText}
            </SimpleMarkdown>
            {actionConfig && (
              <Pressable
                onPress={() => onAction?.(actionConfig.route)}
                style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1, marginTop: 8 })}
              >
                <LinearGradient
                  colors={['#7C3AED', '#06B6D4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 15 }}>{actionConfig.icon}</Text>
                  <Text
                    style={{
                      fontFamily: FontFamily.sansSemiBold,
                      fontSize: 13,
                      color: '#FFFFFF',
                    }}
                  >
                    {actionConfig.label}
                  </Text>
                </LinearGradient>
              </Pressable>
            )}
          </>
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
            color: isAria ? '#94A3B8' : 'rgba(255,255,255,0.6)',
            textAlign: isAria ? 'left' : 'right',
          }}
        >
          {message.timestamp}
        </Text>
      </Box>
    </HStack>
  );
}
