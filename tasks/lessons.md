# Lessons Learned — Scolaria

<!-- Format : [date] | ce qui a mal tourné | règle pour l'éviter -->

[2026-03-29] | Provider nesting order in App.tsx caused APK crash (ActiveChildProvider used useAuth but was above AuthProvider) | Always check context dependency order when adding useX() hooks to a provider
[2026-03-29] | EXPO_PUBLIC_ env vars not in eas.json → missing at build time → runtime errors | Every EXPO_PUBLIC_ variable must be in BOTH .env (local dev) AND eas.json env (EAS builds)
[2026-03-29] | Hardcoded TOPBAR_HEIGHT per platform ignored safe area insets → overlap on Android | Always use useSafeAreaInsets() instead of hardcoded platform-specific padding
[2026-03-29] | API key 401 in production showed cryptic error | Always include actionable next step in user-facing error messages (where to regenerate, what to update)
