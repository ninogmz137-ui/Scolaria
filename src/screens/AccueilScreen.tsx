import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Colors } from '../constants/colors';
import ChildSwitcher, { Child } from '../components/ChildSwitcher';
import AriaCard from '../components/AriaCard';
import JoyScore from '../components/JoyScore';
import RecentGrades from '../components/RecentGrades';
import WeekAgenda from '../components/WeekAgenda';

// ─── Mock Data ─────────────────────────────────────────────

const CHILDREN: Child[] = [
  { id: '1', name: 'Lucas', avatar: '👦', classe: 'CM2 — École Voltaire' },
  { id: '2', name: 'Emma', avatar: '👧', classe: '6ème — Collège Hugo' },
];

const JOY_DATA = {
  '1': {
    scores: [
      { day: 'Lun', score: 8, emoji: '😊' },
      { day: 'Mar', score: 6, emoji: '🙂' },
      { day: 'Mer', score: 9, emoji: '😄' },
      { day: 'Jeu', score: 5, emoji: '😐' },
      { day: 'Ven', score: 7, emoji: '🙂' },
      { day: 'Sam', score: 8, emoji: '😊' },
      { day: 'Dim', score: 9, emoji: '😄' },
    ],
    average: 7.4,
  },
  '2': {
    scores: [
      { day: 'Lun', score: 7, emoji: '🙂' },
      { day: 'Mar', score: 8, emoji: '😊' },
      { day: 'Mer', score: 6, emoji: '🙂' },
      { day: 'Jeu', score: 9, emoji: '😄' },
      { day: 'Ven', score: 7, emoji: '🙂' },
      { day: 'Sam', score: 8, emoji: '😊' },
      { day: 'Dim', score: 8, emoji: '😊' },
    ],
    average: 7.6,
  },
};

const GRADES = {
  '1': [
    { id: 'g1', subject: 'Maths', grade: 16, maxGrade: 20, date: '18 mars', emoji: '📐', color: Colors.cyan },
    { id: 'g2', subject: 'Français', grade: 14, maxGrade: 20, date: '17 mars', emoji: '📖', color: Colors.violet },
    { id: 'g3', subject: 'Histoire', grade: 18, maxGrade: 20, date: '15 mars', emoji: '🏛️', color: Colors.orange },
    { id: 'g4', subject: 'Sciences', grade: 12, maxGrade: 20, date: '14 mars', emoji: '🔬', color: Colors.green },
  ],
  '2': [
    { id: 'g5', subject: 'Anglais', grade: 17, maxGrade: 20, date: '18 mars', emoji: '🇬🇧', color: Colors.cyan },
    { id: 'g6', subject: 'Maths', grade: 13, maxGrade: 20, date: '17 mars', emoji: '📐', color: Colors.violet },
    { id: 'g7', subject: 'SVT', grade: 15, maxGrade: 20, date: '16 mars', emoji: '🌿', color: Colors.green },
    { id: 'g8', subject: 'Musique', grade: 19, maxGrade: 20, date: '15 mars', emoji: '🎵', color: Colors.pink },
  ],
};

const AGENDA = {
  '1': {
    dayLabel: "Aujourd'hui — Vendredi 20 mars",
    events: [
      { id: 'e1', time: '08:30', title: 'Mathématiques', subtitle: 'Salle 12 — M. Dupont', icon: 'calculator' as const, color: Colors.cyan },
      { id: 'e2', time: '10:00', title: 'Français', subtitle: 'Salle 8 — Mme Martin', icon: 'book' as const, color: Colors.violet, isNow: true },
      { id: 'e3', time: '13:30', title: 'Sport', subtitle: 'Gymnase — M. Leroy', icon: 'football' as const, color: Colors.green },
      { id: 'e4', time: '15:00', title: 'Sciences', subtitle: 'Labo — Mme Petit', icon: 'flask' as const, color: Colors.orange },
    ],
  },
  '2': {
    dayLabel: "Aujourd'hui — Vendredi 20 mars",
    events: [
      { id: 'e5', time: '08:00', title: 'Anglais', subtitle: 'Salle 204 — Mme Roux', icon: 'globe' as const, color: Colors.cyan },
      { id: 'e6', time: '09:00', title: 'SVT', subtitle: 'Labo — M. Bernard', icon: 'leaf' as const, color: Colors.green, isNow: true },
      { id: 'e7', time: '11:00', title: 'Musique', subtitle: 'Salle musique — M. Morel', icon: 'musical-notes' as const, color: Colors.pink },
      { id: 'e8', time: '14:00', title: 'Maths', subtitle: 'Salle 102 — Mme Faure', icon: 'calculator' as const, color: Colors.violet },
    ],
  },
};

// ─── Component ─────────────────────────────────────────────

export default function AccueilScreen() {
  const [selectedChildId, setSelectedChildId] = useState(CHILDREN[0].id);

  const joy = JOY_DATA[selectedChildId as keyof typeof JOY_DATA];
  const grades = GRADES[selectedChildId as keyof typeof GRADES];
  const agenda = AGENDA[selectedChildId as keyof typeof AGENDA];
  const selectedChild = CHILDREN.find((c) => c.id === selectedChildId)!;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.greeting}>Bonjour 👋</Text>
        <Text style={styles.headerSubtitle}>Passeport scolaire de votre famille</Text>
      </View>

      {/* Child switcher */}
      <ChildSwitcher
        children={CHILDREN}
        selectedId={selectedChildId}
        onSelect={setSelectedChildId}
      />

      {/* Aria Card */}
      <AriaCard childName={selectedChild.name} />

      {/* Section spacer */}
      <View style={styles.section} />

      {/* Joy Score */}
      <JoyScore data={joy.scores} average={joy.average} />

      {/* Section spacer */}
      <View style={styles.section} />

      {/* Recent grades */}
      <RecentGrades grades={grades} />

      {/* Section spacer */}
      <View style={styles.section} />

      {/* Week Agenda */}
      <WeekAgenda events={agenda.events} dayLabel={agenda.dayLabel} />

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueNight,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gray,
  },
  section: {
    height: 24,
  },
  bottomPadding: {
    height: 40,
  },
});
