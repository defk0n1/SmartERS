// backend/business-backend/src/utils/socketEvents.js
import { getIO } from "../socket.js";

/**
 * Notify dashboard about ambulance location update
 */
export const notifyAmbulanceLocationUpdate = (ambulanceId, location, status) => {
    try {
        const io = getIO();
        io.to("dashboard").emit("ambulance:location:updated", {
            ambulanceId,
            location,
            status,
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Socket emit error:", error.message);
    }
};

/**
 * Notify dashboard about ambulance status change
 */
export const notifyAmbulanceStatusChange = (ambulanceId, status) => {
    try {
        const io = getIO();
        io.to("dashboard").emit("ambulance:status:changed", {
            ambulanceId,
            status,
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Socket emit error:", error.message);
    }
};

/**
 * Notify about new incident
 */
export const notifyNewIncident = (incident) => {
    try {
        const io = getIO();
        io.to("dashboard").emit("incident:created", {
            ...incident.toObject(),
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Socket emit error:", error.message);
    }
};

/**
 * Notify ambulance about assignment
 */
export const notifyAmbulanceAssignment = (ambulanceId, incidentId, incidentData) => {
    try {
        const io = getIO();

        // Notify specific ambulance
        io.to(`ambulance:${ambulanceId}`).emit("incident:assigned", {
            incidentId,
            incidentData,
            timestamp: new Date()
        });

        // Notify dashboard
        io.to("dashboard").emit("incident:assignment:updated", {
            incidentId,
            ambulanceId,
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Socket emit error:", error.message);
    }
};

/**
 * Notify about incident update
 */
export const notifyIncidentUpdate = (incidentId, updates) => {
    try {
        const io = getIO();
        io.to("dashboard").emit("incident:updated", {
            incidentId,
            updates,
            timestamp: new Date()
        });
    } catch (error) {
        console.error("Socket emit error:", error.message);
    }
};