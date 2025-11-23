import express from "express";
const router = express.Router();

// Test route
router.get("/", (req, res) => {
  res.send("Auth routes are working");
});

export default router;
