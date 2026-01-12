/**
 * GIS Service Client
 * Handles all communication with the GIS microservice
 */

import { GIS_CONFIG } from "../config/gis.js";

class GISService {
    constructor() {
        this.baseUrl = GIS_CONFIG.baseUrl;
        this.timeout = GIS_CONFIG.timeout;
        this.retryAttempts = GIS_CONFIG.retryAttempts;
        this.retryDelay = GIS_CONFIG.retryDelay;
        this.syncEnabled = GIS_CONFIG.syncEnabled;
    }

    /**
     * Make HTTP request with retry logic
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const fetchOptions = {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            },
            signal: controller.signal
        };

        let lastError;
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, fetchOptions);
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({}));
                    throw new Error(errorBody.error || `HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                lastError = error;
                if (error.name === "AbortError") {
                    lastError = new Error("GIS service request timeout");
                }
                if (attempt < this.retryAttempts) {
                    console.warn(`GIS request attempt ${attempt} failed, retrying...`);
                    await this.sleep(this.retryDelay * attempt);
                }
            }
        }

        throw lastError;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ==================== HEALTH ====================

    /**
     * Check if GIS service is available
     */
    async healthCheck() {
        try {
            const result = await this.request(GIS_CONFIG.endpoints.health);
            return { available: true, status: result.status };
        } catch (error) {
            return { available: false, error: error.message };
        }
    }

    // ==================== GEOCODING ====================

    /**
     * Convert address to coordinates
     * @param {string} address - Address to geocode
     * @returns {Promise<{latitude: number, longitude: number, score: number} | null>}
     */
    async geocodeAddress(address) {
        try {
            const result = await this.request(GIS_CONFIG.endpoints.geocode, {
                method: "POST",
                body: JSON.stringify({ address })
            });

            if (result.success && result.data) {
                return result.data;
            }
            return null;
        } catch (error) {
            console.error("Geocoding error:", error.message);
            throw error;
        }
    }

    /**
     * Convert coordinates to address
     * @param {number} latitude
     * @param {number} longitude
     * @returns {Promise<Object | null>}
     */
    async reverseGeocode(latitude, longitude) {
        try {
            const result = await this.request(GIS_CONFIG.endpoints.reverseGeocode, {
                method: "POST",
                body: JSON.stringify({ latitude, longitude })
            });

            if (result.success && result.data) {
                return result.data;
            }
            return null;
        } catch (error) {
            console.error("Reverse geocoding error:", error.message);
            throw error;
        }
    }

    // ==================== ROUTING ====================

    /**
     * Get optimal route between two points
     * @param {Object} start - { latitude, longitude }
     * @param {Object} end - { latitude, longitude }
     * @returns {Promise<Object>}
     */
    async getRoute(start, end) {
        try {
            const result = await this.request(GIS_CONFIG.endpoints.getRoute, {
                method: "POST",
                body: JSON.stringify({ start, end })
            });

            return result;
        } catch (error) {
            console.error("Routing error:", error.message);
            throw error;
        }
    }

    // ==================== AMBULANCES ====================

    /**
     * Find nearest available ambulances to incident location
     * @param {Object} location - { latitude, longitude }
     * @param {Object} options - { limit, status, includeRoute }
     * @returns {Promise<Array>}
     */
    async findNearestAmbulances(location, options = {}) {
        const { limit = 5, status = "available", includeRoute = false } = options;

        try {
            const queryParams = new URLSearchParams({
                latitude: location.latitude,
                longitude: location.longitude,
                limit: limit.toString(),
                status,
                includeRoute: includeRoute.toString()
            });

            const result = await this.request(
                `${GIS_CONFIG.endpoints.nearestAmbulances}?${queryParams}`
            );

            if (result.success) {
                return result.data;
            }
            return [];
        } catch (error) {
            console.error("Find nearest ambulances error:", error.message);
            throw error;
        }
    }

    /**
     * Get route from ambulance to incident
     * @param {Object} ambulanceLocation - { latitude, longitude }
     * @param {Object} incidentLocation - { latitude, longitude }
     * @returns {Promise<Object>}
     */
    async getRouteToIncident(ambulanceLocation, incidentLocation) {
        try {
            const result = await this.request(GIS_CONFIG.endpoints.routeToIncident, {
                method: "POST",
                body: JSON.stringify({
                    ambulanceLocation,
                    incidentLocation
                })
            });

            return result;
        } catch (error) {
            console.error("Route to incident error:", error.message);
            throw error;
        }
    }

    /**
     * Sync ambulance data to GIS Feature Service
     * @param {Object} ambulance - Mongoose ambulance document
     * @returns {Promise<Object | null>}
     */
    async syncAmbulance(ambulance) {
        if (!this.syncEnabled) {
            console.log("[GIS Sync Disabled] Would sync ambulance:", ambulance._id);
            return null;
        }

        try {
            // Transform MongoDB model to ArcGIS feature format
            const feature = this.transformAmbulanceToFeature(ambulance);

            // Check if ambulance exists in GIS (by businessId)
            const existing = await this.request(
                `${GIS_CONFIG.endpoints.ambulances}?where=businessId='${ambulance._id}'`
            ).catch(() => []);

            if (existing && existing.length > 0) {
                // Update existing
                const result = await this.request(GIS_CONFIG.endpoints.ambulances, {
                    method: "PUT",
                    body: JSON.stringify({
                        features: [{
                            attributes: {
                                ...feature.attributes,
                                objectId: existing[0].attributes.objectId
                            },
                            geometry: feature.geometry
                        }]
                    })
                });
                return result;
            } else {
                // Create new
                const result = await this.request(GIS_CONFIG.endpoints.ambulances, {
                    method: "POST",
                    body: JSON.stringify(feature)
                });
                return result;
            }
        } catch (error) {
            console.error("Sync ambulance error:", error.message);
            // Don't throw - sync failures shouldn't break main operations
            return null;
        }
    }

    /**
     * Sync ambulance location update to GIS
     * @param {string} ambulanceId - MongoDB ambulance ID
     * @param {Object} location - GeoJSON location { type, coordinates }
     */
    async syncAmbulanceLocation(ambulanceId, location) {
        if (!this.syncEnabled) {
            console.log("[GIS Sync Disabled] Would sync location for:", ambulanceId);
            return null;
        }

        try {
            const result = await this.request(GIS_CONFIG.endpoints.ambulances, {
                method: "PUT",
                body: JSON.stringify({
                    features: [{
                        attributes: {
                            businessId: ambulanceId.toString()
                        },
                        geometry: {
                            x: location.coordinates[0],
                            y: location.coordinates[1]
                        }
                    }]
                })
            });
            return result;
        } catch (error) {
            console.error("Sync ambulance location error:", error.message);
            return null;
        }
    }

    // ==================== INCIDENTS ====================

    /**
     * Sync incident to GIS Feature Service for visualization
     * @param {Object} incident - Mongoose incident document
     * @returns {Promise<Object | null>}
     */
    async syncIncident(incident) {
        if (!this.syncEnabled) {
            console.log("[GIS Sync Disabled] Would sync incident:", incident._id);
            return null;
        }

        try {
            const feature = this.transformIncidentToFeature(incident);

            // Check if incident exists in GIS (by businessId)
            const existing = await this.request(
                `${GIS_CONFIG.endpoints.incidents}?where=businessId='${incident._id}'`
            ).catch(() => []);

            if (existing && existing.length > 0) {
                // Update existing
                const result = await this.request(GIS_CONFIG.endpoints.incidents, {
                    method: "PUT",
                    body: JSON.stringify({
                        features: [{
                            attributes: {
                                ...feature.attributes,
                                objectId: existing[0].attributes.objectId
                            },
                            geometry: feature.geometry
                        }]
                    })
                });
                return result;
            } else {
                // Create new
                const result = await this.request(GIS_CONFIG.endpoints.incidents, {
                    method: "POST",
                    body: JSON.stringify(feature)
                });
                return result;
            }
        } catch (error) {
            console.error("Sync incident error:", error.message);
            return null;
        }
    }

    // ==================== DATA TRANSFORMERS ====================

    /**
     * Transform MongoDB Ambulance to ArcGIS Feature format
     */
    transformAmbulanceToFeature(ambulance) {
        return {
            attributes: {
                businessId: ambulance._id.toString(),
                plateNumber: ambulance.plateNumber,
                status: ambulance.status,
                driverId: ambulance.driver?.toString() || null,
                updatedAt: ambulance.updatedAt?.toISOString() || new Date().toISOString()
            },
            geometry: {
                x: ambulance.location?.coordinates?.[0] || 0,
                y: ambulance.location?.coordinates?.[1] || 0
            }
        };
    }

    /**
     * Transform MongoDB Incident to ArcGIS Feature format
     */
    transformIncidentToFeature(incident) {
        return {
            attributes: {
                businessId: incident._id.toString(),
                description: incident.description,
                severity: incident.severity,
                status: incident.status,
                reportedBy: incident.reportedBy?.toString() || "unknown",
                assignedAmbulance: incident.assignedAmbulance?.toString() || null,
                createdAt: incident.createdAt?.toISOString() || new Date().toISOString()
            },
            geometry: {
                x: incident.location?.coordinates?.[0] || 0,
                y: incident.location?.coordinates?.[1] || 0
            }
        };
    }

    /**
     * Transform GeoJSON location to simple coordinates object
     */
    geoJSONToCoords(geoJSON) {
        if (!geoJSON?.coordinates) return null;
        return {
            longitude: geoJSON.coordinates[0],
            latitude: geoJSON.coordinates[1]
        };
    }

    /**
     * Transform simple coordinates to GeoJSON
     */
    coordsToGeoJSON(coords) {
        return {
            type: "Point",
            coordinates: [coords.longitude, coords.latitude]
        };
    }
}

// Export singleton instance
const gisService = new GISService();
export default gisService;
