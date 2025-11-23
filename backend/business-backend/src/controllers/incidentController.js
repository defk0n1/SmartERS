import Incident from "../models/Incident.js";

// Get all incidents
const getAllIncidents = async (req, res) => {
    try {
        const incidents = await Incident.find().populate("reportedBy", "name email role");
        res.status(200).json(incidents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get single incident
const getIncidentById = async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id).populate("reportedBy", "name email role");
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
        res.status(201).json(incident);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update incident
const updateIncident = async (req, res) => {
    try {
        const incident = await Incident.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!incident) return res.status(404).json({ message: "Incident not found" });
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
    updateIncident,
    deleteIncident,
};
