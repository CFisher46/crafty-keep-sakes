import type { RowDataPacket } from 'mysql2';
import type { NotificationDefinitions, Queryable } from './types';

const formatCurrency = (value: number) => `£${Number(value).toFixed(2)}`;

export const getActiveAdminIds = async (executor: Queryable): Promise<number[]> => {
  const [rows] = await executor.query<RowDataPacket[]>(
    `SELECT DISTINCT ur.user_id
     FROM user_roles_v2 ur
     JOIN roles_v2 r ON r.id = ur.role_id
     JOIN users_v2 u ON u.id = ur.user_id
     WHERE r.code = 'admin' AND u.status = 'active'`
  );

  return rows.map((row) => Number(row.user_id));
};

const invoiceStatusMessages = {
  paid: 'Payment received. Thank you!',
  unpaid: 'It is now marked as awaiting payment.',
  void: 'It has been cancelled.',
} as const;

export const notificationDefinitions: NotificationDefinitions = {
  order_placed: {
    resolveRecipients: (executor) => getActiveAdminIds(executor),
    build: ({ orderId, invoiceId, invoiceNumber, totalDue }) => ({
      title: 'New order placed',
      body: `Order #${orderId} (${invoiceNumber}) for ${formatCurrency(totalDue)} is ready to process.`,
      link: '/Admin',
      data: { orderId, invoiceId, invoiceNumber },
    }),
  },
  invoice_status_changed: {
    resolveRecipients: async (_executor, { userId }) => [userId],
    build: ({ userId, orderId, invoiceId, invoiceNumber, status }) => ({
      title: 'Your order has been updated',
      body: `Invoice ${invoiceNumber}: ${invoiceStatusMessages[status]}`,
      link: `/profile/${userId}`,
      data: { orderId, invoiceId, invoiceNumber, status },
    }),
  },
  tracking_added: {
    resolveRecipients: async (_executor, { userId }) => [userId],
    build: ({ userId, orderId, invoiceId, invoiceNumber, trackingInfo }) => ({
      title: 'Your order is on its way',
      body: `Invoice ${invoiceNumber}: tracking details have been added (${trackingInfo}).`,
      link: `/profile/${userId}`,
      data: { orderId, invoiceId, invoiceNumber, trackingInfo },
    }),
  },
};
