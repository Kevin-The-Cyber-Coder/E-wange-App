import { Router } from "express";
import {
  createReading,
  listReadings,
  latestReading,
  createReadingSchema,
} from "../controllers/sensorController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/latest", authenticate, latestReading);
router.get("/", authenticate, listReadings);
router.post("/", validate(createReadingSchema), createReading);

export default router;
