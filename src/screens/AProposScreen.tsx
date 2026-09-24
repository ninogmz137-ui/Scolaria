/**
 * AProposScreen — À propos : mission, engagements, charte éthique (7 principes, VISION.md §8).
 *
 * Page profonde (en-tête ‹ retour + titre centré, sans top bar ni bottom bar, COMPONENTS §8).
 * N'affirme que ce qui est vrai aujourd'hui : aucune mention d'hébergement, de chiffrement
 * ou de conformité tant que ce n'est pas vérifié (Aria appelle un modèle hébergé hors UE).
 */

import { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Ban,
  Lock,
  HeartHandshake,
  Eye,
  ShieldCheck,
  Activity,
  Scale,
  Moon,
  LifeBuoy,
} from 'lucide-react-native';
import ScolariaLogo from '../components/ScolariaLogo';
import ScolariaAppIcon from '../components/ScolariaAppIcon';
import { DeepScreenHeader } from '../components/DeepScreenHeader';
import { DeepGroup, DeepRow, DEEP } from '../components/DeepList';
import { FontFamily } from '../hooks/useSolariaFonts';
import { Text } from '../components/ui';

const ICON = { size: 20, color: DEEP.text55, strokeWidth: 2 } as const;

// ─── Charte éthique : 7 principes (VISION.md §8) ─────────

const PRINCIPES: { titre: string; texte: string; Icon: typeof Ban }[] = [
  {
    titre: 'Non-substitution',
    texte:
      'Aria ne remplace jamais un professionnel. Elle ne pose aucun diagnostic : elle suggère et informe.',
    Icon: HeartHandshake,
  },
  {
    titre: 'Transparence',
    texte: 'Aria explique toujours pourquoi elle fait une suggestion et cite ses sources.',
    Icon: Eye,
  },
  {
    titre: 'Souveraineté des données',
    texte:
      'Les données du carnet appartiennent à la famille. Elles ne sont jamais revendues et ne servent à aucune publicité.',
    Icon: ShieldCheck,
  },
  {
    titre: 'Gradation, jamais de panique',
    texte:
      'Aucune alerte sur un signal isolé : Aria observe une tendance sur 5 jours avant de vous prévenir.',
    Icon: Activity,
  },
  {
    titre: 'Neutralité',
    texte:
      'Aucune comparaison entre enfants. Les filières professionnelles valent les filières générales. Un enfant peut être comparé à lui-même sur plusieurs années, en tendance et sources citées.',
    Icon: Scale,
  },
  {
    titre: 'Protection contre l’hyper-connexion',
    texte: 'Silence de 20h à 7h, et au plus une alerte non urgente toutes les 48 heures.',
    Icon: Moon,
  },
  {
    titre: 'Protocole d’urgence',
    texte:
      'Face à un message de détresse, Aria sort de son rôle : aucune réponse automatique, les numéros d’aide s’affichent (3114, 3018, 119, 112).',
    Icon: LifeBuoy,
  },
];

// ─── Écran ───────────────────────────────────────────────

export default function AProposScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [ouvert, setOuvert] = useState<number | null>(null);

  return (
    <View style={[st.root, { paddingBottom: insets.bottom }]}>
      <DeepScreenHeader
        title="À propos"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        withTopInset
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Identité */}
        <View style={st.hero}>
          <ScolariaAppIcon size={72} withBackground />
          <View style={{ height: 12 }} />
          <ScolariaLogo fontSize={30} primaryColor={DEEP.navy} />
          <Text style={st.tagline}>Le carnet de scolarité numérique</Text>
          <Text style={st.version}>Version 1.0.0</Text>
        </View>

        <DeepGroup title="Notre mission" first>
          <View style={st.textBlock}>
            <Text style={st.body}>
              Comme le carnet de santé, le carnet de scolarité appartient à la famille. Il suit
              l’enfant de la maternelle au bac, quel que soit l’établissement, et se remplit même
              si l’école n’utilise pas Scolaria.
            </Text>
          </View>
        </DeepGroup>

        <DeepGroup title="Nos engagements">
          <DeepRow icon={<Ban {...ICON} />} label="Aucune publicité" />
          <DeepRow icon={<Lock {...ICON} />} label="Vos données ne sont jamais revendues" last />
        </DeepGroup>

        <DeepGroup title="Charte éthique · 7 principes">
          {PRINCIPES.map((p, i) => (
            <DeepRow
              key={p.titre}
              icon={<p.Icon {...ICON} />}
              label={`${i + 1}. ${p.titre}`}
              expanded={ouvert === i}
              details={p.texte}
              onPress={() => setOuvert(ouvert === i ? null : i)}
              last={i === PRINCIPES.length - 1}
            />
          ))}
        </DeepGroup>

        <Text style={st.footer}>© 2026 Scolaria</Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DEEP.bg,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  tagline: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 18,
    color: DEEP.text55,
    marginTop: 6,
  },
  version: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    lineHeight: 14,
    color: DEEP.text35,
    marginTop: 4,
  },
  textBlock: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  body: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 20,
    color: DEEP.navy,
  },
  footer: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11,
    lineHeight: 14,
    color: DEEP.text35,
    textAlign: 'center',
    paddingTop: 20,
  },
});
