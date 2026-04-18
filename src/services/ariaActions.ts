/**
 * ariaActions — Parse and execute action tags emitted by Aria (Claude).
 *
 * Format in Aria responses:
 *   [ACTION:ABSENCE|date=YYYY-MM-DD|motif=maladie|demi_journee=journee|student_id=1]
 *   [ACTION:MESSAGE|conversation_id=lea-laurent|draft=Bonjour Madame, ...]
 *
 * Flow: parse → confirm with parent → execute
 */

import {
  type CreateAbsencePayload,
  type AbsenceMotif,
  type DemiJournee,
  MOTIF_LABELS,
  DEMI_JOURNEE_LABELS,
  createAbsence,
} from './absenceService';
import { sendMessage } from '../stores/messagerieStore';

// ─── Types ───────────────────────────────────────────────

export type AriaActionType = 'ABSENCE' | 'MESSAGE';

export interface AriaAbsenceAction {
  type: 'ABSENCE';
  date: string;           // YYYY-MM-DD
  motif: AbsenceMotif;
  demi_journee: DemiJournee;
  student_id: string;
}

export interface AriaMessageAction {
  type: 'MESSAGE';
  conversation_id: string;
  draft: string;
}

export type AriaAction = AriaAbsenceAction | AriaMessageAction;

export interface ParseResult {
  cleanText: string;       // réponse Aria sans le tag
  action: AriaAction | null;
}

// ─── Helpers ─────────────────────────────────────────────

/** YYYY-MM-DD for today */
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Format a YYYY-MM-DD date in long French (e.g. "lundi 16 avril") */
function formatDateFrLong(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Parse "key=value|key2=value2..." into a plain object. */
function parseParams(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  raw.split('|').forEach((segment) => {
    const eqIdx = segment.indexOf('=');
    if (eqIdx === -1) return;
    const key = segment.slice(0, eqIdx).trim();
    const value = segment.slice(eqIdx + 1).trim();
    if (key) result[key] = value;
  });
  return result;
}

/** Narrow a raw string to AbsenceMotif, falling back to 'maladie'. */
function toMotif(raw: string | undefined): AbsenceMotif {
  const valid: AbsenceMotif[] = [
    'maladie',
    'maladie_avec_certificat',
    'raison_familiale',
    'autre',
  ];
  return valid.includes(raw as AbsenceMotif) ? (raw as AbsenceMotif) : 'maladie';
}

/** Narrow a raw string to DemiJournee, falling back to 'journee'. */
function toDemiJournee(raw: string | undefined): DemiJournee {
  const valid: DemiJournee[] = ['matin', 'apres_midi', 'journee'];
  return valid.includes(raw as DemiJournee) ? (raw as DemiJournee) : 'journee';
}

// ─── 1. Parse ─────────────────────────────────────────────

/**
 * Scan rawText for an action tag, extract it, and return the clean text
 * plus the parsed action (or null if none found).
 *
 * The tag is matched anywhere in the text (typically at the end).
 */
export function parseAriaResponse(rawText: string): ParseResult {
  // Match [ACTION:TYPE|key=value|...] — the value part may contain spaces
  const tagRegex = /\[ACTION:([A-Z]+)\|([^\]]+)\]/;
  const match = tagRegex.exec(rawText);

  if (!match) {
    return { cleanText: rawText, action: null };
  }

  const actionType = match[1] as AriaActionType;
  const paramStr = match[2];
  const params = parseParams(paramStr);

  // Remove the tag (and any surrounding whitespace) from the text
  const cleanText = rawText.replace(match[0], '').trim();

  switch (actionType) {
    case 'ABSENCE': {
      const action: AriaAbsenceAction = {
        type: 'ABSENCE',
        date: params['date'] ?? todayISO(),
        motif: toMotif(params['motif']),
        demi_journee: toDemiJournee(params['demi_journee']),
        student_id: params['student_id'] ?? '',
      };
      return { cleanText, action };
    }

    case 'MESSAGE': {
      const action: AriaMessageAction = {
        type: 'MESSAGE',
        conversation_id: params['conversation_id'] ?? '',
        draft: params['draft'] ?? '',
      };
      return { cleanText, action };
    }

    default:
      // Unknown action type — return clean text without action
      return { cleanText, action: null };
  }
}

// ─── 2. Execute ──────────────────────────────────────────

/**
 * Optional context injected from the Aria screen so absences reference the
 * real selected child (name + avatar) instead of hardcoded placeholders.
 *
 * Fixes the "Emma → Léa" bug where absences signaled via Aria always
 * appeared as "Élève" / 👧 regardless of which child the parent had selected.
 */
export interface AriaActionContext {
  /** Fallback student_id if Aria omits it in the tag */
  studentId?: string;
  studentName?: string;
  studentAvatar?: string;
  parentName?: string;
}

/**
 * Execute a confirmed AriaAction.
 *
 * For ABSENCE: calls createAbsence with minimal context (Aria-initiated).
 * For MESSAGE: calls sendMessage (synchronous store mutation).
 */
export async function executeAriaAction(
  action: AriaAction,
  context?: AriaActionContext,
): Promise<{ success: boolean; message: string }> {
  switch (action.type) {
    case 'ABSENCE': {
      const payload: CreateAbsencePayload = {
        student_id: action.student_id || context?.studentId || '',
        date_debut: action.date,
        date_fin: null,
        demi_journee: action.demi_journee,
        motif: action.motif,
        commentaire: null,
      };

      try {
        await createAbsence(
          payload,
          context?.parentName ?? 'Parent',
          context?.studentName ?? 'Élève',
          context?.studentAvatar ?? '👧',
        );
        const dateFr = formatDateFrLong(action.date);
        return {
          success: true,
          message: `✓ Absence signalée pour le ${dateFr}`,
        };
      } catch {
        return {
          success: false,
          message: "Impossible de signaler l'absence. Vérifiez votre connexion.",
        };
      }
    }

    case 'MESSAGE': {
      try {
        sendMessage(action.conversation_id, action.draft);
        return {
          success: true,
          message: '✓ Message envoyé !',
        };
      } catch {
        return {
          success: false,
          message: "Impossible d'envoyer le message.",
        };
      }
    }
  }
}

// ─── 3. Label ─────────────────────────────────────────────

/**
 * Human-readable label for an action — used in the confirmation dialog.
 */
export function formatAriaActionLabel(action: AriaAction): {
  title: string;
  description: string;
  icon: string;
} {
  switch (action.type) {
    case 'ABSENCE': {
      const motifLabel = MOTIF_LABELS[action.motif];
      const periodeLabel = DEMI_JOURNEE_LABELS[action.demi_journee];
      const dateFr = formatDateFrLong(action.date);
      return {
        title: 'Signaler une absence',
        description: `${motifLabel} — ${periodeLabel} — ${dateFr}`,
        icon: 'calendar-off',
      };
    }

    case 'MESSAGE': {
      const preview =
        action.draft.length > 60
          ? `${action.draft.slice(0, 60)}...`
          : action.draft;
      return {
        title: 'Envoyer un message',
        description: preview,
        icon: 'send',
      };
    }
  }
}
