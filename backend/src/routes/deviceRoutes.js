import { Router } from "express";
import {
  listDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  toggleDevice,
  createDeviceSchema,
  updateDeviceSchema,
} from "../controllers/deviceController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.use(authenticate);

router.get("/", listDevices);
router.get("/:id", getDevice);
router.post("/", authorize("admin"), validate(createDeviceSchema), createDevice);
router.patch("/:id", authorize("admin"), validate(updateDeviceSchema), updateDevice);
router.delete("/:id", authorize("admin"), deleteDevice);
router.post("/:id/toggle", toggleDevice);

export default router;
