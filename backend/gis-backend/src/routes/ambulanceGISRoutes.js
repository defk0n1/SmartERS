import express from "express";
import { createAmbulance, getAmbulances, updateAmbulances } from "../controllers/ambulanceGISController.js";

const router = express.Router();

router.post("/", createAmbulance);
router.get("/", getAmbulances);
router.put("/", updateAmbulances);

export default router;
