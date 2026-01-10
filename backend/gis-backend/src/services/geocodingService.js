import { geocode, reverseGeocode } from "@esri/arcgis-rest-geocoding";
import { getArcGISToken } from "../config/arcgis.js";
import { ArcGISIdentityManager } from "@esri/arcgis-rest-request";

class GeocodingService {
    // Convert address to coordinates
    async geocodeAddress(address) {
        const token = await getArcGISToken();
        const authentication = await ArcGISIdentityManager.fromToken({
            token,
            portal: "https://www.arcgis.com/sharing/rest"
        });

        try {
            const response = await geocode({
                authentication,
                address
            });

            // Return the first result's location
            if (response?.candidates?.length > 0) {
                const { x: longitude, y: latitude } = response.candidates[0].location;
                return { latitude, longitude, score: response.candidates[0].score };
            }

            return null; // no results
        } catch (error) {
            console.error("Geocoding error:", error);
            throw new Error("Failed to geocode address: " + (error.message || "Unknown error"));
        }
    }

    // Convert coordinates to human-readable address
    async reverseGeocodeLocation(coords) {
        const token = await getArcGISToken();
        const authentication = await ArcGISIdentityManager.fromToken({
            token,
            portal: "https://www.arcgis.com/sharing/rest"
        });

        try {
            const response = await reverseGeocode({
                authentication,
                location: [coords.longitude, coords.latitude]
            });

            if (response?.address) {
                return response.address; // structured address object
            }

            return null;
        } catch (error) {
            console.error("Reverse Geocoding Error:", error);
            throw new Error("Failed to reverse geocode location: " + (error.message || "Unknown error"));
        }
    }
}

export default new GeocodingService();