import { Router } from "express";
import { listConfig, upsertConfig, updateConfigSchema } from "../controllers/configController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authenticate);

router.get("/", listConfig);
router.put("/:key", authorize("admin"), validate(updateConfigSchema), upsertConfig);

export default router;
