import React, { useMemo, type ReactNode } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MessageCircle, Calendar, Heart, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useWallpaper } from '../contexts/WallpaperContext';
import { useTopbarScroll } from '../contexts/TopbarScrollContext';
import ScolariaSymbol from '../components/ScolariaSymbol';
import SectionLabel from '../components/SectionLabel';

const BG = '#F7F7F5';
const NAVY = '#0F172A';
const INDIGO = '#4338CA';
const BORDER_L = 'rgba(15,23,42,0.05)';

const demoRecents = [
  {
    id: '1',
    label: 'Bilan Emma · Aria',
    color: '#13183B',
    accent: 'rgba(99,102,241,0.30)',
  },
  {
    id: '2',
    label: 'Agenda avril',
    color: '#1F6E5C',
    accent: 'rgba(34,211,238,0.25)',
  },
  {
    id: '3',
    label: 'Notes T2 · Emma',
    color: '#1B2A4E',
    accent: 'rgba(99,102,241,0.22)',
  },
  {
    id: '4',
    label: 'Cahier · Lucas',
    color: '#3A2F1F',
    accent: 'rgba(245,158,11,0.20)',
  },
];

const demoAujourdhui = [
  {
    id: 'msg',
    icon: <MessageCircle size={16} color="#BE123C" strokeWidth={2} />,
    iconBg: '#FFE4E6',
    title: 'Message de Mme Dupont',
    subtitle: 'Français · À lire',
    meta: '09:12',
  },
  {
    id: 'agenda',
    icon: <Calendar size={16} color={INDIGO} strokeWidth={2} />,
    iconBg: '#E0E7FF',
    title: 'Contrôle maths demain',
    subtitle: 'Emma · Salle 204',
    meta: 'rappel',
  },
  {
    id: 'joy',
    icon: <Heart size={16} color="#D97706" strokeWidth={2} />,
    iconBg: '#FEF3C7',
    title: 'Score de Joie de Léa',
    subtitle: 'Pas encore saisi',
    meta: '',
    chevron: true,
  },
];

const demoAriaMessage =
  'Emma progresse en maths ce trimestre. Sa moyenne a augmenté de 1,2 point.';

function HomeListItem({
  icon,
  iconBg,
  title,
  subtitle,
  meta,
  chevron,
  onPress,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  meta: string;
  chevron?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <View style={[styles.listIconWrap, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.listTitle} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.listSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.listTrail}>
        {!!meta && <Text style={styles.listMeta}>{meta}</Text>}
        {chevron && (
          <ChevronRight size={14} color="rgba(15,23,42,0.35)" strokeWidth={2} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function AccueilScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { children } = useActiveChild();
  const { wallpaper, wallpaperSource, customUri } = useWallpaper();
  const { onScroll: reportScroll } = useTopbarScroll();

  const prenom = useMemo(() => {
    const raw =
      (user as any)?.user_metadata?.first_name ||
      (user as any)?.user_metadata?.prenom ||
      (user?.email ? user.email.split('@')[0] : '');
    const name = String(raw || '').trim();
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Camille';
  }, [user]);

  const familyName = useMemo(() => {
    const raw =
      (user as any)?.user_metadata?.family_name ||
      (user as any)?.user_metadata?.nom_famille;
    return String(raw || 'Moreau').trim() || 'Moreau';
  }, [user]);

  const nbEnfants = children.length || 1;
  const showImageWallpaper = !!customUri || wallpaper.type === 'image';

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => reportScroll(e.nativeEvent.contentOffset.y)}
      >
        {/* Espace pour la TopBar overlay */}
        <View style={{ height: insets.top + 64 }} />

        {/* ── Header wallpaper ── */}
        <View style={styles.headerWrap}>
          {!showImageWallpaper ? (
            <LinearGradient
              colors={
                (wallpaper.colors as [string, string, ...string[]]) ??
                (['#2D1B69', INDIGO, 'rgba(34,211,238,0.6)'] as [
                  string,
                  string,
                  string,
                ])
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <Image
              source={wallpaperSource.source}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          )}
          {/* Overlay dégradé bas */}
          <LinearGradient
            colors={['transparent', 'rgba(15,23,42,0.20)']}
            style={[StyleSheet.absoluteFill, { top: '40%' }]}
          />
          <View style={styles.headerInner}>
            <Text style={styles.headerHello}>
              Bonjour, {prenom}{' '}
              <Text style={styles.headerWave}>👋</Text>
            </Text>
            <Text style={styles.headerMeta}>
              Famille {familyName} · {nbEnfants} enfant
              {nbEnfants > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* ── Récents ── */}
        <SectionLabel text="Récents" style={{ paddingTop: 12 }} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentsRow}
        >
          {demoRecents.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.88}
              accessibilityRole="button"
              onPress={() => {
                if (item.id === '1') nav.navigate('AriaHome');
                if (item.id === '2')
                  nav.getParent()?.getParent()?.navigate('Agenda');
                if (item.id === '3')
                  nav.getParent()?.getParent()?.navigate('Notes');
              }}
            >
              {/* Tuile colorée 130×88 */}
              <View style={[styles.recentTile, { backgroundColor: item.color }]}>
                {/* Accent radial simulé avec un LinearGradient diagonal */}
                <LinearGradient
                  colors={[item.accent, 'transparent']}
                  start={{ x: 0.7, y: 0.3 }}
                  end={{ x: 0.0, y: 1.0 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
              {/* Label sous la tuile */}
              <Text style={styles.recentLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Aujourd'hui ── */}
        <SectionLabel text="Aujourd'hui" />
        <View style={styles.todayCard}>
          {demoAujourdhui.map((it, i) => (
            <React.Fragment key={it.id}>
              <HomeListItem
                icon={it.icon}
                iconBg={it.iconBg}
                title={it.title}
                subtitle={it.subtitle}
                meta={it.meta}
                chevron={it.chevron}
                onPress={() => {
                  if (it.id === 'msg')
                    nav.navigate('MessagerieTab', {
                      screen: 'MessagesListScreen',
                    });
                  if (it.id === 'agenda')
                    nav.getParent()?.getParent()?.navigate('Agenda');
                  if (it.id === 'joy') nav.navigate('BienEtreScreen');
                }}
              />
              {i < demoAujourdhui.length - 1 && (
                <View style={styles.divider} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* ── Card Aria ── */}
        <TouchableOpacity
          style={styles.ariaCard}
          activeOpacity={0.9}
          accessibilityRole="button"
          onPress={() => nav.navigate('AriaHome')}
        >
          <LinearGradient
            colors={['#EEF2FF', '#F0FDFA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
          />
          <View style={styles.ariaSymbol}>
            <ScolariaSymbol size={20} color={INDIGO} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ariaLabel}>ARIA</Text>
            <Text style={styles.ariaMessage}>{demoAriaMessage}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Header ─────────────────────────────────────────────
  headerWrap: {
    marginHorizontal: 16,
    height: 170,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: NAVY,
    shadowOpacity: 0.10,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  headerInner: {
    flex: 1,
    padding: 22,
    justifyContent: 'space-between',
  },
  headerHello: {
    fontFamily: 'Figtree_800ExtraBold',
    fontSize: 24,
    color: '#fff',
    letterSpacing: -0.7,
    textShadowColor: 'rgba(0,0,0,0.20)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerWave: {
    fontFamily: 'Figtree_800ExtraBold',
  },
  headerMeta: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: -0.05,
  },

  // ── Récents ────────────────────────────────────────────
  recentsRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  recentTile: {
    width: 130,
    height: 88,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: NAVY,
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  recentLabel: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    color: NAVY,
    marginTop: 8,
    letterSpacing: -0.15,
    maxWidth: 130,
  },

  // ── Today list ─────────────────────────────────────────
  todayCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER_L,
    overflow: 'hidden',
    shadowColor: NAVY,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  listIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listTitle: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    color: NAVY,
    letterSpacing: -0.2,
  },
  listSubtitle: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: 'rgba(15,23,42,0.55)',
    marginTop: 2,
    letterSpacing: -0.05,
  },
  listTrail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  listMeta: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    color: 'rgba(15,23,42,0.55)',
  },
  divider: {
    height: 1,
    backgroundColor: BORDER_L,
    marginLeft: 68, // aligne après l'icône
  },

  // ── Aria card ──────────────────────────────────────────
  ariaCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    borderRadius: 18,
    padding: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 13,
    overflow: 'hidden',
  },
  ariaSymbol: {
    marginTop: 3,
    flexShrink: 0,
  },
  ariaLabel: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 1.3,
    color: INDIGO,
    opacity: 0.85,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  ariaMessage: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 15,
    color: NAVY,
    lineHeight: 22,
    letterSpacing: -0.15,
  },
});
