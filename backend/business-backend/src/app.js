import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

import authRoutes from "./routes/authRoutes.js";
import incidentRoutes from "./routes/incidentRoutes.js";
import ambulanceRoutes from "./routes/ambulanceRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

// Middlewares
const allowedOrigins = ["http://localhost:5500", "http://localhost:3000"]; // Allow frontend origins
app.use(cors({
    origin: allowedOrigins,
    credentials: true // VERY IMPORTANT for cookies
}));
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

// Swagger API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "SmartERS API Documentation",
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true
    }
}));

// Serve raw OpenAPI JSON spec
app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/ambulances", ambulanceRoutes);
app.use("/api/admin", adminRoutes);

// Root Route
app.get("/", (req, res) => {
    res.send("SmartERS Business Backend API is running. Visit /api-docs for API documentation.")
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