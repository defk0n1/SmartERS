import axios from 'axios'
import { GISRoute } from '@/types'

const GIS_API_URL = process.env.NEXT_PUBLIC_GIS_API_URL || 'http://localhost:5001'

export const gisService = {
  async getRoute(
    start: { longitude: number; latitude: number },
    end: { longitude: number; latitude: number }
  ): Promise<GISRoute> {
    const { data } = await axios.post(`${GIS_API_URL}/api/gis/getRoute`, { start, end })
    return data
  },

  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number }> {
    const { data } = await axios.post(`${GIS_API_URL}/api/gis/geocode`, { address })
    return data
  },

  async reverseGeocode(latitude: number, longitude: number): Promise<any> {
    const { data } = await axios.post(`${GIS_API_URL}/api/gis/reverse-geocode`, { latitude, longitude })
    return data
  },

  /**
   * Start ambulance simulation
   * Returns route stats for each ambulance (distance in km, ETA in minutes, speed in km/h)
   */
  async startSimulation(
    ambulances: { id: string; route: { longitude: number; latitude: number }[] }[],
    speed = 1 // points per second
  ): Promise<
    {
      id: string
      totalDistanceKm: number
      etaMin: number
      speedKmh: number
    }[]
  > {
    const { data } = await axios.post(`${GIS_API_URL}/gis/ambulance/startSimulation`, {
      ambulances,
      speed
    })
    // The backend should calculate route stats for each ambulance and return
    return data
  },

  async stopSimulation(): Promise<void> {
    await axios.post(`${GIS_API_URL}/gis/ambulance/stopSimulation`)
  },

  async findNearestAmbulances(
    latitude: number,
    longitude: number,
    limit = 5,
    status: 'available' | 'busy' | 'en-route' | 'offline' | undefined = 'available',
    includeRoute = true
  ): Promise<any> {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      limit: String(limit),
      status: status || '',
      includeRoute: String(includeRoute)
    })
    const { data } = await axios.get(`${GIS_API_URL}/ambulances/nearest?${params.toString()}`)
    return data
  }
}
