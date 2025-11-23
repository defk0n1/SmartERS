import Ambulance from "../models/Ambulance.js";

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
        res.status(201).json(ambulance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update ambulance info
const updateAmbulance = async (req, res) => {
    try {
        const ambulance = await Ambulance.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!ambulance) return res.status(404).json({ message: "Ambulance not found" });
        res.status(200).json(ambulance);
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
    deleteAmbulance,
};