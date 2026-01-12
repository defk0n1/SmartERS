import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["admin", "operator", "driver"],
        default: "operator",
    },
    // Driver-specific fields
    assignedAmbulance: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ambulance",
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    refreshToken: { type: String, default: null }

}, { timestamps: true });

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare Password method for login
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Virtual to check if user is admin
userSchema.virtual("isAdmin").get(function() {
    return this.role === "admin";
});

// Virtual to check if user is operator
userSchema.virtual("isOperator").get(function() {
    return this.role === "operator";
});

// Virtual to check if user is driver
userSchema.virtual("isDriver").get(function() {
    return this.role === "driver";
});

const User = mongoose.model("User", userSchema);
export default User;