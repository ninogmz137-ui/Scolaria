# Lessons Learned — Scolaria

<!-- Format : [date] | ce qui a mal tourné | règle pour l'éviter -->

[2026-03-29] | Provider nesting order in App.tsx caused APK crash (ActiveChildProvider used useAuth but was above AuthProvider) | Always check context dependency order when adding useX() hooks to a provider
[2026-03-29] | EXPO_PUBLIC_ env vars not in eas.json → missing at build time → runtime errors | Every EXPO_PUBLIC_ variable must be in BOTH .env (local dev) AND eas.json env (EAS builds)
[2026-03-29] | Hardcoded TOPBAR_HEIGHT per platform ignored safe area insets → overlap on Android | Always use useSafeAreaInsets() instead of hardcoded platform-specific padding
[2026-03-29] | API key 401 in production showed cryptic error | Always include actionable next step in user-facing error messages (where to regenerate, what to update)
[2026-03-30] | process.env.EXPO_PUBLIC_* undefined in EAS builds because .env is gitignored | NEVER rely on .env for EAS builds. Use app.config.js to read env vars at build time and inject into Constants.expoConfig.extra. Create a single getEnv.ts helper.
[2026-03-30] | EAS Secrets marked "Sensitive" don't get inlined into JS bundle | EXPO_PUBLIC_ vars must be "Plain text" visibility in EAS, or better: use app.config.js extra pattern
[2026-03-30] | Spent 4 builds debugging env vars without understanding Expo's env injection | Before fixing env issues: understand the FULL chain (where var is defined → how it reaches Metro → how Metro inlines it). Don't just add more env sources — verify the pipeline.
[2026-04-02] | Android elevation > 0 draws grey outline even with borderWidth: 0 — took 4 builds to find | On Android, ALWAYS set elevation: 0 on card components. Use only background color contrast for visual separation. Elevation is only for floating UI (modals, tab bars).
[2026-04-02] | Fixed GlassCard but missed 15+ other components with hardcoded borderWidth/elevation | Before claiming a visual fix is done: grep the ENTIRE codebase for the property. Fix once, fix everywhere.
[2026-04-09] | UI changes not visible despite correct file edits — multiple Metro servers running (8081, 8082, 8083) serving stale bundles | Always kill ALL node processes before starting a new server. User was hitting an old server with the old bundle.
[2026-04-09] | AriaAvatar change had no effect — MessagerieScreen had its own inline gradient avatars for Aria type, completely independent of AriaAvatar.tsx | Before editing a component, grep files_with_matches for the visual pattern (gradient colors, icon style) to find ALL rendering sites — not just the obvious component.
[2026-04-09] | White icon on white background — forgot to add shadow/border when switching from gradient to white background | When replacing a colored background with white/glass, ALWAYS add a shadow + slightly colored border to ensure visibility against light backgrounds.
[2026-04-10] | Safe area padding buried in contentContainerStyle caused flicker on first render before insets were computed | Own the safe area at the topmost container (paddingTop: insets.top on root View). Children don't need to know about it.
[2026-04-10] | KeyboardAvoidingView behavior=undefined on Android means keyboard hides the input bar | Always use behavior='height' on Android (behavior='padding' on iOS). Never leave behavior=undefined.
[2026-04-10] | gap: 8 on absolute-positioned flex container caused icon overlap on some Android builds | Replace gap with explicit marginRight/marginLeft on the affected children. gap in absolute containers is unreliable on Android.
