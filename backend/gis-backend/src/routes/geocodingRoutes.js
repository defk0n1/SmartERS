import express from "express";
import { geocodeAddress, reverseGeocode } from "../controllers/geocodingController.js";

const router = express.Router();

/**
 * POST /api/gis/geocode
 * Body: { address: "123 Main St, City" }
 * Returns: { success: true, data: { latitude, longitude, score } }
 */
router.post("/geocode", geocodeAddress);

/**
 * POST /api/gis/reverse-geocode
 * Body: { latitude: 36.8065, longitude: 10.1815 }
 * Returns: { success: true, data: { Match_addr, ... } }
 */
router.post("/reverse-geocode", reverseGeocode);

export default router;
