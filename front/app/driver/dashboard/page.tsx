'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { incidentService } from '@/services/incident.service'
import { Incident } from '@/types'
import { SeverityBadge, StatusBadge } from '@/components/Badge'
import { format } from 'date-fns'
import { MapPinIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function DriverDashboard() {
  const { loading: authLoading } = useRequireAuth(['driver'])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      fetchAssignedIncidents()
    }
  }, [authLoading])

  const fetchAssignedIncidents = async () => {
    try {
      const data = await incidentService.getDriverAssigned()
      setIncidents(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch assigned incidents:', error)
      setIncidents([])
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
        <h1 className="text-3xl font-bold text-gray-900">Driver Dashboard</h1>
        <p className="text-gray-600 mt-1">Your assigned incidents</p>
      </div>

      {/* Active Assignment */}
      {incidents.filter((i) => i.status === 'assigned').length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Assignment</h2>
          <div className="grid grid-cols-1 gap-4">
            {incidents
              .filter((i) => i.status === 'assigned')
              .map((incident) => (
                <div key={incident._id} className="card border-l-4 border-emergency-500">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <SeverityBadge severity={incident.severity} />
                      <h3 className="text-lg font-medium text-gray-900 mt-2">
                        {incident.description}
                      </h3>
                    </div>
                    <StatusBadge status={incident.status} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Location</p>
                        <p className="text-sm text-gray-600">
                          {incident.address || 
                            `${incident.location.coordinates[1].toFixed(4)}, ${incident.location.coordinates[0].toFixed(4)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <ClockIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Assigned At</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(incident.updatedAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button className="btn-primary w-full">
                      View on Map
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Completed Incidents */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Completions</h2>
        <div className="card">
          <div className="space-y-4">
            {incidents
              .filter((i) => i.status === 'completed')
              .slice(0, 5)
              .map((incident) => (
                <div key={incident._id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <SeverityBadge severity={incident.severity} />
                      <p className="text-sm text-gray-900 mt-2">{incident.description}</p>
                    </div>
                    <StatusBadge status={incident.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Completed: {format(new Date(incident.updatedAt), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              ))}
            {incidents.filter((i) => i.status === 'completed').length === 0 && (
              <p className="text-center text-gray-500 py-8">No completed incidents yet</p>
            )}
          </div>
        </div>
      </div>

      {incidents.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-500">No incidents assigned to you yet</p>
        </div>
      )}
    </DashboardLayout>
  )
}
