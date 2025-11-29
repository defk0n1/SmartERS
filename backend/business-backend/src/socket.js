// backend/business-backend/src/socket.js
import { Server } from "socket.io";

let io;

/**
 * Initialize Socket.io server
 * @param {Object} server - HTTP server instance
 */
export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log(`✅ Client connected: ${socket.id}`);

        // Handle ambulance joining their room
        socket.on("ambulance:join", (ambulanceId) => {
            socket.join(`ambulance:${ambulanceId}`);
            console.log(`🚑 Ambulance ${ambulanceId} joined room`);
        });

        // Handle operator/admin joining dashboard
        socket.on("dashboard:join", () => {
            socket.join("dashboard");
            console.log(`📊 Dashboard client joined: ${socket.id}`);
        });

        // Receive location updates from ambulance drivers
        socket.on("ambulance:location:update", (data) => {
            const { ambulanceId, location, status } = data;

            console.log(`📍 Location update from ambulance ${ambulanceId}:`, location);

            // Broadcast to all dashboard clients
            io.to("dashboard").emit("ambulance:location:updated", {
                ambulanceId,
                location,
                status,
                timestamp: new Date()
            });
        });

        // Handle status changes (available, en-route, busy)
        socket.on("ambulance:status:change", (data) => {
            const { ambulanceId, status } = data;

            console.log(`🔄 Status change for ambulance ${ambulanceId}: ${status}`);

            // Broadcast to dashboard
            io.to("dashboard").emit("ambulance:status:changed", {
                ambulanceId,
                status,
                timestamp: new Date()
            });
        });

        // Handle new incident reports
        socket.on("incident:new", (incidentData) => {
            console.log(`🚨 New incident reported:`, incidentData);

            // Broadcast to all dashboard clients
            io.to("dashboard").emit("incident:created", {
                ...incidentData,
                timestamp: new Date()
            });
        });

        // Handle incident assignment to ambulance
        socket.on("incident:assign", (data) => {
            const { incidentId, ambulanceId } = data;

            console.log(`📌 Incident ${incidentId} assigned to ambulance ${ambulanceId}`);

            // Notify specific ambulance
            io.to(`ambulance:${ambulanceId}`).emit("incident:assigned", {
                incidentId,
                timestamp: new Date()
            });

            // Notify dashboard
            io.to("dashboard").emit("incident:assignment:updated", {
                incidentId,
                ambulanceId,
                timestamp: new Date()
            });
        });

        // Handle incident completion
        socket.on("incident:complete", (data) => {
            const { incidentId, ambulanceId } = data;

            console.log(`✅ Incident ${incidentId} completed by ambulance ${ambulanceId}`);

            // Broadcast to dashboard
            io.to("dashboard").emit("incident:completed", {
                incidentId,
                ambulanceId,
                timestamp: new Date()
            });
        });

        // Handle disconnection
        socket.on("disconnect", () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

/**
 * Get Socket.io instance
 * @returns {Object} Socket.io server instance
 */
export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

/**
 * Emit event to specific room
 * @param {string} room - Room name
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
export const emitToRoom = (room, event, data) => {
    if (io) {
        io.to(room).emit(event, data);
    }
};

/**
 * Emit event to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
export const emitToAll = (event, data) => {
    if (io) {
        io.emit(event, data);
    }
};