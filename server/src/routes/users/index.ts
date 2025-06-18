import express from "express";
import getAllUsers from "./get/handler";
import getUserById from "./get-by-id/handler";
import createUser from "./create/handler";
import { updateUser } from "./update/handler";
import { deleteUser } from "./delete/handler";

const router = express.Router();

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
