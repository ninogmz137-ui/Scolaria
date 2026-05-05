/**
 * SignDocScreen — Signature d'un document (autorisation sortie scolaire).
 * Android-safe : pattern 2-Views, pas de gap, pas de backdropFilter.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Clock, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, BOTTOM_BAR_HEIGHT } from '../constants/design';
import { FontFamily } from '../hooks/useSolariaFonts';
import DeepScreenHeader from '../components/DeepScreenHeader';
import AriaInlineCard from '../components/AriaInlineCard';

// ─── Data demo ───────────────────────────────────────────

const DOC = {
  title: "Sortie Musée d'Orsay",
  child: 'Emma · 4ᵉB',
  date: 'Vendredi 9 mai 2026',
  lieu: 'Paris 7e',
  montant: '8€ en espèces',
  deadline: '8 mai 2026',
};

// ─── RecapRow ────────────────────────────────────────────

function RecapRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.recapRow,
        !last && styles.recapRowBorder,
      ]}
    >
      <Text style={styles.recapLabel}>{label}</Text>
      <Text style={styles.recapValue}>{value}</Text>
    </View>
  );
}

// ─── Composant ───────────────────────────────────────────

export default function SignDocScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [signed, setSigned] = useState(false);

  return (
    <SafeAreaView style={styles.root}>
      <DeepScreenHeader
        onBack={() => navigation.goBack()}
        title="Autorisation"
        rightElement={
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.shareBtn}>Partager</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: BOTTOM_BAR_HEIGHT + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Bannière urgence */}
        <View style={styles.bannerOuter}>
          <View style={styles.bannerInner}>
            <Clock size={15} color={C.amber} strokeWidth={2} />
            <Text style={[styles.bannerText, { marginLeft: 8 }]}>
              À signer avant le {DOC.deadline}
            </Text>
          </View>
        </View>

        {/* Récap document */}
        <View style={[styles.cardOuter, { marginTop: 8 }]}>
          <View style={styles.cardInner}>
            <View style={{ padding: 14, paddingBottom: 0 }}>
              <Text style={styles.docTitle}>{DOC.title}</Text>
            </View>
            <RecapRow label="Enfant" value={DOC.child} />
            <RecapRow label="Date" value={DOC.date} />
            <RecapRow label="Lieu" value={DOC.lieu} />
            <RecapRow label="Montant" value={DOC.montant} last />
          </View>
        </View>

        {/* Aria */}
        <AriaInlineCard>
          Sortie art et histoire — légère par rapport aux sorties précédentes. La participation à 8€ est dans la moyenne.
        </AriaInlineCard>

        {/* Zone signature */}
        <Text style={styles.sectionLabel}>VOTRE SIGNATURE</Text>
        <TouchableOpacity
          style={styles.signatureZone}
          activeOpacity={0.7}
          onPress={() => setSigned(true)}
        >
          {signed ? (
            <Text style={styles.signedText}>✓ Signé</Text>
          ) : (
            <Text style={styles.signPlaceholder}>Appuyez pour signer</Text>
          )}
        </TouchableOpacity>

        {/* Timestamp légal */}
        <View style={styles.timestampRow}>
          <Lock size={12} color={C.text35} strokeWidth={1.8} />
          <Text style={[styles.timestampText, { marginLeft: 5 }]}>
            Signature légale · horodatage automatique
          </Text>
        </View>
      </ScrollView>

      {/* CTA fixe en bas */}
      <View
        style={[
          styles.ctaContainer,
          { bottom: insets.bottom + 12 },
        ]}
      >
        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Enregistrer</Text>
        </TouchableOpacity>
        <View style={{ width: 10 }} />
        <TouchableOpacity
          style={styles.sendBtn}
          activeOpacity={0.85}
          onPress={() => navigation.replace('SignSuccess')}
        >
          <Text style={styles.sendBtnText}>Signer et envoyer</Text>
        </TouchableOpacity>
      </View>
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

  shareBtn: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: C.indigo,
  },

  // Bannière
  bannerOuter: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 0,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    ...(cardShadow as any),
  },
  bannerInner: {
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  bannerText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    color: C.amber,
  },

  // Card
  cardOuter: {
    marginHorizontal: 14,
    marginBottom: 8,
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

  docTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 16,
    color: C.text,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderL,
    marginHorizontal: 0,
  },

  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recapRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.borderL,
  },
  recapLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: C.text55,
    width: 80,
  },
  recapValue: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: C.text,
    flex: 1,
  },

  // Section label
  sectionLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: C.text,
    opacity: 0.28,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 8,
  },

  // Zone signature
  signatureZone: {
    marginHorizontal: 14,
    height: 140,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(15,23,42,0.20)',
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signPlaceholder: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    color: C.text35,
  },
  signedText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 18,
    color: C.green,
  },

  // Timestamp
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 8,
  },
  timestampText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    color: C.text35,
  },

  // CTA
  ctaContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
  },
  saveBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: C.text,
  },
  sendBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: C.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: C.white,
  },
});
