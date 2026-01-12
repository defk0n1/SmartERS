import axios from 'axios'
import { GISRoute } from '@/types'

const GIS_API_URL = process.env.NEXT_PUBLIC_GIS_API_URL || 'http://localhost:5001'

export const gisService = {
  async getRoute(start: { longitude: number; latitude: number }, end: { longitude: number; latitude: number }): Promise<GISRoute> {
    const { data } = await axios.post(`${GIS_API_URL}/api/gis/route`, { start, end })
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

  async startSimulation(ambulances: any[], speed?: number): Promise<void> {
    await axios.post(`${GIS_API_URL}/gis/ambulance/startSimulation`, { ambulances, speed })
  },

  async stopSimulation(): Promise<void> {
    await axios.post(`${GIS_API_URL}/gis/ambulance/stopSimulation`)
  },
}
