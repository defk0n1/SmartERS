import { addAmbulance, queryAmbulances, updateAmbulance } from "../services/arcgisFeatureService.js";
import routingService from "../services/routingService.js";
import { getIO } from "../socket/realtime.js";

export async function createAmbulance(req, res) {
  try {
    const feature = {
      attributes: req.body.attributes,
      geometry: req.body.geometry
    };

    const result = await addAmbulance(feature);

    // Emit real-time update
    getIO().emit("ambulanceUpdate", feature);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAmbulances(req, res) {
  try {
    const features = await queryAmbulances();
    res.json(features);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateAmbulances(req, res) {
  try {
    const features = req.body.features; // array of { attributes, geometry }
    const result = await updateAmbulance(features);

    // Emit real-time update
    getIO().emit("ambulanceUpdate", features);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function startAmbulanceSimulation(req, res) {
  try {
    const { ambulanceId, start, end, speed } = req.body;

    const routeResult = await routingService.getOptimalRoute(start, end);

    if (!routeResult.route) {
      return res.status(400).json({ error: "Unable to compute route" });
    }

    const path = routeResult.route.geometry.paths[0].map(([longitude, latitude]) => ({ latitude, longitude }));

    AmbulanceSimulationService.setAmbulances([{ id: ambulanceId, route: path }]);
    AmbulanceSimulationService.start(speed || 1);

    res.json({ message: "Simulation started", routeLength: path.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// Stop simulation
export function stopAmbulanceSimulation(req, res) {
    AmbulanceSimulationService.stop();
    res.json({ message: "Simulation stopped" });
}
