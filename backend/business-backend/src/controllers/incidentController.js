import Incident from "../models/Incident.js";
import Ambulance from "../models/Ambulance.js";
import gisService from "../services/gisService.js";
import { emitIncidentUpdate, emitDispatchNotification } from "../socket/realtime.js";

// ==================== GIS SERVICE INTEGRATION ====================

/**
 * Geocode incident location using GIS backend
 * Converts address to coordinates or validates existing coordinates
 */
const geocodeLocation = async (location) => {
    // If location already has valid coordinates, return as-is
    if (location?.coordinates && 
        Array.isArray(location.coordinates) && 
        location.coordinates.length === 2 &&
        location.coordinates[0] !== 0 && 
        location.coordinates[1] !== 0) {
        console.log(`[GIS] Using existing coordinates: ${JSON.stringify(location.coordinates)}`);
        return location;
    }

    // If address is provided, geocode it
    if (location?.address) {
        try {
            const geoResult = await gisService.geocodeAddress(location.address);
            if (geoResult) {
                console.log(`[GIS] Geocoded address "${location.address}" to: ${geoResult.latitude}, ${geoResult.longitude}`);
                return {
                    type: "Point",
                    coordinates: [geoResult.longitude, geoResult.latitude],
                    address: location.address
                };
            }
        } catch (error) {
            console.warn(`[GIS] Geocoding failed for "${location.address}":`, error.message);
        }
    }

    console.warn(`[GIS] Could not geocode location, returning as-is`);
    return location;
};

/**
 * Find nearest available ambulance using GIS backend spatial query
 */
const findNearestAmbulance = async (incidentLocation) => {
    try {
        const coords = gisService.geoJSONToCoords(incidentLocation);
        if (!coords) {
            console.warn("[GIS] Invalid incident location for nearest ambulance search");
            return null;
        }

        const nearestAmbulances = await gisService.findNearestAmbulances(coords, {
            limit: 1,
            status: "available",
            includeRoute: true
        });

        if (nearestAmbulances && nearestAmbulances.length > 0) {
            const gisAmbulance = nearestAmbulances[0];
            
            // Find corresponding MongoDB ambulance using businessId or plateNumber
            if (gisAmbulance.attributes?.businessId) {
                const ambulance = await Ambulance.findById(gisAmbulance.attributes.businessId);
                if (ambulance) {
                    console.log(`[GIS] Found nearest ambulance: ${ambulance.plateNumber} (${gisAmbulance.distance}km away)`);
                    return {
                        ambulance,
                        distance: gisAmbulance.distance,
                        estimatedTime: gisAmbulance.estimatedTimeMinutes,
                        route: gisAmbulance.route
                    };
                }
            }

            // Fallback: find by plate number
            if (gisAmbulance.attributes?.plateNumber) {
                const ambulance = await Ambulance.findOne({ 
                    plateNumber: gisAmbulance.attributes.plateNumber,
                    status: "available"
                });
                if (ambulance) {
                    console.log(`[GIS] Found nearest ambulance by plate: ${ambulance.plateNumber}`);
                    return {
                        ambulance,
                        distance: gisAmbulance.distance,
                        estimatedTime: gisAmbulance.estimatedTimeMinutes,
                        route: gisAmbulance.route
                    };
                }
            }
        }

        console.log("[GIS] No nearest ambulance found via GIS");
        return null;
    } catch (error) {
        console.error("[GIS] Find nearest ambulance error:", error.message);
        return null;
    }
};

/**
 * Notify GIS backend about new/updated incident for real-time visualization
 */
const notifyGISNewIncident = async (incident) => {
    try {
        const result = await gisService.syncIncident(incident);
        if (result) {
            console.log(`[GIS] Incident ${incident._id} synced to GIS backend`);
        }
    } catch (error) {
        // Don't fail the main operation if GIS sync fails
        console.error(`[GIS] Failed to sync incident ${incident._id}:`, error.message);
    }
};

// ==================== CONTROLLER FUNCTIONS ====================

/**
 * Get all incidents with filtering and pagination
 * Access: Admin, Operator
 */
const getAllIncidents = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status, 
            severity, 
            startDate, 
            endDate 
        } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (severity) filter.severity = severity;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const incidents = await Incident.find(filter)
            .populate("reportedBy", "name email role")
            .populate("assignedAmbulance", "plateNumber status driver")
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await Incident.countDocuments(filter);

        res.status(200).json({
            incidents,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Get incidents assigned to a specific driver's ambulance
 * Access: Driver (own), Admin
 */
const getDriverIncidents = async (req, res) => {
    try {
        const driverId = req.params.driverId || req.user.id;
        
        // Find ambulance assigned to this driver
        const ambulance = await Ambulance.findOne({ driver: driverId });
        if (!ambulance) {
            return res.status(200).json({ incidents: [] });
        }

        const includeCompleted = req.query.includeCompleted === 'true';
        const statusFilter = includeCompleted ? {} : { status: { $ne: "completed" } };

        const incidents = await Incident.find({ 
            assignedAmbulance: ambulance._id,
            ...statusFilter
        })
        .populate("reportedBy", "name email")
        .sort({ severity: -1, createdAt: -1 }); // Critical first

        res.status(200).json({ incidents });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Get single incident by ID
 */
const getIncidentById = async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id)
            .populate("reportedBy", "name email role")
            .populate({
                path: "assignedAmbulance",
                populate: { path: "driver", select: "name email" }
            });

        if (!incident) {
            return res.status(404).json({ message: "Incident not found" });
        }

        res.status(200).json(incident);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Create new incident
 * Access: Authenticated users (operator reports on behalf of caller)
 */
const createIncident = async (req, res) => {
    try {
        const { type, location, severity, description, reportedBy } = req.body;

        // Validate required fields
        if (!description || !location?.coordinates) {
            return res.status(400).json({ message: "Description and location are required" });
        }

        // Geocode/validate location (GIS placeholder)
        const validatedLocation = await geocodeLocation(location);

        const incident = new Incident({
            type,
            location: validatedLocation,
            severity: severity || "medium",
            description,
            reportedBy: reportedBy || req.user?.id,
            status: "pending"
        });

        await incident.save();

        // Notify GIS backend for hotspot analysis (placeholder)
        await notifyGISNewIncident(incident);

        // Populate for response
        await incident.populate("reportedBy", "name email role");

        // Emit real-time event to connected clients
        emitIncidentUpdate(incident);

        res.status(201).json(incident);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Update incident
 * Access: Admin, Operator
 */
const updateIncident = async (req, res) => {
    try {
        const { status, severity, description, assignedAmbulance } = req.body;
        const incidentId = req.params.id;

        const incident = await Incident.findById(incidentId);
        if (!incident) {
            return res.status(404).json({ message: "Incident not found" });
        }

        // Update fields
        if (description) incident.description = description;
        if (severity) incident.severity = severity;
        if (status) incident.status = status;

        // Handle ambulance assignment
        if (assignedAmbulance && assignedAmbulance !== incident.assignedAmbulance?.toString()) {
            // Verify ambulance exists and is available
            const ambulance = await Ambulance.findById(assignedAmbulance);
            if (!ambulance) {
                return res.status(400).json({ message: "Ambulance not found" });
            }
            if (ambulance.status !== "available") {
                return res.status(400).json({ message: "Ambulance is not available" });
            }

            // Update ambulance status
            ambulance.status = "en-route";
            await ambulance.save();

            incident.assignedAmbulance = assignedAmbulance;
            incident.status = "assigned";
        }

        // If completed, free up the ambulance
        if (status === "completed" && incident.assignedAmbulance) {
            const ambulance = await Ambulance.findById(incident.assignedAmbulance);
            if (ambulance) {
                ambulance.status = "available";
                await ambulance.save();
            }
        }

        await incident.save();
        await incident.populate("reportedBy", "name email role");
        await incident.populate("assignedAmbulance", "plateNumber status driver");

        // Emit real-time update
        emitIncidentUpdate(incident);

        res.status(200).json(incident);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Dispatch ambulance to incident (convenience endpoint)
 * Access: Admin, Operator
 */
const dispatchAmbulance = async (req, res) => {
    try {
        const { incidentId, ambulanceId, autoSelect } = req.body;

        const incident = await Incident.findById(incidentId);
        if (!incident) {
            return res.status(404).json({ message: "Incident not found" });
        }

        if (incident.status !== "pending") {
            return res.status(400).json({ message: "Incident is not pending" });
        }

        let selectedAmbulanceId = ambulanceId;

        // Auto-select nearest ambulance if requested (GIS placeholder)
        if (autoSelect) {
            const nearestAmb = await findNearestAmbulance(incident.location);
            if (nearestAmb && nearestAmb.ambulance?._id) {
                selectedAmbulanceId = nearestAmb.ambulance._id;
            } else {
                // Fallback: find any available ambulance
                const availableAmbulance = await Ambulance.findOne({ status: "available" });
                if (!availableAmbulance) {
                    return res.status(400).json({ message: "No ambulances available" });
                }
                selectedAmbulanceId = availableAmbulance._id;
            }
        }

        if (!selectedAmbulanceId) {
            return res.status(400).json({ message: "Ambulance ID required" });
        }

        const ambulance = await Ambulance.findById(selectedAmbulanceId);
        if (!ambulance) {
            return res.status(404).json({ message: "Ambulance not found" });
        }
        if (ambulance.status !== "available") {
            return res.status(400).json({ message: "Ambulance is not available" });
        }

        // Update ambulance and incident
        ambulance.status = "en-route";
        await ambulance.save();

        incident.assignedAmbulance = ambulance._id;
        incident.status = "assigned";
        await incident.save();

        await incident.populate("assignedAmbulance", "plateNumber status driver");
        await incident.populate("reportedBy", "name email");

        // Emit real-time dispatch notification
        emitDispatchNotification(incident, ambulance);
        emitIncidentUpdate(incident);

        // Sync to GIS backend
        await notifyGISNewIncident(incident);

        res.status(200).json({
            message: "Ambulance dispatched successfully",
            incident
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Delete incident
 * Access: Admin only
 */
const deleteIncident = async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id);
        if (!incident) {
            return res.status(404).json({ message: "Incident not found" });
        }

        // Free up assigned ambulance if any
        if (incident.assignedAmbulance) {
            const ambulance = await Ambulance.findById(incident.assignedAmbulance);
            if (ambulance && ambulance.status !== "available") {
                ambulance.status = "available";
                await ambulance.save();
            }
        }

        await Incident.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Incident deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

export {
    getAllIncidents,
    getDriverIncidents,
    getIncidentById,
    createIncident,
    updateIncident,
    dispatchAmbulance,
    deleteIncident,
};
