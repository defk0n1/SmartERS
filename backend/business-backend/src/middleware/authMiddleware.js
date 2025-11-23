import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * auth(allowedRoles)
 * - allowedRoles: array of strings, e.g. ["operator","admin"]
 * - if empty array => just authenticate any logged user
 */
export const auth = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "No token" });

      const token = header.split(" ")[1];
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // attach minimal user info to req.user
      req.user = { id: payload.id, role: payload.role };

      // optionally load full user doc (without password)
      req.userDoc = await User.findById(payload.id).select("-password -refreshToken");

      // RBAC
      if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      return next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  };
};
