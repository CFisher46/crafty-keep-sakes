import express, { Request, Response } from "express";
import { db } from "../../../ts-common/database";
import { GetSpecificUsersQuery } from "./sql";
import { decrypt } from "../../../ts-common/helpers";

const router = express.Router();

router.get("/:id", async (req: Request, res: Response) => {
  console.log("GET /api/users/{user_id} called");
  const { id } = req.params;
  try {
    const [rows] = await db.query(GetSpecificUsersQuery(id));
    const user = rows[0];
    // Decrypt the necessary fields
    user.first_name = decrypt(user.first_name);
    user.last_name = decrypt(user.last_name);
    user.address_line1 = decrypt(user.address_line1);
    user.address_line2 = decrypt(user.address_line2);
    user.address_line3 = decrypt(user.address_line3);
    user.telephone_number = decrypt(user.telephone_number);

    res.json(user);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});
export default router;
