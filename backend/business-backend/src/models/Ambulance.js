import mongoose from "mongoose";

const ambulanceSchema = new mongoose.Schema({
    plateNumber: {
        type: String,
        required: true,
        unique: true,
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    status: {
        type: String,
        enum: ["available", "en-route", "busy"],
        default: "available",
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0],
        },
    },
}, { timestamps: true });

// Create 2dsphere index for geospatial queries
ambulanceSchema.index({ location: "2dsphere" });

const Ambulance = mongoose.model("Ambulance", ambulanceSchema);
export default Ambulance;