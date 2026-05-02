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
import { MessageCircle, Calendar, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useWallpaper } from '../contexts/WallpaperContext';
import { useTopbarScroll } from '../contexts/TopbarScrollContext';
import ScolariaSymbol from '../components/ScolariaSymbol';
import SectionLabel from '../components/SectionLabel';

const BG = '#F2F1EE';
const NAVY = '#0F172A';
const INDIGO = '#4338CA';

const demoRecents = [
  { id: '1', label: 'Bilan Emma · Aria', color: '#1A2340' },
  { id: '2', label: 'Agenda avril', color: '#0F766E' },
  { id: '3', label: 'Notes T2 · Emma', color: '#1E3A5F' },
];

const demoAujourdhui = [
  {
    id: 'msg',
    icon: <MessageCircle size={20} color="rgba(239,68,68,0.95)" strokeWidth={2} />,
    iconBg: 'rgba(239,68,68,0.10)',
    title: 'Message de Mme Dupont',
    subtitle: 'Français · À lire',
    meta: '09:12',
  },
  {
    id: 'agenda',
    icon: <Calendar size={20} color="rgba(99,102,241,0.95)" strokeWidth={2} />,
    iconBg: 'rgba(99,102,241,0.10)',
    title: 'Contrôle maths demain',
    subtitle: 'Emma · Salle 204',
    meta: 'rappel',
  },
  {
    id: 'joy',
    icon: <Heart size={20} color="rgba(245,158,11,0.95)" strokeWidth={2} />,
    iconBg: 'rgba(245,158,11,0.10)',
    title: 'Score de Joie de Léa',
    subtitle: 'Pas encore saisi',
    meta: '→',
  },
];

const demoAriaMessage = 'Emma progresse en maths ce trimestre. Sa moyenne a augmenté de 1,2 point.';

function HomeListItem({
  icon,
  iconBg,
  title,
  subtitle,
  meta,
  onPress,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  meta: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <View style={[styles.listIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.listSubtitle}>{subtitle}</Text>}
      </View>
      <Text style={styles.listMeta}>{meta}</Text>
    </TouchableOpacity>
  );
}

export default function AccueilScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { children } = useActiveChild();
  const { onScroll: reportScroll } = useTopbarScroll();
  const { wallpaper, wallpaperSource, customUri } = useWallpaper();

  const prenom = useMemo(() => {
    const raw =
      (user as any)?.user_metadata?.first_name ||
      (user as any)?.user_metadata?.prenom ||
      (user?.email ? user.email.split('@')[0] : '');
    const name = String(raw || '').trim();
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Camille';
  }, [user]);

  const familyName = useMemo(() => {
    const raw = (user as any)?.user_metadata?.family_name || (user as any)?.user_metadata?.nom_famille;
    return String(raw || 'Moreau').trim() || 'Moreau';
  }, [user]);

  const nbEnfants = children.length || 1;

  const showImageWallpaper = !!customUri || wallpaper.type === 'image';

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 98 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => reportScroll(e.nativeEvent.contentOffset.y)}
      >
        {/* TopBar est un overlay (position absolute) */}
        <View style={{ height: insets.top + 60 }} />

        {/* Header wallpaper */}
        <View style={styles.headerWrap}>
          {!showImageWallpaper ? (
            <LinearGradient
              colors={wallpaper.colors ?? ['#2D1B69', INDIGO, 'rgba(34,211,238,0.6)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <Image source={wallpaperSource.source} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(15,23,42,0.25)']}
            style={[StyleSheet.absoluteFill, { top: '40%' }]}
          />
          <View style={styles.headerInner}>
            <Text style={styles.headerHello}>Bonjour, {prenom} 👋</Text>
            <Text style={styles.headerMeta}>
              Famille {familyName} · {nbEnfants} enfant{nbEnfants > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Récents */}
        <SectionLabel text="Récents" style={{ paddingTop: 10 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentsRow}>
          {demoRecents.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.recentCard}
              activeOpacity={0.88}
              accessibilityRole="button"
              onPress={() => {
                if (item.id === '1') nav.navigate('AriaHome');
                if (item.id === '2') nav.getParent()?.navigate('Agenda');
                if (item.id === '3') nav.getParent()?.navigate('Notes');
              }}
            >
              <View style={{ height: 44, backgroundColor: item.color }} />
              <Text style={styles.recentLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Aujourd'hui */}
        <SectionLabel text="Aujourd'hui" />
        <View style={styles.todayListWrap}>
          {demoAujourdhui.map((it) => (
            <HomeListItem
              key={it.id}
              icon={it.icon}
              iconBg={it.iconBg}
              title={it.title}
              subtitle={it.subtitle}
              meta={it.meta}
              onPress={() => {
                if (it.id === 'msg') nav.navigate('MessagerieTab', { screen: 'MessagesListScreen' });
                if (it.id === 'agenda') nav.getParent()?.navigate('Agenda');
                if (it.id === 'joy') nav.navigate('BienEtreScreen');
              }}
            />
          ))}
        </View>

        {/* Widget Aria */}
        <View style={{ paddingHorizontal: 14, marginTop: 4 }}>
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
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <ScolariaSymbol size={18} color={INDIGO} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ariaLabel}>ARIA</Text>
              <Text style={styles.ariaMessage}>{demoAriaMessage}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  headerWrap: {
    marginHorizontal: 12,
    height: 164,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
  },
  headerInner: { flex: 1, padding: 16, justifyContent: 'space-between' },
  headerHello: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 21,
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerMeta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },

  recentsRow: { paddingHorizontal: 14, gap: 8 },
  recentCard: {
    width: 144,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.90)',
    shadowColor: NAVY,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recentLabel: {
    padding: 8,
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    color: NAVY,
    lineHeight: 16,
  },

  todayListWrap: {
    marginHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.90)',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.04)',
  },
  listIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: { fontFamily: 'Figtree_500Medium', fontSize: 14, color: NAVY },
  listSubtitle: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 10.5,
    color: 'rgba(15,23,42,0.55)',
    marginTop: 1,
  },
  listMeta: { fontFamily: 'Figtree_400Regular', fontSize: 12, color: 'rgba(15,23,42,0.35)' },

  ariaCard: {
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.10)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    overflow: 'hidden',
  },
  ariaLabel: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 0.3,
    color: INDIGO,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  ariaMessage: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12.5,
    color: NAVY,
    lineHeight: 18,
  },
});
