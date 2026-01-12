import geocodingService from "../services/geocodingService.js";

/**
 * Geocode an address to coordinates
 * POST /api/gis/geocode
 */
export async function geocodeAddress(req, res) {
    try {
        const { address } = req.body;

        if (!address) {
            return res.status(400).json({
                success: false,
                error: "Address is required"
            });
        }

        const result = await geocodingService.geocodeAddress(address);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: "Unable to geocode address"
            });
        }

        res.json({
            success: true,
            data: {
                latitude: result.latitude,
                longitude: result.longitude,
                score: result.score
            }
        });
    } catch (error) {
        console.error("Geocode controller error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Reverse geocode coordinates to address
 * POST /api/gis/reverse-geocode
 */
export async function reverseGeocode(req, res) {
    try {
        const { latitude, longitude } = req.body;

        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                error: "Latitude and longitude are required"
            });
        }

        const result = await geocodingService.reverseGeocodeLocation({
            latitude,
            longitude
        });

        if (!result) {
            return res.status(404).json({
                success: false,
                error: "Unable to reverse geocode location"
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("Reverse geocode controller error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
