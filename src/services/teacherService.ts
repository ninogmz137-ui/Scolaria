/**
 * Teacher Service — CRUD operations for 5 teacher screens.
 *
 * Tables: appreciations, teacher_conversations, teacher_messages,
 *         class_posts, class_post_reactions, class_post_seen, class_events
 *
 * Also queries checkins for dashboard & meteo aggregation.
 * Falls back to empty arrays when Supabase is not configured.
 */

import { supabase } from './supabase';
import { ENV } from './getEnv';

// ─── Helper ──────────────────────────────────────────────

function isSupabaseConfigured(): boolean {
  const url = ENV.SUPABASE_URL;
  return !!url && url.length > 0 && !url.includes('your-');
}

async function getTeacherId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? '';
}

// ═══════════════════════════════════════════════════════════
// 1. DASHBOARD — student wellbeing data from checkins
// ═══════════════════════════════════════════════════════════

export interface StudentWellbeing {
  id: string;
  code: string;
  avatar: string;
  joyScore: number;
  weekTrend: number[];
  trend: 'up' | 'down' | 'stable';
  alert: boolean;
  unreadMessages: number;
}

/**
 * Get anonymised wellbeing data for all students in the teacher's class.
 * Queries checkins from the last 5 school days.
 */
export async function getClassWellbeing(classe: string): Promise<StudentWellbeing[]> {
  if (!isSupabaseConfigured()) return [];

  const teacherId = await getTeacherId();

  // Get students in the class
  const { data: students } = await supabase
    .from('children')
    .select('id, first_name, avatar_emoji')
    .eq('classe', classe)
    .order('first_name');

  if (!students || students.length === 0) return [];

  // Get checkins from last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: checkins } = await supabase
    .from('checkins')
    .select('child_id, joy_score, created_at')
    .in('child_id', students.map((s) => s.id))
    .gte('created_at', weekAgo)
    .order('created_at', { ascending: true });

  // Get unread message counts per student
  const { data: conversations } = await supabase
    .from('teacher_conversations')
    .select('id, student_id')
    .eq('teacher_id', teacherId);

  const convIds = (conversations ?? []).map((c) => c.id);
  let unreadByStudent: Record<string, number> = {};

  if (convIds.length > 0) {
    const { data: unreadMsgs } = await supabase
      .from('teacher_messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .eq('sender_role', 'parent')
      .eq('read', false);

    for (const msg of unreadMsgs ?? []) {
      const conv = conversations?.find((c) => c.id === msg.conversation_id);
      if (conv) {
        unreadByStudent[conv.student_id] = (unreadByStudent[conv.student_id] || 0) + 1;
      }
    }
  }

  return students.map((student, i) => {
    const studentCheckins = (checkins ?? [])
      .filter((c) => c.child_id === student.id)
      .map((c) => c.joy_score);

    // Build 5-day trend (pad with 5 if no data)
    const weekTrend = studentCheckins.length >= 5
      ? studentCheckins.slice(-5)
      : [...Array(5 - studentCheckins.length).fill(5), ...studentCheckins];

    const currentScore = weekTrend[weekTrend.length - 1];
    const firstScore = weekTrend[0];
    const diff = currentScore - firstScore;
    const trend: 'up' | 'down' | 'stable' = diff > 1 ? 'up' : diff < -1 ? 'down' : 'stable';

    return {
      id: student.id,
      code: `Élève ${String(i + 1).padStart(2, '0')}`,
      avatar: student.avatar_emoji || '👦',
      joyScore: currentScore,
      weekTrend,
      trend,
      alert: currentScore <= 4 && trend === 'down',
      unreadMessages: unreadByStudent[student.id] || 0,
    };
  });
}

// ═══════════════════════════════════════════════════════════
// 2. APPRECIATIONS
// ═══════════════════════════════════════════════════════════

export interface Appreciation {
  id: string;
  teacher_id: string;
  student_id: string;
  student_name: string;
  level: 'excellent' | 'bien' | 'assez_bien' | 'insuffisant';
  competences: string[];
  text: string;
  trimestre: number;
  academic_year: string;
  status: 'draft' | 'validated' | 'sent';
  created_at: string;
}

export async function getAppreciations(trimestre?: number): Promise<Appreciation[]> {
  if (!isSupabaseConfigured()) return [];

  let query = supabase
    .from('appreciations')
    .select('*')
    .order('created_at', { ascending: false });

  if (trimestre) query = query.eq('trimestre', trimestre);

  const { data, error } = await query;
  if (error) {
    console.warn('[Teacher] getAppreciations error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function saveAppreciation(appreciation: {
  student_id: string;
  student_name: string;
  level: string;
  competences: string[];
  text: string;
  trimestre: number;
}): Promise<Appreciation | null> {
  if (!isSupabaseConfigured()) return null;

  const teacherId = await getTeacherId();
  const { data, error } = await supabase
    .from('appreciations')
    .insert({ ...appreciation, teacher_id: teacherId, status: 'validated' })
    .select()
    .single();

  if (error) {
    console.warn('[Teacher] saveAppreciation error:', error.message);
    return null;
  }
  return data;
}

export async function updateAppreciation(id: string, updates: Partial<Pick<Appreciation, 'text' | 'status'>>): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('appreciations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) console.warn('[Teacher] updateAppreciation error:', error.message);
}

// ═══════════════════════════════════════════════════════════
// 3. METEO DE CLASSE — aggregated wellbeing
// ═══════════════════════════════════════════════════════════

export interface DayWeatherData {
  day: string;
  date: string;
  avgScore: number;
  responses: number;
  alerts: number;
}

export interface ClassMeteo {
  weekData: DayWeatherData[];
  emotionDistribution: { emoji: string; label: string; percent: number; color: string }[];
  totalStudents: number;
  respondedToday: number;
  anxietyPercent: number;
  previousAnxietyPercent: number;
}

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export async function getClassMeteo(classe: string): Promise<ClassMeteo | null> {
  if (!isSupabaseConfigured()) return null;

  // Get students
  const { data: students } = await supabase
    .from('children')
    .select('id')
    .eq('classe', classe);

  if (!students || students.length === 0) return null;

  const studentIds = students.map((s) => s.id);
  const totalStudents = students.length;

  // Get checkins from last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: checkins } = await supabase
    .from('checkins')
    .select('child_id, joy_score, created_at')
    .in('child_id', studentIds)
    .gte('created_at', weekAgo)
    .order('created_at');

  if (!checkins || checkins.length === 0) return null;

  // Group by day
  const byDay: Record<string, number[]> = {};
  for (const c of checkins) {
    const d = new Date(c.created_at);
    const key = d.toISOString().split('T')[0];
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(c.joy_score);
  }

  const weekData: DayWeatherData[] = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-5)
    .map(([dateStr, scores]) => {
      const d = new Date(dateStr + 'T00:00:00');
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return {
        day: DAY_NAMES[d.getDay()],
        date: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        avgScore: Math.round(avg * 10) / 10,
        responses: scores.length,
        alerts: scores.filter((s) => s <= 3).length,
      };
    });

  // Emotion distribution from today's checkins
  const today = new Date().toISOString().split('T')[0];
  const todayScores = byDay[today] || [];
  const respondedToday = todayScores.length;

  const total = todayScores.length || 1;
  const veryGood = todayScores.filter((s) => s >= 8).length;
  const good = todayScores.filter((s) => s >= 6 && s < 8).length;
  const neutral = todayScores.filter((s) => s >= 4 && s < 6).length;
  const difficult = todayScores.filter((s) => s < 4).length;

  const emotionDistribution = [
    { emoji: '😄', label: 'Très bien', percent: Math.round((veryGood / total) * 100), color: '#10B981' },
    { emoji: '🙂', label: 'Bien', percent: Math.round((good / total) * 100), color: '#22D3EE' },
    { emoji: '😐', label: 'Bof', percent: Math.round((neutral / total) * 100), color: '#F59E0B' },
    { emoji: '😢', label: 'Difficile', percent: Math.round((difficult / total) * 100), color: '#EF4444' },
  ];

  // Anxiety = % of students with score <= 4
  const allScores = checkins.map((c) => c.joy_score);
  const anxietyPercent = Math.round((allScores.filter((s) => s <= 4).length / allScores.length) * 100);

  // Previous week anxiety
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: prevCheckins } = await supabase
    .from('checkins')
    .select('joy_score')
    .in('child_id', studentIds)
    .gte('created_at', twoWeeksAgo)
    .lt('created_at', weekAgo);

  const prevScores = (prevCheckins ?? []).map((c) => c.joy_score);
  const previousAnxietyPercent = prevScores.length > 0
    ? Math.round((prevScores.filter((s) => s <= 4).length / prevScores.length) * 100)
    : 0;

  return {
    weekData,
    emotionDistribution,
    totalStudents,
    respondedToday,
    anxietyPercent,
    previousAnxietyPercent,
  };
}

// ═══════════════════════════════════════════════════════════
// 4. MESSAGERIE PARENTS
// ═══════════════════════════════════════════════════════════

export interface ConversationData {
  id: string;
  studentCode: string;
  studentAvatar: string;
  parentName: string;
  parentAvatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  pinned: boolean;
  messages: MessageData[];
}

export interface MessageData {
  id: string;
  from: 'teacher' | 'parent';
  text: string;
  time: string;
  read: boolean;
}

export async function getConversations(): Promise<ConversationData[]> {
  if (!isSupabaseConfigured()) return [];

  const teacherId = await getTeacherId();

  const { data: convs, error } = await supabase
    .from('teacher_conversations')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('last_message_at', { ascending: false });

  if (error || !convs) {
    console.warn('[Teacher] getConversations error:', error?.message);
    return [];
  }

  const results: ConversationData[] = [];

  for (const conv of convs) {
    const { data: msgs } = await supabase
      .from('teacher_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });

    const messages: MessageData[] = (msgs ?? []).map((m) => ({
      id: m.id,
      from: m.sender_role as 'teacher' | 'parent',
      text: m.text,
      time: formatMessageTime(m.created_at),
      read: m.read,
    }));

    const unread = messages.filter((m) => m.from === 'parent' && !m.read).length;

    results.push({
      id: conv.id,
      studentCode: conv.student_code,
      studentAvatar: conv.student_avatar,
      parentName: conv.parent_name,
      parentAvatar: conv.parent_avatar,
      lastMessage: conv.last_message || '',
      lastTime: conv.last_message_at ? formatMessageTime(conv.last_message_at) : '',
      unread,
      pinned: conv.pinned,
      messages,
    });
  }

  return results;
}

export async function sendMessage(conversationId: string, text: string): Promise<MessageData | null> {
  if (!isSupabaseConfigured()) return null;

  const teacherId = await getTeacherId();

  const { data, error } = await supabase
    .from('teacher_messages')
    .insert({
      conversation_id: conversationId,
      sender_role: 'teacher',
      sender_id: teacherId,
      text,
      read: true,
    })
    .select()
    .single();

  if (error) {
    console.warn('[Teacher] sendMessage error:', error.message);
    return null;
  }

  // Update conversation last_message
  await supabase
    .from('teacher_conversations')
    .update({ last_message: text, last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return {
    id: data.id,
    from: 'teacher',
    text: data.text,
    time: "À l'instant",
    read: true,
  };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('teacher_messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .eq('sender_role', 'parent')
    .eq('read', false);

  if (error) console.warn('[Teacher] markConversationRead error:', error.message);
}

export async function togglePinConversation(conversationId: string, pinned: boolean): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('teacher_conversations')
    .update({ pinned })
    .eq('id', conversationId);

  if (error) console.warn('[Teacher] togglePinConversation error:', error.message);
}

// ═══════════════════════════════════════════════════════════
// 5. VIE DE CLASSE — posts, reactions, events
// ═══════════════════════════════════════════════════════════

export interface ClassPost {
  id: string;
  type: 'annonce' | 'photo' | 'evenement' | 'felicitation';
  title: string;
  content: string;
  emoji: string;
  date: string;
  pinned: boolean;
  photoCount: number;
  reactions: { emoji: string; count: number }[];
  seenByParents: number;
  totalParents: number;
}

export interface ClassEvent {
  id: string;
  title: string;
  emoji: string;
  date: string;
}

export async function getClassPosts(classe: string): Promise<ClassPost[]> {
  if (!isSupabaseConfigured()) return [];

  const teacherId = await getTeacherId();

  const { data: posts, error } = await supabase
    .from('class_posts')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('classe', classe)
    .order('created_at', { ascending: false });

  if (error || !posts) {
    console.warn('[Teacher] getClassPosts error:', error?.message);
    return [];
  }

  // Get total parents (students in class)
  const { count: totalParents } = await supabase
    .from('children')
    .select('*', { count: 'exact', head: true })
    .eq('classe', classe);

  const results: ClassPost[] = [];

  for (const post of posts) {
    // Get reactions aggregated
    const { data: reactions } = await supabase
      .from('class_post_reactions')
      .select('emoji')
      .eq('post_id', post.id);

    const reactionCounts: Record<string, number> = {};
    for (const r of reactions ?? []) {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    }

    // Get seen count
    const { count: seenCount } = await supabase
      .from('class_post_seen')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);

    results.push({
      id: post.id,
      type: post.type,
      title: post.title,
      content: post.content,
      emoji: post.emoji,
      date: formatRelativeDate(post.created_at),
      pinned: post.pinned,
      photoCount: post.photo_count || 0,
      reactions: Object.entries(reactionCounts).map(([emoji, count]) => ({ emoji, count })),
      seenByParents: seenCount ?? 0,
      totalParents: totalParents ?? 0,
    });
  }

  return results;
}

export async function createClassPost(post: {
  classe: string;
  type: 'annonce' | 'photo' | 'evenement' | 'felicitation';
  title: string;
  content: string;
  emoji: string;
  notify_parents: boolean;
}): Promise<ClassPost | null> {
  if (!isSupabaseConfigured()) return null;

  const teacherId = await getTeacherId();

  const { data, error } = await supabase
    .from('class_posts')
    .insert({ ...post, teacher_id: teacherId })
    .select()
    .single();

  if (error) {
    console.warn('[Teacher] createClassPost error:', error.message);
    return null;
  }

  return {
    id: data.id,
    type: data.type,
    title: data.title,
    content: data.content,
    emoji: data.emoji,
    date: "Aujourd'hui",
    pinned: false,
    photoCount: 0,
    reactions: [],
    seenByParents: 0,
    totalParents: 0,
  };
}

export async function getClassEvents(classe: string): Promise<ClassEvent[]> {
  if (!isSupabaseConfigured()) return [];

  const teacherId = await getTeacherId();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('class_events')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('classe', classe)
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(5);

  if (error) {
    console.warn('[Teacher] getClassEvents error:', error?.message);
    return [];
  }

  return (data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    emoji: e.emoji,
    date: new Date(e.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }),
  }));
}

export async function addReaction(postId: string, emoji: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const userId = await getTeacherId();
  const { error } = await supabase
    .from('class_post_reactions')
    .upsert({ post_id: postId, user_id: userId, emoji });

  if (error) console.warn('[Teacher] addReaction error:', error.message);
}

// ─── Helpers ──────────────────────────────────────────────

function formatMessageTime(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatRelativeDate(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'long' });
  return 'Semaine dernière';
}
