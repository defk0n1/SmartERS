import { addAmbulance, queryAmbulances, updateAmbulance } from "../services/arcgisFeatureService.js";
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
