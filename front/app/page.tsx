'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login')
      } else {
        // Redirect based on role
        if (user.role === 'admin') {
          router.push('/admin/dashboard')
        } else if (user.role === 'operator') {
          router.push('/operator/dashboard')
        } else if (user.role === 'driver') {
          router.push('/driver/dashboard')
        }
      }
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
