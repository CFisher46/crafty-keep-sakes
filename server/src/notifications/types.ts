import type { Pool, PoolConnection } from 'mysql2/promise';

export type Queryable = Pick<Pool | PoolConnection, 'query'>;

export type NotificationContent = {
  title: string;
  body: string;
  link?: string;
  data?: Record<string, unknown>;
};

// Add a new notification type by adding its payload here and a definition in registry.ts.
export type NotificationPayloads = {
  order_placed: {
    orderId: number;
    invoiceId: number;
    invoiceNumber: string;
    totalDue: number;
  };
  invoice_status_changed: {
    userId: number;
    orderId: number;
    invoiceId: number;
    invoiceNumber: string;
    status: 'unpaid' | 'paid' | 'void';
  };
  tracking_added: {
    userId: number;
    orderId: number;
    invoiceId: number;
    invoiceNumber: string;
    trackingInfo: string;
  };
};

export type NotificationType = keyof NotificationPayloads;

export type NotificationDefinition<P> = {
  resolveRecipients: (executor: Queryable, payload: P) => Promise<number[]>;
  build: (payload: P) => NotificationContent;
};

export type NotificationDefinitions = {
  [T in NotificationType]: NotificationDefinition<NotificationPayloads[T]>;
};

export type NotificationDelivery = {
  userId: number;
  type: NotificationType;
  content: NotificationContent;
};

// A channel delivers one notification to one recipient (in-app today, email later).
export type NotificationChannel = {
  name: string;
  deliver: (executor: Queryable, delivery: NotificationDelivery) => Promise<void>;
};
