/**
 * Real-time WebSocket Service for Business Backend
 * Handles Socket.IO connections with frontend clients and bridges to GIS backend
 */

import { Server } from "socket.io";
import { io as ioClient } from "socket.io-client";
import { GIS_CONFIG } from "../config/gis.js";

let io = null;
let gisSocket = null;

/**
 * Initialize Socket.IO server and GIS backend connection
 * @param {http.Server} server - HTTP server instance
 */
export function initRealtime(server) {
    // Initialize Socket.IO server for frontend clients
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "*",
            methods: ["GET", "POST"],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Connect to GIS backend Socket.IO as a client
    connectToGISBackend();

    // Handle frontend client connections
    io.on("connection", (socket) => {
        console.log(`[Socket.IO] Frontend client connected: ${socket.id}`);

        // Join room based on user role (if authenticated)
        socket.on("join:role", (role) => {
            socket.join(`role:${role}`);
            console.log(`[Socket.IO] Client ${socket.id} joined role:${role}`);
        });

        // Join room for specific incident updates
        socket.on("join:incident", (incidentId) => {
            socket.join(`incident:${incidentId}`);
            console.log(`[Socket.IO] Client ${socket.id} watching incident:${incidentId}`);
        });

        // Join room for specific ambulance updates
        socket.on("join:ambulance", (ambulanceId) => {
            socket.join(`ambulance:${ambulanceId}`);
            console.log(`[Socket.IO] Client ${socket.id} watching ambulance:${ambulanceId}`);
        });

        // Driver sends location update
        socket.on("driver:locationUpdate", (data) => {
            handleDriverLocationUpdate(socket, data);
        });

        // Operator/Admin dispatches ambulance
        socket.on("dispatch:ambulance", (data) => {
            handleDispatchEvent(socket, data);
        });

        // Leave rooms
        socket.on("leave:incident", (incidentId) => {
            socket.leave(`incident:${incidentId}`);
        });

        socket.on("leave:ambulance", (ambulanceId) => {
            socket.leave(`ambulance:${ambulanceId}`);
        });

        socket.on("disconnect", (reason) => {
            console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
        });

        socket.on("error", (error) => {
            console.error(`[Socket.IO] Client error: ${socket.id}`, error);
        });
    });

    console.log("[Socket.IO] Business backend real-time server initialized");
}

/**
 * Connect to GIS backend as Socket.IO client to receive real-time GIS updates
 */
function connectToGISBackend() {
    const gisUrl = GIS_CONFIG.baseUrl;

    try {
        gisSocket = ioClient(gisUrl, {
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000
        });

        gisSocket.on("connect", () => {
            console.log(`[GIS Socket] Connected to GIS backend: ${gisSocket.id}`);
        });

        // Forward ambulance updates from GIS to frontend clients
        gisSocket.on("ambulanceUpdate", (data) => {
            console.log("[GIS Socket] Received ambulanceUpdate:", data.id || data.plateNumber);
            // Broadcast to all connected frontend clients
            if (io) {
                io.emit("ambulance:locationUpdate", data);
                // Also emit to specific ambulance room
                if (data.id) {
                    io.to(`ambulance:${data.id}`).emit("ambulance:update", data);
                }
            }
        });

        // Forward incident updates from GIS to frontend clients
        gisSocket.on("incidentUpdate", (data) => {
            console.log("[GIS Socket] Received incidentUpdate");
            if (io) {
                io.emit("incident:update", data);
                // Also emit to specific incident room if ID available
                if (data.attributes?.businessId) {
                    io.to(`incident:${data.attributes.businessId}`).emit("incident:update", data);
                }
            }
        });

        gisSocket.on("disconnect", (reason) => {
            console.log(`[GIS Socket] Disconnected from GIS backend: ${reason}`);
        });

        gisSocket.on("connect_error", (error) => {
            console.warn(`[GIS Socket] Connection error: ${error.message}`);
        });

        gisSocket.on("reconnect", (attemptNumber) => {
            console.log(`[GIS Socket] Reconnected to GIS backend after ${attemptNumber} attempts`);
        });

    } catch (error) {
        console.error("[GIS Socket] Failed to connect to GIS backend:", error.message);
    }
}

/**
 * Handle driver location updates from mobile app
 */
function handleDriverLocationUpdate(socket, data) {
    const { ambulanceId, location, driverId } = data;

    if (!ambulanceId || !location) {
        socket.emit("error", { message: "ambulanceId and location required" });
        return;
    }

    console.log(`[Socket.IO] Driver location update: ambulance ${ambulanceId}`);

    // Forward to GIS backend for processing
    if (gisSocket && gisSocket.connected) {
        gisSocket.emit("ambulanceLocationUpdate", {
            id: ambulanceId,
            position: {
                latitude: location.latitude || location.coordinates?.[1],
                longitude: location.longitude || location.coordinates?.[0]
            },
            driverId,
            timestamp: new Date().toISOString()
        });
    }

    // Also broadcast to frontend clients watching this ambulance
    if (io) {
        io.to(`ambulance:${ambulanceId}`).emit("ambulance:locationUpdate", {
            ambulanceId,
            location,
            timestamp: new Date().toISOString()
        });

        // Broadcast to operators/admins
        io.to("role:admin").to("role:operator").emit("ambulance:locationUpdate", {
            ambulanceId,
            location,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Handle dispatch events
 */
function handleDispatchEvent(socket, data) {
    const { incidentId, ambulanceId, action } = data;

    console.log(`[Socket.IO] Dispatch event: ${action} - ambulance ${ambulanceId} to incident ${incidentId}`);

    // Broadcast dispatch to relevant parties
    if (io) {
        // Notify the incident room
        io.to(`incident:${incidentId}`).emit("incident:dispatch", {
            incidentId,
            ambulanceId,
            action,
            timestamp: new Date().toISOString()
        });

        // Notify the ambulance/driver
        io.to(`ambulance:${ambulanceId}`).emit("ambulance:dispatched", {
            incidentId,
            ambulanceId,
            action,
            timestamp: new Date().toISOString()
        });

        // Notify all operators/admins
        io.to("role:admin").to("role:operator").emit("dispatch:update", {
            incidentId,
            ambulanceId,
            action,
            timestamp: new Date().toISOString()
        });
    }
}

// ==================== PUBLIC API ====================

/**
 * Get Socket.IO server instance
 */
export function getIO() {
    if (!io) throw new Error("Socket.IO not initialized");
    return io;
}

/**
 * Get GIS backend socket client
 */
export function getGISSocket() {
    return gisSocket;
}

/**
 * Emit event to all connected clients
 */
export function broadcast(event, data) {
    if (io) {
        io.emit(event, data);
    }
}

/**
 * Emit event to specific room
 */
export function emitToRoom(room, event, data) {
    if (io) {
        io.to(room).emit(event, data);
    }
}

/**
 * Emit incident update to relevant clients
 */
export function emitIncidentUpdate(incident) {
    if (!io) return;

    const payload = {
        id: incident._id,
        status: incident.status,
        severity: incident.severity,
        assignedAmbulance: incident.assignedAmbulance,
        location: incident.location,
        updatedAt: incident.updatedAt || new Date().toISOString()
    };

    // Emit to incident-specific room
    io.to(`incident:${incident._id}`).emit("incident:update", payload);

    // Emit to operators and admins
    io.to("role:admin").to("role:operator").emit("incident:update", payload);

    // If ambulance assigned, notify the driver
    if (incident.assignedAmbulance) {
        io.to(`ambulance:${incident.assignedAmbulance}`).emit("incident:assigned", payload);
    }
}

/**
 * Emit ambulance update to relevant clients
 */
export function emitAmbulanceUpdate(ambulance) {
    if (!io) return;

    const payload = {
        id: ambulance._id,
        plateNumber: ambulance.plateNumber,
        status: ambulance.status,
        location: ambulance.location,
        driver: ambulance.driver,
        updatedAt: ambulance.updatedAt || new Date().toISOString()
    };

    // Emit to ambulance-specific room
    io.to(`ambulance:${ambulance._id}`).emit("ambulance:update", payload);

    // Emit to operators and admins
    io.to("role:admin").to("role:operator").emit("ambulance:update", payload);
}

/**
 * Emit dispatch notification
 */
export function emitDispatchNotification(incident, ambulance) {
    if (!io) return;

    const payload = {
        incidentId: incident._id,
        incidentDescription: incident.description,
        incidentLocation: incident.location,
        incidentSeverity: incident.severity,
        ambulanceId: ambulance._id,
        ambulancePlate: ambulance.plateNumber,
        driverId: ambulance.driver,
        dispatchedAt: new Date().toISOString()
    };

    // Notify the driver
    io.to(`ambulance:${ambulance._id}`).emit("dispatch:new", payload);

    // Notify operators/admins
    io.to("role:admin").to("role:operator").emit("dispatch:created", payload);
}

/**
 * Close all socket connections
 */
export function closeConnections() {
    if (gisSocket) {
        gisSocket.disconnect();
        gisSocket = null;
    }
    if (io) {
        io.close();
        io = null;
    }
}
