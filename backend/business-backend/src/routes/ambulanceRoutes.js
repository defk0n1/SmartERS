import express from "express";
const router = express.Router();

// Test route
router.get("/", (req, res) => {
  res.send("Ambulance routes are working");
});

export default router;
