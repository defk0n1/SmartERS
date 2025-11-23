import express from "express";
import {
    getAllAmbulances,
    getAmbulanceById,
    createAmbulance,
    updateAmbulance,
    deleteAmbulance,
} from "../controllers/ambulanceController.js";

const router = express.Router();

router.get("/", getAllAmbulances);
router.get("/:id", getAmbulanceById);
router.post("/", createAmbulance);
router.put("/:id", updateAmbulance);
router.delete("/:id", deleteAmbulance);

export default router;
