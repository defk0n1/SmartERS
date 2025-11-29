// backend/business-backend/src/routes/ambulanceRoutes.js
import express from "express";
import {
    getAllAmbulances,
    getAmbulanceById,
    createAmbulance,
    updateAmbulance,
    updateAmbulanceLocation,
    deleteAmbulance,
} from "../controllers/ambulanceController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all ambulances
router.get("/", getAllAmbulances);

// Get single ambulance
router.get("/:id", getAmbulanceById);

// Create new ambulance (operator only)
router.post("/", auth(["operator"]), createAmbulance);

// Update ambulance general info (operator only)
router.put("/:id", auth(["operator"]), updateAmbulance);

// Update ambulance location (driver can update their own location)
router.patch("/:id/location", auth(["driver", "operator"]), updateAmbulanceLocation);

// Delete ambulance (operator only)
router.delete("/:id", auth(["operator"]), deleteAmbulance);

export default router;