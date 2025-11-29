// backend/business-backend/src/server.js
import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initializeSocket } from "./socket.js";

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);
console.log("🔌 Socket.io initialized");

// Start server
server.listen(PORT, () => {
    console.log(`🚀 SmartERS Business Backend running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
        console.log("HTTP server closed");
    });
});