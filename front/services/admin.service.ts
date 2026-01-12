import api from '@/lib/api-client'
import { User, PaginatedResponse, DashboardStats } from '@/types'

export const adminService = {
  // User Management
  async getUsers(params?: {
    page?: number
    limit?: number
    role?: string
    isActive?: boolean
  }): Promise<PaginatedResponse<User>> {
    const { data } = await api.get('/api/admin/users', { params })
    return data
  },

  async getUserById(id: string): Promise<User> {
    const { data } = await api.get(`/api/admin/users/${id}`)
    return data
  },

  async createUser(userData: {
    name: string
    email: string
    password: string
    role: string
  }): Promise<User> {
    const { data } = await api.post('/api/admin/users', userData)
    return data
  },

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const { data } = await api.put(`/api/admin/users/${id}`, userData)
    return data
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/api/admin/users/${id}`)
  },

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await api.post(`/api/admin/users/${id}/reset-password`, { newPassword })
  },

  // Dashboard
  async getDashboard(): Promise<DashboardStats> {
    const { data } = await api.get('/api/admin/dashboard')
    return data
  },

  async getReports(params?: {
    startDate?: string
    endDate?: string
  }): Promise<any> {
    const { data } = await api.get('/api/admin/reports', { params })
    return data
  },

  async getConfig(): Promise<any> {
    const { data } = await api.get('/api/admin/config')
    return data
  },
}
