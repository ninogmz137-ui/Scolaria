/**
 * Vie de Classe — Photos, annonces et moments partagés.
 *
 * Fil d'actualité de la classe : annonces de l'enseignant,
 * événements à venir, galerie photo, et mur d'interactions.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ScrollView,
  TextInput,
  Animated,
  Alert,
  Dimensions,
  Switch,
  StyleSheet,
} from 'react-native';
import { Box, Text, Pressable, HStack, VStack } from '../../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const { width } = Dimensions.get('window');
const GALLERY_COLUMNS = 3;
const GALLERY_GAP = 6;
const GALLERY_CELL_SIZE = (width - 40 - GALLERY_GAP * (GALLERY_COLUMNS - 1)) / GALLERY_COLUMNS;

// ─── Types ───────────────────────────────────────────────

type PostType = 'annonce' | 'photo' | 'evenement' | 'felicitation';

interface Reaction {
  emoji: string;
  count: number;
}

interface Post {
  id: string;
  type: PostType;
  title: string;
  content: string;
  emoji: string;
  date: string;
  pinned?: boolean;
  reactions?: Reaction[];
  photoCount?: number;
  seenByParents?: number;
  totalParents?: number;
}

// ─── Mock data ───────────────────────────────────────────

const CLASS_INFO = {
  name: 'CM2-A',
  school: 'École Voltaire',
  teacher: 'Mme Dupont',
  students: 26,
};

const TOTAL_PARENTS = 26;

const INITIAL_POSTS: Post[] = [
  {
    id: '1',
    type: 'annonce',
    title: 'Réunion parents-professeurs',
    content:
      'La réunion du 2ème trimestre aura lieu le jeudi 27 mars à 18h en salle polyvalente. Inscription via le cahier de liaison.',
    emoji: '📢',
    date: "Aujourd'hui",
    pinned: true,
    reactions: [
      { emoji: '👍', count: 14 },
      { emoji: '✅', count: 8 },
    ],
    seenByParents: 22,
    totalParents: TOTAL_PARENTS,
  },
  {
    id: '2',
    type: 'photo',
    title: 'Sortie au Muséum',
    content:
      "Retour en images sur notre sortie au Muséum d'Histoire Naturelle. Les enfants ont adoré l'exposition sur les dinosaures !",
    emoji: '📸',
    date: 'Hier',
    photoCount: 12,
    reactions: [
      { emoji: '❤️', count: 18 },
      { emoji: '😍', count: 7 },
    ],
    seenByParents: 18,
    totalParents: TOTAL_PARENTS,
  },
  {
    id: '6',
    type: 'photo',
    title: 'Atelier poterie',
    content:
      "Les élèves ont découvert le travail de la terre lors d'un atelier poterie animé par un artisan local. De belles créations à venir !",
    emoji: '📸',
    date: 'Mercredi',
    photoCount: 8,
    reactions: [
      { emoji: '❤️', count: 12 },
      { emoji: '🎨', count: 9 },
    ],
    seenByParents: 15,
    totalParents: TOTAL_PARENTS,
  },
  {
    id: '3',
    type: 'felicitation',
    title: 'Bravo à toute la classe !',
    content:
      'Moyenne générale en hausse de +0.8 points ce trimestre. Un effort collectif remarquable, continuez comme ça !',
    emoji: '🏆',
    date: 'Lundi',
    reactions: [
      { emoji: '🎉', count: 22 },
      { emoji: '💪', count: 11 },
    ],
    seenByParents: 24,
    totalParents: TOTAL_PARENTS,
  },
  {
    id: '7',
    type: 'felicitation',
    title: 'Zéro absence cette semaine !',
    content:
      'Toute la classe était présente chaque jour cette semaine. Un bel exemple de régularité et d\'engagement. Bravo à tous !',
    emoji: '🌟',
    date: 'Jeudi',
    reactions: [
      { emoji: '🎉', count: 19 },
      { emoji: '👏', count: 14 },
    ],
    seenByParents: 20,
    totalParents: TOTAL_PARENTS,
  },
  {
    id: '4',
    type: 'evenement',
    title: "Spectacle de fin d'année",
    content:
      'Répétitions tous les mardis et jeudis de 15h à 16h. Thème : "Le tour du monde en 80 jours". Pensez aux costumes !',
    emoji: '🎭',
    date: 'Semaine dernière',
    reactions: [{ emoji: '🌟', count: 15 }],
    seenByParents: 21,
    totalParents: TOTAL_PARENTS,
  },
  {
    id: '5',
    type: 'annonce',
    title: 'Évaluations de français',
    content:
      'Les évaluations de français auront lieu le lundi 24 mars. Révisions : conjugaison (passé composé, imparfait) et dictée préparée n°12.',
    emoji: '📝',
    date: 'Semaine dernière',
    reactions: [{ emoji: '📚', count: 6 }],
    seenByParents: 16,
    totalParents: TOTAL_PARENTS,
  },
];

const UPCOMING_EVENTS = [
  { id: 'e1', title: "Cross de l'école", date: '25 mars', emoji: '🏃' },
  { id: 'e2', title: 'Réunion parents', date: '27 mars', emoji: '🤝' },
  { id: 'e3', title: 'Classe verte', date: '14 avril', emoji: '🌿' },
];

const GALLERY_TOTAL = 24;

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
  const [notifyParents, setNotifyParents] = useState(true);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);

  // Animations
  const fadeAnims = useRef(INITIAL_POSTS.map(() => new Animated.Value(0))).current;
  const slideAnims = useRef(INITIAL_POSTS.map(() => new Animated.Value(40))).current;
  const composerHeight = useRef(new Animated.Value(0)).current;

  // Reaction bounce animations
  const reactionScales = useRef<Record<string, Animated.Value>>({});
  const getReactionScale = (key: string): Animated.Value => {
    if (!reactionScales.current[key]) {
      reactionScales.current[key] = new Animated.Value(1);
    }
    return reactionScales.current[key];
  };

  useEffect(() => {
    Animated.stagger(
      100,
      INITIAL_POSTS.map((_, i) =>
        Animated.parallel([
          Animated.timing(fadeAnims[i], {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnims[i], {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
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
    const notifMsg = notifyParents ? '\nLes parents ont été notifiés.' : '';
    Alert.alert(
      'Publié !',
      `Votre ${POST_TYPE_CONFIG[newType].label.toLowerCase()} a été partagée avec la classe.${notifMsg}`,
    );
    setNewTitle('');
    setNewContent('');
    setNotifyParents(true);
    toggleComposer();
  };

  const handleReactionTap = useCallback(
    (postId: string, reactionIndex: number) => {
      const key = `${postId}-${reactionIndex}`;
      const scaleAnim = getReactionScale(key);

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId || !p.reactions) return p;
          const updatedReactions = p.reactions.map((r, ri) =>
            ri === reactionIndex ? { ...r, count: r.count + 1 } : r,
          );
          return { ...p, reactions: updatedReactions };
        }),
      );

      scaleAnim.setValue(1);
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.35,
          tension: 300,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [],
  );

  const filteredPosts = filter === 'all' ? posts : posts.filter((p) => p.type === filter);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.blueNight }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.violetDark, Colors.blueNight]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
        style={{ alignItems: 'center', paddingTop: 20, paddingBottom: 24 }}
      >
        <Text className="text-[42px] mb-2">🏫</Text>
        <Text className="text-[22px] font-black mb-1" style={{ color: Colors.white }}>Vie de classe</Text>
        <Text className="text-[13px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {CLASS_INFO.name} • {CLASS_INFO.school} • {CLASS_INFO.students} élèves
        </Text>
      </LinearGradient>

      <VStack className="px-5 pt-2">
        {/* ─── Photo Gallery Section ─── */}
        <VStack className="mb-5">
          <HStack className="items-center gap-2 mb-3">
            <Ionicons name="camera" size={18} color={Colors.violet} />
            <Text className="text-base font-bold" style={{ color: Colors.white }}>Photos de classe</Text>
          </HStack>
          <HStack className="flex-wrap" style={{ gap: GALLERY_GAP }}>
            {Array.from({ length: 6 }, (_, i) => (
              <Box key={i} className="rounded-xl overflow-hidden" style={{ width: GALLERY_CELL_SIZE, height: GALLERY_CELL_SIZE, backgroundColor: Colors.blueNightCard, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                <Box className="flex-1 justify-center items-center" style={{ backgroundColor: Colors.blueNightLight }}>
                  <Ionicons name="camera" size={22} color="rgba(255,255,255,0.25)" />
                </Box>
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.45)']}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]}
                />
              </Box>
            ))}
          </HStack>
          <Pressable className="self-end mt-2.5 py-1 px-2" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text className="text-[13px] font-bold" style={{ color: Colors.violet }}>
              Voir les {GALLERY_TOTAL} photos
            </Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.violet} />
          </Pressable>
        </VStack>

        {/* ─── Upcoming Events ─── */}
        <VStack className="mb-5">
          <HStack className="items-center gap-2 mb-3">
            <Ionicons name="calendar" size={18} color={Colors.cyan} />
            <Text className="text-base font-bold" style={{ color: Colors.white }}>Prochains événements</Text>
          </HStack>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HStack className="gap-2.5">
              {UPCOMING_EVENTS.map((event) => (
                <VStack key={event.id} className="w-[120px] items-center p-3.5 rounded-[14px]" style={{ backgroundColor: Colors.blueNightCard, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                  <Text className="text-[28px] mb-1.5">{event.emoji}</Text>
                  <Text className="text-xs font-bold text-center mb-0.5" style={{ color: Colors.white }}>{event.title}</Text>
                  <Text className="text-[11px] font-semibold" style={{ color: Colors.cyan }}>{event.date}</Text>
                </VStack>
              ))}
            </HStack>
          </ScrollView>
        </VStack>

        {/* ─── New Post Button ─── */}
        <Pressable onPress={toggleComposer} className="rounded-[14px] overflow-hidden mb-4">
          <LinearGradient
            colors={[Colors.violet, Colors.cyanDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 }}
          >
            <Ionicons name={showComposer ? 'close' : 'create'} size={20} color={Colors.white} />
            <Text className="text-[15px] font-bold" style={{ color: Colors.white }}>
              {showComposer ? 'Annuler' : 'Nouvelle publication'}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* ─── Composer ─── */}
        <Animated.View
          style={{
            overflow: 'hidden',
            maxHeight: composerHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 600],
            }),
            opacity: composerHeight,
            marginBottom: composerHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 20],
            }),
          }}
        >
          <Box className="rounded-2xl p-4" style={{ backgroundColor: Colors.blueNightCard, borderWidth: 1, borderColor: Colors.violet + '30' }}>
            {/* Type selector */}
            <HStack className="gap-1.5 mb-3 flex-wrap">
              {(Object.keys(POST_TYPE_CONFIG) as PostType[]).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setNewType(type)}
                  className="px-2.5 py-[5px] rounded-[10px]"
                  style={{
                    borderWidth: 1,
                    borderColor: newType === type ? POST_TYPE_CONFIG[type].color : 'rgba(255,255,255,0.1)',
                    backgroundColor: newType === type ? POST_TYPE_CONFIG[type].color + '15' : 'transparent',
                  }}
                >
                  <Text className="text-[11px] font-semibold" style={{ color: newType === type ? POST_TYPE_CONFIG[type].color : Colors.gray }}>
                    {POST_TYPE_CONFIG[type].label}
                  </Text>
                </Pressable>
              ))}
            </HStack>

            <TextInput
              style={{
                backgroundColor: Colors.blueNightLight, borderRadius: 10, padding: 12,
                color: Colors.white, fontSize: 15, fontWeight: '600', marginBottom: 8,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
              }}
              placeholder="Titre..."
              placeholderTextColor={Colors.gray}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={{
                backgroundColor: Colors.blueNightLight, borderRadius: 10, padding: 12,
                color: Colors.white, fontSize: 14, minHeight: 80, textAlignVertical: 'top',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 12,
              }}
              placeholder="Contenu de la publication..."
              placeholderTextColor={Colors.gray}
              value={newContent}
              onChangeText={setNewContent}
              multiline
              maxLength={500}
            />

            {/* Notify parents toggle */}
            <HStack className="justify-between items-center rounded-[10px] px-3 py-2 mb-3" style={{ backgroundColor: Colors.blueNightLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
              <HStack className="items-center gap-2">
                <Ionicons name="notifications" size={16} color={Colors.orange} />
                <Text className="text-[13px] font-semibold" style={{ color: Colors.white }}>Notifier les parents</Text>
              </HStack>
              <Switch
                value={notifyParents}
                onValueChange={setNotifyParents}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.violet + '60' }}
                thumbColor={notifyParents ? Colors.violet : Colors.gray}
              />
            </HStack>

            <HStack className="justify-between items-center">
              <Pressable className="rounded-[10px] py-2 px-3" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,211,238,0.1)' }}>
                <Ionicons name="camera" size={20} color={Colors.cyan} />
                <Text className="text-[13px] font-semibold" style={{ color: Colors.cyan }}>Photo</Text>
              </Pressable>
              <Pressable
                onPress={handlePublish}
                disabled={!newTitle.trim() || !newContent.trim()}
                className="rounded-xl py-2.5 px-[18px]"
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: Colors.violet,
                  opacity: (!newTitle.trim() || !newContent.trim()) ? 0.4 : 1,
                }}
              >
                <Ionicons name="send" size={16} color={Colors.white} />
                <Text className="text-sm font-bold" style={{ color: Colors.white }}>Publier</Text>
              </Pressable>
            </HStack>
          </Box>
        </Animated.View>

        {/* ─── Filter Tabs ─── */}
        <HStack className="gap-1.5 mb-4 flex-wrap">
          <Pressable
            onPress={() => setFilter('all')}
            className="px-3 py-1.5 rounded-[10px]"
            style={{
              borderWidth: 1,
              borderColor: filter === 'all' ? Colors.cyan : 'rgba(255,255,255,0.1)',
              backgroundColor: filter === 'all' ? Colors.cyan + '15' : 'transparent',
            }}
          >
            <Text className="text-xs font-semibold" style={{ color: filter === 'all' ? Colors.cyan : Colors.gray }}>
              Tout
            </Text>
          </Pressable>
          {(Object.keys(POST_TYPE_CONFIG) as PostType[]).map((type) => (
            <Pressable
              key={type}
              onPress={() => setFilter(type)}
              className="px-3 py-1.5 rounded-[10px]"
              style={{
                borderWidth: 1,
                borderColor: filter === type ? POST_TYPE_CONFIG[type].color : 'rgba(255,255,255,0.1)',
                backgroundColor: filter === type ? POST_TYPE_CONFIG[type].color + '15' : 'transparent',
              }}
            >
              <Text className="text-xs font-semibold" style={{ color: filter === type ? POST_TYPE_CONFIG[type].color : Colors.gray }}>
                {POST_TYPE_CONFIG[type].label}
              </Text>
            </Pressable>
          ))}
        </HStack>

        {/* ─── Posts Feed ─── */}
        {filteredPosts.map((post, i) => (
          <Animated.View
            key={post.id}
            style={[
              {
                backgroundColor: Colors.blueNightCard,
                borderRadius: 18,
                padding: 18,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
              },
              i < fadeAnims.length && {
                opacity: fadeAnims[i],
                transform: [{ translateY: slideAnims[i] }],
              },
            ]}
          >
            {/* Pinned badge */}
            {post.pinned && (
              <HStack className="items-center gap-1 self-start px-2 py-[3px] rounded-lg mb-2.5" style={{ backgroundColor: Colors.orange + '15' }}>
                <Ionicons name="pin" size={12} color={Colors.orange} />
                <Text className="text-[10px] font-bold" style={{ color: Colors.orange }}>Épinglé</Text>
              </HStack>
            )}

            {/* Post header */}
            <HStack className="justify-between items-center mb-2.5">
              <HStack className="items-center gap-1.5 px-2.5 py-1 rounded-[10px]" style={{ backgroundColor: POST_TYPE_CONFIG[post.type].color + '18' }}>
                <Text className="text-sm">{post.emoji}</Text>
                <Text className="text-[11px] font-bold" style={{ color: POST_TYPE_CONFIG[post.type].color }}>
                  {POST_TYPE_CONFIG[post.type].label}
                </Text>
              </HStack>
              <Text className="text-[11px]" style={{ color: Colors.gray }}>{post.date}</Text>
            </HStack>

            {/* Content */}
            <Text className="text-base font-bold mb-1.5" style={{ color: Colors.white }}>{post.title}</Text>
            <Text className="text-sm leading-[21px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{post.content}</Text>

            {/* Photo placeholder grid */}
            {post.photoCount && post.photoCount > 0 && (
              <HStack className="gap-1.5 mt-3">
                {Array.from({ length: Math.min(post.photoCount, 4) }, (_, j) => (
                  <Box key={j} className="flex-1 h-20 rounded-[10px] justify-center items-center" style={{ backgroundColor: Colors.blueNightLight }}>
                    <Ionicons name="image" size={24} color={Colors.gray} />
                    {j === 3 && post.photoCount! > 4 && (
                      <Box className="rounded-[10px] justify-center items-center" style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                        <Text className="text-lg font-extrabold" style={{ color: Colors.white }}>
                          +{post.photoCount! - 4}
                        </Text>
                      </Box>
                    )}
                  </Box>
                ))}
              </HStack>
            )}

            {/* Seen by parents indicator */}
            {post.seenByParents != null && post.totalParents != null && (
              <HStack className="items-center gap-1.5 mt-3 pt-2.5" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                <Ionicons name="eye" size={14} color={Colors.gray} />
                <Text className="text-xs font-semibold" style={{ color: Colors.gray }}>
                  Vu par {post.seenByParents}/{post.totalParents} parents
                </Text>
              </HStack>
            )}

            {/* Reactions — interactive */}
            {post.reactions && post.reactions.length > 0 && (
              <HStack className="gap-1.5 mt-2.5 items-center">
                {post.reactions.map((r, ri) => {
                  const scaleKey = `${post.id}-${ri}`;
                  const scaleAnim = getReactionScale(scaleKey);
                  return (
                    <Pressable
                      key={ri}
                      onPress={() => handleReactionTap(post.id, ri)}
                    >
                      <Animated.View
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
                          transform: [{ scale: scaleAnim }],
                        }}
                      >
                        <Text className="text-sm">{r.emoji}</Text>
                        <Text className="text-xs font-bold" style={{ color: Colors.gray }}>{r.count}</Text>
                      </Animated.View>
                    </Pressable>
                  );
                })}
                <Pressable className="w-7 h-7 rounded-[14px] justify-center items-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <Ionicons name="add" size={14} color={Colors.gray} />
                </Pressable>
              </HStack>
            )}
          </Animated.View>
        ))}

        <Box className="h-10" />
      </VStack>
    </ScrollView>
  );
}
