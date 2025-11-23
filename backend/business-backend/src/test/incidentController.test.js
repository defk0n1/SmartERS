import * as chai from "chai";
import chaiHttp from "chai-http";
import mongoose from "mongoose";
import app from "../app.js";
import Incident from "../models/Incident.js";
import User from "../models/User.js";

chai.use(chaiHttp);
import { request } from 'chai-http';
const { expect } = chai;

describe("Incident API", () => {
    let testUser;
    let incidentId;

    before(async () => {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);

        // Create a test user
        testUser = await User.create({
            name: "Test User",
            email: "testuser@example.com",
            password: "password123",
            role: "operator",
        });

        console.log("Test User ID:", testUser._id); // Log to verify
    });

    after(async () => {
        // Clean up test data
        await Incident.deleteMany({});
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    it("should create a new incident", (done) => {
        request.execute(app)
            .post("/api/incidents")
            .send({
                location: { type: "Point", coordinates: [0, 0] },
                severity: "high",
                description: "Test incident",
                reportedBy: testUser._id, // Use the created user
            })
            .end((err, res) => {
                expect(res).to.have.status(201);
                expect(res.body).to.have.property("_id");
                incidentId = res.body._id;
                done();
            });
    });

    it("should get all incidents", (done) => {
        request.execute(app)
            .get("/api/incidents")
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.be.an("array");
                done();
            });
    });

    it("should get incident by id", (done) => {
        request.execute(app)
            .get(`/api/incidents/${incidentId}`)
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.have.property("_id", incidentId);
                done();
            });
    });

    it("should update an incident", (done) => {
        request.execute(app)
            .put(`/api/incidents/${incidentId}`)
            .send({ severity: "medium" })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.severity).to.equal("medium");
                done();
            });
    });

    it("should delete an incident", (done) => {
        request.execute(app)
            .delete(`/api/incidents/${incidentId}`)
            .end((err, res) => {
                expect(res).to.have.status(200);
                done();
            });
    });
});