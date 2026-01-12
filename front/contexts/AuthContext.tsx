'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/types'
import { authService } from '@/services/auth.service'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Only check auth if we have a token
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      if (token) {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      // Clear invalid token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
      }
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password })
      setUser(response.user)
      toast.success('Login successful!')
      
      // Redirect based on role
      if (response.user.role === 'admin') {
        router.push('/admin/dashboard')
      } else if (response.user.role === 'operator') {
        router.push('/operator/dashboard')
      } else if (response.user.role === 'driver') {
        router.push('/driver/dashboard')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed')
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
      setUser(null)
      toast.success('Logged out successfully')
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
