import express from "express";
import { db } from "../../../ts-common/database";
import { Product } from "../types";
import { updateProductQuery } from "./sql";
import { ResultSetHeader } from "mysql2";
import {
  verifyAuthToken,
  requireRole,
  getRequestUser,
} from "../../../ts-common/middleware";
import { insertAuditEvent } from '../../v2/audit-events';

const router = express.Router();

router.put("/:id", verifyAuthToken, requireRole("admin"), async (req, res) => {
  const id = req.params.id;
  const product = req.body as Product;

  try {
    const { sql, values } = updateProductQuery(id, product);
    const [result] = await db.query<ResultSetHeader>(sql, values);

    const actorUser = getRequestUser(req);
    const actorUserId =
      actorUser && typeof actorUser === 'object' && 'id' in actorUser
        ? Number(actorUser.id)
        : null;
    const actorRole =
      actorUser && typeof actorUser === 'object' && 'type' in actorUser
        ? String(actorUser.type)
        : null;

    await insertAuditEvent(null, {
      actorUserId,
      actorRole,
      actionType: 'UPDATE',
      resourceType: 'products_legacy',
      resourceId: id,
      sourceEndpoint: `PUT /api/products/${id}`,
      oldValuesJson: null,
      newValuesJson: {
        ...product,
        id,
      },
    });

    res.status(200).json({
      message: "Product updated",
      affectedRows: result.affectedRows
    });
  } catch (err) {
    console.error("Update Product Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
