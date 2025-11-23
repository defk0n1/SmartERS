import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
        },
    },
    severity: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        default: "medium",
    },
    status: {
        type: String,
        enum: ["pending", "assigned", "completed"],
        default: "pending",
    },
    assignedAmbulance: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ambulance",
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true });

// Geospatial index for mapping and routing
incidentSchema.index({ location: "2dsphere" });

const Incident = mongoose.model("Incident", incidentSchema);
export default Incident;
