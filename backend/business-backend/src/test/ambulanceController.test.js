import * as chai from "chai";
import chaiHttp from "chai-http";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import app from "../app.js";
import Ambulance from "../models/Ambulance.js";
import User from "../models/User.js";

chai.use(chaiHttp);
import { request } from "chai-http";
const { expect } = chai;

describe("Ambulance Controller API Tests", function() {
  this.timeout(10000);

  let adminToken, operatorToken, driverToken;
  let adminUser, operatorUser, driverUser;
  let ambulanceId;

  before(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Clean up
    await User.deleteMany({ email: { $in: ["ambtest-admin@test.com", "ambtest-operator@test.com", "ambtest-driver@test.com"] } });
    await Ambulance.deleteMany({ plateNumber: { $regex: /^TEST-AMB/ } });

    // Create test users
    adminUser = await User.create({
      name: "Amb Test Admin",
      email: "ambtest-admin@test.com",
      password: "admin123",
      role: "admin",
      isActive: true
    });

    operatorUser = await User.create({
      name: "Amb Test Operator",
      email: "ambtest-operator@test.com",
      password: "operator123",
      role: "operator",
      isActive: true
    });

    driverUser = await User.create({
      name: "Amb Test Driver",
      email: "ambtest-driver@test.com",
      password: "driver123",
      role: "driver",
      isActive: true
    });

    // Login to get tokens
    const adminLogin = await new Promise((resolve) => {
      request.execute(app)
        .post("/api/auth/login")
        .send({ email: "ambtest-admin@test.com", password: "admin123" })
        .end((err, res) => resolve(res));
    });
    adminToken = adminLogin.body.accessToken;

    const operatorLogin = await new Promise((resolve) => {
      request.execute(app)
        .post("/api/auth/login")
        .send({ email: "ambtest-operator@test.com", password: "operator123" })
        .end((err, res) => resolve(res));
    });
    operatorToken = operatorLogin.body.accessToken;

    const driverLogin = await new Promise((resolve) => {
      request.execute(app)
        .post("/api/auth/login")
        .send({ email: "ambtest-driver@test.com", password: "driver123" })
        .end((err, res) => resolve(res));
    });
    driverToken = driverLogin.body.accessToken;
  });

  after(async () => {
    await User.deleteMany({ email: { $in: ["ambtest-admin@test.com", "ambtest-operator@test.com", "ambtest-driver@test.com"] } });
    await Ambulance.deleteMany({ plateNumber: { $regex: /^TEST-AMB/ } });
    await mongoose.connection.close();
  });

  // ==================== CREATE AMBULANCE TESTS ====================

  describe("POST /api/ambulances", () => {
    it("should allow admin to create ambulance", (done) => {
      request.execute(app)
        .post("/api/ambulances")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          plateNumber: "TEST-AMB-001",
          status: "available",
          location: { type: "Point", coordinates: [-73.9857, 40.7484] }
        })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property("_id");
          expect(res.body.plateNumber).to.equal("TEST-AMB-001");
          ambulanceId = res.body._id;
          done();
        });
    });

    it("should reject duplicate plate number", (done) => {
      request.execute(app)
        .post("/api/ambulances")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          plateNumber: "TEST-AMB-001",
          status: "available"
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.include("already exists");
          done();
        });
    });

    it("should deny operator from creating ambulance", (done) => {
      request.execute(app)
        .post("/api/ambulances")
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          plateNumber: "TEST-AMB-002",
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
          plateNumber: "TEST-AMB-003",
          status: "available"
        })
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    });

    it("should reject unauthenticated request", (done) => {
      request.execute(app)
        .post("/api/ambulances")
        .send({
          plateNumber: "TEST-AMB-004",
          status: "available"
        })
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });
  });

  // ==================== GET AMBULANCES TESTS ====================

  describe("GET /api/ambulances", () => {
    it("should allow admin to get all ambulances", (done) => {
      request.execute(app)
        .get("/api/ambulances")
        .set("Authorization", `Bearer ${adminToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property("ambulances");
          expect(res.body.ambulances).to.be.an("array");
          done();
        });
    });

    it("should allow operator to get all ambulances", (done) => {
      request.execute(app)
        .get("/api/ambulances")
        .set("Authorization", `Bearer ${operatorToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property("ambulances");
          done();
        });
    });

    it("should allow driver to get all ambulances", (done) => {
      request.execute(app)
        .get("/api/ambulances")
        .set("Authorization", `Bearer ${driverToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          done();
        });
    });
  });

  // ==================== GET AVAILABLE AMBULANCES ====================

  describe("GET /api/ambulances/available", () => {
    it("should allow operator to get available ambulances", (done) => {
      request.execute(app)
        .get("/api/ambulances/available")
        .set("Authorization", `Bearer ${operatorToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property("ambulances");
          // All returned should be available
          res.body.ambulances.forEach(amb => {
            expect(amb.status).to.equal("available");
          });
          done();
        });
    });

    it("should deny driver from getting available ambulances", (done) => {
      request.execute(app)
        .get("/api/ambulances/available")
        .set("Authorization", `Bearer ${driverToken}`)
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    });
  });

  // ==================== GET SINGLE AMBULANCE ====================

  describe("GET /api/ambulances/:id", () => {
    it("should allow any authenticated user to get ambulance by id", (done) => {
      request.execute(app)
        .get(`/api/ambulances/${ambulanceId}`)
        .set("Authorization", `Bearer ${driverToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body._id).to.equal(ambulanceId);
          done();
        });
    });

    it("should return 404 for non-existent ambulance", (done) => {
      const fakeId = new mongoose.Types.ObjectId();
      request.execute(app)
        .get(`/api/ambulances/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          done();
        });
    });
  });

  // ==================== UPDATE AMBULANCE ====================

  describe("PUT /api/ambulances/:id", () => {
    it("should allow admin to update ambulance", (done) => {
      request.execute(app)
        .put(`/api/ambulances/${ambulanceId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "en-route" })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.status).to.equal("en-route");
          done();
        });
    });

    it("should allow operator to update ambulance", (done) => {
      request.execute(app)
        .put(`/api/ambulances/${ambulanceId}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({ status: "available" })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.status).to.equal("available");
          done();
        });
    });

    it("should reject invalid status value", (done) => {
      request.execute(app)
        .put(`/api/ambulances/${ambulanceId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "invalid_status" })
        .end((err, res) => {
          expect(res).to.have.status(500);
          done();
        });
    });
  });

  // ==================== UPDATE LOCATION ====================

  describe("PUT /api/ambulances/:id/location", () => {
    it("should allow admin to update ambulance location", (done) => {
      request.execute(app)
        .put(`/api/ambulances/${ambulanceId}/location`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          coordinates: [-74.0060, 40.7128]
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.location.coordinates[0]).to.equal(-74.0060);
          done();
        });
    });

    it("should deny operator from updating location", (done) => {
      request.execute(app)
        .put(`/api/ambulances/${ambulanceId}/location`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .send({
          coordinates: [-74.0060, 40.7128]
        })
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    });
  });

  // ==================== DELETE AMBULANCE ====================

  describe("DELETE /api/ambulances/:id", () => {
    let deleteAmbulanceId;

    before(async () => {
      // Create ambulance to delete
      const res = await new Promise((resolve) => {
        request.execute(app)
          .post("/api/ambulances")
          .set("Authorization", `Bearer ${adminToken}`)
          .send({
            plateNumber: "TEST-AMB-DELETE",
            status: "available"
          })
          .end((err, res) => resolve(res));
      });
      deleteAmbulanceId = res.body._id;
    });

    it("should deny operator from deleting ambulance", (done) => {
      request.execute(app)
        .delete(`/api/ambulances/${deleteAmbulanceId}`)
        .set("Authorization", `Bearer ${operatorToken}`)
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    });

    it("should deny driver from deleting ambulance", (done) => {
      request.execute(app)
        .delete(`/api/ambulances/${deleteAmbulanceId}`)
        .set("Authorization", `Bearer ${driverToken}`)
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    });

    it("should allow admin to delete available ambulance", (done) => {
      request.execute(app)
        .delete(`/api/ambulances/${deleteAmbulanceId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.message).to.include("deleted");
          done();
        });
    });

    it("should prevent deleting non-available ambulance", async () => {
      // Set ambulance to busy
      await Ambulance.findByIdAndUpdate(ambulanceId, { status: "busy" });

      const res = await new Promise((resolve) => {
        request.execute(app)
          .delete(`/api/ambulances/${ambulanceId}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .end((err, res) => resolve(res));
      });

      expect(res).to.have.status(400);
      expect(res.body.message).to.include("not available");

      // Reset status
      await Ambulance.findByIdAndUpdate(ambulanceId, { status: "available" });
    });
  });
});
