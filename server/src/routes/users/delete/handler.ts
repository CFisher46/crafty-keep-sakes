import express, { Request, Response } from "express";
import { db } from "../../../ts-common/database";
import { DeleteUserQuery } from "./sql";

const router = express.Router();

router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const [result] = await db.query(DeleteUserQuery(id));
    res.status(200).json(result);
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
