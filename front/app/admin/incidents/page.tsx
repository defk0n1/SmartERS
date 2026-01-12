'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { incidentService } from '@/services/incident.service'
import { ambulanceService } from '@/services/ambulance.service'
import { Incident, Ambulance } from '@/types'
import { StatusBadge, SeverityBadge } from '@/components/Badge'
import Modal from '@/components/Modal'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { PlusIcon, MapPinIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function IncidentsPage() {
  const { loading: authLoading } = useRequireAuth(['admin', 'operator'])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [formData, setFormData] = useState({
    description: '',
    severity: 'medium',
    latitude: '',
    longitude: '',
    address: '',
  })

  useEffect(() => {
    if (!authLoading) {
      fetchIncidents()
      fetchAmbulances()
    }
  }, [authLoading])

  const fetchIncidents = async () => {
    try {
      const response = await incidentService.getAll({ page: 1, limit: 100 })
      setIncidents(response.incidents || [])
    } catch (error) {
      toast.error('Failed to fetch incidents')
      setIncidents([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAmbulances = async () => {
    try {
      const response = await ambulanceService.getAvailable()
      setAmbulances(response.ambulances || [])
    } catch (error) {
      console.error('Failed to fetch ambulances:', error)
      setAmbulances([])
    }
  }

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await incidentService.create({
        description: formData.description,
        severity: formData.severity as any,
        location: {
          type: 'Point',
          coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
        },
        address: formData.address,
      })
      toast.success('Incident created successfully')
      setIsCreateModalOpen(false)
      setFormData({ description: '', severity: 'medium', latitude: '', longitude: '', address: '' })
      fetchIncidents()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create incident')
    }
  }

  const handleUpdateIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIncident) return

    try {
      await incidentService.update(selectedIncident._id, {
        description: formData.description,
        severity: formData.severity as any,
        address: formData.address,
      })
      toast.success('Incident updated successfully')
      setIsEditModalOpen(false)
      setSelectedIncident(null)
      fetchIncidents()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update incident')
    }
  }

  const handleDeleteIncident = async (id: string) => {
    if (!confirm('Are you sure you want to delete this incident?')) return

    try {
      await incidentService.delete(id)
      toast.success('Incident deleted successfully')
      fetchIncidents()
    } catch (error: any) {
      toast.error('Failed to delete incident')
    }
  }

  const handleDispatch = async (ambulanceId: string) => {
    if (!selectedIncident) return

    try {
      await incidentService.dispatch({
        incidentId: selectedIncident._id,
        ambulanceId,
      })
      toast.success('Ambulance dispatched successfully')
      setIsDispatchModalOpen(false)
      setSelectedIncident(null)
      fetchIncidents()
      fetchAmbulances()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to dispatch ambulance')
    }
  }

  const openEditModal = (incident: Incident) => {
    setSelectedIncident(incident)
    setFormData({
      description: incident.description,
      severity: incident.severity,
      latitude: incident.location.coordinates[1].toString(),
      longitude: incident.location.coordinates[0].toString(),
      address: incident.address || '',
    })
    setIsEditModalOpen(true)
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Incidents</h1>
          <p className="text-gray-600 mt-1">Manage emergency incidents</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Incident
        </button>
      </div>

      {/* Incidents Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No incidents found. Click "Create Incident" to add the first incident.
                  </td>
                </tr>
              ) : (
                incidents.map((incident) => (
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
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        {incident.location.coordinates[1].toFixed(4)}, {incident.location.coordinates[0].toFixed(4)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(incident.createdAt), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      {incident.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedIncident(incident)
                            setIsDispatchModalOpen(true)
                          }}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Dispatch
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(incident)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <PencilIcon className="h-5 w-5 inline" />
                      </button>
                      <button
                        onClick={() => handleDeleteIncident(incident._id)}
                        className="text-emergency-600 hover:text-emergency-900"
                      >
                        <TrashIcon className="h-5 w-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Incident Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Incident"
      >
        <form onSubmit={handleCreateIncident} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              required
              className="input-field"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              className="input-field"
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                required
                className="input-field"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                required
                className="input-field"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address (Optional)</label>
            <input
              type="text"
              className="input-field"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Incident
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Incident Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Incident"
      >
        <form onSubmit={handleUpdateIncident} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              required
              className="input-field"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              className="input-field"
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              className="input-field"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Update Incident
            </button>
          </div>
        </form>
      </Modal>

      {/* Dispatch Modal */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title="Dispatch Ambulance"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select an ambulance to dispatch to this incident:
          </p>
          <div className="space-y-2">
            {ambulances.length === 0 ? (
              <p className="text-sm text-gray-500">No available ambulances</p>
            ) : (
              ambulances.map((ambulance) => (
                <button
                  key={ambulance._id}
                  onClick={() => handleDispatch(ambulance._id)}
                  className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="font-medium">{ambulance.plateNumber}</div>
                  <div className="text-sm text-gray-500">
                    <StatusBadge status={ambulance.status} />
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end pt-4">
            <button onClick={() => setIsDispatchModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
