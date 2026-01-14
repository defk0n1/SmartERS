"use client"

import { useEffect, useRef, useState } from 'react'
import { Incident, Ambulance } from '@/types'

interface ArcGISMapIframeProps {
  incidents: Incident[]
  ambulances: Ambulance[]
  socket: any
  simulationRoute: any[] | null
  simulationStats?: { id: string; totalDistanceKm: number; etaMin: number; speedKmh: number }[]
  simulationPlans?: { id: string; route: { longitude: number; latitude: number }[]; stats?: { distance: number; eta: number; speed: number } }[]
  followIncidentId?: string | null
}

export default function ArcGISMapIframe({
  incidents,
  ambulances,
  socket,
  simulationRoute,
  simulationStats = [],
  simulationPlans,
  followIncidentId
}: ArcGISMapIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [mapReady, setMapReady] = useState(false)

  // Listen for readiness from the iframe map
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return
      if (event.data.type === 'MAP_READY') {
        setMapReady(true)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Helper to enrich incidents with assigned ambulance details for better popups
  const enrichIncidents = (list: Incident[], ambs: Ambulance[]) => {
    const byId = new Map<string, Ambulance>(ambs.map(a => [a._id, a]))
    return list.map(i => {
      const assigned = typeof i.assignedAmbulance === 'string' ? byId.get(i.assignedAmbulance) : undefined
      return assigned ? { ...i, assignedAmbulance: { plateNumber: assigned.plateNumber } as any } : i
    })
  }

  // Post data to iframe when ready or when inputs change
  useEffect(() => {
    if (!mapReady || !iframeRef.current) return

    const target = iframeRef.current.contentWindow
    if (!target) return

    const firstStat = simulationStats && simulationStats.length > 0 ? simulationStats[0] : undefined

    // Prefer provided plans; else build a single plan from route + firstStat
    const plans = simulationPlans && simulationPlans.length > 0
      ? simulationPlans
      : (simulationRoute && firstStat ? [{
          id: firstStat.id || (ambulances[0]?._id ?? 'route-1'),
          route: simulationRoute,
          stats: {
            distance: Number(firstStat.totalDistanceKm?.toFixed?.(2) ?? firstStat.totalDistanceKm),
            eta: Number(firstStat.etaMin?.toFixed?.(1) ?? firstStat.etaMin),
            speed: Number(firstStat.speedKmh?.toFixed?.(1) ?? firstStat.speedKmh)
          }
        }] : [])

    const payload = {
      type: 'UPDATE_DATA',
      incidents: enrichIncidents(incidents, ambulances),
      ambulances,
      simulationRoute,
      simulationStats: firstStat
        ? {
            distance: Number(firstStat.totalDistanceKm?.toFixed?.(2) ?? firstStat.totalDistanceKm),
            eta: Number(firstStat.etaMin?.toFixed?.(1) ?? firstStat.etaMin),
            speed: Number(firstStat.speedKmh?.toFixed?.(1) ?? firstStat.speedKmh)
          }
        : null,
      simulationPlans: plans
    }

    target.postMessage(payload, '*')
  }, [mapReady, incidents, ambulances, simulationRoute, simulationStats, simulationPlans])

  // Feed live socket updates directly to the iframe to keep positions fluid
  useEffect(() => {
    if (!socket || !iframeRef.current) return

    const target = iframeRef.current.contentWindow
    if (!target) return

    const handler = (data: any) => {
      try {
        if (!data) return

        // Update ambulances list with latest position if provided
        if (data.id && data.position) {
          const updatedAmbulances = ambulances.map(a => (
            a._id === data.id
              ? {
                  ...a,
                  location: {
                    type: 'Point' as const,
                    coordinates: [Number(data.position.longitude), Number(data.position.latitude)] as [number, number]
                  }
                }
              : a
          ))

          const firstStat = simulationStats && simulationStats.length > 0 ? simulationStats[0] : undefined
          const plans = simulationPlans && simulationPlans.length > 0
            ? simulationPlans
            : (simulationRoute && firstStat ? [{
                id: firstStat.id || (updatedAmbulances[0]?._id ?? 'route-1'),
                route: simulationRoute,
                stats: {
                  distance: Number(firstStat.totalDistanceKm?.toFixed?.(2) ?? firstStat.totalDistanceKm),
                  eta: Number(firstStat.etaMin?.toFixed?.(1) ?? firstStat.etaMin),
                  speed: Number(firstStat.speedKmh?.toFixed?.(1) ?? firstStat.speedKmh)
                }
              }] : [])

          target.postMessage({
            type: 'UPDATE_DATA',
            incidents: enrichIncidents(incidents, updatedAmbulances),
            ambulances: updatedAmbulances,
            simulationRoute,
            simulationStats: firstStat
              ? {
                  distance: Number(firstStat.totalDistanceKm?.toFixed?.(2) ?? firstStat.totalDistanceKm),
                  eta: Number(firstStat.etaMin?.toFixed?.(1) ?? firstStat.etaMin),
                  speed: Number(firstStat.speedKmh?.toFixed?.(1) ?? firstStat.speedKmh)
                }
              : null,
            simulationPlans: plans
          }, '*')
        } else {
          // Fallback: push current state
          const firstStat = simulationStats && simulationStats.length > 0 ? simulationStats[0] : undefined
          const plans = simulationPlans && simulationPlans.length > 0
            ? simulationPlans
            : (simulationRoute && firstStat ? [{
                id: firstStat.id || (ambulances[0]?._id ?? 'route-1'),
                route: simulationRoute,
                stats: {
                  distance: Number(firstStat.totalDistanceKm?.toFixed?.(2) ?? firstStat.totalDistanceKm),
                  eta: Number(firstStat.etaMin?.toFixed?.(1) ?? firstStat.etaMin),
                  speed: Number(firstStat.speedKmh?.toFixed?.(1) ?? firstStat.speedKmh)
                }
              }] : [])

          target.postMessage({
            type: 'UPDATE_DATA',
            incidents: enrichIncidents(incidents, ambulances),
            ambulances,
            simulationRoute,
            simulationStats: firstStat
              ? {
                  distance: Number(firstStat.totalDistanceKm?.toFixed?.(2) ?? firstStat.totalDistanceKm),
                  eta: Number(firstStat.etaMin?.toFixed?.(1) ?? firstStat.etaMin),
                  speed: Number(firstStat.speedKmh?.toFixed?.(1) ?? firstStat.speedKmh)
                }
              : null,
            simulationPlans: plans
          }, '*')
        }
      } catch (err) {
        console.error('Failed to feed update to iframe:', err)
      }
    }

    socket.on?.('ambulanceUpdate', handler)
    socket.on?.('ambulance:locationUpdate', handler)

    return () => {
      socket.off?.('ambulanceUpdate', handler)
      socket.off?.('ambulance:locationUpdate', handler)
    }
  }, [socket, iframeRef.current, incidents, ambulances, simulationRoute, simulationStats, simulationPlans])

  // Follow selected incident: inform iframe to focus and track
  useEffect(() => {
    if (!mapReady || !iframeRef.current || !followIncidentId) return
    const target = iframeRef.current.contentWindow
    if (!target) return
    target.postMessage({ type: 'FOLLOW', incidentId: followIncidentId }, '*')
  }, [mapReady, followIncidentId])

  return (
    <iframe
      ref={iframeRef}
      src="/map.html"
      title="SmartERS Map"
      style={{ width: '100%', height: '100%', border: '0' }}
    />
  )
}
