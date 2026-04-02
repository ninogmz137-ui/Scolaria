import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Check, ChevronDown } from 'lucide-react-native';
import { tokens } from '../../tokens/colors';

interface SortOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface Props {
  options: SortOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  label?: string; // Optional trigger label, defaults to selected option label
}

export default function SortDropdown({ options, selectedValue, onSelect, label }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === selectedValue);

  return (
    <>
      {/* Trigger button */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={styles.trigger}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerText}>{label || selected?.label || 'Trier'}</Text>
        <ChevronDown size={16} color={tokens.textSecondary} />
      </TouchableOpacity>

      {/* Dropdown overlay */}
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <Animated.View
            entering={ZoomIn.duration(200).springify()}
            style={styles.dropdown}
          >
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.option}
                onPress={() => { onSelect(opt.value); setOpen(false); }}
                activeOpacity={0.6}
              >
                {opt.icon && <View style={styles.optionIcon}>{opt.icon}</View>}
                <Text style={[
                  styles.optionText,
                  opt.value === selectedValue && styles.optionTextActive,
                ]}>
                  {opt.label}
                </Text>
                {opt.value === selectedValue && (
                  <Check size={18} color={tokens.accent} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  triggerText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: tokens.textSecondary,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dropdown: {
    backgroundColor: tokens.surface,
    borderRadius: 14,
    paddingVertical: 6,
    width: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  optionIcon: {
    width: 24,
    alignItems: 'center',
  },
  optionText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: tokens.textPrimary,
    flex: 1,
  },
  optionTextActive: {
    fontFamily: 'DMSans_600SemiBold',
    color: tokens.accent,
  },
});
