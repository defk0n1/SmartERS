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

describe("Admin Controller API Tests", function() {
    this.timeout(10000);

    let adminToken, operatorToken, driverToken;
    let adminUser, operatorUser, driverUser;
    let createdUserId;

    before(async () => {
        await mongoose.connect(process.env.MONGO_URI);
        
        // Clean up test users
        await User.deleteMany({ email: { $regex: /@admintest\.com$/ } });

        // Create test users
        adminUser = await User.create({
            name: "Admin Test Admin",
            email: "admin@admintest.com",
            password: "admin123",
            role: "admin",
            isActive: true
        });

        operatorUser = await User.create({
            name: "Admin Test Operator",
            email: "operator@admintest.com",
            password: "operator123",
            role: "operator",
            isActive: true
        });

        driverUser = await User.create({
            name: "Admin Test Driver",
            email: "driver@admintest.com",
            password: "driver123",
            role: "driver",
            isActive: true
        });

        // Create some test data for stats
        await Ambulance.create({
            plateNumber: "ADMIN-TEST-001",
            status: "available",
            location: { type: "Point", coordinates: [0, 0] }
        });

        await Incident.create({
            location: { type: "Point", coordinates: [0, 0] },
            severity: "high",
            description: "Admin test incident",
            reportedBy: operatorUser._id
        });

        // Login to get tokens
        const adminLogin = await new Promise((resolve) => {
            request.execute(app)
                .post("/api/auth/login")
                .send({ email: "admin@admintest.com", password: "admin123" })
                .end((err, res) => resolve(res));
        });
        adminToken = adminLogin.body.accessToken;

        const operatorLogin = await new Promise((resolve) => {
            request.execute(app)
                .post("/api/auth/login")
                .send({ email: "operator@admintest.com", password: "operator123" })
                .end((err, res) => resolve(res));
        });
        operatorToken = operatorLogin.body.accessToken;

        const driverLogin = await new Promise((resolve) => {
            request.execute(app)
                .post("/api/auth/login")
                .send({ email: "driver@admintest.com", password: "driver123" })
                .end((err, res) => resolve(res));
        });
        driverToken = driverLogin.body.accessToken;
    });

    after(async () => {
        await User.deleteMany({ email: { $regex: /@admintest\.com$/ } });
        await Ambulance.deleteMany({ plateNumber: "ADMIN-TEST-001" });
        await Incident.deleteMany({ description: "Admin test incident" });
        await mongoose.connection.close();
    });

    // ==================== USER MANAGEMENT TESTS ====================

    describe("GET /api/admin/users", () => {
        it("should allow admin to get all users", (done) => {
            request.execute(app)
                .get("/api/admin/users")
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("users");
                    expect(res.body).to.have.property("totalPages");
                    expect(res.body.users).to.be.an("array");
                    done();
                });
        });

        it("should deny operator access", (done) => {
            request.execute(app)
                .get("/api/admin/users")
                .set("Authorization", `Bearer ${operatorToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });

        it("should deny driver access", (done) => {
            request.execute(app)
                .get("/api/admin/users")
                .set("Authorization", `Bearer ${driverToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });

        it("should filter by role", (done) => {
            request.execute(app)
                .get("/api/admin/users?role=admin")
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    res.body.users.forEach(user => {
                        expect(user.role).to.equal("admin");
                    });
                    done();
                });
        });

        it("should filter by isActive status", (done) => {
            request.execute(app)
                .get("/api/admin/users?isActive=true")
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    res.body.users.forEach(user => {
                        expect(user.isActive).to.equal(true);
                    });
                    done();
                });
        });

        it("should paginate correctly", (done) => {
            request.execute(app)
                .get("/api/admin/users?page=1&limit=2")
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.users.length).to.be.at.most(2);
                    done();
                });
        });
    });

    describe("GET /api/admin/users/:id", () => {
        it("should get single user by id", (done) => {
            request.execute(app)
                .get(`/api/admin/users/${operatorUser._id}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body._id).to.equal(operatorUser._id.toString());
                    expect(res.body.email).to.equal("operator@admintest.com");
                    done();
                });
        });

        it("should return 404 for non-existent user", (done) => {
            const fakeId = new mongoose.Types.ObjectId();
            request.execute(app)
                .get(`/api/admin/users/${fakeId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(404);
                    done();
                });
        });
    });

    describe("POST /api/admin/users", () => {
        it("should allow admin to create any role user", (done) => {
            request.execute(app)
                .post("/api/admin/users")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    name: "New Admin User",
                    email: "newadmin@admintest.com",
                    password: "password123",
                    role: "admin"
                })
                .end((err, res) => {
                    expect(res).to.have.status(201);
                    expect(res.body.user.role).to.equal("admin");
                    createdUserId = res.body.user.id;
                    done();
                });
        });

        it("should reject duplicate email", (done) => {
            request.execute(app)
                .post("/api/admin/users")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({
                    name: "Duplicate User",
                    email: "admin@admintest.com",
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

    describe("PUT /api/admin/users/:id", () => {
        it("should allow admin to update user", (done) => {
            request.execute(app)
                .put(`/api/admin/users/${operatorUser._id}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ name: "Updated Operator Name" })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.user.name).to.equal("Updated Operator Name");
                    done();
                });
        });

        it("should allow admin to deactivate user", (done) => {
            request.execute(app)
                .put(`/api/admin/users/${driverUser._id}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ isActive: false })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.user.isActive).to.equal(false);
                    
                    // Re-activate for other tests
                    request.execute(app)
                        .put(`/api/admin/users/${driverUser._id}`)
                        .set("Authorization", `Bearer ${adminToken}`)
                        .send({ isActive: true })
                        .end(() => done());
                });
        });

        it("should allow admin to change user role", (done) => {
            request.execute(app)
                .put(`/api/admin/users/${createdUserId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ role: "operator" })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.user.role).to.equal("operator");
                    done();
                });
        });
    });

    describe("DELETE /api/admin/users/:id", () => {
        let userToDelete;

        before(async () => {
            userToDelete = await User.create({
                name: "User To Delete",
                email: "deleteme@admintest.com",
                password: "password123",
                role: "driver",
                isActive: true
            });
        });

        it("should allow admin to delete user", (done) => {
            request.execute(app)
                .delete(`/api/admin/users/${userToDelete._id}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.message).to.include("deactivated");
                    done();
                });
        });

        it("should prevent self-deletion", (done) => {
            request.execute(app)
                .delete(`/api/admin/users/${adminUser._id}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.message).to.include("Cannot delete your own account");
                    done();
                });
        });
    });

    describe("POST /api/admin/users/:id/reset-password", () => {
        it("should allow admin to reset user password", (done) => {
            request.execute(app)
                .post(`/api/admin/users/${operatorUser._id}/reset-password`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ newPassword: "newpassword123" })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.message).to.include("reset successfully");
                    
                    // Verify new password works
                    request.execute(app)
                        .post("/api/auth/login")
                        .send({ email: "operator@admintest.com", password: "newpassword123" })
                        .end((err, res) => {
                            expect(res).to.have.status(200);
                            expect(res.body).to.have.property("accessToken");
                            done();
                        });
                });
        });

        it("should reject short password", (done) => {
            request.execute(app)
                .post(`/api/admin/users/${operatorUser._id}/reset-password`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ newPassword: "123" })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.message).to.include("at least 6");
                    done();
                });
        });
    });

    // ==================== DASHBOARD TESTS ====================

    describe("GET /api/admin/dashboard", () => {
        it("should return dashboard statistics", (done) => {
            request.execute(app)
                .get("/api/admin/dashboard")
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("users");
                    expect(res.body.users).to.have.property("total");
                    expect(res.body.users).to.have.property("byRole");
                    expect(res.body).to.have.property("ambulances");
                    expect(res.body.ambulances).to.have.property("total");
                    expect(res.body.ambulances).to.have.property("byStatus");
                    expect(res.body).to.have.property("incidents");
                    expect(res.body.incidents).to.have.property("total");
                    expect(res.body.incidents).to.have.property("byStatus");
                    done();
                });
        });

        it("should deny non-admin access", (done) => {
            request.execute(app)
                .get("/api/admin/dashboard")
                .set("Authorization", `Bearer ${operatorToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });
    });

    // ==================== REPORTS TESTS ====================

    describe("GET /api/admin/reports", () => {
        it("should generate incident report", (done) => {
            const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const endDate = new Date().toISOString();
            
            request.execute(app)
                .get(`/api/admin/reports?type=incidents&startDate=${startDate}&endDate=${endDate}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("reportType");
                    expect(res.body).to.have.property("dateRange");
                    done();
                });
        });

        it("should generate ambulance utilization report", (done) => {
            const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const endDate = new Date().toISOString();
            
            request.execute(app)
                .get(`/api/admin/reports?type=ambulance_utilization&startDate=${startDate}&endDate=${endDate}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.reportType).to.equal("ambulance_utilization");
                    done();
                });
        });

        it("should return report even without date range (placeholder)", (done) => {
            request.execute(app)
                .get("/api/admin/reports?type=incidents")
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("message");
                    done();
                });
        });
    });

    // ==================== SYSTEM CONFIG TESTS ====================

    describe("GET /api/admin/config", () => {
        it("should return system configuration", (done) => {
            request.execute(app)
                .get("/api/admin/config")
                .set("Authorization", `Bearer ${adminToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property("config");
                    expect(res.body.config).to.have.property("maxActiveIncidentsPerOperator");
                    expect(res.body.config).to.have.property("autoDispatchEnabled");
                    expect(res.body.config).to.have.property("gisBackendUrl");
                    done();
                });
        });

        it("should deny non-admin access to config", (done) => {
            request.execute(app)
                .get("/api/admin/config")
                .set("Authorization", `Bearer ${operatorToken}`)
                .end((err, res) => {
                    expect(res).to.have.status(403);
                    done();
                });
        });
    });
});
