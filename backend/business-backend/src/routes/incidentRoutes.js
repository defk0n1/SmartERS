import express from "express";
import {
    getAllIncidents,
    getIncidentById,
    createIncident,
    updateIncident,
    deleteIncident,
} from "../controllers/incidentController.js";

const router = express.Router();

router.get("/", getAllIncidents);
router.get("/:id", getIncidentById);
router.post("/", createIncident);
router.put("/:id", updateIncident);
router.delete("/:id", deleteIncident);

export default router;
