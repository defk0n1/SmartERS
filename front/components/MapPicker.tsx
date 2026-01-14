"use client"

import { useEffect, useRef, useState } from 'react'

type Coord = { latitude: number; longitude: number }

interface MapPickerProps {
  value?: Coord | null
  onChange: (coord: Coord) => void
  height?: number | string
}

export default function MapPicker({ value, onChange, height = 260 }: MapPickerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data) return
      if (data.type === 'MAP_READY') {
        setReady(true)
        if (value && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: 'INIT_PICK', coord: value }, '*')
        }
      }
      if (data.type === 'PICK_COORD' && data.coord) {
        try {
          onChange({ latitude: Number(data.coord.latitude), longitude: Number(data.coord.longitude) })
        } catch {}
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Keep picker marker in sync when value changes externally
  useEffect(() => {
    if (!ready || !iframeRef.current || !value) return
    const win = iframeRef.current.contentWindow
    if (!win) return
    win.postMessage({ type: 'SET_COORD', coord: value }, '*')
  }, [ready, value])

  const send = (msg: any) => {
    if (!iframeRef.current?.contentWindow) return
    iframeRef.current.contentWindow.postMessage(msg, '*')
  }

  return (
    <div style={{ position: 'relative' }}>
      <iframe
        ref={iframeRef}
        src="/pick.html"
        title="Pick Location"
        style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height, border: '0', borderRadius: 8 }}
      />
      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => send({ type: 'LOCATE' })}
          disabled={!ready}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12 }}
        >Use my location</button>
        <button
          type="button"
          onClick={() => value && send({ type: 'SET_CENTER', coord: value })}
          disabled={!ready || !value}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12 }}
        >Center on value</button>
        <button
          type="button"
          onClick={() => send({ type: 'CLEAR' })}
          disabled={!ready}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12 }}
        >Clear</button>
      </div>
    </div>
  )
}
