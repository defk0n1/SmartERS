import axios, { AxiosInstance } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // For cookies (refresh token)
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        // Don't retry refresh endpoint itself or if already retried
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/refresh')) {
          originalRequest._retry = true

          try {
            const { data } = await this.client.post('/api/auth/refresh')
            this.setAccessToken(data.accessToken)
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
            return this.client(originalRequest)
          } catch (refreshError) {
            // Clear tokens but don't redirect - let AuthContext handle it
            this.clearTokens()
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('accessToken')
  }

  setAccessToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token)
    }
  }

  clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken')
    }
  }

  get instance(): AxiosInstance {
    return this.client
  }
}

export const apiClient = new ApiClient()
export default apiClient.instance
