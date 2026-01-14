"use client"

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import ArcGISMapIframe from '@/components/ArcGISMapIframe'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { incidentService } from '@/services/incident.service'
import { ambulanceService } from '@/services/ambulance.service'
import { adminService } from '@/services/admin.service'
import { Incident, Ambulance, User } from '@/types'
import { io, Socket } from 'socket.io-client'

const BUSINESS_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
const GIS_API_URL = process.env.NEXT_PUBLIC_GIS_URL || 'http://localhost:5001'

export default function DispatcherPage() {
  const { user, loading: authLoading } = useRequireAuth(['admin', 'operator'])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [gisSocket, setGisSocket] = useState<Socket | null>(null)

  const [selectedIncident, setSelectedIncident] = useState<string>('')
  const [selectedAmbulance, setSelectedAmbulance] = useState<string>('')
  const [selectedDriver, setSelectedDriver] = useState<string>('')

  useEffect(() => {
    if (!authLoading && user) {
      fetchData()
      initializeSockets()
    }
    return () => {
      socket?.disconnect()
      gisSocket?.disconnect()
    }
  }, [authLoading, user])

  async function fetchData() {
    try {
      const [incRes, ambRes, usersRes] = await Promise.all([
        incidentService.getAll({ page: 1, limit: 100 }),
        ambulanceService.getAll(),
        adminService.getUsers({ role: 'driver', limit: 200 })
      ])
      setIncidents(incRes.incidents || [])
      setAmbulances(ambRes.ambulances || [])
      setDrivers(usersRes.data || [])
    } catch (err) {
      console.error('Failed to fetch dispatcher data:', err)
      setIncidents([])
      setAmbulances([])
      setDrivers([])
    }
  }

  function initializeSockets() {
    const businessSocket = io(BUSINESS_API_URL, { transports: ['websocket', 'polling'] })
    businessSocket.on('connect', () => {
      user && businessSocket.emit('join:role', user.role)
    })
    businessSocket.on('incident:update', (incident: Incident) => {
      setIncidents(prev => {
        const idx = prev.findIndex(i => i._id === incident._id)
        if (idx >= 0) { const copy = [...prev]; copy[idx] = incident; return copy }
        return [incident, ...prev]
      })
    })
    businessSocket.on('ambulance:update', (ambulance: Ambulance) => {
      setAmbulances(prev => {
        const idx = prev.findIndex(a => a._id === ambulance._id)
        if (idx >= 0) { const copy = [...prev]; copy[idx] = ambulance; return copy }
        return [ambulance, ...prev]
      })
    })
    setSocket(businessSocket)

    const gisSocketConn = io(GIS_API_URL, { transports: ['websocket', 'polling'] })
    gisSocketConn.on('ambulanceUpdate', (data: any) => {
      if (data.id && data.position) {
        setAmbulances(prev => {
          const idx = prev.findIndex(a => a._id === data.id)
          if (idx >= 0) {
            const copy = [...prev]
            copy[idx] = {
              ...copy[idx],
              location: { type: 'Point', coordinates: [Number(data.position.longitude), Number(data.position.latitude)] }
            }
            return copy
          }
          return prev
        })
      }
    })
    setGisSocket(gisSocketConn)
  }

  async function handleAssignDriver() {
    if (!selectedAmbulance || !selectedDriver) return
    try {
      const updated = await ambulanceService.update(selectedAmbulance, { driver: selectedDriver } as any)
      setAmbulances(prev => prev.map(a => a._id === updated._id ? updated : a))
      setSelectedDriver('')
    } catch (err) {
      console.error('Failed to assign driver:', err)
    }
  }

  async function handleDispatch() {
    if (!selectedIncident || !selectedAmbulance) return
    try {
      await incidentService.dispatch({ incidentId: selectedIncident, ambulanceId: selectedAmbulance })
      // Optimistically update incident status
      setIncidents(prev => prev.map(i => i._id === selectedIncident ? { ...i, status: 'assigned', assignedAmbulance: selectedAmbulance } : i))
      setSelectedIncident('')
    } catch (err) {
      console.error('Failed to dispatch ambulance:', err)
    }
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card h-[600px] p-0 overflow-hidden">
            <ArcGISMapIframe
              incidents={incidents}
              ambulances={ambulances.filter(a => a.status !== 'offline')}
              socket={gisSocket}
              simulationRoute={null}
              simulationStats={[]}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Assign Driver to Ambulance</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Ambulance</label>
                <select className="mt-1 block w-full border-gray-300 rounded-md" value={selectedAmbulance} onChange={e => setSelectedAmbulance(e.target.value)}>
                  <option value="">-- Select Ambulance --</option>
                  {ambulances.map(a => (<option key={a._id} value={a._id}>{a.plateNumber}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Driver</label>
                <select className="mt-1 block w-full border-gray-300 rounded-md" value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
                  <option value="">-- Select Driver --</option>
                  {drivers.map(d => (<option key={d._id} value={d._id}>{d.name} ({d.email})</option>))}
                </select>
              </div>
              <button className="btn btn-primary w-full" onClick={handleAssignDriver}>Assign Driver</button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Dispatch Ambulance to Incident</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Incident</label>
                <select className="mt-1 block w-full border-gray-300 rounded-md" value={selectedIncident} onChange={e => setSelectedIncident(e.target.value)}>
                  <option value="">-- Select Incident --</option>
                  {incidents.filter(i => i.status !== 'completed').map(i => (<option key={i._id} value={i._id}>{i.description}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Ambulance</label>
                <select className="mt-1 block w-full border-gray-300 rounded-md" value={selectedAmbulance} onChange={e => setSelectedAmbulance(e.target.value)}>
                  <option value="">-- Select Ambulance --</option>
                  {ambulances.filter(a => a.status === 'available').map(a => (<option key={a._id} value={a._id}>{a.plateNumber}</option>))}
                </select>
              </div>
              <button className="btn btn-primary w-full" onClick={handleDispatch}>Dispatch</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
