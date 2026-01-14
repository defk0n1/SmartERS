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
import { gisService } from '@/services/gis.service'

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

  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([])
  const [selectedAmbulances, setSelectedAmbulances] = useState<string[]>([])
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationRoute, setSimulationRoute] = useState<any[] | null>(null)
  const [originalAmbulanceLocation, setOriginalAmbulanceLocation] = useState<any>(null)
  const [simulationStats, setSimulationStats] = useState<
    { id: string; totalDistanceKm: number; etaMin: number; speedKmh: number }[]
  >([])
  const [simulationPlans, setSimulationPlans] = useState<
    { id: string; route: { longitude: number; latitude: number }[]; stats?: { distance: number; eta: number; speed: number } }[]
  >([])
  const [followIncidentId, setFollowIncidentId] = useState<string | null>(null)
  const [simActiveIncidentIds, setSimActiveIncidentIds] = useState<Set<string>>(new Set())
  const [simActiveAmbulanceIds, setSimActiveAmbulanceIds] = useState<Set<string>>(new Set())
  

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

  const fetchData = async () => {
    try {
      const [incidentsRes, ambulancesRes] = await Promise.all([
        incidentService.getAll({ page: 1, limit: 100 }),
        ambulanceService.getAll()
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
    const businessSocket = io(BUSINESS_API_URL, { transports: ['websocket', 'polling'] })
    businessSocket.on('connect', () => {
      setConnected(true)
      user && businessSocket.emit('join:role', user.role)
    })
    businessSocket.on('disconnect', () => setConnected(false))
    businessSocket.on('incident:update', (incident: Incident) => {
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

    const gisSocketConn = io(GIS_API_URL, { transports: ['websocket', 'polling'] })
    gisSocketConn.on('connect', () => setGisConnected(true))
    gisSocketConn.on('disconnect', () => setGisConnected(false))
    gisSocketConn.on('ambulanceUpdate', (data: any) => {
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

  const handleStartSimulation = async () => {
    if (selectedIncidents.length === 0 || selectedAmbulances.length === 0) {
      alert('Select one or more incidents and ambulances first.')
      return
    }

    const incidentObjs = selectedIncidents.map(id => incidents.find(i => i._id === id)).filter(Boolean) as Incident[]
    const ambulanceObjs = selectedAmbulances.map(id => ambulances.find(a => a._id === id)).filter(Boolean) as Ambulance[]
    const count = Math.min(incidentObjs.length, ambulanceObjs.length)
    if (count === 0) return

    try {
      const routesPerAmbulance: { id: string; route: { longitude: number; latitude: number }[] }[] = []

      for (let idx = 0; idx < count; idx++) {
        const incident = incidentObjs[idx]
        const ambulance = ambulanceObjs[idx]

        if (!incident.location?.coordinates || !ambulance.location?.coordinates) continue

        if (idx === 0) setOriginalAmbulanceLocation({ ...ambulance.location })

        const routeData = await gisService.getRoute(
          { longitude: Number(ambulance.location.coordinates[0]), latitude: Number(ambulance.location.coordinates[1]) },
          { longitude: Number(incident.location.coordinates[0]), latitude: Number(incident.location.coordinates[1]) }
        )

        const route = (routeData as any).route?.geometry?.paths?.[0] || []
        if (!Array.isArray(route) || route.length === 0) continue

        setSimulationRoute(route)

        const formattedRoute = route
          .map((coord: any) => (Array.isArray(coord) && coord.length >= 2 ? { longitude: Number(coord[0]), latitude: Number(coord[1]) } : null))
          .filter(Boolean) as { longitude: number; latitude: number }[]

        routesPerAmbulance.push({ id: ambulance._id, route: formattedRoute })
      }

      if (routesPerAmbulance.length === 0) return

      const stats = await gisService.startSimulation(routesPerAmbulance, 1)
      setSimulationStats(stats)

      const plans = routesPerAmbulance.map(r => {
        const s = stats.find(x => x.id === r.id)
        return {
          id: r.id,
          route: r.route,
          stats: s ? { distance: Number(s.totalDistanceKm), eta: Number(s.etaMin), speed: Number(s.speedKmh) } : undefined
        }
      })
      setSimulationPlans(plans)
      setIsSimulating(true)
      setSimActiveIncidentIds(new Set(selectedIncidents.slice(0, count)))
      setSimActiveAmbulanceIds(new Set(selectedAmbulances.slice(0, count)))
    } catch (err: any) {
      console.error('Simulation start failed:', err)
    }
  }

  const handleStopSimulation = async () => {
    try {
      await gisService.stopSimulation()
      setSimulationRoute(null)
      setSimulationStats([])
      setSimulationPlans([])
      setSimActiveIncidentIds(new Set())
      setSimActiveAmbulanceIds(new Set())
      if (originalAmbulanceLocation && selectedAmbulances[0]) {
        setAmbulances((prev) => {
          const index = prev.findIndex((a) => a._id === selectedAmbulances[0])
          if (index >= 0) {
            const updated = [...prev]
            updated[index] = { ...updated[index], location: originalAmbulanceLocation }
            return updated
          }
          return prev
        })
      }
      setIsSimulating(false)
      setOriginalAmbulanceLocation(null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleFollowIncident = async (id: string) => {
    try {
      const inc = incidents.find(i => i._id === id)
      if (!inc) return
      setFollowIncidentId(id)

      // If there is an assigned ambulance, compute an on-demand route for focus
      const ambId = inc.assignedAmbulance
      const amb = ambulances.find(a => a._id === ambId)
      if (amb && amb.location?.coordinates && inc.location?.coordinates) {
        const routeData = await gisService.getRoute(
          { longitude: Number(amb.location.coordinates[0]), latitude: Number(amb.location.coordinates[1]) },
          { longitude: Number(inc.location.coordinates[0]), latitude: Number(inc.location.coordinates[1]) }
        )
        const raw = (routeData as any).route?.geometry?.paths?.[0] || []
        const formatted = raw
          .map((coord: any) => (Array.isArray(coord) && coord.length >= 2 ? { longitude: Number(coord[0]), latitude: Number(coord[1]) } : null))
          .filter(Boolean) as { longitude: number; latitude: number }[]
        if (formatted.length > 0 && ambId) {
          // Merge/replace plan for this ambulance id to allow route switcher focus
          setSimulationPlans(prev => {
            const others = prev.filter(p => p.id !== ambId)
            return [...others, { id: ambId, route: formatted }]
          })
        }
      }
    } catch (err) {
      console.error('Follow incident failed:', err)
    }
  }

  if (authLoading)
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )

  return (
    <DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Real-time Map</h1>
          <p className="text-gray-600 mt-1">Live tracking of incidents and ambulances</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">Business: {connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full ${gisConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">GIS: {gisConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card h-[600px] p-0 overflow-hidden">
            <ArcGISMapIframe
              incidents={incidents}
              ambulances={ambulances.filter((a) => a.status !== 'offline')}
              socket={gisSocket}
              simulationRoute={simulationRoute}
              simulationStats={simulationStats}
              simulationPlans={simulationPlans}
              followIncidentId={followIncidentId}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Active Incidents</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {incidents.filter((i) => i.status !== 'completed').map((incident) => (
                <div key={incident._id} className={`p-3 rounded-lg ${simActiveIncidentIds.has(incident._id) ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                  </div>
                  <p className="text-sm">{incident.description}</p>
                  {incident.location?.coordinates && (
                    <p className="text-xs text-gray-500 mt-1">
                      {incident.location.coordinates[1].toFixed(4)}, {incident.location.coordinates[0].toFixed(4)}
                    </p>
                  )}
                  <div className="mt-2 flex justify-end">
                    <button className="btn btn-xs btn-primary" onClick={() => handleFollowIncident(incident._id)}>Follow</button>
                  </div>
                </div>
              ))}
              {incidents.filter((i) => i.status !== 'completed').length === 0 && <p className="text-sm text-center py-4 text-gray-500">No active incidents</p>}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Ambulance Fleet</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {ambulances.map((a) => (
                <div key={a._id} className={`p-3 rounded-lg ${simActiveAmbulanceIds.has(a._id) ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{a.plateNumber}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {a.location.coordinates[1].toFixed(4)}, {a.location.coordinates[0].toFixed(4)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Simulation Controls</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Select Incident(s)</label>
                <select
                  multiple
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm h-28"
                  value={selectedIncidents}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map(o => o.value)
                    setSelectedIncidents(selected)
                  }}
                  disabled={isSimulating}
                >
                  {incidents.filter((i) => i.status !== 'completed').map((i) => (
                    <option key={i._id} value={i._id}>{i.description}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Select Ambulance(s)</label>
                <select
                  multiple
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm h-28"
                  value={selectedAmbulances}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map(o => o.value)
                    setSelectedAmbulances(selected)
                  }}
                  disabled={isSimulating}
                >
                  {ambulances.filter((a) => a.status === 'available').map((a) => (
                    <option key={a._id} value={a._id}>{a.plateNumber}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-4">
                <button className="btn btn-primary flex-1" onClick={handleStartSimulation} disabled={isSimulating}>
                  Start Simulation
                </button>
                <button className="btn btn-secondary flex-1" onClick={handleStopSimulation} disabled={!isSimulating}>
                  Stop Simulation
                </button>
              </div>
            </div>
          </div>

          {isSimulating && simulationStats.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Simulation Stats</h3>
              <div className="space-y-2">
                {simulationStats.map((stat) => {
                  const amb = ambulances.find((a) => a._id === stat.id)
                  return (
                    <div key={stat.id} className="p-2 bg-gray-50 rounded-md">
                      <p className="text-sm font-medium">{amb?.plateNumber}</p>
                      <p className="text-xs text-gray-500">Distance: {stat.totalDistanceKm.toFixed(2)} km</p>
                      <p className="text-xs text-gray-500">ETA: {stat.etaMin.toFixed(1)} min</p>
                      <p className="text-xs text-gray-500">Speed: {stat.speedKmh.toFixed(1)} km/h</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  )
}
