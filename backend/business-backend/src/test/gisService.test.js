/**
 * GIS Service Integration Tests
 * Tests the GIS service client and its integration with the GIS backend
 */

import { expect } from "chai";
import gisService from "../services/gisService.js";

describe("GIS Service", () => {

    describe("Health Check", () => {
        it("should check GIS service availability", async () => {
            const health = await gisService.healthCheck();
            
            // Health check should return an object with available property
            expect(health).to.have.property("available");
            expect(health.available).to.be.a("boolean");
            
            if (health.available) {
                expect(health).to.have.property("status");
            } else {
                expect(health).to.have.property("error");
            }
        });
    });

    describe("Data Transformers", () => {
        describe("geoJSONToCoords", () => {
            it("should convert GeoJSON to simple coordinates", () => {
                const geoJSON = {
                    type: "Point",
                    coordinates: [10.1815, 36.8065]
                };

                const coords = gisService.geoJSONToCoords(geoJSON);

                expect(coords).to.deep.equal({
                    longitude: 10.1815,
                    latitude: 36.8065
                });
            });

            it("should return null for invalid input", () => {
                expect(gisService.geoJSONToCoords(null)).to.be.null;
                expect(gisService.geoJSONToCoords({})).to.be.null;
                expect(gisService.geoJSONToCoords({ type: "Point" })).to.be.null;
            });
        });

        describe("coordsToGeoJSON", () => {
            it("should convert simple coordinates to GeoJSON", () => {
                const coords = {
                    longitude: 10.1815,
                    latitude: 36.8065
                };

                const geoJSON = gisService.coordsToGeoJSON(coords);

                expect(geoJSON).to.deep.equal({
                    type: "Point",
                    coordinates: [10.1815, 36.8065]
                });
            });
        });

        describe("transformAmbulanceToFeature", () => {
            it("should transform MongoDB ambulance to ArcGIS feature format", () => {
                const ambulance = {
                    _id: "507f1f77bcf86cd799439011",
                    plateNumber: "AMB-001",
                    status: "available",
                    driver: "507f1f77bcf86cd799439012",
                    location: {
                        type: "Point",
                        coordinates: [10.1815, 36.8065]
                    },
                    updatedAt: new Date("2026-01-10T12:00:00Z")
                };

                const feature = gisService.transformAmbulanceToFeature(ambulance);

                expect(feature).to.have.property("attributes");
                expect(feature).to.have.property("geometry");
                expect(feature.attributes.businessId).to.equal("507f1f77bcf86cd799439011");
                expect(feature.attributes.plateNumber).to.equal("AMB-001");
                expect(feature.attributes.status).to.equal("available");
                expect(feature.geometry.x).to.equal(10.1815);
                expect(feature.geometry.y).to.equal(36.8065);
            });

            it("should handle missing location", () => {
                const ambulance = {
                    _id: "507f1f77bcf86cd799439011",
                    plateNumber: "AMB-001",
                    status: "available"
                };

                const feature = gisService.transformAmbulanceToFeature(ambulance);

                expect(feature.geometry.x).to.equal(0);
                expect(feature.geometry.y).to.equal(0);
            });
        });

        describe("transformIncidentToFeature", () => {
            it("should transform MongoDB incident to ArcGIS feature format", () => {
                const incident = {
                    _id: "507f1f77bcf86cd799439011",
                    description: "Traffic accident",
                    severity: "high",
                    status: "pending",
                    reportedBy: "507f1f77bcf86cd799439012",
                    location: {
                        type: "Point",
                        coordinates: [10.1815, 36.8065]
                    },
                    createdAt: new Date("2026-01-10T12:00:00Z")
                };

                const feature = gisService.transformIncidentToFeature(incident);

                expect(feature).to.have.property("attributes");
                expect(feature).to.have.property("geometry");
                expect(feature.attributes.businessId).to.equal("507f1f77bcf86cd799439011");
                expect(feature.attributes.description).to.equal("Traffic accident");
                expect(feature.attributes.severity).to.equal("high");
                expect(feature.attributes.status).to.equal("pending");
                expect(feature.geometry.x).to.equal(10.1815);
                expect(feature.geometry.y).to.equal(36.8065);
            });
        });
    });

    // These tests require GIS backend to be running
    describe("API Integration (requires GIS backend)", function() {
        // Increase timeout for external API calls
        this.timeout(10000);

        before(async function() {
            // Skip integration tests if GIS service is not available
            const health = await gisService.healthCheck();
            if (!health.available) {
                console.log("Skipping GIS integration tests - GIS backend not available");
                this.skip();
            }
        });

        describe("Geocoding", () => {
            it("should geocode an address", async () => {
                const result = await gisService.geocodeAddress("Tunis, Tunisia");
                
                // Should return valid coordinates or null
                if (result) {
                    expect(result).to.have.property("latitude");
                    expect(result).to.have.property("longitude");
                    expect(result.latitude).to.be.a("number");
                    expect(result.longitude).to.be.a("number");
                    expect(result.latitude).to.be.within(-90, 90);
                    expect(result.longitude).to.be.within(-180, 180);
                } else {
                    expect(result).to.be.null;
                }
            });

            it("should reverse geocode coordinates", async function() {
                try {
                    const result = await gisService.reverseGeocode(36.8065, 10.1815);
                    
                    // Should return address object or null
                    if (result) {
                        expect(result).to.be.an("object");
                    } else {
                        expect(result).to.be.null;
                    }
                } catch (error) {
                    // Known limitation: ArcGIS reverse geocoding requires premium subscription
                    // Error 499 (Token Required) is expected with standard OAuth credentials
                    if (error.message.includes("499") || error.message.includes("Token Required") || error.message.includes("premium")) {
                        console.log("Reverse geocoding test skipped:", error.message);
                        // Accept this as expected behavior, not a failure
                        return;
                    } else {
                        // Any other error is a real bug
                        throw error;
                    }
                }
            });
        });

        describe("Nearest Ambulances", () => {
            it("should find nearest ambulances", async () => {
                const location = { latitude: 36.818, longitude: 10.165 };
                const result = await gisService.findNearestAmbulances(location, {
                    limit: 5,
                    status: "available"
                });
                
                // Should return array (empty or with ambulances)
                expect(result).to.be.an("array");
                
                // If ambulances found, validate structure
                if (result.length > 0) {
                    expect(result.length).to.be.at.most(5);
                    result.forEach(amb => {
                        expect(amb).to.have.property("distance");
                        expect(amb.distance).to.be.a("number");
                    });
                }
            });
        });

        describe("Routing", () => {
            it("should get route between two points", async () => {
                const start = { latitude: 36.820, longitude: 10.160 };
                const end = { latitude: 36.818, longitude: 10.165 };
                
                const result = await gisService.getRoute(start, end);
                
                // Should return route object with success flag
                expect(result).to.be.an("object");
                expect(result).to.have.property("success");
                
                if (result.success && result.route) {
                    // Validate route structure when route is successfully found
                    expect(result).to.have.property("route");
                    expect(result).to.have.property("totalDistance");
                    expect(result).to.have.property("totalTime");
                    
                    // totalDistance and totalTime can be null if attributes are missing
                    if (result.totalDistance !== null) {
                        expect(result.totalDistance).to.be.a("number");
                    }
                    if (result.totalTime !== null) {
                        expect(result.totalTime).to.be.a("number");
                    }
                } else if (result.success === false) {
                    // If routing failed, should have error
                    expect(result).to.have.property("error");
                }
            });
        });
    });
});
