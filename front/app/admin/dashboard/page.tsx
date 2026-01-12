'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import StatCard from '@/components/StatCard'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { adminService } from '@/services/admin.service'
import { DashboardStats } from '@/types'
import { 
  UserGroupIcon, 
  TruckIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline'

export default function AdminDashboard() {
  const { loading: authLoading } = useRequireAuth(['admin'])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      fetchDashboard()
    }
  }, [authLoading])

  const fetchDashboard = async () => {
    try {
      const data = await adminService.getDashboard()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome to SmartERS Admin Dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Users"
          value={stats?.users.total || 0}
          icon={<UserGroupIcon className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Total Incidents"
          value={stats?.incidents.total || 0}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="red"
        />
        <StatCard
          title="Total Ambulances"
          value={stats?.ambulances.total || 0}
          icon={<TruckIcon className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Available Ambulances"
          value={stats?.ambulances.byStatus?.available || 0}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="purple"
        />
      </div>

      {/* Incidents & Ambulances Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents by Status */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Incidents by Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pending</span>
              <span className="badge bg-yellow-100 text-yellow-800">
                {stats?.incidents.byStatus?.pending || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Assigned</span>
              <span className="badge bg-blue-100 text-blue-800">
                {stats?.incidents.byStatus?.assigned || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completed</span>
              <span className="badge bg-green-100 text-green-800">
                {stats?.incidents.byStatus?.completed || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Incidents by Severity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Incidents by Severity</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Critical</span>
              <span className="badge bg-red-100 text-red-800">
                {stats?.incidents.bySeverity?.critical || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">High</span>
              <span className="badge bg-orange-100 text-orange-800">
                {stats?.incidents.bySeverity?.high || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Medium</span>
              <span className="badge bg-yellow-100 text-yellow-800">
                {stats?.incidents.bySeverity?.medium || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Low</span>
              <span className="badge bg-green-100 text-green-800">
                {stats?.incidents.bySeverity?.low || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
