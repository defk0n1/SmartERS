import express from "express";
import cors from "cors";
import incidentsGISRoutes from "./routes/incidentGISRoutes.js";
import ambulanceGISRoutes from "./routes/ambulanceGISRoutes.js";
import routingRoutes from "./routes/routingRoutes.js";
import ambulanceSimulationRoutes from "./routes/ambulanceSimulationRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/incidents", incidentsGISRoutes);
app.use("/ambulances", ambulanceGISRoutes);
app.use("/api/gis", routingRoutes);
app.use("/gis/ambulance", ambulanceSimulationRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "GIS backend running" });
});

export default app;