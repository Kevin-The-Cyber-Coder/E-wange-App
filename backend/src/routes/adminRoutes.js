import { Router } from "express";
import { overview, timeseries } from "../controllers/adminController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/overview", overview);
router.get("/timeseries", timeseries);

export default router;
