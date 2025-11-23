import fs from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MIGRATION_COLLECTION = "migrations_run";

async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("📡 Connected to DB");
}

async function runMigrations() {
    const ran = await mongoose.connection.collection(MIGRATION_COLLECTION).find().toArray();

    const ranNames = new Set(ran.map(m => m.name));

    const files = fs.readdirSync("migrations").sort();

    for (const file of files) {
        if (ranNames.has(file)) {
            console.log(`⏭ Already ran: ${file}`);
            continue;
        }

        console.log(`🚀 Running migration: ${file}`);
        const migration = await import(`../migrations/${file}`);

        await migration.up(mongoose);

        await mongoose.connection.collection(MIGRATION_COLLECTION).insertOne({ name: file });
        console.log(`✅ Completed: ${file}`);
    }

    console.log("🎉 All migrations completed.");
    process.exit(0);
}

await connectDB();
await runMigrations();
