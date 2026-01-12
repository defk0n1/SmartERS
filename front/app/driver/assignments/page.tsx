'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { incidentService } from '@/services/incident.service'
import { Incident } from '@/types'
import { SeverityBadge, StatusBadge } from '@/components/Badge'
import { format } from 'date-fns'
import { MapPinIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function DriverAssignmentsPage() {
  const { loading: authLoading } = useRequireAuth(['driver'])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

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

  const handleUpdateStatus = async (incidentId: string, status: string) => {
    setUpdatingId(incidentId)
    try {
      await incidentService.update(incidentId, { status })
      toast.success(status === 'completed' ? 'Incident marked as completed' : 'Status updated')
      fetchAssignedIncidents()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status')
    } finally {
      setUpdatingId(null)
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
        <h1 className="text-3xl font-bold text-gray-900">My Assignments</h1>
        <p className="text-gray-600 mt-1">Manage your assigned incidents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {incidents.map((incident) => (
          <div key={incident._id} className="card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <SeverityBadge severity={incident.severity} />
                <h3 className="text-lg font-medium text-gray-900 mt-2">
                  {incident.description}
                </h3>
              </div>
              <StatusBadge status={incident.status} />
            </div>

            <div className="space-y-3 mb-4">
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

              <div className="text-sm text-gray-600">
                <span className="font-medium">Assigned:</span>{' '}
                {format(new Date(incident.updatedAt), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {incident.status !== 'completed' && (
                <button 
                  onClick={() => handleUpdateStatus(incident._id, 'completed')}
                  disabled={updatingId === incident._id}
                  className="flex-1 btn-primary flex items-center justify-center"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {updatingId === incident._id ? 'Updating...' : 'Mark Complete'}
                </button>
              )}
              {incident.status === 'completed' && (
                <div className="flex-1 bg-green-50 text-green-700 rounded-lg px-4 py-2 text-center font-medium">
                  <CheckCircleIcon className="h-5 w-5 inline mr-2" />
                  Completed
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {incidents.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-500">No incidents assigned to you</p>
        </div>
      )}
    </DashboardLayout>
  )
}
