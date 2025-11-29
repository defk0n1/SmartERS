// backend/business-backend/src/controllers/ambulanceController.js
import Ambulance from "../models/Ambulance.js";
import {
    notifyAmbulanceLocationUpdate,
    notifyAmbulanceStatusChange
} from "../utils/socketEvents.js";

// Get all ambulances
const getAllAmbulances = async (req, res) => {
    try {
        const ambulances = await Ambulance.find().populate("driver", "name email role");
        res.status(200).json(ambulances);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get a single ambulance
const getAmbulanceById = async (req, res) => {
    try {
        const ambulance = await Ambulance.findById(req.params.id).populate("driver", "name email role");
        if (!ambulance) return res.status(404).json({ message: "Ambulance not found" });
        res.status(200).json(ambulance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Create a new ambulance
const createAmbulance = async (req, res) => {
    try {
        const { plateNumber, driver, status, location } = req.body;

        const ambulance = new Ambulance({
            plateNumber,
            driver,
            status,
            location,
        });

        await ambulance.save();

        // Notify all dashboard clients about new ambulance
        notifyAmbulanceStatusChange(ambulance._id, ambulance.status);

        res.status(201).json(ambulance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update ambulance info
const updateAmbulance = async (req, res) => {
    try {
        const { status, location } = req.body;

        const ambulance = await Ambulance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!ambulance) return res.status(404).json({ message: "Ambulance not found" });

        // Emit real-time updates
        if (status) {
            notifyAmbulanceStatusChange(ambulance._id, status);
        }

        if (location) {
            notifyAmbulanceLocationUpdate(ambulance._id, location, ambulance.status);
        }

        res.status(200).json(ambulance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update ambulance location (real-time tracking endpoint)
const updateAmbulanceLocation = async (req, res) => {
    try {
        const { location } = req.body;

        if (!location || !location.coordinates || location.coordinates.length !== 2) {
            return res.status(400).json({ message: "Invalid location format" });
        }

        const ambulance = await Ambulance.findByIdAndUpdate(
            req.params.id,
            {
                location: {
                    type: "Point",
                    coordinates: location.coordinates
                }
            },
            { new: true }
        );

        if (!ambulance) return res.status(404).json({ message: "Ambulance not found" });

        // Emit real-time location update
        notifyAmbulanceLocationUpdate(ambulance._id, ambulance.location, ambulance.status);

        res.status(200).json({
            message: "Location updated",
            ambulance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete ambulance
const deleteAmbulance = async (req, res) => {
    try {
        const ambulance = await Ambulance.findByIdAndDelete(req.params.id);
        if (!ambulance) return res.status(404).json({ message: "Ambulance not found" });
        res.status(200).json({ message: "Ambulance deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

export {
    getAllAmbulances,
    getAmbulanceById,
    createAmbulance,
    updateAmbulance,
    updateAmbulanceLocation,
    deleteAmbulance,
};