import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Role hierarchy and permissions for SmartERS
 * - admin: Full access (back office) - manage users, ambulances, incidents, system config
 * - operator: Front office - manage incidents, dispatch ambulances, view all data
 * - driver: Front office - view assigned incidents, update own ambulance status
 */

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY = {
  driver: 1,
  operator: 2,
  admin: 3
};

/**
 * auth(allowedRoles)
 * - allowedRoles: array of strings, e.g. ["operator","admin"]
 * - if empty array => just authenticate any logged user
 */
export const auth = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = header.split(" ")[1];
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ message: "Token expired" });
        }
        return res.status(401).json({ message: "Invalid token" });
      }

      // attach minimal user info to req.user
      req.user = { id: payload.id, role: payload.role };

      // optionally load full user doc (without password)
      req.userDoc = await User.findById(payload.id).select("-password -refreshToken");
      
      if (!req.userDoc) {
        return res.status(401).json({ message: "User not found" });
      }

      // Check if user is active
      if (!req.userDoc.isActive) {
        return res.status(403).json({ message: "Account is deactivated" });
      }

      // RBAC - check if user has required role
      if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
        }
      }

      return next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  };
};

/**
 * Middleware to check if user has admin role
 */
export const adminOnly = auth(["admin"]);

/**
 * Middleware to check if user is operator or admin
 */
export const operatorOrAdmin = auth(["operator", "admin"]);

/**
 * Middleware to check if user is driver, operator, or admin
 */
export const anyAuthenticated = auth([]);

/**
 * Check if user has at least the specified role level
 * @param {string} minimumRole - The minimum role required
 */
export const hasMinimumRole = (minimumRole) => {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = header.split(" ")[1];
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
      }

      req.user = { id: payload.id, role: payload.role };
      req.userDoc = await User.findById(payload.id).select("-password -refreshToken");

      if (!req.userDoc || !req.userDoc.isActive) {
        return res.status(403).json({ message: "Access denied" });
      }

      const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
      const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({ message: "Forbidden - Insufficient role level" });
      }

      return next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  };
};

/**
 * Middleware to check resource ownership
 * Used for drivers to only access their own data
 */
export const ownerOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      // First authenticate
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = header.split(" ")[1];
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
      }

      req.user = { id: payload.id, role: payload.role };
      req.userDoc = await User.findById(payload.id).select("-password -refreshToken");

      if (!req.userDoc || !req.userDoc.isActive) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Admins can access anything
      if (req.user.role === "admin") {
        return next();
      }

      // Check ownership
      const ownerId = await getResourceOwnerId(req);
      if (ownerId && ownerId.toString() === req.user.id) {
        return next();
      }

      return res.status(403).json({ message: "Forbidden - Not the owner" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  };
};

