'use client'

import { useEffect, useRef, useState } from 'react'
import { Ambulance, Incident } from '@/types'

interface ArcGISMapProps {
  incidents: Incident[]
  ambulances: Ambulance[]
  socket: any
}

export default function ArcGISMap({ incidents, ambulances, socket }: ArcGISMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<any>(null)
  const graphicsLayerRef = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Load ArcGIS modules
    const loadMap = async () => {
      try {
        // @ts-ignore - ArcGIS is loaded via CDN
        if (!window.require) {
          throw new Error('ArcGIS require function not available')
        }

        // Load modules using ArcGIS AMD loader
        const modules = await new Promise((resolve, reject) => {
          // @ts-ignore
          window.require([
            'esri/Map',
            'esri/views/MapView',
            'esri/Graphic',
            'esri/layers/GraphicsLayer',
            'esri/geometry/Point'
          ], (...loadedModules: any[]) => {
            resolve(loadedModules)
          }, reject)
        })

        const [Map, MapView, Graphic, GraphicsLayer, Point] = modules as any[]

        const graphicsLayer = new GraphicsLayer()
        graphicsLayerRef.current = graphicsLayer

        const map = new Map({
          basemap: 'streets-navigation-vector',
          layers: [graphicsLayer]
        })

        const view = new MapView({
          container: mapRef.current,
          map: map,
          center: [10.1658, 36.8190], // Tunisia coordinates
          zoom: 13,
          popup: {
            dockEnabled: true,
            dockOptions: {
              position: 'top-right',
              breakpoint: false
            }
          }
        })

        viewRef.current = view
        setMapLoaded(true)

        // Wait for view to be ready
        await view.when()
        
      } catch (error) {
        console.error('Error loading ArcGIS map:', error)
        setLoadError('Failed to load map. Please ensure ArcGIS SDK is available.')
      }
    }

    // Check if ArcGIS is available
    // @ts-ignore
    if (typeof window !== 'undefined' && window.require) {
      loadMap()
    } else {
      setLoadError('ArcGIS SDK not loaded. Please add the script tag.')
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
      }
    }
  }, [])

  // Update incidents on map
  useEffect(() => {
    if (!mapLoaded || !viewRef.current || !graphicsLayerRef.current) return

    const updateIncidents = async () => {
      try {
        if (!window.require) return

        const modules = await new Promise((resolve, reject) => {
          // @ts-ignore
          window.require([
            'esri/Graphic',
            'esri/geometry/Point'
          ], (...loadedModules: any[]) => {
            resolve(loadedModules)
          }, reject)
        })

        const [Graphic, Point] = modules as any[]

        // Remove old incident graphics
        const oldIncidents = graphicsLayerRef.current.graphics.filter((g: any) => 
          g.attributes?.type === 'incident'
        )
        graphicsLayerRef.current.removeMany(oldIncidents.toArray())

        // Add new incident graphics
        incidents.forEach(incident => {
          const [lng, lat] = incident.location.coordinates
          
          const point = new Point({
            longitude: lng,
            latitude: lat
          })

          // Color by severity
          let color = [59, 130, 246] // blue for low
          if (incident.severity === 'medium') color = [234, 179, 8] // yellow
          if (incident.severity === 'high') color = [249, 115, 22] // orange
          if (incident.severity === 'critical') color = [239, 68, 68] // red

          // Gray out if completed
          if (incident.status === 'completed') {
            color = [156, 163, 175]
          }

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
            },
            attributes: {
              type: 'incident',
              id: incident._id,
              description: incident.description,
              severity: incident.severity,
              status: incident.status,
              address: incident.address,
              reportedBy: typeof incident.reportedBy === 'string' 
                ? incident.reportedBy 
                : incident.reportedBy?.name || 'Unknown'
            },
            popupTemplate: {
              title: 'Incident: {severity}',
              content: `
                <div style="padding: 10px;">
                  <p><strong>Description:</strong> {description}</p>
                  <p><strong>Status:</strong> {status}</p>
                  <p><strong>Severity:</strong> {severity}</p>
                  <p><strong>Address:</strong> {address}</p>
                  <p><strong>Reported By:</strong> {reportedBy}</p>
                </div>
              `
            }
          })

          graphicsLayerRef.current.add(graphic)
        })
      } catch (error) {
        console.error('Error updating incidents:', error)
      }
    }

    updateIncidents()
  }, [incidents, mapLoaded])

  // Update ambulances on map
  useEffect(() => {
    if (!mapLoaded || !viewRef.current || !graphicsLayerRef.current) return

    const updateAmbulances = async () => {
      try {
        if (!window.require) return

        const modules = await new Promise((resolve, reject) => {
          // @ts-ignore
          window.require([
            'esri/Graphic',
            'esri/geometry/Point'
          ], (...loadedModules: any[]) => {
            resolve(loadedModules)
          }, reject)
        })

        const [Graphic, Point] = modules as any[]

        // Remove old ambulance graphics
        const oldAmbulances = graphicsLayerRef.current.graphics.filter((g: any) => 
          g.attributes?.type === 'ambulance'
        )
        graphicsLayerRef.current.removeMany(oldAmbulances.toArray())

        // Add new ambulance graphics
        ambulances.forEach(ambulance => {
          const [lng, lat] = ambulance.location.coordinates
          
          const point = new Point({
            longitude: lng,
            latitude: lat
          })

          // Color by status
          let color = [16, 185, 129] // green for available
          if (ambulance.status === 'busy') color = [239, 68, 68] // red
          if (ambulance.status === 'en-route') color = [59, 130, 246] // blue
          if (ambulance.status === 'offline') color = [107, 114, 128] // gray

          const driverName = typeof ambulance.driver === 'string' 
            ? ambulance.driver 
            : ambulance.driver?.name || 'Unassigned'

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
            },
            attributes: {
              type: 'ambulance',
              id: ambulance._id,
              plateNumber: ambulance.plateNumber,
              status: ambulance.status,
              driver: driverName
            },
            popupTemplate: {
              title: 'Ambulance: {plateNumber}',
              content: `
                <div style="padding: 10px;">
                  <p><strong>Status:</strong> {status}</p>
                  <p><strong>Driver:</strong> {driver}</p>
                  <p><strong>Location:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                </div>
              `
            }
          })

          graphicsLayerRef.current.add(graphic)
        })
      } catch (error) {
        console.error('Error updating ambulances:', error)
      }
    }

    updateAmbulances()
  }, [ambulances, mapLoaded])

  // Listen to real-time updates via socket
  useEffect(() => {
    if (!socket || !mapLoaded || !graphicsLayerRef.current) return

    const handleAmbulanceLocationUpdate = async (data: any) => {
      try {
        // @ts-ignore
        const Point = await window.require(['esri/geometry/Point'])
        
        // Find and update the ambulance graphic
        const ambulanceGraphic = graphicsLayerRef.current.graphics.find((g: any) => 
          g.attributes?.type === 'ambulance' && g.attributes?.id === data.ambulanceId
        )

        if (ambulanceGraphic && data.location) {
          ambulanceGraphic.geometry = new Point({
            longitude: data.location.coordinates[0],
            latitude: data.location.coordinates[1]
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
  }, [socket, mapLoaded])

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center p-8">
          <p className="text-red-600 font-semibold mb-2">{loadError}</p>
          <p className="text-sm text-gray-600">
            Add ArcGIS SDK script to your page:
          </p>
          <code className="text-xs bg-gray-200 px-2 py-1 rounded mt-2 block">
            {'<script src="https://js.arcgis.com/4.34/"></script>'}
          </code>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  )
}
