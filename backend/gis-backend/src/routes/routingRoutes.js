import express from "express";
import { getRoute } from "../controllers/routingController.js";

const router = express.Router();

// POST /api/gis/route
// Body: { start: { longitude, latitude }, end: { longitude, latitude } }
router.post("/getRoute", getRoute);

export default router;