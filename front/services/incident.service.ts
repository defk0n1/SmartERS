import api from '@/lib/api-client'
import { Incident, CreateIncidentData, PaginatedResponse, DispatchData } from '@/types'

export const incidentService = {
  async getAll(params?: {
    page?: number
    limit?: number
    status?: string
    severity?: string
    startDate?: string
    endDate?: string
  }): Promise<{ incidents: Incident[]; totalPages: number; currentPage: number; total: number }> {
    const { data } = await api.get('/api/incidents', { params })
    return data
  },

  async getById(id: string): Promise<Incident> {
    const { data } = await api.get(`/api/incidents/${id}`)
    return data
  },

  async create(incidentData: CreateIncidentData): Promise<Incident> {
    const { data } = await api.post('/api/incidents', incidentData)
    return data
  },

  async update(id: string, incidentData: Partial<Incident>): Promise<Incident> {
    const { data } = await api.put(`/api/incidents/${id}`, incidentData)
    return data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/api/incidents/${id}`)
  },

  async dispatch(dispatchData: DispatchData): Promise<any> {
    const { data } = await api.post('/api/incidents/dispatch', dispatchData)
    return data
  },

  async getDriverAssigned(): Promise<Incident[]> {
    const { data } = await api.get('/api/incidents/my-assignments')
    return data
  },
}
