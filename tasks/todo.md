# TODO — Scolaria

## Phase 1 : Fonds et Headers (refonte visuelle majeure)

### Étape 1 — Theme system
- [ ] SchoolModeContext.tsx: ajouter backgroundColor, headerGradientFull[], isDarkBg, textOnBg, textOnBgSecondary
- [ ] themes.ts: porter les nouvelles propriétés dans deriveThemePalette
- [ ] ChildThemeContext.tsx: passer les nouvelles propriétés dans le merge

### Étape 2 — Composants
- [ ] Créer ScreenHeader.tsx : header 30-35% écran, gradient courbe, border-radius 28 bas
- [ ] WallpaperBackground.tsx: rendre mode-aware (fond par mode au lieu de gradient wallpaper)

### Étape 3 — Écrans (parallélisable)
- [ ] AccueilScreen.tsx: ScreenHeader + fond mode + textes adaptatifs
- [ ] NotesScreen.tsx: ScreenHeader + fond mode + textes adaptatifs
- [ ] AriaScreen.tsx: ScreenHeader intégré au header existant + fond mode
- [ ] AgendaScreen.tsx: ScreenHeader + fond mode + textes adaptatifs

### Étape 4 — Vérification
- [ ] npx tsc --noEmit = 0 erreurs
- [ ] Vérifier visuellement les 3 modes (Léa/Lucas/Emma)
