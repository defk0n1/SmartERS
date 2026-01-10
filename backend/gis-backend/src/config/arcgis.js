import axios from "axios";
import { ARCGIS_CLIENT_ID, ARCGIS_CLIENT_SECRET } from "./env.js";

let cachedToken = null;
let tokenExpiry = 0;

export async function getArcGISToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiry) return cachedToken;

  if (!ARCGIS_CLIENT_ID || !ARCGIS_CLIENT_SECRET) {
    throw new Error("ArcGIS client ID or secret not set in env");
  }

  try {
    const response = await axios.post(
      "https://www.arcgis.com/sharing/rest/oauth2/token/",
      new URLSearchParams({
        client_id: ARCGIS_CLIENT_ID,
        client_secret: ARCGIS_CLIENT_SECRET,
        grant_type: "client_credentials",
        f: "json" // ArcGIS likes 'f=json' to return JSON
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    if (!response.data.access_token) {
      console.error("ArcGIS response:", response.data);
      throw new Error("No access_token returned from ArcGIS");
    }

    cachedToken = response.data.access_token;
    tokenExpiry = now + response.data.expires_in * 1000; // milliseconds

    console.log("ArcGIS Token obtained:", cachedToken.substring(0, 10) + "...");
    return cachedToken;
  } catch (err) {
    console.error("ArcGIS token error:", err.response?.data || err.message);
    throw new Error("Failed to get ArcGIS token");
  }
}
