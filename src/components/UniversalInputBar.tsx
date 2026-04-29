import { useCallback, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  type ViewStyle,
  type TextInputProps,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Mic, Send, ArrowUp } from 'lucide-react-native';
import {
  androidFloatingWhitePill,
  ARIA_GRADIENT_VIOLET,
  ARIA_GRADIENT_CYAN,
} from '../constants/theme';
import { FontFamily } from '../hooks/useSolariaFonts';
import AddToDiscussionSheet, { type AddAttachment } from './chat/AddToDiscussionSheet';

const BUBBLE_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: {
    elevation: 4,
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
});

export type UniversalInputBarProps = {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPressPlus: () => void;
  onPressMic: () => void;
  variant: 'human' | 'aria';
  /** Applied to the outer wrapper (e.g. padding bottom for tab bar). */
  containerStyle?: ViewStyle;
  onAttachmentPick?: (a: AddAttachment) => void;
  /** When set, mic uses press-in/out instead of onPress (e.g. hold-to-talk). */
  onMicPressIn?: () => void;
  onMicPressOut?: () => void;
} & Pick<TextInputProps, 'editable' | 'maxLength' | 'returnKeyType' | 'onSubmitEditing'>;

export default function UniversalInputBar({
  placeholder,
  value,
  onChangeText,
  onSend,
  onPressPlus,
  onPressMic,
  variant,
  containerStyle,
  onAttachmentPick,
  onMicPressIn,
  onMicPressOut,
  editable = true,
  maxLength,
  returnKeyType = 'default',
  onSubmitEditing,
}: UniversalInputBarProps) {
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const canSend = value.trim().length > 0;

  const openSheet = useCallback(() => {
    setAddSheetOpen(true);
    onPressPlus();
  }, [onPressPlus]);

  const handleAttachment = useCallback(
    (a: AddAttachment) => {
      onAttachmentPick?.(a);
    },
    [onAttachmentPick],
  );

  return (
    <View style={[styles.outer, containerStyle]}>
      <View
        style={[
          styles.bubble,
          BUBBLE_SHADOW,
          variant === 'aria' && styles.bubbleAria,
        ]}
      >
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          multiline
          style={[styles.input, variant === 'aria' && styles.inputAria]}
          editable={editable}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
        />

        <View style={[styles.actionsRow, variant === 'aria' && styles.actionsRowAria]}>
          <TouchableOpacity
            onPress={openSheet}
            style={styles.plusBtn}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Ajouter à la discussion"
          >
            <Plus size={18} color="#0F172A" strokeWidth={2} />
          </TouchableOpacity>

          <View style={styles.rightActions}>
            {onMicPressIn || onMicPressOut ? (
              <Pressable
                onPressIn={onMicPressIn}
                onPressOut={onMicPressOut}
                style={({ pressed }) => [styles.micBtn, pressed && { opacity: 0.82 }]}
                accessibilityRole="button"
                accessibilityLabel="Microphone"
              >
                <Mic size={16} color="#0F172A" strokeWidth={2} />
              </Pressable>
            ) : (
              <TouchableOpacity
                onPress={onPressMic}
                style={styles.micBtn}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Microphone"
              >
                <Mic size={16} color="#0F172A" strokeWidth={2} />
              </TouchableOpacity>
            )}

            {variant === 'aria' ? (
              canSend ? (
                <TouchableOpacity
                  onPress={onSend}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Envoyer"
                >
                  <LinearGradient
                    colors={[ARIA_GRADIENT_VIOLET, ARIA_GRADIENT_CYAN]}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sendAriaGradient}
                  >
                    <ArrowUp size={16} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.sendAriaDisabled}>
                  <ArrowUp size={16} color="#9CA3AF" strokeWidth={2.5} />
                </View>
              )
            ) : (
              <TouchableOpacity
                onPress={canSend ? onSend : undefined}
                disabled={!canSend}
                style={[
                  styles.sendBtnHuman,
                  canSend ? styles.sendBtnHumanActive : styles.sendBtnHumanDisabled,
                ]}
                activeOpacity={canSend ? 0.88 : 1}
                accessibilityRole="button"
                accessibilityLabel="Envoyer"
              >
                <Send
                  size={16}
                  color={canSend ? '#FFFFFF' : '#9CA3AF'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <AddToDiscussionSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onPick={handleAttachment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 12,
  },
  bubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 14,
    maxWidth: '100%',
  },
  /** Aria: moins de hauteur « vide » sous le placeholder (screenshots Android). */
  bubbleAria: {
    paddingTop: 8,
    paddingBottom: 6,
    ...androidFloatingWhitePill,
  },
  input: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 40,
    maxHeight: 120,
    paddingVertical: 4,
    textAlignVertical: 'top',
  },
  inputAria: {
    minHeight: 36,
    maxHeight: 100,
    paddingVertical: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionsRowAria: {
    marginTop: 4,
  },
  plusBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  micBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Aria send — gradient must live on LinearGradient (not parent backgroundColor). */
  sendAriaGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: ARIA_GRADIENT_VIOLET,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.45,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      default: {
        shadowColor: ARIA_GRADIENT_VIOLET,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.45,
        shadowRadius: 6,
      },
    }),
  },
  sendAriaDisabled: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnHuman: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnHumanActive: {
    backgroundColor: '#0F172A',
  },
  sendBtnHumanDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
