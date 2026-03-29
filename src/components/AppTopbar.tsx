/**
 * AppTopbar — Fixed top bar present on all screens.
 *
 * Light design system:
 * - Left: burger menu (☰) or back arrow (←)
 * - Center: Scolaria logo/text
 * - Right: notification bell with badge
 *
 * Child selection is now handled by ChildSwitcherBar below this topbar.
 */

import { Platform } from 'react-native';
import { Box, Text, Pressable, HStack } from './ui';
import { Ionicons } from '@expo/vector-icons';
import LogoScolaria from './LogoScolaria';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Props ───────────────────────────────────────────────

interface Props {
  onBurgerPress: () => void;
  showBack?: boolean;
  onBackPress?: () => void;
  notificationCount?: number;
  onNotificationPress?: () => void;
  /** When true, topbar is transparent with white icons (overlays dark header) */
  transparent?: boolean;
  /** Called when the Scolaria logo is tapped (navigate to home) */
  onLogoPress?: () => void;
}

// ─── Component ───────────────────────────────────────────

export default function AppTopbar({
  onBurgerPress,
  showBack = false,
  onBackPress,
  notificationCount = 3,
  onNotificationPress,
  transparent = false,
  onLogoPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const iconColor = transparent ? '#FFFFFF' : '#0F172A';

  return (
    <HStack
      className="items-center justify-between px-4"
      style={{
        backgroundColor: transparent ? 'transparent' : '#FFFFFF',
        borderBottomWidth: transparent ? 0 : 1,
        borderBottomColor: '#EEF0F5',
        paddingTop: insets.top + 8,
        paddingBottom: 10,
        // Transparent mode: overlay on top of content with absolute positioning
        ...(transparent ? { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 } : {}),
        ...(transparent
          ? {}
          : Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
              android: { elevation: 2 },
              default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
            })),
      }}
    >
      {/* Left: Burger or Back */}
      <Pressable
        className="w-10 h-10 rounded-full items-center justify-center"
        onPress={showBack ? onBackPress : onBurgerPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={showBack ? 'arrow-back' : 'menu'}
          size={24}
          color={iconColor}
        />
      </Pressable>

      {/* Center: Scolaria branding (tappable → home) */}
      <Pressable
        onPress={onLogoPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ flex: 1, alignItems: 'center' }}
      >
        <LogoScolaria size={24} variant={transparent ? 'dark' : 'light'} />
      </Pressable>

      {/* Right: Notification Bell */}
      <Pressable
        className="w-10 h-10 rounded-full items-center justify-center relative"
        onPress={onNotificationPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="notifications-outline" size={22} color={iconColor} />
        {notificationCount > 0 && (
          <Box className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full items-center justify-center px-0.5"
            style={{ backgroundColor: '#EF4444' }}
          >
            <Text className="text-[9px] font-extrabold text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </Text>
          </Box>
        )}
      </Pressable>
    </HStack>
  );
}
