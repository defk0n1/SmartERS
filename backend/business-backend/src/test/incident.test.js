import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import { expect } from "chai";

import Incident from "../models/Incident.js";
import Ambulance from "../models/Ambulance.js";
import User from "../models/User.js";
import connectDB from "../config/db.js";

describe("Incident Model Test", function () {
    let operator, driver, ambulance;

    before(async () => {
        await connectDB();
        await Incident.deleteMany({});
        await Ambulance.deleteMany({});
        await User.deleteMany({});

        operator = await new User({
            name: "Operator Test",
            email: "operator2@test.com",
            password: "123456",
            role: "operator",
        }).save();

        driver = await new User({
            name: "Driver Test",
            email: "driver2@test.com",
            password: "123456",
            role: "driver",
        }).save();

        ambulance = await new Ambulance({
            plateNumber: "DEF456",
            driver: driver._id,
            status: "available",
            location: { type: "Point", coordinates: [0, 0] },
        }).save();
    });

    after(async () => {
        await Incident.deleteMany({});
        await Ambulance.deleteMany({});
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    it("should create an incident", async () => {
        const incident = new Incident({
            description: "Test Emergency",
            location: { type: "Point", coordinates: [5, 5] },
            severity: "high",
            assignedAmbulance: ambulance._id,
            reportedBy: operator._id,
        });

        const saved = await incident.save();

        expect(saved._id).to.exist;
        expect(saved.assignedAmbulance.toString()).to.equal(ambulance._id.toString());
        expect(saved.severity).to.equal("high");
    });
});
