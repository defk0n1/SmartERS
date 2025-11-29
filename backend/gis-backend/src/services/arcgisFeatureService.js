import axios from "axios";
import { getArcGISToken } from "../config/arcgis.js";
import { INCIDENT_FEATURE_SERVICE, AMBULANCE_FEATURE_SERVICE } from "../config/env.js";


export async function addFeature(feature, featureServiceUrl) {
    const token = await getArcGISToken();

    try {
        const response = await axios.post(
            `${featureServiceUrl}/addFeatures`,
            new URLSearchParams({
                f: "json",
                features: JSON.stringify([feature]),
                token
            })
        );
        return response.data;
    } catch (error) {
        console.error("Add feature error:", error.message);
        throw error;
    }
}

export async function queryFeatures(featureServiceUrl, whereClause = "1=1") {
    const token = await getArcGISToken();

    try {
        const response = await axios.get(
            `${featureServiceUrl}/query`,
            {
                params: {
                    f: "json",
                    where: whereClause,
                    outFields: "*",
                    token
                }
            }
        );
        return response.data.features;
    } catch (error) {
        console.log("Query features error:", error.messages);
        throw error;
    }
}

/**
 * Generic update features
 */
export async function updateFeatures(features, featureServiceUrl) {
    const token = await getArcGISToken();

    try {
        const response = await axios.post(
            `${featureServiceUrl}/updateFeatures`,
            new URLSearchParams({
                f: "json",
                features: JSON.stringify(features),
                token
            })
        );
        return response.data;
    } catch (error) {
        console.error("Update features error:", error.message);
        throw error;
    }
}

/**
 * Incidents shortcuts
 */
export const addIncident = (feature) => addFeature(feature, INCIDENT_FEATURE_SERVICE);
export const queryIncidents = (where = "1=1") => queryFeatures(INCIDENT_FEATURE_SERVICE, where);
export const updateIncident = (features) => updateFeatures(features, INCIDENT_FEATURE_SERVICE);

/**
 * Ambulances shortcuts
 */
export const addAmbulance = (feature) => addFeature(feature, AMBULANCE_FEATURE_SERVICE);
export const queryAmbulances = (where = "1=1") => queryFeatures(AMBULANCE_FEATURE_SERVICE, where);
export const updateAmbulance = (features) => updateFeatures(features, AMBULANCE_FEATURE_SERVICE);