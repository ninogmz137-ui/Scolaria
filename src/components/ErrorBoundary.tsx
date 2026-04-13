import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { TAB_BAR_SCROLL_PADDING } from './FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; info: React.ErrorInfo | null }
> {
  state = { error: null, info: null };

  static getDerivedStateFromError(error: Error) {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep it visible on web; still log for devtools.
    // eslint-disable-next-line no-console
    console.error(error, info);
    this.setState({ error, info });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.root}>
        <Text style={styles.title}>Erreur de rendu</Text>
        <Text style={styles.subtitle}>Copie-colle ce message ici.</Text>
        <ScrollView style={styles.box} contentContainerStyle={{ paddingBottom: TAB_BAR_SCROLL_PADDING }}>
          <Text style={styles.mono}>{String(this.state.error?.stack || this.state.error?.message)}</Text>
          {this.state.info?.componentStack ? (
            <>
              <Text style={styles.section}>Component stack</Text>
              <Text style={styles.mono}>{this.state.info.componentStack}</Text>
            </>
          ) : null}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 16,
    backgroundColor: Colors.pageBg,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 12,
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  box: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 12,
  },
  section: {
    marginTop: 14,
    marginBottom: 6,
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  mono: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textPrimary,
  },
});

