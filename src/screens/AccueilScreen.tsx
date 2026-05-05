import React, { useMemo, useState, useEffect, type ReactNode } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MessageCircle, Calendar, Heart, BookOpen, LayoutGrid } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useWallpaper } from '../contexts/WallpaperContext';
import { useTopbarScroll } from '../contexts/TopbarScrollContext';
import ScolariaSymbol from '../components/ScolariaSymbol';
import SectionLabel from '../components/SectionLabel';
import { supabase } from '../services/supabase';
import { C } from '../constants/design';

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
  {
    id: 'homework',
    icon: <BookOpen size={20} color="rgba(5,150,105,0.95)" strokeWidth={2} />,
    iconBg: 'rgba(5,150,105,0.10)',
    title: 'Cahier de texte',
    subtitle: 'Emma · 4ᵉB',
    meta: '→',
  },
  {
    id: 'timetable',
    icon: <LayoutGrid size={20} color="rgba(67,56,202,0.95)" strokeWidth={2} />,
    iconBg: 'rgba(67,56,202,0.10)',
    title: 'Emploi du temps',
    subtitle: 'Semaine en cours',
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
      {/* marginRight remplace gap: 10 (Android-unsafe) */}
      <View style={[styles.listIconWrap, { backgroundColor: iconBg, marginRight: 10 }]}>{icon}</View>
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
  const { children, selectedChild } = useActiveChild();
  const { onScroll: reportScroll } = useTopbarScroll();
  const { wallpaper, wallpaperSource, customUri } = useWallpaper();

  const prenom = selectedChild?.name?.split(' ')[0] ?? 'Camille';

  const [recents, setRecents] = useState(demoRecents);

  useEffect(() => {
    const childId = selectedChild?.id;
    if (!childId || childId === 'demo-lea') {
      setRecents(demoRecents);
      return;
    }
    supabase
      .from('grades')
      .select('id, subject_name, value, created_at')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const COLORS = ['#1A2340', '#0F766E', '#1E3A5F'];
          setRecents(
            data.map((g, i) => ({
              id: g.id,
              label: `${g.subject_name} · ${g.value}/20`,
              color: COLORS[i % COLORS.length],
            })),
          );
        } else {
          setRecents(demoRecents);
        }
      });
  }, [selectedChild?.id]);

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
              colors={wallpaper.colors ?? ['#2D1B69', C.indigo, 'rgba(34,211,238,0.6)']}
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
          {recents.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.recentCardOuter}
              activeOpacity={0.88}
              accessibilityRole="button"
              onPress={() => {
                if (item.id === '1') nav.navigate('AriaHome');
                else if (item.id === '2') nav.getParent()?.getParent()?.navigate('Agenda');
                else nav.getParent()?.getParent()?.navigate('Notes');
              }}
            >
              {/* Inner: overflow hidden */}
              <View style={styles.recentCardInner}>
                <View style={{ height: 44, backgroundColor: item.color }} />
                <Text style={styles.recentLabel}>{item.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Aujourd'hui */}
        <SectionLabel text="Aujourd'hui" />
        {/* Outer: shadow + bg */}
        <View style={styles.todayOuter}>
          {/* Inner: overflow hidden */}
          <View style={styles.todayInner}>
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
                  if (it.id === 'agenda') nav.getParent()?.getParent()?.navigate('Agenda');
                  if (it.id === 'joy') nav.navigate('BienEtreScreen');
                  if (it.id === 'homework') nav.navigate('Homework');
                  if (it.id === 'timetable') nav.navigate('Timetable');
                }}
              />
            ))}
          </View>
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
            {/* marginRight remplace gap: 10 (Android-unsafe) */}
            <View style={{ marginRight: 10 }}>
              <ScolariaSymbol size={18} color={C.indigo} />
            </View>
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
  root: { flex: 1, backgroundColor: C.bg },

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

  // Récents — gap: 8 remplacé par paddingRight sur chaque card (via recentCardOuter)
  recentsRow: { paddingHorizontal: 14 },

  // Outer: background + shadow — PAS d'overflow hidden
  recentCardOuter: {
    width: 144,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.75)',
    marginRight: 8,
    ...Platform.select({
      ios: {
        shadowColor: C.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 0 },
    }),
  },
  // Inner: overflow hidden pour clips les coins
  recentCardInner: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.90)',
  },
  recentLabel: {
    padding: 8,
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    color: C.text,
    lineHeight: 16,
  },

  // Aujourd'hui — pattern 2-Views: outer shadow, inner overflow hidden
  todayOuter: {
    marginHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: C.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 0 },
    }),
  },
  todayInner: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
  },

  // listItem — gap: 10 remplacé par marginRight sur listIconWrap (dans le composant)
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    // marginRight appliqué inline dans HomeListItem
  },
  listTitle: { fontFamily: 'Figtree_500Medium', fontSize: 14, color: C.text },
  listSubtitle: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 10.5,
    color: C.text55,
    marginTop: 1,
  },
  listMeta: { fontFamily: 'Figtree_400Regular', fontSize: 12, color: C.text35 },

  // ariaCard — gap: 10 remplacé par marginRight sur wrapper ScolariaSymbol (inline)
  ariaCard: {
    borderWidth: 1,
    borderColor: 'rgba(67,56,202,0.10)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  ariaLabel: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    letterSpacing: 0.3,
    color: C.indigo,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  ariaMessage: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 12.5,
    color: C.text,
    lineHeight: 18,
  },
});
