import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI);
}

async function clear() {
    console.log("⚠ WARNING: This will delete ALL data in the database!");

    const collections = await mongoose.connection.db.collections();

    for (const col of collections) {
        console.log(`🗑 Dropping: ${col.collectionName}`);
        await col.drop().catch(() => {});
    }

    console.log("🔥 Database wiped clean.");
    process.exit(0);
}

await connectDB();
await clear();
