/**
 * GIS Backend Configuration
 * Configuration for connecting to the GIS microservice
 */

export const GIS_CONFIG = {
    baseUrl: process.env.GIS_BACKEND_URL || "http://localhost:5001",
    timeout: parseInt(process.env.GIS_TIMEOUT) || 10000,
    retryAttempts: parseInt(process.env.GIS_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.GIS_RETRY_DELAY) || 1000,
    syncEnabled: process.env.GIS_SYNC_ENABLED !== "false", // Default true
    endpoints: {
        // Geocoding
        geocode: "/api/gis/geocode",
        reverseGeocode: "/api/gis/reverse-geocode",
        
        // Routing
        getRoute: "/api/gis/getRoute",
        
        // Ambulances
        ambulances: "/ambulances",
        nearestAmbulances: "/ambulances/nearest",
        routeToIncident: "/ambulances/route-to-incident",
        
        // Incidents
        incidents: "/incidents",
        
        // Health
        health: "/health"
    }
};
