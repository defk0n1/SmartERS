'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export function useRequireAuth(allowedRoles?: string[]) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login')
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.push('/unauthorized')
      }
    }
  }, [user, loading, router, allowedRoles])

  return { user, loading }
}
