'use client'

import { useEffect, useRef, useState } from 'react'
import { Ambulance, Incident } from '@/types'

// Import ArcGIS map components
import '@arcgis/map-components/components/arcgis-map'
import Graphic from '@arcgis/core/Graphic.js'
import Point from '@arcgis/core/geometry/Point.js'

interface ArcGISMapProps {
  incidents: Incident[]
  ambulances: Ambulance[]
  socket: any
}

// Type definition for the arcgis-map custom element
interface ArcgisMapElement extends HTMLElement {
  center: string
  zoom: number
  basemap: string
  view: any
  graphics: {
    add: (graphic: any) => void
    remove: (graphic: any) => void
    removeAll: () => void
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'arcgis-map': any
    }
  }
}

export default function ArcGISMap({ incidents, ambulances, socket }: ArcGISMapProps) {
  const mapRef = useRef<ArcgisMapElement | null>(null)
  const viewRef = useRef<any>(null)
  const incidentGraphicsRef = useRef<Map<string, any>>(new Map())
  const ambulanceGraphicsRef = useRef<Map<string, any>>(new Map())
  const [mapReady, setMapReady] = useState(false)

  // Handle map ready event
  useEffect(() => {
    const mapElement = mapRef.current
    if (!mapElement) return

    const handleViewReady = (event: any) => {
      if (event.detail) {
        console.log('✅ Map view ready')
        viewRef.current = mapElement.view
        setMapReady(true)
      }
    }

    mapElement.addEventListener('arcgisViewReadyChange', handleViewReady)

    return () => {
      mapElement.removeEventListener('arcgisViewReadyChange', handleViewReady)
    }
  }, [])

  // Update incidents on map
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const mapElement = mapRef.current
    
    // Remove old graphics
    incidentGraphicsRef.current.forEach((graphic) => {
      mapElement.graphics.remove(graphic)
    })
    incidentGraphicsRef.current.clear()

    // Add new incident graphics
    incidents.forEach(incident => {
      const [lng, lat] = incident.location.coordinates
      
      const point = new Point({
        longitude: lng,
        latitude: lat
      })

      let color = [59, 130, 246] // blue for low
      if (incident.severity === 'medium') color = [234, 179, 8]
      if (incident.severity === 'high') color = [249, 115, 22]
      if (incident.severity === 'critical') color = [239, 68, 68]
      if (incident.status === 'completed') color = [156, 163, 175]

      const reportedBy = typeof incident.reportedBy === 'string' 
        ? incident.reportedBy 
        : (incident.reportedBy as any)?.name || 'Unknown'

      const graphic = new Graphic({
        geometry: point,
        symbol: {
          type: 'simple-marker',
          color: color,
          size: 12,
          outline: {
            color: [255, 255, 255],
            width: 2
          }
        } as any,
        attributes: {
          type: 'incident',
          id: incident._id,
          description: incident.description,
          severity: incident.severity,
          status: incident.status,
          address: incident.address,
          reportedBy: reportedBy
        },
        popupTemplate: {
          title: 'Incident: {severity}',
          content: `
            <div style="padding: 10px;">
              <p><strong>Status:</strong> {status}</p>
              <p><strong>Description:</strong> {description}</p>
              <p><strong>Address:</strong> {address}</p>
              <p><strong>Reported by:</strong> {reportedBy}</p>
            </div>
          `
        }
      })

      mapElement.graphics.add(graphic)
      incidentGraphicsRef.current.set(incident._id, graphic)
    })
  }, [incidents, mapReady])

  // Update ambulances on map
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const mapElement = mapRef.current
    
    // Remove old graphics
    ambulanceGraphicsRef.current.forEach((graphic) => {
      mapElement.graphics.remove(graphic)
    })
    ambulanceGraphicsRef.current.clear()

    // Add new ambulance graphics
    ambulances.forEach(ambulance => {
      const [lng, lat] = ambulance.location.coordinates
      
      const point = new Point({
        longitude: lng,
        latitude: lat
      })

      let color = [16, 185, 129] // green for available
      if (ambulance.status === 'busy') color = [239, 68, 68]
      if (ambulance.status === 'en-route') color = [59, 130, 246]
      if (ambulance.status === 'offline') color = [107, 114, 128]

      const driverName = typeof ambulance.driver === 'string' 
        ? ambulance.driver 
        : (ambulance.driver as any)?.name || 'Unassigned'

      const graphic = new Graphic({
        geometry: point,
        symbol: {
          type: 'simple-marker',
          style: 'square',
          color: color,
          size: 14,
          outline: {
            color: [255, 255, 255],
            width: 2
          }
        } as any,
        attributes: {
          type: 'ambulance',
          id: ambulance._id,
          plateNumber: ambulance.plateNumber,
          status: ambulance.status,
          driver: driverName,
          longitude: lng,
          latitude: lat
        },
        popupTemplate: {
          title: 'Ambulance: {plateNumber}',
          content: `
            <div style="padding: 10px;">
              <p><strong>Status:</strong> {status}</p>
              <p><strong>Driver:</strong> {driver}</p>
              <p><strong>Location:</strong> {latitude}, {longitude}</p>
            </div>
          `
        }
      })

      mapElement.graphics.add(graphic)
      ambulanceGraphicsRef.current.set(ambulance._id, graphic)
    })
  }, [ambulances, mapReady])

  // Listen for real-time updates
  useEffect(() => {
    if (!socket || !mapReady || !mapRef.current) return

    const handleAmbulanceLocationUpdate = (data: any) => {
      try {
        const ambulanceId = data.ambulanceId || data.id
        const ambulanceGraphic = ambulanceGraphicsRef.current.get(ambulanceId)

        if (ambulanceGraphic && data.position) {
          ambulanceGraphic.geometry = new Point({
            longitude: data.position.longitude,
            latitude: data.position.latitude
          })
        }
      } catch (error) {
        console.error('Error updating ambulance location:', error)
      }
    }

    socket.on('ambulance:locationUpdate', handleAmbulanceLocationUpdate)
    socket.on('ambulanceUpdate', handleAmbulanceLocationUpdate)

    return () => {
      socket.off('ambulance:locationUpdate', handleAmbulanceLocationUpdate)
      socket.off('ambulanceUpdate', handleAmbulanceLocationUpdate)
    }
  }, [socket, mapReady])

  return (
    <arcgis-map
      ref={mapRef}
      basemap="streets-navigation-vector"
      center="10.1658,36.8190"
      zoom="13"
      style={{ width: '100%', height: '100%' }}
    />
  )
}