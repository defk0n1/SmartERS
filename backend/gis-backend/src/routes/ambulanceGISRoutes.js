import express from "express";
import { 
    createAmbulance, 
    getAmbulances, 
    updateAmbulances,
    findNearestAmbulances,
    getRouteToIncident
} from "../controllers/ambulanceGISController.js";

const router = express.Router();

// CRUD operations
router.post("/", createAmbulance);
router.get("/", getAmbulances);
router.put("/", updateAmbulances);

// Spatial queries
router.get("/nearest", findNearestAmbulances);
router.post("/route-to-incident", getRouteToIncident);

export default router;
