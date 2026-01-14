'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { incidentService } from '@/services/incident.service'
import { ambulanceService } from '@/services/ambulance.service'
import { Incident, Ambulance } from '@/types'
import { gisService } from '@/services/gis.service'
import ArcGISMapIframe from '@/components/ArcGISMapIframe'
import { io, Socket } from 'socket.io-client'
import { StatusBadge, SeverityBadge } from '@/components/Badge'
import Modal from '@/components/Modal'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { PlusIcon, MapPinIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function OperatorIncidentsPage() {
  const { loading: authLoading } = useRequireAuth(['operator'])
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
  const [nearest, setNearest] = useState<any[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const BUSINESS_API_URL = process.env.NEXT_PUBLIC_BUSINESS_API_URL || 'http://localhost:5000'

  useEffect(() => {
    if (!authLoading) {
      fetchIncidents()
      fetchAmbulances()
      const s = io(BUSINESS_API_URL, { transports: ['websocket', 'polling'] })
      s.on('connect', () => setSocket(s))
      s.on('disconnect', () => setSocket(null))
      return () => { s.disconnect() }
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

  const handleDispatch = async (ambulanceId: string) => {
    if (!selectedIncident) return

    try {
      await incidentService.dispatch({ incidentId: selectedIncident._id, ambulanceId })
      toast.success('Ambulance dispatched successfully')
      setIsDispatchModalOpen(false)
      setSelectedIncident(null)
      fetchIncidents()
      fetchAmbulances()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to dispatch ambulance')
    }
  }

  const handleAutoDispatch = async () => {
    if (!selectedIncident) return
    try {
      await incidentService.dispatch({ incidentId: selectedIncident._id, autoSelect: true })
      toast.success('Ambulance auto-selected and dispatched')
      setIsDispatchModalOpen(false)
      setSelectedIncident(null)
      fetchIncidents()
      fetchAmbulances()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to auto-dispatch ambulance')
    }
  }

  const recommendClosest = async () => {
    if (!selectedIncident) return
    try {
      const lat = selectedIncident.location.coordinates[1]
      const lon = selectedIncident.location.coordinates[0]
      const res = await gisService.findNearestAmbulances(lat, lon, 5, 'available', true)
      const list = res.data || res
      const enriched = (list || []).map((item: any) => {
        const plate = item?.attributes?.plateNumber || item?.plateNumber
        const businessMatch = ambulances.find(a => a.plateNumber === plate)
        const businessAmbulanceId = item?.attributes?.businessId || businessMatch?._id
        return { ...item, businessAmbulanceId }
      })
      setNearest(enriched)
      toast.success('Nearest ambulances loaded')
    } catch (error) {
      console.error('Nearest ambulances error', error)
      toast.error('Failed to load nearest ambulances')
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await incidentService.update(id, { status: status as any })
      toast.success('Incident status updated')
      fetchIncidents()
    } catch (error: any) {
      toast.error('Failed to update incident status')
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
          <h1 className="text-3xl font-bold text-gray-900">Incidents Management</h1>
          <p className="text-gray-600 mt-1">Create, manage, and dispatch incidents</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Incident
        </button>
      </div>

      {/* Incidents Table */}
      <div className="card overflow-hidden">
        {socket && (
          <div className="mb-4" style={{ height: 320 }}>
            <ArcGISMapIframe
              incidents={incidents}
              ambulances={ambulances}
              socket={socket}
              simulationRoute={null}
            />
          </div>
        )}
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
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">{incident.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={incident.status}
                        onChange={(e) => handleUpdateStatus(incident._id, e.target.value)}
                        className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="assigned">Assigned</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        {incident.address || `${incident.location.coordinates[1].toFixed(4)}, ${incident.location.coordinates[0].toFixed(4)}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(incident.createdAt), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
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
                      {incident.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedIncident(incident)
                            recommendClosest()
                          }}
                          className="text-green-600 hover:text-green-800 ml-2"
                        >
                          Recommend Closest
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(incident)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <PencilIcon className="h-5 w-5 inline" />
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
              placeholder="Describe the emergency..."
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
              placeholder="Street address (optional)"
            />
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
                placeholder="36.8065"
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
                placeholder="10.1815"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn-secondary"
            >
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

      {/* Dispatch Ambulance Modal */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title="Dispatch Ambulance"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Incident Details</h4>
            <p className="text-sm text-gray-600">{selectedIncident?.description}</p>
            <div className="mt-2 flex items-center space-x-2">
              <SeverityBadge severity={selectedIncident?.severity || 'low'} />
              <span className="text-sm text-gray-500">
                {selectedIncident?.address || 'No address'}
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Available Ambulances</h4>
            {ambulances.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No available ambulances at the moment
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ambulances.map((ambulance) => (
                  <button
                    key={ambulance._id}
                    onClick={() => handleDispatch(ambulance._id)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{ambulance.plateNumber}</p>
                        <p className="text-sm text-gray-500">
                          {ambulance.driver ? `Driver assigned` : 'No driver'}
                        </p>
                      </div>
                      <StatusBadge status={ambulance.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {nearest.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Recommended Closest Ambulances</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {nearest.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const id = (item as any).businessAmbulanceId
                      if (id) {
                        handleDispatch(id)
                      } else {
                        handleAutoDispatch()
                      }
                    }}
                    className="w-full text-left p-3 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{item.attributes?.plateNumber || item.plateNumber || 'Ambulance'}</p>
                        <p className="text-sm text-gray-500">Estimated time: {Math.round(item.estimatedTimeMinutes || item.actualTimeMinutes || 0)} min</p>
                      </div>
                      <span className="text-sm text-gray-600">{(item.distance || item.actualDistanceMiles || 0).toFixed ? (item.distance || item.actualDistanceMiles).toFixed(2) : item.distance} km</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setIsDispatchModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
