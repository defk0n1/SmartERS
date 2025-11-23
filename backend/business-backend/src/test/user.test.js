import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import { expect } from "chai";

import User from "../models/User.js";
import connectDB from "../config/db.js";

describe("User Model Test", function () {
    before(async () => {
        await connectDB();
        await User.deleteMany({});
    });

    after(async () => {
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    it("should create a user successfully", async () => {
        const userData = {
            name: "Test Operator",
            email: "operator@test.com",
            password: "123456",
            role: "operator",
        };

        const user = new User(userData);
        const savedUser = await user.save();

        expect(savedUser._id).to.exist;
        expect(savedUser.name).to.equal(userData.name);
        expect(savedUser.role).to.equal("operator");
        expect(savedUser.password).to.not.equal(userData.password); // hashed
    });

    it("should not allow duplicate email", async () => {
        const userData = {
            name: "Duplicate User",
            email: "operator@test.com",
            password: "123456",
            role: "driver",
        };

        let error = null;
        try {
            const user = new User(userData);
            await user.save();
        } catch (err) {
            error = err;
        }
        expect(error).to.exist;
        expect(error.code || error.name).to.satisfy(
            (val) => val === 11000 || val === "MongoServerError"
        );
    });
});