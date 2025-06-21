import express from "express";
import getAllUsers from "../users/get/handler";
import getUserById from "../users/get-by-id/handler";
import createUser from "../users/create/handler";
import updateUser from "../users/update/handler";
import deleteUser from "../users/delete/handler";

const router = express.Router();

router.use("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
