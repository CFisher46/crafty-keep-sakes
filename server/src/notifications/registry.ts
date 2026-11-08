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

const invoiceStatusTitles = {
  paid: 'Payment received',
  unpaid: 'Your order is awaiting payment',
  void: 'Your order has been cancelled',
} as const;

// Customers who have engaged with the blog (viewed or commented), excluding the author.
const getBlogAudienceIds = async (executor: Queryable, authorId: number): Promise<number[]> => {
  const [rows] = await executor.query<RowDataPacket[]>(
    `SELECT DISTINCT u.id AS user_id
     FROM users_v2 u
     WHERE u.status = 'active' AND u.id <> ? AND (
       u.id IN (SELECT user_id FROM blog_post_views_v2)
       OR u.id IN (SELECT user_id FROM blog_post_comments_v2)
     )`,
    [authorId]
  );

  return rows.map((row) => Number(row.user_id));
};

export const notificationDefinitions: NotificationDefinitions = {
  order_placed: {
    resolveRecipients: (executor) => getActiveAdminIds(executor),
    build: ({ orderId, invoiceId, invoiceNumber, totalDue }) => ({
      title: 'New order placed',
      body: `Order #${orderId} (${invoiceNumber}) for ${formatCurrency(totalDue)} is ready to process.`,
      link: `/Reporting/invoices?invoice=${invoiceId}`,
      data: { orderId, invoiceId, invoiceNumber },
    }),
  },
  invoice_status_changed: {
    resolveRecipients: async (_executor, { userId }) => [userId],
    build: ({ orderId, invoiceId, invoiceNumber, status }) => ({
      title: invoiceStatusTitles[status],
      body: `Invoice ${invoiceNumber}: ${invoiceStatusMessages[status]}`,
      link: `/invoices?invoice=${invoiceId}`,
      data: { orderId, invoiceId, invoiceNumber, status },
    }),
  },
  user_registered: {
    resolveRecipients: (executor) => getActiveAdminIds(executor),
    build: ({ userId, name, email }) => ({
      title: 'New customer registered',
      body: `${name || 'A new customer'} (${email}) has created an account.`,
      link: `/Admin?user=${userId}`,
      data: { userId },
    }),
  },
  account_created: {
    resolveRecipients: async (_executor, { userId }) => [userId],
    build: ({ userId }) => ({
      title: 'Welcome to Crafty Keep Sakes',
      body: 'An account has been created for you.',
      link: `/profile/${userId}`,
      data: { userId },
    }),
  },
  account_updated: {
    resolveRecipients: async (_executor, { userId }) => [userId],
    build: ({ userId, changes, status }) => {
      const deactivated = changes.includes('status') && status && status !== 'active';
      const parts = changes.map((change) =>
        change === 'status'
          ? `your account is now ${status}`
          : change === 'role'
            ? 'your account role was changed'
            : 'your details were updated'
      );

      return {
        title: deactivated ? 'Your account status has changed' : 'Your account was updated',
        body: `An administrator made changes: ${parts.join(', ')}.`,
        link: `/profile/${userId}`,
        data: { userId, changes },
      };
    },
  },
  blog_post_published: {
    resolveRecipients: (executor, { authorId }) => getBlogAudienceIds(executor, authorId),
    build: ({ postId, postTitle }) => ({
      title: 'New blog post',
      body: `"${postTitle}" has just been published.`,
      link: `/Blog/${postId}`,
      data: { postId },
    }),
  },
  blog_comment_added: {
    // Notify the post's author while they are still an active admin; otherwise all active admins.
    resolveRecipients: async (executor, { authorId, commenterId }) => {
      const admins = await getActiveAdminIds(executor);
      const recipients = admins.includes(authorId) ? [authorId] : admins;
      return recipients.filter((id) => id !== commenterId);
    },
    build: ({ postId, postTitle, commenterName, comment }) => ({
      title: 'New comment on your blog post',
      body: `${commenterName || 'Someone'} commented on "${postTitle}": ${
        comment.length > 140 ? `${comment.slice(0, 137)}...` : comment
      }`,
      link: `/Blog/${postId}`,
      data: { postId },
    }),
  },
  payment_failed: {
    resolveRecipients: async (_executor, { userId }) => [userId],
    build: ({ orderId, invoiceId, invoiceNumber }) => ({
      title: 'Payment unsuccessful',
      body: `Your payment for invoice ${invoiceNumber} did not go through. You can try again from your invoices.`,
      link: `/invoices?invoice=${invoiceId}`,
      data: { orderId, invoiceId, invoiceNumber },
    }),
  },
  tracking_added: {
    resolveRecipients: async (_executor, { userId }) => [userId],
    build: ({ orderId, invoiceId, invoiceNumber, trackingInfo }) => ({
      title: 'Your order is on its way',
      body: `Invoice ${invoiceNumber}: tracking details have been added (${trackingInfo}).`,
      link: `/invoices?invoice=${invoiceId}`,
      data: { orderId, invoiceId, invoiceNumber, trackingInfo },
    }),
  },
};
