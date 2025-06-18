import express from "express";
import { db } from "../../../ts-common/database";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

router.post("/", async (req, res) => {
  const {
    email,
    first_name,
    last_name,
    address_line1,
    address_line2,
    address_line3,
    town,
    county,
    postcode,
    telephone_number,
    type = "Customer",
    status,
    invoice_id,
    password
  } = req.body;
  const id = uuidv4();

  try {
    const sql = `
      INSERT INTO users (id,
      email,
      first_name,
      last_name,
      address_line1,
      address_line2,
      address_line3,
      town,
      county,
      postcode,
      telephone_number,
      type,
      status,
      invoice_id,
      password)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 1)
    `;
    const values = [
      id,
      email,
      first_name,
      last_name,
      address_line1,
      address_line2,
      address_line3,
      town,
      county,
      postcode,
      telephone_number,
      type,
      status,
      invoice_id,
      password
    ];

    await db.query(sql, values);

    res.status(201).json({ message: "User created", id });
  } catch (err) {
    console.error("Create User Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
