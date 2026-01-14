'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { ambulanceService } from '@/services/ambulance.service'
import { adminService } from '@/services/admin.service'
import { Ambulance, User } from '@/types'
import { StatusBadge } from '@/components/Badge'
import Modal from '@/components/Modal'
import MapPicker from '@/components/MapPicker'
import toast from 'react-hot-toast'
import { PlusIcon, MapPinIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function AmbulancesPage() {
  const { user, loading: authLoading } = useRequireAuth(['admin', 'operator'])
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [allDrivers, setAllDrivers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedAmbulance, setSelectedAmbulance] = useState<Ambulance | null>(null)
  const [formData, setFormData] = useState({
    plateNumber: '',
    latitude: '',
    longitude: '',
    driver: '',
  })
  const [createPickCoord, setCreatePickCoord] = useState<{ latitude: number; longitude: number } | null>(null)
  const [editPickCoord, setEditPickCoord] = useState<{ latitude: number; longitude: number } | null>(null)

  useEffect(() => {
    if (!authLoading) {
      fetchAmbulances()
      fetchDrivers()
    }
  }, [authLoading])

  const fetchAmbulances = async () => {
    try {
      const response = await ambulanceService.getAll()
      setAmbulances(response.ambulances || [])
    } catch (error) {
      toast.error('Failed to fetch ambulances')
      setAmbulances([])
    } finally {
      setLoading(false)
    }
  }

  const fetchDrivers = async () => {
    try {
      const response = await adminService.getUsers({ role: 'driver', limit: 100 })
      // Backend returns { users, totalPages, currentPage, total }
      const allDriversList = (response as any).users || []
      setAllDrivers(allDriversList)
      // Compute drivers currently assigned to any ambulance
      const assignedDriverIds = new Set<string>(
        ambulances
          .map((a) => (typeof a.driver === 'string' ? a.driver : a.driver?._id))
          .filter((id): id is string => Boolean(id))
      )
      const availableDrivers = allDriversList.filter((driver: User) => !assignedDriverIds.has(driver._id))
      setDrivers(availableDrivers)
    } catch (error) {
      console.error('Failed to fetch drivers:', error)
      setDrivers([])
      setAllDrivers([])
    }
  }

  // Recompute available drivers if ambulances or allDrivers change
  useEffect(() => {
    const assignedDriverIds = new Set<string>(
      ambulances
        .map((a) => (typeof a.driver === 'string' ? a.driver : a.driver?._id))
        .filter((id): id is string => Boolean(id))
    )
    const availableDrivers = allDrivers.filter((driver: User) => !assignedDriverIds.has(driver._id))
    setDrivers(availableDrivers)
  }, [ambulances, allDrivers])

  const handleCreateAmbulance = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: any = {
        plateNumber: formData.plateNumber,
        location: {
          type: 'Point',
          coordinates: [
            parseFloat(formData.longitude || String(createPickCoord?.longitude || '')),
            parseFloat(formData.latitude || String(createPickCoord?.latitude || '')),
          ],
        },
      }
      
      if (formData.driver) {
        payload.driver = formData.driver
      }
      
      await ambulanceService.create(payload)
      toast.success('Ambulance created successfully')
      setIsCreateModalOpen(false)
      setFormData({ plateNumber: '', latitude: '', longitude: '', driver: '' })
      setCreatePickCoord(null)
      fetchAmbulances()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create ambulance')
    }
  }

  const handleUpdateAmbulance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAmbulance) return

    try {
      const payload: any = {
        plateNumber: formData.plateNumber,
      }
      
      // Include driver (can be null to unassign)
      const currentDriverId = typeof selectedAmbulance.driver === 'string' 
        ? selectedAmbulance.driver 
        : selectedAmbulance.driver?._id || ''
      
      if (formData.driver !== currentDriverId) {
        payload.driver = formData.driver || null
      }
      
      // Include location if changed
      if (formData.latitude && formData.longitude) {
        payload.location = {
          type: 'Point',
          coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
        }
      }
      
      await ambulanceService.update(selectedAmbulance._id, payload)
      toast.success('Ambulance updated successfully')
      setIsEditModalOpen(false)
      setSelectedAmbulance(null)
      fetchAmbulances()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update ambulance')
    }
  }

  const handleDeleteAmbulance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ambulance?')) return

    try {
      await ambulanceService.delete(id)
      toast.success('Ambulance deleted successfully')
      fetchAmbulances()
    } catch (error: any) {
      toast.error('Failed to delete ambulance')
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await ambulanceService.update(id, { status: status as any })
      toast.success('Ambulance status updated')
      fetchAmbulances()
    } catch (error: any) {
      toast.error('Failed to update ambulance status')
    }
  }

  const openEditModal = (ambulance: Ambulance) => {
    setSelectedAmbulance(ambulance)
    const driverId = typeof ambulance.driver === 'string' ? ambulance.driver : ambulance.driver?._id || ''
    setFormData({
      plateNumber: ambulance.plateNumber,
      latitude: ambulance.location.coordinates[1].toString(),
      longitude: ambulance.location.coordinates[0].toString(),
      driver: driverId,
    })
    setEditPickCoord({ latitude: ambulance.location.coordinates[1], longitude: ambulance.location.coordinates[0] })
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
          <h1 className="text-3xl font-bold text-gray-900">Ambulances</h1>
          <p className="text-gray-600 mt-1">Manage ambulance fleet</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Ambulance
        </button>
      </div>

      {/* Ambulances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ambulances.length === 0 ? (
          <div className="col-span-full card">
            <p className="text-center text-gray-500 py-8">
              No ambulances found. Click "Add Ambulance" to add the first ambulance.
            </p>
          </div>
        ) : (
          ambulances.map((ambulance) => (
            <div key={ambulance._id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{ambulance.plateNumber}</h3>
                  <div className="mt-2">
                    <StatusBadge status={ambulance.status} />
                  </div>
                </div>
                <MapPinIcon className="h-6 w-6 text-gray-400" />
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Location:</span>{' '}
                  {ambulance.location.coordinates[1].toFixed(4)}, {ambulance.location.coordinates[0].toFixed(4)}
                </div>
                {ambulance.driver && (
                  <div>
                    <span className="font-medium">Driver:</span>{' '}
                    {typeof ambulance.driver === 'string' 
                      ? ambulance.driver 
                      : ambulance.driver.name || ambulance.driver.email}
                  </div>
                )}
                {!ambulance.driver && (
                  <div className="text-gray-400 italic">
                    No driver assigned
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Change Status
                  </label>
                  <select
                    className="input-field text-sm"
                    value={ambulance.status}
                    onChange={(e) => handleStatusChange(ambulance._id, e.target.value)}
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="en-route">En Route</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
                
                {user?.role === 'admin' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(ambulance)}
                      className="flex-1 btn-secondary text-sm py-2"
                    >
                      <PencilIcon className="h-4 w-4 inline mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAmbulance(ambulance._id)}
                      className="flex-1 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm py-2"
                    >
                      <TrashIcon className="h-4 w-4 inline mr-1" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Ambulance Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Ambulance"
      >
        <form onSubmit={handleCreateAmbulance} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plate Number
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="AMB-001"
              value={formData.plateNumber}
              onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pick Current Position</label>
              <MapPicker
                value={createPickCoord}
                onChange={(coord) => {
                  setCreatePickCoord(coord)
                  setFormData({ ...formData, latitude: String(coord.latitude), longitude: String(coord.longitude) })
                }}
                height={240}
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
                  placeholder="36.8065"
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
                  placeholder="10.1815"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
              </div>
            </div>
          </div>
          {user?.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign Driver (Optional)
              </label>
              <select
                className="input-field"
                value={formData.driver}
                onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
              >
                <option value="">No Driver</option>
                {drivers.map((driver) => (
                  <option key={driver._id} value={driver._id}>
                    {driver.name} ({driver.email})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Ambulance
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Ambulance Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Ambulance"
      >
        <form onSubmit={handleUpdateAmbulance} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plate Number
            </label>
            <input
              type="text"
              required
              className="input-field"
              value={formData.plateNumber}
              onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adjust Position</label>
              <MapPicker
                value={editPickCoord}
                onChange={(coord) => {
                  setEditPickCoord(coord)
                  setFormData({ ...formData, latitude: String(coord.latitude), longitude: String(coord.longitude) })
                }}
                height={240}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  placeholder="36.8065"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  placeholder="10.1815"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
              </div>
            </div>
          </div>
          {user?.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign Driver
              </label>
              <select
                className="input-field"
                value={formData.driver}
                onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
              >
                <option value="">No Driver</option>
                {/* Show available drivers plus the currently assigned driver */}
                {allDrivers
                  .filter((driver) => {
                    const assignedDriverIds = new Set<string>(
                      ambulances
                        .map((a) => (typeof a.driver === 'string' ? a.driver : a.driver?._id))
                        .filter((id): id is string => Boolean(id))
                    )
                    const currentDriverId = selectedAmbulance
                      ? (typeof selectedAmbulance.driver === 'string' ? selectedAmbulance.driver : selectedAmbulance.driver?._id)
                      : undefined
                    return !assignedDriverIds.has(driver._id) || driver._id === formData.driver || driver._id === currentDriverId
                  })
                  .map((driver) => (
                    <option key={driver._id} value={driver._id}>
                      {driver.name} ({driver.email})
                    </option>
                  ))
                }
              </select>
            </div>
          )}
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Update Ambulance
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
