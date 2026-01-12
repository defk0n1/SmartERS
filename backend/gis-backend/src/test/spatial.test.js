import {
    calculateDistance,
    sortByDistance,
    findWithinRadius,
    estimateTravelTime
} from "../services/spatialService.js";
import { expect } from "chai";

describe("Spatial Service", () => {

    describe("calculateDistance", () => {
        it("should calculate distance between two points", () => {
            const point1 = { latitude: 36.8065, longitude: 10.1815 };
            const point2 = { latitude: 36.8165, longitude: 10.1915 };

            const distance = calculateDistance(point1, point2);

            expect(distance).to.be.a("number");
            expect(distance).to.be.greaterThan(0);
            // Approximate distance should be around 1.4 km
            expect(distance).to.be.closeTo(1.4, 0.5);
        });

        it("should return 0 for same point", () => {
            const point = { latitude: 36.8065, longitude: 10.1815 };

            const distance = calculateDistance(point, point);

            expect(distance).to.equal(0);
        });

        it("should handle large distances", () => {
            const tunis = { latitude: 36.8065, longitude: 10.1815 };
            const paris = { latitude: 48.8566, longitude: 2.3522 };

            const distance = calculateDistance(tunis, paris);

            // Distance should be around 1500 km
            expect(distance).to.be.closeTo(1500, 200);
        });
    });

    describe("sortByDistance", () => {
        it("should sort ambulances by distance from target", () => {
            const target = { latitude: 36.8065, longitude: 10.1815 };
            const ambulances = [
                { geometry: { x: 10.20, y: 36.82 }, attributes: { id: "far" } },
                { geometry: { x: 10.182, y: 36.807 }, attributes: { id: "near" } },
                { geometry: { x: 10.19, y: 36.81 }, attributes: { id: "mid" } }
            ];

            const sorted = sortByDistance(ambulances, target);

            expect(sorted[0].attributes.id).to.equal("near");
            expect(sorted[sorted.length - 1].attributes.id).to.equal("far");
            expect(sorted[0].distance).to.be.lessThan(sorted[1].distance);
            expect(sorted[1].distance).to.be.lessThan(sorted[2].distance);
        });

        it("should add distance property to each ambulance", () => {
            const target = { latitude: 36.8065, longitude: 10.1815 };
            const ambulances = [
                { geometry: { x: 10.182, y: 36.807 }, attributes: { id: "1" } }
            ];

            const sorted = sortByDistance(ambulances, target);

            expect(sorted[0]).to.have.property("distance");
            expect(sorted[0].distance).to.be.a("number");
        });

        it("should handle empty array", () => {
            const target = { latitude: 36.8065, longitude: 10.1815 };
            const sorted = sortByDistance([], target);

            expect(sorted).to.be.an("array").that.is.empty;
        });
    });

    describe("findWithinRadius", () => {
        it("should find ambulances within radius", () => {
            const center = { latitude: 36.8065, longitude: 10.1815 };
            const ambulances = [
                { geometry: { x: 10.182, y: 36.807 }, attributes: { id: "near" } },
                { geometry: { x: 10.50, y: 37.00 }, attributes: { id: "far" } }
            ];

            const withinRadius = findWithinRadius(ambulances, center, 5);

            expect(withinRadius).to.have.lengthOf(1);
            expect(withinRadius[0].attributes.id).to.equal("near");
        });

        it("should return empty array if no ambulances within radius", () => {
            const center = { latitude: 36.8065, longitude: 10.1815 };
            const ambulances = [
                { geometry: { x: 15.00, y: 40.00 }, attributes: { id: "very_far" } }
            ];

            const withinRadius = findWithinRadius(ambulances, center, 1);

            expect(withinRadius).to.be.an("array").that.is.empty;
        });
    });

    describe("estimateTravelTime", () => {
        it("should estimate travel time based on distance", () => {
            // 10 km at 50 km/h = 12 minutes
            const time = estimateTravelTime(10, 50);
            expect(time).to.equal(12);
        });

        it("should use default speed if not provided", () => {
            // 25 km at default 50 km/h = 30 minutes
            const time = estimateTravelTime(25);
            expect(time).to.equal(30);
        });

        it("should return 0 for zero distance", () => {
            const time = estimateTravelTime(0);
            expect(time).to.equal(0);
        });
    });
});
