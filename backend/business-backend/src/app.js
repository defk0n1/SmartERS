import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import incidentRoutes from "./routes/incidentRoutes.js";
import ambulanceRoutes from "./routes/ambulanceRoutes.js";

const app = express();

// Middlewares
const allowedOrigins = ["http://localhost:5500"]; // the origin of your HTML interface
app.use(cors({
    origin: allowedOrigins,
    credentials: true // VERY IMPORTANT for cookies
}));
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

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