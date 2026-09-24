/**
 * SignSuccessScreen — Confirmation de signature d'un document.
 * Hero check animé (cercles de ripple statiques), receipt, actions Aria.
 */

import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useActiveChild } from '../contexts/ActiveChildContext';
import type { DemoDoc } from '../data/demo/carnet';
import { Check, Download, Calendar } from 'lucide-react-native';
import { C, STICKY_CTA_BOTTOM_GAP, getStickyCtaScrollPadding } from '../constants/design';
import { FontFamily } from '../hooks/useSolariaFonts';
import AriaInlineCard from '../components/AriaInlineCard';
import { Text } from '../components/ui';

// ─── Sous-composants ─────────────────────────────────────

function ReceiptRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.receiptRow, !last && styles.receiptBorder]}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <Text style={styles.receiptValue}>{value}</Text>
    </View>
  );
}

// ─── Composant ───────────────────────────────────────────

export default function SignSuccessScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const { selectedChild } = useActiveChild();
  const doc: DemoDoc = route.params?.doc ?? { title: 'Document' };
  const prenom = selectedChild?.name ?? '';
  const enfant = selectedChild
    ? [selectedChild.name, selectedChild.niveau].filter(Boolean).join(' · ')
    : '';
  const signeLe = new Date().toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      {/* Back minimal */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => navigation.popToTop()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: getStickyCtaScrollPadding(insets.bottom), paddingTop: 56 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroWrap}>
          {/* Ripples statiques */}
          <View style={styles.ripple3} />
          <View style={styles.ripple2} />
          <View style={styles.ripple1} />
          {/* Cercle check */}
          <View style={styles.checkCircle}>
            <Check size={40} color={C.green} strokeWidth={2.5} />
          </View>
        </View>

        <Text style={styles.successBadge}>DOCUMENT SIGNÉ</Text>
        <Text style={styles.heroTitle}>{doc.title}</Text>
        <Text style={styles.heroSubtitle}>
          {[prenom, doc.date].filter(Boolean).join(' · ')}
        </Text>

        {/* Reçu */}
        <View style={[styles.cardOuter, { marginTop: 28 }]}>
          <View style={styles.cardInner}>
            <ReceiptRow label="Signataire" value="Vous" />
            <ReceiptRow label="Signé le" value={signeLe} />
            <ReceiptRow label="Document" value={doc.title} />
            <ReceiptRow label="Enfant" value={enfant} last />
          </View>
        </View>

        {/* Aria */}
        <View style={{ marginTop: 8 }}>
          <AriaInlineCard label="Aria">
            <Text style={styles.ariaText}>
              Veux-tu ajouter « {doc.title} » à l’agenda de {prenom} avec un rappel la veille ?
            </Text>
            <View style={styles.ariaActions}>
              <TouchableOpacity style={styles.ariaPillMain}>
                <Text style={styles.ariaPillMainText}>Ajouter à l'agenda</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ariaPillSecond, { marginLeft: 8 }]}>
                <Text style={styles.ariaPillSecondText}>Non merci</Text>
              </TouchableOpacity>
            </View>
          </AriaInlineCard>
        </View>

        {/* Actions secondaires */}
        <View style={[styles.cardOuter, { marginTop: 8 }]}>
          <View style={styles.cardInner}>
            <TouchableOpacity style={[styles.actionRow, styles.receiptBorder]} activeOpacity={0.7}>
              <Download size={16} color={C.text55} strokeWidth={1.8} />
              <Text style={[styles.actionText, { marginLeft: 12 }]}>Télécharger le PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
              <Calendar size={16} color={C.text55} strokeWidth={1.8} />
              <Text style={[styles.actionText, { marginLeft: 12 }]}>Voir dans l'agenda</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bouton retour fixe */}
      <TouchableOpacity
        style={[styles.mainCTA, { bottom: insets.bottom + STICKY_CTA_BOTTOM_GAP }]}
        activeOpacity={0.85}
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.mainCTAText}>Retour à la messagerie</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  android: { elevation: 0 },
  default: {},
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  backBtn: { position: 'absolute', left: 16, zIndex: 10 },
  backText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: C.text55,
  },

  // Hero
  heroWrap: { alignItems: 'center', justifyContent: 'center', height: 160, marginTop: 16 },
  ripple3: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(5,150,105,0.05)',
  },
  ripple2: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 999,
    backgroundColor: 'rgba(5,150,105,0.08)',
  },
  ripple1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: 'rgba(5,150,105,0.12)',
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successBadge: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: C.green,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 20,
  },
  heroTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    color: C.text,
    textAlign: 'center',
    marginTop: 10,
    marginHorizontal: 20,
    lineHeight: 28,
  },
  heroSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: C.text55,
    textAlign: 'center',
    marginTop: 4,
  },

  // Card 2-Views
  cardOuter: {
    marginHorizontal: 14,
    marginBottom: 6,
    borderRadius: 18,
    backgroundColor: C.white,
    ...(cardShadow as any),
  },
  cardInner: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.borderL,
  },

  // Reçu
  receiptRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  receiptBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.borderL,
  },
  receiptLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: C.text55,
    width: 110,
  },
  receiptValue: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: C.text,
    flex: 1,
  },

  // Aria
  ariaText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13.5,
    color: C.text,
    lineHeight: 20,
  },
  ariaActions: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
  },
  ariaPillMain: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 999,
    backgroundColor: C.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ariaPillMainText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: C.white,
  },
  ariaPillSecond: {
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ariaPillSecondText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: C.text55,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  actionText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    color: C.text,
  },

  // CTA
  mainCTA: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 52,
    borderRadius: 999,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCTAText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: C.white,
  },
});
