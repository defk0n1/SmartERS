'use client'

import { useEffect, useState, useRef } from 'react'
import { Ambulance, Incident } from '@/types'

interface ArcGISMapIframeProps {
  incidents: Incident[]
  ambulances: Ambulance[]
  socket: any
  simulationRoute?: any[] | null
}

export default function ArcGISMapIframe({ 
  incidents,
  ambulances,
  socket,
  simulationRoute
}: ArcGISMapIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [mapReady, setMapReady] = useState(false)

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'MAP_READY') {
        console.log('Map is ready')
        setMapReady(true)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Send data to iframe when ready or data changes
  useEffect(() => {
    if (!mapReady || !iframeRef.current?.contentWindow) return

    iframeRef.current.contentWindow.postMessage({
      type: 'UPDATE_DATA',
      incidents,
      ambulances,
      simulationRoute
    }, '*')
  }, [mapReady, incidents, ambulances, simulationRoute])

  // Forward socket events to iframe
  useEffect(() => {
    if (!socket || !mapReady || !iframeRef.current?.contentWindow) return

    const handleAmbulanceUpdate = (data: any) => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'AMBULANCE_UPDATE',
        data
      }, '*')
    }

    socket.on('ambulanceUpdate', handleAmbulanceUpdate)
    return () => socket.off('ambulanceUpdate', handleAmbulanceUpdate)
  }, [socket, mapReady])

  return (
    <div className="w-full h-full relative">
      <iframe
        ref={iframeRef}
        src="/map.html"
        className="w-full h-full border-0"
        allow="geolocation"
        title="SmartERS Map"
      />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  )
}
