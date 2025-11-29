import { addIncident, queryIncidents, updateIncident } from "../services/arcgisFeatureService.js";
import { getIO } from "../socket/realtime.js";

export async function createIncident(req, res) {
    try {
        const feature = {
            attributes: req.body.attributes,
            geometry: req.body.geometry
        };

        const result = await addIncident(feature);

        // Emit real-time update
        getIO().emit("incidentUpdate", feature);

        res.json(result);
    } catch (error) {
        console.error("Create incident error:", error);
        res.status(500).json({ error: error.message });
    }
}

export async function getIncidents(req, res) {
    try {
        const features = await queryIncidents();
        res.json(features);
    } catch (err) {
        console.error("Get incident error:", err);
        res.status(500).json({ error: err.message });
    }
}

export async function updateIncidents(req, res) {
    try {
        const features = req.body.features; // array of { attributes, geometry }
        const result = await updateIncident(features);

        // Emit real-time update
        getIO().emit("incidentUpdate", features);

        res.json(result);
    } catch (err) {
        console.error("Update incident error:", err);
        res.status(500).json({ error: err.message });
    }
}