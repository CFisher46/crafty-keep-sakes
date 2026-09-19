import express from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../../../ts-common/database';
import { Product } from '../../../../ts-common/product-types';
import {
  buildProductV2UpdateQuery,
  updateProductV2Query,
} from './sql';
import {
  DELETE_PRODUCT_CATEGORY_LINKS_QUERY,
  INSERT_PRODUCT_CATEGORY_LINK_QUERY,
  RESOLVE_PRODUCT_ID_QUERY,
  SELECT_CATEGORY_ID_BY_SLUG_QUERY,
  UPSERT_CATEGORY_QUERY,
} from '../shared/sql';
import {
  verifyAuthToken,
  requireRole,
  getRequestUser,
} from '../../../../ts-common/middleware';
import { insertAuditEvent } from '../../audit-events';
import {
  toNumber,
  toInteger,
  toBoolean,
  slugify,
  parseCategories,
} from '../../../../ts-common/validators';

const router = express.Router();

const resolveProductId = async (
  connection: Awaited<ReturnType<typeof db.getConnection>>,
  idOrSku: string
): Promise<number | null> => {
  const [rows] = await connection.query<RowDataPacket[]>(
    RESOLVE_PRODUCT_ID_QUERY,
    [idOrSku, idOrSku]
  );

  return rows[0]?.id ? Number(rows[0].id) : null;
};

router.put('/:id', verifyAuthToken, requireRole('admin'), async (req, res) => {
  console.log(`PUT /api/v2/products/${req.params.id}`);

  const idOrSku = String(req.params.id || '').trim();
  const updates = req.body as Partial<Product>;

  const connection = await db.getConnection();

  try {
    const { fields, values } = buildProductV2UpdateQuery(
      updates,
      toNumber,
      toInteger,
      toBoolean
    );

    const hasCategoryUpdate = updates.category !== undefined;

    if (!fields.length && !hasCategoryUpdate) {
      res.status(400).json({ error: 'No mutable fields to update' });
      return;
    }

    await connection.beginTransaction();

    const productId = await resolveProductId(connection, idOrSku);

    if (!productId) {
      await connection.rollback();
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const [existingProductRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, product_name, description, price, quantity, on_sale, is_live, sale_percent
       FROM products_v2
       WHERE id = ?
       LIMIT 1`,
      [productId]
    );

    const previousProduct = existingProductRows[0] ?? null;

    let affectedRows = 0;

    if (fields.length) {
      const query = updateProductV2Query(fields, productId, values);
      const [result] = await connection.query<ResultSetHeader>(
        query.sql,
        query.values
      );

      affectedRows = result.affectedRows;
    } else {
      affectedRows = 1;
    }

    if (hasCategoryUpdate) {
      const categories = parseCategories(String(updates.category ?? ''));

      await connection.query(DELETE_PRODUCT_CATEGORY_LINKS_QUERY, [productId]);

      for (const categoryName of categories) {
        const slug = slugify(categoryName) || 'uncategorized';

        await connection.query(UPSERT_CATEGORY_QUERY, [categoryName, slug]);

        const [categoryRows] = await connection.query<RowDataPacket[]>(
          SELECT_CATEGORY_ID_BY_SLUG_QUERY,
          [slug]
        );

        const categoryId = categoryRows[0]?.id;
        if (!categoryId) {
          throw new Error('Failed to resolve category id');
        }

        await connection.query(INSERT_PRODUCT_CATEGORY_LINK_QUERY, [productId, categoryId]);
      }
    }

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
      resourceType: 'products_v2',
      resourceId: productId,
      sourceEndpoint: `PUT /api/v2/products/${idOrSku}`,
      oldValuesJson: previousProduct
        ? {
            id: Number(previousProduct.id),
            product_name: previousProduct.product_name ?? null,
            description: previousProduct.description ?? null,
            price: previousProduct.price ?? null,
            quantity: previousProduct.quantity ?? null,
            on_sale: previousProduct.on_sale ?? null,
            is_live: previousProduct.is_live ?? null,
            sale_percent: previousProduct.sale_percent ?? null,
          }
        : null,
      newValuesJson: {
        id: productId,
        ...updates,
      },
    });

    await connection.commit();

    res.status(200).json({
      message: 'Product updated',
      affectedRows,
    });
  } catch (err) {
    await connection.rollback();

    if (err instanceof Error && err.message.startsWith('Invalid ')) {
      res.status(400).json({ error: err.message });
      return;
    }

    console.error('Update V2 Product Error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    connection.release();
  }
});

export default router;