import express from "express";
const router = express.Router();

// Test route
router.get("/", (req, res) => {
  res.send("Incident routes are working");
});

export default router;
