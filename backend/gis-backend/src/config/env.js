import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 5001;
export const ARCGIS_CLIENT_ID = process.env.ARCGIS_CLIENT_ID;
export const ARCGIS_CLIENT_SECRET = process.env.ARCGIS_CLIENT_SECRET;
export const INCIDENT_FEATURE_SERVICE = process.env.INCIDENT_FEATURE_SERVICE;
export const AMBULANCE_FEATURE_SERVICE = process.env.AMBULANCE_FEATURE_SERVICE;

