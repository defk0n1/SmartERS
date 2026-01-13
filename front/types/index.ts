export type UserRole = 'admin' | 'operator' | 'driver'

export interface User {
  _id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: User
  accessToken: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  role?: UserRole
}

export interface Incident {
  _id: string
  description: string
  location: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
  address?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'assigned' | 'completed'
  reportedBy: string
  assignedAmbulance?: string
  createdAt: string
  updatedAt: string
}

export interface CreateIncidentData {
  description: string
  location: {
    type: 'Point'
    coordinates: [number, number]
  }
  address?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface Ambulance {
  _id: string
  plateNumber: string
  status: 'available' | 'busy' | 'en-route' | 'offline'
  location: {
    type: 'Point'
    coordinates: [number, number]
  }
  driver?: string | User
  assignedDriver?: string
  currentIncident?: string
  createdAt: string
  updatedAt: string
}

export interface CreateAmbulanceData {
  plateNumber: string
  location: {
    type: 'Point'
    coordinates: [number, number]
  }
}

export interface DashboardStats {
  users: {
    total: number
    active: number
    byRole: {
      admin?: number
      operator?: number
      driver?: number
    }
  }
  ambulances: {
    total: number
    byStatus: {
      available?: number
      busy?: number
      'en-route'?: number
      offline?: number
    }
  }
  incidents: {
    total: number
    byStatus: {
      pending?: number
      assigned?: number
      completed?: number
    }
    bySeverity: {
      low?: number
      medium?: number
      high?: number
      critical?: number
    }
    last24Hours: number
  }
  performance: {
    avgResponseTime: string
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface GISRoute {
  route?: any[] // Array of route coordinates
  path?: any[] // Alternative property name
  geometry?: any[] // Alternative property name
  distance?: number
  time?: number
  [key: string]: any // Allow other properties
}

export interface DispatchData {
  incidentId: string
  ambulanceId: string
}
