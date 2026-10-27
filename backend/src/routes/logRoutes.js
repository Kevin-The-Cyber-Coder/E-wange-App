import { Router } from "express";
import { listLogs, createLog, createLogSchema } from "../controllers/logController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", authenticate, listLogs);
router.post("/", validate(createLogSchema), createLog);

export default router;
