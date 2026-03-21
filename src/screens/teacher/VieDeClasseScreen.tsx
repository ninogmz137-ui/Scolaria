/**
 * Vie de Classe — Photos, annonces et moments partagés.
 *
 * Fil d'actualité de la classe : annonces de l'enseignant,
 * événements à venir, et mur de photos.
 */

import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────

type PostType = 'annonce' | 'photo' | 'evenement' | 'felicitation';

interface Post {
  id: string;
  type: PostType;
  title: string;
  content: string;
  emoji: string;
  date: string;
  pinned?: boolean;
  reactions?: { emoji: string; count: number }[];
  photoCount?: number;
}

// ─── Mock data ───────────────────────────────────────────

const CLASS_INFO = {
  name: 'CM2-A',
  school: 'École Voltaire',
  teacher: 'Mme Dupont',
  students: 26,
};

const POSTS: Post[] = [
  {
    id: '1',
    type: 'annonce',
    title: 'Réunion parents-professeurs',
    content: 'La réunion du 2ème trimestre aura lieu le jeudi 27 mars à 18h en salle polyvalente. Inscription via le cahier de liaison.',
    emoji: '📢',
    date: 'Aujourd\'hui',
    pinned: true,
    reactions: [
      { emoji: '👍', count: 14 },
      { emoji: '✅', count: 8 },
    ],
  },
  {
    id: '2',
    type: 'photo',
    title: 'Sortie au Muséum',
    content: 'Retour en images sur notre sortie au Muséum d\'Histoire Naturelle. Les enfants ont adoré l\'exposition sur les dinosaures !',
    emoji: '📸',
    date: 'Hier',
    photoCount: 12,
    reactions: [
      { emoji: '❤️', count: 18 },
      { emoji: '😍', count: 7 },
    ],
  },
  {
    id: '3',
    type: 'felicitation',
    title: 'Bravo à toute la classe !',
    content: 'Moyenne générale en hausse de +0.8 points ce trimestre. Un effort collectif remarquable, continuez comme ça !',
    emoji: '🏆',
    date: 'Lundi',
    reactions: [
      { emoji: '🎉', count: 22 },
      { emoji: '💪', count: 11 },
    ],
  },
  {
    id: '4',
    type: 'evenement',
    title: 'Spectacle de fin d\'année',
    content: 'Répétitions tous les mardis et jeudis de 15h à 16h. Thème : "Le tour du monde en 80 jours". Pensez aux costumes !',
    emoji: '🎭',
    date: 'Semaine dernière',
    reactions: [
      { emoji: '🌟', count: 15 },
    ],
  },
  {
    id: '5',
    type: 'annonce',
    title: 'Évaluations de français',
    content: 'Les évaluations de français auront lieu le lundi 24 mars. Révisions : conjugaison (passé composé, imparfait) et dictée préparée n°12.',
    emoji: '📝',
    date: 'Semaine dernière',
    reactions: [
      { emoji: '📚', count: 6 },
    ],
  },
];

const UPCOMING_EVENTS = [
  { id: 'e1', title: 'Cross de l\'école', date: '25 mars', emoji: '🏃' },
  { id: 'e2', title: 'Réunion parents', date: '27 mars', emoji: '🤝' },
  { id: 'e3', title: 'Classe verte', date: '14 avril', emoji: '🌿' },
];

const POST_TYPE_CONFIG: Record<PostType, { color: string; label: string }> = {
  annonce: { color: Colors.cyan, label: 'Annonce' },
  photo: { color: Colors.violet, label: 'Photos' },
  evenement: { color: Colors.orange, label: 'Événement' },
  felicitation: { color: Colors.green, label: 'Félicitations' },
};

// ─── Component ───────────────────────────────────────────

export default function VieDeClasseScreen() {
  const [filter, setFilter] = useState<PostType | 'all'>('all');
  const [showComposer, setShowComposer] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<PostType>('annonce');

  // Animations
  const fadeAnims = useRef(POSTS.map(() => new Animated.Value(0))).current;
  const slideAnims = useRef(POSTS.map(() => new Animated.Value(40))).current;
  const composerHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(
      100,
      POSTS.map((_, i) =>
        Animated.parallel([
          Animated.timing(fadeAnims[i], { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(slideAnims[i], { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        ]),
      ),
    ).start();
  }, []);

  const toggleComposer = () => {
    const opening = !showComposer;
    setShowComposer(opening);
    Animated.spring(composerHeight, {
      toValue: opening ? 1 : 0,
      tension: 60,
      friction: 10,
      useNativeDriver: false,
    }).start();
  };

  const handlePublish = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir le titre et le contenu.');
      return;
    }
    Alert.alert('Publié !', `Votre ${POST_TYPE_CONFIG[newType].label.toLowerCase()} a été partagée avec la classe.`);
    setNewTitle('');
    setNewContent('');
    toggleComposer();
  };

  const filteredPosts = filter === 'all' ? POSTS : POSTS.filter((p) => p.type === filter);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.violetDark, Colors.blueNight]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
        style={styles.header}
      >
        <Text style={styles.headerEmoji}>🏫</Text>
        <Text style={styles.headerTitle}>Vie de classe</Text>
        <Text style={styles.headerSubtitle}>
          {CLASS_INFO.name} • {CLASS_INFO.school} • {CLASS_INFO.students} élèves
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* Upcoming events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prochains événements</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.eventsRow}>
              {UPCOMING_EVENTS.map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventEmoji}>{event.emoji}</Text>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDate}>{event.date}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* New post button */}
        <TouchableOpacity
          style={styles.newPostButton}
          onPress={toggleComposer}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.violet, Colors.cyanDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.newPostGradient}
          >
            <Ionicons
              name={showComposer ? 'close' : 'create'}
              size={20}
              color={Colors.white}
            />
            <Text style={styles.newPostText}>
              {showComposer ? 'Annuler' : 'Nouvelle publication'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Composer */}
        <Animated.View
          style={[
            styles.composerContainer,
            {
              maxHeight: composerHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 500],
              }),
              opacity: composerHeight,
              marginBottom: composerHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 20],
              }),
            },
          ]}
        >
          <View style={styles.composer}>
            {/* Type selector */}
            <View style={styles.typeRow}>
              {(Object.keys(POST_TYPE_CONFIG) as PostType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeChip,
                    newType === type && {
                      borderColor: POST_TYPE_CONFIG[type].color,
                      backgroundColor: POST_TYPE_CONFIG[type].color + '15',
                    },
                  ]}
                  onPress={() => setNewType(type)}
                >
                  <Text style={[
                    styles.typeChipText,
                    newType === type && { color: POST_TYPE_CONFIG[type].color },
                  ]}>
                    {POST_TYPE_CONFIG[type].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.composerTitle}
              placeholder="Titre..."
              placeholderTextColor={Colors.gray}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={styles.composerContent}
              placeholder="Contenu de la publication..."
              placeholderTextColor={Colors.gray}
              value={newContent}
              onChangeText={setNewContent}
              multiline
              maxLength={500}
            />

            <View style={styles.composerActions}>
              <TouchableOpacity style={styles.composerAttach}>
                <Ionicons name="camera" size={20} color={Colors.cyan} />
                <Text style={styles.composerAttachText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.publishButton,
                  (!newTitle.trim() || !newContent.trim()) && { opacity: 0.4 },
                ]}
                onPress={handlePublish}
                disabled={!newTitle.trim() || !newContent.trim()}
              >
                <Ionicons name="send" size={16} color={Colors.white} />
                <Text style={styles.publishText}>Publier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Tout
            </Text>
          </TouchableOpacity>
          {(Object.keys(POST_TYPE_CONFIG) as PostType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                filter === type && {
                  borderColor: POST_TYPE_CONFIG[type].color,
                  backgroundColor: POST_TYPE_CONFIG[type].color + '15',
                },
              ]}
              onPress={() => setFilter(type)}
            >
              <Text style={[
                styles.filterText,
                filter === type && { color: POST_TYPE_CONFIG[type].color },
              ]}>
                {POST_TYPE_CONFIG[type].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Posts feed */}
        {filteredPosts.map((post, i) => (
          <Animated.View
            key={post.id}
            style={[
              styles.postCard,
              i < fadeAnims.length && {
                opacity: fadeAnims[i],
                transform: [{ translateY: slideAnims[i] }],
              },
            ]}
          >
            {/* Pinned badge */}
            {post.pinned && (
              <View style={styles.pinnedBadge}>
                <Ionicons name="pin" size={12} color={Colors.orange} />
                <Text style={styles.pinnedText}>Épinglé</Text>
              </View>
            )}

            {/* Post header */}
            <View style={styles.postHeader}>
              <View style={[styles.postTypeTag, { backgroundColor: POST_TYPE_CONFIG[post.type].color + '18' }]}>
                <Text style={styles.postEmoji}>{post.emoji}</Text>
                <Text style={[styles.postTypeText, { color: POST_TYPE_CONFIG[post.type].color }]}>
                  {POST_TYPE_CONFIG[post.type].label}
                </Text>
              </View>
              <Text style={styles.postDate}>{post.date}</Text>
            </View>

            {/* Content */}
            <Text style={styles.postTitle}>{post.title}</Text>
            <Text style={styles.postContent}>{post.content}</Text>

            {/* Photo placeholder */}
            {post.photoCount && (
              <View style={styles.photoGrid}>
                {Array.from({ length: Math.min(post.photoCount, 4) }, (_, j) => (
                  <View key={j} style={styles.photoPlaceholder}>
                    <Ionicons name="image" size={24} color={Colors.gray} />
                    {j === 3 && post.photoCount! > 4 && (
                      <View style={styles.morePhotos}>
                        <Text style={styles.morePhotosText}>+{post.photoCount! - 4}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Reactions */}
            {post.reactions && post.reactions.length > 0 && (
              <View style={styles.reactionsRow}>
                {post.reactions.map((r, ri) => (
                  <View key={ri} style={styles.reactionBadge}>
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                    <Text style={styles.reactionCount}>{r.count}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.addReaction}>
                  <Ionicons name="add" size={14} color={Colors.gray} />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        ))}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.blueNight },
  // Header
  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 24 },
  headerEmoji: { fontSize: 42, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: Colors.white, marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  // Body
  body: { paddingHorizontal: 20, paddingTop: 8 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.white, marginBottom: 12 },
  // Events
  eventsRow: { flexDirection: 'row', gap: 10 },
  eventCard: {
    width: 120, backgroundColor: Colors.blueNightCard,
    borderRadius: 14, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  eventEmoji: { fontSize: 28, marginBottom: 6 },
  eventTitle: { fontSize: 12, fontWeight: '700', color: Colors.white, textAlign: 'center', marginBottom: 2 },
  eventDate: { fontSize: 11, color: Colors.cyan, fontWeight: '600' },
  // New post
  newPostButton: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  newPostGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  newPostText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  // Composer
  composerContainer: { overflow: 'hidden' },
  composer: {
    backgroundColor: Colors.blueNightCard, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.violet + '30',
  },
  typeRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  typeChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  typeChipText: { fontSize: 11, fontWeight: '600', color: Colors.gray },
  composerTitle: {
    backgroundColor: Colors.blueNightLight, borderRadius: 10,
    padding: 12, color: Colors.white, fontSize: 15, fontWeight: '600',
    marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  composerContent: {
    backgroundColor: Colors.blueNightLight, borderRadius: 10,
    padding: 12, color: Colors.white, fontSize: 14,
    minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  composerActions: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  composerAttach: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, backgroundColor: 'rgba(34,211,238,0.1)',
  },
  composerAttachText: { fontSize: 13, fontWeight: '600', color: Colors.cyan },
  publishButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 12, backgroundColor: Colors.violet,
  },
  publishText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  // Filters
  filterRow: {
    flexDirection: 'row', gap: 6, marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  filterChipActive: {
    borderColor: Colors.cyan, backgroundColor: Colors.cyan + '15',
  },
  filterText: { fontSize: 12, fontWeight: '600', color: Colors.gray },
  filterTextActive: { color: Colors.cyan },
  // Posts
  postCard: {
    backgroundColor: Colors.blueNightCard, borderRadius: 18,
    padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', backgroundColor: Colors.orange + '15',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    marginBottom: 10,
  },
  pinnedText: { fontSize: 10, fontWeight: '700', color: Colors.orange },
  postHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  postTypeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  postEmoji: { fontSize: 14 },
  postTypeText: { fontSize: 11, fontWeight: '700' },
  postDate: { fontSize: 11, color: Colors.gray },
  postTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.white, marginBottom: 6,
  },
  postContent: {
    fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 21,
  },
  // Photos
  photoGrid: {
    flexDirection: 'row', gap: 6, marginTop: 12,
  },
  photoPlaceholder: {
    flex: 1, height: 80, borderRadius: 10,
    backgroundColor: Colors.blueNightLight,
    justifyContent: 'center', alignItems: 'center',
  },
  morePhotos: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  morePhotosText: { fontSize: 18, fontWeight: '800', color: Colors.white },
  // Reactions
  reactionsRow: {
    flexDirection: 'row', gap: 6, marginTop: 12, alignItems: 'center',
  },
  reactionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, fontWeight: '700', color: Colors.gray },
  addReaction: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
  },
});
