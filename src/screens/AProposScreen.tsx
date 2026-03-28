/**
 * AProposScreen — About page with Ethical Charter
 *
 * Displays Scolaria's mission, ethical commitments, team info,
 * and the complete ethical charter for the app.
 */

import { useState } from 'react';
import {
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Box, Text, Pressable, HStack, VStack } from '../components/ui';
import { Colors } from '../constants/colors';
import { useChildTheme } from '../contexts/ChildThemeContext';
import LogoScolaria from '../components/LogoScolaria';

// ─── Charter data ────────────────────────────────────────

interface CharterArticle {
  number: number;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  content: string;
}

const CHARTER_ARTICLES: CharterArticle[] = [
  {
    number: 1,
    title: 'Bien-être de l\'enfant avant tout',
    icon: 'heart',
    color: Colors.pink,
    content:
      'Scolaria place le bien-être et l\'épanouissement de chaque enfant au centre de sa mission. Aucune fonctionnalité ne doit générer de stress, de comparaison malsaine ou de pression scolaire excessive. Le Score de Joie existe pour détecter et prévenir le mal-être, jamais pour juger.',
  },
  {
    number: 2,
    title: 'Protection absolue des données',
    icon: 'shield-checkmark',
    color: Colors.green,
    content:
      'Les données des enfants sont sacrées. Elles sont chiffrées de bout en bout (AES-256), stockées sur des serveurs européens certifiés, et ne sont jamais vendues, partagées ou utilisées à des fins publicitaires. Le parent garde un contrôle total : export, effacement, et transfert à tout moment (RGPD Art. 15, 17, 20).',
  },
  {
    number: 3,
    title: 'IA éthique et transparente',
    icon: 'sparkles',
    color: Colors.violet,
    content:
      'Aria, notre assistante IA, est conçue pour accompagner — jamais pour remplacer le jugement humain. Elle ne pose pas de diagnostic médical ou psychologique. Ses recommandations sont toujours des suggestions, validées par le parent. L\'algorithme est explicable : le parent peut comprendre pourquoi une recommandation est faite.',
  },
  {
    number: 4,
    title: 'Anonymisation dans l\'espace enseignant',
    icon: 'eye-off',
    color: Colors.cyan,
    content:
      'Les enseignants accèdent à des données agrégées et anonymisées. Ils voient les tendances de classe, jamais les données individuelles identifiantes d\'un enfant. L\'anonymisation est conforme aux recommandations de la CNIL pour la protection des mineurs.',
  },
  {
    number: 5,
    title: 'Consentement parental éclairé',
    icon: 'hand-left',
    color: Colors.orange,
    content:
      'Chaque partage de données nécessite le consentement explicite du parent ou tuteur légal. Les permissions sont granulaires (4 niveaux d\'accès), révocables à tout instant, et font l\'objet d\'un journal d\'accès transparent consultable par le parent.',
  },
  {
    number: 6,
    title: 'Inclusion et accessibilité',
    icon: 'people',
    color: '#A78BFA',
    content:
      'Scolaria est conçue pour tous les enfants, quelles que soient leurs capacités, leur situation familiale ou leur parcours scolaire. L\'interface s\'adapte à l\'âge (mode primaire / collège-lycée), supporte 10 langues, et respecte les normes d\'accessibilité WCAG 2.1 AA.',
  },
  {
    number: 7,
    title: 'Bienveillance dans la communication',
    icon: 'chatbubbles',
    color: Colors.warmOrange,
    content:
      'La messagerie entre parents et enseignants est encadrée : pas de notifications intrusives la nuit, conservation limitée à 12 mois, et ton toujours constructif. Scolaria facilite la coéducation sans créer de tensions.',
  },
  {
    number: 8,
    title: 'Indépendance et absence de publicité',
    icon: 'ban',
    color: Colors.red,
    content:
      'Scolaria ne contient aucune publicité, aucun contenu sponsorisé, et aucun mécanisme de gamification addictif. Le modèle économique repose sur l\'abonnement transparent, jamais sur la monétisation des données.',
  },
];

// ─── Stats ───────────────────────────────────────────────

const STATS = [
  { value: '100%', label: 'Données en Europe', icon: '🇪🇺' },
  { value: '0', label: 'Publicités', icon: '🚫' },
  { value: 'AES-256', label: 'Chiffrement', icon: '🔐' },
  { value: 'RGPD', label: 'Conforme', icon: '✅' },
];

// ─── Component ───────────────────────────────────────────

export default function AProposScreen() {
  const { theme } = useChildTheme();
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);

  const toggleArticle = (num: number) => {
    setExpandedArticle(expandedArticle === num ? null : num);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={[Colors.violet, Colors.blueNight]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ alignItems: 'center', paddingTop: 30, paddingBottom: 40 }}
      >
        <LogoScolaria size={80} variant="dark" />
        <Text className="text-[15px] text-center leading-[22px] mt-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
          Pour les familles françaises
        </Text>
        <Box className="mt-3.5 rounded-[20px] px-3.5 py-[5px]" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <Text className="text-xs font-semibold" style={{ color: Colors.cyan }}>Version 1.0.0</Text>
        </Box>
      </LinearGradient>

      <Box className="px-5 pt-1">
        {/* Mission */}
        <Box
          className="rounded-2xl p-5 mb-5"
          style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
        >
          <Text className="text-lg font-extrabold mb-2.5" style={{ color: theme.textPrimary }}>Notre mission</Text>
          <Text className="text-sm leading-[22px]" style={{ color: theme.textSecondary }}>
            Scolaria accompagne chaque famille dans le parcours scolaire de ses
            enfants, en plaçant le bien-être au centre. Grâce à l'intelligence
            artificielle éthique et au respect absolu des données personnelles,
            nous créons un pont bienveillant entre l'école et la maison.
          </Text>
        </Box>

        {/* Stats */}
        <HStack className="mb-6" style={{ gap: 8 }}>
          {STATS.map((stat, i) => (
            <Box
              key={i}
              className="flex-1 rounded-[14px] p-3 items-center"
              style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
            >
              <Text className="text-xl mb-1.5">{stat.icon}</Text>
              <Text className="text-sm font-black mb-0.5" style={{ color: theme.textPrimary }}>{stat.value}</Text>
              <Text className="text-[10px] text-center font-semibold" style={{ color: theme.textMuted }}>{stat.label}</Text>
            </Box>
          ))}
        </HStack>

        {/* Ethical Charter */}
        <Box className="mb-3.5">
          <HStack className="items-center mb-1" style={{ gap: 8 }}>
            <Ionicons name="document-text" size={22} color={theme.accent} />
            <Text className="text-xl font-black" style={{ color: theme.textPrimary }}>Charte Éthique</Text>
          </HStack>
          <Text className="text-[13px] mt-1" style={{ color: theme.textMuted }}>
            8 engagements fondateurs qui guident chaque décision produit
          </Text>
        </Box>

        {CHARTER_ARTICLES.map((article) => (
          <Pressable
            key={article.number}
            className="rounded-[14px] p-4 mb-2.5"
            style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
            onPress={() => toggleArticle(article.number)}
          >
            <HStack className="items-center" style={{ gap: 12 }}>
              <Box
                className="w-9 h-9 rounded-[10px] justify-center items-center"
                style={{ backgroundColor: article.color + '20' }}
              >
                <Ionicons
                  name={article.icon}
                  size={18}
                  color={article.color}
                />
              </Box>
              <VStack className="flex-1">
                <Text className="text-[11px] font-bold uppercase tracking-wide" style={{ color: theme.textMuted }}>
                  Article {article.number}
                </Text>
                <Text className="text-sm font-bold mt-px" style={{ color: theme.textPrimary }}>{article.title}</Text>
              </VStack>
              <Ionicons
                name={
                  expandedArticle === article.number
                    ? 'chevron-up'
                    : 'chevron-down'
                }
                size={18}
                color={theme.textMuted}
              />
            </HStack>
            {expandedArticle === article.number && (
              <Text
                className="text-[13px] leading-5 mt-3 pt-3"
                style={{ color: theme.textSecondary, borderTopWidth: 1, borderTopColor: theme.cardBorder }}
              >
                {article.content}
              </Text>
            )}
          </Pressable>
        ))}

        {/* Technology */}
        <Box className="mt-4 mb-5">
          <Text className="text-lg font-extrabold mb-3.5" style={{ color: theme.textPrimary }}>Technologies</Text>
          <VStack style={{ gap: 8 }}>
            {[
              { name: 'React Native', desc: 'App mobile cross-platform', icon: 'phone-portrait-outline' as const },
              { name: 'Claude (Anthropic)', desc: 'IA conversationnelle Aria', icon: 'sparkles-outline' as const },
              { name: 'Google Vision', desc: 'OCR bulletins scolaires', icon: 'eye-outline' as const },
              { name: 'Supabase', desc: 'Base de données sécurisée', icon: 'server-outline' as const },
              { name: 'Chiffrement E2E', desc: 'AES-256 bout en bout', icon: 'lock-closed-outline' as const },
              { name: 'Hébergement EU', desc: 'Serveurs France/UE', icon: 'globe-outline' as const },
            ].map((tech, i) => (
              <HStack
                key={i}
                className="items-center rounded-xl p-3.5"
                style={{ gap: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
              >
                <Ionicons name={tech.icon} size={20} color={theme.accent} />
                <VStack className="flex-1">
                  <Text className="text-sm font-bold" style={{ color: theme.textPrimary }}>{tech.name}</Text>
                  <Text className="text-xs mt-px" style={{ color: theme.textMuted }}>{tech.desc}</Text>
                </VStack>
              </HStack>
            ))}
          </VStack>
        </Box>

        {/* Contact & Legal */}
        <Box
          className="rounded-[14px] p-4 mb-6"
          style={{ gap: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }}
        >
          <Pressable
            className="flex-row items-center"
            style={{ gap: 10 }}
            onPress={() => Linking.openURL('mailto:contact@scolaria.fr')}
          >
            <Ionicons name="mail-outline" size={18} color={theme.accent} />
            <Text className="text-[13px] flex-1" style={{ color: theme.textSecondary }}>contact@scolaria.fr</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center"
            style={{ gap: 10 }}
            onPress={() => Linking.openURL('https://scolaria.fr')}
          >
            <Ionicons name="globe-outline" size={18} color={theme.accent} />
            <Text className="text-[13px] flex-1" style={{ color: theme.textSecondary }}>scolaria.fr</Text>
          </Pressable>
          <HStack className="items-center" style={{ gap: 10 }}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={Colors.green}
            />
            <Text className="text-[13px] flex-1" style={{ color: theme.textSecondary }}>
              Conforme RGPD · CNIL · Données hébergées en France
            </Text>
          </HStack>
        </Box>

        {/* Footer */}
        <VStack className="items-center py-5" style={{ gap: 8 }}>
          <LogoScolaria size={28} variant={theme.mode === 'primaire' ? 'dark' : 'light'} />
          <Text className="text-xs mt-1" style={{ color: Colors.gray }}>
            © 2026 Scolaria · Tous droits réservés
          </Text>
          <Text className="text-[13px] italic text-center mt-1 px-5" style={{ color: Colors.violet }}>
            « Chaque enfant mérite d'être compris, pas seulement évalué. »
          </Text>
        </VStack>
      </Box>

      <Box className="h-10" />
    </ScrollView>
  );
}
