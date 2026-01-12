import Ambulance from "../models/Ambulance.js";
import User from "../models/User.js";
import gisService from "../services/gisService.js";
import { emitAmbulanceUpdate } from "../socket/realtime.js";

// ==================== GIS SERVICE INTEGRATION ====================

/**
 * Sync ambulance location with GIS backend for real-time tracking
 */
const syncLocationWithGIS = async (ambulanceId, location) => {
    try {
        const result = await gisService.syncAmbulanceLocation(ambulanceId, location);
        if (result) {
            console.log(`[GIS] Ambulance ${ambulanceId} location synced`);
        }
    } catch (error) {
        // Don't fail main operation if GIS sync fails
        console.error(`[GIS] Failed to sync ambulance ${ambulanceId} location:`, error.message);
    }
};

/**
 * Sync full ambulance data with GIS backend
 */
const syncAmbulanceWithGIS = async (ambulance) => {
    try {
        const result = await gisService.syncAmbulance(ambulance);
        if (result) {
            console.log(`[GIS] Ambulance ${ambulance._id} fully synced`);
        }
    } catch (error) {
        console.error(`[GIS] Failed to sync ambulance ${ambulance._id}:`, error.message);
    }
};

/**
 * Get real-time locations of all ambulances from GIS backend
 */
const getRealTimeLocations = async () => {
    try {
        const health = await gisService.healthCheck();
        if (!health.available) {
            console.warn("[GIS] GIS service unavailable for real-time locations");
            return null;
        }
        // Real-time locations come from WebSocket, not REST
        // This function checks if GIS service is available
        return { available: true };
    } catch (error) {
        console.error("[GIS] Get real-time locations error:", error.message);
        return null;
    }
};

// ==================== CONTROLLER FUNCTIONS ====================

/**
 * Get all ambulances with filtering
 * Access: Admin, Operator, Driver (limited view)
 */
const getAllAmbulances = async (req, res) => {
    try {
        const { status, hasDriver, page = 1, limit = 50 } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (hasDriver === "true") filter.driver = { $ne: null };
        if (hasDriver === "false") filter.driver = null;

        const ambulances = await Ambulance.find(filter)
            .populate("driver", "name email role")
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ status: 1, plateNumber: 1 });

        const total = await Ambulance.countDocuments(filter);

        // Get real-time locations from GIS (placeholder)
        const realTimeLocations = await getRealTimeLocations();
        
        res.status(200).json({
            ambulances,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total,
            realTimeLocationsAvailable: !!realTimeLocations
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Get available ambulances only
 * Access: Admin, Operator (for dispatch)
 */
const getAvailableAmbulances = async (req, res) => {
    try {
        const ambulances = await Ambulance.find({ status: "available" })
            .populate("driver", "name email")
            .sort({ plateNumber: 1 });

        res.status(200).json({ ambulances });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Get ambulance assigned to the current driver
 * Access: Driver (own ambulance)
 */
const getMyAmbulance = async (req, res) => {
    try {
        const driverId = req.user.id;
        
        const ambulance = await Ambulance.findOne({ driver: driverId })
            .populate("driver", "name email role");

        if (!ambulance) {
            return res.status(404).json({ message: "No ambulance assigned to you" });
        }

        res.status(200).json(ambulance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Get a single ambulance by ID
 */
const getAmbulanceById = async (req, res) => {
    try {
        const ambulance = await Ambulance.findById(req.params.id)
            .populate("driver", "name email role");

        if (!ambulance) {
            return res.status(404).json({ message: "Ambulance not found" });
        }

        res.status(200).json(ambulance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Create a new ambulance
 * Access: Admin only
 */
const createAmbulance = async (req, res) => {
    try {
        const { plateNumber, driver, status, location } = req.body;

        // Validate plate number
        if (!plateNumber) {
            return res.status(400).json({ message: "Plate number is required" });
        }

        // Check for duplicate plate number
        const existing = await Ambulance.findOne({ plateNumber });
        if (existing) {
            return res.status(400).json({ message: "Plate number already exists" });
        }

        // Validate driver if provided
        if (driver) {
            const driverUser = await User.findById(driver);
            if (!driverUser) {
                return res.status(400).json({ message: "Driver not found" });
            }
            if (driverUser.role !== "driver") {
                return res.status(400).json({ message: "User is not a driver" });
            }
            // Check if driver is already assigned
            const existingAssignment = await Ambulance.findOne({ driver });
            if (existingAssignment) {
                return res.status(400).json({ message: "Driver already assigned to another ambulance" });
            }
        }

        const ambulance = new Ambulance({
            plateNumber,
            driver: driver || null,
            status: status || "available",
            location: location || { type: "Point", coordinates: [0, 0] }
        });

        await ambulance.save();

        // Update driver's assignedAmbulance field
        if (driver) {
            await User.findByIdAndUpdate(driver, { assignedAmbulance: ambulance._id });
        }

        await ambulance.populate("driver", "name email role");

        // Sync to GIS backend (non-blocking)
        syncAmbulanceWithGIS(ambulance);

        // Emit real-time update
        emitAmbulanceUpdate(ambulance);

        res.status(201).json(ambulance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Update ambulance info
 * Access: Admin (all fields), Operator (status, location), Driver (own ambulance status/location)
 */
const updateAmbulance = async (req, res) => {
    try {
        const { plateNumber, driver, status, location } = req.body;
        const ambulanceId = req.params.id;

        const ambulance = await Ambulance.findById(ambulanceId);
        if (!ambulance) {
            return res.status(404).json({ message: "Ambulance not found" });
        }

        // Check driver permission - drivers can only update their own ambulance
        if (req.user.role === "driver") {
            if (ambulance.driver?.toString() !== req.user.id) {
                return res.status(403).json({ message: "Not your ambulance" });
            }
            // Drivers can only update status and location
            if (status) ambulance.status = status;
            if (location) {
                ambulance.location = location;
                await syncLocationWithGIS(ambulanceId, location);
            }
        } else {
            // Admin/Operator can update everything
            if (plateNumber) {
                const existing = await Ambulance.findOne({ 
                    plateNumber, 
                    _id: { $ne: ambulanceId } 
                });
                if (existing) {
                    return res.status(400).json({ message: "Plate number already exists" });
                }
                ambulance.plateNumber = plateNumber;
            }

            if (driver !== undefined) {
                // Remove old driver assignment
                if (ambulance.driver) {
                    await User.findByIdAndUpdate(ambulance.driver, { assignedAmbulance: null });
                }

                if (driver) {
                    const driverUser = await User.findById(driver);
                    if (!driverUser || driverUser.role !== "driver") {
                        return res.status(400).json({ message: "Invalid driver" });
                    }
                    // Check if driver is already assigned elsewhere
                    const existingAssignment = await Ambulance.findOne({ 
                        driver, 
                        _id: { $ne: ambulanceId } 
                    });
                    if (existingAssignment) {
                        return res.status(400).json({ message: "Driver already assigned to another ambulance" });
                    }
                    ambulance.driver = driver;
                    await User.findByIdAndUpdate(driver, { assignedAmbulance: ambulance._id });
                } else {
                    ambulance.driver = null;
                }
            }

            if (status) ambulance.status = status;
            if (location) {
                ambulance.location = location;
                await syncLocationWithGIS(ambulanceId, location);
            }
        }

        await ambulance.save();
        await ambulance.populate("driver", "name email role");

        // Sync full ambulance data to GIS if status changed
        if (status) {
            syncAmbulanceWithGIS(ambulance);
        }

        // Emit real-time update
        emitAmbulanceUpdate(ambulance);

        res.status(200).json(ambulance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Update ambulance location (convenience endpoint for drivers)
 * Access: Driver (own ambulance), Admin
 */
const updateAmbulanceLocation = async (req, res) => {
    try {
        const { coordinates } = req.body;
        const ambulanceId = req.params.id;

        if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
            return res.status(400).json({ message: "Valid coordinates [longitude, latitude] required" });
        }

        const ambulance = await Ambulance.findById(ambulanceId);
        if (!ambulance) {
            return res.status(404).json({ message: "Ambulance not found" });
        }

        // Verify ownership for drivers
        if (req.user.role === "driver" && ambulance.driver?.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not your ambulance" });
        }

        ambulance.location = {
            type: "Point",
            coordinates
        };
        await ambulance.save();

        // Sync with GIS backend
        await syncLocationWithGIS(ambulanceId, ambulance.location);

        // Emit real-time location update
        emitAmbulanceUpdate(ambulance);

        res.status(200).json({ 
            message: "Location updated",
            location: ambulance.location 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Delete ambulance
 * Access: Admin only
 */
const deleteAmbulance = async (req, res) => {
    try {
        const ambulance = await Ambulance.findById(req.params.id);
        if (!ambulance) {
            return res.status(404).json({ message: "Ambulance not found" });
        }

        // Don't allow deletion if ambulance is en-route or busy
        if (ambulance.status !== "available") {
            return res.status(400).json({ 
                message: "Cannot delete ambulance that is not available. Please wait until current assignment is completed." 
            });
        }

        // Remove driver assignment
        if (ambulance.driver) {
            await User.findByIdAndUpdate(ambulance.driver, { assignedAmbulance: null });
        }

        await Ambulance.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Ambulance deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

export {
    getAllAmbulances,
    getAvailableAmbulances,
    getMyAmbulance,
    getAmbulanceById,
    createAmbulance,
    updateAmbulance,
    updateAmbulanceLocation,
    deleteAmbulance,
};