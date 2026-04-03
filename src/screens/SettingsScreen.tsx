/**
 * SettingsScreen — Main settings accessed from burger menu.
 * Sections: Apparence (ThemeSelector), Notifications, RGPD, Compte
 * Design: glass/wallpaper — WallpaperBackground + GlassCard
 */

import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Papicons } from '@getpapillon/papicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ImagePlus, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import WallpaperBackground from '../components/WallpaperBackground';
import GlassCard from '../components/GlassCard';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Colors } from '../constants/colors';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { useWallpaper, WALLPAPERS } from '../contexts/WallpaperContext';

// ─── Types ────────────────────────────────────────────────

interface SettingsRow {
  icon: string;
  label: string;
  sublabel?: string;
  color: string;
  type: 'navigate' | 'toggle' | 'value';
  value?: string;
  toggleKey?: string;
}

// ─── Section component ───────────────────────────────────

function SettingsSection({
  title,
  children,
  titleColor,
}: {
  title: string;
  children: React.ReactNode;
  titleColor?: string;
}) {
  return (
    <View style={styles.sectionWrapper}>
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionTitle, titleColor ? { color: titleColor } : undefined]}>{title}</Text>
      </View>
      <GlassCard noPadding>
        {children}
      </GlassCard>
    </View>
  );
}

// ─── Row component ───────────────────────────────────────

function SettingsRowItem({
  icon,
  label,
  sublabel,
  color,
  type,
  value,
  toggleValue,
  onToggle,
  onPress,
  isLast,
  labelColor,
  sublabelColor,
  chevronColor: chevColor,
  borderColor: rowBorderColor,
  switchTrackOff,
}: SettingsRow & {
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  isLast?: boolean;
  labelColor?: string;
  sublabelColor?: string;
  chevronColor?: string;
  borderColor?: string;
  switchTrackOff?: string;
}) {
  return (
    <Pressable
      style={[
        styles.row,
        !isLast && [styles.rowBorder, rowBorderColor ? { borderBottomColor: rowBorderColor } : undefined],
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '28' }]}>
        <Papicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.rowTextStack}>
        <Text style={[styles.rowLabel, labelColor ? { color: labelColor } : undefined]}>{label}</Text>
        {sublabel ? <Text style={[styles.rowSublabel, sublabelColor ? { color: sublabelColor } : undefined]}>{sublabel}</Text> : null}
      </View>
      {type === 'navigate' && (
        <Papicons name="ChevronRight" size={18} color={chevColor || 'rgba(255,255,255,0.45)'} />
      )}
      {type === 'value' && (
        <Text style={styles.rowValue}>{value}</Text>
      )}
      {type === 'toggle' && (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: switchTrackOff || 'rgba(255,255,255,0.2)', true: Colors.violet }}
          thumbColor={toggleValue ? Colors.cyan : 'rgba(255,255,255,0.6)'}
        />
      )}
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────

export default function SettingsScreen({ navigation }: { navigation: any }) {
  const { t } = useI18n();
  const { theme } = useChildTheme();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;
  const { wallpaper, setWallpaperId, setCustomWallpaper, customUri } = useWallpaper();

  // Mode-aware text colors
  const textPrimary = theme.textOnBg;
  const textSecondary = theme.textOnBgSecondary;
  const textMuted = theme.isDarkBg ? 'rgba(255,255,255,0.5)' : '#94A3B8';
  const cardText = theme.isDarkBg ? '#FFFFFF' : '#0F172A';
  const cardTextMuted = theme.isDarkBg ? 'rgba(255,255,255,0.5)' : '#94A3B8';
  const borderCol = theme.isDarkBg ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)';
  const switchTrack = theme.isDarkBg ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';

  const [notifications, setNotifications] = useState({
    grades: true,
    agenda: true,
    aria: false,
    checkin: true,
  });

  const selectedWallpaperId = customUri ? '__custom__' : wallpaper.id;

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [9, 16],
    });
    if (!result.canceled && result.assets[0]) {
      setCustomWallpaper(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.root}>
      <WallpaperBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: TOPBAR_H + 12, paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10 },
        ]}
      >
        {/* Title section */}
        <View style={styles.titleSection}>
          <Text style={styles.titleEmoji}>⚙️</Text>
          <Text style={[styles.titleText, { color: textPrimary }]}>Réglages</Text>
          <Text style={[styles.titleSub, { color: textSecondary }]}>Personnalisez votre expérience</Text>
        </View>

        {/* Wallpaper picker */}
        <SettingsSection title="FOND D'ÉCRAN" titleColor={textSecondary}>
          <View style={{ padding: 12 }}>
            {/* Gallery button */}
            <TouchableOpacity
              onPress={pickFromGallery}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.isDarkBg ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
                gap: 10,
              }}
            >
              <ImagePlus size={20} color="#3B82F6" strokeWidth={2} />
              <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 14, color: '#3B82F6' }}>
                Choisir depuis ma galerie
              </Text>
            </TouchableOpacity>

            {/* Wallpaper carousel — horizontal scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {WALLPAPERS.map((wp) => {
                const isSelected = selectedWallpaperId === wp.id;
                return (
                  <TouchableOpacity
                    key={wp.id}
                    onPress={() => setWallpaperId(wp.id)}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 12,
                      overflow: 'hidden',
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: '#3B82F6',
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={wp.label}
                  >
                    {wp.imageUrl ? (
                      <Image source={{ uri: wp.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <LinearGradient colors={wp.colors as [string, string, ...string[]]} style={{ width: '100%', height: '100%' }} />
                    )}
                    {isSelected && (
                      <View style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', elevation: 0 }}>
                        <Check size={12} color="#FFFFFF" strokeWidth={2.5} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Custom wallpaper preview */}
            {customUri && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: 12, color: cardTextMuted, marginBottom: 6 }}>
                  Photo personnalisée active
                </Text>
                <View style={{ width: '100%', height: 80, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#3B82F6' }}>
                  <Image source={{ uri: customUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              </View>
            )}
          </View>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title={t('settings.notifications')} titleColor={textSecondary}>
          <SettingsRowItem
            icon="Grades"
            label={t('settings.notifGrades')}
            sublabel={t('settings.notifGradesSub')}
            color={Colors.cyan}
            type="toggle"
            toggleValue={notifications.grades}
            onToggle={(v) => setNotifications((p) => ({ ...p, grades: v }))}
            labelColor={cardText} sublabelColor={cardTextMuted} borderColor={borderCol} switchTrackOff={switchTrack}
          />
          <SettingsRowItem
            icon="Calendar"
            label={t('settings.notifAgenda')}
            sublabel={t('settings.notifAgendaSub')}
            color={Colors.violet}
            type="toggle"
            toggleValue={notifications.agenda}
            onToggle={(v) => setNotifications((p) => ({ ...p, agenda: v }))}
            labelColor={cardText} sublabelColor={cardTextMuted} borderColor={borderCol} switchTrackOff={switchTrack}
          />
          <SettingsRowItem
            icon="Sparkles"
            label={t('settings.notifAria')}
            sublabel={t('settings.notifAriaSub')}
            color={Colors.pink}
            type="toggle"
            toggleValue={notifications.aria}
            onToggle={(v) => setNotifications((p) => ({ ...p, aria: v }))}
            labelColor={cardText} sublabelColor={cardTextMuted} borderColor={borderCol} switchTrackOff={switchTrack}
          />
          <SettingsRowItem
            icon="Heart"
            label={t('settings.notifCheckin')}
            sublabel={t('settings.notifCheckinSub')}
            color={Colors.orange}
            type="toggle"
            toggleValue={notifications.checkin}
            onToggle={(v) => setNotifications((p) => ({ ...p, checkin: v }))}
            isLast
            labelColor={cardText} sublabelColor={cardTextMuted} switchTrackOff={switchTrack}
          />
        </SettingsSection>

        {/* Compte */}
        <SettingsSection title="COMPTE" titleColor={textSecondary}>
          <SettingsRowItem
            icon="User"
            label="Mon profil"
            color="#3B82F6"
            type="navigate"
            labelColor={cardText}
            sublabelColor={cardTextMuted}
            chevronColor={cardTextMuted}
            borderColor={borderCol}
          />
          <SettingsRowItem
            icon="Building"
            label="Enfants & établissements"
            color="#10B981"
            type="navigate"
            isLast
            labelColor={cardText}
            sublabelColor={cardTextMuted}
            chevronColor={cardTextMuted}
          />
        </SettingsSection>

        {/* Aide */}
        <SettingsSection title="AIDE" titleColor={textSecondary}>
          <SettingsRowItem
            icon="Info"
            label="Centre d'aide"
            color="#6366F1"
            type="navigate"
            labelColor={cardText}
            sublabelColor={cardTextMuted}
            chevronColor={cardTextMuted}
            borderColor={borderCol}
          />
          <SettingsRowItem
            icon="Mail"
            label="Nous contacter"
            color="#22D3EE"
            type="navigate"
            labelColor={cardText}
            sublabelColor={cardTextMuted}
            chevronColor={cardTextMuted}
            borderColor={borderCol}
          />
          <SettingsRowItem
            icon="Sparkles"
            label="Noter l'application"
            color="#F59E0B"
            type="navigate"
            isLast
            labelColor={cardText}
            sublabelColor={cardTextMuted}
            chevronColor={cardTextMuted}
          />
        </SettingsSection>

        {/* À propos */}
        <SettingsSection title="À PROPOS" titleColor={textSecondary}>
          <SettingsRowItem
            icon="Info"
            label="Version"
            color="#94A3B8"
            type="value"
            value="1.0.0"
            labelColor={cardText}
            sublabelColor={cardTextMuted}
            borderColor={borderCol}
          />
          <SettingsRowItem
            icon="Paper"
            label="Conditions d'utilisation"
            color="#64748B"
            type="navigate"
            isLast
            labelColor={cardText}
            sublabelColor={cardTextMuted}
            chevronColor={cardTextMuted}
          />
        </SettingsSection>

        {/* App info */}
        <View style={styles.footer}>
          <Text style={[styles.footerBrand, { color: textPrimary }]}>Scolaria</Text>
          <Text style={[styles.footerVersion, { color: textMuted }]}>{t('common.version')} 1.0.0</Text>
          <Text style={[styles.footerCopy, { color: textMuted }]}>© 2026 Scolaria · Passeport scolaire numérique</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
  },

  // Title section
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 4,
  },
  titleEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  titleText: {
    fontFamily: FontFamily.loraBold,
    fontSize: 26,
  },
  titleSub: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
  },

  // Section
  sectionWrapper: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor applied inline via borderColor prop
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTextStack: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    // color applied inline via labelColor
  },
  rowSublabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    // color applied inline via sublabelColor
  },
  rowValue: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: Colors.cyan,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerBrand: {
    fontFamily: FontFamily.loraBold,
    fontSize: 16,
  },
  footerVersion: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
  },
  footerCopy: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    marginTop: 2,
  },
});
