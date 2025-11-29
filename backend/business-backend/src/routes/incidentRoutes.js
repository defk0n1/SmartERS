// backend/business-backend/src/routes/incidentRoutes.js
import express from "express";
import {
    getAllIncidents,
    getIncidentById,
    createIncident,
    assignAmbulance,
    updateIncident,
    completeIncident,
    deleteIncident,
} from "../controllers/incidentController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all incidents (operator only)
router.get("/", auth(["operator"]), getAllIncidents);

// Get single incident
router.get("/:id", auth(["operator"]), getIncidentById);

// Create new incident
router.post("/", createIncident);

// Assign ambulance to incident (operator only)
router.post("/:id/assign", auth(["operator"]), assignAmbulance);

// Complete incident (operator or driver)
router.patch("/:id/complete", auth(["operator", "driver"]), completeIncident);

// Update incident (operator only)
router.put("/:id", auth(["operator"]), updateIncident);

// Delete incident (operator only)
router.delete("/:id", auth(["operator"]), deleteIncident);

export default router;