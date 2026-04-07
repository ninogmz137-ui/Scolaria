import { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  Switch,
  Platform,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImagePlus, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import DecorativeBlobs from '../components/DecorativeBlobs';
import { Colors } from '../constants/colors';
import { useI18n } from '../contexts/I18nContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useWallpaper, WALLPAPERS } from '../contexts/WallpaperContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Helpers ─────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
  android: { elevation: 0 },
  default: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 20 },
});

// ─── Types ────────────────────────────────────────────────

interface SettingsRow {
  icon: keyof typeof Ionicons.glyphMap;
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
}: {
  title: string;
  children: React.ReactNode;
}) {
  useChildTheme(); // kept for future theme re-integration
  const accentRgb = hexToRgb('#7C3AED');
  return (
    <Box className="mb-6">
      <HStack className="items-center mb-2.5 px-1" style={{ gap: 8 }}>
        <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: '#7C3AED' }} />
        <Text
          className="text-[13px] font-bold uppercase tracking-widest"
          style={{ color: '#94A3B8' }}
        >
          {title}
        </Text>
      </HStack>
      <Box
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: '#FFFFFF',
          borderWidth: 1.5,
          borderColor: `rgba(${accentRgb},0.15)`,
          ...CARD_SHADOW,
        }}
      >
        {children}
      </Box>
    </Box>
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
}: SettingsRow & {
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  isLast?: boolean;
}) {
  useChildTheme(); // kept for future theme re-integration
  return (
    <Pressable
      className="flex-row items-center p-3.5"
      style={[
        { gap: 12 },
        !isLast ? { borderBottomWidth: 1, borderBottomColor: 'rgba(203,213,225,0.5)' } : undefined,
      ]}
      onPress={onPress}
    >
      <Box
        className="w-9 h-9 rounded-[10px] justify-center items-center"
        style={{ backgroundColor: color + '20' }}
      >
        <Ionicons name={icon} size={18} color={color} />
      </Box>
      <VStack className="flex-1">
        <Text className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>{label}</Text>
        {sublabel && <Text className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{sublabel}</Text>}
      </VStack>
      {type === 'navigate' && (
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      )}
      {type === 'value' && <Text className="text-sm font-semibold" style={{ color: Colors.cyan }}>{value}</Text>}
      {type === 'toggle' && (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Colors.darkGray, true: Colors.violet }}
          thumbColor={toggleValue ? Colors.cyan : Colors.gray}
        />
      )}
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────

export default function ReglagesScreen({ navigation }: { navigation: any }) {
  const { t } = useI18n();
  useChildTheme(); // kept for future theme re-integration
  const { user } = useAuth();
  const { wallpaper, setWallpaperId, setCustomWallpaper, customUri } = useWallpaper();
  const [notifications, setNotifications] = useState({
    grades: true,
    agenda: true,
    aria: false,
    checkin: true,
  });

  // Currently selected wallpaper id — custom takes priority visually
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

  // ─── Derive family info from auth user ────────────────────
  const familyName = 'Famille ' + (user?.user_metadata?.family_name || 'Demo');
  const familyEmail = user?.email || 'demo@scolaria.fr';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : 'Septembre 2025';

  // ─── Load notification preferences from Supabase ─────────
  const loadPreferences = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', user.id)
      .single();
    if (data?.notification_preferences) {
      setNotifications((prev) => ({ ...prev, ...data.notification_preferences }));
    }
  }, [user?.id]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // ─── Persist notification preferences on each toggle ─────
  const updateNotification = useCallback(
    async (key: string, value: boolean) => {
      const next = { ...notifications, [key]: value };
      setNotifications(next);
      if (!user?.id) return;
      await supabase
        .from('profiles')
        .update({ notification_preferences: next })
        .eq('id', user.id);
    },
    [notifications, user?.id],
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#E8EDF5' }} showsVerticalScrollIndicator={false}>
      {/* Family profile header */}
      <Box className="mb-2">
        <LinearGradient
          colors={['#0B1628', '#7C3AEDDD']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
        >
          <Box
            className="w-16 h-16 rounded-full justify-center items-center mb-2.5"
            style={{ borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.10)' }}
          >
            <Text className="text-[30px]">🏠</Text>
          </Box>
          <Text className="text-[22px] font-black mb-0.5" style={{ color: '#FFFFFF' }}>{familyName}</Text>
          <Text className="text-[13px] mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>{familyEmail}</Text>
          <HStack
            className="items-center rounded-[20px] px-3.5 py-1.5"
            style={{ gap: 6, backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            <Ionicons name="diamond" size={14} color="#FBBF24" />
            <Text className="text-[13px] font-bold" style={{ color: '#FBBF24' }}>Premium</Text>
            <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {t('settings.since')} {memberSince}
            </Text>
          </HStack>
        </LinearGradient>
      </Box>

      <DecorativeBlobs accent="#7C3AED" />

      <Box className="px-5">
        {/* Wallpaper section */}
        <SettingsSection title="FOND D'ÉCRAN">
          <View style={{ padding: 12 }}>
            {/* Gallery button */}
            <TouchableOpacity
              onPress={pickFromGallery}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F1F5F9',
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
                gap: 10,
              }}
            >
              <ImagePlus size={20} color="#7C3AED" strokeWidth={2} />
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#7C3AED' }}>
                Choisir depuis ma galerie
              </Text>
            </TouchableOpacity>

            {/* Wallpaper grid — 3 columns */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {WALLPAPERS.map((wp) => {
                const isSelected = selectedWallpaperId === wp.id;
                // Column width: screen - horizontal padding (px-5 = 20*2) - section padding (12*2) - gaps (8*2)
                const colWidth = (SCREEN_WIDTH - 40 - 24 - 16) / 3;
                return (
                  <TouchableOpacity
                    key={wp.id}
                    onPress={() => setWallpaperId(wp.id)}
                    style={{
                      width: colWidth,
                      aspectRatio: 0.7,
                      borderRadius: 12,
                      overflow: 'hidden',
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: '#7C3AED',
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={wp.label}
                  >
                    {wp.imageUrl ? (
                      <Image
                        source={{ uri: wp.imageUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={wp.colors as [string, string, ...string[]]}
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}
                    {isSelected && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: '#7C3AED',
                          alignItems: 'center',
                          justifyContent: 'center',
                          elevation: 0,
                        }}
                      >
                        <Check size={12} color="#FFFFFF" strokeWidth={2.5} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom wallpaper preview if set */}
            {customUri && (
              <View style={{ marginTop: 8 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: '#64748B',
                    marginBottom: 6,
                  }}
                >
                  Photo personnalisée active
                </Text>
                <View
                  style={{
                    width: '100%',
                    height: 80,
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: '#7C3AED',
                  }}
                >
                  <Image
                    source={{ uri: customUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
              </View>
            )}
          </View>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title={t('settings.notifications')}>
          <SettingsRowItem
            icon="school"
            label={t('settings.notifGrades')}
            sublabel={t('settings.notifGradesSub')}
            color={Colors.cyan}
            type="toggle"
            toggleValue={notifications.grades}
            onToggle={(v) => updateNotification('grades', v)}
          />
          <SettingsRowItem
            icon="calendar"
            label={t('settings.notifAgenda')}
            sublabel={t('settings.notifAgendaSub')}
            color={Colors.violet}
            type="toggle"
            toggleValue={notifications.agenda}
            onToggle={(v) => updateNotification('agenda', v)}
          />
          <SettingsRowItem
            icon="sparkles"
            label={t('settings.notifAria')}
            sublabel={t('settings.notifAriaSub')}
            color={Colors.pink}
            type="toggle"
            toggleValue={notifications.aria}
            onToggle={(v) => updateNotification('aria', v)}
          />
          <SettingsRowItem
            icon="heart"
            label={t('settings.notifCheckin')}
            sublabel={t('settings.notifCheckinSub')}
            color={Colors.orange}
            type="toggle"
            toggleValue={notifications.checkin}
            onToggle={(v) => updateNotification('checkin', v)}
            isLast
          />
        </SettingsSection>

        {/* App info */}
        <VStack className="items-center py-6" style={{ gap: 4 }}>
          <Text className="text-base font-extrabold" style={{ color: Colors.violet }}>Scolaria</Text>
          <Text className="text-[13px]" style={{ color: '#94A3B8' }}>{t('common.version')} 1.0.0</Text>
          <Text className="text-[11px] mt-1" style={{ color: '#94A3B8' }}>
            © 2026 Scolaria · Passeport scolaire numérique
          </Text>
        </VStack>

        <Box className="h-10" />
      </Box>
    </ScrollView>
  );
}
