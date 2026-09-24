/**
 * BulletinScreen — Bulletin trimestriel, page profonde depuis NotesScreen.
 * Fond #F2F1EE · Pas de bottom bar · Pas de bouton PDF (Phase 2).
 * Charte : zéro couleur sur les notes, zéro rang, zéro full-width button.
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../constants/design';
import { FontFamily } from '../hooks/useSolariaFonts';
import ScolariaSymbol from '../components/ScolariaSymbol';
import { Text } from '../components/ui';
import { AucunEnfantPage, PageVide } from '../components/AucunEnfant';
import { aDesNotes } from '../utils/niveau';
import { useActiveChild } from '../contexts/ActiveChildContext';
import { useAuth } from '../contexts/AuthContext';

// ─── Constantes ───────────────────────────────────────────

const BG = '#F2F1EE';
const TRIMESTRES = ['T1', 'T2', 'T3'] as const;

// ─── Données démo ─────────────────────────────────────────

const DEMO = {
  moyenne: '14,7',
  moyenneClasse: '12,3',
  trend: '+0,4 vs T1',
  matieres: [
    {
      nom: 'Mathématiques',
      prof: 'M. Petit',
      note: '16,5',
      moyClasse: '13,2',
      trend: '↑',
      comment: 'Excellent travail, très bonne progression en algèbre ce trimestre.',
    },
    {
      nom: 'Français',
      prof: 'Mme Lambert',
      note: '14,0',
      moyClasse: '12,8',
      trend: '→',
    },
    {
      nom: 'Histoire-Géographie',
      prof: 'M. Durand',
      note: '12,5',
      moyClasse: '12,1',
      trend: '↓',
      comment: 'Résultats satisfaisants. La cartographie nécessite un travail plus approfondi.',
    },
    {
      nom: 'Anglais',
      prof: 'Mme Bernard',
      note: '15,5',
      moyClasse: '13,0',
      trend: '↑',
    },
    {
      nom: 'Espagnol',
      prof: 'Mme Ortiz',
      note: '13,5',
      moyClasse: '12,5',
      trend: '→',
    },
    {
      nom: 'SVT',
      prof: 'M. Martin',
      note: '16,0',
      moyClasse: '13,8',
      trend: '↑',
    },
    {
      nom: 'EPS',
      prof: 'M. Leblanc',
      note: '15,0',
      moyClasse: '14,2',
      trend: '→',
    },
    {
      nom: 'Arts plastiques',
      prof: 'Mme Rousseau',
      note: '14,5',
      moyClasse: '13,5',
      trend: '→',
    },
  ],
  vieScolaire: {
    absences: 2,
    retards: 1,
    sanctions: 0,
    conseilClasse: 'Encouragements',
  },
};

// ─── Section label ────────────────────────────────────────

function SectionLbl({ children, first = false }: { children: string; first?: boolean }) {
  return (
    <Text style={[styles.sectionLabel, first && { paddingTop: 10 }]}>
      {children}
    </Text>
  );
}

// ─── Composant principal ──────────────────────────────────

function BulletinScreenContent() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { selectedChild } = useActiveChild();
  const childName: string = selectedChild?.name ?? '';
  const [triIdx, setTriIdx] = useState(1); // T2 par défaut

  const vieScolaire = [
    { label: 'Absences justifiées', value: String(DEMO.vieScolaire.absences) },
    { label: 'Retards', value: String(DEMO.vieScolaire.retards) },
    { label: 'Sanctions', value: String(DEMO.vieScolaire.sanctions) },
    { label: 'Conseil de classe', value: DEMO.vieScolaire.conseilClasse },
  ];

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={C.text} strokeWidth={2.2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Bulletin · {childName}
        </Text>

        <View style={styles.triPillsRow}>
          {TRIMESTRES.map((t, i) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTriIdx(i)}
              style={[styles.triPill, triIdx === i && styles.triPillActive]}
              hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
            >
              <Text style={[styles.triPillTxt, triIdx === i && styles.triPillTxtActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card indigo ──────────────────────────────── */}
        <View style={[styles.heroOuter, { marginTop: 12 }]}>
          <View style={styles.heroInner}>
            <Text style={styles.heroSectionLabel}>MOYENNE GÉNÉRALE</Text>

            <View style={styles.heroGradeRow}>
              <Text style={styles.heroGrade}>{DEMO.moyenne}</Text>
              <Text style={styles.heroGradeMax}>/20</Text>
            </View>

            <View style={styles.heroTrendBadge}>
              <Text style={styles.heroTrendText}>{DEMO.trend}</Text>
            </View>

            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaTxt}>Classe · {DEMO.moyenneClasse}</Text>
              <Text style={styles.heroMetaDot}> · </Text>
              <Text style={styles.heroMetaTxt}>Au-dessus de la moyenne</Text>
            </View>
          </View>
        </View>

        {/* ── Aria card ─────────────────────────────────────── */}
        <View style={styles.ariaOuter}>
          <View style={styles.ariaInner}>
            <LinearGradient
              colors={['#EEF2FF', '#F0FDFA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ariaGrad}
            >
              <View style={styles.ariaHeader}>
                <ScolariaSymbol size={18} color={C.indigo} />
                <Text style={styles.ariaLabel}>ARIA</Text>
              </View>
              <Text style={styles.ariaText}>
                Trimestre solide en hausse. Forts en maths, anglais et SVT.
                Histoire-géo en léger recul — surtout la cartographie.
              </Text>
              <TouchableOpacity style={styles.ariaCtaBtn} activeOpacity={0.72}>
                <Text style={styles.ariaCtaTxt}>Demander un plan d'action →</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>

        {/* ── Section MATIÈRES ──────────────────────────────── */}
        <SectionLbl first>MATIÈRES</SectionLbl>

        {DEMO.matieres.map((m, i) => (
          <View
            key={m.nom}
            style={[
              styles.matiereRow,
              i < DEMO.matieres.length - 1 && styles.rowBorder,
            ]}
          >
            <View style={styles.matiereLeft}>
              <Text style={styles.matiereName}>{m.nom}</Text>
              <Text style={styles.matiereProf}>{m.prof}</Text>
              {'comment' in m && m.comment ? (
                <Text style={styles.matiereComment}>{m.comment}</Text>
              ) : null}
            </View>
            <View style={styles.matiereRight}>
              <Text style={styles.matiereNote}>{m.note}</Text>
              <Text style={styles.matiereMoy}>moy. {m.moyClasse}</Text>
              <View style={styles.trendBadge}>
                <Text style={styles.trendTxt}>{m.trend}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* ── Section VIE SCOLAIRE ──────────────────────────── */}
        <SectionLbl>VIE SCOLAIRE</SectionLbl>

        {vieScolaire.map((row, i, arr) => (
          <View
            key={row.label}
            style={[styles.vieRow, i < arr.length - 1 && styles.rowBorder]}
          >
            <Text style={styles.vieLabel}>{row.label}</Text>
            <Text style={styles.vieValue}>{row.value}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────

const heroShadow = Platform.select({
  ios: {
    shadowColor: C.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 16,
  },
  android: { elevation: 0 },
  default: {},
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: C.text,
    letterSpacing: -0.2,
  },
  triPillsRow: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  triPill: {
    height: 26,
    borderRadius: 999,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.07)',
  },
  triPillActive: {
    backgroundColor: C.text,
  },
  triPillTxt: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: 'rgba(15,23,42,0.45)',
  },
  triPillTxtActive: {
    color: '#FFFFFF',
  },

  // ── Hero card indigo (2-views Android-safe)
  heroOuter: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: C.indigo,
    ...(heroShadow as any),
  },
  heroInner: {
    borderRadius: 18,
    overflow: 'hidden',
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroSectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 8.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.60)',
    marginBottom: 10,
  },
  heroGradeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  heroGrade: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 52,
    color: '#FFFFFF',
    lineHeight: 56,
  },
  heroGradeMax: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 18,
    color: 'rgba(255,255,255,0.70)',
    marginBottom: 9,
    marginLeft: 4,
  },
  heroTrendBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroTrendText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroMetaTxt: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.62)',
  },
  heroMetaDot: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.30)',
  },

  // ── Aria card (2-views Android-safe)
  ariaOuter: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
  },
  ariaInner: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ariaGrad: {
    padding: 14,
  },
  ariaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ariaLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: C.indigo,
    letterSpacing: 0.6,
    marginLeft: 7,
  },
  ariaText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: C.text,
    lineHeight: 20,
    letterSpacing: -0.1,
    marginBottom: 10,
  },
  ariaCtaBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  ariaCtaTxt: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: C.text,
    letterSpacing: -0.1,
  },

  // ── Section label
  sectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 7.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: C.text,
    opacity: 0.28,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },

  // ── Matières rows
  matiereRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 52,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  matiereLeft: {
    flex: 1,
    paddingRight: 12,
  },
  matiereName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: C.text,
    letterSpacing: -0.1,
  },
  matiereProf: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: C.text55,
    marginTop: 2,
  },
  matiereComment: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: C.text55,
    fontStyle: 'italic',
    marginTop: 5,
    lineHeight: 16,
  },
  matiereRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  matiereNote: {
    fontFamily: FontFamily.displayBold,
    fontSize: 17,
    color: C.text,
    letterSpacing: -0.5,
    lineHeight: 21,
  },
  matiereMoy: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 10,
    color: C.text55,
    marginTop: 1,
  },
  trendBadge: {
    marginTop: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  trendTxt: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: C.text55,
  },

  // ── Vie scolaire rows
  vieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    minHeight: 48,
  },
  vieLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: C.text,
  },
  vieValue: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: C.text,
  },
});

/**
 * Garde « un enfant = un carnet » : ces données de démo sont celles d'un élève de collège.
 * Elles ne s'affichent qu'en mode démo, pour un enfant de collège / lycée ; sinon, page vide.
 */
export default function BulletinScreen() {
  const { selectedChild } = useActiveChild();
  const { isDemo } = useAuth();
  if (!selectedChild) return <AucunEnfantPage title="Bulletin" />;
  if (!isDemo || !aDesNotes(selectedChild.cycle)) {
    return <PageVide title="Bulletin" message={`Aucun bulletin pour ${selectedChild.name} pour l’instant.`} />;
  }
  return <BulletinScreenContent />;
}
