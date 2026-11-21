# AccueilScreen Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the AccueilScreen with Lora typography, fused child header, border-left cards, warm gradients, and staggered reveal animations.

**Architecture:** Replace the two-bar header (AppTopbar + ChildSwitcherBar) with a single FusedChildHeader component. Extract reusable DashboardTile, AriaCard, and JoyScoreBanner components. Add staggered entrance animations and press-state micro-interactions using React Native Animated API.

**Tech Stack:** React Native, Expo, NativeWind v4, expo-google-fonts (Lora + DM Sans), Animated API

---

### Task 1: Install and configure Lora + DM Sans fonts

**Files:**
- Modify: `package.json` (add font packages)
- Create: `src/hooks/useSolariaFonts.ts`
- Modify: `App.tsx` (integrate font loading)

- [ ] **Step 1: Install expo-google-fonts packages**

```bash
npx expo install @expo-google-fonts/lora @expo-google-fonts/dm-sans expo-font
```

- [ ] **Step 2: Create the font loading hook**

Create `src/hooks/useSolariaFonts.ts`:

```tsx
import { useFonts } from 'expo-font';
import {
  Lora_600SemiBold,
  Lora_700Bold,
  Lora_600SemiBold_Italic,
  Lora_700Bold_Italic,
} from '@expo-google-fonts/lora';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

export const FontFamily = {
  loraRegular: 'Lora_600SemiBold',
  loraBold: 'Lora_700Bold',
  loraItalic: 'Lora_600SemiBold_Italic',
  loraBoldItalic: 'Lora_700Bold_Italic',
  sansRegular: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
} as const;

export function useSolariaFonts() {
  const [fontsLoaded] = useFonts({
    Lora_600SemiBold,
    Lora_700Bold,
    Lora_600SemiBold_Italic,
    Lora_700Bold_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  return fontsLoaded;
}
```

- [ ] **Step 3: Integrate font loading into App.tsx**

In `App.tsx`, import and use the hook in the `App` component. Gate the app render on fonts being loaded (combine with existing splash screen logic):

```tsx
import { useSolariaFonts } from './src/hooks/useSolariaFonts';

export default function App() {
  const fontsLoaded = useSolariaFonts();

  // Add fontsLoaded to the existing loading condition
  // In AppContent, the existing `loading` state already shows splash
  // Just pass fontsLoaded down or check it alongside `loading`

  if (!fontsLoaded) {
    return null; // Expo splash screen is still visible
  }

  return (
    <I18nProvider>
      {/* ... existing providers ... */}
    </I18nProvider>
  );
}
```

- [ ] **Step 4: Verify fonts load**

```bash
npx tsc --noEmit
```

Expected: no errors. Run the app and check the console for font loading warnings.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSolariaFonts.ts App.tsx package.json package-lock.json
git commit -m "feat: add Lora + DM Sans font loading"
```

---

### Task 2: Create FusedChildHeader component

**Files:**
- Create: `src/components/FusedChildHeader.tsx`

- [ ] **Step 1: Create the FusedChildHeader component**

Create `src/components/FusedChildHeader.tsx`:

```tsx
import { useRef, useEffect } from 'react';
import { Animated, Pressable as RNPressable } from 'react-native';
import { Box, Text, HStack } from './ui';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useChildTheme } from '../contexts/ChildThemeContext';
import { getChildTheme } from '../constants/themes';
import { FontFamily } from '../hooks/useSolariaFonts';

interface Props {
  onAddChild?: () => void;
}

export default function FusedChildHeader({ onAddChild }: Props) {
  const { children: allChildren, selectedChild, selectedChildId, selectChild } = useActiveChild();
  const { theme, getChildThemeId } = useChildTheme();
  const accent = theme.accent;
  const accentLight = theme.accentLight;

  const otherChildren = allChildren.filter((c) => c.id !== selectedChildId);

  // Accent bar width animation
  const barWidth = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    barWidth.setValue(0);
    Animated.spring(barWidth, {
      toValue: 44,
      tension: 80,
      friction: 12,
      useNativeDriver: false,
      delay: 150,
    }).start();
  }, [selectedChildId]);

  // Pulse animation for accent bar
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <Box>
      {/* Fused header row */}
      <HStack
        className="items-center px-3.5 py-3"
        style={{ backgroundColor: accent + '05', gap: 10 }}
      >
        {/* Active child card */}
        <HStack
          className="flex-1 items-center rounded-[14px] px-3.5 py-2.5"
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: 1.5,
            borderColor: accent + '25',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
            gap: 10,
          }}
        >
          <Box
            className="w-11 h-11 rounded-xl items-center justify-center"
            style={{
              backgroundColor: accent + '12',
              borderWidth: 1.5,
              borderColor: accent + '20',
            }}
          >
            <Text style={{ fontSize: 24 }}>{selectedChild.avatar}</Text>
          </Box>
          <Box className="flex-1">
            <Text style={{ fontFamily: FontFamily.loraRegular, fontSize: 18, color: '#0F172A' }}>
              Bonjour,{' '}
              <Text style={{ fontFamily: FontFamily.loraBoldItalic, color: accent }}>
                {selectedChild.name}
              </Text>
              {' '}👋
            </Text>
            <Text
              className="mt-0.5"
              style={{
                fontFamily: FontFamily.sansSemiBold,
                fontSize: 9,
                color: '#94A3B8',
                textTransform: 'uppercase',
                letterSpacing: 1.5,
              }}
            >
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              {selectedChild.classe.split('—')[0]?.trim()}
            </Text>
          </Box>
        </HStack>

        {/* Other children mini avatars */}
        <HStack style={{ gap: 8 }}>
          {otherChildren.map((child) => {
            const childTheme = getChildTheme(getChildThemeId(child.id));
            return (
              <MiniAvatar
                key={child.id}
                emoji={child.avatar}
                onPress={() => selectChild(child.id)}
              />
            );
          })}
        </HStack>
      </HStack>

      {/* Accent bar */}
      <Box className="px-4 pt-2.5 pb-3">
        <Animated.View
          style={{
            width: barWidth,
            height: 2.5,
            borderRadius: 2,
            opacity: pulseAnim,
            backgroundColor: accent,
          }}
        />
      </Box>
    </Box>
  );
}

function MiniAvatar({ emoji, onPress }: { emoji: string; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <RNPressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: '#F1F5F9',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </Animated.View>
    </RNPressable>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/FusedChildHeader.tsx
git commit -m "feat: create FusedChildHeader component with greeting and mini avatars"
```

---

### Task 3: Create DashboardTile component with border-left and press state

**Files:**
- Create: `src/components/dashboard/DashboardTile.tsx`

- [ ] **Step 1: Create the DashboardTile component**

Create `src/components/dashboard/DashboardTile.tsx`:

```tsx
import { useRef } from 'react';
import { Animated, Pressable as RNPressable, Platform } from 'react-native';
import { Box, Text, HStack } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '../../hooks/useSolariaFonts';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  label: string;
  detail: string;
  detailColor?: string;
  badge?: number;
  borderColor: string;
  delay?: number;
  onPress: () => void;
}

export default function DashboardTile({
  icon,
  iconColor,
  value,
  label,
  detail,
  detailColor,
  badge,
  borderColor,
  delay = 0,
  onPress,
}: Props) {
  // Press state animation
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  // Entrance animation
  const enterAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Icon bounce
  const iconScale = useRef(new Animated.Value(0)).current;

  // Trigger entrance
  useRef(
    (() => {
      Animated.parallel([
        Animated.timing(enterAnim, {
          toValue: 1,
          duration: 350,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          tension: 120,
          friction: 8,
          delay: delay + 100,
          useNativeDriver: true,
        }),
      ]).start();
    })(),
  );

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true }),
      Animated.timing(shadowAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
      Animated.timing(shadowAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View
      style={{
        opacity: enterAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        width: '47%',
        flexGrow: 1,
      }}
    >
      <RNPressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Box
          className="p-3.5 rounded-[14px]"
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#EEF0F5',
            borderLeftWidth: 3,
            borderLeftColor: borderColor,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
              android: { elevation: 1 },
              default: {},
            }),
          }}
        >
          <HStack className="justify-between items-center mb-2.5">
            <Animated.View
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                backgroundColor: iconColor + '10',
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: iconScale }],
              }}
            >
              <Ionicons name={icon} size={18} color={iconColor} />
            </Animated.View>
            {badge !== undefined && badge > 0 && (
              <Box
                className="min-w-[20px] h-5 rounded-full justify-center items-center px-1"
                style={{ backgroundColor: '#EF4444' }}
              >
                <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 10, color: '#FFFFFF' }}>
                  {badge}
                </Text>
              </Box>
            )}
          </HStack>
          <Text
            style={{
              fontFamily: FontFamily.sansBold,
              fontSize: 22,
              color: '#0F172A',
              letterSpacing: -0.5,
              marginBottom: 2,
            }}
          >
            {value}
          </Text>
          <Text
            style={{
              fontFamily: FontFamily.sansSemiBold,
              fontSize: 10,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontFamily: FontFamily.sansRegular,
              fontSize: 10,
              color: detailColor || '#94A3B8',
            }}
            numberOfLines={1}
          >
            {detail}
          </Text>
        </Box>
      </RNPressable>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardTile.tsx
git commit -m "feat: create DashboardTile with border-left, press state, and entrance animation"
```

---

### Task 4: Create AriaCard component

**Files:**
- Create: `src/components/dashboard/AriaCard.tsx`

- [ ] **Step 1: Create the AriaCard component**

Create `src/components/dashboard/AriaCard.tsx`:

```tsx
import { useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { Box, Text, HStack } from '../ui';
import { FontFamily } from '../../hooks/useSolariaFonts';

interface Props {
  summary: string;
  accent: string;
  delay?: number;
}

export default function AriaCard({ summary, accent, delay = 200 }: Props) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useRef(
    (() => {
      Animated.parallel([
        Animated.timing(enterAnim, {
          toValue: 1,
          duration: 350,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    })(),
  );

  return (
    <Animated.View style={{ opacity: enterAnim, transform: [{ translateY: slideAnim }] }}>
      <Box
        className="rounded-[14px] p-4"
        style={{
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#EEF0F5',
          borderLeftWidth: 3,
          borderLeftColor: accent,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
            android: { elevation: 1 },
            default: {},
          }),
        }}
      >
        <HStack className="items-center gap-1.5 mb-2">
          <Text style={{ fontSize: 13, color: accent }}>✦</Text>
          <Text
            style={{
              fontFamily: FontFamily.sansBold,
              fontSize: 11,
              color: accent,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Synthèse Aria · Ce matin
          </Text>
        </HStack>
        <Text
          style={{
            fontFamily: FontFamily.sansMedium,
            fontSize: 14,
            color: '#0F172A',
            lineHeight: 21,
          }}
        >
          {summary}
        </Text>
      </Box>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/AriaCard.tsx
git commit -m "feat: create AriaCard with border-left accent and entrance animation"
```

---

### Task 5: Create JoyScoreBanner component

**Files:**
- Create: `src/components/dashboard/JoyScoreBanner.tsx`

- [ ] **Step 1: Create the JoyScoreBanner component**

Create `src/components/dashboard/JoyScoreBanner.tsx`:

```tsx
import { useRef } from 'react';
import { Animated, Pressable as RNPressable, Platform } from 'react-native';
import { Box, Text, HStack, VStack } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '../../hooks/useSolariaFonts';

const JOY_TREND = {
  up: { label: 'En hausse', icon: 'trending-up' as const, color: '#10B981' },
  stable: { label: 'Stable', icon: 'remove' as const, color: '#F59E0B' },
  down: { label: 'Attention', icon: 'trending-down' as const, color: '#EF4444' },
};

interface Props {
  value: number;
  trend: 'up' | 'stable' | 'down';
  delay?: number;
  onPress: () => void;
}

export default function JoyScoreBanner({ value, trend, delay = 650, onPress }: Props) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const trendConfig = JOY_TREND[trend];

  useRef(
    (() => {
      Animated.parallel([
        Animated.timing(enterAnim, {
          toValue: 1,
          duration: 350,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    })(),
  );

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, tension: 200, friction: 10, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: enterAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <RNPressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <HStack
          className="items-center gap-3.5 p-4 rounded-[14px]"
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: '#EEF0F5',
            borderLeftWidth: 3,
            borderLeftColor: '#F59E0B',
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
              android: { elevation: 1 },
              default: {},
            }),
          }}
        >
          <Box
            className="w-11 h-11 rounded-full justify-center items-center"
            style={{ backgroundColor: trendConfig.color + '12' }}
          >
            <Text style={{ fontSize: 22 }}>💛</Text>
          </Box>
          <VStack className="flex-1">
            <Text style={{ fontFamily: FontFamily.sansSemiBold, fontSize: 14, color: '#0F172A' }}>
              Score de Joie ·{' '}
              <Text style={{ fontFamily: FontFamily.sansBold }}>{value}/5</Text>
              {' '}cette semaine
            </Text>
            <HStack className="items-center gap-1 mt-0.5">
              <Ionicons name={trendConfig.icon} size={14} color={trendConfig.color} />
              <Text style={{ fontFamily: FontFamily.sansBold, fontSize: 12, color: trendConfig.color }}>
                {trendConfig.label}
              </Text>
            </HStack>
          </VStack>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </HStack>
      </RNPressable>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/JoyScoreBanner.tsx
git commit -m "feat: create JoyScoreBanner with border-left amber and press state"
```

---

### Task 6: Rewrite AccueilScreen with all new components

**Files:**
- Modify: `src/screens/AccueilScreen.tsx`

- [ ] **Step 1: Rewrite AccueilScreen**

Replace the entire content of `src/screens/AccueilScreen.tsx` with the new version that:
- Removes the `ChildSwitcherBar` import, uses `FusedChildHeader` instead
- Uses extracted `AriaCard`, `DashboardTile`, and `JoyScoreBanner` components
- Applies warm gradient background (`#FFFBF5 → #F7F8FC`)
- Passes stagger delays to each component
- Wraps content in fade animation tied to `selectedChildId`

Key imports:
```tsx
import FusedChildHeader from '../components/FusedChildHeader';
import AriaCard from '../components/dashboard/AriaCard';
import DashboardTile from '../components/dashboard/DashboardTile';
import JoyScoreBanner from '../components/dashboard/JoyScoreBanner';
```

Remove:
```tsx
import ChildSwitcherBar from '../components/ChildSwitcherBar';
```

Background: Use `LinearGradient` with colors `['#FFFBF5', '#F7F8FC']` and angle 175deg instead of flat `#F7F8FC`.

Tile config with border colors and stagger delays:
```tsx
<DashboardTile borderColor="#FF8C42" delay={300} icon="book" iconColor="#FF8C42" ... />
<DashboardTile borderColor="#38BDF8" delay={370} icon="create" iconColor="#38BDF8" ... />
<DashboardTile borderColor="#A78BFA" delay={440} icon="school" iconColor="#A78BFA" ... />
<DashboardTile borderColor="#10B981" delay={510} icon="calendar" iconColor="#10B981" ... />
```

AriaCard with delay 200, JoyScoreBanner with delay 650.

Absence button with delay 600 (wrap in Animated.View with fade-in).

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Verify visually in browser**

Reload the Expo web app, navigate to demo mode, confirm:
- Warm gradient background visible
- FusedChildHeader shows "Bonjour, *Léa*" with Lora font
- Border-left on all cards
- Staggered reveal plays on load
- Child switch triggers crossfade and replay

- [ ] **Step 4: Commit**

```bash
git add src/screens/AccueilScreen.tsx
git commit -m "feat: rewrite AccueilScreen with fused header, extracted components, and staggered animations"
```

---

### Task 7: Clean up removed components

**Files:**
- Delete: `src/components/ChildSwitcherBar.tsx`
- Modify: `src/navigation/TabNavigator.tsx` (if it references ChildSwitcherBar)

- [ ] **Step 1: Check for remaining ChildSwitcherBar imports**

```bash
grep -r "ChildSwitcherBar" src/
```

Remove any remaining imports. The only consumer was AccueilScreen (already updated in Task 6).

- [ ] **Step 2: Delete ChildSwitcherBar.tsx**

```bash
rm src/components/ChildSwitcherBar.tsx
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git rm src/components/ChildSwitcherBar.tsx
git commit -m "chore: remove ChildSwitcherBar, replaced by FusedChildHeader"
```
