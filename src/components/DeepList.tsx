/**
 * DeepList — groupes et rows des pages profondes (COMPONENTS §8, style Notion).
 *
 * Groupe : fond #FFFFFF, bordures 1px rgba(15,23,42,0.05), séparateur de 8px rgba(15,23,42,0.04).
 * Row : padding 12/16, minHeight 48, icône 22, titre 13, description 11, valeur 12, chevron.
 * Aucune glass card, aucun gap (Android).
 */

import { View, StyleSheet, Switch } from 'react-native';
import { ChevronRight, ChevronDown, ChevronUp } from 'lucide-react-native';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text, Pressable } from './ui';

export const DEEP = {
  navy: '#0F172A',
  indigo: '#4338CA',
  red: '#EF4444',
  text55: 'rgba(15,23,42,0.55)',
  text35: 'rgba(15,23,42,0.35)',
  borderL: 'rgba(15,23,42,0.05)',
  bg: '#F2F1EE',
} as const;

export function DeepGroup({
  title,
  children,
  first,
}: {
  title?: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <>
      {!first && <View style={st.groupGap} />}
      {title ? <Text style={st.groupTitle}>{title}</Text> : <View style={{ height: 8 }} />}
      <View style={st.group}>{children}</View>
    </>
  );
}

export interface DeepRowProps {
  icon?: React.ReactNode;
  leading?: React.ReactNode;
  label: string;
  description?: string;
  value?: string;
  last?: boolean;
  danger?: boolean;
  accent?: boolean;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  /** Row dépliable : chevron haut/bas au lieu du chevron droit. */
  expanded?: boolean;
  /** Contenu affiché sous la row quand `expanded`. */
  details?: string;
}

export function DeepRow({
  icon,
  leading,
  label,
  description,
  value,
  last,
  danger,
  accent,
  toggle,
  onToggle,
  onPress,
  expanded,
  details,
}: DeepRowProps) {
  const isToggle = toggle !== undefined;
  const isExpandable = expanded !== undefined;
  const Chevron = isExpandable ? (expanded ? ChevronUp : ChevronDown) : ChevronRight;

  const content = (
    <View style={st.rowLine}>
      {leading ?? (icon ? <View style={st.rowIcon}>{icon}</View> : null)}
      <View style={st.rowText}>
        <Text
          style={[st.rowLabel, danger && { color: DEEP.red }, accent && { color: DEEP.indigo }]}
          numberOfLines={isExpandable ? 2 : 1}
        >
          {label}
        </Text>
        {description ? <Text style={st.rowDescription} numberOfLines={2}>{description}</Text> : null}
      </View>
      {value !== undefined && <Text style={st.rowValue} numberOfLines={1}>{value}</Text>}
      {isToggle ? (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          trackColor={{ false: 'rgba(15,23,42,0.18)', true: DEEP.indigo }}
          thumbColor="#FFFFFF"
          accessibilityLabel={label}
        />
      ) : onPress && !danger ? (
        <Chevron size={16} color={DEEP.text35} strokeWidth={2} />
      ) : null}
    </View>
  );

  const body = (
    <>
      {content}
      {isExpandable && expanded && details ? <Text style={st.details}>{details}</Text> : null}
    </>
  );

  const rowStyle = [st.row, !last && st.rowBorder];
  if (isToggle) {
    return (
      <Pressable style={rowStyle} onPress={() => onToggle?.(!toggle)} accessibilityRole="switch">
        {body}
      </Pressable>
    );
  }
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [...rowStyle, pressed && st.rowPressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={isExpandable ? { expanded } : undefined}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={rowStyle}>{body}</View>;
}

export function DeepAvatar({ initials, color }: { initials: string; color: string }) {
  return (
    <View style={[st.avatar, { backgroundColor: color }]}>
      <Text style={st.avatarText}>{initials}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  groupGap: {
    height: 8,
    backgroundColor: 'rgba(15,23,42,0.04)',
    marginTop: 8,
  },
  groupTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    lineHeight: 14,
    color: DEEP.text55,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  group: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: DEEP.borderL,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: DEEP.borderL,
  },
  rowPressed: {
    backgroundColor: 'rgba(15,23,42,0.04)',
  },
  rowIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  rowLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: DEEP.navy,
  },
  rowDescription: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    lineHeight: 14,
    color: DEEP.text55,
    marginTop: 1,
  },
  rowValue: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: DEEP.text55,
    marginRight: 6,
  },
  details: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 18,
    color: DEEP.text55,
    marginTop: 8,
    marginLeft: 34,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
});
