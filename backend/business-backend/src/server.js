import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initRealtime } from "./socket/realtime.js";

connectDB();

const PORT = process.env.PORT || 5000;

// Create HTTP server for both Express and Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO real-time service
initRealtime(server);

server.listen(PORT, () => {
    console.log(`SmartERS Business Backend running on port ${PORT}`);
    console.log(`Socket.IO ready for real-time connections`);
});