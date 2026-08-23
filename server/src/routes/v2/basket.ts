import express from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../ts-common/database';
import { verifyAuthToken, requireRole } from '../../ts-common/middleware';
import { insertAuditEvent } from './audit-events';

const router = express.Router();

type BasketItemRecord = RowDataPacket & {
  id: number;
  basket_id: number;
  product_id: number;
  quantity: number;
  unit_price_snapshot: string | number;
  product_name?: string;
};

type AuthenticatedUser = {
  id?: string | number;
  type?: string;
};

const getRequestUser = (req: express.Request): AuthenticatedUser => {
  const user = (req as express.Request & { user?: AuthenticatedUser | string }).user;

  if (!user || typeof user === 'string' || user.id === undefined) {
    throw new Error('Invalid authenticated user');
  }

  return user;
};

const getUserId = (req: express.Request): number => {
  const user = getRequestUser(req);
  const parsed = Number(user.id);

  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid authenticated user');
  }

  return parsed;
};

const isAdminUser = (req: express.Request): boolean => {
  const user = getRequestUser(req);
  return String(user.type || '').trim().toLowerCase() === 'admin';
};

const parseQuantity = (value: unknown, fieldName: string): number => {
  const parsed = Number(value ?? 1);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return Math.trunc(parsed);
};

const parsePrice = (value: unknown, fieldName: string): number => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return Number(parsed.toFixed(2));
};

const toCurrency = (amount: number): number => Number(amount.toFixed(2));

const ensureActiveBasket = async (
  connection: Awaited<ReturnType<typeof db.getConnection>>,
  userId: number
): Promise<number> => {
  const [basketRows] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM baskets_v2 WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1`,
    [userId]
  );

  if (Array.isArray(basketRows) && basketRows.length > 0) {
    return Number(basketRows[0].id);
  }

  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO baskets_v2 (user_id, status) VALUES (?, 'active')`,
    [userId]
  );

  return result.insertId;
};

const readBasketItems = async (
  connection: Awaited<ReturnType<typeof db.getConnection>>,
  basketId: number
): Promise<BasketItemRecord[]> => {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT bi.id, bi.basket_id, bi.product_id, bi.quantity, bi.unit_price_snapshot,
            p.product_name
     FROM basket_items_v2 bi
     LEFT JOIN products_v2 p ON p.id = bi.product_id
     WHERE bi.basket_id = ?
     ORDER BY bi.id ASC`,
    [basketId]
  );

  return (Array.isArray(rows) ? rows : []) as BasketItemRecord[];
};

const mapBasketItem = (item: BasketItemRecord) => ({
  id: Number(item.id),
  basket_id: Number(item.basket_id),
  product_id: Number(item.product_id),
  quantity: Number(item.quantity),
  product_name: item.product_name ?? `Product ${item.product_id}`,
  unit_price: Number(item.unit_price_snapshot),
  line_total: toCurrency(Number(item.quantity) * Number(item.unit_price_snapshot)),
});

router.get('/', verifyAuthToken, async (req, res) => {
  console.log('GET /api/v2/basket');

  const connection = await db.getConnection();

  try {
    const userId = getUserId(req);
    const basketId = await ensureActiveBasket(connection, userId);
    const items = await readBasketItems(connection, basketId);

    res.json({
      basket_id: basketId,
      user_id: userId,
      status: 'active',
      items: items.map(mapBasketItem),
      total_items: items.reduce((sum, item) => sum + Number(item.quantity), 0),
    });
  } catch (err) {
    console.error('Get V2 Basket Error:', err);
    if (err instanceof Error && err.message.includes('Invalid authenticated user')) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

router.get('/orders', verifyAuthToken, async (req, res) => {
  console.log('GET /api/v2/basket/orders');

  const connection = await db.getConnection();

  try {
    const userId = getUserId(req);
    const isAdmin = isAdminUser(req);

    const [rows] = await connection.query<RowDataPacket[]>(
      isAdmin
        ? `SELECT o.id, o.user_id, o.order_status, o.subtotal, o.discount_total, o.tax_total, o.grand_total, o.placed_at,
                 i.id AS invoice_id, i.invoice_number
           FROM orders_v2 o
           LEFT JOIN invoices_v2 i ON i.order_id = o.id
           ORDER BY o.placed_at DESC`
        : `SELECT o.id, o.user_id, o.order_status, o.subtotal, o.discount_total, o.tax_total, o.grand_total, o.placed_at,
                 i.id AS invoice_id, i.invoice_number
           FROM orders_v2 o
           LEFT JOIN invoices_v2 i ON i.order_id = o.id
           WHERE o.user_id = ? ORDER BY o.placed_at DESC`,
      isAdmin ? [] : [userId]
    );

    res.json(
      (Array.isArray(rows) ? rows : []).map((row) => ({
        id: Number(row.id),
        user_id: Number(row.user_id),
        order_status: row.order_status,
        grand_total: Number(Number(row.grand_total || 0).toFixed(2)),
        invoice_id: row.invoice_id !== undefined && row.invoice_id !== null ? Number(row.invoice_id) : null,
        invoice_number: row.invoice_number || null,
        placed_at: row.placed_at,
      }))
    );
  } catch (err) {
    console.error('List V2 Customer Orders Error:', err);
    if (err instanceof Error && err.message.includes('Invalid authenticated user')) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

router.get('/orders/:id', verifyAuthToken, async (req, res) => {
  console.log(`GET /api/v2/basket/orders/${req.params.id}`);

  const connection = await db.getConnection();

  try {
    const userId = getUserId(req);
    const isAdmin = isAdminUser(req);
    const orderId = Number(req.params.id);

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id, user_id, order_status, subtotal, discount_total, tax_total, grand_total, placed_at
       FROM orders_v2 WHERE id = ? LIMIT 1`,
      [orderId]
    );

    const order = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (!isAdmin && Number(order.user_id) !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({
      id: Number(order.id),
      user_id: Number(order.user_id),
      order_status: order.order_status,
      grand_total: Number(Number(order.grand_total || 0).toFixed(2)),
      placed_at: order.placed_at,
    });
  } catch (err) {
    console.error('Get V2 Order Error:', err);
    if (err instanceof Error && err.message.includes('Invalid authenticated user')) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

router.get('/invoices/:id', verifyAuthToken, async (req, res) => {
  console.log(`GET /api/v2/basket/invoices/${req.params.id}`);

  const connection = await db.getConnection();

  try {
    const userId = getUserId(req);
    const isAdmin = isAdminUser(req);
    const invoiceId = Number(req.params.id);

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT i.id, i.order_id, i.invoice_number, i.invoice_status, i.total_due, i.issued_at, o.user_id,
              ii.id AS invoice_item_id, ii.description, ii.quantity, ii.unit_price, ii.line_total
       FROM invoices_v2 i
       LEFT JOIN orders_v2 o ON o.id = i.order_id
       LEFT JOIN invoice_items_v2 ii ON ii.invoice_id = i.id
       WHERE i.id = ?
       ORDER BY ii.id ASC`,
      [invoiceId]
    );

    const invoice = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (!isAdmin && Number(invoice.user_id) !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const items = (Array.isArray(rows) ? rows : []).map((row) => ({
      id: row.invoice_item_id !== undefined && row.invoice_item_id !== null ? Number(row.invoice_item_id) : null,
      description: row.description,
      quantity: Number(row.quantity || 0),
      unit_price: Number(Number(row.unit_price || 0).toFixed(2)),
      line_total: Number(Number(row.line_total || 0).toFixed(2)),
    })).filter((item) => item.id !== null);

    res.json({
      id: Number(invoice.id),
      order_id: Number(invoice.order_id),
      invoice_number: invoice.invoice_number,
      invoice_status: invoice.invoice_status,
      total_due: Number(Number(invoice.total_due || 0).toFixed(2)),
      issued_at: invoice.issued_at,
      user_id: Number(invoice.user_id),
      items,
    });
  } catch (err) {
    console.error('Get V2 Invoice Error:', err);
    if (err instanceof Error && err.message.includes('Invalid authenticated user')) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

router.put('/invoices/:id', verifyAuthToken, requireRole('admin'), async (req, res) => {
  console.log(`PUT /api/v2/basket/invoices/${req.params.id}`);

  const connection = await db.getConnection();

  try {
    const invoiceId = Number(req.params.id);
    const status = String(req.body.invoice_status || '').trim();
    const allowedStatuses = new Set(['unpaid', 'paid', 'void']);
    const orderStatusMap: Record<string, string> = {
      unpaid: 'placed',
      paid: 'fulfilled',
      void: 'cancelled',
    };

    if (!status) {
      res.status(400).json({ error: 'Missing invoice_status' });
      return;
    }

    if (!allowedStatuses.has(status)) {
      res.status(400).json({ error: 'Invalid invoice_status' });
      return;
    }

    const [invoiceRows] = await connection.query<RowDataPacket[]>(
      `SELECT order_id FROM invoices_v2 WHERE id = ? LIMIT 1`,
      [invoiceId]
    );

    const invoice = Array.isArray(invoiceRows) && invoiceRows.length > 0 ? invoiceRows[0] : null;
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const orderId = Number(invoice.order_id);

    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE invoices_v2 SET invoice_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, invoiceId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    await connection.query<ResultSetHeader>(
      `UPDATE orders_v2 SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [orderStatusMap[status], orderId]
    );

    const actorUser = getRequestUser(req);
    const actorUserId =
      actorUser && typeof actorUser === 'object' && 'id' in actorUser
        ? Number(actorUser.id)
        : null;
    const actorRole =
      actorUser && typeof actorUser === 'object' && 'type' in actorUser
        ? String(actorUser.type)
        : null;

    await insertAuditEvent(connection, {
      actorUserId,
      actorRole,
      actionType: 'UPDATE',
      resourceType: 'invoices_v2',
      resourceId: invoiceId,
      sourceEndpoint: `PUT /api/v2/basket/invoices/${invoiceId}`,
      oldValuesJson: null,
      newValuesJson: {
        invoice_id: invoiceId,
        order_id: orderId,
        invoice_status: status,
        order_status: orderStatusMap[status],
      },
    });

    res.json({ message: 'Invoice updated', affectedRows: result.affectedRows });
  } catch (err) {
    console.error('Update V2 Invoice Error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

router.post('/items', verifyAuthToken, async (req, res) => {
  console.log('POST /api/v2/basket/items');

  const connection = await db.getConnection();

  try {
    const userId = getUserId(req);
    const productId = Number(req.body.product_id);
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new Error('Invalid product_id');
    }

    const quantity = parseQuantity(req.body.quantity ?? 1, 'quantity');
    const unitPrice = parsePrice(req.body.unit_price ?? req.body.price ?? 0, 'unit_price');

    const basketId = await ensureActiveBasket(connection, userId);
    const [existingRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, quantity, unit_price_snapshot FROM basket_items_v2 WHERE basket_id = ? AND product_id = ? LIMIT 1`,
      [basketId, productId]
    );

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      const existingItem = existingRows[0];
      const nextQuantity = Number(existingItem.quantity) + quantity;

      await connection.query(
        `UPDATE basket_items_v2 SET quantity = ?, unit_price_snapshot = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [nextQuantity, unitPrice, existingItem.id]
      );

      res.status(200).json({
        message: 'Basket item updated',
        basket_id: basketId,
        product_id: productId,
        quantity: nextQuantity,
      });
      return;
    }

    const [insertResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO basket_items_v2 (basket_id, product_id, quantity, unit_price_snapshot)
       VALUES (?, ?, ?, ?)`,
      [basketId, productId, quantity, unitPrice]
    );

    res.status(201).json({
      message: 'Basket item added',
      basket_id: basketId,
      id: insertResult.insertId,
      product_id: productId,
      quantity,
      unit_price: unitPrice,
    });
  } catch (err) {
    console.error('Add V2 Basket Item Error:', err);
    if (err instanceof Error && err.message.includes('Invalid authenticated user')) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (err instanceof Error && err.message.startsWith('Invalid ')) {
      res.status(400).json({ error: err.message });
      return;
    }

    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

router.put('/items/:productId', verifyAuthToken, async (req, res) => {
  console.log(`PUT /api/v2/basket/items/${req.params.productId}`);

  const connection = await db.getConnection();

  try {
    const userId = getUserId(req);
    const basketId = await ensureActiveBasket(connection, userId);
    const productId = Number(req.params.productId);
    const quantity = parseQuantity(req.body.quantity ?? 0, 'quantity');

    if (quantity <= 0) {
      await connection.query(
        `DELETE FROM basket_items_v2 WHERE basket_id = ? AND product_id = ?`,
        [basketId, productId]
      );

      res.status(200).json({ message: 'Basket item removed', basket_id: basketId, product_id: productId });
      return;
    }

    await connection.query(
      `UPDATE basket_items_v2 SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE basket_id = ? AND product_id = ?`,
      [quantity, basketId, productId]
    );

    res.status(200).json({
      message: 'Basket item updated',
      basket_id: basketId,
      product_id: productId,
      quantity,
    });
  } catch (err) {
    console.error('Update V2 Basket Item Error:', err);
    if (err instanceof Error && err.message.includes('Invalid authenticated user')) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (err instanceof Error && err.message.startsWith('Invalid ')) {
      res.status(400).json({ error: err.message });
      return;
    }

    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

router.delete('/items/:productId', verifyAuthToken, async (req, res) => {
  console.log(`DELETE /api/v2/basket/items/${req.params.productId}`);

  const connection = await db.getConnection();

  try {
    const userId = getUserId(req);
    const basketId = await ensureActiveBasket(connection, userId);
    const productId = Number(req.params.productId);

    const [result] = await connection.query<ResultSetHeader>(
      `DELETE FROM basket_items_v2 WHERE basket_id = ? AND product_id = ?`,
      [basketId, productId]
    );

    res.status(200).json({
      message: 'Basket item removed',
      basket_id: basketId,
      product_id: productId,
      affectedRows: result.affectedRows,
    });
  } catch (err) {
    console.error('Remove V2 Basket Item Error:', err);
    if (err instanceof Error && err.message.includes('Invalid authenticated user')) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

router.post('/checkout', verifyAuthToken, async (req, res) => {
  console.log('POST /api/v2/basket/checkout');

  const connection = await db.getConnection();

  try {
    const userId = getUserId(req);
    await connection.beginTransaction();

    const basketId = await ensureActiveBasket(connection, userId);
    const items = await readBasketItems(connection, basketId);

    if (items.length === 0) {
      throw new Error('Basket is empty');
    }

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unit_price_snapshot),
      0
    );
    const taxTotal = toCurrency(subtotal * 0.2);
    const grandTotal = toCurrency(subtotal + taxTotal);

    const [orderResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO orders_v2 (user_id, basket_id, subtotal, discount_total, tax_total, grand_total, order_status)
       VALUES (?, ?, ?, 0.00, ?, ?, 'placed')`,
      [userId, basketId, toCurrency(subtotal), taxTotal, grandTotal]
    );

    const orderId = orderResult.insertId;
    const invoiceNumber = `INV-${Date.now()}-${orderId}`;

    for (const item of items) {
      const lineTotal = toCurrency(Number(item.quantity) * Number(item.unit_price_snapshot));
      await connection.query(
        `INSERT INTO order_items_v2 (order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.product_name ?? `Product ${item.product_id}`,
          item.unit_price_snapshot,
          item.quantity,
          lineTotal,
        ]
      );
    }

    const [invoiceResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO invoices_v2 (order_id, invoice_number, invoice_status, due_at, total_due)
       VALUES (?, ?, 'unpaid', DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 14 DAY), ?)`,
      [orderId, invoiceNumber, grandTotal]
    );

    const invoiceId = invoiceResult.insertId;

    for (const item of items) {
      const unitPrice = Number(item.unit_price_snapshot);
      const lineTotal = toCurrency(Number(item.quantity) * unitPrice);
      await connection.query(
        `INSERT INTO invoice_items_v2 (invoice_id, order_item_id, description, quantity, unit_price, line_total)
         VALUES (?, NULL, ?, ?, ?, ?)`,
        [
          invoiceId,
          item.product_name ?? `Product ${item.product_id}`,
          item.quantity,
          unitPrice,
          lineTotal,
        ]
      );
    }

    await connection.query(
      `UPDATE baskets_v2 SET status = 'checked_out', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [basketId]
    );

    const actorUser = getRequestUser(req);
    const actorUserId =
      actorUser && typeof actorUser === 'object' && 'id' in actorUser
        ? Number(actorUser.id)
        : null;
    const actorRole =
      actorUser && typeof actorUser === 'object' && 'type' in actorUser
        ? String(actorUser.type)
        : null;

    await insertAuditEvent(connection, {
      actorUserId,
      actorRole,
      actionType: 'CREATE',
      resourceType: 'orders_v2',
      resourceId: orderId,
      sourceEndpoint: 'POST /api/v2/basket/checkout',
      oldValuesJson: null,
      newValuesJson: {
        order_id: orderId,
        basket_id: basketId,
        user_id: userId,
        invoice_id: invoiceId,
        total_due: grandTotal,
        order_status: 'placed',
      },
    });

    await connection.commit();

    res.status(201).json({
      message: 'Checkout complete',
      basket_id: basketId,
      order_id: orderId,
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      total_due: grandTotal,
    });
  } catch (err) {
    await connection.rollback();

    console.error('V2 Basket Checkout Error:', err);

    if (err instanceof Error && err.message.includes('Invalid authenticated user')) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (err instanceof Error && err.message === 'Basket is empty') {
      res.status(400).json({ error: 'Basket is empty' });
      return;
    }

    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

export default router;
