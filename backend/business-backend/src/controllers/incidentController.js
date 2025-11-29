// backend/business-backend/src/controllers/incidentController.js
import Incident from "../models/Incident.js";
import Ambulance from "../models/Ambulance.js";
import {
    notifyNewIncident,
    notifyIncidentUpdate,
    notifyAmbulanceAssignment,
    notifyAmbulanceStatusChange
} from "../utils/socketEvents.js";

// Get all incidents
const getAllIncidents = async (req, res) => {
    try {
        const incidents = await Incident.find()
            .populate("reportedBy", "name email role")
            .populate("assignedAmbulance", "plateNumber status location");
        res.status(200).json(incidents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get single incident
const getIncidentById = async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id)
            .populate("reportedBy", "name email role")
            .populate("assignedAmbulance", "plateNumber status location");
        if (!incident) return res.status(404).json({ message: "Incident not found" });
        res.status(200).json(incident);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Create new incident
const createIncident = async (req, res) => {
    try {
        const { type, location, severity, description, reportedBy } = req.body;

        const incident = new Incident({
            type,
            location,
            severity,
            description,
            reportedBy,
        });

        await incident.save();

        // Populate for socket emission
        await incident.populate("reportedBy", "name email role");

        // Notify all dashboard clients about new incident
        notifyNewIncident(incident);

        res.status(201).json(incident);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Assign ambulance to incident
const assignAmbulance = async (req, res) => {
    try {
        const { ambulanceId } = req.body;
        const incidentId = req.params.id;

        // Find incident
        const incident = await Incident.findById(incidentId);
        if (!incident) return res.status(404).json({ message: "Incident not found" });

        // Find ambulance
        const ambulance = await Ambulance.findById(ambulanceId);
        if (!ambulance) return res.status(404).json({ message: "Ambulance not found" });

        // Check if ambulance is available
        if (ambulance.status !== "available") {
            return res.status(400).json({ message: "Ambulance is not available" });
        }

        // Update incident
        incident.assignedAmbulance = ambulanceId;
        incident.status = "assigned";
        await incident.save();

        // Update ambulance status
        ambulance.status = "en-route";
        await ambulance.save();

        // Populate for response
        await incident.populate("assignedAmbulance", "plateNumber status location");

        // Notify via socket
        notifyAmbulanceAssignment(ambulanceId, incidentId, incident.toObject());
        notifyAmbulanceStatusChange(ambulanceId, "en-route");

        res.status(200).json(incident);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update incident
const updateIncident = async (req, res) => {
    try {
        const incident = await Incident.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate("assignedAmbulance", "plateNumber status location");

        if (!incident) return res.status(404).json({ message: "Incident not found" });

        // Notify about update
        notifyIncidentUpdate(incident._id, req.body);

        res.status(200).json(incident);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Complete incident
const completeIncident = async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id);
        if (!incident) return res.status(404).json({ message: "Incident not found" });

        // Update incident status
        incident.status = "completed";
        await incident.save();

        // If ambulance was assigned, set it back to available
        if (incident.assignedAmbulance) {
            const ambulance = await Ambulance.findById(incident.assignedAmbulance);
            if (ambulance) {
                ambulance.status = "available";
                await ambulance.save();

                // Notify about ambulance availability
                notifyAmbulanceStatusChange(ambulance._id, "available");
            }
        }

        // Notify about incident completion
        notifyIncidentUpdate(incident._id, { status: "completed" });

        res.status(200).json(incident);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete incident
const deleteIncident = async (req, res) => {
    try {
        const incident = await Incident.findByIdAndDelete(req.params.id);
        if (!incident) return res.status(404).json({ message: "Incident not found" });
        res.status(200).json({ message: "Incident deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

export {
    getAllIncidents,
    getIncidentById,
    createIncident,
    assignAmbulance,
    updateIncident,
    completeIncident,
    deleteIncident,
};