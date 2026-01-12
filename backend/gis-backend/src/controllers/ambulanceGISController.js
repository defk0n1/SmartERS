import { addAmbulance, queryAmbulances, updateAmbulance } from "../services/arcgisFeatureService.js";
import routingService from "../services/routingService.js";
import { getIO } from "../socket/realtime.js";
import { sortByDistance, estimateTravelTime } from "../services/spatialService.js";

export async function createAmbulance(req, res) {
  try {
    const feature = {
      attributes: req.body.attributes,
      geometry: req.body.geometry
    };

    const result = await addAmbulance(feature);

    // Emit real-time update
    getIO().emit("ambulanceUpdate", feature);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAmbulances(req, res) {
  try {
    const features = await queryAmbulances();
    res.json(features);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateAmbulances(req, res) {
  try {
    const features = req.body.features; // array of { attributes, geometry }
    const result = await updateAmbulance(features);

    // Emit real-time update
    getIO().emit("ambulanceUpdate", features);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function startAmbulanceSimulation(req, res) {
  try {
    const { ambulanceId, start, end, speed } = req.body;

    const routeResult = await routingService.getOptimalRoute(start, end);

    if (!routeResult.route) {
      return res.status(400).json({ error: "Unable to compute route" });
    }

    const path = routeResult.route.geometry.paths[0].map(([longitude, latitude]) => ({ latitude, longitude }));

    AmbulanceSimulationService.setAmbulances([{ id: ambulanceId, route: path }]);
    AmbulanceSimulationService.start(speed || 1);

    res.json({ message: "Simulation started", routeLength: path.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// Stop simulation
export function stopAmbulanceSimulation(req, res) {
    AmbulanceSimulationService.stop();
    res.json({ message: "Simulation stopped" });
}

/**
 * Find nearest available ambulances to a given incident location
 * GET /ambulances/nearest?latitude=X&longitude=Y&limit=5&status=available
 */
export async function findNearestAmbulances(req, res) {
    try {
        const { latitude, longitude, limit = 5, status = "available", includeRoute = false } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: "Latitude and longitude are required"
            });
        }

        const targetLocation = {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
        };

        // Query ambulances from ArcGIS Feature Service
        // Filter by status if provided
        const whereClause = status ? `status='${status}'` : "1=1";
        const ambulances = await queryAmbulances(whereClause);

        if (!ambulances || ambulances.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: "No ambulances found matching criteria"
            });
        }

        // Sort by distance and limit results
        const sortedAmbulances = sortByDistance(ambulances, targetLocation)
            .slice(0, parseInt(limit));

        // Add estimated travel time for each ambulance
        const ambulancesWithETA = sortedAmbulances.map(amb => ({
            ...amb,
            estimatedTimeMinutes: estimateTravelTime(amb.distance)
        }));

        // Optionally calculate actual routes for top ambulances
        if (includeRoute === "true" && ambulancesWithETA.length > 0) {
            const topAmbulance = ambulancesWithETA[0];
            try {
                const routeResult = await routingService.getOptimalRoute(
                    { latitude: topAmbulance.geometry.y, longitude: topAmbulance.geometry.x },
                    targetLocation
                );
                if (routeResult.route) {
                    ambulancesWithETA[0].route = routeResult.route;
                    ambulancesWithETA[0].actualTimeMinutes = routeResult.totalTime;
                    ambulancesWithETA[0].actualDistanceMiles = routeResult.totalDistance;
                }
            } catch (routeError) {
                console.warn("Could not calculate route:", routeError.message);
            }
        }

        res.json({
            success: true,
            data: ambulancesWithETA,
            meta: {
                total: ambulancesWithETA.length,
                searchLocation: targetLocation,
                statusFilter: status
            }
        });
    } catch (err) {
        console.error("Find nearest ambulances error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
}

/**
 * Get route from ambulance to incident
 * POST /ambulances/route-to-incident
 */
export async function getRouteToIncident(req, res) {
    try {
        const { ambulanceId, incidentLocation } = req.body;

        if (!incidentLocation?.latitude || !incidentLocation?.longitude) {
            return res.status(400).json({
                success: false,
                error: "Incident location (latitude, longitude) is required"
            });
        }

        // Get ambulance location
        let ambulanceLocation;

        if (ambulanceId) {
            // Query specific ambulance from ArcGIS
            const ambulances = await queryAmbulances(`businessId='${ambulanceId}'`);
            if (ambulances && ambulances.length > 0) {
                ambulanceLocation = {
                    latitude: ambulances[0].geometry.y,
                    longitude: ambulances[0].geometry.x
                };
            }
        }

        if (!ambulanceLocation) {
            // Use provided ambulance location from request body
            ambulanceLocation = req.body.ambulanceLocation;
        }

        if (!ambulanceLocation) {
            return res.status(400).json({
                success: false,
                error: "Ambulance location required (provide ambulanceId or ambulanceLocation)"
            });
        }

        const routeResult = await routingService.getOptimalRoute(ambulanceLocation, incidentLocation);

        if (!routeResult.route) {
            return res.status(400).json({
                success: false,
                error: "Unable to calculate route"
            });
        }

        res.json({
            success: true,
            data: {
                route: routeResult.route,
                directions: routeResult.directions,
                totalDistanceMiles: routeResult.totalDistance,
                totalTimeMinutes: routeResult.totalTime
            }
        });
    } catch (err) {
        console.error("Route to incident error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
}
