import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Animated } from 'react-native';
import {
  List,
  Info,
  ArrowDown,
  Pen,
  Trash2,
  Clock,
  Smartphone,
  ExternalLink,
  Calendar,
  Camera,
  Check,
  User,
  Lock,
} from 'lucide-react-native';
import { Colors, SCREEN_BACKGROUND } from '../../constants/colors';
import { useChildTheme } from '../../contexts/ChildThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FLOATING_TAB_BAR_HEIGHT, TAB_BAR_SCROLL_PADDING } from '../../components/FloatingTabBar';
import { FontFamily } from '../../hooks/useSolariaFonts';
import { getAccessJournal } from '../../services/rgpdService';

// ─── Types ────────────────────────────────────────────────

interface AccessEntry {
  id: string;
  person: string;
  avatar: string;
  role: string;
  action: string;
  module: string;
  moduleIcon: string;
  child: string;
  date: string;
  time: string;
  ip?: string;
  device?: string;
  color: string;
}

type FilterType = 'all' | 'today' | 'week' | 'month';

// ─── Mock data ────────────────────────────────────────────

const ACCESS_LOG: AccessEntry[] = [
  {
    id: '1', person: 'Sophie Moreau', avatar: '👩', role: 'Tuteur légal',
    action: 'Consultation', module: 'Notes & bulletins', moduleIcon: 'school',
    child: 'Lucas', date: "Aujourd'hui", time: '14:32', device: 'iPhone 15', ip: '192.168.1.42',
    color: Colors.cyan,
  },
  {
    id: '2', person: 'Sophie Moreau', avatar: '👩', role: 'Tuteur légal',
    action: 'Consultation', module: 'Profil élève', moduleIcon: 'person',
    child: 'Lucas', date: "Aujourd'hui", time: '14:28', device: 'iPhone 15', ip: '192.168.1.42',
    color: Colors.green,
  },
  {
    id: '3', person: 'Marc Moreau', avatar: '👨', role: 'Tuteur légal',
    action: 'Exportation PDF', module: 'Profil complet', moduleIcon: 'document-text',
    child: 'Lucas', date: "Aujourd'hui", time: '12:15', device: 'MacBook Pro', ip: '86.245.12.8',
    color: Colors.violet,
  },
  {
    id: '4', person: 'Marie-Claire Moreau', avatar: '👵', role: 'Grand-mère',
    action: 'Consultation', module: 'Photos', moduleIcon: 'camera',
    child: 'Lucas', date: 'Hier', time: '18:45', device: 'iPad Air', ip: '90.112.45.3',
    color: Colors.orange,
  },
  {
    id: '5', person: 'Marc Moreau', avatar: '👨', role: 'Tuteur légal',
    action: 'Modification', module: 'Agenda', moduleIcon: 'calendar',
    child: 'Emma', date: 'Hier', time: '20:15', device: 'Samsung Galaxy S24', ip: '86.245.12.8',
    color: Colors.violet,
  },
  {
    id: '6', person: 'Assistante maternelle', avatar: '👩‍🏫', role: 'Accompagnant',
    action: 'Consultation', module: 'Agenda', moduleIcon: 'calendar',
    child: 'Lucas', date: 'Il y a 2 jours', time: '08:30', device: 'Huawei P40', ip: '176.145.23.6',
    color: Colors.violet,
  },
  {
    id: '7', person: 'Sophie Moreau', avatar: '👩', role: 'Tuteur légal',
    action: 'Modification permissions', module: 'Réglages RGPD', moduleIcon: 'shield-checkmark',
    child: '—', date: 'Il y a 3 jours', time: '10:12', device: 'iPhone 15', ip: '192.168.1.42',
    color: Colors.green,
  },
  {
    id: '8', person: 'Dr. Martin', avatar: '👩‍⚕️', role: 'Accès minimal',
    action: 'Consultation', module: 'Profil (résumé)', moduleIcon: 'person',
    child: 'Lucas', date: 'Il y a 5 jours', time: '09:00', device: 'PC Bureau', ip: '212.56.89.1',
    color: Colors.green,
  },
  {
    id: '9', person: 'Sophie Moreau', avatar: '👩', role: 'Tuteur légal',
    action: 'Génération code transfert', module: 'RGPD Transfert', moduleIcon: 'swap-horizontal',
    child: 'Lucas', date: 'Il y a 1 semaine', time: '16:00', device: 'iPhone 15', ip: '192.168.1.42',
    color: Colors.pink,
  },
  {
    id: '10', person: 'Marc Moreau', avatar: '👨', role: 'Tuteur légal',
    action: 'Export intégral JSON', module: 'RGPD Export', moduleIcon: 'download',
    child: 'Tous', date: 'Il y a 2 semaines', time: '21:30', device: 'MacBook Pro', ip: '86.245.12.8',
    color: Colors.orange,
  },
];

// ─── Icon helpers ──────────────────────────────────────────

const getActionColor = (action: string) => {
  if (action.includes('Modification')) return Colors.orange;
  if (action.includes('Export') || action.includes('Génération')) return Colors.violet;
  if (action.includes('Suppression')) return Colors.red;
  return Colors.cyan;
};

const ActionIcon = ({ action, color }: { action: string; color: string }) => {
  const size = 14;
  if (action.includes('Modification')) return <Pen size={size} color={color} />;
  if (action.includes('Export')) return <ArrowDown size={size} color={color} />;
  if (action.includes('Génération')) return <Lock size={size} color={color} />;
  if (action.includes('Suppression')) return <Trash2 size={size} color={color} />;
  return <Check size={size} color={color} />;
};

const ModuleIcon = ({ icon, color, size = 12 }: { icon: string; color: string; size?: number }) => {
  if (icon === 'camera') return <Camera size={size} color={color} />;
  if (icon === 'calendar') return <Calendar size={size} color={color} />;
  if (icon === 'shield-checkmark') return <Lock size={size} color={color} />;
  if (icon === 'download') return <ArrowDown size={size} color={color} />;
  if (icon === 'person') return <User size={size} color={color} />;
  return <Check size={size} color={color} />;
};

// ─── Component ────────────────────────────────────────────

export default function JournalAccesScreen() {
  const { theme } = useChildTheme();
  const insets = useSafeAreaInsets();
  const TOPBAR_H = insets.top + 56;
  const [filter, setFilter] = useState<FilterType>('all');
  const [log, setLog] = useState<AccessEntry[]>(ACCESS_LOG);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadJournal = useCallback(async () => {
    const data = await getAccessJournal(filter);
    if (data.length > 0) {
      setLog(data.map((e) => {
        const d = new Date(e.created_at);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        let dateLabel = d.toLocaleDateString('fr-FR');
        if (diffDays === 0) dateLabel = "Aujourd'hui";
        else if (diffDays === 1) dateLabel = 'Hier';
        else if (diffDays < 7) dateLabel = `Il y a ${diffDays} jours`;
        return {
          id: e.id,
          person: e.person_name,
          avatar: e.person_avatar,
          role: e.person_role,
          action: e.action,
          module: e.module,
          moduleIcon: e.module_icon,
          child: e.child_name ?? '',
          date: dateLabel,
          time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          ip: e.ip_address ?? undefined,
          device: e.device ?? undefined,
          color: e.color,
        };
      }));
    }
  }, [filter]);

  useEffect(() => {
    loadJournal();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [filter]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Tout' },
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week', label: 'Semaine' },
    { key: 'month', label: 'Mois' },
  ];

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <View style={{ flex: 1, backgroundColor: SCREEN_BACKGROUND }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: TOPBAR_H + 12,
            paddingBottom: FLOATING_TAB_BAR_HEIGHT + TAB_BAR_SCROLL_PADDING,
            paddingHorizontal: 18,
          }}
        >
          {/* Info header */}
          <View style={[styles.card, { borderColor: Colors.cyan + '60', marginBottom: 14 }]}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: Colors.cyan + '20' }]}>
                <List size={24} color={Colors.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Journal de transparence</Text>
                <Text style={styles.infoSubtitle}>
                  Chaque consultation, modification et export est enregistré et visible ici.
                </Text>
              </View>
            </View>
          </View>

          {/* Stats summary */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.card]}>
              <Text style={[styles.statValue, { color: Colors.cyan }]}>{log.length}</Text>
              <Text style={styles.statLabel}>Total accès</Text>
            </View>
            <View style={[styles.statCard, styles.card]}>
              <Text style={[styles.statValue, { color: Colors.green }]}>
                {log.filter((e) => e.date === "Aujourd'hui").length}
              </Text>
              <Text style={styles.statLabel}>Aujourd'hui</Text>
            </View>
            <View style={[styles.statCard, styles.card]}>
              <Text style={[styles.statValue, { color: Colors.violet }]}>
                {new Set(log.map((e) => e.person)).size}
              </Text>
              <Text style={styles.statLabel}>Personnes</Text>
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filterRow}>
            {filters.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
              >
                <View
                  style={[
                    styles.filterPill,
                    filter === f.key
                      ? { backgroundColor: Colors.cyan + '15', borderColor: Colors.cyan + '60' }
                      : { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
                  ]}
                >
                  <Text style={[styles.filterText, filter === f.key && { color: Colors.cyan }]}>
                    {f.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Log entries */}
          {log.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const actionColor = getActionColor(entry.action);

            return (
              <Pressable
                key={entry.id}
                onPress={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                <View style={styles.entryCard}>
                  {/* Top row */}
                  <View style={[styles.entryTopRow, { marginBottom: 10 }]}>
                    <View style={[styles.entryAvatar, { borderColor: actionColor }]}>
                      <Text style={styles.entryAvatarText}>{entry.avatar}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.entryNameRow}>
                        <Text style={styles.personName}>{entry.person}</Text>
                        <Text style={styles.entryTime}>{entry.time}</Text>
                      </View>
                      <Text style={styles.personRole}>{entry.role}</Text>
                    </View>
                  </View>

                  {/* Action row */}
                  <View style={styles.badgeRow}>
                    <View style={[styles.actionBadge, { backgroundColor: actionColor + '15' }]}>
                      <ActionIcon action={entry.action} color={actionColor} />
                      <Text style={[styles.badgeText, { color: actionColor }]}>{entry.action}</Text>
                    </View>
                    <View style={[styles.actionBadge, { backgroundColor: entry.color + '15' }]}>
                      <ModuleIcon icon={entry.moduleIcon} color={entry.color} />
                      <Text style={[styles.badgeText, { color: entry.color }]}>{entry.module}</Text>
                    </View>
                  </View>

                  {/* Date & child */}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>📅 {entry.date}</Text>
                    <Text style={styles.metaText}>👤 {entry.child}</Text>
                  </View>

                  {/* Expanded details */}
                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      {entry.device && (
                        <View style={styles.expandedRow}>
                          <Smartphone size={14} color="#CBD5E1" />
                          <Text style={styles.expandedText}>Appareil : {entry.device}</Text>
                        </View>
                      )}
                      {entry.ip && (
                        <View style={styles.expandedRow}>
                          <ExternalLink size={14} color="#CBD5E1" />
                          <Text style={styles.expandedText}>IP : {entry.ip}</Text>
                        </View>
                      )}
                      <View style={styles.expandedRow}>
                        <Clock size={14} color="#CBD5E1" />
                        <Text style={styles.expandedText}>Horodatage : {entry.date} à {entry.time}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}

          {log.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Aucun accès pour cette période</Text>
            </View>
          )}

          {/* RGPD notice */}
          <View style={styles.card}>
            <View style={styles.noticeRow}>
              <Info size={16} color={Colors.cyan} />
              <Text style={styles.noticeText}>
                Conformément au RGPD (art. 15), vous avez le droit d'accéder à l'intégralité des données de consultation. Ce journal est conservé 12 mois.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SCREEN_BACKGROUND,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    marginBottom: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontFamily: FontFamily.sansBold, fontSize: 15, color: '#1A2340' },
  infoSubtitle: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#94A3B8', marginTop: 2, lineHeight: 17 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 12, padding: 12 },
  statValue: { fontFamily: FontFamily.sansBold, fontSize: 22 },
  statLabel: { fontFamily: FontFamily.sansRegular, fontSize: 10, color: '#94A3B8', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  filterText: { fontFamily: FontFamily.sansSemiBold, fontSize: 13, color: '#94A3B8' },
  entryCard: {
    backgroundColor: SCREEN_BACKGROUND,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    marginBottom: 10,
  },
  entryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2, backgroundColor: '#F8FAFC' },
  entryAvatarText: { fontSize: 18 },
  entryNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryTime: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#CBD5E1' },
  personName: { fontFamily: FontFamily.sansBold, fontSize: 14, color: '#1A2340' },
  personRole: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: '#94A3B8', marginTop: 1 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  actionBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontFamily: FontFamily.sansSemiBold, fontSize: 11 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaText: { fontFamily: FontFamily.sansRegular, fontSize: 11, color: '#94A3B8' },
  expandedSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 6 },
  expandedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expandedText: { fontFamily: FontFamily.sansRegular, fontSize: 12, color: '#94A3B8' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontFamily: FontFamily.sansRegular, fontSize: 14, color: '#94A3B8' },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noticeText: { fontFamily: FontFamily.sansRegular, fontSize: 11, lineHeight: 16, color: '#94A3B8', flex: 1 },
});
