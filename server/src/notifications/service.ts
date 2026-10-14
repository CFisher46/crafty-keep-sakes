import { db } from '../ts-common/database';
import { notificationDefinitions } from './registry';
import type {
  NotificationChannel,
  NotificationPayloads,
  NotificationType,
  Queryable,
} from './types';

export const inAppChannel: NotificationChannel = {
  name: 'in-app',
  deliver: async (executor, { userId, type, content }) => {
    await executor.query(
      `INSERT INTO notifications_v2 (user_id, type, title, body, link, data_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        type,
        content.title,
        content.body,
        content.link ?? null,
        content.data ? JSON.stringify(content.data) : null,
      ]
    );
  },
};

// Add further channels (for example email) here.
export const channels: NotificationChannel[] = [inAppChannel];

/**
 * Creates notifications for a business event. Never throws: a notification failure
 * must not break the action (checkout, invoice update) that triggered it.
 */
export async function notify<T extends NotificationType>(
  type: T,
  payload: NotificationPayloads[T],
  executor: Queryable = db
): Promise<void> {
  try {
    const definition = notificationDefinitions[type];
    const recipients = Array.from(
      new Set(await definition.resolveRecipients(executor, payload))
    ).filter((id) => Number.isFinite(id));
    const content = definition.build(payload);

    for (const userId of recipients) {
      for (const channel of channels) {
        try {
          await channel.deliver(executor, { userId, type, content });
        } catch (err) {
          console.error(`Notification ${type} failed on ${channel.name} for user ${userId}:`, err);
        }
      }
    }
  } catch (err) {
    console.error(`Notification ${type} failed:`, err);
  }
}
