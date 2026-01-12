/**
 * Spatial utility functions for distance calculations and nearest neighbor queries
 */

/**
 * Calculate distance between two points using Haversine formula
 * @param {Object} point1 - { latitude, longitude }
 * @param {Object} point2 - { latitude, longitude }
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in kilometers

    const lat1 = toRadians(point1.latitude);
    const lat2 = toRadians(point2.latitude);
    const deltaLat = toRadians(point2.latitude - point1.latitude);
    const deltaLon = toRadians(point2.longitude - point1.longitude);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Sort ambulances by distance from a given point
 * @param {Array} ambulances - Array of ambulance features from ArcGIS
 * @param {Object} targetLocation - { latitude, longitude }
 * @returns {Array} Sorted ambulances with distance property added
 */
export function sortByDistance(ambulances, targetLocation) {
    return ambulances
        .map(ambulance => {
            const ambLocation = {
                latitude: ambulance.geometry?.y || 0,
                longitude: ambulance.geometry?.x || 0
            };
            const distance = calculateDistance(targetLocation, ambLocation);
            return {
                ...ambulance,
                distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
            };
        })
        .sort((a, b) => a.distance - b.distance);
}

/**
 * Find ambulances within a given radius
 * @param {Array} ambulances - Array of ambulance features
 * @param {Object} center - { latitude, longitude }
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {Array} Ambulances within radius, sorted by distance
 */
export function findWithinRadius(ambulances, center, radiusKm) {
    return sortByDistance(ambulances, center)
        .filter(amb => amb.distance <= radiusKm);
}

/**
 * Estimate travel time based on distance
 * Assumes average speed for emergency vehicle
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} avgSpeedKmh - Average speed in km/h (default 50 for urban)
 * @returns {number} Estimated time in minutes
 */
export function estimateTravelTime(distanceKm, avgSpeedKmh = 50) {
    return Math.round((distanceKm / avgSpeedKmh) * 60 * 10) / 10; // Round to 1 decimal
}
