# AccueilScreen Polish — Design Spec

**Date:** 2026-03-28
**Status:** Approved

## Overview

Refine the AccueilScreen with a distinctive visual identity combining warmth and structure. Integrate Lora serif typography, a fused child switcher with greeting, rich micro-animations, and visual depth through gradients, border accents, and atmospheric effects.

## Design Direction

**Aesthetic:** Warm-structured — soft organic warmth (gradients, halos, emojis) combined with geometric clarity (border-left accents, uppercase labels, strict grid).

**What makes it memorable:** The serif greeting "Bonjour, *Léa*" with the child's accent color in italic, the colored border-left on every card block, and the staggered reveal animations.

## Typography

- **Titles / Display:** Lora 600-700 (serif, warm, rounded)
  - Used for: greeting ("Bonjour, *Léa*"), section headers
  - Child name in italic + accent color
- **Body / UI:** DM Sans 400-600
  - Used for: labels, tile content, navigation, Aria text, dates
- **Labels:** DM Sans 600, 10-11px, uppercase, letter-spacing 1-1.5px
- **Tile numbers:** DM Sans 700, 22px, color `#0F172A`, letter-spacing -0.5px

### Font Loading

Install `expo-google-fonts` packages:
- `@expo-google-fonts/lora` (weights: 600, 700, 600-italic, 700-italic)
- `@expo-google-fonts/dm-sans` (weights: 400, 500, 600, 700)

Use `useFonts()` hook at app root. Fallback to system serif/sans-serif while loading.

## Layout: Fused Header

Replace the current `AppTopbar` + `ChildSwitcherBar` two-bar layout with a single fused component below the topbar.

### Structure (~80px height)

```
┌─────────────────────────────────────────────────┐
│  ☰          Scolaria          🔔(3)            │  ← AppTopbar (unchanged)
├─────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  [👦] [👩]       │  ← FusedChildHeader
│  │ [👧] Bonjour, Léa 👋    │                   │
│  │      Ven 28 mars · GS   │                   │
│  └──────────────────────────┘                   │
├─────────────────────────────────────────────────┤
│  Content...                                     │
```

### FusedChildHeader Component

- Left: Active child card (white, rounded-14px, border accent 25%, shadow)
  - Avatar (44x44, rounded-12, gradient tint background)
  - "Bonjour, *{name}*" in Lora 18px, name in italic + accent color
  - Date + classe in DM Sans 9px uppercase
- Right: Other children as mini avatars (36x36, rounded-10, `#F1F5F9` bg)
  - Tap → triggers child switch with crossfade
- Background: subtle warm gradient from accent at 5% opacity
- Halo: radial gradient from accent at 10% in top-right corner

## Color System

### Page Background

Replace flat `#F7F8FC` with a subtle vertical gradient:
- Top: `#FFFBF5` (warm tint, influenced by child accent at 3-5%)
- Bottom: `#F7F8FC` (neutral)
- Angle: 175deg

### Cards

- Background: white `#FFFFFF`
- Border: `#EEF0F5`
- Border-left: 3px solid category color
- Shadow: `0 1px 4px rgba(0,0,0,0.03)`
- Very subtle gradient tint: category color at 2-5% in top-left corner

### Border-Left Colors (per tile)

| Tile | Color | Hex |
|---|---|---|
| Cahier de liaison | Orange | `#FF8C42` |
| Devoirs | Sky blue | `#38BDF8` |
| Notes/Moyenne | Purple | `#A78BFA` |
| Agenda | Green | `#10B981` |
| Carte Aria | Child accent | varies |
| Score de Joie | Amber | `#F59E0B` |

### Accent bar

Below the fused header: 40-50px wide, 2.5px height, gradient from accent to accentLight, rounded.

## Aria Card

- Background: very subtle gradient `white → accent at 3%`
- Border: `#EEF0F5`
- Border-left: 3px solid child accent
- Shadow: `0 1px 4px rgba(0,0,0,0.03)`
- Label: "✦ Synthèse Aria · Ce matin" in accent color, uppercase, 11px
- Body: DM Sans 14px, `#0F172A`, emoji inline allowed

## Dashboard Tiles (2x2 Grid)

Each tile:
- White card, rounded-14px
- Border: `#EEF0F5` + border-left 3px category color
- Icon: 32x32, rounded-9px, category color at 10% bg
- Number: DM Sans 700, 22px, `#0F172A`
- Label: DM Sans 600, 10px, uppercase, tracking 1px, `#64748B`
- Detail: 10px, `#94A3B8`
- Badge (if applicable): red pill, white text

## Animations

### 1. Staggered Reveal on Load

When AccueilScreen mounts or child changes:
- Greeting block: fade-in + slide-up (0ms delay, 300ms duration)
- Accent bar: width animates from 0 to target (150ms delay)
- Aria card: fade-in + slide-up (200ms delay)
- Tile 1 (top-left): fade-in + slide-up (300ms delay)
- Tile 2 (top-right): fade-in + slide-up (370ms delay)
- Tile 3 (bottom-left): fade-in + slide-up (440ms delay)
- Tile 4 (bottom-right): fade-in + slide-up (510ms delay)
- Absence button: fade-in (600ms delay)
- Joy Score: fade-in + slide-up (650ms delay)

Use `Animated.stagger` or manual delays with `Animated.parallel`. Spring physics: tension 80, friction 12.

### 2. Child Switch Crossfade

When tapping a different child in the fused header:
1. Current content fades out (opacity 1→0, 200ms)
2. Data/state updates
3. New content fades in (opacity 0→1, 200ms)
4. Accent colors morph via interpolation (old accent → new accent, 400ms)
5. Staggered reveal replays on the new content

### 3. Press States (Micro-interactions)

On tile press:
- Scale: 1 → 0.97 (spring, 100ms)
- Shadow reduces
- On release: spring back to 1

On fused header mini-avatar press:
- Scale: 1 → 0.9 (quick spring)

### 4. Icon Bounce

When tile appears (during stagger), the icon does a small bounce:
- Scale: 0 → 1.15 → 1 (spring overshoot)
- Delay: same as parent tile + 100ms

### 5. Accent Bar Pulse

The gradient accent bar under the header has a very subtle pulse:
- Opacity: 0.8 → 1 → 0.8 (loop, 3s period)
- Very subtle — barely noticeable, adds life

## Components to Create/Modify

| Component | Action |
|---|---|
| `FusedChildHeader` | **New** — replaces ChildSwitcherBar, integrates greeting |
| `AccueilScreen` | **Modify** — integrate new header, animations, border-left tiles, typography |
| `DashboardTile` | **Extract** — standalone component with border-left, press state, icon bounce |
| `AriaCard` | **Extract** — standalone with border-left accent, warm tint |
| `JoyScoreBanner` | **Extract** — standalone with border-left amber |
| `ChildSwitcherBar` | **Remove** — replaced by FusedChildHeader |

## What is NOT in scope

- Other screens (Notes, Aria, Agenda) — those stay as-is for now
- DM Serif Display — replaced by Lora per brainstorm decision
- Dark mode
- Real data integration (still using mock data)
- Custom font for tab bar labels (stay system default for now)
