import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import User from "../models/User.js";
import Ambulance from "../models/Ambulance.js";
import Incident from "../models/Incident.js";

async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI);
}

async function seed() {
    console.log("🌱 Seeding database...");

    await User.deleteMany({});
    await Ambulance.deleteMany({});
    await Incident.deleteMany({});

    const operator = await User.create({
        name: "Admin Operator",
        email: "op@test.com",
        password: "123456",
        role: "operator"
    });

    const driver = await User.create({
        name: "Driver 1",
        email: "driver@test.com",
        password: "123456",
        role: "driver"
    });

    const ambulance = await Ambulance.create({
        plateNumber: "ABC123",
        driver: driver._id,
        status: "available",
        location: { type: "Point", coordinates: [10, 10] }
    });

    await Incident.create({
        description: "Seed Test Incident",
        severity: "medium",
        location: { type: "Point", coordinates: [11, 11] },
        assignedAmbulance: ambulance._id,
        reportedBy: operator._id
    });

    console.log("✅ Seeding complete.");
    process.exit(0);
}

await connectDB();
await seed();
