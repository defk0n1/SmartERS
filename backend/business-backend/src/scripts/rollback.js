import fs from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MIGRATION_COLLECTION = "migrations_run";

async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI);
}

async function rollback() {
    const last = await mongoose.connection
        .collection(MIGRATION_COLLECTION)
        .find()
        .sort({ _id: -1 })
        .limit(1)
        .toArray();

    if (last.length === 0) {
        console.log("⚠ No migrations to roll back.");
        process.exit(0);
    }

    const file = last[0].name;
    console.log(`⏪ Rolling back: ${file}`);

    const migration = await import(`../migrations/${file}`);
    await migration.down(mongoose);

    await mongoose.connection.collection(MIGRATION_COLLECTION).deleteOne({ name: file });

    console.log(`✅ Rolled back: ${file}`);
    process.exit(0);
}

await connectDB();
await rollback();
