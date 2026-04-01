# TODO — Scolaria

## Phase 2A : Bottom Tab Bar Premium
- [x] FloatingTabBar — mode-aware bg (dark/light from theme.isDarkBg)
- [x] Active tab: accent at 15% opacity + accent text label
- [x] Icon size 24px, Aria always gradient (MaskedView + LinearGradient)
- [x] Height 64, padding h8 v8, borderRadius 20 on pills
- [x] Tab label: 11px DM Sans 600 (FontFamily.sansSemiBold)
- [x] Shadow only on light mode, hairline border
- [x] Install @react-native-masked-view/masked-view

## Phase 2B : Typographie Premium
- [x] Install @expo-google-fonts/barlow-condensed
- [x] Update useSolariaFonts: replace Lora with BarlowCondensed (600/700/800)
- [x] Legacy aliases for backward compat
- [x] FloatingTabBar tab label → FontFamily.sansSemiBold
- [x] AriaScreen headerTitle → FontFamily.displayBold
- [x] SettingsScreen sectionTitle → FontFamily.displayBold 13px uppercase ls:2
- [x] DashboardTile value → FontFamily.displayBold 32px
- [x] DashboardTile label → FontFamily.displayBold 11px uppercase ls:2
- [x] AriaCard label → FontFamily.displayBold 13px uppercase ls:2
- [ ] AccueilScreen — agent running (sectionLabel + tileValue)
- [ ] NotesScreen — agent running (summaryValue, subjectName, subjectAvg)
- [ ] AgendaScreen — agent running (weekTitle, dayNumber, badgeText)
- [ ] ProfilEnfantScreen + SignalerAbsenceScreen — agent fixing fontWeight leaks

## Pending
- EAS build in progress (commit 0edce61 — gradient fade-to-bg)
- Phase 2 commit pending after all agents complete
