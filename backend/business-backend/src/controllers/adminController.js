import User from "../models/User.js";
import Ambulance from "../models/Ambulance.js";
import Incident from "../models/Incident.js";

/**
 * Admin Controller - Back Office Operations
 * These endpoints are only accessible by users with admin role
 */

// ==================== USER MANAGEMENT ====================

/**
 * Get all users with pagination and filtering
 */
export const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, role, isActive, search } = req.query;
        
        const filter = {};
        if (role) filter.role = role;
        if (isActive !== undefined) filter.isActive = isActive === "true";
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        const users = await User.find(filter)
            .select("-password -refreshToken")
            .populate("assignedAmbulance", "plateNumber status")
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(filter);

        res.status(200).json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Get single user by ID
 */
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select("-password -refreshToken")
            .populate("assignedAmbulance", "plateNumber status location");
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Create new user (admin can create any role including admin)
 */
export const createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        // Check if email exists
        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // Admin can create any role
        const allowedRoles = ["admin", "operator", "driver"];
        const chosenRole = allowedRoles.includes(role) ? role : "operator";

        const user = await User.create({
            name,
            email,
            password,
            role: chosenRole
        });

        res.status(201).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Update user (admin can update any field)
 */
export const updateUser = async (req, res) => {
    try {
        const { name, email, role, isActive, assignedAmbulance } = req.body;
        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Prevent admin from deactivating themselves
        if (userId === req.user.id && isActive === false) {
            return res.status(400).json({ message: "Cannot deactivate your own account" });
        }

        // Update fields
        if (name) user.name = name;
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email, _id: { $ne: userId } });
            if (emailExists) {
                return res.status(400).json({ message: "Email already in use" });
            }
            user.email = email;
        }
        if (role) user.role = role;
        if (isActive !== undefined) user.isActive = isActive;
        if (assignedAmbulance !== undefined) user.assignedAmbulance = assignedAmbulance;

        await user.save();

        res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                assignedAmbulance: user.assignedAmbulance
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Delete user (soft delete by deactivating, or hard delete)
 */
export const deleteUser = async (req, res) => {
    try {
        const { hard } = req.query;
        const userId = req.params.id;

        // Prevent admin from deleting themselves
        if (userId === req.user.id) {
            return res.status(400).json({ message: "Cannot delete your own account" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (hard === "true") {
            // Hard delete - remove from database
            await User.findByIdAndDelete(userId);
            res.status(200).json({ message: "User permanently deleted" });
        } else {
            // Soft delete - deactivate
            user.isActive = false;
            user.refreshToken = null;
            await user.save();
            res.status(200).json({ message: "User deactivated" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Reset user password (admin function)
 */
export const resetUserPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const userId = req.params.id;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.password = newPassword;
        user.refreshToken = null; // Force re-login
        await user.save();

        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==================== DASHBOARD & ANALYTICS ====================

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (req, res) => {
    try {
        // User stats
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const usersByRole = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        // Ambulance stats
        const totalAmbulances = await Ambulance.countDocuments();
        const ambulancesByStatus = await Ambulance.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        // Incident stats
        const totalIncidents = await Incident.countDocuments();
        const incidentsByStatus = await Incident.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        const incidentsBySeverity = await Incident.aggregate([
            { $group: { _id: "$severity", count: { $sum: 1 } } }
        ]);

        // Recent activity (last 24 hours)
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentIncidents = await Incident.countDocuments({ createdAt: { $gte: last24Hours } });

        // Calculate average response time (placeholder - would need actual timestamps)
        // This would require tracking dispatch time and arrival time
        const avgResponseTime = "N/A - Requires GIS integration";

        res.status(200).json({
            users: {
                total: totalUsers,
                active: activeUsers,
                byRole: usersByRole.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            },
            ambulances: {
                total: totalAmbulances,
                byStatus: ambulancesByStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            },
            incidents: {
                total: totalIncidents,
                byStatus: incidentsByStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                bySeverity: incidentsBySeverity.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                last24Hours: recentIncidents
            },
            performance: {
                avgResponseTime
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Get activity logs / audit trail (placeholder for future implementation)
 */
export const getActivityLogs = async (req, res) => {
    try {
        // This would require an ActivityLog model in a full implementation
        res.status(200).json({
            message: "Activity logging feature - placeholder for future implementation",
            logs: []
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * Generate reports (placeholder)
 */
export const generateReport = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;

        // Placeholder for report generation
        // In a full implementation, this would generate various reports:
        // - Incident reports by zone/time
        // - Ambulance utilization reports
        // - Response time analytics
        // - Resource allocation recommendations

        res.status(200).json({
            message: "Report generation - placeholder for future implementation",
            reportType: type || "general",
            dateRange: {
                start: startDate || "not specified",
                end: endDate || "not specified"
            },
            data: {}
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// ==================== SYSTEM CONFIGURATION ====================

/**
 * Get system configuration (placeholder)
 */
export const getSystemConfig = async (req, res) => {
    try {
        // Placeholder for system configuration
        res.status(200).json({
            message: "System configuration - placeholder",
            config: {
                gisBackendUrl: process.env.GIS_BACKEND_URL || "http://localhost:5001",
                maxActiveIncidentsPerOperator: 10,
                autoDispatchEnabled: false,
                notificationsEnabled: true
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
