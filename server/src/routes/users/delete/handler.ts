import express, { Request, Response } from "express";
import { db } from "../../../ts-common/database";
import { DeleteUserQuery } from "./sql";
import {
  verifyAuthToken,
  requireRole,
  getRequestUser,
} from "../../../ts-common/middleware";
import { insertAuditEvent } from '../../v2/audit-events';

const router = express.Router();

router.delete(
  "/:id",
  verifyAuthToken,
  requireRole("admin"),
  async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const [result] = await db.query(DeleteUserQuery(id));

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
      actionType: 'DELETE',
      resourceType: 'users_legacy',
      resourceId: id,
      sourceEndpoint: `DELETE /api/users/${id}`,
      oldValuesJson: { id },
      newValuesJson: null,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
