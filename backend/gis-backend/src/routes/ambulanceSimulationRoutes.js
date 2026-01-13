import express from "express";
import simulationService from "../services/ambulanceSimulationService.js";

const router = express.Router();

// Start simulation
router.post("/startSimulation", (req, res) => {
  const { ambulances, speed } = req.body;
  simulationService.setAmbulances(ambulances);
  simulationService.start(speed);
  res.json({ success: true });
});

// Stop simulation
router.post("/stopSimulation", (req, res) => {
  simulationService.stop();
  res.json({ success: true });
});

export default router;
