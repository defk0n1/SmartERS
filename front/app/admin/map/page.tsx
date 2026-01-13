'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import ArcGISMapIframe from '@/components/ArcGISMapIframe'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { io, Socket } from 'socket.io-client'
import { incidentService } from '@/services/incident.service'
import { ambulanceService } from '@/services/ambulance.service'
import { Incident, Ambulance } from '@/types'
import { StatusBadge, SeverityBadge } from '@/components/Badge'

const BUSINESS_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
const GIS_API_URL = process.env.NEXT_PUBLIC_GIS_URL || 'http://localhost:5001'

export default function MapPage() {
  const { user, loading: authLoading } = useRequireAuth(['admin', 'operator'])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [ambulances, setAmbulances] = useState<Ambulance[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [gisSocket, setGisSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [gisConnected, setGisConnected] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      fetchData()
      initializeSockets()
    }

    return () => {
      if (socket) {
        socket.disconnect()
      }
      if (gisSocket) {
        gisSocket.disconnect()
      }
    }
  }, [authLoading, user])

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
    }
  }

  const initializeSockets = () => {
    // Connect to Business Backend for incidents
    const businessSocket = io(BUSINESS_API_URL, {
      transports: ['websocket', 'polling'],
    })

    businessSocket.on('connect', () => {
      console.log('Business Socket connected')
      setConnected(true)
      if (user) {
        businessSocket.emit('join:role', user.role)
      }
    })

    businessSocket.on('disconnect', () => {
      console.log('Business Socket disconnected')
      setConnected(false)
    })

    businessSocket.on('incident:update', (incident: Incident) => {
      console.log('Incident updated:', incident)
      setIncidents((prev) => {
        const index = prev.findIndex((i) => i._id === incident._id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = incident
          return updated
        }
        return [incident, ...prev]
      })
    })

    businessSocket.on('ambulance:update', (ambulance: Ambulance) => {
      console.log('Ambulance updated:', ambulance)
      setAmbulances((prev) => {
        const index = prev.findIndex((a) => a._id === ambulance._id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = ambulance
          return updated
        }
        return [ambulance, ...prev]
      })
    })

    setSocket(businessSocket)

    // Connect to GIS Backend for real-time location updates
    const gisSocketConn = io(GIS_API_URL, {
      transports: ['websocket', 'polling'],
    })

    gisSocketConn.on('connect', () => {
      console.log('GIS Socket connected')
      setGisConnected(true)
    })

    gisSocketConn.on('disconnect', () => {
      console.log('GIS Socket disconnected')
      setGisConnected(false)
    })

    gisSocketConn.on('ambulanceUpdate', (data: any) => {
      console.log('GIS Ambulance location update:', data)
      if (data.id && data.position) {
        setAmbulances((prev) => {
          const index = prev.findIndex((a) => a._id === data.id)
          if (index >= 0) {
            const updated = [...prev]
            updated[index] = {
              ...updated[index],
              location: {
                type: 'Point',
                coordinates: [data.position.longitude, data.position.latitude]
              }
            }
            return updated
          }
          return prev
        })
      }
    })

    setGisSocket(gisSocketConn)
  }

  if (authLoading) {
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Real-time Map</h1>
              <p className="text-gray-600 mt-1">Live tracking of incidents and ambulances</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
                ></div>
                <span className="text-sm text-gray-600">
                  Business: {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className={`h-3 w-3 rounded-full ${gisConnected ? 'bg-green-500' : 'bg-red-500'}`}
                ></div>
                <span className="text-sm text-gray-600">
                  GIS: {gisConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Area */}
          <div className="lg:col-span-2">
            <div className="card h-[600px] p-0 overflow-hidden">
              <ArcGISMapIframe
                incidents={incidents}
                ambulances={ambulances.filter(a => a.status !== 'offline')}
                socket={gisSocket}
              />
            </div>
          </div>

        {/* Sidebar - Incidents & Ambulances */}
        <div className="space-y-6">
          {/* Active Incidents */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Incidents</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {incidents
                .filter((i) => i.status !== 'completed')
                .map((incident) => (
                  <div key={incident._id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <SeverityBadge severity={incident.severity} />
                      <StatusBadge status={incident.status} />
                    </div>
                    <p className="text-sm text-gray-700">{incident.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {incident.location.coordinates[1].toFixed(4)},{' '}
                      {incident.location.coordinates[0].toFixed(4)}
                    </p>
                  </div>
                ))}
              {incidents.filter((i) => i.status !== 'completed').length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No active incidents</p>
              )}
            </div>
          </div>

          {/* Ambulances Status */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ambulance Fleet</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {ambulances.map((ambulance) => (
                <div key={ambulance._id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-900">{ambulance.plateNumber}</span>
                    <StatusBadge status={ambulance.status} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {ambulance.location.coordinates[1].toFixed(4)},{' '}
                    {ambulance.location.coordinates[0].toFixed(4)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </DashboardLayout>
  )
}
