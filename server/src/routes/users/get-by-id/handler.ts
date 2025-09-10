import express, { Request, Response } from "express";
import { db } from "../../../ts-common/database";
import { GetSpecificUsersQuery } from "./sql";
import { decrypt } from "../../../ts-common/helpers";

const router = express.Router();

router.get("/:id", async (req: Request, res: Response) => {
  console.log("GET /api/users/{user_id} called");
  const { id } = req.params;
  try {
    const [rows]: any[] = await db.query(GetSpecificUsersQuery(id));
    const queryResult = rows[0]?.result;

    if (queryResult) {
      const parsedResult = JSON.parse(queryResult); // Parse the outer JSON string
      const userData = JSON.parse(parsedResult.data); // Parse the `data` field

      const user = userData[0]; // Assuming you're dealing with a single user

      if (user) {
        user.first_name = decrypt(user.first_name);
        user.last_name = decrypt(user.last_name);
        user.address_line1 = decrypt(user.address_line1);
        user.address_line2 = decrypt(user.address_line2);
        user.address_line3 = decrypt(user.address_line3);
        user.telephone_number = decrypt(user.telephone_number);

        console.log("Decrypted user:", user);
        return res.json(user); // Send the decrypted user as the response
      } else {
        console.error("No user data found in the query result.");
        return res.status(404).json({ error: "User not found" });
      }
    } else {
      console.error("Query result is empty or undefined.");
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
