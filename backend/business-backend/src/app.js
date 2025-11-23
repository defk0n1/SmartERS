import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/authRoutes.js";
import incidentRoutes from "./routes/incidentRoutes.js";
import ambulanceRoutes from "./routes/ambulanceRoutes.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/ambulances", ambulanceRoutes);

// Root Route
app.get("/", (req, res) => {
    res.send("SmartERS Business Backend API is running...")
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("ERROR:", err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export default app;