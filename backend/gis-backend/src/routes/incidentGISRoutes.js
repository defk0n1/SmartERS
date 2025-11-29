import express from "express";
import { createIncident, getIncidents, updateIncidents } from "../controllers/incidentGISController.js";

const router = express.Router();

router.post("/", createIncident);
router.get("/", getIncidents);
router.put("/", updateIncidents);

export default router;
