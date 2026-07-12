import jwt from "jsonwebtoken";
import { config } from "../config.js";

export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded; // Store user data from token in request
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: "Forbidden - insufficient role permissions",
      allowedRoles
    });
  }

  return next();
};
