/**
 * AProposScreen — About page with Ethical Charter
 *
 * Displays Scolaria's mission, ethical commitments, team info,
 * and the complete ethical charter for the app.
 */

import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import {
  Heart,
  Lock,
  Sparkles,
  User,
  TextBubble,
  Cross,
  ChevronUp,
  ChevronDown,
  Mail,
  ExternalLink,
  Check,
  Gears,
  Phone,
  Pillar,
  Code,
} from '@getpapillon/papicons';
import { Colors } from '../constants/colors';
import { useChildTheme } from '../contexts/ChildThemeContext';
import LogoScolaria from '../components/LogoScolaria';
import WallpaperBackground from '../components/WallpaperBackground';
import GlassCard from '../components/GlassCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import { FontFamily } from '../hooks/useSolariaFonts';

// ─── Charter data ────────────────────────────────────────

interface CharterArticle {
  number: number;
  title: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  content: string;
}

const CHARTER_ARTICLES: CharterArticle[] = [
  {
    number: 1,
    title: 'Bien-être de l\'enfant avant tout',
    Icon: Heart,
    color: Colors.pink,
    content:
      'Scolaria place le bien-être et l\'épanouissement de chaque enfant au centre de sa mission. Aucune fonctionnalité ne doit générer de stress, de comparaison malsaine ou de pression scolaire excessive. Le Score de Joie existe pour détecter et prévenir le mal-être, jamais pour juger.',
  },
  {
    number: 2,
    title: 'Protection absolue des données',
    Icon: Lock,
    color: Colors.green,
    content:
      'Les données des enfants sont sacrées. Elles sont chiffrées de bout en bout (AES-256), stockées sur des serveurs européens certifiés, et ne sont jamais vendues, partagées ou utilisées à des fins publicitaires. Le parent garde un contrôle total : export, effacement, et transfert à tout moment (RGPD Art. 15, 17, 20).',
  },
  {
    number: 3,
    title: 'IA éthique et transparente',
    Icon: Sparkles,
    color: Colors.violet,
    content:
      'Aria, notre assistante IA, est conçue pour accompagner — jamais pour remplacer le jugement humain. Elle ne pose pas de diagnostic médical ou psychologique. Ses recommandations sont toujours des suggestions, validées par le parent. L\'algorithme est explicable : le parent peut comprendre pourquoi une recommandation est faite.',
  },
  {
    number: 4,
    title: 'Anonymisation dans l\'espace enseignant',
    Icon: User,
    color: Colors.cyan,
    content:
      'Les enseignants accèdent à des données agrégées et anonymisées. Ils voient les tendances de classe, jamais les données individuelles identifiantes d\'un enfant. L\'anonymisation est conforme aux recommandations de la CNIL pour la protection des mineurs.',
  },
  {
    number: 5,
    title: 'Consentement parental éclairé',
    Icon: Check,
    color: Colors.orange,
    content:
      'Chaque partage de données nécessite le consentement explicite du parent ou tuteur légal. Les permissions sont granulaires (4 niveaux d\'accès), révocables à tout instant, et font l\'objet d\'un journal d\'accès transparent consultable par le parent.',
  },
  {
    number: 6,
    title: 'Inclusion et accessibilité',
    Icon: User,
    color: '#A78BFA',
    content:
      'Scolaria est conçue pour tous les enfants, quelles que soient leurs capacités, leur situation familiale ou leur parcours scolaire. L\'interface s\'adapte à l\'âge (mode primaire / collège-lycée), supporte 10 langues, et respecte les normes d\'accessibilité WCAG 2.1 AA.',
  },
  {
    number: 7,
    title: 'Bienveillance dans la communication',
    Icon: TextBubble,
    color: Colors.warmOrange,
    content:
      'La messagerie entre parents et enseignants est encadrée : pas de notifications intrusives la nuit, conservation limitée à 12 mois, et ton toujours constructif. Scolaria facilite la coéducation sans créer de tensions.',
  },
  {
    number: 8,
    title: 'Indépendance et absence de publicité',
    Icon: Cross,
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

// ─── Tech stack data ──────────────────────────────────────

const TECH_STACK = [
  { name: 'React Native', desc: 'App mobile cross-platform', Icon: Phone as React.ComponentType<{ size?: number; color?: string }> },
  { name: 'Claude (Anthropic)', desc: 'IA conversationnelle Aria', Icon: Sparkles as React.ComponentType<{ size?: number; color?: string }> },
  { name: 'Google Vision', desc: 'OCR bulletins scolaires', Icon: Code as React.ComponentType<{ size?: number; color?: string }> },
  { name: 'Supabase', desc: 'Base de données sécurisée', Icon: Pillar as React.ComponentType<{ size?: number; color?: string }> },
  { name: 'Chiffrement E2E', desc: 'AES-256 bout en bout', Icon: Lock as React.ComponentType<{ size?: number; color?: string }> },
  { name: 'Hébergement EU', desc: 'Serveurs France/UE', Icon: Gears as React.ComponentType<{ size?: number; color?: string }> },
];

// ─── Component ───────────────────────────────────────────

export default function AProposScreen() {
  const { theme } = useChildTheme();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);

  const toggleArticle = (num: number) => {
    setExpandedArticle(expandedArticle === num ? null : num);
  };

  return (
    <View style={{ flex: 1 }}>
      <WallpaperBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: TOPBAR_H + 12,
          paddingBottom: FLOATING_TAB_BAR_HEIGHT + 10,
          paddingHorizontal: 18,
        }}
      >
        {/* Logo / Hero */}
        <GlassCard style={styles.heroCard}>
          <View style={styles.heroInner}>
            <LogoScolaria size={72} variant="dark" />
            <Text style={styles.heroSubtitle}>Pour les familles françaises</Text>
            <View style={styles.versionPill}>
              <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>
          </View>
        </GlassCard>

        {/* Mission */}
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>Notre mission</Text>
          <Text style={styles.cardBody}>
            Scolaria accompagne chaque famille dans le parcours scolaire de ses
            enfants, en plaçant le bien-être au centre. Grâce à l'intelligence
            artificielle éthique et au respect absolu des données personnelles,
            nous créons un pont bienveillant entre l'école et la maison.
          </Text>
        </GlassCard>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((stat, i) => (
            <GlassCard key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </GlassCard>
          ))}
        </View>

        {/* Ethical Charter heading */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionBar} />
          <View>
            <Text style={styles.sectionTitle}>Charte Éthique</Text>
            <Text style={styles.sectionSubtitle}>8 engagements fondateurs qui guident chaque décision produit</Text>
          </View>
        </View>

        {CHARTER_ARTICLES.map((article) => {
          const isExpanded = expandedArticle === article.number;
          return (
            <Pressable
              key={article.number}
              onPress={() => toggleArticle(article.number)}
            >
              <GlassCard style={styles.articleCard}>
                <View style={styles.articleRow}>
                  <View style={[styles.articleIconBox, { backgroundColor: article.color + '20' }]}>
                    <article.Icon size={18} color={article.color} />
                  </View>
                  <View style={styles.articleTextBox}>
                    <Text style={styles.articleNumber}>Article {article.number}</Text>
                    <Text style={styles.articleTitle}>{article.title}</Text>
                  </View>
                  {isExpanded
                    ? <ChevronUp size={18} color="rgba(255,255,255,0.6)" />
                    : <ChevronDown size={18} color="rgba(255,255,255,0.6)" />
                  }
                </View>
                {isExpanded && (
                  <Text style={styles.articleContent}>{article.content}</Text>
                )}
              </GlassCard>
            </Pressable>
          );
        })}

        {/* Technologies heading */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <View style={styles.sectionBar} />
          <Text style={styles.sectionTitle}>Technologies</Text>
        </View>

        {TECH_STACK.map((tech, i) => (
          <GlassCard key={i} style={[styles.techCard, i < TECH_STACK.length - 1 && { marginBottom: 6 }]}>
            <View style={styles.techRow}>
              <tech.Icon size={20} color={Colors.violet} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.techName}>{tech.name}</Text>
                <Text style={styles.techDesc}>{tech.desc}</Text>
              </View>
            </View>
          </GlassCard>
        ))}

        {/* Contact & Legal */}
        <GlassCard style={[styles.card, { marginTop: 14, gap: 14 }]}>
          <Pressable
            style={styles.contactRow}
            onPress={() => Linking.openURL('mailto:contact@scolaria.fr')}
          >
            <Mail size={18} color={Colors.violet} />
            <Text style={styles.contactText}>contact@scolaria.fr</Text>
          </Pressable>
          <Pressable
            style={styles.contactRow}
            onPress={() => Linking.openURL('https://scolaria.fr')}
          >
            <ExternalLink size={18} color={Colors.violet} />
            <Text style={styles.contactText}>scolaria.fr</Text>
          </Pressable>
          <View style={styles.contactRow}>
            <Lock size={18} color={Colors.green} />
            <Text style={styles.contactText}>Conforme RGPD · CNIL · Données hébergées en France</Text>
          </View>
        </GlassCard>

        {/* Footer */}
        <View style={styles.footer}>
          <LogoScolaria size={28} variant="light" />
          <Text style={styles.footerCopy}>© 2026 Scolaria · Tous droits réservés</Text>
          <Text style={styles.footerQuote}>
            « Chaque enfant mérite d'être compris, pas seulement évalué. »
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.4)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
};

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: 14,
    alignItems: 'center',
  },
  heroInner: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  heroSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
    ...TEXT_SHADOW,
  },
  versionPill: {
    marginTop: 10,
    backgroundColor: 'rgba(99,102,241,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.4)',
  },
  versionText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    color: Colors.cyan,
    ...TEXT_SHADOW,
  },
  card: {
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 17,
    color: '#fff',
    marginBottom: 10,
    ...TEXT_SHADOW,
  },
  cardBody: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  statValue: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#fff',
    marginBottom: 2,
    ...TEXT_SHADOW,
  },
  statLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    ...TEXT_SHADOW,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: Colors.violet,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 18,
    color: '#fff',
    ...TEXT_SHADOW,
  },
  sectionSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    ...TEXT_SHADOW,
  },
  articleCard: {
    marginBottom: 8,
  },
  articleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  articleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleTextBox: {
    flex: 1,
  },
  articleNumber: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    ...TEXT_SHADOW,
  },
  articleTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#fff',
    marginTop: 1,
    ...TEXT_SHADOW,
  },
  articleContent: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  techCard: {
    marginBottom: 0,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  techName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: '#fff',
    ...TEXT_SHADOW,
  },
  techDesc: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
    ...TEXT_SHADOW,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    ...TEXT_SHADOW,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerCopy: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    ...TEXT_SHADOW,
  },
  footerQuote: {
    fontFamily: FontFamily.loraItalic,
    fontSize: 13,
    color: Colors.violet,
    textAlign: 'center',
    paddingHorizontal: 20,
    ...TEXT_SHADOW,
  },
});
