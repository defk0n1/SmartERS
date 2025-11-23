import express from "express";
import {
    getAllIncidents,
    getIncidentById,
    createIncident,
    updateIncident,
    deleteIncident,
} from "../controllers/incidentController.js";

import { auth } from "../middleware/authMiddleware.js";  


const router = express.Router();

router.get("/",  auth(["operator"]), getAllIncidents);    // testing auth middleware, remove after testing and change according to business logic
router.get("/:id", getIncidentById);
router.post("/", createIncident);
router.put("/:id", updateIncident);
router.delete("/:id", deleteIncident);

export default router;
