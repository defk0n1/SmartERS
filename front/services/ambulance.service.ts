import api from '@/lib/api-client'
import { Ambulance, CreateAmbulanceData } from '@/types'

export const ambulanceService = {
  async getAll(): Promise<{ ambulances: Ambulance[]; totalPages: number; currentPage: number; total: number }> {
    const { data } = await api.get('/api/ambulances')
    return data
  },

  async getAvailable(): Promise<{ ambulances: Ambulance[] }> {
    const { data } = await api.get('/api/ambulances/available')
    return data
  },

  async getById(id: string): Promise<Ambulance> {
    const { data } = await api.get(`/api/ambulances/${id}`)
    return data
  },

  async create(ambulanceData: CreateAmbulanceData): Promise<Ambulance> {
    const { data } = await api.post('/api/ambulances', ambulanceData)
    return data
  },

  async update(id: string, ambulanceData: Partial<Ambulance>): Promise<Ambulance> {
    const { data } = await api.put(`/api/ambulances/${id}`, ambulanceData)
    return data
  },

  async updateLocation(
    id: string,
    location: { type: 'Point'; coordinates: [number, number] }
  ): Promise<Ambulance> {
    const { data } = await api.put(`/api/ambulances/${id}/location`, { location })
    return data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/ambulances/${id}`)
  },

  async getMyAmbulance(): Promise<Ambulance> {
    const { data } = await api.get('/api/ambulances/my-ambulance')
    return data
  },
}
