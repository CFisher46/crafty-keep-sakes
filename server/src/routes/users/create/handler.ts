import express from "express";
import bcrypt from "bcryptjs";
import { db } from "../../../ts-common/database";
import { User } from "../types";
import { createUserQuery } from "../create/sql";
import { ResultSetHeader } from "mysql2";
import { encrypt } from "../../../ts-common/helpers";

const router = express.Router();

router.post("/", async (req, res) => {
  const user = req.body as User;

  try {
    const encryptedFirstName = encrypt(user.first_name);
    const encryptedLastName = encrypt(user.last_name);
    const encryptedAddressLine1 = encrypt(user.address_line1);
    const encryptedAddressLine2 = encrypt(user.address_line2);
    const encryptedAddressLine3 = encrypt(user.address_line3);
    const encryptedTelephoneNumber = encrypt(user.telephone_number);
    const hashedPassword = await bcrypt.hash(user.password, 10);

    const newUser: User = {
      ...user,
      first_name: encryptedFirstName,
      last_name: encryptedLastName,
      address_line1: encryptedAddressLine1,
      address_line2: encryptedAddressLine2,
      address_line3: encryptedAddressLine3,
      telephone_number: encryptedTelephoneNumber,
      password: hashedPassword
    };

    const { sql, values } = createUserQuery(newUser);
    const [result] = await db.query<ResultSetHeader>(sql, values);
    res.status(201).json({
      message: "User created",
      insertId: result.insertId
    });
  } catch (err) {
    console.error("Create Product Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
