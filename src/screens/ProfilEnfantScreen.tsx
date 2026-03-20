import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import SuperPowerBadge from '../components/profile/SuperPowerBadge';
import CompetenceRadar from '../components/profile/CompetenceRadar';
import JoyHistory from '../components/profile/JoyHistory';
import Portfolio from '../components/profile/Portfolio';

// ─── Mock data ────────────────────────────────────────────

const CHILD = {
  name: 'Lucas Moreau',
  avatar: '👦',
  classe: 'CM2 — École Voltaire',
  scolariaId: 'SCA-2026-FR-048721',
  age: 10,
  superPower: 'Curiosité',
  superPowerEmoji: '🔭',
};

const COMPETENCES = [
  { label: 'Logique', value: 8, emoji: '🧠' },
  { label: 'Créativité', value: 7, emoji: '🎨' },
  { label: 'Communication', value: 6, emoji: '💬' },
  { label: 'Autonomie', value: 8, emoji: '🚀' },
  { label: 'Collaboration', value: 7, emoji: '🤝' },
];

const PORTFOLIO = [
  { id: '1', name: 'Judo', emoji: '🥋', category: 'Sport', level: 'Ceinture verte', color: Colors.green },
  { id: '2', name: 'Piano', emoji: '🎹', category: 'Musique', level: '3ème année', color: Colors.violet },
  { id: '3', name: 'Robotique', emoji: '🤖', category: 'Tech', level: 'Intermédiaire', color: Colors.cyan },
  { id: '4', name: 'Dessin', emoji: '✏️', category: 'Art', level: 'Avancé', color: Colors.pink },
];

const JOY_30_DAYS = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  score: Math.floor(Math.random() * 5 + 5), // 5-9
}));

// ─── Component ────────────────────────────────────────────

export default function ProfilEnfantScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header card */}
      <LinearGradient
        colors={[Colors.violet, Colors.blueNight]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{CHILD.avatar}</Text>
        </View>

        <Text style={styles.childName}>{CHILD.name}</Text>
        <Text style={styles.childClasse}>{CHILD.classe}</Text>

        {/* Scolaria ID */}
        <View style={styles.idBadge}>
          <Ionicons name="finger-print" size={14} color={Colors.cyan} />
          <Text style={styles.idText}>{CHILD.scolariaId}</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="copy-outline" size={14} color={Colors.gray} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {/* Super Power Badge */}
        <View style={styles.section}>
          <SuperPowerBadge
            power={CHILD.superPower}
            emoji={CHILD.superPowerEmoji}
          />
        </View>

        {/* Competence Radar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compétences</Text>
          <View style={styles.radarCard}>
            <CompetenceRadar data={COMPETENCES} />
          </View>
        </View>

        {/* Portfolio */}
        <View style={styles.section}>
          <Portfolio activities={PORTFOLIO} />
        </View>

        {/* Joy History 30 days */}
        <View style={styles.section}>
          <JoyHistory data={JOY_30_DAYS} month="Mars 2026" />
        </View>

        {/* Export PDF button */}
        <TouchableOpacity style={styles.exportButton} activeOpacity={0.8}>
          <LinearGradient
            colors={[Colors.violet, Colors.violetDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.exportGradient}
          >
            <Ionicons name="document-text" size={22} color={Colors.white} />
            <Text style={styles.exportText}>Exporter en PDF</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.exportHint}>
          Génère un passeport scolaire complet au format PDF
        </Text>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueNight,
  },
  // Header
  headerGradient: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: Colors.cyan,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  childName: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
    marginBottom: 4,
  },
  childClasse: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 14,
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.2)',
  },
  idText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.cyan,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  // Body
  body: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 12,
  },
  radarCard: {
    backgroundColor: Colors.blueNightCard,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  // Export
  exportButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: 8,
  },
  exportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  exportText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  exportHint: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 10,
  },
});
