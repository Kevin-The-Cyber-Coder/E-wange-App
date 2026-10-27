import { Router } from "express";
import {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  updateUserSchema,
} from "../controllers/userController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/", listUsers);
router.get("/:id", getUser);
router.patch("/:id", validate(updateUserSchema), updateUser);
router.delete("/:id", deleteUser);

export default router;
