/**
 * Notifications — Service de notifications push locales.
 *
 * Configure les notifications locales pour :
 * - Conseil du Matin à 7h30 chaque jour
 * - Rappels d'examens (optionnel)
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Configuration ───────────────────────────────────────

// Handle notifications when app is foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Règles (B4a, 26 sept 2026 — tasks/b4-decisions.md §5) ─────────────
// - Chaque notification commence par le PRÉNOM de l'enfant et porte un contenu utile.
// - Elle ouvre EXACTEMENT l'élément concerné, dans le carnet du bon enfant (données : childId + id).
// - Élément retiré : l'écran l'indique (« Mme Dupont a retiré ce mot »), jamais d'erreur.
// - Une modification ne renvoie jamais de nouvelle notification.

/** Ce qu'une notification doit ouvrir (lu par NotificationsRouteur). */
export type CibleNotification =
  | { type: 'mot'; childId: string; motId: string; expediteur?: string }
  | { type: 'agenda'; childId: string; date?: string };

/** Nouveau mot dans le carnet d'un enfant : « Lucas · Mme Dupont a publié un mot à signer ». */
export async function notifierMot(p: {
  prenom: string;
  childId: string;
  motId: string;
  expediteur: string;
  titre: string;
  aSigner: boolean;
}): Promise<string | null> {
  if (!(await requestNotificationPermissions())) return null;
  const cible: CibleNotification = { type: 'mot', childId: p.childId, motId: p.motId, expediteur: p.expediteur };
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${p.prenom} · ${p.expediteur} a publié un mot${p.aSigner ? ' à signer' : ''}`,
      body: p.titre,
      data: cible,
    },
    trigger: null,
  });
}

// ─── Permissions ─────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission non accordée');
    return false;
  }

  // iOS: configure notification categories
  if (Platform.OS === 'ios') {
    await Notifications.setNotificationCategoryAsync('conseil_matin', [
      {
        identifier: 'voir',
        buttonTitle: 'Voir le conseil',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'ignorer',
        buttonTitle: 'Plus tard',
        options: { isDestructive: false },
      },
    ]);
  }

  console.log('[Notifications] Permission accordée');
  return true;
}

// ─── Conseil du Matin — SUPPRIMÉ (B2.3) ─────────────────
// Il programmait, pour TOUT compte connecté, 7 notifications hebdomadaires à 7h30 parlant de
// « Lucas » (données de démo) : contraire à CLAUDE.md (push nommant l'enfant du compte,
// résumé unique à 18h, silence 20h–7h). Seule l'annulation reste, pour nettoyer les appareils
// qui les ont déjà programmées.

/**
 * Cancel all scheduled "Conseil du Matin" notifications.
 */
export async function cancelConseilDuMatin(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  for (const notif of scheduled) {
    if (notif.content.data?.type === 'conseil_matin') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  console.log('[Notifications] Conseil du Matin annulé');
}

// ─── Exam reminder ───────────────────────────────────────

interface ExamReminder {
  title: string;
  subject: string;
  date: Date;
  childName: string;
  childId: string;
}

/**
 * Schedule a reminder notification the evening before an exam (18:00).
 */
export async function scheduleExamReminder(exam: ExamReminder): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  // Schedule for 18:00 the day before
  const reminderDate = new Date(exam.date);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(18, 0, 0, 0);

  // Don't schedule if the reminder is in the past
  if (reminderDate <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${exam.childName} · ${exam.subject} demain`,
      body: `« ${exam.title} » demain.`,
      data: { type: 'agenda', childId: exam.childId, date: exam.date.toISOString().slice(0, 10) } satisfies CibleNotification,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });

  console.log(`[Notifications] Rappel examen programmé : ${exam.title} → ${reminderDate}`);
  return id;
}

// ─── Homework reminder ───────────────────────────────────

/**
 * Schedule a reminder for homework due tomorrow (17:00 the day before).
 */
export async function scheduleHomeworkReminder(
  childName: string,
  childId: string,
  subject: string,
  dueDate: Date,
): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(17, 0, 0, 0);

  if (reminderDate <= new Date()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${childName} · devoir de ${subject} pour demain`,
      body: `À rendre demain.`,
      data: { type: 'agenda', childId, date: dueDate.toISOString().slice(0, 10) } satisfies CibleNotification,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });

  console.log(`[Notifications] Rappel devoir programmé : ${subject} → ${reminderDate}`);
  return id;
}

// ─── Utility ─────────────────────────────────────────────

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[Notifications] Toutes les notifications annulées');
}

/**
 * Get all currently scheduled notifications.
 */
export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Listen for notification interactions (taps).
 */
export function onNotificationTap(
  callback: (data: Record<string, any>) => void,
) {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      if (data) callback(data as Record<string, any>);
    },
  );

  return () => subscription.remove();
}
