import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MessageCircle, Calendar, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomBarScrollPadding } from '../components/navigation/BottomBar';
import { useActiveChild, DEFAULT_CHILD_COLOR } from '../contexts/ActiveChildContext';
import Animated from 'react-native-reanimated';
import { useTopbarScrollHandler } from '../contexts/TopbarScrollContext';
import ScolariaSymbol from '../components/ScolariaSymbol';
import SectionLabel from '../components/SectionLabel';
import JustifierAbsenceSheet from '../components/JustifierAbsenceSheet';
import { C } from '../constants/design';
import { Text } from '../components/ui';

// ─── Data démo ────────────────────────────────────────────

const ACTION_PILLS: Record<string, { label: string; bg: string; color: string }> = {
  signer:    { label: 'SIGNER',    bg: '#FEE2E2', color: '#B91C1C' },
  lire:      { label: 'LIRE',      bg: '#E0E7FF', color: '#4338CA' },
  justifier: { label: 'JUSTIFIER', bg: '#FEF3C7', color: '#B45309' },
};

const demoTodo = [
  { kind: 'signer',    title: 'Sortie Orsay',   deadline: 'Avant jeudi' },
  { kind: 'justifier', title: 'Absence lundi',  deadline: 'Sous 48h'    },
];

const demoAujourdhui = [
  { id: 'controle', title: 'Contrôle Maths',      meta: 'Salle 204',  time: '10h' },
  { id: 'reunion',  title: 'Réunion parents-prof', meta: 'Mme Dupont', time: '17h' },
];

const demoGrades = [
  { subject: 'Mathématiques', grade: '16', scale: '20', date: 'hier'     },
  { subject: 'Histoire',      grade: '15', scale: '20', date: '22 avril' },
  { subject: 'Français',      grade: '13', scale: '20', date: '18 avril' },
];

const demoAriaMessage = 'Emma a un contrôle maths demain — veux-tu un résumé du cours ?';

/** Hauteur réservée à la top bar au-dessus du contenu du header (TOPBAR_PADDING_TOP + rangée + marge). */
const HERO_TOPBAR_RESERVE = 60;

// ─── Sous-composants ──────────────────────────────────────

function ActionRow({
  kind, title, deadline, last, onPress,
}: { kind: string; title: string; deadline: string; last?: boolean; onPress?: () => void }) {
  const p = ACTION_PILLS[kind];
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      activeOpacity={0.85}
      accessibilityRole="button"
      onPress={onPress}
    >
      <View style={[styles.actionBadge, { backgroundColor: p.bg }]}>
        <Text style={[styles.actionBadgeText, { color: p.color }]}>{p.label}</Text>
      </View>
      <Text style={styles.actionTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.deadlineText}>{deadline}</Text>
      <ChevronRight size={14} color="rgba(15,23,42,0.35)" strokeWidth={2} />
    </TouchableOpacity>
  );
}

function TodayRow({
  icon, title, meta, time, last, onPress,
}: { icon: React.ReactNode; title: string; meta: string; time?: string; last?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.todayIconTile}>{icon}</View>
      <View style={styles.todayTexts}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.metaText}>{meta}</Text>
      </View>
      {!!time && <Text style={styles.timeText}>{time}</Text>}
    </TouchableOpacity>
  );
}

function GradeRow({
  subject, grade, scale, date, last, onPress,
}: { subject: string; grade: string; scale: string; date: string; last?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.gradeRow, !last && styles.rowBorder]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <Text style={styles.gradeSubject}>{subject}</Text>
      <Text style={styles.gradeNumber}>
        {grade}<Text style={styles.gradeScale}>/{scale}</Text>
      </Text>
      <Text style={styles.gradeDate}>{date}</Text>
    </TouchableOpacity>
  );
}

// ─── Écran principal ──────────────────────────────────────

export default function AccueilScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { selectedChild } = useActiveChild();
  const scrollHandler = useTopbarScrollHandler();

  const [justifierVisible, setJustifierVisible] = useState(false);

  const prenom = selectedChild?.name?.split(' ')[0] ?? '';
  const heroColor = selectedChild?.color ?? DEFAULT_CHILD_COLOR;

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: getBottomBarScrollPadding(insets.bottom) }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
      >
        {/* Header pleine largeur : passe derrière la barre d'état et la top bar (transparente au
            repos), couleur de l'enfant, bas arrondi qui se pose sur #F2F1EE. Part avec le contenu. */}
        <View
          style={[
            styles.hero,
            { paddingTop: insets.top + HERO_TOPBAR_RESERVE, backgroundColor: heroColor },
          ]}
        >
          <Text style={styles.heroHello}>Bonjour</Text>
          <Text style={styles.heroPrenom} numberOfLines={1}>{prenom}</Text>
        </View>

        {/* À faire */}
        {demoTodo.length > 0 && (
          <>
            <SectionLabel
              text="À faire"
              style={styles.sectionLabel}
            />
            <View style={styles.cardOuter}>
              <View style={styles.cardInner}>
                {demoTodo.map((it, i) => (
                  <ActionRow
                    key={i}
                    {...it}
                    last={i === demoTodo.length - 1}
                    onPress={
                      it.kind === 'justifier' ? () => setJustifierVisible(true) :
                      it.kind === 'signer' ? () => nav.navigate('SignDoc') :
                      undefined
                    }
                  />
                ))}
              </View>
            </View>
          </>
        )}

        {/* Aujourd'hui */}
        <SectionLabel text="Aujourd'hui" style={styles.sectionLabel} />
        {demoAujourdhui.length > 0 ? (
          <View style={styles.cardOuter}>
            <View style={styles.cardInner}>
              {demoAujourdhui.map((it, i) => (
                <TodayRow
                  key={it.id}
                  icon={
                    it.id === 'controle'
                      ? <Calendar size={14} color="rgba(15,23,42,0.55)" strokeWidth={1.8} />
                      : <MessageCircle size={14} color="rgba(15,23,42,0.55)" strokeWidth={1.8} />
                  }
                  title={it.title}
                  meta={it.meta}
                  time={it.time}
                  last={i === demoAujourdhui.length - 1}
                  onPress={
                    it.id === 'controle'
                      ? () => nav.getParent()?.navigate('Agenda')
                      : () => nav.getParent()?.navigate('Messagerie')
                  }
                />
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.emptyState}>Journée tranquille 👌</Text>
        )}

        {/* Dernières notes */}
        <SectionLabel text="Dernières notes" style={styles.sectionLabel} />
        <View style={styles.cardOuter}>
          <View style={styles.cardInner}>
            {demoGrades.map((it, i) => (
              <GradeRow
                key={i}
                {...it}
                last={i === demoGrades.length - 1}
                onPress={() => nav.getParent()?.navigate('Notes')}
              />
            ))}
          </View>
        </View>
        <TouchableOpacity
          style={styles.ghostLink}
          activeOpacity={0.7}
          onPress={() => nav.getParent()?.navigate('Notes')}
        >
          <Text style={styles.ghostLinkText}>Voir toutes les notes →</Text>
        </TouchableOpacity>

        <View style={{ height: 14 }} />

        {/* Aria */}
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
            <View style={{ marginRight: 10 }}>
              <ScolariaSymbol size={18} color={C.indigo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ariaLabel}>ARIA</Text>
              <Text style={styles.ariaMessage}>{demoAriaMessage}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      <JustifierAbsenceSheet
        visible={justifierVisible}
        onClose={() => setJustifierVisible(false)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── ScrollView transparent ───────────────────────────
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ── Contenu hero ─────────────────────────────────────
  // Pleine largeur, pas d'arrondi en haut ; bas arrondi (plus net qu'un fondu couleur → #F2F1EE,
  // qui crée une bande terne, et compatible avec une photo de fond).
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 26,
    marginBottom: 14,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    minHeight: 200,
    justifyContent: 'flex-end',
  },
  heroHello: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 1,
  },
  heroPrenom: {
    fontFamily: 'Figtree_900Black',
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: -1.2,
    lineHeight: 36,
  },

  // ── Section label override ───────────────────────────
  sectionLabel: {
    paddingTop: 8,
    paddingBottom: 2,
    color: 'rgba(15,23,42,0.38)',
    opacity: 1,
  },

  // ── Card wrapper (outer shadow + inner clip) ─────────
  cardOuter: {
    marginHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
      },
      android: { elevation: 0 },
    }),
  },
  cardInner: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
  },

  // ── Lignes (base partagée) ───────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  rowTitle: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: -0.15,
  },

  // ── ActionRow ────────────────────────────────────────
  actionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  actionBadgeText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 9,
    letterSpacing: 0.7,
  },
  actionTitle: {
    flex: 1,
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: -0.15,
    marginLeft: 10,
  },
  deadlineText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: 'rgba(15,23,42,0.55)',
    flexShrink: 0,
    marginRight: 4,
  },

  // ── TodayRow ─────────────────────────────────────────
  todayIconTile: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(15,23,42,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  todayTexts: { flex: 1 },
  metaText: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 11,
    color: 'rgba(15,23,42,0.55)',
    marginTop: 1,
  },
  timeText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: 'rgba(15,23,42,0.55)',
    flexShrink: 0,
  },

  // ── GradeRow ─────────────────────────────────────────
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  gradeSubject: {
    flex: 1,
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: '#0F172A',
    letterSpacing: -0.15,
  },
  gradeNumber: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 20,
    color: '#0F172A',
    letterSpacing: -0.5,
    marginLeft: 10,
  },
  gradeScale: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: 'rgba(15,23,42,0.35)',
  },
  gradeDate: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: 'rgba(15,23,42,0.55)',
    flexShrink: 0,
    minWidth: 52,
    textAlign: 'right',
    marginLeft: 8,
  },

  // ── Ghost link ───────────────────────────────────────
  ghostLink: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
  },
  ghostLinkText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    color: 'rgba(15,23,42,0.55)',
  },

  // ── Aria card ────────────────────────────────────────
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
    color: '#0F172A',
    lineHeight: 18,
  },

  // ── Empty state ──────────────────────────────────────
  emptyState: {
    marginHorizontal: 14,
    paddingVertical: 14,
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    color: 'rgba(15,23,42,0.55)',
    letterSpacing: -0.1,
  },
});
