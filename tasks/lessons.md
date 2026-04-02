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
