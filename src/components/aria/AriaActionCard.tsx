/**
 * AriaActionCard — inline confirmation card for Aria-proposed actions.
 *
 * Renders inside the chat FlatList when Aria emits an ACTION tag.
 * The parent controls `status` to transition through: pending → loading → success | error.
 */

import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CalendarOff,
  Send,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { type AriaAction, formatAriaActionLabel } from '../../services/ariaActions';
import { FontFamily } from '../../hooks/useSolariaFonts';

// ─── Types ─────────────────────────────────────────────────

export interface AriaActionCardProps {
  action: AriaAction;
  onConfirm: () => void;
  onCancel: () => void;
  status: 'pending' | 'loading' | 'success' | 'error';
  resultMessage?: string;
}

// ─── Helpers ───────────────────────────────────────────────

function ActionIcon({ action, size, color }: { action: AriaAction; size: number; color: string }) {
  if (action.type === 'ABSENCE') {
    return <CalendarOff size={size} color={color} strokeWidth={2} />;
  }
  return <Send size={size} color={color} strokeWidth={2} />;
}

// ─── Component ─────────────────────────────────────────────

export default function AriaActionCard({
  action,
  onConfirm,
  onCancel,
  status,
  resultMessage,
}: AriaActionCardProps) {
  const { title, description } = formatAriaActionLabel(action);

  // ── success state ──────────────────────────────────────
  if (status === 'success') {
    return (
      <View style={[styles.card, styles.cardSuccess]}>
        <View style={styles.resultRow}>
          <CheckCircle size={20} color="#10B981" strokeWidth={2} />
          <Text style={[styles.resultText, { color: '#10B981' }]}>
            {resultMessage ?? 'Action exécutée avec succès.'}
          </Text>
        </View>
      </View>
    );
  }

  // ── error state ────────────────────────────────────────
  if (status === 'error') {
    return (
      <View style={[styles.card, styles.cardError]}>
        <View style={styles.resultRow}>
          <AlertCircle size={20} color="#EF4444" strokeWidth={2} />
          <Text style={[styles.resultText, { color: '#EF4444' }]}>
            {resultMessage ?? "Une erreur s'est produite."}
          </Text>
        </View>
      </View>
    );
  }

  // ── pending / loading state ────────────────────────────
  return (
    <View style={styles.card}>
      {/* Header row: icon + titles + Aria badge */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <ActionIcon action={action} size={18} color="#6366F1" />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.descriptionText} numberOfLines={2}>
            {description}
          </Text>
        </View>

        <View style={styles.ariaBadge}>
          <Text style={styles.ariaBadgeText}>Aria · Action</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Buttons / loading */}
      {status === 'loading' ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.loadingText}>Traitement en cours…</Text>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          {/* Cancel */}
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel="Annuler"
          >
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>

          {/* Confirm */}
          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [styles.confirmWrapper, pressed && { opacity: 0.88 }]}
            accessibilityRole="button"
            accessibilityLabel="Confirmer"
          >
            <LinearGradient
              colors={['#6366F1', '#22D3EE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmGradient}
            >
              <Text style={styles.confirmText}>Confirmer →</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 4,
    marginVertical: 6,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    // Aria-tinted shadow
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    ...Platform.select({ android: { elevation: 3 } }),
  },

  // ── Status variants ──
  cardSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    shadowColor: '#10B981',
  },
  cardError: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    shadowColor: '#EF4444',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  titleText: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  descriptionText: {
    marginTop: 2,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  ariaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    flexShrink: 0,
  },
  ariaBadgeText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: '#6366F1',
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: '#E0E7FF',
    marginVertical: 12,
  },

  // ── Buttons ──
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    backgroundColor: 'transparent',
  },
  cancelText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: '#6366F1',
  },
  confirmWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmGradient: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FFFFFF',
  },

  // ── Loading ──
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  loadingText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#6366F1',
  },

  // ── Result (success/error shared) ──
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
  },
  resultText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
