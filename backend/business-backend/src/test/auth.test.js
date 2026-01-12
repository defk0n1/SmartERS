import * as chai from "chai";
import chaiHttp from "chai-http";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import app from "../app.js";
import User from "../models/User.js";
import Ambulance from "../models/Ambulance.js";
import Incident from "../models/Incident.js";

chai.use(chaiHttp);
import { request } from "chai-http";
const { expect } = chai;

describe("SmartERS Authentication & RBAC Tests", function() {
    this.timeout(10000);

    let adminToken, operatorToken, driverToken;
    let adminUser, operatorUser, driverUser, inactiveUser;
    let testAmbulance, testIncident;

    before(async () => {
        await mongoose.connect(process.env.MONGO_URI);
        
        // Clean up only test-specific users
        await User.deleteMany({ email: { $regex: /@authtest\.com$/ } });
        await Ambulance.deleteMany({ plateNumber: { $regex: /^AUTH-TEST/ } });
        await Incident.deleteMany({ description: { $regex: /^AUTH-TEST/ } });

        // Create test users with unique emails
        adminUser = await User.create({
            name: "Auth Test Admin",
            email: "admin@authtest.com",
            password: "admin123",
            role: "admin",
            isActive: true
        });

        operatorUser = await User.create({
            name: "Auth Test Operator",
            email: "operator@authtest.com",
            password: "operator123",
            role: "operator",
            isActive: true
        });

        driverUser = await User.create({
            name: "Auth Test Driver",
            email: "driver@authtest.com",
            password: "driver123",
            role: "driver",
            isActive: true
        });

        inactiveUser = await User.create({
            name: "Auth Inactive User",
            email: "inactive@authtest.com",
            password: "inactive123",
            role: "operator",
            isActive: false
        });
    });

    after(async () => {
        await User.deleteMany({ email: { $regex: /@authtest\.com$/ } });
        await Ambulance.deleteMany({ plateNumber: { $regex: /^AUTH-TEST/ } });
        await Incident.deleteMany({ description: { $regex: /^AUTH-TEST/ } });
        await mongoose.connection.close();
    });

    // ==================== AUTHENTICATION TESTS ====================

    describe("POST /api/auth/register", () => {
        it("should register a new operator", (done) => {
            request.execute(app)
                .post("/api/auth/register")
                .send({
                    name: "New Operator",
                    email: "newoperator@authtest.com",
                    password: "password123",
                    role: "operator"
                })
                .end((err, res) => {
                    expect(res).to.have.status(201);
                    expect(res.body).to.have.property("user");
                    expect(res.body.user.role).to.equal("operator");
                    done();
                });
        });

        it("should register a new driver", (done) => {
            request.execute(app)
                .post("/api/auth/register")
                .send({
                    name: "New Driver",
                    email: "newdriver@authtest.com",
                    password: "password123",
                    role: "driver"
                })
                .end((err, res) => {
                    expect(res).to.have.status(201);
                    expect(res.body.user.role).to.equal("driver");
                    done();
                });
        });

        it("should not allow self-registration as admin", (done) => {
            request.execute(app)
                .post("/api/auth/register")
                .send({
                    name: "Fake Admin",
                    email: "fakeadmin@authtest.com",
                    password: "password123",
                    role: "admin"
                })
                .end((err, res) => {
                    expect(res).to.have.status(201);
                    // Should default to operator, not admin
                    expect(res.body.user.role).to.equal("operator");
                    done();
                });
        });

        it("should reject duplicate email", (done) => {
            request.execute(app)
                .post("/api/auth/register")
                .send({
                    name: "Duplicate",
                    email: "admin@authtest.com",
                    password: "password123",
                    role: "operator"
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.message).to.equal("Email already registered");
                    done();
                });
        });
    });

    describe("POST /api/auth/login", () => {
        it("should login admin and return token", (done) => {
            request.execute(app)
                .post("/api/auth/login")
                .send({
                    email: "admin@authtest.com",
                    password: "admin123"
                })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("accessToken");
                    expect(res.body.user.role).to.equal("admin");
                    adminToken = res.body.accessToken;
                    done();
                });
        });

        it("should login operator and return token", (done) => {
            request.execute(app)
                .post("/api/auth/login")
                .send({
                    email: "operator@authtest.com",
                    password: "operator123"
                })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("accessToken");
                    operatorToken = res.body.accessToken;
                    done();
                });
        });

        it("should login driver and return token", (done) => {
            request.execute(app)
                .post("/api/auth/login")
                .send({
                    email: "driver@authtest.com",
                    password: "driver123"
                })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("accessToken");
                    driverToken = res.body.accessToken;
                    done();
                });
        });

        it("should reject invalid credentials", (done) => {
            request.execute(app)
                .post("/api/auth/login")
                .send({
                    email: "admin@authtest.com",
                    password: "wrongpassword"
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.message).to.equal("Invalid credentials");
                    done();
                });
        });

        it("should reject non-existent user", (done) => {
            request.execute(app)
                .post("/api/auth/login")
                .send({
                    email: "nonexistent@authtest.com",
                    password: "password123"
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.message).to.equal("Invalid credentials");
                    done();
                });
        });
    });

    // ==================== RBAC TESTS - ADMIN ROUTES ====================

    describe("Admin Routes RBAC", () => {
        it("should allow admin to access /api/admin/users", (done) => {
            request.execute(app)
                .get("/api/admin/users")
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("users");
                    done();
                });
        });

        it("should deny operator access to /api/admin/users", (done) => {
            request.execute(app)
                .get("/api/admin/users")
                .set("Authorization", `Bearer ${operatorToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });

        it("should deny driver access to /api/admin/users", (done) => {
            request.execute(app)
                .get("/api/admin/users")
                .set("Authorization", `Bearer ${driverToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });

        it("should allow admin to get dashboard stats", (done) => {
            request.execute(app)
                .get("/api/admin/dashboard")
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("users");
                    expect(res.body).to.have.property("ambulances");
                    expect(res.body).to.have.property("incidents");
                    done();
                });
        });

        it("should allow admin to create any user role", (done) => {
            request.execute(app)
                .post("/api/admin/users")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    name: "New Admin",
                    email: "createdadmin@authtest.com",
                    password: "password123",
                    role: "admin"
                })
                .end((err, res) => {
                    expect(res).to.have.status(201);
                    expect(res.body.user.role).to.equal("admin");
                    done();
                });
        });
    });

    // ==================== RBAC TESTS - AMBULANCE ROUTES ====================

    describe("Ambulance Routes RBAC", () => {
        before((done) => {
            // Create test ambulance via admin
            request.execute(app)
                .post("/api/ambulances")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    plateNumber: "AUTH-TEST-001",
                    status: "available",
                    location: { type: "Point", coordinates: [0, 0] }
                })
                .end((err, res) => {
                    if (res.status === 201) {
                        testAmbulance = res.body;
                    }
                    done();
                });
        });

        it("should allow admin to create ambulance", (done) => {
            request.execute(app)
                .post("/api/ambulances")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    plateNumber: "AUTH-TEST-002",
                    status: "available",
                    location: { type: "Point", coordinates: [1, 1] }
                })
                .end((err, res) => {
                    expect(res).to.have.status(201);
                    done();
                });
        });

        it("should deny operator from creating ambulance", (done) => {
            request.execute(app)
                .post("/api/ambulances")
                .set("Authorization", `Bearer ${operatorToken}`)
                .send({
                    plateNumber: "AUTH-TEST-003",
                    status: "available"
                })
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });

        it("should deny driver from creating ambulance", (done) => {
            request.execute(app)
                .post("/api/ambulances")
                .set("Authorization", `Bearer ${driverToken}`)
                .send({
                    plateNumber: "AUTH-TEST-004",
                    status: "available"
                })
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });

        it("should allow all authenticated users to view ambulances", (done) => {
            request.execute(app)
                .get("/api/ambulances")
                .set("Authorization", `Bearer ${driverToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("ambulances");
                    done();
                });
        });

        it("should deny admin delete for non-available ambulance", async () => {
            // First set ambulance to busy
            await Ambulance.findByIdAndUpdate(testAmbulance._id, { status: "busy" });

            const res = await new Promise((resolve) => {
                request.execute(app)
                    .delete(`/api/ambulances/${testAmbulance._id}`)
                    .set("Authorization", `Bearer ${adminToken}`)
                    .end((err, res) => resolve(res));
            });

            expect(res).to.have.status(400);
            expect(res.body.message).to.include("not available");

            // Reset status
            await Ambulance.findByIdAndUpdate(testAmbulance._id, { status: "available" });
        });
    });

    // ==================== RBAC TESTS - INCIDENT ROUTES ====================

    describe("Incident Routes RBAC", () => {
        it("should allow operator to create incident", (done) => {
            request.execute(app)
                .post("/api/incidents")
                .set("Authorization", `Bearer ${operatorToken}`)
                .send({
                    description: "AUTH-TEST incident from operator",
                    location: { type: "Point", coordinates: [10, 10] },
                    severity: "medium"
                })
                .end((err, res) => {
                    expect(res).to.have.status(201);
                    testIncident = res.body;
                    done();
                });
        });

        it("should deny driver from creating incident", (done) => {
            request.execute(app)
                .post("/api/incidents")
                .set("Authorization", `Bearer ${driverToken}`)
                .send({
                    description: "AUTH-TEST incident from driver",
                    location: { type: "Point", coordinates: [10, 10] },
                    severity: "low"
                })
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });

        it("should allow admin/operator to view all incidents", (done) => {
            request.execute(app)
                .get("/api/incidents")
                .set("Authorization", `Bearer ${operatorToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("incidents");
                    done();
                });
        });

        it("should deny driver from viewing all incidents", (done) => {
            request.execute(app)
                .get("/api/incidents")
                .set("Authorization", `Bearer ${driverToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });

        it("should allow driver to view specific incident", (done) => {
            request.execute(app)
                .get(`/api/incidents/${testIncident._id}`)
                .set("Authorization", `Bearer ${driverToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    done();
                });
        });

        it("should only allow admin to delete incident", (done) => {
            // First try with operator
            request.execute(app)
                .delete(`/api/incidents/${testIncident._id}`)
                .set("Authorization", `Bearer ${operatorToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    
                    // Then with admin
                    request.execute(app)
                        .delete(`/api/incidents/${testIncident._id}`)
                        .set("Authorization", `Bearer ${adminToken}`)
                        .end((err, res) => {
                            expect(res).to.have.status(200);
                            done();
                        });
                });
        });
    });

    // ==================== AUTHENTICATION EDGE CASES ====================

    describe("Authentication Edge Cases", () => {
        it("should reject request without token", (done) => {
            request.execute(app)
                .get("/api/admin/users")
                .end((err, res) => {
                    expect(res).to.have.status(401);
                    done();
                });
        });

        it("should reject request with invalid token", (done) => {
            request.execute(app)
                .get("/api/admin/users")
                .set("Authorization", "Bearer invalidtoken123")
                .end((err, res) => {
                    expect(res).to.have.status(401);
                    done();
                });
        });

        it("should reject request with malformed auth header", (done) => {
            request.execute(app)
                .get("/api/admin/users")
                .set("Authorization", "InvalidFormat token123")
                .end((err, res) => {
                    expect(res).to.have.status(401);
                    done();
                });
        });
    });
});
