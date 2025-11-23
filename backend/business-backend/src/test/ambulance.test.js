import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import { expect } from "chai";


import Ambulance from "../models/Ambulance.js";
import User from "../models/User.js";
import connectDB from "../config/db.js";

describe("Ambulance Model Test", function () {
    let driver;

    before(async () => {
        await connectDB();
        await Ambulance.deleteMany({});
        await User.deleteMany({});

        driver = await new User({
            name: "Driver Test",
            email: "driver@test.com",
            password: "123456",
            role: "driver",
        }).save();
    });

    after(async () => {
        await Ambulance.deleteMany({});
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    it("should create an ambulance", async () => {
        const ambulance = new Ambulance({
            plateNumber: "ABC123",
            driver: driver._id,
            status: "available",
            location: { type: "Point", coordinates: [10, 20] },
        });

        const saved = await ambulance.save();

        expect(saved._id).to.exist;
        expect(saved.driver.toString()).to.equal(driver._id.toString());
        expect(saved.status).to.equal("available");
    });
});