import api, { apiClient } from '@/lib/api-client'
import { AuthResponse, LoginCredentials, RegisterData, User } from '@/types'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await api.post('/api/auth/login', credentials)
    apiClient.setAccessToken(data.accessToken)
    return data
  },

  async register(userData: RegisterData): Promise<AuthResponse> {
    const { data } = await api.post('/api/auth/register', userData)
    apiClient.setAccessToken(data.accessToken)
    return data
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout')
    } finally {
      apiClient.clearTokens()
    }
  },

  async getCurrentUser(): Promise<User> {
    const { data } = await api.get('/api/auth/me')
    return data
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    const { data } = await api.get('/api/auth/refresh')
    apiClient.setAccessToken(data.accessToken)
    return data
  },
}
