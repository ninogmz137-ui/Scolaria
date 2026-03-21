import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
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
  const isAria = message.sender === 'aria';

  return (
    <View style={[styles.row, isAria ? styles.rowAria : styles.rowParent]}>
      {isAria && <AriaAvatar size={32} />}
      <View
        style={[
          styles.bubble,
          isAria ? styles.bubbleAria : styles.bubbleParent,
        ]}
      >
        {isAria && <Text style={styles.ariaName}>Aria ✦</Text>}
        {isTyping ? (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>Aria réfléchit</Text>
            <TypingIndicator />
          </View>
        ) : (
          <Text style={[styles.text, isAria ? styles.textAria : styles.textParent]}>
            {message.text}
          </Text>
        )}
        <Text
          style={[
            styles.timestamp,
            isAria ? styles.timestampAria : styles.timestampParent,
          ]}
        >
          {message.timestamp}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
    gap: 8,
  },
  rowAria: {
    justifyContent: 'flex-start',
  },
  rowParent: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleAria: {
    backgroundColor: Colors.blueNightCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 6,
  },
  bubbleParent: {
    backgroundColor: Colors.violet,
    borderBottomRightRadius: 6,
  },
  ariaName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.cyan,
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  textAria: {
    color: Colors.white,
  },
  textParent: {
    color: Colors.white,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
  },
  timestampAria: {
    color: Colors.gray,
  },
  timestampParent: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typingText: {
    fontSize: 14,
    color: Colors.gray,
    fontStyle: 'italic',
  },
});
