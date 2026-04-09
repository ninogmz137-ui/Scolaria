import { useCallback, useEffect, useState } from 'react';
import { View, Switch, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box, Text } from '../components/ui';
import { FontFamily } from '../hooks/useSolariaFonts';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

type NotifPrefs = {
  grades: boolean;
  agenda: boolean;
  aria: boolean;
  checkin: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  grades: true,
  agenda: true,
  aria: false,
  checkin: true,
};

function Row({
  label,
  sublabel,
  value,
  onChange,
  isLast,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !isLast && styles.rowSeparator,
      ]}
    >
      <View style={{ flex: 1, paddingRight: 14 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? (
          <Text style={styles.rowSublabel}>{sublabel}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#E2E8F0', true: '#6366F1' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function NotificationsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);

  const loadPreferences = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', user.id)
      .single();
    if (data?.notification_preferences) {
      setPrefs((prev) => ({ ...prev, ...data.notification_preferences }));
    }
  }, [user?.id]);

  useEffect(() => {
    loadPreferences().catch(() => {});
  }, [loadPreferences]);

  const updatePreference = useCallback(
    async (key: keyof NotifPrefs, value: boolean) => {
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      if (!user?.id) return;
      await supabase
        .from('profiles')
        .update({ notification_preferences: next })
        .eq('id', user.id);
    },
    [prefs, user?.id],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#EEF2F7' }}
      contentContainerStyle={{
        paddingTop: insets.top + 14,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.subtitle}>
        Choisis ce que tu veux recevoir. Aucun spam, et jamais la nuit.
      </Text>

      <Box style={styles.card}>
        <Row
          label="Notes & résultats"
          sublabel="Nouvelles notes, moyennes et appréciations"
          value={prefs.grades}
          onChange={(v) => updatePreference('grades', v)}
        />
        <Row
          label="Agenda"
          sublabel="Cours, devoirs et événements"
          value={prefs.agenda}
          onChange={(v) => updatePreference('agenda', v)}
        />
        <Row
          label="Aria"
          sublabel="Réponses et rappels utiles"
          value={prefs.aria}
          onChange={(v) => updatePreference('aria', v)}
        />
        <Row
          label="Bien-être"
          sublabel="Check-in et Score de Joie"
          value={prefs.checkin}
          onChange={(v) => updatePreference('checkin', v)}
          isLast
        />
      </Box>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 26,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 14,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: '#64748B',
  },
  card: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 16 },
      android: { elevation: 0 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 16 },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowSeparator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  rowLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  rowSublabel: {
    marginTop: 2,
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#94A3B8',
  },
});

