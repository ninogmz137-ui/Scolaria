# TODO — Scolaria · UI Sprint v3.0

## Sprint v3.0 — COMPLÉTÉ (5 mai 2026)

### Fondations
- [x] `src/constants/design.ts` — tokens C, RADIUS, SHADOW, BOTTOM_BAR_HEIGHT
- [x] `src/components/WhiteCard.tsx` — carte blanche Android-safe (2 Views)
- [x] `src/components/DeepScreenHeader.tsx` — header écrans profonds
- [x] `src/components/AriaInlineCard.tsx` — card Aria gradient EEF2FF→F0FDFA

### Écrans mis à jour
- [x] `AccueilScreen.tsx` — fix gap Android, pattern 2-Views todayListWrap/recentCard, tokens C

### Nouveaux écrans deep
- [x] `HomeworkScreen.tsx` — cahier de texte Emma 4ᵉB
- [x] `TimetableScreen.tsx` — emploi du temps
- [x] `EventDetailScreen.tsx` — détail événement agenda
- [x] `GradeDetailScreen.tsx` — détail note + sparkline SVG
- [x] `SignDocScreen.tsx` — signature autorisation
- [x] `SignSuccessScreen.tsx` — confirmation signature

### Onboarding
- [x] `src/screens/onboarding/OnboardingSplashScreen.tsx`
- [x] `src/screens/onboarding/OnboardingSignupScreen.tsx`
- [x] `src/screens/onboarding/OnboardingSchoolCodeScreen.tsx`
- [x] `src/screens/onboarding/OnboardingLinkChildScreen.tsx`

### Navigation
- [x] `TabNavigator.tsx` — 6 nouveaux écrans enregistrés dans leurs stacks

## Pending — Sprint v3.1
- [ ] NotesScreen v3 redesign (sparkline Figtree, pills matières, cartes extensibles)
- [ ] AgendaScreen v3 (FAB cercle, event cards sans emoji)
- [ ] MessagerieScreen v3 (search toolbar, conversation rows avec tags)
- [ ] AriaScreen v3 (topbar spécifique, suggestions centré, input Aria)
- [ ] `npx expo run:android` — test visuel des nouveaux écrans
- [ ] EAS build quand tout est validé localhost
