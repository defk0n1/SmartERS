import { solveRoute } from "@esri/arcgis-rest-routing";
import { getArcGISToken } from "../config/arcgis.js";
import { ArcGISIdentityManager } from "@esri/arcgis-rest-request";

class RoutingService {
    async getOptimalRoute(start, end) {
        const token = await getArcGISToken();

        const authentication = await ArcGISIdentityManager.fromToken({
            token: token,
            portal: "https://www.arcgis.com/sharing/rest"
        });

        try {
            const response = await solveRoute({
                authentication,
                stops: [
                    [start.longitude, start.latitude],
                    [end.longitude, end.latitude]
                ]
            });
            console.log("Successfully received route!");
            // Safely access the response properties
            return {
                route: response.routes?.features?.[0] || null,
                directions: response.directions?.[0]?.features || [],
                totalDistance: response.routes?.features?.[0]?.attributes?.Total_Miles || null,
                totalTime: response.routes?.features?.[0]?.attributes?.Total_Time || null
            };

        } catch (error) {
            console.error("Routing Error:", error);
            console.error("Error details:", error.response?.data || error.message);
            throw new Error("Failed to retrieve route: " + (error.message || "Unknown error"));
        }
    }
}

export default new RoutingService();