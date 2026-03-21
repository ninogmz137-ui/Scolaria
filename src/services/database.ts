/**
 * Database service — CRUD operations for all Scolaria tables
 *
 * Each function checks if Supabase is configured. If not,
 * it falls back to mock data so the app works in demo mode.
 */

import { supabase } from './supabase';

// ─── Helper: check if Supabase is configured ───────────

function isSupabaseConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return !!url && url.length > 0 && !url.includes('your-');
}

// ═══════════════════════════════════════════════════════════
// CHILDREN
// ═══════════════════════════════════════════════════════════

export async function getChildren(parentId: string) {
  if (!isSupabaseConfigured()) return { data: [], error: null };

  return supabase
    .from('children')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at');
}

export async function getChild(childId: string) {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  return supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .single();
}

export async function createChild(child: {
  parent_id: string;
  first_name: string;
  last_name?: string;
  avatar_emoji?: string;
  birth_date?: string;
  age?: number;
  classe: string;
  school: string;
  super_power?: string;
  super_power_emoji?: string;
}) {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  return supabase
    .from('children')
    .insert(child)
    .select()
    .single();
}

export async function updateChild(
  childId: string,
  updates: Record<string, unknown>,
) {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  return supabase
    .from('children')
    .update(updates)
    .eq('id', childId)
    .select()
    .single();
}

export async function deleteChild(childId: string) {
  if (!isSupabaseConfigured()) return { error: null };

  return supabase
    .from('children')
    .delete()
    .eq('id', childId);
}

// ═══════════════════════════════════════════════════════════
// SUBJECTS
// ═══════════════════════════════════════════════════════════

export async function getSubjects(childId: string) {
  if (!isSupabaseConfigured()) return { data: [], error: null };

  return supabase
    .from('subjects')
    .select('*')
    .eq('child_id', childId)
    .order('name');
}

export async function createSubject(subject: {
  child_id: string;
  name: string;
  emoji?: string;
  color?: string;
}) {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  return supabase
    .from('subjects')
    .insert(subject)
    .select()
    .single();
}

// ═══════════════════════════════════════════════════════════
// GRADES
// ═══════════════════════════════════════════════════════════

export async function getGrades(childId: string, options?: {
  subjectId?: string;
  trimester?: number;
  limit?: number;
}) {
  if (!isSupabaseConfigured()) return { data: [], error: null };

  let query = supabase
    .from('grades')
    .select('*, subjects(name, emoji, color)')
    .eq('child_id', childId)
    .order('date', { ascending: false });

  if (options?.subjectId) {
    query = query.eq('subject_id', options.subjectId);
  }
  if (options?.trimester) {
    query = query.eq('trimester', options.trimester);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return query;
}

export async function createGrade(grade: {
  child_id: string;
  subject_id: string;
  value: number;
  max_value?: number;
  class_avg?: number;
  type?: string;
  comment?: string;
  date?: string;
  trimester?: number;
  source?: string;
}) {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  return supabase
    .from('grades')
    .insert(grade)
    .select()
    .single();
}

export async function createGradesBatch(grades: {
  child_id: string;
  subject_id: string;
  value: number;
  max_value?: number;
  class_avg?: number;
  type?: string;
  comment?: string;
  date?: string;
  trimester?: number;
  source?: string;
}[]) {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  return supabase
    .from('grades')
    .insert(grades)
    .select();
}

export async function updateGrade(
  gradeId: string,
  updates: Record<string, unknown>,
) {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  return supabase
    .from('grades')
    .update(updates)
    .eq('id', gradeId)
    .select()
    .single();
}

export async function deleteGrade(gradeId: string) {
  if (!isSupabaseConfigured()) return { error: null };

  return supabase
    .from('grades')
    .delete()
    .eq('id', gradeId);
}

// Subject averages view
export async function getSubjectAverages(childId: string) {
  if (!isSupabaseConfigured()) return { data: [], error: null };

  return supabase
    .from('subject_averages')
    .select('*')
    .eq('child_id', childId);
}

// ═══════════════════════════════════════════════════════════
// CHECK-INS
// ═══════════════════════════════════════════════════════════

export async function getCheckins(childId: string, options?: {
  days?: number;
  limit?: number;
}) {
  if (!isSupabaseConfigured()) return { data: [], error: null };

  let query = supabase
    .from('checkins')
    .select('*')
    .eq('child_id', childId)
    .order('date', { ascending: false });

  if (options?.days) {
    const since = new Date();
    since.setDate(since.getDate() - options.days);
    query = query.gte('date', since.toISOString().split('T')[0]);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return query;
}

export async function createCheckin(checkin: {
  child_id: string;
  mode: 'maternelle' | 'primaire' | 'lycee';
  emotion?: string;
  energy?: number;
  stress?: number;
  motivation?: number;
  social?: number;
  joy_score?: number;
  message?: string;
  is_confidential?: boolean;
  xp_earned?: number;
}) {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  return supabase
    .from('checkins')
    .insert(checkin)
    .select()
    .single();
}

// ═══════════════════════════════════════════════════════════
// AGENDA
// ═══════════════════════════════════════════════════════════

export async function getAgendaEvents(childId: string, options?: {
  startDate?: string;
  endDate?: string;
  type?: string;
}) {
  if (!isSupabaseConfigured()) return { data: [], error: null };

  let query = supabase
    .from('agenda_events')
    .select('*')
    .eq('child_id', childId)
    .order('start_time');

  if (options?.startDate) {
    query = query.gte('start_time', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('start_time', options.endDate);
  }
  if (options?.type) {
    query = query.eq('event_type', options.type);
  }

  return query;
}

export async function createAgendaEvent(event: {
  child_id: string;
  parent_id: string;
  title: string;
  description?: string;
  event_type: string;
  subject?: string;
  emoji?: string;
  color?: string;
  location?: string;
  start_time: string;
  end_time?: string;
  is_all_day?: boolean;
  reminder_minutes?: number;
}) {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  return supabase
    .from('agenda_events')
    .insert(event)
    .select()
    .single();
}

export async function updateAgendaEvent(
  eventId: string,
  updates: Record<string, unknown>,
) {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  return supabase
    .from('agenda_events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();
}

export async function toggleEventDone(eventId: string, isDone: boolean) {
  return updateAgendaEvent(eventId, { is_done: isDone });
}

export async function deleteAgendaEvent(eventId: string) {
  if (!isSupabaseConfigured()) return { error: null };

  return supabase
    .from('agenda_events')
    .delete()
    .eq('id', eventId);
}

// ═══════════════════════════════════════════════════════════
// ARIA CONVERSATIONS
// ═══════════════════════════════════════════════════════════

export async function getConversations(parentId: string) {
  if (!isSupabaseConfigured()) return { data: [], error: null };

  return supabase
    .from('aria_conversations')
    .select('*, children(first_name)')
    .eq('parent_id', parentId)
    .order('updated_at', { ascending: false });
}

export async function createConversation(parentId: string, childId: string) {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  return supabase
    .from('aria_conversations')
    .insert({ parent_id: parentId, child_id: childId })
    .select()
    .single();
}

export async function getConversationMessages(conversationId: string) {
  if (!isSupabaseConfigured()) return { data: [], error: null };

  return supabase
    .from('aria_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at');
}

export async function saveAriaMessage(message: {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
}) {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  return supabase
    .from('aria_messages')
    .insert(message)
    .select()
    .single();
}

// ═══════════════════════════════════════════════════════════
// CHILD OVERVIEW (for dashboard)
// ═══════════════════════════════════════════════════════════

export async function getChildOverview(childId: string) {
  if (!isSupabaseConfigured()) return { data: null, error: null };

  return supabase
    .from('child_overview')
    .select('*')
    .eq('child_id', childId)
    .single();
}
