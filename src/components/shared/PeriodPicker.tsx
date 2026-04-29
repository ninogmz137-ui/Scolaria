import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Calendar, Check, ChevronDown } from 'lucide-react-native';
import { tokens } from '../../tokens/colors';

interface PeriodOption {
  label: string;
  value: string;
  dates: string;        // e.g. "sept. 2025 - nov. 2025"
  number?: number;      // Trimester number (1, 2, 3) for icon
}

interface Props {
  options: PeriodOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export default function PeriodPicker({ options, selectedValue, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === selectedValue);

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.trigger} activeOpacity={0.7}>
        <Calendar size={16} color={tokens.accent} />
        <Text style={styles.triggerText}>{selected?.label || 'Periode'}</Text>
        <ChevronDown size={14} color={tokens.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <Animated.View entering={ZoomIn.duration(200).springify()} style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>Periode</Text>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, opt.value === selectedValue && styles.optionActive]}
                onPress={() => { onSelect(opt.value); setOpen(false); }}
                activeOpacity={0.6}
              >
                <View style={[styles.calIcon, opt.value === selectedValue && styles.calIconActive]}>
                  {opt.number ? (
                    <Text style={[styles.calNumber, opt.value === selectedValue && { color: '#FFF' }]}>
                      {opt.number}
                    </Text>
                  ) : (
                    <Calendar size={14} color={opt.value === selectedValue ? '#FFF' : tokens.textMuted} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, opt.value === selectedValue && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.optionDates}>{opt.dates}</Text>
                </View>
                {opt.value === selectedValue && <Check size={18} color={tokens.accent} />}
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  triggerText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: tokens.textPrimary,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  dropdown: {
    backgroundColor: tokens.surface,
    borderRadius: 16,
    paddingVertical: 12,
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 0,
  },
  dropdownTitle: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: 13,
    color: tokens.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  optionActive: {
    backgroundColor: tokens.accentLight + '30',
  },
  calIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calIconActive: {
    backgroundColor: tokens.accent,
  },
  calNumber: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: tokens.textSecondary,
  },
  optionLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: tokens.textPrimary,
  },
  optionLabelActive: {
    fontFamily: 'DMSans_600SemiBold',
    color: tokens.accent,
  },
  optionDates: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: tokens.textMuted,
    marginTop: 1,
  },
});
