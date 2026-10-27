import { Router } from "express";
import { chat, chatSchema } from "../controllers/aiController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post("/chat", authenticate, validate(chatSchema), chat);

export default router;
