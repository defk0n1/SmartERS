'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import StatCard from '@/components/StatCard'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { incidentService } from '@/services/incident.service'
import { ambulanceService } from '@/services/ambulance.service'
import { Incident, Ambulance } from '@/types'
import { StatusBadge, SeverityBadge } from '@/components/Badge'
import { 
  TruckIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

export default function OperatorDashboard() {
  const { loading: authLoading } = useRequireAuth(['operator'])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      fetchData()
    }
  }, [authLoading])

  const fetchData = async () => {
    try {
      const [incidentsRes, ambulancesRes] = await Promise.all([
        incidentService.getAll({ page: 1, limit: 100 }),
        ambulanceService.getAll(),
      ])
      setIncidents(incidentsRes.incidents || [])
      setAmbulances(ambulancesRes.ambulances || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setIncidents([])
      setAmbulances([])
    } finally {
      setLoading(false)
    }
  }

  const activeIncidents = incidents.filter((i) => i.status !== 'completed')
  const pendingIncidents = incidents.filter((i) => i.status === 'pending')
  const availableAmbulances = ambulances.filter((a) => a.status === 'available')

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
        <h1 className="text-3xl font-bold text-gray-900">Operator Dashboard</h1>
        <p className="text-gray-600 mt-1">Incident management and ambulance dispatch</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <StatCard
          title="Active Incidents"
          value={activeIncidents.length}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="red"
        />
        <StatCard
          title="Pending Dispatch"
          value={pendingIncidents.length}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="yellow"
        />
        <StatCard
          title="Available Ambulances"
          value={availableAmbulances.length}
          icon={<TruckIcon className="h-6 w-6" />}
          color="green"
        />
      </div>

      {/* Recent Incidents */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Incidents</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No incidents found
                  </td>
                </tr>
              ) : 
                incidents.slice(0, 10).map((incident) => (
                <tr key={incident._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {incident.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={incident.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(incident.createdAt), 'MMM dd, HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
