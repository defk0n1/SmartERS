import axios from "axios";
import { ARCGIS_CLIENT_ID, ARCGIS_CLIENT_SECRET } from "./env.js";

let cachedToken = null;
let tokenExpiry = 0;

export async function getArcGISToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiry) return cachedToken;

  try {
    const response = await axios.post(
      "https://www.arcgis.com/sharing/rest/oauth2/token/",
      new URLSearchParams({
        client_id: ARCGIS_CLIENT_ID,
        client_secret: ARCGIS_CLIENT_SECRET,
        grant_type: "client_credentials"
      })
    );

    cachedToken = response.data.access_token;
    tokenExpiry = now + response.data.expires_in * 1000; // milliseconds

    return cachedToken;
  } catch (err) {
    console.error("ArcGIS token error:", err.message);
    throw new Error("Failed to get ArcGIS token");
  }
}
