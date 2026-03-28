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

// ─── Props ───────────────────────────────────────────────

interface Props {
  onBurgerPress: () => void;
  showBack?: boolean;
  onBackPress?: () => void;
  notificationCount?: number;
  onNotificationPress?: () => void;
}

// ─── Component ───────────────────────────────────────────

export default function AppTopbar({
  onBurgerPress,
  showBack = false,
  onBackPress,
  notificationCount = 3,
  onNotificationPress,
}: Props) {
  return (
    <HStack
      className="items-center justify-between px-4"
      style={{
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEF0F5',
        paddingTop: Platform.OS === 'ios' ? 54 : 12,
        paddingBottom: 10,
        ...Platform.select({
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
          android: { elevation: 2 },
          default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
        }),
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
          color="#0F172A"
        />
      </Pressable>

      {/* Center: Scolaria branding */}
      <LogoScolaria size={28} variant="light" />

      {/* Right: Notification Bell */}
      <Pressable
        className="w-10 h-10 rounded-full items-center justify-center relative"
        onPress={onNotificationPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="notifications-outline" size={22} color="#0F172A" />
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
