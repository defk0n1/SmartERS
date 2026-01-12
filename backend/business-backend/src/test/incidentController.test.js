import * as chai from "chai";
import chaiHttp from "chai-http";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import app from "../app.js";
import Incident from "../models/Incident.js";
import Ambulance from "../models/Ambulance.js";
import User from "../models/User.js";

chai.use(chaiHttp);
import { request } from "chai-http";
const { expect } = chai;

describe("Incident Controller API Tests", function() {
    this.timeout(10000);

    let adminToken, operatorToken, driverToken;
    let adminUser, operatorUser, driverUser;
    let incidentId;
    let testAmbulance;

    before(async () => {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);

        // Clean up
        await User.deleteMany({ email: { $in: ["inctest-admin@test.com", "inctest-operator@test.com", "inctest-driver@test.com"] } });
        await Incident.deleteMany({ description: { $regex: /^TEST-INC/ } });
        await Ambulance.deleteMany({ plateNumber: "TEST-INC-AMB" });

        // Create test users
        adminUser = await User.create({
            name: "Inc Test Admin",
            email: "inctest-admin@test.com",
            password: "admin123",
            role: "admin",
            isActive: true
        });

        operatorUser = await User.create({
            name: "Inc Test Operator",
            email: "inctest-operator@test.com",
            password: "operator123",
            role: "operator",
            isActive: true
        });

        driverUser = await User.create({
            name: "Inc Test Driver",
            email: "inctest-driver@test.com",
            password: "driver123",
            role: "driver",
            isActive: true
        });

        // Create test ambulance
        testAmbulance = await Ambulance.create({
            plateNumber: "TEST-INC-AMB",
            status: "available",
            driver: driverUser._id,
            location: { type: "Point", coordinates: [-73.9857, 40.7484] }
        });

        // Assign ambulance to driver
        await User.findByIdAndUpdate(driverUser._id, { assignedAmbulance: testAmbulance._id });

        // Login to get tokens
        const adminLogin = await new Promise((resolve) => {
            request.execute(app)
                .post("/api/auth/login")
                .send({ email: "inctest-admin@test.com", password: "admin123" })
                .end((err, res) => resolve(res));
        });
        adminToken = adminLogin.body.accessToken;

        const operatorLogin = await new Promise((resolve) => {
            request.execute(app)
                .post("/api/auth/login")
                .send({ email: "inctest-operator@test.com", password: "operator123" })
                .end((err, res) => resolve(res));
        });
        operatorToken = operatorLogin.body.accessToken;

        const driverLogin = await new Promise((resolve) => {
            request.execute(app)
                .post("/api/auth/login")
                .send({ email: "inctest-driver@test.com", password: "driver123" })
                .end((err, res) => resolve(res));
        });
        driverToken = driverLogin.body.accessToken;
    });

    after(async () => {
        // Clean up test data
        await User.deleteMany({ email: { $in: ["inctest-admin@test.com", "inctest-operator@test.com", "inctest-driver@test.com"] } });
        await Incident.deleteMany({ description: { $regex: /^TEST-INC/ } });
        await Ambulance.deleteMany({ plateNumber: "TEST-INC-AMB" });
        await mongoose.connection.close();
    });

    // ==================== CREATE INCIDENT TESTS ====================

    describe("POST /api/incidents", () => {
        it("should allow admin to create incident", (done) => {
            request.execute(app)
                .post("/api/incidents")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    location: { type: "Point", coordinates: [-73.9857, 40.7484] },
                    severity: "high",
                    description: "TEST-INC: Admin created incident"
                })
                .end((err, res) => {
                    expect(res).to.have.status(201);
                    expect(res.body).to.have.property("_id");
                    expect(res.body.reportedBy._id.toString()).to.equal(adminUser._id.toString());
                    incidentId = res.body._id;
                    done();
                });
        });

        it("should allow operator to create incident", (done) => {
            request.execute(app)
                .post("/api/incidents")
                .set("Authorization", `Bearer ${operatorToken}`)
                .send({
                    location: { type: "Point", coordinates: [-74.0060, 40.7128] },
                    severity: "medium",
                    description: "TEST-INC: Operator created incident"
                })
                .end((err, res) => {
                    expect(res).to.have.status(201);
                    expect(res.body.reportedBy._id.toString()).to.equal(operatorUser._id.toString());
                    done();
                });
        });

        it("should deny driver from creating incident", (done) => {
            request.execute(app)
                .post("/api/incidents")
                .set("Authorization", `Bearer ${driverToken}`)
                .send({
                    location: { type: "Point", coordinates: [0, 0] },
                    severity: "low",
                    description: "TEST-INC: Driver attempted incident"
                })
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });

        it("should reject unauthenticated request", (done) => {
            request.execute(app)
                .post("/api/incidents")
                .send({
                    location: { type: "Point", coordinates: [0, 0] },
                    severity: "low",
                    description: "TEST-INC: Unauthenticated incident"
                })
                .end((err, res) => {
                    expect(res).to.have.status(401);
                    done();
                });
        });

        it("should validate severity enum", (done) => {
            request.execute(app)
                .post("/api/incidents")
                .set("Authorization", `Bearer ${operatorToken}`)
                .send({
                    location: { type: "Point", coordinates: [0, 0] },
                    severity: "invalid",
                    description: "TEST-INC: Invalid severity"
                })
                .end((err, res) => {
                    expect(res).to.have.status(500);
                    done();
                });
        });
    });

    // ==================== GET ALL INCIDENTS TESTS ====================

    describe("GET /api/incidents", () => {
        it("should allow admin to get all incidents with pagination", (done) => {
            request.execute(app)
                .get("/api/incidents")
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("incidents");
                    expect(res.body).to.have.property("totalPages");
                    expect(res.body.incidents).to.be.an("array");
                    done();
                });
        });

        it("should allow operator to get all incidents", (done) => {
            request.execute(app)
                .get("/api/incidents")
                .set("Authorization", `Bearer ${operatorToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("incidents");
                    done();
                });
        });

        it("should deny driver from getting all incidents", (done) => {
            request.execute(app)
                .get("/api/incidents")
                .set("Authorization", `Bearer ${driverToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });

        it("should filter by status", (done) => {
            request.execute(app)
                .get("/api/incidents?status=pending")
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    if (res.body.incidents.length > 0) {
                        res.body.incidents.forEach(inc => {
                            expect(inc.status).to.equal("pending");
                        });
                    }
                    done();
                });
        });

        it("should filter by severity", (done) => {
            request.execute(app)
                .get("/api/incidents?severity=high")
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    if (res.body.incidents.length > 0) {
                        res.body.incidents.forEach(inc => {
                            expect(inc.severity).to.equal("high");
                        });
                    }
                    done();
                });
        });

        it("should paginate correctly", (done) => {
            request.execute(app)
                .get("/api/incidents?page=1&limit=1")
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.incidents.length).to.be.at.most(1);
                    done();
                });
        });
    });

    // ==================== GET SINGLE INCIDENT ====================

    describe("GET /api/incidents/:id", () => {
        it("should allow any authenticated user to get incident by id", (done) => {
            request.execute(app)
                .get(`/api/incidents/${incidentId}`)
                .set("Authorization", `Bearer ${driverToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body._id).to.equal(incidentId);
                    done();
                });
        });

        it("should populate reportedBy field", (done) => {
            request.execute(app)
                .get(`/api/incidents/${incidentId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.reportedBy).to.have.property("name");
                    done();
                });
        });

        it("should return 404 for non-existent incident", (done) => {
            const fakeId = new mongoose.Types.ObjectId();
            request.execute(app)
                .get(`/api/incidents/${fakeId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    done();
                });
        });
    });

    // ==================== UPDATE INCIDENT ====================

    describe("PUT /api/incidents/:id", () => {
        it("should allow admin to update incident", (done) => {
            request.execute(app)
                .put(`/api/incidents/${incidentId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ severity: "low" })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.severity).to.equal("low");
                    done();
                });
        });

        it("should allow operator to update incident", (done) => {
            request.execute(app)
                .put(`/api/incidents/${incidentId}`)
                .set("Authorization", `Bearer ${operatorToken}`)
                .send({ status: "assigned" })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.status).to.equal("assigned");
                    done();
                });
        });

        it("should deny driver from updating incident", (done) => {
            request.execute(app)
                .put(`/api/incidents/${incidentId}`)
                .set("Authorization", `Bearer ${driverToken}`)
                .send({ severity: "high" })
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });
    });

    // ==================== DISPATCH AMBULANCE ====================

    describe("POST /api/incidents/dispatch", () => {
        let dispatchIncidentId;

        before(async () => {
            // Create a fresh incident for dispatch
            const incident = await Incident.create({
                location: { type: "Point", coordinates: [-73.99, 40.75] },
                severity: "high",
                description: "TEST-INC: Dispatch test incident",
                reportedBy: operatorUser._id,
                status: "pending"
            });
            dispatchIncidentId = incident._id;

            // Make sure ambulance is available
            await Ambulance.findByIdAndUpdate(testAmbulance._id, { status: "available" });
        });

        it("should allow operator to dispatch ambulance", (done) => {
            request.execute(app)
                .post("/api/incidents/dispatch")
                .set("Authorization", `Bearer ${operatorToken}`)
                .send({
                    incidentId: dispatchIncidentId,
                    ambulanceId: testAmbulance._id
                })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.incident.status).to.equal("assigned");
                    expect(res.body.incident.assignedAmbulance.status).to.equal("en-route");
                    done();
                });
        });

        it("should deny driver from dispatching", (done) => {
            request.execute(app)
                .post("/api/incidents/dispatch")
                .set("Authorization", `Bearer ${driverToken}`)
                .send({
                    incidentId: dispatchIncidentId,
                    ambulanceId: testAmbulance._id
                })
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });
    });

    // ==================== DELETE INCIDENT ====================

    describe("DELETE /api/incidents/:id", () => {
        let deleteIncidentId;

        before(async () => {
            // Create incident to delete
            const incident = await Incident.create({
                location: { type: "Point", coordinates: [0, 0] },
                severity: "low",
                description: "TEST-INC: Delete test incident",
                reportedBy: adminUser._id
            });
            deleteIncidentId = incident._id;
        });

        it("should deny operator from deleting incident", (done) => {
            request.execute(app)
                .delete(`/api/incidents/${deleteIncidentId}`)
                .set("Authorization", `Bearer ${operatorToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });

        it("should deny driver from deleting incident", (done) => {
            request.execute(app)
                .delete(`/api/incidents/${deleteIncidentId}`)
                .set("Authorization", `Bearer ${driverToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });

        it("should allow admin to delete incident", (done) => {
            request.execute(app)
                .delete(`/api/incidents/${deleteIncidentId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.message).to.include("deleted");
                    done();
                });
        });
    });
});