import express from "express";
import cors from "cors";
import incidentsGISRoutes from "./routes/incidentGISRoutes.js";
import ambulanceGISRoutes from "./routes/ambulanceGISRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/incidents", incidentsGISRoutes);
app.use("/ambulances", ambulanceGISRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "GIS backend running" });
});

export default app;